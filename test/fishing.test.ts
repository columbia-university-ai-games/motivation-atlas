// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fishing } from "../src/minigames/fishing";
import { bites, cast, DEFAULT_OPTIONS, newGame, packUp, type FishingOptions } from "../src/minigames/fishing/game";

const fixed: FishingOptions = { ...DEFAULT_OPTIONS, variable: false };
const variable: FishingOptions = { ...DEFAULT_OPTIONS, variable: true };

function play(options: FishingOptions, rolls: number[]) {
  return rolls.reduce((s, r) => cast(s, r), newGame(options));
}

describe("the bite schedule (the central rule)", () => {
  it("with the toggle off, bites on exactly every 4th cast, whatever the roll", () => {
    const s = play(fixed, Array(12).fill(0));
    expect(s.log).toEqual([false, false, false, true, false, false, false, true, false, false, false, true]);
    expect(s.fish).toBe(3);
  });

  it("with the toggle on, bites when the roll is under 1 in 4, on any cast", () => {
    expect(bites(variable, 1, 0.24)).toBe(true);
    expect(bites(variable, 1, 0.25)).toBe(false);
    const s = play(variable, [0.1, 0.1, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9]);
    expect(s.log).toEqual([true, true, false, false, false, false, false, false]);
    expect(s.longestDry).toBe(6);
  });

  it("pays the same on average either way", () => {
    const rolls = Array.from({ length: DEFAULT_OPTIONS.bait }, (_, i) => (i + 0.5) / DEFAULT_OPTIONS.bait);
    expect(play(variable, rolls).fish).toBe(play(fixed, rolls).fish);
  });
});

describe("a round", () => {
  it("ends when the bait runs out and ignores further casts", () => {
    const s = play(fixed, Array(DEFAULT_OPTIONS.bait).fill(0.5));
    expect(s.over).toBe(true);
    expect(s.packedUp).toBe(false);
    expect(cast(s, 0.5)).toBe(s);
  });

  it("can be ended early by packing up", () => {
    const s = packUp(play(fixed, [0.5, 0.5]));
    expect(s.over).toBe(true);
    expect(s.packedUp).toBe(true);
    expect(s.casts).toBe(2);
    expect(cast(s, 0.5)).toBe(s);
  });
});

describe("Gone Fishing on the page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("casts after a pause, and the toggle applies on a new round", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0); // always under 1 in 4
    const el = document.createElement("div");
    document.body.append(el);
    const unmount = fishing.mount(el);
    const q = <T extends Element>(sel: string) => el.querySelector(sel) as T;

    q<HTMLButtonElement>("[data-cast]").click();
    expect(q("[data-status]").textContent).toContain("Waiting");
    vi.advanceTimersByTime(500);
    expect(q("[data-fish]").textContent).toBe("1");

    q<HTMLInputElement>("[data-mechanic]").checked = false;
    q<HTMLButtonElement>("[data-new]").click();
    q<HTMLButtonElement>("[data-cast]").click();
    vi.advanceTimersByTime(500);
    expect(q("[data-fish]").textContent).toBe("0");

    q<HTMLButtonElement>("[data-cast]").click();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    el.remove();
  });
});
