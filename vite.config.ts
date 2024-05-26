import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const pixiDependencies = [
  "pixi",
  "@pixi/colord",
  "@types/css-font-loading-module",
  "@types/earcut",
  "@webgpu/types",
  "@xmldom/xmldom",
  "earcut",
  "eventemitter3",
  "ismobilejs",
  "parse-svg-path",
];

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [vue()],
  server: {
    port: 3000,
  },
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              pixiDependencies.some((dependency) => id.includes(dependency))
            ) {
              return "pixi";
            }

            return "vendor";
          }
        },
      },
    },
  },
}));
