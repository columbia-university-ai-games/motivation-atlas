import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseNote } from "../src/content/parse-note";
import { validateContent } from "../src/content/validate";

const read = (path: string) => readFileSync(path, "utf8");

describe("the repository's content", () => {
  it("passes every check", () => {
    const errors = validateContent({
      motivators: parseNote(read("content/player-motivations.md")),
      gamesFile: JSON.parse(read("content/games.json")),
      proposals: JSON.parse(read("content/proposals.json")),
      videos: JSON.parse(read("content/videos.json")),
    });
    expect(errors).toEqual([]);
  });
});
