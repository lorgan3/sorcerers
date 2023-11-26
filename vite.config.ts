import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

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
            if (id.includes("pixi")) {
              return "pixi";
            }

            return "vendor";
          }
        },
      },
    },
  },
}));
