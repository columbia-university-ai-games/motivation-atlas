// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseNote } from "../src/content/parse-note";
import { minigames } from "../src/minigames/registry";
import { template } from "../src/minigames/_template";
import type { Minigame } from "../src/minigames/types";

const motivators = new Set(parseNote(readFileSync("content/player-motivations.md", "utf8")).map((m) => m.slug));
const SECTIONS = ["## Mechanic", "## Dynamic", "## Aesthetic", "## Sources"];

afterEach(() => vi.useRealTimers());

function checkContract(game: Minigame, folder: string): void {
  it(`${folder}: names real motivators and has a complete README`, () => {
    expect(game.motivators.length).toBeGreaterThan(0);
    for (const m of game.motivators) expect(motivators.has(m), `unknown motivator "${m}"`).toBe(true);
    const readme = `src/minigames/${folder}/README.md`;
    expect(existsSync(readme), readme).toBe(true);
    const text = readFileSync(readme, "utf8");
    for (const section of SECTIONS) expect(text, `${readme} needs "${section}"`).toContain(section);
  });

  it(`${folder}: mounts with a mechanic toggle and unmounts cleanly`, () => {
    vi.useFakeTimers();
    const el = document.createElement("div");
    document.body.append(el);
    const unmount = game.mount(el);
    expect(el.childNodes.length).toBeGreaterThan(0);
    expect(el.querySelector("[data-mechanic]"), "needs an element with data-mechanic").not.toBeNull();
    unmount();
    expect(el.childNodes.length).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    el.remove();
  });
}

describe("registered minigames", () => {
  it("have unique slugs that match their folders", () => {
    const slugs = minigames.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(existsSync(`src/minigames/${slug}/index.ts`), slug).toBe(true);
  });
  for (const game of minigames) checkContract(game, game.slug);
});

describe("the template", () => {
  checkContract(template, "_template");
});
