import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildAtlas } from "../src/content/build-atlas";
import { parseNote } from "../src/content/parse-note";
import { filterGames, layoutConstellation, nearestNode, RING_ORDER, SIZE } from "../src/pages/constellation-layout";

const read = (p: string) => readFileSync(p, "utf8");
const atlas = buildAtlas({
  motivators: parseNote(read("content/player-motivations.md")),
  gamesFile: JSON.parse(read("content/games.json")),
  proposals: JSON.parse(read("content/proposals.json")),
  videos: [],
});

describe("layoutConstellation", () => {
  const { hubs, nodes } = layoutConstellation(atlas);

  it("puts the eleven hubs on the ring in the agreed order", () => {
    expect(hubs.map((h) => h.slug)).toEqual(RING_ORDER);
  });

  it("places every game exactly once, inside the drawing", () => {
    expect(nodes.map((n) => n.slug).sort()).toEqual(atlas.games.map((g) => g.slug).sort());
    for (const n of nodes) {
      expect(n.x, n.slug).toBeGreaterThan(20);
      expect(n.x, n.slug).toBeLessThan(SIZE - 20);
      expect(n.y, n.slug).toBeGreaterThan(20);
      expect(n.y, n.slug).toBeLessThan(SIZE - 20);
    }
  });

  it("marks games with several motivators and keeps every node apart", () => {
    const halo = nodes.find((n) => n.slug === "halo")!;
    expect(halo.multi).toBe(true);
    expect(halo.motivators.sort()).toEqual(["challenge", "meaning", "sensation"]);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        expect(d, `${nodes[i].slug} and ${nodes[j].slug}`).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it("is deterministic", () => {
    expect(layoutConstellation(atlas)).toEqual(layoutConstellation(atlas));
  });
});

describe("filterGames", () => {
  it("matches titles case-insensitively as plain text", () => {
    expect([...filterGames(atlas, "halo")]).toEqual(["halo"]);
    expect(filterGames(atlas, "C++").size).toBe(0);
    expect(filterGames(atlas, "(").size).toBe(0);
    expect(filterGames(atlas, "zzz").size).toBe(0);
  });
  it("returns every game for an empty query", () => {
    expect(filterGames(atlas, "  ").size).toBe(atlas.games.length);
  });
});

describe("nearestNode", () => {
  const nodes = [
    { slug: "a", x: 100, y: 100, motivators: [], multi: false },
    { slug: "b", x: 120, y: 100, motivators: [], multi: false },
  ];
  it("snaps to the closest dot within reach", () => {
    expect(nearestNode(nodes, 104, 103, 24)?.slug).toBe("a");
    expect(nearestNode(nodes, 113, 100, 24)?.slug).toBe("b");
  });
  it("returns nothing when no dot is within reach", () => {
    expect(nearestNode(nodes, 200, 200, 24)).toBeNull();
  });
});
