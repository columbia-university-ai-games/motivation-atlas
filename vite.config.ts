import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
