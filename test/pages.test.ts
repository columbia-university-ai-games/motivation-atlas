// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderGameCard } from "../src/pages/game-card";
import { renderMotivator } from "../src/pages/motivator";
import { renderVideo } from "../src/pages/video";
import { mountSafely } from "../src/minigames/mount-safe";
import type { Atlas } from "../src/content/types";

const evil = "<img src=x onerror=alert(1)>";
const atlas: Atlas = {
  motivators: [{
    slug: "chance", shortName: "Chance", name: "Chance", gloss: "", namedBy: "Caillois 1961 *alea*.",
    aesthetic: "None of MDA's eight.", dynamics: [{ text: "Surprise.", caution: false }],
    mechanics: [{ text: "Dice.", caution: false }, { text: "A caution: luck annoys strategists.", caution: true }],
    exampleLine: "Dice (Caillois).",
  }],
  games: [{
    slug: "dice", title: "Dice", kind: "tabletop",
    links: [
      { kind: "sourced", motivator: "chance", asNamed: "Dice", cite: "Caillois" },
      { kind: "proposed", motivator: "chance", mechanic: evil, dynamic: evil, github: "student" },
    ],
    videos: [{ game: "dice", youtubeId: "abcdefghijk", title: evil, channel: "C", watchFor: evil, start: 30 }],
  }],
};

describe("student text is shown as text", () => {
  it("in the game card", () => {
    const card = renderGameCard(atlas.games[0], atlas);
    expect(card.querySelector("img[src=x]")).toBeNull();
    expect(card.textContent).toContain(evil);
  });
  it("in a video slot", () => {
    const v = renderVideo(atlas.games[0].videos[0]);
    expect(v.querySelectorAll("img").length).toBe(1);
    expect(v.textContent).toContain(evil);
  });
  it("on the motivator page", () => {
    const root = document.createElement("div");
    renderMotivator(root, atlas, "chance");
    expect(root.querySelector("img[src=x]")).toBeNull();
    expect(root.textContent).toContain(evil);
  });
});

describe("renderMotivator", () => {
  it("draws the line from mechanics to the aesthetic and flags cautions", () => {
    const root = document.createElement("div");
    renderMotivator(root, atlas, "chance");
    const stations = [...root.querySelectorAll(".station")].map((el) => el.getAttribute("data-layer"));
    expect(stations).toEqual(["mechanics", "mechanics", "dynamics", "aesthetic"]);
    expect(root.querySelector(".station.caution")?.textContent).toContain("luck annoys strategists");
  });
  it("shows not found, with a link to the map, for an unknown slug", () => {
    const root = document.createElement("div");
    renderMotivator(root, atlas, "nope");
    expect(root.textContent).toContain("No motivator called “nope”");
    expect(root.querySelector('a[href="#/"]')).not.toBeNull();
  });
  it("starts a video at its start time only when clicked", () => {
    const v = renderVideo(atlas.games[0].videos[0]);
    expect(v.querySelector("iframe")).toBeNull();
    v.querySelector("button")!.click();
    expect(v.querySelector("iframe")!.getAttribute("src")).toContain("youtube-nocookie.com/embed/abcdefghijk?start=30");
  });
});

describe("mountSafely", () => {
  it("shows the error and keeps going when a minigame throws", () => {
    const el = document.createElement("div");
    const unmount = mountSafely(el, { slug: "bad", title: "Bad", motivators: ["chance"], mount() { throw new Error("boom"); } });
    expect(el.textContent).toBe("Bad failed to start: boom");
    unmount();
    expect(el.childNodes.length).toBe(0);
  });
});
