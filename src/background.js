import OBR, { buildShape, buildText } from "@owlbear-rodeo/sdk";
import { ouvirAuth, ehMestre, ouvirFichas } from "./fb.js";
import { KEY_LINK, KEY_BAR, ehInimigo, vitais } from "./comum.js";

const estado = { gm: false, fichas: null, pararFichas: null, agendado: null, rodando: false, denovo: false };

/* ---------- desenho das barras ---------- */
const cor = { fundo: "#0e0e12", vida: "#4cba7a", temp: "#86c8e8", nen: "#5cc3f5" };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function partesDesejadas(token, b, ficha) {
  const v = vitais(ficha);
  const inimigo = ehInimigo(ficha);
  const larg = b.width;
  const h = clamp(b.height * 0.11, 9, 26);
  const x = b.min.x;
  const yVida = b.min.y - h - 4;
  const pctVida = clamp(v.pv / v.pvMax, 0, 1);
  const pctTemp = clamp(v.pvTemp / v.pvMax, 0, 1 - pctVida);
  const partes = [
    { id: `${token.id}:bg`, tipo: "shape", x, y: yVida, w: larg, h, fill: cor.fundo, op: 0.75 },
    { id: `${token.id}:vida`, tipo: "shape", x, y: yVida, w: Math.max(0.01, larg * pctVida), h, fill: cor.vida, op: 1 },
    { id: `${token.id}:temp`, tipo: "shape", x: x + larg * pctVida, y: yVida, w: Math.max(0.01, larg * pctTemp), h, fill: cor.temp, op: pctTemp > 0 ? 1 : 0 },
  ];
  if (!inimigo) {
    const nh = Math.max(5, h * 0.55);
    const yNen = yVida - nh - 2;
    const pctNen = clamp(v.nen / v.nenMax, 0, 1);
    partes.push(
      { id: `${token.id}:nenbg`, tipo: "shape", x, y: yNen, w: larg, h: nh, fill: cor.fundo, op: 0.75 },
      { id: `${token.id}:nen`, tipo: "shape", x, y: yNen, w: Math.max(0.01, larg * pctNen), h: nh, fill: cor.nen, op: 1 },
      { id: `${token.id}:txt`, tipo: "texto", x, y: yVida, w: larg, h, texto: `${v.pv}${v.pvTemp ? `+${v.pvTemp}` : ""}/${v.pvMax}`, fonte: h * 0.8 },
    );
  }
  return partes;
}

function criarItem(token, p) {
  const comum = (bld) => bld.id(p.id).name("Vida").position({ x: p.x, y: p.y }).attachedTo(token.id).layer("ATTACHMENT")
    .locked(true).disableHit(true).disableAttachmentBehavior(["ROTATION"]).metadata({ [KEY_BAR]: true });
  if (p.tipo === "texto") {
    return comum(buildText().plainText(p.texto).textType("PLAIN").width(p.w).height(p.h).fontSize(p.fonte).fontWeight(700)
      .textAlign("CENTER").textAlignVertical("MIDDLE").fillColor("#ffffff").strokeColor("#000000").strokeWidth(2).padding(0)).build();
  }
  return comum(buildShape().shapeType("RECTANGLE").width(p.w).height(p.h).fillColor(p.fill).fillOpacity(p.op)
    .strokeColor("#000000").strokeOpacity(0).strokeWidth(0)).build();
}

const perto = (a, b) => Math.abs(a - b) < 0.5;
function precisaAtualizar(item, p) {
  if (!perto(item.position.x, p.x) || !perto(item.position.y, p.y)) return true;
  if (p.tipo === "texto") return item.text?.plainText !== p.texto || !perto(item.text?.width ?? 0, p.w);
  return !perto(item.width, p.w) || !perto(item.height, p.h) || item.style?.fillColor !== p.fill || item.style?.fillOpacity !== p.op;
}
function aplicar(draft, p) {
  draft.position = { x: p.x, y: p.y };
  if (p.tipo === "texto") { draft.text.plainText = p.texto; draft.text.width = p.w; draft.text.height = p.h; draft.text.style.fontSize = p.fonte; }
  else { draft.width = p.w; draft.height = p.h; draft.style.fillColor = p.fill; draft.style.fillOpacity = p.op; }
}

async function sincronizarAgora() {
  if (!estado.gm || !estado.fichas || !(await OBR.scene.isReady())) return;
  const itens = await OBR.scene.items.getItems();
  const tokens = itens.filter((i) => i.metadata?.[KEY_LINK]);
  const barras = new Map(itens.filter((i) => i.metadata?.[KEY_BAR]).map((i) => [i.id, i]));
  const fichas = new Map(estado.fichas.map((f) => [f.id, f]));

  const desejadas = new Map();
  for (const t of tokens) {
    const ficha = fichas.get(t.metadata[KEY_LINK]);
    if (!ficha) continue;
    let b;
    try { b = await OBR.scene.items.getItemBounds([t.id]); } catch { continue; }
    partesDesejadas(t, b, ficha).forEach((p) => desejadas.set(p.id, { p, token: t }));
  }
  const apagar = [...barras.keys()].filter((id) => !desejadas.has(id));
  const novos = [], mudar = [];
  desejadas.forEach(({ p, token }, id) => {
    const ex = barras.get(id);
    if (!ex) novos.push(criarItem(token, p));
    else if (precisaAtualizar(ex, p)) mudar.push(p);
  });
  if (apagar.length) await OBR.scene.items.deleteItems(apagar);
  if (novos.length) await OBR.scene.items.addItems(novos);
  if (mudar.length) {
    const porId = new Map(mudar.map((p) => [p.id, p]));
    await OBR.scene.items.updateItems((i) => porId.has(i.id), (drafts) => drafts.forEach((d) => aplicar(d, porId.get(d.id))));
  }
}

/** Evita rodadas simultâneas e junta várias mudanças seguidas numa só. */
function agendar() {
  if (estado.rodando) { estado.denovo = true; return; }
  clearTimeout(estado.agendado);
  estado.agendado = setTimeout(async () => {
    estado.rodando = true;
    try { await sincronizarAgora(); } catch (e) { console.error("[zona-liminal] sincronizar", e); }
    estado.rodando = false;
    if (estado.denovo) { estado.denovo = false; agendar(); }
  }, 120);
}

/* ---------- ligação com o Firebase (só no navegador do Mestre) ---------- */
function ligarFirebase() {
  ouvirAuth(async (user) => {
    estado.pararFichas?.(); estado.pararFichas = null; estado.fichas = null;
    if (!user || !estado.gm) return;
    if (!(await ehMestre(user.uid))) return;
    estado.pararFichas = ouvirFichas((lista) => { estado.fichas = lista; agendar(); });
  });
}

OBR.onReady(async () => {
  estado.gm = (await OBR.player.getRole()) === "GM";
  OBR.player.onChange(async () => { const gm = (await OBR.player.getRole()) === "GM"; if (gm !== estado.gm) { estado.gm = gm; agendar(); } });

  // menu do botão direito: vincular o token a uma ficha (só Mestre)
  await OBR.contextMenu.create({
    id: "com.zonaliminal.vida/menu",
    icons: [{ icon: new URL("icone-vida.svg", location.href).href, label: "Ficha (Zona Liminal)", filter: { min: 1, roles: ["GM"] } }],
    embed: { url: new URL("link.html", location.href).href, height: 190 },
  });

  if (estado.gm) ligarFirebase();
  OBR.scene.items.onChange(() => agendar());
  OBR.scene.onReadyChange((pronto) => { if (pronto) agendar(); });
  agendar();
});
