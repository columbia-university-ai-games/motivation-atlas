import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { BEACONS, BOARD, isVisible, key, move, newGame, type Direction } from "./game";
import "./hidden-trail.css";

function mount(el: HTMLElement): () => void {
  let state = newGame();
  let fog = true;
  const toggle = h("input", { type: "checkbox", checked: true, "data-mechanic": "fog-of-war" });
  const board = h("div", { class: "hidden-trail-board", tabindex: "0", role: "group", "aria-label": "Trail map. Use arrow keys or WASD to move." });
  const status = h("p", { class: "hidden-trail-status", role: "status", "aria-live": "polite", "aria-atomic": "true" });
  const mode = h("p", { class: "hidden-trail-mode" });
  const count = h("p", { class: "hidden-trail-count" });
  const reset = h("button", { type: "button" }, "Restart same map");
  const controls = h("div", { class: "hidden-trail-controls", role: "group", "aria-label": "Move one tile" });
  const buttons: HTMLButtonElement[] = [];
  const root = h("section", { class: "hidden-trail", "aria-label": "Hidden Trail minigame" },
    h("p", { class: "hidden-trail-intro" }, "Find three beacons, then reach the exit. Take one step at a time."),
    h("label", { class: "hidden-trail-toggle" }, toggle, " Hide unexplored tiles"),
    mode, board,
    h("p", { class: "hidden-trail-legend" }, "@ You · B Beacon · E Exit · # Wall · ? Unexplored"),
    h("p", { class: "hidden-trail-legend" }, "Small numbers count visits to a tile. Visible tiles without a number have been revealed but not visited. Restart clears the counts."),
    count, status, controls, reset,
    h("section", { class: "hidden-trail-reflect" },
      h("h4", {}, "Then check it against your own play"),
      h("p", {}, "What did you try to discover? Turn the map hiding off and notice how you choose your next move."),
      h("p", {}, "What did you feel in each mode? Did revealing the map change that feeling? Replaying the same map also gives you practice."),
    ),
  );
  function draw(message: string): void {
    const cells: HTMLElement[] = [];
    for (let r = 0; r < BOARD.length; r++) {
      for (let c = 0; c < BOARD[r].length; c++) {
        const position = [r, c] as const;
        const visible = isVisible(state, position, fog);
        const player = key(state.position) === key(position);
        const tile = BOARD[r][c];
        const collected = state.collected.includes(key(position));
        const visits = visible ? state.visits[key(position)] ?? 0 : 0;
        const symbol = player ? "@" : !visible ? "?" : tile === "B" && collected ? "·" : tile === "S" || tile === "." ? "·" : tile;
        const description = player ? "you" : !visible ? "unexplored" : tile === "#" ? "wall" : tile === "B" ? collected ? "collected beacon" : "beacon" : tile === "E" ? "exit" : "path";
        cells.push(h("span", {
          class: `hidden-trail-cell${visits ? " is-visited" : ""}${visits > 1 ? " is-revisited" : ""}${player ? " is-player" : !visible ? " is-hidden" : tile === "#" ? " is-wall" : tile === "B" && !collected ? " is-beacon" : tile === "E" ? " is-exit" : ""}`,
          "aria-label": `Row ${r + 1}, column ${c + 1}: ${description}${visits ? `, visited ${visits} ${visits === 1 ? "time" : "times"}` : ""}`,
          "data-visits": visits || undefined,
        }, h("span", { "aria-hidden": "true" }, symbol), visits ? h("small", { class: "hidden-trail-visit", "data-visit-count": "", "aria-hidden": "true" }, visits > 9 ? "9+" : String(visits)) : null));
      }
    }
    board.replaceChildren(...cells);
    mode.textContent = fog ? "Map hidden: each step reveals the neighboring tiles. Explored tiles stay visible." : "Full map: plan a route with every tile visible. The layout and your progress are unchanged.";
    count.textContent = `Beacons ${state.collected.length}/${BEACONS} · Moves ${state.moves}`;
    status.textContent = message;
    for (const button of buttons) button.disabled = state.won;
  }
  function act(direction: Direction): void {
    const next = move(state, direction);
    const gained = next.collected.length > state.collected.length;
    const blocked = next === state;
    state = next;
    draw(state.won ? "All three beacons found. You reached the exit! Compare how the two map modes felt." : blocked ? "That way is blocked. Your move count is unchanged." : gained ? `Beacon found. ${BEACONS - state.collected.length} remaining.` : BOARD[state.position[0]][state.position[1]] === "E" ? "This is the exit. Find every beacon before leaving." : `Row ${state.position[0] + 1}, column ${state.position[1] + 1}. Choose your next step.`);
  }
  for (const [direction, label] of [["up", "↑ Up"], ["left", "← Left"], ["down", "↓ Down"], ["right", "→ Right"]] as const) {
    const button = h("button", { type: "button", "data-direction": direction }, label);
    button.addEventListener("click", () => act(direction));
    buttons.push(button);
    controls.append(button);
  }
  toggle.addEventListener("change", () => { fog = toggle.checked; draw("Map visibility changed. Your position, collected beacons, and moves are unchanged."); });
  reset.addEventListener("click", () => { state = newGame(); draw("Same map restarted. Find three beacons, then the exit."); });
  root.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && event.target.closest("input, textarea, select"))) return;
    const direction = ({ ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left", w: "up", d: "right", s: "down", a: "left" } as Record<string, Direction>)[event.key];
    if (direction) { event.preventDefault(); act(direction); }
  });
  el.append(root);
  draw("Find the beacons. Use the buttons, arrow keys, or WASD.");
  return () => root.remove();
}

export const hiddenTrail: Minigame = { slug: "hidden-trail", title: "Hidden Trail", motivators: ["discovery"], author: "raycarllei", mount };
