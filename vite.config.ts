import { defineConfig } from "vitest/config";
import { contentCheck } from "./src/content/vite-plugin.ts";

export default defineConfig({
  base: "./",
  plugins: [contentCheck()],
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
