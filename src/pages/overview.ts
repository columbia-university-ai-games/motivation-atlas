import type { Atlas } from "../content/types";
import { h, s } from "../lib/dom";
import { filterGames, layoutConstellation, SIZE } from "./constellation-layout";
import "./overview.css";

export function renderOverview(root: HTMLElement, atlas: Atlas, openGame: (slug: string) => void): () => void {
  const { hubs, nodes } = layoutConstellation(atlas);
  const hubBySlug = new Map(hubs.map((hub) => [hub.slug, hub]));
  const gameBySlug = new Map(atlas.games.map((g) => [g.slug, g]));
  const hasProposals = atlas.games.some((g) => g.links.some((l) => l.kind === "proposed"));

  const search = h("input", { type: "search", id: "game-search", placeholder: "Find a game", "aria-label": "Find a game" });
  const proposalsToggle = h("input", { type: "checkbox", id: "show-proposals", checked: true });
  // Crop the square drawing to what is on it, so the map fills its frame.
  const pad = 60;
  const xs = [...hubs, ...nodes].map((p) => p.x);
  const ys = [...hubs, ...nodes].map((p) => p.y);
  const minX = Math.max(0, Math.min(...xs) - pad), minY = Math.max(0, Math.min(...ys) - pad);
  const viewBox = `${minX} ${minY} ${Math.min(SIZE, Math.max(...xs) + pad) - minX} ${Math.min(SIZE, Math.max(...ys) + pad) - minY}`;
  const svg = s("svg", { viewBox, class: "constellation", role: "img", "aria-label": "Map of the eleven motivators and the games tied to each" });
  const links = s("g", { class: "links" });
  const games = s("g", { class: "games" });
  const hubLayer = s("g", { class: "hubs" });
  svg.append(links, games, hubLayer);

  const placed: Array<{ x0: number; x1: number; cy: number }> = [];
  for (const n of nodes) {
    const game = gameBySlug.get(n.slug)!;
    const onlyProposed = game.links.every((l) => l.kind === "proposed");
    for (const link of game.links) {
      const hub = hubBySlug.get(link.motivator);
      if (!hub) continue;
      links.append(s("line", {
        x1: n.x, y1: n.y, x2: hub.x, y2: hub.y,
        class: `link ${link.kind}`, "data-game": n.slug, "data-motivator": link.motivator,
      }));
    }
    // A label sits beside its dot. Inner labels point outward from the center; outer labels point back
    // toward the ring so they stay inside the drawing. Inner labels then avoid dots, hub pills and labels
    // already placed, trying the other side, then below, then above.
    const width = game.title.length * 7.5;
    type Spot = { x: number; y: number; anchor: "start" | "middle" | "end"; x0: number; x1: number; cy: number };
    const side = (toRight: boolean): Spot => toRight
      ? { x: n.x + 11, y: n.y + 5, anchor: "start", x0: n.x + 8, x1: n.x + 14 + width, cy: n.y }
      : { x: n.x - 11, y: n.y + 5, anchor: "end", x0: n.x - 14 - width, x1: n.x - 8, cy: n.y };
    const vertical = (dy: number): Spot => ({ x: n.x, y: n.y + dy + 5, anchor: "middle", x0: n.x - width / 2, x1: n.x + width / 2, cy: n.y + dy });
    const outward = n.multi ? n.x >= SIZE / 2 : n.x < SIZE / 2;
    const free = (spot: Spot) =>
      !nodes.some((o) => o !== n && Math.abs(o.y - spot.cy) < 12 && o.x > spot.x0 - 6 && o.x < spot.x1 + 6) &&
      !hubs.some((hub) => Math.abs(hub.y - spot.cy) < 26 && hub.x + hub.shortName.length * 5.5 + 17 > spot.x0 && hub.x - hub.shortName.length * 5.5 - 17 < spot.x1) &&
      !placed.some((b) => Math.abs(b.cy - spot.cy) < 16 && b.x1 > spot.x0 && b.x0 < spot.x1);
    const candidates = n.multi ? [side(outward), side(!outward), vertical(20), vertical(-20)] : [side(outward)];
    const spot = candidates.find(free) ?? candidates[0];
    if (n.multi) placed.push(spot);
    const node = s("g", {
      class: `game ${n.multi ? "multi" : "single"} ${game.kind.replace(" ", "-")}${onlyProposed ? " proposed-only" : ""}`,
      "data-game": n.slug, "data-motivators": n.motivators.join(" "), tabindex: 0, role: "button",
      "aria-label": `${game.title}: ${n.motivators.join(", ")}`,
    },
      s("circle", { cx: n.x, cy: n.y, r: n.multi ? 7 : 5 }),
      s("text", { x: spot.x, y: spot.y, "text-anchor": spot.anchor }, game.title),
    );
    node.addEventListener("click", () => openGame(n.slug));
    node.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openGame(n.slug); } });
    games.append(node);
  }

  for (const hub of hubs) {
    const width = hub.shortName.length * 11 + 34;
    const a = s("a", { href: `#/m/${hub.slug}`, class: "hub", "data-motivator": hub.slug, "aria-label": `${hub.shortName}: open its page` },
      s("rect", { x: hub.x - width / 2, y: hub.y - 19, width, height: 38, rx: 19 }),
      s("text", { x: hub.x, y: hub.y + 6, "text-anchor": "middle" }, hub.shortName),
    );
    a.addEventListener("mouseenter", () => setActive(hub.slug));
    a.addEventListener("focus", () => setActive(hub.slug));
    a.addEventListener("mouseleave", () => setActive(null));
    a.addEventListener("blur", () => setActive(null));
    hubLayer.append(a);
  }

  let active: string | null = null;
  function setActive(slug: string | null): void {
    active = slug;
    apply();
  }
  function apply(): void {
    const matches = filterGames(atlas, search.value);
    const searching = search.value.trim() !== "";
    svg.classList.toggle("hide-proposals", !proposalsToggle.checked);
    svg.classList.toggle("focusing", active !== null || searching);
    for (const el of svg.querySelectorAll<SVGGElement>("g.game")) {
      const slug = el.dataset.game!;
      const lit = (active !== null && el.dataset.motivators!.split(" ").includes(active)) || (searching && matches.has(slug));
      el.classList.toggle("lit", lit);
    }
    for (const el of svg.querySelectorAll<SVGLineElement>("line.link")) {
      const lit = (active !== null && el.dataset.motivator === active) || (searching && matches.has(el.dataset.game!));
      el.classList.toggle("lit", lit);
    }
    for (const el of svg.querySelectorAll<SVGAElement>("a.hub")) el.classList.toggle("lit", el.dataset.motivator === active);
    // Outer labels would overprint, so lit titles are listed here instead of on the map.
    const lit = [...svg.querySelectorAll<SVGGElement>("g.game.lit")].map((el) => gameBySlug.get(el.dataset.game!)!.title);
    const list = lit.length > 16 ? `${lit.slice(0, 16).join(", ")} and ${lit.length - 16} more` : lit.join(", ");
    if (active !== null) count.textContent = `${hubBySlug.get(active)!.shortName}: ${list}`;
    else if (searching) count.textContent = matches.size ? `${matches.size} found: ${list}` : "No game matches";
    else count.textContent = `${atlas.games.length} games and activities. Hover a dot to see its name.`;
  }

  const count = h("span", { class: "count", "aria-live": "polite" });
  search.addEventListener("input", apply);
  proposalsToggle.addEventListener("change", apply);

  const page = h("section", { class: "overview" },
    h("div", { class: "overview-intro" },
      h("h1", {}, "Why people play"),
      h("p", {}, "Eleven motivators from the course note, and the games its sources tie to each. A game linked to several motivators sits between them. Hover a motivator to light up its games; open it to see how its mechanics produce its dynamics and aesthetic."),
    ),
    h("div", { class: "overview-tools" },
      search,
      hasProposals ? h("label", { for: "show-proposals" }, proposalsToggle, " Show student readings") : null,
      count,
    ),
    h("div", { class: "constellation-wrap" }, svg),
    h("p", { class: "legend" },
      h("span", { class: "key sourced" }), "Tied by a cited source ",
      hasProposals ? h("span", { class: "key proposed" }) : null, hasProposals ? "Proposed by a student" : null,
    ),
  );
  root.replaceChildren(page);
  apply();
  return () => page.remove();
}
