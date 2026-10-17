# Zona Liminal — extensão do Owlbear Rodeo

Mostra a **vida** das fichas sobre os tokens do mapa, em tempo real.
- **Inimigos** (fichas "Criatura" e "NPC"): só a barra de vida, sem números.
- **Personagens e invocações**: barra de vida com números + barra fina de Nen.
- Vida Temporária aparece em azul-claro no fim da barra.
- Tokens escondidos pelo Mestre escondem a barra junto.

Como funciona: o **navegador do Mestre** lê as fichas no Firebase e desenha/atualiza as barras no mapa; os jogadores
só veem as barras (não precisam de login nem de permissão extra). Por isso a sala precisa estar aberta no navegador do Mestre.

## Publicar no GitHub Pages
1. Crie um repositório novo (ex.: `zona-liminal-owlbear`) e suba o conteúdo desta pasta.
2. Em *Settings → Secrets and variables → Actions*, crie os mesmos secrets do site: `VITE_FIREBASE_API_KEY`,
   `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
3. Em *Settings → Pages*, escolha **Source: GitHub Actions**. O push na `main` publica sozinho.
4. No Firebase Console → Authentication → Settings → *Authorized domains*, adicione `SEU-USUARIO.github.io`.
5. No Owlbear: perfil → *Add Extension* → cole `https://SEU-USUARIO.github.io/zona-liminal-owlbear/manifest.json`.

## Usar
1. (Só Mestre) Clique no ícone de coração da extensão e entre com a conta de Mestre do site.
2. Vincule os tokens: botão direito no token → **Ficha (Zona Liminal)** → escolha a ficha → *Vincular*;
   ou use **Vincular tokens pelo nome** (token com o mesmo nome da ficha).
3. Salve qualquer ficha no site uma vez após a atualização do `App.jsx`: ela passa a guardar o máximo real de Vida/Nen
   (com bônus de poderes). Até lá a extensão usa o cálculo básico (5 + Vigor) × nível.

## Desenvolver
`npm install` · `npm run dev` · `npm run build` (defina `EXT_URL` para gerar o manifest com os endereços finais).
