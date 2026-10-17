import { h, s } from "../../lib/dom";
import type { Minigame } from "../types";
import { MAPS, MAX_HEALTH, RELICS, SIZE, adjacentMonster, attack, monsterAt, move, newGame, tileAt, type Direction, type ScoutState } from "./game";
import { sprite } from "./sprites";
import "./fog-scout.css";

const KEYS: Record<string, Direction> = {
  ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left",
  w: "up", d: "right", s: "down", a: "left",
};
let mounts = 0;

function routeReview(state: ScoutState, path: readonly number[]): HTMLElement {
  const visits = new Map<number, number>();
  path.forEach((position) => visits.set(position, (visits.get(position) ?? 0) + 1));
  const center = (position: number) => `${position % SIZE * 20 + 10},${Math.floor(position / SIZE) * 20 + 10}`;
  const map = s("svg", { class: "fs-route-map", viewBox: "0 0 140 140", role: "img",
    "aria-label": `Your route: ${state.steps} moves, ${state.backtracks} revisits. S marks the start, X the finish. Numbers show visits to a square.` });
  for (let i = 0; i < SIZE * SIZE; i++) {
    const tile = tileAt(state, i);
    map.append(s("rect", { x: i % SIZE * 20 + 1, y: Math.floor(i / SIZE) * 20 + 1, width: 18, height: 18,
      fill: tile === "unknown" ? "#101921" : tile === "wall" ? "#566674" : "#293943" }));
  }
  map.append(s("polyline", { points: path.map(center).join(" "), fill: "none", stroke: "#7cdbb4", "stroke-width": 3,
    "stroke-linejoin": "round", "stroke-linecap": "round" }));
  for (const [position, count] of visits) {
    const x = position % SIZE * 20 + 10, y = Math.floor(position / SIZE) * 20 + 10;
    const label = position === state.position ? position === path[0] ? "S/X" : "X" : position === path[0] ? "S" : count > 1 ? String(count) : "";
    if (label) map.append(s("circle", { cx: x, cy: y, r: 7, fill: "#e8bc78" }),
      s("text", { x, y: y + 2.5, "text-anchor": "middle", fill: "#11191f", "font-size": 7, "font-weight": 700 }, label));
  }
  const repeats = [...visits].filter(([, count]) => count > 1).map(([position, count]) =>
    `row ${Math.floor(position / SIZE) + 1}, column ${position % SIZE + 1}: ${count} visits`).join("; ");
  return h("details", { class: "fs-route-review", "data-route-review": "" },
    h("summary", {}, "Review your route"), map,
    h("p", { class: "fs-small" }, "The line follows your footsteps. S = start; X = finish. Numbers show visits to a square."),
    h("p", { class: "fs-small" }, repeats ? `Repeated squares: ${repeats}.` : "No squares were revisited."));
}

