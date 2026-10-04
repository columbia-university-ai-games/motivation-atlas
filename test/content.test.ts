import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadContent } from "../src/content/load";

const read = (path: string) => readFileSync(path, "utf8");

describe("the repository's content", () => {
  it("passes every check", () => {
    const { errors, input } = loadContent({
      note: read("content/player-motivations.md"),
      gamesJson: read("content/games.json"),
      proposalsJson: read("content/proposals.json"),
      videosCsv: read("content/videos.csv"),
      sourcesCsv: read("content/sources.csv"),
    });
    expect(errors).toEqual([]);
    expect(input.videos.length).toBeGreaterThan(10);
  });
});
