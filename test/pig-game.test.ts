import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { botShouldHold, hold, leadChanges, newGame, roll, rollDie, type PigOptions } from "../src/minigames/pig/game";
import { dynamicsFor, SOURCES } from "../src/minigames/pig/sources";

const classic: PigOptions = { pushYourLuck: true, reward: "face", target: 50 };

describe("Pig", () => {
  it("adds safe rolls to the turn total and banks them on hold", () => {
    let s = newGame(classic);
    s = roll(s, 5);
    s = roll(s, 6);
    expect(s.turnTotal).toBe(11);
    expect(s.current).toBe(0);
    s = hold(s);
    expect(s.scores).toEqual([11, 0]);
    expect(s.turnTotal).toBe(0);
    expect(s.current).toBe(1);
    expect(s.leadHistory).toEqual([0, 11]);
  });

  it("loses the turn total on a 1", () => {
    let s = roll(roll(newGame(classic), 6), 1);
    expect(s.scores).toEqual([0, 0]);
    expect(s.lastEvent).toBe("busted");
    expect(s.current).toBe(1);
  });

  it("pays a steady 4 per safe roll in steady mode", () => {
    const s = roll(roll(newGame({ ...classic, reward: "steady" }), 2), 6);
    expect(s.turnTotal).toBe(8);
  });

  it("banks every roll at once when push your luck is off", () => {
    let s = roll(newGame({ ...classic, pushYourLuck: false }), 5);
    expect(s.scores).toEqual([5, 0]);
    expect(s.current).toBe(1);
    expect(hold(s)).toBe(s);
  });

  it("wins as soon as a player reaches the target", () => {
    let s = newGame({ ...classic, target: 10 });
    s = roll(s, 6);
    s = roll(s, 5);
    expect(s.winner).toBe(0);
    expect(s.lastEvent).toBe("won");
    expect(s.scores[0]).toBe(11);
  });

  it("ignores input after a win and a hold with nothing to bank", () => {
    let s = roll(roll(newGame({ ...classic, target: 10 }), 6), 5);
    expect(roll(s, 4)).toBe(s);
    expect(hold(s)).toBe(s);
    const fresh = newGame(classic);
    expect(hold(fresh)).toBe(fresh);
  });

  it("rejects a die outside 1 to 6", () => {
    expect(() => roll(newGame(classic), 7)).toThrow(RangeError);
  });

  it("has the bot hold at 20 or when it can win", () => {
    let s = { ...newGame(classic), current: 1 as const, turnTotal: 19 };
    expect(botShouldHold(s)).toBe(false);
    expect(botShouldHold({ ...s, turnTotal: 20 })).toBe(true);
    expect(botShouldHold({ ...s, scores: [0, 45] as [number, number], turnTotal: 5 })).toBe(true);
    expect(botShouldHold({ ...s, turnTotal: 0 })).toBe(false);
    expect(botShouldHold({ ...s, turnTotal: 25, options: { ...classic, pushYourLuck: false } })).toBe(false);
  });

  it("rolls fair faces and counts lead changes", () => {
    expect(rollDie(() => 0)).toBe(1);
    expect(rollDie(() => 0.9999)).toBe(6);
    expect(leadChanges([0, 5, 8, -2, -2, 0, 3])).toBe(2);
  });
});

describe("Pig sources", () => {
  it("quotes the note verbatim", () => {
    const note = readFileSync("content/player-motivations.md", "utf8");
    for (const text of Object.values(SOURCES)) expect(note).toContain(text);
  });
  it("names the dynamics each setting produces", () => {
    expect(dynamicsFor(classic)).toEqual([SOURCES.pushYourLuck, SOURCES.alternating, SOURCES.variable, SOURCES.reversals]);
    const flat = dynamicsFor({ ...classic, pushYourLuck: false, reward: "steady" });
    expect(flat[0]).toMatch(/no decision left/);
    expect(flat).toContain(SOURCES.reversals);
    expect(flat).not.toContain(SOURCES.pushYourLuck);
  });
});
