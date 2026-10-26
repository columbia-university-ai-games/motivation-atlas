// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { BEACONS, BOARD, isVisible, key, move, newGame, type Direction, type TrailState } from "../src/minigames/hidden-trail/game";
import { hiddenTrail } from "../src/minigames/hidden-trail";

function solution(): Direction[] {
  const queue: { state: TrailState; path: Direction[] }[] = [{ state: newGame(), path: [] }];
  const visited = new Set<string>();
  for (let i = 0; i < queue.length; i++) {
    const { state, path } = queue[i];
    if (state.won) return path;
    for (const direction of ["up", "right", "down", "left"] as const) {
      const next = move(state, direction);
      const id = `${key(next.position)}:${[...next.collected].sort().join(";")}`;
      if (!visited.has(id)) { visited.add(id); queue.push({ state: next, path: [...path, direction] }); }
    }
  }
  throw new Error("Board must have a solution collecting every beacon");
}

describe("Hidden Trail rules", () => {
  it("counts successful visits without changing earlier states or counting blocked moves", () => {
    const start = newGame();
    const down = move(start, "down");
    const returned = move(down, "up");
    expect(start.visits).toEqual({ "0,0": 1 });
    expect(down.visits).toEqual({ "0,0": 1, "1,0": 1 });
    expect(returned.visits).toEqual({ "0,0": 2, "1,0": 1 });
    expect(move(down, "right")).toBe(down);
    expect(move(down, "right").visits).toBe(down.visits);
    expect(newGame().visits).toEqual({ "0,0": 1 });
  });
  it("reveals neighboring tiles, while the visibility toggle preserves state", () => {
    const state = move(newGame(), "down");
    const before = JSON.stringify(state);
    expect(isVisible(state, [5, 5], true)).toBe(false);
    expect(isVisible(state, [5, 5], false)).toBe(true);
    expect(isVisible(state, [0, 0], true)).toBe(true);
    expect(isVisible(state, [2, 0], true)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });
  it("refuses walls, map boundaries, and unknown actions without counting a move", () => {
    const start = newGame();
    expect(move(start, "up")).toBe(start);
    expect(move(start, "left")).toBe(start);
    const below = move(start, "down");
    expect(move(below, "right")).toBe(below);
    expect(() => move(start, "teleport" as Direction)).toThrow("Unknown direction");
  });
  it("has a short solvable route, collects each beacon once, and stops after escape", () => {
    let state = newGame();
    const path = solution();
    expect(path.length).toBeLessThan(40);
    for (const direction of path) state = move(state, direction);
    expect(state.collected).toHaveLength(BEACONS);
    expect(state.position).toEqual([5, 5]);
    expect(state.won).toBe(true);
    expect(move(state, "left")).toBe(state);
    expect(newGame().collected).toHaveLength(0);
  });
  it("does not allow leaving before all three beacons are collected", () => {
    const state: TrailState = { ...newGame(), position: [4, 5], collected: [] };
    expect(move(state, "down").won).toBe(false);
    let once = { ...newGame(), position: [3, 0] } as TrailState;
    once = move(once, "down");
    once = move(once, "up");
    once = move(once, "down");
    expect(once.collected).toHaveLength(1);
    expect(BOARD[once.position[0]][once.position[1]]).toBe("B");
  });
});

describe("Hidden Trail controls", () => {
  it("distinguishes visited paths from revealed neighbors and preserves visits when switching fog", () => {
    const host = document.createElement("div");
    const unmount = hiddenTrail.mount(host);
    const down = host.querySelector('[data-direction="down"]') as HTMLButtonElement;
    const up = host.querySelector('[data-direction="up"]') as HTMLButtonElement;
    expect(host.querySelectorAll("[data-visits]")).toHaveLength(1);
    expect(host.querySelectorAll(".is-hidden [data-visit-count]")).toHaveLength(0);
    down.click(); up.click();
    expect(host.querySelector('[aria-label^="Row 1, column 1:"]')!.getAttribute("aria-label")).toContain("visited 2 times");
    expect(host.querySelectorAll("[data-visits]")).toHaveLength(2);
    const counts = () => [...host.querySelectorAll("[data-visits]")].map(el => el.getAttribute("data-visits"));
    const before = counts();
    const toggle = host.querySelector("input")!;
    toggle.checked = false; toggle.dispatchEvent(new Event("change"));
    expect(counts()).toEqual(before);
    toggle.checked = true; toggle.dispatchEvent(new Event("change"));
    expect(counts()).toEqual(before);
    (host.querySelector(".hidden-trail > button") as HTMLButtonElement).click();
    expect(host.querySelectorAll("[data-visits]")).toHaveLength(1);
    expect(host.querySelector("[data-visits]")!.getAttribute("data-visits")).toBe("1");
    unmount();
  });
  it("hides undiscovered content from accessible labels and switches without moving", () => {
    const host = document.createElement("div");
    const unmount = hiddenTrail.mount(host);
    expect(host.querySelectorAll('[aria-label$=": beacon"]')).toHaveLength(0);
    const count = host.querySelector(".hidden-trail-count")!.textContent;
    const toggle = host.querySelector("input")!;
    toggle.checked = false;
    toggle.dispatchEvent(new Event("change"));
    expect(host.querySelectorAll('[aria-label$=": beacon"]')).toHaveLength(3);
    expect(host.querySelector(".hidden-trail-count")!.textContent).toBe(count);
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change"));
    expect(host.querySelectorAll('[aria-label$=": beacon"]')).toHaveLength(0);
    unmount();
    expect(host.childNodes).toHaveLength(0);
  });
  it("supports keyboard, buttons and restarting without global keyboard capture", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const unmount = hiddenTrail.mount(host);
    const board = host.querySelector(".hidden-trail-board")!;
    board.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(host.querySelector(".hidden-trail-count")!.textContent).toContain("Moves 1");
    (host.querySelector('[data-direction="down"]') as HTMLButtonElement).click();
    expect(host.querySelector(".hidden-trail-count")!.textContent).toContain("Moves 2");
    (host.querySelector("input")!).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(host.querySelector(".hidden-trail-count")!.textContent).toContain("Moves 2");
    (host.querySelector(".hidden-trail > button") as HTMLButtonElement).click();
    expect(host.querySelector(".hidden-trail-count")!.textContent).toContain("Moves 0");
    unmount(); host.remove();
  });
});
