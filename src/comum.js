export const KEY_LINK = "com.zonaliminal.vida/ficha"; // metadata do token: id da ficha
export const KEY_BAR = "com.zonaliminal.vida/barra";  // metadata dos itens criados pela extensão
export const KEY_CFG = "com.zonaliminal.vida/config"; // metadata da sala: { esconder: boolean }

/** Fonte das barras (o Owlbear usa fontes do Google; se não existir, cai na fonte padrão). Troque aqui à vontade:
 *  "Bangers", "Cinzel", "Permanent Marker", "Press Start 2P", "Lobster"... */
export const FONTE = "Bangers";

/** Inimigo = ficha criada pelo Mestre (Criatura / NPC): só mostra a barra, sem números. */
export const ehInimigo = (f) => f.rotulo === "Criatura" || f.rotulo === "NPC";

/* Símbolo e cor de cada condição (mesmas categorias de cor do site). */
const DANO = "#e85a5a", CONTROLE = "#b07be0", FRAQUEZA = "#ffa046", NEUTRO = "#5aa9e6";
export const CONDICOES = {
  "Em Chamas": ["🔥", DANO], "Sangrando": ["🩸", DANO], "Envenenado": ["☠️", DANO], "Morrendo": ["💀", DANO], "Morto": ["⚰️", DANO], "Sufocando": ["😮", DANO],
  "Atordoado": ["💫", CONTROLE], "Compelido": ["🌀", CONTROLE], "Controlado": ["🎭", CONTROLE], "Imóvel": ["⚓", CONTROLE], "Impedido": ["🕸️", CONTROLE],
  "Agarrado": ["✊", CONTROLE], "Amarrado": ["⛓️", CONTROLE], "Caído": ["⬇️", CONTROLE], "Incapacitado": ["🚫", CONTROLE], "Paralisado": ["⚡", CONTROLE],
  "Transe": ["🔮", CONTROLE], "Tonto": ["😵", CONTROLE], "Surdo": ["🔇", CONTROLE], "Cego": ["🙈", CONTROLE], "Zetsu": ["🌫️", CONTROLE],
  "Adoecido": ["🤢", FRAQUEZA], "Debilitado": ["📉", FRAQUEZA], "Prejudicado": ["🔻", FRAQUEZA], "Vulnerável": ["💔", FRAQUEZA], "Indefeso": ["🛡️", FRAQUEZA],
  "Exausto": ["🥵", FRAQUEZA], "Fatigado": ["💤", FRAQUEZA], "Machucado": ["🩹", FRAQUEZA], "Surpreso": ["❗", FRAQUEZA],
  "Molhado": ["💧", NEUTRO], "Prendendo a Respiração": ["🫧", NEUTRO],
};
export const simboloCondicao = (nome) => CONDICOES[nome] || ["✦", NEUTRO];

/** Valores de vida/nen/condições de uma ficha. O site grava os máximos reais (com bônus de poderes) em `hud`;
 *  em fichas ainda não salvas depois da atualização, usa o cálculo básico. */
export function vitais(f) {
  const nivel = Math.max(1, Number(f.nivel) || 1);
  const atr = f.atributos || {};
  const pvMax = f.hud?.pvMax ?? (5 + (Number(atr.vigor) || 0)) * nivel;
  const nenMax = f.hud?.nenMax ?? (3 + (Number(atr.prontidao) || 0)) * nivel;
  const condicoes = Object.entries(f.condicoes || {}).filter(([, n]) => n).map(([nome, n]) => ({ nome, n: Number(n) || 1 }));
  return {
    pv: Number(f.pvAtual) || 0, pvMax: Math.max(1, pvMax), pvTemp: Math.max(0, Number(f.pvTemp) || 0),
    nen: Number(f.nenAtual) || 0, nenMax: Math.max(1, nenMax), condicoes,
  };
}
