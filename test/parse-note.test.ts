import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseNote } from "../src/content/parse-note";

const fixture = [
  "# Title",
  "",
  "## The eleven motivators",
  "",
  "### Challenge and mastery",
  "",
  "The fiero of triumph over adversity.",
  "",
  "- **Named by:** LeBlanc *Challenge*.",
  "- **Aesthetic:** Challenge, \"game as obstacle course\".",
  "- **Dynamics:**",
  "  - Time pressure (Hunicke et al. 2004, p. 3).",
  "- **Mechanics:**",
  "  - Score-keeping (Malone 1980, p. 66).",
  "  - A caution: harsh punishment can backfire.",
  "- **Example games:** Tetris (Lazzaro 2004a).",
  "",
  "### Chance",
  "",
  "- **Named by:** Caillois 1961 *alea*.",
  "- **Aesthetic:** None of MDA's eight.",
  "- **Dynamics:**",
  "  - Surprise.",
  "- **Mechanics:**",
  "  - Dice.",
  "- **Example games:** Dice and roulette (Caillois).",
  "",
  "## What the course books contribute",
  "",
  "### Not a motivator",
].join("\n");

describe("parseNote", () => {
  it("reads each motivator section and stops at the next level-two heading", () => {
    const ms = parseNote(fixture);
    expect(ms.map((m) => m.slug)).toEqual(["challenge", "chance"]);
    const [c] = ms;
    expect(c.shortName).toBe("Challenge");
    expect(c.name).toBe("Challenge and mastery");
    expect(c.gloss).toBe("The fiero of triumph over adversity.");
    expect(c.namedBy).toBe("LeBlanc *Challenge*.");
    expect(c.aesthetic).toBe("Challenge, \"game as obstacle course\".");
    expect(c.dynamics).toEqual([{ text: "Time pressure (Hunicke et al. 2004, p. 3).", caution: false }]);
    expect(c.mechanics[1]).toEqual({ text: "A caution: harsh punishment can backfire.", caution: true });
    expect(c.exampleLine).toBe("Tetris (Lazzaro 2004a).");
    expect(ms[1].gloss).toBe("");
  });

  it("parses Windows line endings the same way", () => {
    expect(parseNote(fixture.replace(/\n/g, "\r\n"))).toEqual(parseNote(fixture));
  });

  it("joins a wrapped nested item onto the item above", () => {
    const wrapped = fixture.replace("  - Surprise.", "  - Surprise that\n    keeps going.");
    expect(parseNote(wrapped)[1].dynamics[0].text).toBe("Surprise that keeps going.");
  });

  it("fails loudly on an unknown label or a missing section", () => {
    expect(() => parseNote(fixture.replace("Named by", "Coined by"))).toThrow(/unknown label "Coined by"/);
    expect(() => parseNote("# Nothing here")).toThrow(/The eleven motivators/);
  });

  it("parses the real note into eleven complete motivators", () => {
    const ms = parseNote(readFileSync("content/player-motivations.md", "utf8"));
    expect(ms.map((m) => m.slug)).toEqual([
      "challenge", "competition", "progress", "discovery", "fantasy", "expression",
      "fellowship", "sensation", "chance", "submission", "meaning",
    ]);
    for (const m of ms) {
      expect(m.aesthetic, m.slug).not.toBe("");
      expect(m.dynamics.length, m.slug).toBeGreaterThan(0);
      expect(m.mechanics.length, m.slug).toBeGreaterThan(0);
      expect(m.exampleLine, m.slug).not.toBe("");
    }
  });
});
