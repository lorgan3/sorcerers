/// <reference types="vitest" />
import { defineConfig } from "vite";
import type { UserConfig as VitestUserConfigInterface } from "vitest/config";
import vue from "@vitejs/plugin-vue";

const vitestConfig: VitestUserConfigInterface = {
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./setupAfterEnv.ts"],
  },
};

export default defineConfig({
  plugins: [vue()],
  test: vitestConfig.test,
} as any); // @TODO: this cast should not be necessary
