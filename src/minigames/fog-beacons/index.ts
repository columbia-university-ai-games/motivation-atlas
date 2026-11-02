import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { CASES_PER_ROUND, newGame, nextCase, revealClue, roundComplete, searchPlace, toggleCrossedOut } from "./game";
import "./fog-beacons.css";

function mount(el: HTMLElement): () => void {
  let seed = 1, state = newGame(seed), closed = false;
  const staged = h("input", { type: "checkbox", checked: true, "data-mechanic": "gradual-clue-reveal" });
  const caseLabel = h("p", { class: "compass-case", "data-case": "" });
  const mode = h("p", { class: "compass-note", "data-mode": "" });
  const clues = h("ol", { class: "compass-clues", "aria-label": "Evidence collected", "data-clues": "" });
  const reveal = h("button", { type: "button", "data-action": "reveal" }, "Investigate: next clue");
  const status = h("p", { class: "compass-status", role: "status", "aria-live": "polite", "data-status": "" });
  const stats = h("p", { class: "compass-note", "data-stats": "" });
  const next = h("button", { type: "button", "data-action": "next" }, "Next case");
  const replay = h("button", { type: "button", "data-action": "replay" }, "Replay same round");
  const fresh = h("button", { type: "button", "data-action": "fresh" }, "New round");
  const cards = state.puzzle.places.map(place => {
    const note = h("p", { class: "compass-card-note" });
    const cross = h("button", { type: "button", "data-cross": place.id, "aria-pressed": "false" }, "Rule out");
    const search = h("button", { type: "button", "data-search": place.id }, "Search here");
    const card = h("article", { class: "compass-place", "data-place": place.id },
      h("h4", {}, place.name),
      h("p", { class: "compass-features" }, `${place.waterside ? "Waterside" : "Inland"} · ${place.redRoof ? "Red" : "Blue"} roof · Door ${place.openDoor ? "open" : "closed"}`),
      note, h("div", { class: "compass-card-actions" }, cross, search));
    cross.setAttribute("aria-label", `Rule out ${place.name}`);
    search.setAttribute("aria-label", `Search ${place.name}`);
    cross.addEventListener("click", () => { if (!closed) { state = toggleCrossedOut(state, place.id); draw(); } });
    search.addEventListener("click", () => {
      if (closed) return;
      const before = state;
      state = searchPlace(state, place.id);
      if (state === before) return;
      draw(state.solved ? `Found it at ${place.name}!` : `Nothing at ${place.name}. Check the evidence or investigate another clue.`);
      if (state.solved && !roundComplete(state)) next.focus();
    });
    return { place, card, note, cross, search };
  });
  const reflection = h("section", { class: "compass-reflect", "data-reflection": "" },
    h("h4", {}, "Then check it against your own play"),
    h("p", {}, "Did you want another clue, or did you already have a place in mind? Did ruling places out feel satisfying, slow, or neither?"),
    h("p", {}, "Try the other setting. Did getting every clue at once change your curiosity or just make the search easier? Replaying cases gives you memory of the answers; later rounds also reuse these six locations."));
  const root = h("section", { class: "missing-compass", "aria-label": "The Missing Compass game" },
    h("div", { class: "compass-heading" }, h("span", { class: "compass-symbol", "aria-hidden": "true" }, "✧"),
      h("div", {}, h("h3", {}, "The Missing Compass"), h("p", {}, "Six places. Three clues. Where would you look?"))),
    h("p", {}, "Recover a misplaced compass in each of three cases. Read the building details, rule out places, then search when you are ready. There is no timer or penalty for asking for evidence."),
    h("label", { class: "compass-toggle" }, staged, " Reveal clues one at a time"),
    mode, caseLabel, clues, reveal,
    h("div", { class: "compass-grid", "aria-label": "Possible locations" }, ...cards.map(card => card.card)),
    status, stats, h("div", { class: "compass-actions" }, next, replay, fresh), reflection);
  el.append(root);

  function draw(message?: string): void {
    caseLabel.textContent = `Round ${seed} · Case ${state.caseIndex + 1} of ${CASES_PER_ROUND}`;
    mode.textContent = state.staged
      ? "ON: start with one clue; investigate for the other two. Changing this restarts the same three cases."
      : "OFF: all three clues are available immediately. Cases and answers are unchanged. Changing this restarts the round.";
    clues.replaceChildren(...state.puzzle.clues.slice(0, state.revealed).map(clue => h("li", {}, clue.text)));
    reveal.disabled = state.solved || state.revealed === 3;
    reveal.textContent = state.revealed === 3 ? "All clues collected" : `Investigate: clue ${state.revealed + 1} of 3`;
    next.hidden = !state.solved || roundComplete(state);
    for (const { place, card, note, cross, search } of cards) {
      const excluded = state.crossedOut.includes(place.id), searched = state.searched.includes(place.id);
      const found = searched && state.solved && place.id === state.puzzle.targetId;
      card.className = `compass-place${excluded ? " is-excluded" : ""}${searched ? " is-searched" : ""}${found ? " is-found" : ""}`;
      note.textContent = found ? "Compass recovered" : searched ? "Searched: empty" : excluded ? "Ruled out by you" : "Not searched";
      cross.textContent = excluded ? "Reconsider" : "Rule out";
      cross.setAttribute("aria-label", `${excluded ? "Reconsider" : "Rule out"} ${place.name}`);
      cross.setAttribute("aria-pressed", String(excluded));
      cross.disabled = state.solved || searched;
      search.disabled = state.solved || searched || excluded;
    }
    status.textContent = roundComplete(state)
      ? `All three compasses recovered! ${state.totalSearches} searches this round. Try the other setting and compare how it felt.`
      : message ?? (state.solved ? "Compass recovered. Continue to the next case." : "Use the evidence to choose a place. You can undo any place you ruled out.");
    stats.textContent = `${state.revealed}/3 clues visible · ${state.searches} searches this case · ${state.totalSearches} searches this round · ${state.cluesOpened} extra clues requested`;
    reflection.hidden = !roundComplete(state);
  }
  function restart(): void { if (!closed) { state = newGame(seed, staged.checked); draw(); } }
  staged.addEventListener("change", restart);
  replay.addEventListener("click", restart);
  fresh.addEventListener("click", () => { if (!closed) { seed = seed === 1_000_000 ? 1 : seed + 1; restart(); } });
  reveal.addEventListener("click", () => { if (!closed) { state = revealClue(state); draw("New evidence collected. Which places still fit?"); } });
  next.addEventListener("click", () => { if (!closed) { state = nextCase(state); draw(); if (!reveal.disabled) reveal.focus(); else cards[0].cross.focus(); } });
  draw();
  return () => { closed = true; root.remove(); };
}
export const fogBeacons: Minigame = {
  slug: "fog-beacons", title: "The Missing Compass", motivators: ["discovery"], author: "liffsss", mount,
};
