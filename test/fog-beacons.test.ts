// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { fogBeacons } from "../src/minigames/fog-beacons";
import { candidates, makeCase, newGame, nextCase, revealClue, roundComplete, searchPlace, toggleCrossedOut } from "../src/minigames/fog-beacons/game";

afterEach(() => { document.body.replaceChildren(); });
describe("missing compass rules", () => {
  it("narrows six places to three, two, then one, with the target always consistent", () => {
    for (let seed = 1; seed <= 36; seed++) for (let index = 0; index < 3; index++) {
      const puzzle = makeCase(seed, index);
      expect([0, 1, 2, 3].map(count => candidates(puzzle, count).length)).toEqual([6, 3, 2, 1]);
      expect(candidates(puzzle, 3)[0].id).toBe(puzzle.targetId);
      expect(new Set(puzzle.clues.map(clue => clue.feature)).size).toBe(3);
    }
  });
  it("changes only access to clues, preserving cases, answers and search outcomes", () => {
    let staged = newGame(5, true), all = newGame(5, false);
    expect(staged.revealed).toBe(1);
    expect(all.revealed).toBe(3);
    for (let i = 0; i < 3; i++) {
      expect(staged.puzzle).toEqual(all.puzzle);
      const wrong = staged.puzzle.places.find(place => place.id !== staged.puzzle.targetId)!.id;
      staged = searchPlace(staged, wrong); all = searchPlace(all, wrong);
      expect(staged.searched).toEqual(all.searched);
      expect(staged.solved).toBe(false);
      staged = searchPlace(staged, staged.puzzle.targetId); all = searchPlace(all, all.puzzle.targetId);
      expect(staged.totalSearches).toBe(all.totalSearches);
      expect(staged.solved).toBe(true);
      if (i < 2) { staged = nextCase(staged); all = nextCase(all); }
    }
    expect(roundComplete(staged)).toBe(true);
    expect(nextCase(staged)).toBe(staged);
    expect(searchPlace(staged, "boathouse")).toBe(staged);
  });
  it("reveals exactly one clue without changing deductions, markings or guesses", () => {
    const before = toggleCrossedOut(newGame(), "market"), snapshot = JSON.stringify(before);
    const after = revealClue(before);
    expect(after.revealed).toBe(2);
    expect(after.puzzle).toEqual(before.puzzle);
    expect(after.crossedOut).toEqual(before.crossedOut);
    expect(after.totalSearches).toBe(0);
    const full = revealClue(after);
    expect(full.revealed).toBe(3);
    expect(full.cluesOpened).toBe(2);
    expect(revealClue(full)).toBe(full);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
  it("lets players reconsider even the correct place without causing a dead end", () => {
    let state = newGame();
    for (const place of state.puzzle.places) state = toggleCrossedOut(state, place.id);
    const id = state.puzzle.targetId;
    expect(searchPlace(state, id)).toBe(state);
    state = toggleCrossedOut(state, id);
    expect(searchPlace(state, id).solved).toBe(true);
    expect(toggleCrossedOut(state, "invalid")).toBe(state);
    expect(searchPlace(state, "invalid")).toBe(state);
  });
  it("does not count repeated searches and resets case notes while retaining round totals", () => {
    let state = newGame(), wrong = state.puzzle.places.find(place => place.id !== state.puzzle.targetId)!.id;
    state = searchPlace(state, wrong);
    expect(searchPlace(state, wrong)).toBe(state);
    expect(toggleCrossedOut(state, wrong)).toBe(state);
    expect(nextCase(state)).toBe(state);
    state = revealClue(state);
    state = searchPlace(state, state.puzzle.targetId);
    expect(revealClue(state)).toBe(state);
    state = nextCase(state);
    expect(state.totalSearches).toBe(2);
    expect(state.cluesOpened).toBe(1);
    expect(state.searches).toBe(0);
    expect(state.searched).toEqual([]);
    expect(state.revealed).toBe(1);
  });
  it("uses three distinct solvable cases per round and validates round inputs", () => {
    expect(new Set([0, 1, 2].map(index => makeCase(1, index).targetId)).size).toBe(3);
    expect(makeCase(1, 0)).toEqual(makeCase(1, 0));
    expect(makeCase(1, 0).targetId).not.toBe(makeCase(2, 0).targetId);
    for (const seed of [0, -1, 0.5, NaN, Infinity, 1_000_001]) expect(() => makeCase(seed, 0)).toThrow(RangeError);
    for (const index of [-1, 0.5, 3, NaN]) expect(() => makeCase(1, index)).toThrow(RangeError);
  });
});

function setup() {
  const host = document.createElement("div"); document.body.append(host);
  return { host, cleanup: fogBeacons.mount(host) };
}
function button(host: HTMLElement, selector: string) { return host.querySelector<HTMLButtonElement>(selector)!; }
describe("missing compass interface", () => {
  it("keeps unrevealed clues and answer markers out of the DOM until discovered", () => {
    const { host, cleanup } = setup();
    const puzzle = makeCase(1, 0);
    expect(host.querySelectorAll("[data-clues] li").length).toBe(1);
    for (const clue of puzzle.clues.slice(1)) expect(host.textContent).not.toContain(clue.text);
    expect(host.querySelector(".is-found")).toBeNull();
    expect(host.querySelector("[data-answer], [data-correct], [data-target]")).toBeNull();
    button(host, "[data-action=reveal]").click();
    expect(host.querySelectorAll("[data-clues] li").length).toBe(2);
    button(host, "[data-action=reveal]").click();
    expect(host.querySelectorAll("[data-clues] li").length).toBe(3);
    expect(button(host, "[data-action=reveal]").disabled).toBe(true);
    cleanup();
  });
  it("allows reversible card markings and gives empty-search feedback", () => {
    const { host, cleanup } = setup();
    button(host, "[data-cross=cafe]").click();
    expect(button(host, "[data-search=cafe]").disabled).toBe(true);
    expect(button(host, "[data-cross=cafe]").getAttribute("aria-pressed")).toBe("true");
    button(host, "[data-cross=cafe]").click();
    expect(button(host, "[data-search=cafe]").disabled).toBe(false);
    button(host, "[data-search=cafe]").click();
    expect(host.querySelector("[data-status]")!.textContent).toContain("Nothing at Harbor café");
    expect(host.querySelector("[data-stats]")!.textContent).toContain("1 searches this case");
    cleanup();
  });
  it("restarts the same cases when changing mode and restores the selected mode on replay", () => {
    const { host, cleanup } = setup();
    button(host, "[data-search=cafe]").click();
    const toggle = host.querySelector<HTMLInputElement>("[data-mechanic]")!;
    toggle.checked = false; toggle.dispatchEvent(new Event("change"));
    expect(host.querySelectorAll("[data-clues] li").length).toBe(3);
    expect(host.querySelector("[data-stats]")!.textContent).toContain("0 searches this case");
    expect(host.querySelector("[data-case]")!.textContent).toBe("Round 1 · Case 1 of 3");
    button(host, "[data-search=boathouse]").click();
    expect(host.querySelector("[data-status]")!.textContent).toContain("Found it");
    button(host, "[data-action=replay]").click();
    expect(host.querySelectorAll("[data-clues] li").length).toBe(3);
    toggle.checked = true; toggle.dispatchEvent(new Event("change"));
    expect(host.querySelectorAll("[data-clues] li").length).toBe(1);
    cleanup();
  });
  it("completes all cases via buttons and shows a comparison prompt", () => {
    const { host, cleanup } = setup();
    for (let i = 0; i < 3; i++) {
      button(host, "[data-action=reveal]").click(); button(host, "[data-action=reveal]").click();
      button(host, `[data-search=${makeCase(1, i).targetId}]`).click();
      if (i < 2) {
        expect(document.activeElement).toBe(button(host, "[data-action=next]"));
        button(host, "[data-action=next]").click();
        expect(host.querySelectorAll("[data-clues] li").length).toBe(1);
      }
    }
    expect(host.querySelector("[data-status]")!.textContent).toContain("All three compasses recovered");
    expect(host.querySelector("[data-status]")!.textContent).toContain("3 searches this round");
    expect(host.querySelector<HTMLElement>("[data-reflection]")!.hidden).toBe(false);
    button(host, "[data-action=fresh]").click();
    expect(host.querySelector("[data-case]")!.textContent).toBe("Round 2 · Case 1 of 3");
    expect(host.querySelector<HTMLElement>("[data-reflection]")!.hidden).toBe(true);
    cleanup();
  });
  it("preserves keyboard focus and cleans up independent mounts", () => {
    const a = setup(), b = setup();
    const control = button(a.host, "[data-cross=cafe]");
    control.focus(); expect(document.activeElement).toBe(control);
    control.click(); expect(document.activeElement).toBe(control);
    expect(button(b.host, "[data-search=cafe]").disabled).toBe(false);
    const detached = button(a.host, "[data-action=reveal]");
    a.cleanup(); detached.click();
    expect(a.host.childNodes.length).toBe(0);
    expect(b.host.querySelectorAll("[data-clues] li").length).toBe(1);
    b.cleanup(); expect(b.host.childNodes.length).toBe(0);
  });
});
