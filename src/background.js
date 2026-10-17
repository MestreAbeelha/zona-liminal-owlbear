import OBR, { buildPath, buildText, Command } from "@owlbear-rodeo/sdk";
import { ouvirAuth, ehMestre, ouvirFichas } from "./fb.js";
import { KEY_LINK, KEY_BAR, KEY_CFG, FONTE, ehInimigo, vitais, simboloCondicao } from "./comum.js";

const estado = { gm: false, fichas: null, pararFichas: null, esconder: false, agendado: null, rodando: false, denovo: false, locais: [] };

/* ---------- geometria ---------- */
const cor = { fundo: "#0e0e12", vida: "#4cba7a", vidaClara: "#ffffff", temp: "#86c8e8", nen: "#5cc3f5", borda: "#000000" };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const r1 = (n) => Math.round(n * 10) / 10;

/** Retângulo de cantos arredondados como caminho (path), com origem em (0,0). */
function retArredondado(w, h, r) {
  r = clamp(r, 0, Math.min(w, h) / 2);
  return [
    [Command.MOVE, r, 0], [Command.LINE, w - r, 0], [Command.QUAD, w, 0, w, r],
    [Command.LINE, w, h - r], [Command.QUAD, w, h, w - r, h],
    [Command.LINE, r, h], [Command.QUAD, 0, h, 0, h - r],
    [Command.LINE, 0, r], [Command.QUAD, 0, 0, r, 0], [Command.CLOSE],
  ];
}

/** Posições de tudo, abaixo do token. Mesmo cálculo para barras e para o rótulo de condições. */
function layout(b, inimigo, nCond) {
  const hv = clamp(b.height * 0.14, 14, 30);
  const w = Math.max(b.width, hv * 5.2);
  const x = b.center.x - w / 2;
  const y0 = b.max.y + Math.max(4, b.height * 0.03);
  const hn = hv * 0.82;
  const yNen = y0 + hv + 3;
  const yFimBarras = inimigo ? y0 + hv : yNen + hn;
  const s = clamp(hv * 1.25, 18, 36);
  return { hv, hn, w, x, y0, yNen, s, yIcones: yFimBarras + 5, yFimIcones: yFimBarras + 5 + (nCond ? s : 0) };
}

/* ---------- peças desejadas ---------- */
function caixa(id, x, y, w, h, r, fill, op, extra = {}) {
  return { id, tipo: "caixa", x: r1(x), y: r1(y), w: r1(Math.max(0.1, w)), h: r1(h), r: r1(r), fill, op, borda: extra.borda || null, sw: extra.sw || 0, meta: extra.meta || null };
}
function texto(id, x, y, w, h, t, fonte, extra = {}) {
  return { id, tipo: "texto", x: r1(x), y: r1(y), w: r1(w), h: r1(h), t, fonte: r1(fonte), meta: extra.meta || null, cor: extra.cor || "#ffffff", contorno: extra.contorno ?? 3 };
}

function barra(base, L, h, pv, max, corPreench, temp, rotulo) {
  const ins = Math.max(2, h * 0.14);
  const wi = L.w - ins * 2, hi = h - ins * 2;
  const pct = clamp(pv / max, 0, 1);
  const pctT = clamp(temp / max, 0, 1 - pct);
  const wf = wi * pct, wt = wi * pctT;
  const partes = [
    caixa(`${base}:fundo`, L.x, L.y, L.w, h, h / 2, cor.fundo, 0.82, { borda: cor.borda, sw: 2 }),
    caixa(`${base}:cheia`, L.x + ins, L.y + ins, wf, hi, hi / 2, corPreench, pct > 0 ? 1 : 0),
    caixa(`${base}:brilho`, L.x + ins + hi * 0.3, L.y + ins + hi * 0.12, Math.max(0.1, wf - hi * 0.6), hi * 0.3, hi * 0.15, cor.vidaClara, wf > hi ? 0.28 : 0),
    caixa(`${base}:temp`, L.x + ins + wf, L.y + ins, wt, hi, hi / 2, cor.temp, pctT > 0 ? 1 : 0),
  ];
  if (rotulo) partes.push(texto(`${base}:num`, L.x, L.y, L.w, h, rotulo, h * 0.78));
  return partes;
}

