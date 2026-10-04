import type { Atlas } from "../content/types";

export interface HubPos { slug: string; shortName: string; x: number; y: number; angle: number }
export interface NodePos { slug: string; x: number; y: number; motivators: string[]; multi: boolean }

export const SIZE = 1200;
const CENTER = SIZE / 2;
const RING = 300;
const PULL = 0.72;

/** Neighbors on the ring share themes, following the note's crosswalk. */
export const RING_ORDER = [
  "challenge", "competition", "fellowship", "meaning", "expression", "fantasy",
  "submission", "discovery", "sensation", "chance", "progress",
];

function separate(points: NodePos[], minDist: number, rounds = 60): void {
  for (let r = 0; r < rounds; r++) {
    let moved = false;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= minDist) continue;
        if (d === 0) { dx = 1; dy = 0; d = 1; }
        const push = (minDist - d) / 2;
        a.x -= (dx / d) * push; a.y -= (dy / d) * push;
        b.x += (dx / d) * push; b.y += (dy / d) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
}

export function layoutConstellation(atlas: Atlas): { hubs: HubPos[]; nodes: NodePos[] } {
  const known = new Set(atlas.motivators.map((m) => m.slug));
  const order = [...RING_ORDER.filter((s) => known.has(s)), ...[...known].filter((s) => !RING_ORDER.includes(s))];
  const hubs: HubPos[] = order.map((slug, i) => {
    const angle = -Math.PI / 2 + (i / order.length) * 2 * Math.PI;
    const shortName = atlas.motivators.find((m) => m.slug === slug)!.shortName;
    return { slug, shortName, angle, x: CENTER + RING * Math.cos(angle), y: CENTER + RING * Math.sin(angle) };
  });
  const hubBySlug = new Map(hubs.map((h) => [h.slug, h]));

  const singles = new Map<string, string[]>();
  const multi: NodePos[] = [];
  for (const g of atlas.games) {
    const motivators = [...new Set(g.links.map((l) => l.motivator))]
      .filter((m) => hubBySlug.has(m))
      .sort((a, b) => order.indexOf(a) - order.indexOf(b));
    if (motivators.length === 0) continue;
    if (motivators.length === 1) {
      singles.set(motivators[0], [...(singles.get(motivators[0]) ?? []), g.slug]);
      continue;
    }
    const mx = motivators.reduce((sum, m) => sum + hubBySlug.get(m)!.x, 0) / motivators.length;
    const my = motivators.reduce((sum, m) => sum + hubBySlug.get(m)!.y, 0) / motivators.length;
    multi.push({ slug: g.slug, x: CENTER + (mx - CENTER) * PULL, y: CENTER + (my - CENTER) * PULL, motivators, multi: true });
  }
  separate(multi, 28);

  const outer: NodePos[] = [];
  for (const [hubSlug, list] of singles) {
    const hub = hubBySlug.get(hubSlug)!;
    const spread = Math.min(0.09, 0.5 / list.length);
    list.forEach((slug, k) => {
      const angle = hub.angle + (k - (list.length - 1) / 2) * spread;
      const r = RING + 90 + (k % 3) * 40;
      outer.push({ slug, x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle), motivators: [hubSlug], multi: false });
    });
  }
  return { hubs, nodes: [...multi, ...outer] };
}

/** Slugs of games whose title contains the query as plain text, ignoring case. */
export function filterGames(atlas: Atlas, query: string): Set<string> {
  const q = query.trim().toLowerCase();
  return new Set(atlas.games.filter((g) => q === "" || g.title.toLowerCase().includes(q)).map((g) => g.slug));
}
