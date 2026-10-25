// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { bestTime, correctPrefix, entriesFor, PASSAGE, positions, TARGETS, timeAtWpm, wpmAtTime } from "../src/minigames/typing-race/game";
import { typingRace } from "../src/minigames/typing-race";
import { leaderboard } from "../src/minigames/typing-race/leaderboard";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); vi.unstubAllGlobals(); });

describe("Type Circuit", () => {
  it("preloads the four requested paces using five characters per word", () => {
    expect(TARGETS.map(e => Math.round(wpmAtTime(e.ms)))).toEqual([50, 80, 110, 140]);
    expect(TARGETS.map(e => e.name)).toEqual(["50 WPM target", "ZevMM", "Prof. Garakani", "Ivan"]);
    expect(timeAtWpm(50)).toBe(Math.round(PASSAGE.length / 5 / 50 * 60000));
    expect(entriesFor()[0].name).toBe("Ivan");
    expect(bestTime(20000, 30000)).toBe(20000);
    expect(bestTime(20000, 15000)).toBe(15000);
    for (const invalid of [NaN, Infinity, -1, 1000, 600001]) expect(() => bestTime(undefined, invalid)).toThrow();
  });
  it("moves only with a correct prefix and ranks completed cars by finish time", () => {
    expect(correctPrefix(PASSAGE.slice(0, 10) + "!" + PASSAGE.slice(11))).toBe(10);
    const entries = [{ name: "Fast", ms: 10000 }, { name: "Slow", ms: 20000 }];
    expect(positions(entries, 15000, PASSAGE).map(r => r.name)).toEqual(["Fast", "You", "Slow"]);
    expect(positions(entries, 5000, "Wrong").find(r => r.you)!.progress).toBe(0);
  });
  it("stores only a numeric personal best and never loads old identifier-based records", () => {
    localStorage.setItem("atlas-typing-race-v1", JSON.stringify([{ uni: "ab123", ms: 5000 }]));
    const board = leaderboard();
    expect(board.read()).toHaveLength(4);
    board.finish(20000); board.finish(30000);
    expect(localStorage.getItem("atlas-typing-race-personal-best-v2")).toBe("20000");
    expect(leaderboard().read().find(e => e.name === "Your best")!.ms).toBe(20000);
  });
  it("keeps targets and personal-best play available when storage is blocked or corrupt", () => {
    localStorage.setItem("atlas-typing-race-personal-best-v2", "not JSON");
    expect(leaderboard().read()).toHaveLength(4);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
    const board = leaderboard();
    expect(board.finish(15000).saved).toBe(false);
    expect(board.read()).toHaveLength(5);
  });
  it("mounts with targets and no identity input, makes no network calls, and cleans up", () => {
    vi.useFakeTimers();
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const el = document.createElement("div"); const unmount = typingRace.mount(el);
    expect(el.querySelector('input[type="text"]')).toBeNull();
    expect(el.querySelectorAll("tbody tr")).toHaveLength(4);
    const input = el.querySelector("textarea")!;
    input.value = "T"; input.dispatchEvent(new Event("input"));
    vi.advanceTimersByTime(10000);
    input.value = PASSAGE; input.dispatchEvent(new Event("input"));
    expect(fetch).not.toHaveBeenCalled();
    expect(el.querySelectorAll("tbody tr")).toHaveLength(5);
    unmount(); expect(el.childNodes.length).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
  it("practice hides opponents and scores and never saves a result", () => {
    const el = document.createElement("div"); const unmount = typingRace.mount(el);
    const toggle = el.querySelector<HTMLInputElement>("[data-mechanic]")!;
    toggle.checked = false; toggle.dispatchEvent(new Event("change"));
    for (const selector of [".tr-results", ".tr-metrics", ".tr-cars"]) expect(el.querySelector<HTMLElement>(selector)!.hidden).toBe(true);
    const input = el.querySelector("textarea")!;
    input.value = PASSAGE; input.dispatchEvent(new Event("input"));
    expect(el.querySelector('[role="status"]')!.textContent).toContain("Passage complete");
    expect(localStorage.length).toBe(0);
    unmount();
  });
  it("starts on the first character, excludes idle time, and resets without starting", () => {
    vi.useFakeTimers();
    const el = document.createElement("div"); const unmount = typingRace.mount(el);
    const input = el.querySelector("textarea")!;
    vi.advanceTimersByTime(30000); expect(vi.getTimerCount()).toBe(0);
    input.value = PASSAGE[0]; input.dispatchEvent(new Event("input"));
    expect(input.value).toBe(PASSAGE[0]);
    expect(el.querySelector(".tr-metrics")!.textContent).toContain("0.0 s");
    vi.advanceTimersByTime(20000);
    input.value = PASSAGE; input.dispatchEvent(new Event("input"));
    expect(localStorage.getItem("atlas-typing-race-personal-best-v2")).toBe("20000");
    el.querySelector<HTMLButtonElement>("button")!.click();
    expect(input.value).toBe(""); expect(input.disabled).toBe(false);
    vi.advanceTimersByTime(5000); expect(vi.getTimerCount()).toBe(0);
    input.value = "T"; input.dispatchEvent(new Event("input"));
    expect(vi.getTimerCount()).toBe(1);
    unmount(); expect(vi.getTimerCount()).toBe(0);
  });
});
