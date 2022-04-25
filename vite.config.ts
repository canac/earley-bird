/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    watchIgnore: [/^test\/grammars\/.+\.js$/],
  },
});
