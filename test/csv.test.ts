import { describe, expect, it } from "vitest";
import { parseCsv, readSources, readVideos } from "../src/content/csv";

describe("parseCsv", () => {
  it("reads rows by header, with quoted commas, doubled quotes and line breaks in quotes", () => {
    const text = 'game,title\r\ntetris,"Tetris, the ""classic"""\r\nmyst,"Two\nlines"\r\n';
    expect(parseCsv(text)).toEqual({
      rows: [{ game: "tetris", title: 'Tetris, the "classic"' }, { game: "myst", title: "Two\nlines" }],
      errors: [],
    });
  });

  it("ignores a spreadsheet's byte-order mark and blank lines, and trims header names", () => {
    expect(parseCsv("﻿game , title\n\ntetris,T\n\n").rows).toEqual([{ game: "tetris", title: "T" }]);
  });

  it("reports a row with the wrong number of cells by its spreadsheet row number", () => {
    expect(parseCsv("a,b\n1,2\n1,2,3\n").errors).toEqual(["row 3 has 3 cells; the header has 2"]);
  });

  it("reports an unclosed quote", () => {
    expect(parseCsv('a,b\n1,"oops\n').errors[0]).toMatch(/unclosed quote/);
  });
});

describe("readVideos", () => {
  it("turns rows into videos, with start as a number and empty optional cells left out", () => {
    const { videos } = readVideos("game,youtubeId,title,channel,start,watchFor\ntetris,abcdefghijk,T,C,,\nmyst,bcdefghijkl,M,C,95,The first switch\n");
    expect(videos).toEqual([
      { game: "tetris", youtubeId: "abcdefghijk", title: "T", channel: "C" },
      { game: "myst", youtubeId: "bcdefghijkl", title: "M", channel: "C", start: 95, watchFor: "The first switch" },
    ]);
  });

  it("names a missing column", () => {
    expect(readVideos("game,title\ntetris,T\n").errors).toEqual(["content/videos.csv: the header needs the columns youtubeId, channel"]);
  });
});

describe("readSources", () => {
  it("reads link overrides keyed by citation", () => {
    expect(readSources("key,url,note\nSchell 2019,https://example.com/schell,e-book\n").sources)
      .toEqual([{ key: "Schell 2019", url: "https://example.com/schell", note: "e-book" }]);
  });
});
