import { describe, expect, it } from "vitest";
import { citeKey, validateContent, type ContentInput } from "../src/content/validate";
import type { Motivator } from "../src/content/types";

const motivator = (slug: string, exampleLine: string): Motivator => ({
  slug, shortName: slug[0].toUpperCase() + slug.slice(1), name: slug, gloss: "", namedBy: "", aesthetic: "x", otherNames: "",
  dynamics: [], mechanics: [], exampleLine,
});

function base(): ContentInput {
  return {
    motivators: [
      motivator("challenge", "Tetris (McGonigal 2011, ch. 1; Lazzaro 2004a); Quake (Salen and Zimmerman 2003, ch. 24)."),
      motivator("chance", "Dice and roulette (Caillois, as summarized in Salen and Zimmerman 2003, ch. 22)."),
    ],
    gamesFile: {
      games: [
        { slug: "tetris", title: "Tetris", kind: "video game" },
        { slug: "dice", title: "Dice", kind: "tabletop" },
      ],
      ties: [
        { game: "tetris", motivator: "challenge", asNamed: "Tetris", cite: "McGonigal 2011, ch. 1; Lazzaro 2004a" },
        { game: "dice", motivator: "chance", asNamed: "Dice", cite: "Caillois, as summarized in Salen and Zimmerman 2003, ch. 22" },
      ],
    },
    proposals: [],
    videos: [],
  };
}

describe("citeKey", () => {
  it("keeps everything up to the first year", () => {
    expect(citeKey("Salen and Zimmerman 2003, ch. 24, \"Rewards\"")).toBe("Salen and Zimmerman 2003");
    expect(citeKey("Lazzaro 2004a")).toBe("Lazzaro 2004a");
    expect(citeKey("Caillois, quoted in Henricks 2010, p. 166")).toBe("Caillois, quoted in Henricks 2010");
    expect(citeKey("Quantic Foundry reference sheet")).toBe("Quantic Foundry reference sheet");
  });
});

describe("validateContent", () => {
  it("accepts consistent content", () => {
    expect(validateContent(base())).toEqual([]);
  });

  it("rejects a tie whose name is not in the note's example line", () => {
    const input = base();
    input.gamesFile.ties[0].asNamed = "Tetris Effect";
    expect(validateContent(input).join("\n")).toMatch(/"Tetris Effect" does not appear in the Challenge example games line/);
  });

  it("rejects a tie whose citation is not in the note's example line", () => {
    const input = base();
    input.gamesFile.ties[0].cite = "Koster 2013, p. 40";
    expect(validateContent(input).join("\n")).toMatch(/citation "Koster 2013, p. 40" does not appear/);
  });

  it("rejects bad games: slug, duplicate, kind, and no ties", () => {
    const input = base();
    input.gamesFile.games.push(
      { slug: "Bad Slug", title: "Bad", kind: "video game" },
      { slug: "dice", title: "Dice again", kind: "tabletop" },
      { slug: "loose", title: "Loose", kind: "board" as never },
    );
    const text = validateContent(input).join("\n");
    expect(text).toMatch(/slug must be lowercase words joined by hyphens/);
    expect(text).toMatch(/slug is used twice/);
    expect(text).toMatch(/kind must be one of/);
    expect(text).toMatch(/game "loose" has no tie and no proposal/);
  });

  it("rejects a motivator with no sourced games", () => {
    const input = base();
    input.gamesFile.ties.pop();
    input.gamesFile.games.pop();
    expect(validateContent(input).join("\n")).toMatch(/motivator "chance" has no sourced games/);
  });

  it("checks proposals: game, motivator, mechanic, dynamic, handle, duplicates", () => {
    const input = base();
    input.proposals = [
      { game: "nope", motivator: "chance", mechanic: "m", dynamic: "d", github: "student1" },
      { game: "tetris", motivator: "joy", mechanic: " ", dynamic: "", github: "not a handle" },
      { game: "tetris", motivator: "challenge", mechanic: "m", dynamic: "d", github: "student1" },
      { game: "tetris", motivator: "chance", mechanic: "Pieces arrive at random.", dynamic: "Hope for the long bar.", github: "student1" },
      { game: "tetris", motivator: "chance", mechanic: "Same again.", dynamic: "Same again.", github: "student1" },
    ];
    const text = validateContent(input).join("\n");
    expect(text).toMatch(/no game with slug "nope"; add it to content\/games.json first/);
    expect(text).toMatch(/no motivator "joy"/);
    expect(text).toMatch(/name the mechanic/);
    expect(text).toMatch(/name the dynamic/);
    expect(text).toMatch(/github must be your GitHub username/);
    expect(text).toMatch(/the note already ties this game to this motivator/);
    expect(text).toMatch(/you already proposed this tie/);
  });

  it("lets a proposal be the only link for a new game", () => {
    const input = base();
    input.gamesFile.games.push({ slug: "balatro", title: "Balatro", kind: "video game" });
    input.proposals = [{ game: "balatro", motivator: "chance", mechanic: "Random shop.", dynamic: "Pushing a build.", github: "student-1" }];
    expect(validateContent(input)).toEqual([]);
  });

  it("checks videos: game, id, title, channel, start, duplicates", () => {
    const input = base();
    const ok = { game: "tetris", youtubeId: "abcdefghijk", title: "T", channel: "C" };
    input.videos = [
      ok,
      { ...ok },
      { game: "nope", youtubeId: "short", title: "", channel: "", start: -3 },
    ];
    const text = validateContent(input).join("\n");
    expect(text).toMatch(/already listed for this game/);
    expect(text).toMatch(/no game with slug "nope"/);
    expect(text).toMatch(/is not an 11-character YouTube id/);
    expect(text).toMatch(/title is empty/);
    expect(text).toMatch(/channel is empty/);
    expect(text).toMatch(/start must be a whole number of seconds/);
  });
});
