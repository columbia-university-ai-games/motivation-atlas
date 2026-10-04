import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EVIDENCE, evidenceFor } from "../src/content/evidence";

describe("evidenceFor", () => {
  it("sorts a citation by how its source chose the game, as the note's attribution section does", () => {
    expect(evidenceFor("Yee 2015")).toEqual(["statistic"]);
    expect(evidenceFor("Ryan et al. 2006")).toEqual(["study"]);
    expect(evidenceFor('Salen and Zimmerman 2003, ch. 24, "Sculpting Desire"')).toEqual(["illustration"]);
    expect(evidenceFor("Quantic Foundry reference sheet")).toEqual(["illustration"]);
  });

  it("lists each kind once for a tie with several sources", () => {
    expect(evidenceFor("Hunicke et al. 2004; McGonigal 2011, ch. 1; Yee 2015")).toEqual(["illustration", "statistic"]);
  });

  it("classifies every tie in games.json", () => {
    const { ties } = JSON.parse(readFileSync("content/games.json", "utf8")) as { ties: Array<{ cite: string }> };
    const unknown = ties.filter((t) => evidenceFor(t.cite).length === 0).map((t) => t.cite);
    expect(unknown).toEqual([]);
  });

  it("explains each kind in plain words", () => {
    expect(EVIDENCE.statistic.label).toBe("favored by high scorers");
    expect(EVIDENCE.statistic.explain).toMatch(/not why/);
  });
});
