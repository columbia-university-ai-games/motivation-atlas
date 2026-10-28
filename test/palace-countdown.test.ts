// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { choose, elapse, LIMIT_MS, newGame, actionForObstacle, seededRandom } from "../src/minigames/palace-countdown/game";
import { palaceCountdown } from "../src/minigames/palace-countdown";

describe("palace countdown rules", () => {
  it("generates repeatable routes and shuffled buttons from a seed", () => {
    expect(newGame(true, 123).route).toEqual(newGame(false, 123).route);
    expect(newGame(true, 123).route).not.toEqual(newGame(true, 456).route);
    const random = seededRandom(123);
    expect(random()).toBe(seededRandom(123)());
    const route = newGame(true, 123).route;
    expect(route).toHaveLength(10);
    expect(new Set(route.map((room) => room.kind)).size).toBeLessThan(6);
    expect(new Set(route.map((room) => room.actions.join())).size).toBeGreaterThan(1);
    for (const room of route) {
      expect([...room.actions].sort()).toEqual(["climb", "jump", "run"]);
    }
  });
  it("uses the obstacle to decide the successful action across seeded routes", () => {
    const expected = { gap: "jump", ledge: "climb", gate: "run" } as const;
    for (let seed = 0; seed < 20; seed++) {
      let state = newGame(false, seed);
      for (const room of state.route) {
        for (const action of room.actions) {
          expect(choose(state, action).room).toBe(state.room + Number(action === expected[room.kind]));
        }
        state = choose(state, expected[room.kind]);
      }
      expect(state.status).toBe("escaped");
    }
  });
  it("applies the existing five-second penalty as a fall with the three-second clock", () => {
    const timed = choose(newGame(true), "run");
    expect(timed).toMatchObject({ room: 0, status: "failed", remainingMs: 0, mistakes: 1 });
    expect(choose(newGame(false), "run")).toMatchObject({ room: 0, status: "playing", remainingMs: LIMIT_MS, mistakes: 1 });
  });
  it("fails at zero, including a penalty, but never times out with the clock off", () => {
    expect(elapse(newGame(true), LIMIT_MS).status).toBe("failed");
    expect(choose(elapse(newGame(true), LIMIT_MS - 1000), "run").status).toBe("failed");
    expect(elapse(newGame(false), LIMIT_MS * 10).status).toBe("playing");
  });
  it("resets the timer on every new room and falls at the room deadline", () => {
    let state = newGame(true, 123);
    for (let i = 0; i < 9; i++) {
      state = elapse(state, 2900);
      state = choose(state, actionForObstacle[state.route[state.room].kind]);
      expect(state).toMatchObject({ room: i + 1, remainingMs: 3000, status: "playing" });
    }
    expect(elapse(state, 3000)).toMatchObject({ room: 9, remainingMs: 0, status: "failed" });
  });
  it("escapes after all ten rooms and freezes finished runs", () => {
    let state = newGame(true);
    for (const room of state.route) state = choose(state, actionForObstacle[room.kind]);
    expect(state).toMatchObject({ room: 10, status: "escaped" });
    expect(elapse(state, LIMIT_MS)).toBe(state);
    expect(choose(state, "jump")).toBe(state);
    const failed = elapse(newGame(true), LIMIT_MS);
    expect(choose(failed, "jump")).toBe(failed);
  });
});

it("starts on demand, displays timeout reflection, and resets to an untimed run", () => {
  vi.useFakeTimers();
  const host = document.createElement("div");
  const unmount = palaceCountdown.mount(host);
  try {
    vi.advanceTimersByTime(LIMIT_MS);
    expect(host.querySelector("output")!.textContent).toContain("3.0");
    host.querySelector("button")!.click();
    expect(host.querySelector("progress")!.value).toBe(3000);
    vi.advanceTimersByTime(1000);
    expect(host.querySelector("progress")!.value).toBe(2000);
    vi.advanceTimersByTime(2000);
    expect(host.querySelector("progress")!.value).toBe(0);
    expect(host.querySelector("h3")!.textContent).toContain("fell");
    expect(host.querySelector("aside")!.hidden).toBe(false);
    const toggle = host.querySelector("input")!;
    toggle.checked = false;
    toggle.dispatchEvent(new Event("change"));
    expect(host.querySelector("output")!.hidden).toBe(true);
    expect(host.querySelector("progress")!.hidden).toBe(true);
    host.querySelector("button")!.click();
    vi.advanceTimersByTime(LIMIT_MS * 2);
    expect(host.querySelector("h3")!.textContent).toContain("Room 1");
  } finally {
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  }
});
