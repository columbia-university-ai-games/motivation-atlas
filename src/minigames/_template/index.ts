import { h } from "../../lib/dom";
import type { Minigame } from "../types";

// Copy this folder to src/minigames/<your-slug>/, change the fields at the bottom,
// write your README, and add one line for it in ../registry.ts.

function mount(el: HTMLElement): () => void {
  let points = 0;
  const doubled = h("input", { type: "checkbox", "data-mechanic": "double-points" });
  const score = h("output", {}, "0");
  const button = h("button", { type: "button" }, "Score");
  button.addEventListener("click", () => {
    points += doubled.checked ? 2 : 1;
    score.textContent = String(points);
  });
  const root = h("div", { class: "template-game" },
    h("label", {}, doubled, " Double points (a mechanic: change it and see what changes)"),
    h("p", {}, "Points: ", score),
    button,
  );
  el.append(root);
  // Remove everything you added. If you start timers or listen on window or document,
  // clear and remove them here too.
  return () => root.remove();
}

export const template: Minigame = {
  slug: "_template",
  title: "Template",
  motivators: ["progress"],
  author: "your-github-username",
  mount,
};
