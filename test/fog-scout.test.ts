// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fogScout } from "../src/minigames/fog-scout";
import { MAPS, SIZE, adjacentMonster, attack, move, newGame, tileAt, type Direction, type ScoutState } from "../src/minigames/fog-scout/game";
import { renderRoute } from "../src/app";

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.useRealTimers();
});

// An independent breadth-first route finder supplies legal inputs to the rules/UI.
function route(map: number, from: number, to: number): Direction[] {
  const queue: Array<[number, Direction[]]> = [[from, []]];
  const seen = new Set([from]);
  for (let i = 0; i < queue.length; i++) {
    const [position, path] = queue[i];
    if (position === to) return path;
    for (const [direction, dr, dc] of [["up", -1, 0], ["right", 0, 1], ["down", 1, 0], ["left", 0, -1]] as const) {
      const row = Math.floor(position / SIZE) + dr;
      const col = position % SIZE + dc;
      const next = row * SIZE + col;
      if (row < 0 || row >= SIZE || col < 0 || col >= SIZE || MAPS[map].rows[row][col] === "#" || seen.has(next)) continue;
      seen.add(next);
      queue.push([next, [...path, direction]]);
    }
  }
  throw new Error(`Map ${map}: ${to} is unreachable from ${from}`);
}

function walk(state: ScoutState, path: Direction[]): ScoutState {
  return path.reduce((current, direction) => move(adjacentMonster(current) === undefined ? current : attack(current), direction), state);
}

function winningRoute(map: number): Direction[] {
  const cells = [...MAPS[map].rows.join("")];
  const targets = cells.flatMap((tile, i) => tile === "R" ? [i] : []).concat(cells.indexOf("E"));
  let position = cells.indexOf("S");
  return targets.flatMap((target) => {
    const path = route(map, position, target);
    position = target;
    return path;
  });
}

function setup() {
  const el = document.createElement("div");
  document.body.append(el);
  const unmount = fogScout.mount(el);
  cleanups.push(() => { unmount(); el.remove(); });
  const q = <T extends HTMLElement = HTMLElement>(selector: string) => el.querySelector<T>(selector)!;
  return { el, unmount, q };
}

describe("Fog Scout's central visibility rule", () => {
  it("hides a distant relic and exit, while fog off reveals both", () => {
    expect(tileAt(newGame(true), 6)).toBe("unknown");
    expect(tileAt(newGame(true), 48)).toBe("unknown");
    expect(tileAt(newGame(false), 6)).toBe("relic");
    expect(tileAt(newGame(false), 48)).toBe("exit");
    expect([...newGame().revealed].sort()).toEqual([0, 1, 7]);
  });

  it("reveals four neighbors, not diagonals, and retains discoveries after retreat", () => {
    const original = newGame();
    const advanced = move(original, "right");
    expect(advanced.revealed).toEqual(expect.arrayContaining([0, 1, 2, 8]));
    expect(tileAt(original, 8)).toBe("unknown");
    expect(tileAt(advanced, 8)).toBe("wall");
    expect(tileAt(advanced, 9)).toBe("unknown");
    expect(tileAt(move(advanced, "left"), 8)).toBe("wall");
    expect(original.steps).toBe(0);
    expect(original.revealed).toEqual([0, 7, 1]);
  });

  it.each([0, 1])("changes only visibility, never movement, rewards or winning on map %i", (map) => {
    let hidden = newGame(true, map);
    let visible = newGame(false, map);
    for (const direction of winningRoute(map)) {
      if (adjacentMonster(hidden) !== undefined) {
        hidden = attack(hidden);
        visible = attack(visible);
      }
      hidden = move(hidden, direction);
      visible = move(visible, direction);
      expect({ ...hidden, fog: false }).toEqual(visible);
    }
    expect(hidden.won).toBe(true);
    expect(hidden.collected).toHaveLength(3);
  });
});

