import { describe, expect, it } from "vitest";
import { classifyOembed } from "../src/content/oembed";

const v = { game: "tetris", youtubeId: "abcdefghijk", title: "Tetris longplay", channel: "World of Longplays" };

describe("classifyOembed", () => {
  it("accepts a matching video", () => {
    expect(classifyOembed(200, { title: v.title, author_name: v.channel }, v)).toEqual({ ok: true, message: "exists and embeds" });
  });
  it("accepts a video whose title changed, and says what to update", () => {
    const r = classifyOembed(200, { title: "New title", author_name: v.channel }, v);
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/title on YouTube is "New title"/);
  });
  it("refuses missing, private, blocked and unreachable videos", () => {
    expect(classifyOembed(404, null, v)).toMatchObject({ ok: false, message: expect.stringMatching(/no such video/) });
    expect(classifyOembed(400, null, v)).toMatchObject({ ok: false, message: expect.stringMatching(/not a valid YouTube id/) });
    expect(classifyOembed(401, null, v)).toMatchObject({ ok: false, message: expect.stringMatching(/disabled embedding/) });
    expect(classifyOembed(403, null, v)).toMatchObject({ ok: false, message: expect.stringMatching(/disabled embedding/) });
    expect(classifyOembed(0, null, v)).toMatchObject({ ok: false, message: expect.stringMatching(/could not reach YouTube/) });
    expect(classifyOembed(500, null, v)).toMatchObject({ ok: false, message: "unexpected response 500" });
  });
});
