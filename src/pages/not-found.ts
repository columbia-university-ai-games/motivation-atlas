import { h } from "../lib/dom";

export function renderNotFound(root: HTMLElement, what: string): () => void {
  const page = h("section", { class: "page" },
    h("h1", {}, "Not on the map"),
    h("p", {}, what),
    h("p", {}, h("a", { href: "#/" }, "Back to the map")),
  );
  root.replaceChildren(page);
  return () => page.remove();
}
