import { describe, expect, it } from "vitest";
import { LIVES, MIN_WINDOW_MS, START_WINDOW_MS, start, tap, tick, windowFor } from "../src/minigames/speed-up/game";

const on = { escalation: true };
const off = { escalation: false };
const random = () => 0.5;

describe("Speed Up", () => {
  it("shrinks the target's window with every hit only when escalation is on", () => {
    let escalating = start(on, 0, random);
    let steady = start(off, 0, random);
    for (let i = 0; i < 10; i++) {
      escalating = tap(escalating, escalating.target, i * 100, random);
      steady = tap(steady, steady.target, i * 100, random);
    }
    expect(escalating.hits).toBe(10);
    expect(escalating.deadline - 900).toBe(windowFor(10, on));
    expect(windowFor(10, on)).toBeLessThan(START_WINDOW_MS * 0.85);
    expect(steady.deadline - 900).toBe(START_WINDOW_MS);
    expect(windowFor(1000, on)).toBe(MIN_WINDOW_MS);
    expect(windowFor(1000, off)).toBe(START_WINDOW_MS);
  });

  it("moves the target after each hit", () => {
    const s = start(on, 0, random);
    expect(tap(s, s.target, 10, random).target).not.toBe(s.target);
  });

  it("costs a life for a wrong tap or a missed target, and ends at zero lives", () => {
    let s = start(off, 0, random);
    s = tap(s, (s.target + 1) % 9, 10, random);
    expect(s.lives).toBe(LIVES - 1);
    s = tick(s, 10 + START_WINDOW_MS, random);
    expect(s.lives).toBe(LIVES - 2);
    s = tick(s, 10 + 2 * START_WINDOW_MS, random);
    expect(s.over).toBe("lives");
  });

  it("charges one life, not two, for a late tap on a target that just went dark", () => {
    const s = start(off, 0, random);
    const late = tap(s, s.target, START_WINDOW_MS + 10, random);
    expect(late.lives).toBe(LIVES - 1);
    expect(late.hits).toBe(0);
  });

  it("ends the round when time runs out", () => {
    let s = start(off, 0, random);
    for (let t = 0; t < 60_000; t += 500) s = tap(s, s.target, t, random);
    expect(tick(s, 60_000, random).over).toBe("time");
  });
});
