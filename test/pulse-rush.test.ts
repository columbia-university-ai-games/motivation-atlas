// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BASE_GAP_MS,
  HITS_PER_SPEED_STEP,
  MIN_GAP_MS,
  ROUND_MS,
  pulseGapMs,
} from "../src/minigames/pulse-rush/game";
import { pulseRush } from "../src/minigames/pulse-rush";

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("Pulse Rush escalation", () => {
  it("shortens the pulse gap after successful hits only when escalation is on", () => {
    expect(pulseGapMs(0, true)).toBe(BASE_GAP_MS);
    expect(pulseGapMs(HITS_PER_SPEED_STEP, true)).toBeLessThan(BASE_GAP_MS);
    expect(pulseGapMs(HITS_PER_SPEED_STEP * 4, true)).toBeLessThan(pulseGapMs(HITS_PER_SPEED_STEP, true));

    expect(pulseGapMs(0, false)).toBe(BASE_GAP_MS);
    expect(pulseGapMs(HITS_PER_SPEED_STEP * 20, false)).toBe(BASE_GAP_MS);
  });

  it("never accelerates past the playable minimum gap", () => {
    expect(pulseGapMs(10_000, true)).toBe(MIN_GAP_MS);
  });
});

describe("Pulse Rush round", () => {
  it("finishes after 60 seconds and cleans up every timer", () => {
    vi.useFakeTimers();
    const host = document.createElement("div");
    document.body.append(host);
    const unmount = pulseRush.mount(host);

    host.querySelector<HTMLButtonElement>("[data-start]")!.click();
    expect(host.querySelector<HTMLButtonElement>("[data-pulse-target]")!.disabled).toBe(false);

    vi.advanceTimersByTime(ROUND_MS);

    expect(host.querySelector<HTMLButtonElement>("[data-pulse-target]")!.disabled).toBe(true);
    expect(host.querySelector("[data-status]")!.textContent).toContain("gap");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