function partesDesejadas(token, b, ficha) {
  const v = vitais(ficha);
  const inimigo = ehInimigo(ficha);
  const conds = v.condicoes.slice(0, 7);
  const extras = v.condicoes.length - conds.length;
  const L = layout(b, inimigo, v.condicoes.length);
  const partes = [];
  partes.push(...barra(`${token.id}:v`, { x: L.x, y: L.y0, w: L.w }, L.hv, v.pv, v.pvMax, cor.vida, v.pvTemp,
    inimigo ? null : `${v.pv}${v.pvTemp ? `+${v.pvTemp}` : ""}/${v.pvMax}`));
  if (!inimigo) partes.push(...barra(`${token.id}:n`, { x: L.x, y: L.yNen, w: L.w }, L.hn, v.nen, v.nenMax, cor.nen, 0, `${v.nen}/${v.nenMax}`));

  // ícones das condições (círculo + símbolo), centralizados abaixo das barras
  const itens = [...conds.map((c) => ({ ...c, mais: false })), ...(extras > 0 ? [{ nome: `+${extras}`, n: 1, mais: true }] : [])];
  const total = itens.length * L.s + (itens.length - 1) * 4;
  itens.forEach((c, i) => {
    const [emoji, corC] = c.mais ? ["", "#8a8a92"] : simboloCondicao(c.nome);
    const cx = b.center.x - total / 2 + i * (L.s + 4);
    const meta = { cond: c.mais ? null : c.nome, n: c.n, i, cx: r1(b.center.x), by: r1(L.yFimIcones) };
    partes.push(caixa(`${token.id}:c${i}`, cx, L.yIcones, L.s, L.s, L.s / 2, "#16161c", 0.92, { borda: corC, sw: 2.5, meta }));
    const t = c.mais ? c.nome : emoji + (c.n > 1 ? c.n : "");
    partes.push(texto(`${token.id}:ct${i}`, cx, L.yIcones, L.s, L.s, t, c.mais ? L.s * 0.5 : L.s * (c.n > 1 ? 0.46 : 0.58), { contorno: 0 }));
  });
  return partes;
}

/* ---------- criar / atualizar itens ---------- */
const sigDe = (p) => JSON.stringify({ ...p, id: undefined });
const metaDe = (p) => ({ sig: sigDe(p), ...(p.meta || {}) });

function criarItem(token, p) {
  const comum = (bld) => bld.id(p.id).name("Vida").position({ x: p.x, y: p.y }).attachedTo(token.id).layer("ATTACHMENT")
    .locked(true).disableHit(true).disableAttachmentBehavior(["ROTATION"]).metadata({ [KEY_BAR]: metaDe(p) });
  if (p.tipo === "texto") return comum(textoBuilder(p)).build();
  return comum(buildPath().commands(retArredondado(p.w, p.h, p.r)).fillColor(p.fill).fillOpacity(p.op)
    .strokeColor(p.borda || "#000000").strokeOpacity(p.borda ? 0.6 : 0).strokeWidth(p.sw || 0)).build();
}
function textoBuilder(p) {
  return buildText().plainText(p.t).textType("PLAIN").width(p.w).height(p.h).fontFamily(FONTE).fontSize(p.fonte).fontWeight(400)
    .textAlign("CENTER").textAlignVertical("MIDDLE").fillColor(p.cor).strokeColor("#000000").strokeWidth(p.contorno).padding(0);
}
function aplicar(d, p) {
  d.position = { x: p.x, y: p.y };
  d.metadata[KEY_BAR] = metaDe(p);
  if (p.tipo === "texto") {
    d.text.plainText = p.t; d.text.width = p.w; d.text.height = p.h;
    d.text.style.fontSize = p.fonte; d.text.style.fontFamily = FONTE; d.text.style.fillColor = p.cor; d.text.style.strokeWidth = p.contorno;
  } else {
    d.commands = retArredondado(p.w, p.h, p.r);
    d.style.fillColor = p.fill; d.style.fillOpacity = p.op;
    d.style.strokeColor = p.borda || "#000000"; d.style.strokeOpacity = p.borda ? 0.6 : 0; d.style.strokeWidth = p.sw || 0;
  }
}

