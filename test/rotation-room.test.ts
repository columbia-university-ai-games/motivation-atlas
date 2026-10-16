// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { rotationRoom } from "../src/minigames/rotation-room";
import {
  currentTarget, ENERGY_STEP, finalResult, initialGame, MAX_ENERGY, PLAYERS, playMatch,
  selectPlayer, setLineup, TARGETS, teamPower, tournamentSummary,
  type GameState, type PlayerId,
} from "../src/minigames/rotation-room/game";

const strongest: readonly PlayerId[] = ["ari", "bo"];
const otherPair: readonly PlayerId[] = ["cleo", "dev"];

function tournament(fatigueMatters: boolean, lineups: readonly (readonly PlayerId[])[]): GameState {
  return lineups.reduce((state, lineup) => playMatch(setLineup(state, lineup)), initialGame(fatigueMatters));
}

function energies(state: GameState): number[] {
  return state.players.map((player) => player.energy);
}

describe("Rotation Room rules", () => {
  it("changes only the fatigue setting at the start of a comparison", () => {
    const on = initialGame(true);
    const off = initialGame(false);
    expect(on).toEqual({ ...off, fatigueMatters: true });
    expect(on.players.map((player) => player.skill)).toEqual([5, 4, 4, 3]);
    expect(energies(on)).toEqual([6, 6, 6, 6]);
    expect(TARGETS).toEqual([13, 12, 14, 13]);
    expect(MAX_ENERGY).toBe(6);
    expect(ENERGY_STEP).toBe(3);
    expect(teamPower(setLineup(on, strongest))).toBe(15);
    expect(teamPower(setLineup(off, strongest))).toBe(15);
  });

  it("allows selecting and deselecting, with at most two distinct starters", () => {
    let state = initialGame();
    expect(teamPower(state)).toBe(0);
    state = selectPlayer(state, "ari");
    expect(state.selected).toEqual(["ari"]);
    expect(teamPower(state)).toBe(8);
    state = selectPlayer(state, "bo");
    expect(state.selected).toEqual(strongest);
    expect(selectPlayer(state, "cleo")).toBe(state);
    state = selectPlayer(state, "ari");
    expect(state.selected).toEqual(["bo"]);
    state = selectPlayer(state, "cleo");
    expect(state.selected).toEqual(["bo", "cleo"]);
  });

  it("rejects incomplete, duplicate, oversized and unknown lineups", () => {
    const state = initialGame();
    for (const lineup of [[], ["ari"], ["ari", "ari"], ["ari", "bo", "cleo"], ["ari", "unknown"]]) {
      expect(() => setLineup(state, lineup as PlayerId[])).toThrow(RangeError);
    }
    expect(() => selectPlayer(state, "unknown" as PlayerId)).toThrow(RangeError);
    expect(() => playMatch(state)).toThrow(RangeError);
    expect(() => playMatch(selectPlayer(state, "ari"))).toThrow(RangeError);
    expect(() => playMatch({ ...state, selected: ["ari", "ari"] })).toThrow(RangeError);
    expect(() => teamPower({ ...state, selected: ["ari", "unknown" as PlayerId] })).toThrow(RangeError);
  });

  it("loses starter energy only with fatigue ON, changing later power alone", () => {
    const on = playMatch(setLineup(initialGame(true), strongest));
    const off = playMatch(setLineup(initialGame(false), strongest));
    expect(on.results[0].power).toBe(15);
    expect(off.results[0].power).toBe(15);
    expect(energies(on)).toEqual([3, 3, 6, 6]);
    expect(energies(off)).toEqual([6, 6, 6, 6]);
    expect(teamPower(on)).toBe(11);
    expect(teamPower(off)).toBe(15);
    expect(on.results[0].energyChanges).toEqual([
      { id: "ari", before: 6, after: 3, started: true },
      { id: "bo", before: 6, after: 3, started: true },
      { id: "cleo", before: 6, after: 6, started: false },
      { id: "dev", before: 6, after: 6, started: false },
    ]);
    expect(off.results[0].energyChanges.every((change) => change.before === change.after)).toBe(true);
  });

  it("proves repeating the strongest pair wins 1/4 ON and 4/4 OFF", () => {
    const lineups = [strongest, strongest, strongest, strongest];
    const on = tournament(true, lineups);
    const off = tournament(false, lineups);
    expect(on.results.map((result) => result.power)).toEqual([15, 11, 9, 9]);
    expect(off.results.map((result) => result.power)).toEqual([15, 15, 15, 15]);
    expect(on.results.map((result) => result.won)).toEqual([true, false, false, false]);
    expect(off.results.every((result) => result.won)).toBe(true);
    expect(tournamentSummary(on)).toEqual({ wins: 1, losses: 3, lineupChanges: 0, complete: true });
    expect(tournamentSummary(off)).toEqual({ wins: 4, losses: 0, lineupChanges: 0, complete: true });
    expect(on.results.map((result) => result.target)).toEqual(TARGETS);
    expect(off.results.map((result) => result.target)).toEqual(TARGETS);
    for (const state of [on, off]) {
      expect(state.players.map(({ id, name, skill }) => ({ id, name, skill })))
        .toEqual(PLAYERS.map(({ id, name, skill }) => ({ id, name, skill })));
      for (const result of state.results) {
        const expectedPower = result.lineup.reduce((total, id) => {
          const player = PLAYERS.find((player) => player.id === id)!;
          const before = result.energyChanges.find((change) => change.id === id)!.before;
          return total + player.skill + Math.floor(before / 2);
        }, 0);
        expect(result.power).toBe(expectedPower);
        expect(result.won).toBe(result.power >= result.target);
      }
    }
  });

  it("proves alternating pairs can win all four fixtures with fatigue ON", () => {
    const state = tournament(true, [strongest, otherPair, strongest, otherPair]);
    expect(state.results.map((result) => result.power)).toEqual([15, 13, 15, 13]);
    expect(state.results.every((result) => result.won)).toBe(true);
    expect(tournamentSummary(state)).toEqual({ wins: 4, losses: 0, lineupChanges: 3, complete: true });
    expect(energies(state)).toEqual([6, 6, 3, 3]);
  });

  it("recovers resting players by 3 and clamps energy at both bounds", () => {
    let state = tournament(true, [strongest, strongest, strongest]);
    expect(energies(state)).toEqual([0, 0, 6, 6]);
    state = playMatch(setLineup(state, otherPair));
    expect(energies(state)).toEqual([3, 3, 3, 3]);
    const recovered = tournament(true, [strongest, otherPair]);
    expect(energies(recovered)).toEqual([6, 6, 3, 3]);
    expect(recovered.results[1].energyChanges[0]).toEqual({ id: "ari", before: 3, after: 6, started: false });
  });

  it("scores a tie as a win and explains a lower power as a loss", () => {
    const first = playMatch(setLineup(initialGame(), otherPair));
    expect(first.results[0]).toMatchObject({ match: 1, power: 13, target: 13, won: true });
    const second = playMatch(first);
    expect(second.results[1]).toMatchObject({ match: 2, power: 9, target: 12, won: false });
    expect(tournamentSummary(second)).toMatchObject({ wins: 1, losses: 1, complete: false });
  });

  it("advances once per match and withholds the final result until fixture four", () => {
    let state = setLineup(initialGame(), strongest);
    expect(finalResult(state)).toBeNull();
    for (let index = 0; index < TARGETS.length; index++) {
      expect(currentTarget(state)).toBe(TARGETS[index]);
      state = playMatch(state);
      expect(state.results).toHaveLength(index + 1);
      expect(state.results[index].match).toBe(index + 1);
      expect(state.selected).toEqual(strongest);
      if (index < 3) expect(finalResult(state)).toBeNull();
    }
    expect(currentTarget(state)).toBeNull();
    expect(finalResult(state)).toEqual({ wins: 1, losses: 3, lineupChanges: 0, complete: true, players: state.players });
    expect(playMatch(state)).toBe(state);
    expect(selectPlayer(state, "ari")).toBe(state);
    expect(setLineup(state, otherPair)).toBe(state);
    expect(state.results).toHaveLength(4);
  });

  it("counts changes in the pair, regardless of selection order", () => {
    const state = tournament(true, [strongest, ["bo", "ari"], ["ari", "cleo"], ["cleo", "ari"]]);
    expect(tournamentSummary(state).lineupChanges).toBe(1);
  });

  it("does not mutate inputs, prior results, initial conditions or caller lineups", () => {
    const state = initialGame();
    const snapshot = structuredClone(state);
    const lineup: PlayerId[] = ["ari", "bo"];
    const selected = setLineup(state, lineup);
    lineup[0] = "dev";
    expect(selected.selected).toEqual(strongest);
    const selectedSnapshot = structuredClone(selected);
    const next = playMatch(selected);
    expect(state).toEqual(snapshot);
    expect(selected).toEqual(selectedSnapshot);
    expect(next.players).not.toBe(selected.players);
    expect(next.players[0]).not.toBe(selected.players[0]);
    const resultSnapshot = structuredClone(next.results[0]);
    playMatch(next);
    expect(next.results[0]).toEqual(resultSnapshot);
    expect(energies(initialGame())).toEqual([6, 6, 6, 6]);
  });

  it("is deterministic for the same initial setting and choices", () => {
    const lineups: readonly (readonly PlayerId[])[] = [strongest, ["ari", "dev"], otherPair, ["bo", "dev"]];
    for (const fatigueMatters of [true, false]) {
      expect(tournament(fatigueMatters, lineups)).toEqual(tournament(fatigueMatters, lineups));
    }
  });

  it("keeps energy legal and fixtures fixed for every possible four-match lineup sequence", () => {
    const pairs: readonly (readonly PlayerId[])[] = [
      ["ari", "bo"], ["ari", "cleo"], ["ari", "dev"],
      ["bo", "cleo"], ["bo", "dev"], ["cleo", "dev"],
    ];
    for (const fatigueMatters of [true, false]) {
      for (const first of pairs) for (const second of pairs) for (const third of pairs) for (const fourth of pairs) {
        const state = tournament(fatigueMatters, [first, second, third, fourth]);
        expect(state.results.map((result) => result.target)).toEqual(TARGETS);
        expect(finalResult(state)?.complete).toBe(true);
        for (const result of state.results) for (const change of result.energyChanges) {
          expect(change.after).toBeGreaterThanOrEqual(0);
          expect(change.after).toBeLessThanOrEqual(MAX_ENERGY);
          if (!fatigueMatters) expect(change.after).toBe(MAX_ENERGY);
        }
      }
    }
  });
});

