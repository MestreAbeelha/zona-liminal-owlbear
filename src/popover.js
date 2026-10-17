import "./estilo.css";
import OBR from "@owlbear-rodeo/sdk";
import { entrar, sair, ouvirAuth, ehMestre, ouvirFichas } from "./fb.js";
import { KEY_LINK, KEY_CFG } from "./comum.js";

const app = document.getElementById("app");
const norm = (s) => String(s || "").trim().toLowerCase();

function telaLogin(msg = "") {
  app.innerHTML = `
    <div class="msg">Entre com a conta de <b>Mestre</b> do site. Só o Mestre precisa disso: os jogadores veem as barras sem fazer nada.</div>
    <label>E-mail</label><input id="em" type="email" autocomplete="username" />
    <label>Senha</label><input id="se" type="password" autocomplete="current-password" />
    <div class="linha"><button class="pri" id="ok">Entrar</button></div>
    <div class="msg erro" id="m">${msg}</div>`;
  document.getElementById("ok").onclick = async () => {
    const m = document.getElementById("m"); m.textContent = "";
    try { await entrar(document.getElementById("em").value.trim(), document.getElementById("se").value); }
    catch { m.textContent = "E-mail ou senha incorretos."; }
  };
}

function telaMestre(user) {
  app.innerHTML = `
    <div class="msg ok">Conectado como ${user.email}. As barras de vida ficam sobre os tokens vinculados, atualizadas em tempo real enquanto esta sala estiver aberta no seu navegador.</div>
    <label class="chk"><input type="checkbox" id="esc" /> Esconder todas as barras de vida</label>
    <div class="msg">Para vincular: clique com o botão direito num token e use <b>Ficha (Zona Liminal)</b>. Ou vincule todos de uma vez pelo nome do token:</div>
    <div class="linha"><button class="pri" id="auto" disabled>Vincular tokens pelo nome</button></div>
    <div class="msg" id="m">Carregando fichas…</div>
    <div class="linha"><button id="sair">Sair da conta</button></div>`;
  document.getElementById("sair").onclick = () => sair();
  const esc = document.getElementById("esc");
  OBR.room.getMetadata().then((meta) => { esc.checked = !!meta?.[KEY_CFG]?.esconder; });
  OBR.room.onMetadataChange((meta) => { esc.checked = !!meta?.[KEY_CFG]?.esconder; });
  esc.onchange = () => OBR.room.setMetadata({ [KEY_CFG]: { esconder: esc.checked } });
  let fichas = [];
  const botao = document.getElementById("auto"), m = document.getElementById("m");
  const parar = ouvirFichas((l) => { fichas = l; botao.disabled = false; m.textContent = `${l.length} ficha(s) encontradas.`; });
  window.addEventListener("pagehide", parar);
  botao.onclick = async () => {
    const porNome = new Map(fichas.map((f) => [norm(f.nome), f.id]));
    const itens = await OBR.scene.items.getItems((i) => i.type === "IMAGE" && ["CHARACTER", "MOUNT"].includes(i.layer));
    const alvo = itens.filter((i) => porNome.has(norm(i.name)));
    if (alvo.length) await OBR.scene.items.updateItems(alvo.map((i) => i.id), (ds) => ds.forEach((d) => { d.metadata[KEY_LINK] = porNome.get(norm(d.name)); }));
    m.textContent = alvo.length ? `${alvo.length} token(s) vinculado(s) pelo nome.` : "Nenhum token tem nome igual ao de uma ficha.";
  };
}

OBR.onReady(async () => {
  const gm = (await OBR.player.getRole()) === "GM";
  if (!gm) {
    app.innerHTML = `<div class="msg">As barras de vida aparecem automaticamente sobre os tokens. Não é preciso fazer nada aqui.</div>`;
    return;
  }
  ouvirAuth(async (user) => {
    if (!user) return telaLogin();
    if (!(await ehMestre(user.uid))) { await sair(); return telaLogin("Essa conta não é de Mestre no site."); }
    telaMestre(user);
  });
});
