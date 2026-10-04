import type { Atlas } from "../content/types";
import { h, s } from "../lib/dom";
import { layoutConstellation, nearestNode, SIZE } from "./constellation-layout";
import { eligibleLink, overviewHash, parseOverviewState, selectGames } from "./catalog-filter";
import { evidenceTags } from "./evidence-tags";
import "./overview.css";

export function renderOverview(root: HTMLElement, atlas: Atlas, hash = location.hash): () => void {
  const { hubs, nodes } = layoutConstellation(atlas);
  const hubBySlug = new Map(hubs.map((hub) => [hub.slug, hub]));
  const gameBySlug = new Map(atlas.games.map((g) => [g.slug, g]));
  const hasProposals = atlas.games.some((g) => g.links.some((l) => l.kind === "proposed"));

  const search = h("input", { type: "search", id: "game-search", placeholder: "Find a game", "aria-label": "Find a game" });
  const preferenceKey = "motivation-atlas.overview-view.v1";
  let defaultView: "map" | "list" = window.innerWidth < 640 ? "list" : "map";
  try { const saved = localStorage.getItem(preferenceKey); if (saved === "map" || saved === "list") defaultView = saved; } catch { /* Storage is optional. */ }
  let state = parseOverviewState(new URLSearchParams(hash.split("?")[1]), atlas, defaultView);
  const openGame = (slug: string) => { if (matches.has(slug)) location.hash = `#/g/${slug}`; };
  const motivator = h("select", { id: "motivator-filter" }, h("option", { value: "" }, "All motivators"), ...atlas.motivators.map(m => h("option", { value: m.slug }, m.shortName)));
  const relationship = h("select", { id: "relationship-filter" }, h("option", { value: "all" }, "All relationships"), h("option", { value: "sourced" }, "Sourced"), h("option", { value: "proposed" }, "Student readings"));
  const videos = h("input", { id: "videos-filter", type: "checkbox" });
  const reset = h("button", { type: "button", "data-reset": "" }, "Reset filters");
  const clear = h("button", { type: "button" }, "Clear motivator");
  const openMotivator = h("a", { "data-open-motivator": "" }, "Open motivator");
  const results = h("ul", { class: "catalog-results" });
  const viewButtons = (["map", "list"] as const).map(view => {
    const button = h("button", { type: "button", "data-view": view }, view === "map" ? "Map" : "List");
    button.addEventListener("click", () => {
      state.view = view;
      try { localStorage.setItem(preferenceKey, view); } catch { /* Keep the choice in memory. */ }
      apply(true);
    });
    return button;
  });
  let matches = new Set<string>();
  // Crop the square drawing to what is on it, so the map fills its frame.
  const pad = 60;
  const xs = [...hubs, ...nodes].map((p) => p.x);
  const ys = [...hubs, ...nodes].map((p) => p.y);
  const minX = Math.max(0, Math.min(...xs) - pad), minY = Math.max(0, Math.min(...ys) - pad);
  const viewBox = `${minX} ${minY} ${Math.min(SIZE, Math.max(...xs) + pad) - minX} ${Math.min(SIZE, Math.max(...ys) + pad) - minY}`;
  const svg = s("svg", { viewBox, class: "constellation", role: "group", "aria-label": "Map of the eleven motivators and the games tied to each" });
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
      id: `map-game-${n.slug}`, "data-game": n.slug, "data-motivators": n.motivators.join(" "), tabindex: 0, role: "button",
      "aria-label": `${game.title}: ${n.motivators.join(", ")}`,
    },
      s("circle", { cx: n.x, cy: n.y, r: n.multi ? 7 : 5 }),
      s("text", { x: spot.x, y: spot.y, "text-anchor": spot.anchor }, game.title),
    );
    node.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openGame(n.slug); } });
    games.append(node);
  }

  for (const hub of hubs) {
    const width = hub.shortName.length * 11 + 34;
    const a = s("g", { tabindex: 0, role: "button", class: "hub", "data-motivator": hub.slug, "aria-label": `Select ${hub.shortName}` },
      s("rect", { x: hub.x - width / 2, y: hub.y - 19, width, height: 38, rx: 19 }),
      s("text", { x: hub.x, y: hub.y + 6, "text-anchor": "middle" }, hub.shortName),
    );
    const select = () => { state.motivator = hub.slug; apply(true); };
    a.addEventListener("click", select);
    a.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); } });
    hubLayer.append(a);
  }

  // The pointer snaps to the nearest dot, so a reader need not land on a 5-pixel circle exactly.
  const REACH = 22;
  const nodeEls = new Map([...games.querySelectorAll<SVGGElement>("g.game")].map((el) => [el.dataset.game!, el]));
  let hovered: string | null = null;
  function setHover(slug: string | null): void {
    if (slug === hovered) return;
    if (hovered) nodeEls.get(hovered)?.classList.remove("hover");
    hovered = slug;
    if (slug) nodeEls.get(slug)?.classList.add("hover");
    svg.style.cursor = slug ? "pointer" : "";
  }
  function nodeAt(e: PointerEvent | MouseEvent): string | null {
    if ((e.target as Element).closest(".hub")) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return nearestNode(nodes.filter(n => matches.has(n.slug)), p.x, p.y, REACH)?.slug ?? null;
  }
  svg.addEventListener("pointermove", (e) => setHover(nodeAt(e)));
  svg.addEventListener("pointerleave", () => setHover(null));
  svg.addEventListener("click", (e) => {
    const slug = nodeAt(e);
    if (slug) openGame(slug);
  });

  function apply(updateUrl = false): void {
    search.value = state.query; motivator.value = state.motivator ?? "";
    relationship.value = state.relationship; videos.checked = state.videosOnly;
    const selected = selectGames(atlas, state);
    matches = new Set(selected.map(g => g.slug));
    setHover(null);
    svg.classList.toggle("focusing", matches.size !== atlas.games.length);
    for (const el of svg.querySelectorAll<SVGGElement>("g.game")) {
      const game = gameBySlug.get(el.dataset.game!)!;
      const eligible = matches.has(game.slug);
      const excluded = game.links.every(l => l.kind === "proposed") && state.relationship === "sourced";
      el.classList.toggle("lit", eligible);
      el.style.display = excluded ? "none" : "";
      el.setAttribute("tabindex", eligible ? "0" : "-1");
      el.setAttribute("aria-hidden", String(!eligible));
      el.setAttribute("aria-label", `${game.title}: ${game.links.filter(l => eligibleLink(l, state)).map(l => l.motivator).join(", ")}`);
    }
    for (const el of svg.querySelectorAll<SVGLineElement>("line.link")) {
      const eligible = matches.has(el.dataset.game!) && (!state.motivator || el.dataset.motivator === state.motivator)
        && (state.relationship === "all" || el.classList.contains(state.relationship));
      el.classList.toggle("lit", eligible);
      el.style.display = !eligible && el.classList.contains("proposed") ? "none" : "";
    }
    for (const el of svg.querySelectorAll<SVGGElement>(".hub")) {
      const selected = el.dataset.motivator === state.motivator;
      el.classList.toggle("lit", selected); el.setAttribute("aria-pressed", String(selected));
    }
    count.textContent = `${selected.length} ${selected.length === 1 ? "game" : "games"} and activities${selected.length ? "" : ". No matches. Reset filters to explore again."}`;
    results.replaceChildren(...selected.map(game => h("li", {},
      h("a", { href: `#/g/${game.slug}`, id: `result-${game.slug}` }, game.title),
      h("p", { class: "tag" }, `${game.kind} · ${game.videos.length ? "Video available" : "No video yet"}`),
      h("ul", {}, ...game.links.filter(link => eligibleLink(link, state)).map(link => h("li", {},
        h("a", { href: `#/m/${link.motivator}` }, hubBySlug.get(link.motivator)?.shortName ?? link.motivator),
        link.kind === "sourced" ? " — sourced " : " — student reading ",
        ...(link.kind === "sourced" ? evidenceTags(link.cite) : []),
      ))),
    )));
    mapWrap.hidden = state.view !== "map";
    results.classList.toggle("map-results", state.view === "map");
    for (const button of viewButtons) button.setAttribute("aria-pressed", String(button.dataset.view === state.view));
    openMotivator.hidden = !state.motivator; clear.hidden = !state.motivator;
    if (state.motivator) openMotivator.href = `#/m/${state.motivator}`;
    if (updateUrl) history.replaceState(history.state, "", overviewHash(state));
  }
  const count = h("p", { class: "count", "aria-live": "polite", role: "status" });
  const mapWrap = h("div", { class: "constellation-wrap" }, svg);
  search.addEventListener("input", () => { state.query = search.value; apply(true); });
  motivator.addEventListener("change", () => { state.motivator = motivator.value || null; apply(true); });
  relationship.addEventListener("change", () => { state.relationship = relationship.value as typeof state.relationship; apply(true); });
  videos.addEventListener("change", () => { state.videosOnly = videos.checked; apply(true); });
  clear.addEventListener("click", () => { state.motivator = null; apply(true); });
  reset.addEventListener("click", () => { state = { query: "", motivator: null, relationship: "all", videosOnly: false, view: state.view }; apply(true); search.focus(); });

  const explore = h("button", { type: "button", "data-explore": "" }, "Explore games and examples");
  explore.addEventListener("click", () => { search.focus(); search.scrollIntoView?.({ block: "start" }); });

  const page = h("section", { class: "overview" },
    h("div", { class: "overview-intro" },
      h("h1", {}, "Why people play"),
      h("p", {}, "Eleven motivators, the course note's own synthesis of many frameworks, and the games its sources tie to each. The groups overlap: one game can serve several motivators, and one player can want different things on different days. A game linked to several motivators sits between them. Select a motivator to find its games, then open its page to explore mechanics, dynamics, and aesthetic."),
    ),
    h("div", { class: "overview-tools entrance" }, h("a", { href: "#/play/pig" }, "Try a two-minute experiment"), explore),
    h("div", { class: "overview-tools", id: "catalog" },
      search,
      h("label", { for: "motivator-filter" }, "Motivator ", motivator),
      h("label", { for: "relationship-filter" }, "Relationship ", relationship),
      h("label", { for: "videos-filter" }, videos, " With video"),
      h("div", { role: "group", "aria-label": "Catalog view" }, ...viewButtons),
      reset, clear, openMotivator, count,
    ),
    mapWrap,
    results,
    h("nav", { class: "motivator-list", "aria-label": "The eleven motivators" },
      ...hubs.map((hub) => h("a", { href: `#/m/${hub.slug}` }, hub.shortName))),
    h("p", { class: "legend" },
      h("span", { class: "key sourced" }), "Tied by a cited source ",
      hasProposals ? h("span", { class: "key proposed" }) : null, hasProposals ? "Proposed by a student" : null,
    ),
  );
  root.replaceChildren(page);
  apply();
  return () => page.remove();
}
