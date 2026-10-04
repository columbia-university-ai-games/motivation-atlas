import type { Atlas, AtlasGame, Link } from "../content/types";

export type CatalogFilter = { query: string; motivator: string | null; relationship: "all" | "sourced" | "proposed"; videosOnly: boolean };
export type OverviewState = CatalogFilter & { view: "map" | "list" };
export function parseOverviewState(params: URLSearchParams, atlas: Atlas, defaultView: "map" | "list"): OverviewState {
  const motivator = params.get("motivator");
  const relationship = params.get("relationship");
  const view = params.get("view");
  return {
    query: params.get("q") ?? "",
    motivator: atlas.motivators.some(m => m.slug === motivator) ? motivator : null,
    relationship: relationship === "sourced" || relationship === "proposed" ? relationship : "all",
    videosOnly: params.get("videos") === "1",
    view: view === "map" || view === "list" ? view : defaultView,
  };
}
export function overviewHash(state: OverviewState): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.motivator) params.set("motivator", state.motivator);
  if (state.relationship !== "all") params.set("relationship", state.relationship);
  if (state.videosOnly) params.set("videos", "1");
  params.set("view", state.view);
  return `#/?${params}`;
}
export function eligibleLink(link: Link, filter: CatalogFilter): boolean {
  return (!filter.motivator || link.motivator === filter.motivator)
    && (filter.relationship === "all" || link.kind === filter.relationship);
}
export function selectGames(atlas: Atlas, filter: CatalogFilter): AtlasGame[] {
  return atlas.games.filter(game => game.title.toLowerCase().includes(filter.query.trim().toLowerCase())
    && (!filter.videosOnly || game.videos.length > 0)
    && ((!filter.motivator && filter.relationship === "all") || game.links.some(link => eligibleLink(link, filter))));
}
