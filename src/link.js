import "./estilo.css";
import OBR from "@owlbear-rodeo/sdk";
import { ouvirAuth, ehMestre, ouvirFichas } from "./fb.js";
import { KEY_LINK } from "./comum.js";

const app = document.getElementById("app");
app.innerHTML = `<div class="msg">Carregando…</div>`;

OBR.onReady(() => {
  ouvirAuth(async (user) => {
    if (!user || !(await ehMestre(user.uid))) {
      app.innerHTML = `<div class="msg erro">Entre com a conta de Mestre primeiro: abra o botão da extensão na barra lateral.</div>`;
      return;
    }
    let jaMostrou = false;
    const parar = ouvirFichas(async (fichas) => {
      if (jaMostrou) return; // só a primeira leitura: não refazer a tela enquanto o Mestre escolhe
      jaMostrou = true;
      setTimeout(() => parar && parar(), 0);
      const sel = (await OBR.player.getSelection()) || [];
      const itens = sel.length ? await OBR.scene.items.getItems(sel) : [];
      const atual = new Set(itens.map((i) => i.metadata[KEY_LINK]).filter(Boolean));
      const valor = atual.size === 1 ? [...atual][0] : "";
      const ordenadas = [...fichas].sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
      app.innerHTML = `
        <label>Ficha para ${itens.length} token(s) selecionado(s)</label>
        <select id="f"><option value="">Escolha…</option>${ordenadas.map((f) => `<option value="${f.id}" ${f.id === valor ? "selected" : ""}>${(f.nome || "(sem nome)").replace(/</g, "&lt;")} · ${f.rotulo || ""}</option>`).join("")}</select>
        <div class="linha"><button class="pri" id="v">Vincular</button><button id="d">Desvincular</button></div>
        <div class="msg" id="m"></div>`;
      const m = document.getElementById("m");
      document.getElementById("v").onclick = async () => {
        const id = document.getElementById("f").value;
        if (!id) { m.textContent = "Escolha uma ficha."; return; }
        await OBR.scene.items.updateItems(sel, (ds) => ds.forEach((d) => { d.metadata[KEY_LINK] = id; }));
        m.className = "msg ok"; m.textContent = "Vinculado!";
      };
      document.getElementById("d").onclick = async () => {
        await OBR.scene.items.updateItems(sel, (ds) => ds.forEach((d) => { delete d.metadata[KEY_LINK]; }));
        m.className = "msg ok"; m.textContent = "Desvinculado.";
      };
    });
  });
});