describe("Fog Scout movement and objectives", () => {
  it.each([0, 1])("map %i has exactly three relics and no unreachable floor tiles", (map) => {
    const rows = MAPS[map].rows;
    expect(rows).toHaveLength(SIZE);
    rows.forEach((row) => expect(row).toHaveLength(SIZE));
    const cells = [...rows.join("")];
    expect(cells.filter((tile) => tile === "R")).toHaveLength(3);
    expect(cells.filter((tile) => tile === "S")).toHaveLength(1);
    expect(cells.filter((tile) => tile === "E")).toHaveLength(1);
    expect(new Set(MAPS[map].monsters).size).toBe(3);
    MAPS[map].monsters.forEach((position) => expect(cells[position]).toBe("."));
    cells.forEach((tile, i) => { if (tile !== "#") expect(() => route(map, 0, i)).not.toThrow(); });
  });

  it("blocks walls and edges without costing moves or wrapping rows", () => {
    const start = newGame();
    expect(move(start, "left")).toMatchObject({ position: 0, steps: 0, event: "edge" });
    expect(move(start, "up")).toMatchObject({ position: 0, steps: 0, event: "edge" });
    const nearWall = walk(start, ["right", "right"]);
    expect(move(nearWall, "right")).toMatchObject({ position: 2, steps: 2, event: "wall" });
    const leftEdge = move(start, "down");
    expect(move(leftEdge, "left").position).toBe(7);
  });

  it("collects a relic only once, and counts moves onto visited squares", () => {
    const first = walk(newGame(false), route(0, 0, 6));
    expect(first.collected).toEqual([6]);
    expect(tileAt(first, 6)).toBe("floor");
    const back = walk(first, ["left", "right"]);
    expect(back.collected).toEqual([6]);
    expect(back.steps).toBe(first.steps + 2);
    expect(back.backtracks).toBe(first.backtracks + 2);
  });

  it("requires all three relics at the exit, then freezes the completed round", () => {
    const earlyExit = walk(newGame(false), route(0, 0, 48));
    expect(earlyExit.won).toBe(false);
    expect(earlyExit.event).toBe("locked");
    const won = walk(newGame(), winningRoute(0));
    expect(won).toMatchObject({ won: true, position: 48, event: "escaped" });
    expect(move(won, "up")).toBe(won);
  });
});

