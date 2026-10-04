import type { Minigame } from "./types";

/** Mount a minigame; if it throws, show the error in its slot and keep the page working. */
export function mountSafely(el: HTMLElement, game: Minigame): () => void {
  try {
    return game.mount(el);
  } catch (err) {
    console.error(err);
    el.replaceChildren();
    const p = document.createElement("p");
    p.className = "minigame-error";
    p.textContent = `${game.title} failed to start: ${(err as Error).message}`;
    el.append(p);
    return () => p.remove();
  }
}
