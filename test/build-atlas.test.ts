import { describe, expect, it } from "vitest";
import { buildAtlas } from "../src/content/build-atlas";
import type { ContentInput } from "../src/content/validate";

const input: ContentInput = {
  motivators: [],
  gamesFile: {
    games: [
      { slug: "zork", title: "Zork", kind: "video game" },
      { slug: "chess", title: "Chess", kind: "tabletop" },
    ],
    ties: [{ game: "chess", motivator: "competition", asNamed: "Chess", cite: "Caillois" }],
  },
  proposals: [{ game: "chess", motivator: "fellowship", mechanic: "m", dynamic: "d", github: "s" },
              { game: "zork", motivator: "discovery", mechanic: "m", dynamic: "d", github: "s" }],
  videos: [{ game: "chess", youtubeId: "abcdefghijk", title: "T", channel: "C" }],
};

describe("buildAtlas", () => {
  it("sorts games by title and lists sourced links before proposed ones", () => {
    const atlas = buildAtlas(input);
    expect(atlas.games.map((g) => g.slug)).toEqual(["chess", "zork"]);
    expect(atlas.games[0].links.map((l) => l.kind)).toEqual(["sourced", "proposed"]);
    expect(atlas.games[0].videos).toHaveLength(1);
    expect(atlas.games[1].videos).toEqual([]);
  });
});