describe("Fog Scout controls and evidence", () => {
  it.each([true, false])("marks visited squares without revealing unexplored paths (fog %s)", (fog) => {
    const { q, el } = setup();
    if (!fog) q<HTMLInputElement>("[data-mechanic]").click();
    q<HTMLButtonElement>('[data-direction="right"]').click();
    q<HTMLButtonElement>('[data-direction="down"]').click(); // Wall, never visited.
    q<HTMLButtonElement>('[data-direction="left"]').click();
    expect(q('[data-cell="1"]').getAttribute("aria-label")).toContain("visited");
    expect(q('[data-cell="1"] .fs-sprite-footprints')).not.toBeNull();
    for (const cell of [2, 6, 8]) expect(el.querySelector(`[data-cell="${cell}"] .fs-sprite-footprints`)).toBeNull();
    q<HTMLButtonElement>("[data-replay]").click();
    expect(el.querySelectorAll(".fs-board .fs-sprite-footprints")).toHaveLength(0);
  });

  it("records only traveled squares in the end route, without exposing hidden terrain", () => {
    const { q, el } = setup();
    q(".fs-board").dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    for (const direction of ["right", "right", "right", "down", "down", "down"]) {
      q<HTMLButtonElement>(`[data-direction="${direction}"]`).click();
    }
    expect(q("[data-route-review] polyline").getAttribute("points")).toBe("10,10 30,10 50,10");
    expect(q("[data-route-review] svg").getAttribute("aria-label")).toContain("2 moves, 0 revisits");
    expect(el.querySelectorAll("[data-route-review] rect")[48].getAttribute("fill")).toBe("#101921");
    q<HTMLButtonElement>("[data-replay]").click();
    expect(el.querySelector("[data-route-review]")).toBeNull();
  });

  it("keeps undiscovered items out of visible text, labels and classes", () => {
    const { q, el } = setup();
    expect(q('[data-cell="6"]').getAttribute("aria-label")).toContain("unknown");
    expect(q('[data-cell="6"]').querySelector("svg")).toBeNull();
    expect(q('[data-cell="9"]').getAttribute("aria-label")).toContain("unknown");
    expect(el.querySelectorAll(".fs-monster")).toHaveLength(0);
    expect(el.querySelectorAll(".fs-relic, .fs-exit")).toHaveLength(0);
    q<HTMLInputElement>("[data-mechanic]").click();
    expect(el.querySelectorAll(".fs-unknown")).toHaveLength(0);
    expect(el.querySelectorAll(".fs-relic")).toHaveLength(3);
    expect(el.querySelectorAll(".fs-exit")).toHaveLength(1);
    expect(el.querySelectorAll(".fs-monster")).toHaveLength(3);
  });

  it("restarts when fog changes and preserves keyboard focus", () => {
    const { q } = setup();
    q<HTMLButtonElement>('[data-direction="right"]').click();
    const checkbox = q<HTMLInputElement>("[data-mechanic]");
    checkbox.focus();
    checkbox.click();
    expect(document.activeElement).toBe(checkbox);
    expect(q("[data-mode]").textContent).toBe("OFF");
    expect(q("[data-steps]").textContent).toBe("0");
    checkbox.click();
    expect(q("[data-mode]").textContent).toBe("ON");
    expect(q("[data-explored]").textContent).toBe("6%");
  });

  it("supports arrows and WASD only inside this game, without hijacking form controls", () => {
    const { q } = setup();
    const press = (target: HTMLElement, key: string) => target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    expect(press(q(".fs-board"), "ArrowRight")).toBe(false);
    press(q(".fs-board"), "D");
    expect(q("[data-steps]").textContent).toBe("2");
    press(document.body, "ArrowLeft");
    press(q("[data-mechanic]"), "ArrowLeft");
    expect(q("[data-steps]").textContent).toBe("2");
  });

  it("completes a round, records it once, asks for reflection, and resets correctly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
    const { q, el } = setup();
    const path = winningRoute(0);
    q<HTMLButtonElement>(`[data-direction="${path[0]}"]`).click();
    vi.advanceTimersByTime(75000);
    path.slice(1).forEach((direction) => {
      const sword = q<HTMLButtonElement>("[data-attack]");
      if (sword.getAttribute("aria-disabled") === "false") sword.click();
      q<HTMLButtonElement>(`[data-direction="${direction}"]`).click();
    });
    expect(q("[data-result]").hidden).toBe(false);
    expect(q("[data-result]").textContent).toContain("What did you feel");
    expect(q("[data-history]").textContent).toContain("75s");
    expect(q("[data-relics]").textContent).toBe("3 / 3");
    expect(q(".fog-scout").dataset.outcome).toBe("won");
    expect(q(".fs-result-banner").textContent).toContain("DUNGEON CLEARED");
    expect(q("[data-route-review]").textContent).toContain("Repeated squares:");
    expect(q("[data-route-review] polyline").getAttribute("points")!.split(" ")).toHaveLength(path.length + 1);
    expect(el.querySelectorAll(".fs-confetti")).toHaveLength(32);
    q<HTMLButtonElement>('[data-direction="left"]').click();
    expect(el.querySelectorAll("[data-history] li")).toHaveLength(1);
    q<HTMLButtonElement>("[data-replay]").click();
    expect(el.querySelectorAll(".fs-confetti")).toHaveLength(0);
    expect(q("[data-result]").hidden).toBe(true);
    expect(q("[data-relics]").textContent).toBe("0 / 3");
    expect(q("[data-steps]").textContent).toBe("0");
    expect(el.querySelectorAll("[data-history] li")).toHaveLength(1);
    q<HTMLButtonElement>("[data-fresh]").click();
    expect(q(".fs-map-name").textContent).toBe("Jade Archive");
    q<HTMLButtonElement>("[data-fresh]").click();
    expect(q(".fs-map-name").textContent).toBe("Amber Court");
  });

  it("unmounts listeners and DOM, and keeps two instances independent", () => {
    vi.useFakeTimers();
    const a = setup();
    const b = setup();
    const button = a.q<HTMLButtonElement>('[data-direction="right"]');
    const steps = a.q("[data-steps]");
    button.click();
    expect(b.q("[data-steps]").textContent).toBe("0");
    a.unmount();
    button.click();
    expect(steps.textContent).toBe("1");
    expect(a.el.childNodes).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("Dungeon guardians", () => {
  it("sleeps until discovered, wakes without attacking, then follows after retreat", () => {
    const start = newGame();
    const first = move(start, "right");
    expect(first.monsters.every((monster) => !monster.awake)).toBe(true);
    const discovered = move(first, "right");
    expect(discovered.monsters[0]).toEqual({ id: 9, position: 9, awake: true });
    expect(discovered.awakened).toEqual([9]);
    expect(discovered.health).toBe(3);
    const retreat = move(discovered, "left");
    expect(retreat.monsters[0]).toEqual({ id: 9, position: 2, awake: true });
    expect(retreat.health).toBe(3);
    expect(retreat.awakened).toEqual([]);
    expect(tileAt(retreat, 9)).toBe("floor");
    expect(tileAt(retreat, 2)).toBe("monster");
    expect(move(retreat, "left").monsters[0].position).toBe(1);
    expect(discovered.monsters[0].position).toBe(9);
    expect(start.monsters[0].awake).toBe(false);
  });

  it("retains monster identity after movement and lets the player strike first", () => {
    const chased = move(walk(newGame(), ["right", "right"]), "left");
    const cleared = attack(chased);
    expect(cleared.defeated).toEqual([9]);
    expect(cleared.health).toBe(3);
    expect(cleared.monsters.some((monster) => monster.id === 9)).toBe(false);
    expect(tileAt(cleared, 2)).toBe("floor");
    expect(attack(cleared).defeated).toEqual([9]);
  });

  it("does not advance enemies on walls, edges, or an attack with no target", () => {
    const discovered = walk(newGame(), ["right", "right"]);
    expect(move(discovered, "right").monsters).toEqual(discovered.monsters);
    expect(move(discovered, "up").monsters).toEqual(discovered.monsters);
    const distant = { ...newGame(), monsters: [{ id: 9, position: 9, awake: true }] };
    expect(attack(distant).monsters).toEqual(distant.monsters);
  });

  it("routes around walls and keeps monsters from overlapping each other or the player", () => {
    let state: ScoutState = { ...newGame(false), monsters: [
      { id: 9, position: 9, awake: true }, { id: 26, position: 16, awake: true },
    ] };
    state = move(state, "down");
    expect(state.monsters.map((monster) => monster.position)).toEqual([2, 23]);
    for (const direction of ["up", "down", "up", "down"] as const) {
      state = move(state, direction);
      const positions = state.monsters.map((monster) => monster.position);
      expect(new Set(positions).size).toBe(positions.length);
      expect(positions).not.toContain(state.position);
      positions.forEach((position) => expect(MAPS[0].rows.join("")[position]).not.toBe("#"));
    }
  });

  it("lets another adjacent slime bite after a hit, but caps all damage at one heart per turn", () => {
    const surrounded: ScoutState = { ...newGame(false), position: 16,
      monsters: [{ id: 9, position: 9, awake: true }, { id: 26, position: 17, awake: true }, { id: 36, position: 23, awake: true }] };
    expect(attack(surrounded)).toMatchObject({ health: 2, defeated: [9], event: "hurt" });
    expect(move(surrounded, "down")).toMatchObject({ health: 2, position: 16, event: "hurt" });
    expect(attack({ ...surrounded, health: 1 })).toMatchObject({ health: 0, lost: true, event: "fallen" });
  });

  it("shows awake state and chasing in the UI, then removes both on restart", () => {
    const { q, el } = setup();
    q<HTMLButtonElement>('[data-direction="right"]').click();
    q<HTMLButtonElement>('[data-direction="right"]').click();
    expect(q('[data-cell="9"]').getAttribute("aria-label")).toContain("awake and pursuing");
    expect(q("[data-status]").textContent).toContain("A slime wakes!");
    q<HTMLButtonElement>('[data-direction="left"]').click();
    expect(q('[data-cell="2"]').classList.contains("fs-awake")).toBe(true);
    expect(q('[data-cell="9"]').classList.contains("fs-monster")).toBe(false);
    q<HTMLButtonElement>("[data-replay]").click();
    expect(el.querySelectorAll(".fs-awake, .fs-monster-state")).toHaveLength(0);
  });

  it("blocks movement and costs one heart on contact, but a safe adjacent attack clears the path", () => {
    const near = walk(newGame(), ["right", "right"]);
    expect(tileAt(near, 9)).toBe("monster");
    expect(adjacentMonster(near)).toBe(9);
    const hit = move(near, "down");
    expect(hit).toMatchObject({ health: 2, position: 2, steps: 2, event: "hurt" });
    const cleared = attack(hit);
    expect(cleared).toMatchObject({ health: 2, defeated: [9], event: "defeated" });
    expect(tileAt(cleared, 9)).toBe("floor");
    expect(move(cleared, "down")).toMatchObject({ position: 9, steps: 3, health: 2 });
    expect(attack(cleared).defeated).toEqual([9]);
  });

  it("never attacks a distant or diagonal monster, and does not wrap across map edges", () => {
    expect(attack(newGame()).event).toBe("miss");
    expect(adjacentMonster(move(newGame(), "right"))).toBeUndefined();
    const rowEdge = { ...newGame(false), position: 20, defeated: [9, 36] };
    expect(adjacentMonster(rowEdge)).toBeUndefined();
  });

  it("ends at zero hearts and freezes all actions until a fresh round", () => {
    let state = walk(newGame(), ["right", "right"]);
    for (let i = 0; i < 3; i++) state = move(state, "down");
    expect(state).toMatchObject({ lost: true, won: false, health: 0, event: "fallen" });
    expect(move(state, "left")).toBe(state);
    expect(attack(state)).toBe(state);
    expect(newGame().health).toBe(3);
  });

  it("keeps damage and attack results identical with fog on or off", () => {
    let a = walk(newGame(true), ["right", "right"]);
    let b = walk(newGame(false), ["right", "right"]);
    a = move(a, "down"); b = move(b, "down");
    expect({ ...a, fog: false }).toEqual(b);
    expect({ ...attack(a), fog: false }).toEqual(attack(b));
  });

  it("supports Space combat on the map and shows a restartable loss with reflection", () => {
    const { q } = setup();
    const press = (key: string) => q(".fs-board").dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    press("ArrowRight"); press("ArrowRight"); press(" ");
    expect(q("[data-kills]").textContent).toBe("1 / 3");
    expect(q("[data-health]").getAttribute("aria-label")).toBe("3 of 3 hearts");
    q<HTMLButtonElement>("[data-replay]").click();
    press("ArrowRight"); press("ArrowRight");
    press("ArrowDown"); press("ArrowDown"); press("ArrowDown");
    expect(q("[data-result]").hidden).toBe(false);
    expect(q("[data-result]").textContent).toContain("What did you feel");
    expect(q("[data-history]").textContent).toContain("Fallen");
    expect(q(".fog-scout").dataset.outcome).toBe("lost");
    expect(q(".fs-result-banner").textContent).toContain("EXPEDITION OVER");
    expect(q(".fs-celebration").childElementCount).toBe(0);
    expect(q("[data-attack]").getAttribute("aria-disabled")).toBe("true");
    q<HTMLButtonElement>("[data-replay]").click();
    expect(q("[data-health]").getAttribute("data-health")).toBe("3");
    expect(q("[data-result]").hidden).toBe(true);
  });
});

describe("Discovery page prioritizes play", () => {
  it("shows the dungeon before optional instructions, course notes and examples", () => {
    const el = document.createElement("div");
    const unmount = renderRoute(el, "#/m/discovery");
    cleanups.push(unmount);
    const game = el.querySelector(".fog-scout")!;
    const theory = el.querySelector<HTMLDetailsElement>(".motivator-reference")!;
    const howTo = el.querySelector<HTMLDetailsElement>(".minigame-instructions")!;
    expect(theory.open).toBe(false);
    expect(howTo.open).toBe(false);
    expect(game.compareDocumentPosition(theory) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(game.compareDocumentPosition(howTo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(theory.querySelectorAll(".band")).toHaveLength(3);
    expect(theory.querySelector(".cite-link")).not.toBeNull();
  });
});
