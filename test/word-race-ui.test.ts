// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { wordRace } from "../src/minigames/word-race";
import { botDelayMs } from "../src/minigames/word-race/game";

afterEach(() => {
  vi.useRealTimers();
});

describe("Word Race on the page", () => {
  it("locks settings after Begin race and advances the bot at the selected speed", () => {
    vi.useFakeTimers();
    const el = document.createElement("div");
    document.body.append(el);
    const unmount = wordRace.mount(el);
    const begin = el.querySelector<HTMLButtonElement>(".word-race-begin")!;
    const input = el.querySelector<HTMLInputElement>(".word-race-input")!;
    const botProgress = el.querySelector<HTMLProgressElement>('[aria-label="Bot progress"]')!;
    const difficulty = el.querySelector<HTMLSelectElement>('[data-mechanic="bot-difficulty"]')!;
    const target = el.querySelector<HTMLSelectElement>('[aria-label="Points needed to win"]')!;
    const preview = el.querySelector<HTMLElement>(".word-race-preview")!;

    expect(input.disabled).toBe(true);
    expect(botProgress.value).toBe(0);
    expect(preview.textContent).toBeTruthy();
    expect(el.querySelector(".word-race-prompt")!.firstElementChild).toBe(el.querySelector(".word-race-word"));
    expect(getComputedStyle(el.querySelector(".word-race-word")!).fontSize)
      .toBe(getComputedStyle(preview).fontSize);
    expect(getComputedStyle(el.querySelector(".word-race-prompt")!).flexWrap).toBe("nowrap");
    difficulty.value = "easy";
    target.value = "5";
    const firstWord = el.querySelector(".word-race-word")!.textContent!;
    begin.click();
    expect(input.disabled).toBe(true);
    expect(el.querySelector<HTMLElement>(".word-race-status")!.textContent).toContain("Get ready");
    expect(difficulty.disabled).toBe(true);
    expect(target.disabled).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(input.disabled).toBe(false);
    expect(document.activeElement).toBe(input);
    input.value = firstWord;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(input.value).toBe("");
    expect(el.querySelector<HTMLElement>(".word-race-status")!.textContent).toContain("Correct");
    vi.advanceTimersByTime(botDelayMs(firstWord, "easy"));
    expect(botProgress.value).toBe(1);

    el.querySelector<HTMLButtonElement>("button:not(.word-race-begin)")!.click();
    expect(difficulty.disabled).toBe(false);
    expect(target.disabled).toBe(false);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(el.childNodes.length).toBe(0);
    el.remove();
  });
});
