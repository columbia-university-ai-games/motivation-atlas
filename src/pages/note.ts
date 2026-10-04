import { noteText } from "../content/atlas";
import { h } from "../lib/dom";
import { block } from "../lib/markdown";
import "./text-pages.css";

export function renderNote(root: HTMLElement): () => void {
  const article = h("article", { class: "page prose" });
  article.innerHTML = block(noteText); // course note only
  root.replaceChildren(article);
  return () => article.remove();
}
