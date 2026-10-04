import type { Atlas } from "../content/types";
import { h } from "../lib/dom";
import { renderGameCard } from "./game-card";
import { renderNotFound } from "./not-found";

export function renderGame(root: HTMLElement, atlas: Atlas, slug: string): () => void {
  const game = atlas.games.find((item) => item.slug === slug);
  if (!game) return renderNotFound(root, `No game called “${slug}”. Explore the map to find a game.`);
  const card = renderGameCard(game, atlas);
  card.querySelector("h2")!.replaceWith(h("h1", {}, game.title));
  const page = h("section", { class: "page" }, h("a", { href: "#/" }, "Map"), card);
  root.replaceChildren(page);
  return () => page.remove();
}
