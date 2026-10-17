import { defineConfig } from "vite";
import { resolve } from "node:path";

// Gera o manifest.json com endereços absolutos a partir de EXT_URL
// (ex.: https://SEU-USUARIO.github.io/zona-liminal-owlbear/).
function manifestPlugin() {
  return {
    name: "manifest-owlbear",
    generateBundle() {
      const base = (process.env.EXT_URL || "").replace(/\/?$/, "/");
      const u = (p) => (base === "/" ? p : base + p);
      const manifest = {
        name: "Zona Liminal — Vida",
        version: "1.0.0",
        manifest_version: 1,
        description: "Mostra a vida (e o Nen dos aliados) das fichas da mesa sobre os tokens, em tempo real.",
        author: "Zona Liminal",
        action: { title: "Zona Liminal", icon: u("icone-vida.svg"), popover: u("index.html"), width: 320, height: 400 },
        background_url: u("background.html"),
      };
      this.emitFile({ type: "asset", fileName: "manifest.json", source: JSON.stringify(manifest, null, 2) });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [manifestPlugin()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "background.html"),
        link: resolve(__dirname, "link.html"),
      },
    },
  },
});
