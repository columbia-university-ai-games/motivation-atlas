import { expect, it } from "vitest";
import { loadAtlas } from "../src/content/atlas";
import { overviewHash, parseOverviewState, selectGames, type OverviewState } from "../src/pages/catalog-filter";
const atlas = loadAtlas();
atlas.games = [
  { slug: "mixed", title: "Mixed Game", kind: "tabletop", links: [
    { kind: "sourced", motivator: "chance", asNamed: "Mixed", cite: "Source" },
    { kind: "proposed", motivator: "challenge", mechanic: "Rule", dynamic: "Behavior", github: "student" },
  ], videos: [{ game: "mixed", youtubeId: "abcdefghijk", title: "Video", channel: "Channel" }] },
  { slug: "proposal", title: "Proposal Game", kind: "activity", links: [
    { kind: "proposed", motivator: "chance", mechanic: "Rule", dynamic: "Behavior", github: "student" },
  ], videos: [] },
];
const base: OverviewState = { query: "", motivator: null, relationship: "all", videosOnly: false, view: "list" };
it("intersects title, same-link evidence/motivator and video filters in catalog order", () => {
  expect(selectGames(atlas, { ...base, query: "GAME" }).map(g => g.slug)).toEqual(["mixed", "proposal"]);
  expect(selectGames(atlas, { ...base, motivator: "challenge", relationship: "sourced" })).toEqual([]);
  expect(selectGames(atlas, { ...base, motivator: "chance", relationship: "proposed" }).map(g => g.slug)).toEqual(["proposal"]);
  expect(selectGames(atlas, { ...base, videosOnly: true }).map(g => g.slug)).toEqual(["mixed"]);
  expect(selectGames(atlas, { ...base, query: "proposal", videosOnly: true })).toEqual([]);
});
it("normalizes bad parameters and round trips public filters", () => {
  expect(parseOverviewState(new URLSearchParams("view=no&motivator=no&relationship=no&videos=true"), atlas, "list")).toEqual(base);
  const state: OverviewState = { ...base, query: "Mixed & Game", motivator: "chance", relationship: "sourced", videosOnly: true };
  expect(parseOverviewState(new URLSearchParams(overviewHash(state).split("?")[1]), atlas, "map")).toEqual(state);
});
