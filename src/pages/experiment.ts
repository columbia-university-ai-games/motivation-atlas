import { h } from "../lib/dom";
import { presentMinigame } from "../minigames/presentation";
import { minigames } from "../minigames/registry";
import { renderNotFound } from "./not-found";
import "./motivator.css";

export function renderExperiment(root: HTMLElement, slug: string): () => void {
  const game = minigames.find((item) => item.slug === slug);
  if (!game) return renderNotFound(root, `No experiment called “${slug}”. Visit Experiments to find one.`);
  const view = presentMinigame(game);
  view.element.querySelector("h3")?.remove();
  const page = h("article", { class: "page experiment" },
    h("a", { href: "#/experiments" }, "Experiments"),
    h("h1", {}, game.title),
    h("nav", { "aria-label": "Related motivators" }, ...game.motivators.map((motivator) =>
      h("a", { href: `#/m/${motivator}` }, motivator.charAt(0).toUpperCase() + motivator.slice(1)))),
    view.element,
  );
  root.replaceChildren(page);
  return () => { view.cleanup(); page.remove(); };
}
