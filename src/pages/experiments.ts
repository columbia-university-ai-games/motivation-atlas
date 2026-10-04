import { h } from "../lib/dom";
import { minigames } from "../minigames/registry";

export function renderExperiments(root: HTMLElement): () => void {
  const page = h("section", { class: "page" }, h("h1", {}, "Experiments"),
    h("p", {}, "Play, change a mechanic, and notice what changes."),
    h("ul", {}, ...minigames.map((game) => h("li", {},
      h("a", { href: `#/play/${game.slug}` }, game.title),
      h("p", {}, "Motivators: ", ...game.motivators.map((slug) => h("a", { href: `#/m/${slug}` }, slug, " "))),
    ))),
  );
  root.replaceChildren(page);
  return () => page.remove();
}
