import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: path.resolve(import.meta.dirname, "."),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "../../src"),
      "@layam/domain-types": path.resolve(import.meta.dirname, "../../packages/domain-types/src/index.ts"),
      "@layam/audio-core": path.resolve(import.meta.dirname, "../../packages/audio-core/src/index.ts"),
      "@layam/storage-core": path.resolve(import.meta.dirname, "../../packages/storage-core/src/index.ts"),
      "@layam/design-system": path.resolve(import.meta.dirname, "../../packages/design-system/src/index.ts"),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "../../dist/offline-player"),
    emptyOutDir: true,
  },
  server: {
    port: 8081,
    fs: {
      allow: [path.resolve(import.meta.dirname, "../..")],
    },
  },
});
