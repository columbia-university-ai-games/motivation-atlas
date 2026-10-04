import type { Atlas, AtlasGame } from "../content/types";
import { linkCitations } from "../lib/citations";
import { h } from "../lib/dom";
import { renderVideo } from "./video";

export function renderGameCard(game: AtlasGame, atlas: Atlas): HTMLElement {
  const name = (slug: string) => atlas.motivators.find((m) => m.slug === slug)?.shortName ?? slug;
  const links = h("ul", { class: "card-links" },
    ...game.links.map((link) => link.kind === "sourced"
      ? h("li", {}, h("a", { href: `#/m/${link.motivator}` }, name(link.motivator)), ` as ${link.asNamed} (${link.cite})`)
      : h("li", { class: "proposed" },
          h("a", { href: `#/m/${link.motivator}` }, name(link.motivator)),
          h("span", { class: "tag" }, " student reading by ", link.github),
          h("span", { class: "card-reading" }, `Mechanic: ${link.mechanic}`),
          h("span", { class: "card-reading" }, `Dynamic: ${link.dynamic}`))),
  );
  linkCitations(links, atlas.bibliography ?? []);
  return h("article", { class: "game-card" },
    h("p", { class: "tag" }, game.kind),
    h("h2", {}, game.title),
    links,
    game.videos.length
      ? h("div", { class: "card-videos" }, ...game.videos.map(renderVideo))
      : h("p", { class: "muted" }, "No playthrough yet. See AGENTS.md to add one."),
  );
}

let dialog: HTMLDialogElement | null = null;

export function openGameCard(slug: string, atlas: Atlas): void {
  const game = atlas.games.find((g) => g.slug === slug);
  if (!game) return;
  if (!dialog) {
    dialog = h("dialog", { class: "game-dialog", "aria-label": "Game" });
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog!.close(); });
    dialog.addEventListener("close", () => dialog!.replaceChildren());
    document.body.append(dialog);
  }
  const close = h("button", { type: "button", class: "dialog-close", "aria-label": "Close" }, "Close");
  close.addEventListener("click", () => dialog!.close());
  dialog.replaceChildren(close, renderGameCard(game, atlas));
  dialog.showModal();
}

/** Close the card on navigation so it never sits over the next page. */
export function closeGameCard(): void {
  if (dialog?.open) dialog.close();
}
