import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const doc = readFileSync("AGENTS.md", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

describe("AGENTS.md", () => {
  it("names only files that exist", () => {
    const paths = [...doc.matchAll(/`((?:content|src|scripts|test|e2e|\.github)\/[^`*<>\s]+)`/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(5);
    for (const p of paths) expect(existsSync(p), p).toBe(true);
  });
  it("names only npm scripts that exist", () => {
    const scripts = [...doc.matchAll(/npm run ([a-z0-9:-]+)/g)].map((m) => m[1]);
    for (const s of scripts) expect(pkg.scripts[s], `npm run ${s}`).toBeDefined();
  });
  it("uses no em dashes", () => {
    expect(doc).not.toContain("—");
  });
});
