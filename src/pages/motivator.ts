import type { Atlas, NoteItem } from "../content/types";
import { h } from "../lib/dom";
import { inline } from "../lib/markdown";
import { mountSafely } from "../minigames/mount-safe";
import { minigamesFor } from "../minigames/registry";
import { renderNotFound } from "./not-found";
import { renderVideo } from "./video";
import "./motivator.css";

function station(layer: "mechanics" | "dynamics" | "aesthetic", item: NoteItem): HTMLElement {
  const li = h("li", { class: `station ${layer}${item.caution ? " caution" : ""}`, "data-layer": layer });
  li.innerHTML = inline(item.text); // course note text only
  return li;
}

export function renderMotivator(root: HTMLElement, atlas: Atlas, slug: string): () => void {
  const m = atlas.motivators.find((x) => x.slug === slug);
  if (!m) return renderNotFound(root, `No motivator called “${slug}”. The map shows all eleven.`);

  const namedBy = h("p", { class: "named-by" });
  namedBy.innerHTML = `<strong>Named by:</strong> ${inline(m.namedBy)}`;

  const line = h("ol", { class: "transit" },
    h("li", { class: "layer-label" }, "Mechanics: the rules a designer builds"),
    ...m.mechanics.map((item) => station("mechanics", item)),
    h("li", { class: "layer-label" }, "Dynamics: what emerges while the rules run"),
    ...m.dynamics.map((item) => station("dynamics", item)),
    h("li", { class: "layer-label" }, "Aesthetic: what the player feels"),
    station("aesthetic", { text: m.aesthetic, caution: false }),
  );

  const games = atlas.games.filter((g) => g.links.some((l) => l.kind === "sourced" && l.motivator === slug));
  const readings = atlas.games.flatMap((g) => g.links
    .filter((l) => l.kind === "proposed" && l.motivator === slug)
    .map((l) => ({ game: g, link: l as Extract<typeof l, { kind: "proposed" }> })));

  const gameList = h("ul", { class: "example-games" },
    ...games.map((g) => {
      const cites = g.links.filter((l) => l.kind === "sourced" && l.motivator === slug)
        .map((l) => l.kind === "sourced" ? `${l.asNamed} (${l.cite})` : "").join("; ");
      return h("li", { class: "example-game" },
        h("h3", {}, g.title),
        h("p", { class: "cite" }, cites),
        g.videos.length ? h("div", { class: "videos" }, ...g.videos.map(renderVideo)) : h("p", { class: "muted" }, "No playthrough yet."),
      );
    }),
  );

  const minigameSlot = h("div", { class: "minigames" });
  const cleanups: Array<() => void> = [];
  const found = minigamesFor(slug);
  if (found.length === 0) {
    minigameSlot.append(h("p", { class: "muted" }, "No minigame yet. See AGENTS.md to make one."));
  } else {
    for (const game of found) {
      const host = h("div", { class: "minigame-host" });
      minigameSlot.append(h("section", { class: "minigame" },
        h("h3", {}, game.title),
        game.author ? h("p", { class: "tag" }, `by ${game.author}`) : null,
        host,
      ));
      cleanups.push(mountSafely(host, game));
    }
  }

  const page = h("article", { class: "page motivator" },
    h("p", { class: "tag" }, h("a", { href: "#/" }, "Map"), " / motivator"),
    h("h1", {}, m.name),
    m.gloss ? h("p", { class: "gloss" }, m.gloss) : null,
    namedBy,
    h("h2", {}, "From mechanics to feeling"),
    line,
    h("h2", {}, "Play with it"),
    minigameSlot,
    h("h2", {}, "Example games"),
    gameList,
    readings.length ? h("h2", {}, "Student readings") : null,
    readings.length ? h("ul", { class: "readings" }, ...readings.map(({ game, link }) => h("li", {},
      h("strong", {}, game.title), h("span", { class: "tag" }, ` by ${link.github}`),
      h("p", {}, `Mechanic: ${link.mechanic}`),
      h("p", {}, `Dynamic: ${link.dynamic}`),
    ))) : null,
  );
  root.replaceChildren(page);
  return () => {
    for (const cleanup of cleanups) cleanup();
    page.remove();
  };
}
