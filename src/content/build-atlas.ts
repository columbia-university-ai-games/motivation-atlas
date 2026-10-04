import type { Atlas, AtlasGame, Link } from "./types";
import type { ContentInput } from "./validate";

export function buildAtlas(input: ContentInput): Atlas {
  const games: AtlasGame[] = input.gamesFile.games.map((g) => {
    const sourced: Link[] = input.gamesFile.ties
      .filter((t) => t.game === g.slug)
      .map((t) => ({ kind: "sourced", motivator: t.motivator, asNamed: t.asNamed, cite: t.cite }));
    const proposed: Link[] = input.proposals
      .filter((p) => p.game === g.slug)
      .map((p) => ({ kind: "proposed", motivator: p.motivator, mechanic: p.mechanic, dynamic: p.dynamic, github: p.github }));
    return { ...g, links: [...sourced, ...proposed], videos: input.videos.filter((v) => v.game === g.slug) };
  });
  games.sort((a, b) => a.title.localeCompare(b.title));
  return { motivators: input.motivators, games };
}