async function sincronizarAgora() {
  if (!estado.gm || !(await OBR.scene.isReady())) return;
  const itens = await OBR.scene.items.getItems();
  const barras = new Map(itens.filter((i) => i.metadata?.[KEY_BAR]).map((i) => [i.id, i]));
  const desejadas = new Map();
  if (!estado.esconder && estado.fichas) {
    const tokens = itens.filter((i) => i.metadata?.[KEY_LINK]);
    const fichas = new Map(estado.fichas.map((f) => [f.id, f]));
    for (const t of tokens) {
      const ficha = fichas.get(t.metadata[KEY_LINK]);
      if (!ficha) continue;
      let b;
      try { b = await OBR.scene.items.getItemBounds([t.id]); } catch { continue; }
      partesDesejadas(t, b, ficha).forEach((p) => desejadas.set(p.id, { p, token: t }));
    }
  } else if (!estado.esconder && !estado.fichas) {
    return; // ainda não chegaram as fichas: não apaga nada
  }
  const apagar = [...barras.keys()].filter((id) => !desejadas.has(id));
  const novos = [], mudar = [];
  desejadas.forEach(({ p, token }, id) => {
    const ex = barras.get(id);
    if (!ex) novos.push(criarItem(token, p));
    else if (ex.metadata[KEY_BAR].sig !== sigDe(p)) mudar.push(p);
  });
  if (apagar.length) await OBR.scene.items.deleteItems(apagar);
  if (novos.length) await OBR.scene.items.addItems(novos);
  if (mudar.length) {
    const porId = new Map(mudar.map((p) => [p.id, p]));
    await OBR.scene.items.updateItems((i) => porId.has(i.id), (ds) => ds.forEach((d) => aplicar(d, porId.get(d.id))));
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
    atualizarRotulos();
  }, 120);
}

/* ---------- nomes das condições ao selecionar o token (cada pessoa vê no próprio navegador) ----------
   O Owlbear não avisa extensões quando o mouse passa sobre um item, então o nome aparece ao SELECIONAR o token. */
let selecao = [];
let rotulando = false;
async function atualizarRotulos() {
  if (rotulando) return;
  rotulando = true;
  try {
    if (estado.locais.length) { await OBR.scene.local.deleteItems(estado.locais); estado.locais = []; }
    if (!selecao.length || !(await OBR.scene.isReady())) return;
    const itens = await OBR.scene.items.getItems();
    const novos = [];
    for (const id of selecao) {
      const cs = itens.filter((i) => i.attachedTo === id && i.metadata?.[KEY_BAR]?.cond).sort((a, b) => a.metadata[KEY_BAR].i - b.metadata[KEY_BAR].i);
      if (!cs.length) continue;
      const m0 = cs[0].metadata[KEY_BAR];
      const nomes = cs.map((c) => `${c.metadata[KEY_BAR].cond}${c.metadata[KEY_BAR].n > 1 ? ` ×${c.metadata[KEY_BAR].n}` : ""}`).join(" · ");
      const fs = 16, w = Math.max(90, nomes.length * fs * 0.5 + 24), h = fs + 14;
      const x = m0.cx - w / 2, y = m0.by + 6;
      const caixaP = buildPath().id(`loc:${id}:p`).commands(retArredondado(w, h, h / 2)).fillColor(cor.fundo).fillOpacity(0.92)
        .strokeColor("#e8c84a").strokeOpacity(0.8).strokeWidth(2).position({ x, y }).layer("ATTACHMENT").locked(true).disableHit(true).build();
      const t = buildText().id(`loc:${id}:t`).plainText(nomes).textType("PLAIN").width(w).height(h).fontFamily(FONTE).fontSize(fs)
        .textAlign("CENTER").textAlignVertical("MIDDLE").fillColor("#ffffff").strokeColor("#000000").strokeWidth(2).padding(0)
        .position({ x, y }).layer("ATTACHMENT").locked(true).disableHit(true).build();
      novos.push(caixaP, t);
    }
    if (novos.length) { await OBR.scene.local.addItems(novos); estado.locais = novos.map((i) => i.id); }
  } catch (e) { console.error("[zona-liminal] rótulos", e); }
  finally { rotulando = false; }
}

/* ---------- Firebase (só no navegador do Mestre) ---------- */
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
  const lerCfg = (meta) => { estado.esconder = !!meta?.[KEY_CFG]?.esconder; };
  lerCfg(await OBR.room.getMetadata());
  OBR.room.onMetadataChange((meta) => { lerCfg(meta); agendar(); });
  OBR.player.onChange((p) => { selecao = p.selection || []; atualizarRotulos(); });
  selecao = (await OBR.player.getSelection()) || [];

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