const mounted: { host: HTMLElement; unmount: () => void }[] = [];

afterEach(() => {
  for (const { host, unmount } of mounted.splice(0)) {
    unmount();
    host.remove();
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mountGame() {
  const host = document.createElement("div");
  document.body.append(host);
  const unmount = rotationRoom.mount(host);
  mounted.push({ host, unmount });
  const get = <T extends HTMLElement = HTMLElement>(selector: string): T => {
    const element = host.querySelector<T>(selector);
    if (!element) throw new Error(`Missing Rotation Room element: ${selector}`);
    return element;
  };
  const click = (selector: string) => get<HTMLButtonElement>(selector).click();
  const choose = (lineup: readonly PlayerId[]) => {
    for (const player of PLAYERS) {
      const button = get<HTMLButtonElement>(`[data-player='${player.id}']`);
      if (button.getAttribute("aria-pressed") === "true" && !lineup.includes(player.id)) button.click();
    }
    for (const id of lineup) {
      const button = get<HTMLButtonElement>(`[data-player='${id}']`);
      if (button.getAttribute("aria-pressed") !== "true") button.click();
    }
  };
  return { host, unmount, get, click, choose };
}

describe("Rotation Room on the Challenge page", () => {
  it("explains each starter's current skill and energy contribution before playing in both modes", () => {
    const { host, get, click, choose } = mountGame();
    expect(get("[data-power-breakdown]").hidden).toBe(true);
    choose(strongest);
    expect(get("[data-power-breakdown]").hidden).toBe(false);
    expect(get("[data-contribution='ari']").textContent).toBe("Ari: Skill 5 + energy bonus 3 = 8");
    expect(get("[data-contribution='bo']").textContent).toBe("Bo: Skill 4 + energy bonus 3 = 7");
    expect(get("[data-power-sum]").textContent).toBe("8 + 7 = 15");
    expect(get("[data-power]").textContent).toBe("15");
    expect(get("[data-target]").textContent).toBe("13");

    click("[data-play]");
    expect(get("[data-contribution='ari']").textContent).toBe("Ari: Skill 5 + energy bonus 1 = 6");
    expect(get("[data-contribution='bo']").textContent).toBe("Bo: Skill 4 + energy bonus 1 = 5");
    expect(get("[data-power-sum]").textContent).toBe("6 + 5 = 11");
    expect(get("[data-power]").textContent).toBe("11");
    expect(get("[data-target]").textContent).toBe("12");

    click("[data-player='ari']");
    expect(host.querySelector("[data-contribution='ari']")).toBeNull();
    const partialSum = get("[data-power-sum]");
    expect(partialSum.hidden || partialSum.textContent?.trim() === "").toBe(true);
    choose(["bo", "cleo"]);
    expect(host.querySelector("[data-contribution='ari']")).toBeNull();
    expect(get("[data-contribution='cleo']").textContent).toBe("Cleo: Skill 4 + energy bonus 3 = 7");
    expect(get("[data-power-sum]").textContent).toBe("5 + 7 = 12");

    get<HTMLInputElement>("[data-mechanic='fatigue']").click();
    expect(get("[data-power-breakdown]").hidden).toBe(true);
    expect(host.querySelector("[data-contribution]")).toBeNull();
    choose(strongest);
    expect(get("[data-contribution='ari']").textContent).toBe("Ari: Skill 5 + energy bonus 3 = 8");
    expect(get("[data-contribution='bo']").textContent).toBe("Bo: Skill 4 + energy bonus 3 = 7");
    expect(get("[data-power-sum]").textContent).toBe("8 + 7 = 15");
    expect(get("[data-target]").textContent).toBe("13");
    click("[data-play]");
    expect(get("[data-contribution='ari']").textContent).toBe("Ari: Skill 5 + energy bonus 3 = 8");
    expect(get("[data-contribution='bo']").textContent).toBe("Bo: Skill 4 + energy bonus 3 = 7");
    expect(get("[data-power-sum]").textContent).toBe("8 + 7 = 15");
    expect(get("[data-power]").textContent).toBe("15");
    expect(get("[data-target]").textContent).toBe("12");
    for (let remaining = 0; remaining < 3; remaining++) click("[data-play]");
    expect(get("[data-power-breakdown]").hidden).toBe(true);
  });

  it("shows the goal, squad and target, and requires two distinct starters before advancing", () => {
    const { host, get, click } = mountGame();
    expect(host.textContent).toContain("Win as many of the four matches as you can");
    expect(get("[data-match]").textContent).toBe("Match 1 of 4");
    expect(get("[data-target]").textContent).toBe("13");
    expect(get("[data-wins]").textContent).toBe("Wins: 0");
    expect(get("[data-play]").getAttribute("aria-disabled")).toBe("true");
    click("[data-play]");
    expect(get("[data-match]").textContent).toBe("Match 1 of 4");
    for (const player of PLAYERS) {
      const card = get(`[data-player='${player.id}']`);
      expect(card.textContent).toContain(player.name);
      expect(card.textContent).toContain(`Skill ${player.skill}`);
      expect(card.textContent).toContain("Energy 6/6");
      expect(card.textContent).toContain("Resting");
      expect(card.tagName).toBe("BUTTON");
      expect(card.getAttribute("aria-pressed")).toBe("false");
    }
    click("[data-player='ari']");
    click("[data-play]");
    expect(get("[data-match]").textContent).toBe("Match 1 of 4");
    click("[data-player='bo']");
    expect(get("[data-power]").textContent).toBe("15");
    expect(get("[data-play]").getAttribute("aria-disabled")).toBe("false");
    expect(get("[data-player='cleo']").getAttribute("aria-disabled")).toBe("true");
    click("[data-player='cleo']");
    expect(get("[data-player='cleo']").getAttribute("aria-pressed")).toBe("false");
    expect(get("[data-player='ari']").getAttribute("aria-pressed")).toBe("true");
    expect(get("[data-player='bo']").getAttribute("aria-pressed")).toBe("true");
    expect(get("[data-feedback]").textContent).toContain("Deselect one");
    expect(get("[data-history]").children).toHaveLength(0);
  });

  it("explains wins, losses and energy changes while immediately allowing the next lineup", () => {
    const { get, click, choose } = mountGame();
    choose(strongest);
    click("[data-play]");
    expect(get("[data-feedback]").textContent).toContain("WIN. Our power 15 meets the opponent target 13");
    expect(get("[data-energy='ari']").textContent).toBe("Energy 3/6");
    expect(get("[data-player='ari']").textContent).toContain("started · 6 → 3 (-3)");
    expect(get("[data-player='cleo']").textContent).toContain("rested · 6 → 6 (0)");
    expect(get("[data-match]").textContent).toBe("Match 2 of 4");
    expect(get("[data-target]").textContent).toBe("12");
    expect(get("[data-power]").textContent).toBe("11");
    expect(get("[data-play]").getAttribute("aria-disabled")).toBe("false");
    click("[data-play]");
    expect(get("[data-feedback]").textContent).toContain("LOSS. Our power 11 falls below the opponent target 12");
    expect(get("[data-energy='bo']").textContent).toBe("Energy 0/6");
    choose(otherPair);
    expect(get("[data-power]").textContent).toBe("13");
    click("[data-play]");
    expect(get("[data-player='ari']").textContent).toContain("rested · 0 → 3 (+3)");
    expect(get("[data-history]").children).toHaveLength(3);
    expect(get("[data-final]").hidden).toBe(true);
    expect(get("[data-match]").textContent).toBe("Match 4 of 4");
  });

  it("clearly restarts from identical conditions when the rule changes during a run", () => {
    const { host, get, click, choose } = mountGame();
    choose(strongest);
    click("[data-play]");
    expect(get("[data-wins]").textContent).toBe("Wins: 1");
    get<HTMLInputElement>("[data-mechanic='fatigue']").click();
    expect(get<HTMLInputElement>("[data-mechanic='fatigue']").checked).toBe(false);
    expect(get("[data-feedback]").textContent).toContain("Fresh comparison run · Fatigue OFF");
    expect(get("[data-match]").textContent).toBe("Match 1 of 4");
    expect(get("[data-wins]").textContent).toBe("Wins: 0");
    expect(get("[data-history]").children).toHaveLength(0);
    expect(get("[data-final]").hidden).toBe(true);
    expect(host.querySelector("[data-saved-mode]")).toBeNull();
    for (const player of PLAYERS) {
      expect(get(`[data-energy='${player.id}']`).textContent).toBe("Energy 6/6");
      expect(get(`[data-player='${player.id}']`).getAttribute("aria-pressed")).toBe("false");
    }
    choose(strongest);
    expect(get("[data-power]").textContent).toBe("15");
    click("[data-play]");
    expect(get("[data-feedback]").textContent).toContain("Fatigue is OFF: everyone stays at full energy");
    expect(get("[data-energy='ari']").textContent).toBe("Energy 6/6");
    expect(get("[data-target]").textContent).toBe("12");
    expect(get("[data-power]").textContent).toBe("15");
  });

  it("finishes on fixture four and preserves actual ON/OFF scores and full match logs for comparison", () => {
    const { host, get, click, choose } = mountGame();
    choose(strongest);
    for (let fixture = 1; fixture <= 4; fixture++) {
      expect(get("[data-final]").hidden).toBe(true);
      click("[data-play]");
      expect(get("[data-history]").children).toHaveLength(fixture);
    }
    expect(get("[data-final]").hidden).toBe(false);
    expect(get("[data-final-score]").textContent).toBe("1 / 4 matches won · Fatigue ON");
    expect(document.activeElement).toBe(get("[data-final-score]"));
    expect(get("[data-lineup-changes]").textContent).toContain("0 times");
    expect(get("[data-energy='ari']").textContent).toBe("Energy 0/6");
    expect(get("[data-player='ari']").getAttribute("aria-disabled")).toBe("true");
    click("[data-player='ari']");
    click("[data-play]");
    expect(get("[data-history]").children).toHaveLength(4);
    expect(get("[data-saved-mode='on']").textContent).toContain("1/4 wins");
    expect(get("[data-saved-mode='on']").querySelectorAll("li")).toHaveLength(4);
    expect(get("[data-saved-mode='on']").querySelectorAll("[data-result='win']")).toHaveLength(1);
    click("[data-opposite]");
    expect(get("[data-final]").hidden).toBe(true);
    expect(get("[data-match]").textContent).toBe("Match 1 of 4");
    expect(get("[data-wins]").textContent).toBe("Wins: 0");
    expect(get("[data-saved-mode='on']").textContent).toContain("1/4 wins");
    expect(get<HTMLInputElement>("[data-mechanic='fatigue']").checked).toBe(false);
    choose(strongest);
    for (let fixture = 0; fixture < 4; fixture++) click("[data-play]");
    expect(get("[data-final-score]").textContent).toBe("4 / 4 matches won · Fatigue OFF");
    expect(get("[data-saved-mode='on']").textContent).toContain("1/4 wins");
    expect(get("[data-saved-mode='off']").textContent).toContain("4/4 wins");
    expect(get("[data-saved-mode='off']").querySelectorAll("[data-result='win']")).toHaveLength(4);
    expect(Array.from(get("[data-saved-mode='on']").querySelectorAll("li"), (li) => li.textContent)).toEqual([
      "1. Ari + BoWIN · 15 / 13", "2. Ari + BoLOSS · 11 / 12",
      "3. Ari + BoLOSS · 9 / 14", "4. Ari + BoLOSS · 9 / 13",
    ]);
    expect(host.textContent).toContain("What did you feel while playing? Did changing fatigue change your decisions or experience?");
    click("[data-replay]");
    expect(get<HTMLInputElement>("[data-mechanic='fatigue']").checked).toBe(false);
    expect(get("[data-final]").hidden).toBe(true);
    expect(get("[data-saved-mode='on']").textContent).toContain("1/4 wins");
    expect(get("[data-saved-mode='off']").textContent).toContain("4/4 wins");
  });

  it("supports rotating the lineup to win all four matches with fatigue ON", () => {
    const { get, click, choose } = mountGame();
    for (const lineup of [strongest, otherPair, strongest, otherPair]) {
      choose(lineup);
      click("[data-play]");
    }
    expect(get("[data-final-score]").textContent).toBe("4 / 4 matches won · Fatigue ON");
    expect(get("[data-lineup-changes]").textContent).toContain("3 times");
    expect(get("[data-energy='ari']").textContent).toBe("Energy 6/6");
    expect(get("[data-energy='dev']").textContent).toBe("Energy 3/6");
    expect(get("[data-saved-mode='on']").querySelectorAll("[data-result='win']")).toHaveLength(4);
  });

  it("isolates mounted games and comparison results without browser storage", () => {
    const first = mountGame();
    const second = mountGame();
    first.choose(strongest);
    for (let fixture = 0; fixture < 4; fixture++) first.click("[data-play]");
    first.click("[data-opposite]");
    expect(first.get<HTMLInputElement>("[data-mechanic='fatigue']").checked).toBe(false);
    expect(second.get<HTMLInputElement>("[data-mechanic='fatigue']").checked).toBe(true);
    expect(second.get("[data-match]").textContent).toBe("Match 1 of 4");
    expect(second.get("[data-selection]").textContent).toBe("0 / 2 selected");
    expect(second.host.querySelector("[data-saved-mode]")).toBeNull();
    first.unmount();
    const remounted = mountGame();
    expect(remounted.host.querySelector("[data-saved-mode]")).toBeNull();
    second.choose(otherPair);
    second.click("[data-play]");
    expect(second.get("[data-wins]").textContent).toBe("Wins: 1");
  });

  it("unmounts safely twice, leaving no timers or active listeners on retained controls", () => {
    vi.useFakeTimers();
    const { host, unmount, get, choose } = mountGame();
    choose(strongest);
    const root = get(".rotation-room");
    const play = get<HTMLButtonElement>("[data-play]");
    const player = get<HTMLButtonElement>("[data-player='ari']");
    const fatigue = get<HTMLInputElement>("[data-mechanic='fatigue']");
    const contentBefore = root.textContent;
    const removeListener = vi.spyOn(root, "removeEventListener");
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    unmount();
    expect(removeListener).toHaveBeenCalledWith("click", expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(host.childNodes).toHaveLength(0);
    player.click();
    play.click();
    fatigue.click();
    expect(root.textContent).toBe(contentBefore);
    expect(root.querySelector("[data-match]")!.textContent).toBe("Match 1 of 4");
    expect(vi.getTimerCount()).toBe(0);
  });
});
