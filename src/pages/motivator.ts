import type { BibEntry } from "../content/bibliography";
import type { Atlas, NoteItem } from "../content/types";
import { linkCitations, splitCitation } from "../lib/citations";
import { h } from "../lib/dom";
import { inline, safeBlock } from "../lib/markdown";
import { mountSafely } from "../minigames/mount-safe";
import { readmeFor } from "../minigames/readme";
import { minigamesFor } from "../minigames/registry";
import { renderNotFound } from "./not-found";
import { evidenceTags } from "./evidence-tags";
import { renderVideo } from "./video";
import "./motivator.css";

const linked = (el: HTMLElement, bib: BibEntry[]) => { linkCitations(el, bib); return el; };

type Layer = "mechanics" | "dynamics" | "aesthetic";

/** A note item with its trailing citation on its own line; every citation links to its source. */
function station(layer: Layer, item: NoteItem, bib: BibEntry[]): HTMLElement {
  const { claim, cite } = splitCitation(item.text);
  const claimEl = h("span", { class: "claim" });
  claimEl.innerHTML = inline(claim.replace(/^A caution:\s*/, "")); // course note text only
  if (item.caution) claimEl.prepend(h("strong", { class: "caution-label" }, "Caution: "));
  const li = h("li", { class: `station ${layer}${item.caution ? " caution" : ""}`, "data-layer": layer },
    claimEl,
    cite ? h("span", { class: "cite" }, cite) : null,
  );
  linkCitations(li, bib);
  return li;
}

function band(layer: Layer, title: string, sub: string, ...body: Node[]): HTMLElement {
  return h("section", { class: `band ${layer}` }, h("h2", {}, title), h("p", { class: "band-sub" }, sub), ...body);
}

export function renderMotivator(root: HTMLElement, atlas: Atlas, slug: string): () => void {
  const m = atlas.motivators.find((x) => x.slug === slug);
  if (!m) return renderNotFound(root, `No motivator called “${slug}”. The map shows all eleven.`);
  const bib = atlas.bibliography ?? [];

  const namedBy = h("p", { class: "named-by" });
  namedBy.innerHTML = `<strong>Named by:</strong> ${inline(m.namedBy)}`;
  linkCitations(namedBy, bib);

  const aesthetic = splitCitation(m.aesthetic);
  const feelingName = h("div", { class: "feeling-name" });
  feelingName.innerHTML = inline(aesthetic.claim);
  const feeling = h("div", { class: "feeling station", "data-layer": "aesthetic" },
    h("p", { class: "feeling-label" }, "In MDA's terms"),
    feelingName,
    aesthetic.cite ? h("span", { class: "cite" }, aesthetic.cite) : null,
  );
  if (m.otherNames) {
    const text = h("p", {});
    text.innerHTML = inline(m.otherNames); // course note text only
    feeling.append(h("div", { class: "other-names" }, h("h3", {}, "Other names for the feeling"), text));
  }
  linkCitations(feeling, bib);

  const line = h("div", { class: "bands" },
    band("mechanics", "Mechanics", "The rules a designer builds.",
      h("ul", {}, ...m.mechanics.map((item) => station("mechanics", item, bib)))),
    h("p", { class: "band-arrow" }, "which, while the game runs, produce"),
    band("dynamics", "Dynamics", "What emerges when players meet those rules.",
      h("ul", {}, ...m.dynamics.map((item) => station("dynamics", item, bib)))),
    h("p", { class: "band-arrow" }, "which players feel as"),
    band("aesthetic", "Aesthetic", "What the player feels.", feeling),
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
        linked(h("p", { class: "cite" }, cites, " ", ...evidenceTags(cites)), bib),
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
      const readme = readmeFor(game.slug);
      const howTo = h("div", { class: "minigame-howto" }, h("h4", {}, "How to play"));
      const rules = h("div", {});
      rules.innerHTML = safeBlock(readme.Mechanic ?? "This minigame's README has no Mechanic section yet.");
      howTo.append(rules);
      const about = h("details", { class: "minigame-about" }, h("summary", {}, "What it demonstrates"));
      for (const name of ["Dynamic", "Aesthetic", "Sources"]) {
        if (!readme[name]) continue;
        const body = h("div", {});
        body.innerHTML = safeBlock(readme[name]); // student README: raw HTML is escaped
        about.append(h("h4", {}, name), body);
      }
      minigameSlot.append(h("section", { class: "minigame" },
        h("h3", {}, game.title),
        game.author ? h("p", { class: "tag" }, `by ${game.author}`) : null,
        howTo,
        host,
        about,
      ));
      cleanups.push(mountSafely(host, game));
    }
  }

  const page = h("article", { class: "page motivator" },
    h("p", { class: "tag" }, h("a", { href: "#/" }, "Map"), " / motivator"),
    h("h1", {}, m.name),
    m.gloss ? h("p", { class: "gloss" }, m.gloss) : null,
    namedBy,
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
