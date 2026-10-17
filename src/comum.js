export const KEY_LINK = "com.zonaliminal.vida/ficha"; // metadata do token: id da ficha
export const KEY_BAR = "com.zonaliminal.vida/barra";  // metadata das barras criadas pela extensão

/** Inimigo = ficha criada pelo Mestre (Criatura / NPC): só mostra a barra, sem números. */
export const ehInimigo = (f) => f.rotulo === "Criatura" || f.rotulo === "NPC";

/** Valores de vida/nen de uma ficha. O site grava os máximos reais (com bônus de poderes) em `hud`;
 *  em fichas ainda não salvas depois da atualização, usa o cálculo básico. */
export function vitais(f) {
  const nivel = Math.max(1, Number(f.nivel) || 1);
  const atr = f.atributos || {};
  const pvMax = f.hud?.pvMax ?? (5 + (Number(atr.vigor) || 0)) * nivel;
  const nenMax = f.hud?.nenMax ?? (3 + (Number(atr.prontidao) || 0)) * nivel;
  return {
    pv: Number(f.pvAtual) || 0, pvMax: Math.max(1, pvMax), pvTemp: Math.max(0, Number(f.pvTemp) || 0),
    nen: Number(f.nenAtual) || 0, nenMax: Math.max(1, nenMax),
  };
}