function mount(el: HTMLElement): () => void {
  const id = ++mounts;
  let state = newGame();
  let path = [state.position];
  let startedAt: number | null = null;
  const rounds: string[] = [];
  const controller = new AbortController();
  const listen = { signal: controller.signal };
  const fog = h("input", { type: "checkbox", checked: true, "data-mechanic": "exploration-fog" });
  const mode = h("span", { class: "fs-mode", "data-mode": "", "aria-hidden": "true" });
  const mapName = h("span", { class: "fs-map-name" });
  const hearts = h("span", { class: "fs-hearts", role: "img", "data-health": "" });
  const relics = h("strong", { "data-relics": "" });
  const steps = h("strong", { "data-steps": "" });
  const explored = h("strong", { "data-explored": "" });
  const status = h("p", { class: "fs-status", role: "status", "aria-atomic": "true", "data-status": "" });
  const hint = h("p", { id: `fs-hint-${id}`, class: "fs-small fs-keys" }, "Move: arrows / WASD · Attack: Space");
  const board = h("div", {
    class: "fs-board", role: "group", tabindex: 0,
    "aria-label": "Dungeon map", "aria-describedby": hint.id,
  });
  const cells = Array.from({ length: SIZE * SIZE }, (_, i) => h("span", { class: "fs-cell", role: "img", "data-cell": i }));
  board.append(...cells);
  const pad = h("div", { class: "fs-pad", role: "group", "aria-label": "Move explorer" });
  const buttons = new Map<Direction, HTMLButtonElement>();
  for (const [direction, symbol] of [["up", "↑"], ["left", "←"], ["down", "↓"], ["right", "→"]] as const) {
    const button = h("button", { type: "button", class: `fs-button fs-direction fs-${direction}`, "aria-label": `Move ${direction}`, "data-direction": direction }, symbol);
    buttons.set(direction, button);
    button.addEventListener("click", () => act(direction), listen);
    pad.append(button);
  }
  const attackButton = h("button", { type: "button", class: "fs-button fs-attack", "data-attack": "", "aria-label": "Attack adjacent slime" }, sprite("sword"), h("span", {}, "Attack"));
  attackButton.addEventListener("click", () => act("attack"), listen);
  pad.append(attackButton);
  const replay = h("button", { type: "button", class: "fs-button fs-secondary", "data-replay": "" }, "Restart");
  const fresh = h("button", { type: "button", class: "fs-button fs-secondary", "data-fresh": "" }, "Other dungeon");
  const result = h("section", { class: "fs-result", hidden: true, "data-result": "" });
  const celebration = h("div", { class: "fs-celebration", "aria-hidden": "true" });
  const endCard = h("div", { class: "fs-end-card", hidden: true, "aria-hidden": "true" });
  const history = h("ol", { class: "fs-history", "data-history": "" });
  const historyPanel = h("details", { class: "fs-notes" },
    h("summary", {}, "Round notes & comparison"),
    h("p", { class: "fs-small" }, "Compare fog on, then off. The same dungeon is easier to remember on a replay. Other dungeon switches between two layouts. Notes keep four finished rounds until you leave; backtracks count revisited squares. Time starts with your first action, not a countdown."), history);
  const kills = h("strong", { "data-kills": "" }, "0 / 3");
  const root = h("section", { class: "fog-scout", "aria-label": "Fog Scout game" },
    h("header", { class: "fs-heading" },
      h("div", {}, h("p", { class: "fs-eyebrow" }, "A SMALL DUNGEON. A LITTLE COURAGE."), h("h2", {}, "FOG SCOUT"), h("p", { class: "fs-subtitle" }, "Collect 3 relics. Find the way out.")),
      h("div", { class: "fs-fog-control" }, h("label", { class: "fs-toggle" }, fog, " Exploration fog", mode),
        h("p", { class: "fs-small" }, "Switching restarts this dungeon."))),
    h("div", { class: "fs-stats" },
      h("div", {}, h("span", {}, "HEALTH"), hearts),
      h("div", {}, h("span", {}, "RELICS"), relics),
      h("div", {}, h("span", {}, "MOVES"), steps),
      h("div", {}, h("span", {}, "VISIBLE"), explored)),
    h("div", { class: "fs-play" },
      h("div", { class: "fs-map-wrap" },
        h("div", { class: "fs-map-label" }, mapName, h("span", {}, "DEPTH 01")), board,
        h("div", { class: "fs-legend", "aria-label": "Map legend" },
          h("span", {}, sprite("hero"), "You"), h("span", {}, sprite("relic"), "Relic"),
          h("span", {}, sprite("monster"), "Slime"), h("span", {}, sprite("exit"), "Exit"),
          h("span", {}, sprite("footprints"), "Visited")), endCard),
      h("aside", { class: "fs-controls", "aria-label": "Quest and controls" },
        h("div", { class: "fs-quest" }, h("p", { class: "fs-eyebrow" }, "YOUR QUEST"),
          h("h3", {}, "Find. Fight. Escape."), h("p", {}, "Recover 3 relics, then find the exit."),
          h("div", { class: "fs-enemy-guide" }, sprite("monster"), h("div", {}, h("strong", {}, "Dungeon guardians"),
            h("p", { class: "fs-small" }, "Slimes wake when you approach. ! means awake: they chase after your moves or hits. Attack beside one, or step away from its bite."))),
          h("p", { class: "fs-kills" }, "Slimes defeated ", kills)),
        h("div", { class: "fs-inputs" }, pad, hint),
        status,
        h("div", { class: "fs-actions" }, replay, fresh))),
    result, historyPanel, celebration);
  el.append(root);

  function message(): string {
    const where = `Row ${Math.floor(state.position / SIZE) + 1}, column ${state.position % SIZE + 1}.`;
    switch (state.event) {
      case "escaped": return `Expedition complete! ${state.steps} moves. Try the other fog setting.`;
      case "fallen": return "Out of hearts. Restart to try again. Attack or retreat when a slime is beside you.";
      case "hurt": return "Ouch! You lost one heart to a slime. Attack or step away before its next bite.";
      case "defeated": return "Slime defeated! Keep searching for the relics.";
      case "miss": return "No slime in reach. No turn spent. Stand directly beside one to attack.";
      case "relic": return `Relic recovered! ${state.collected.length} of ${RELICS}. ${where}`;
      case "wall": return "A stone wall blocks the way. Find another route.";
      case "edge": return "The dungeon ends here. Try another direction.";
      case "locked": return `Exit found. Recover ${RELICS - state.collected.length} more relics to leave.`;
      case "start": return state.fog ? "Step into the dark. Your lantern reveals nearby squares." : "Plan your route. Visible slimes sleep until you approach, just as with fog on.";
      default: return `${where} ${state.collected.length === RELICS ? "Find the exit!" : "Explore for relics."}`;
    }
  }

  function render(): void {
    root.dataset.event = state.event;
    root.dataset.outcome = state.won ? "won" : state.lost ? "lost" : "playing";
    mode.textContent = state.fog ? "ON" : "OFF";
    mapName.textContent = MAPS[state.map].name;
    hearts.replaceChildren(...Array.from({ length: MAX_HEALTH }, (_, i) => {
      const heart = sprite("heart");
      if (i >= state.health) heart.classList.add("fs-heart-empty");
      return heart;
    }));
    hearts.setAttribute("aria-label", `${state.health} of ${MAX_HEALTH} hearts`);
    hearts.dataset.health = String(state.health);
    relics.textContent = `${state.collected.length} / ${RELICS}`;
    steps.textContent = String(state.steps);
    kills.textContent = `${state.defeated.length} / ${MAPS[state.map].monsters.length}`;
    explored.textContent = `${Math.round((state.fog ? state.revealed.length : SIZE * SIZE) / (SIZE * SIZE) * 100)}%`;
    status.textContent = message();
    if (!state.won && !state.lost) {
      if (state.awakened.length) status.textContent += " A slime wakes! It acts after your next move or hit.";
      else if (adjacentMonster(state) !== undefined && state.event !== "hurt") status.textContent += " Slime beside you: Attack / Space, or step away to dodge.";
      else if (state.monsters.some((monster) => monster.awake) && state.event !== "hurt") status.textContent += " An awakened slime is following you.";
    }
    cells.forEach((cell, i) => {
      const tile = tileAt(state, i), player = i === state.position;
      const visited = tile !== "unknown" && state.visited.includes(i);
      cell.className = `fs-cell fs-${tile}${player ? " fs-player" : ""}${player && state.lost ? " fs-fallen" : ""}`;
      cell.replaceChildren();
      if (visited && !player) cell.append(sprite("footprints"));
      if (tile === "relic" || tile === "exit" || tile === "monster") cell.append(sprite(tile));
      const monster = tile === "monster" ? monsterAt(state, i) : undefined;
      if (monster) {
        cell.classList.add(monster.awake ? "fs-awake" : "fs-sleeping");
        if (state.awakened.includes(monster.id)) cell.classList.add("fs-waking");
        cell.append(h("span", { class: "fs-monster-state", "aria-hidden": "true" }, monster.awake ? "!" : "z"));
      }
      if (tile === "wall" && i % 3 === 0) cell.append(sprite("torch"));
      if (player) {
        const hero = sprite("hero");
        if (state.facing === "left") hero.classList.add("fs-facing-left");
        cell.append(hero);
      }
      cell.setAttribute("aria-label", `Row ${Math.floor(i / SIZE) + 1}, column ${i % SIZE + 1}: ${player ? "you, " : ""}${tile}${visited ? ", visited" : ""}${monster ? monster.awake ? ", awake and pursuing" : ", sleeping" : ""}`);
    });
    for (const button of buttons.values()) button.setAttribute("aria-disabled", String(state.won || state.lost));
    attackButton.setAttribute("aria-disabled", String(state.won || state.lost || adjacentMonster(state) === undefined));
    result.hidden = !(state.won || state.lost);
    endCard.hidden = result.hidden;
  }

  function act(action: Direction | "attack"): void {
    if (state.won || state.lost) return;
    const previous = state;
    state = action === "attack" ? attack(state) : move(state, action);
    if (state.position !== previous.position) path.push(state.position);
    if (startedAt === null && (state.steps > previous.steps || ["defeated", "hurt", "fallen"].includes(state.event))) startedAt = Date.now();
    if (state.won || state.lost) {
      const seconds = Math.round((Date.now() - (startedAt ?? Date.now())) / 1000);
      const summary = `${MAPS[state.map].name} · Fog ${state.fog ? "ON" : "OFF"} · ${state.won ? "Escaped" : "Fallen"} · ${state.steps} moves · ${state.backtracks} backtracks · ${state.defeated.length} slimes · ${state.health} hearts · ${seconds}s`;
      rounds.unshift(summary); rounds.splice(4);
      history.replaceChildren(...rounds.map((round) => h("li", {}, round)));
      endCard.replaceChildren(sprite(state.won ? "relic" : "heart"),
        h("strong", {}, state.won ? "YOU ESCAPED!" : "TRY AGAIN"),
        h("span", {}, state.won ? "All 3 relics secured" : "Out of hearts · Restart below"));
      if (state.won) celebration.replaceChildren(...Array.from({ length: 32 }, (_, i) => h("span", {
        class: "fs-confetti",
        style: `--x:${(i * 29 + 7) % 100}%;--delay:${i % 8 * 90}ms;--drift:${(i * 17) % 100 - 50}px;--spin:${i % 2 ? 540 : -540}deg;--color:${["#e8bc78", "#7cdbb4", "#9fc5ff", "#ed9cb5"][i % 4]}`,
      })));
      result.replaceChildren(
        h("p", { class: "fs-result-banner" }, sprite(state.won ? "relic" : "heart"), state.won ? "DUNGEON CLEARED" : "EXPEDITION OVER"),
        h("h4", {}, state.won ? "THE RELICS ARE YOURS." : "THE DUNGEON CLAIMS THIS ROUND."),
        h("p", {}, summary),
        h("p", {}, "What did you feel while choosing a direction? Did changing fog change your route or how it felt?"),
        routeReview(state, path));
    }
    render();
  }
  function restart(map = state.map): void {
    state = newGame(fog.checked, map); path = [state.position]; startedAt = null; result.replaceChildren(); celebration.replaceChildren(); endCard.replaceChildren(); render();
  }
  fog.addEventListener("change", () => restart(), listen);
  replay.addEventListener("click", () => restart(), listen);
  fresh.addEventListener("click", () => restart((state.map + 1) % MAPS.length), listen);
  root.addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement;
    if (event.altKey || event.ctrlKey || event.metaKey || target.matches("input, textarea, select, summary")) return;
    const direction = KEYS[event.key] ?? KEYS[event.key.toLowerCase()];
    if (direction) { event.preventDefault(); act(direction); }
    // Preserve native Space/Enter activation on buttons; Space on the map attacks.
    if ((event.key === " " || event.key === "Spacebar") && target === board) {
      event.preventDefault(); if (!event.repeat) act("attack");
    }
  }, listen);
  render();
  return () => { controller.abort(); root.remove(); };
}

export const fogScout: Minigame = {
  slug: "fog-scout", title: "Fog Scout: the unseen dungeon", motivators: ["discovery"], author: "DemonRain7", mount,
};
