import { h } from "../lib/dom";
import { safeBlock } from "../lib/markdown";
import { mountSafely } from "./mount-safe";
import { readmeFor } from "./readme";
import type { Minigame } from "./types";

export function presentMinigame(game: Minigame): { element: HTMLElement; cleanup: () => void } {
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
  const element = h("section", { class: "minigame" },
    h("h3", {}, game.title),
    game.author ? h("p", { class: "tag" }, `by ${game.author}`) : null,
    howTo,
    host,
    about,
  );
  const unmount = mountSafely(host, game);
  return { element, cleanup: () => { unmount(); element.remove(); } };
}
