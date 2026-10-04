// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { pig } from "../src/minigames/pig";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function setup() {
  const el = document.createElement("div");
  document.body.append(el);
  const unmount = pig.mount(el);
  const q = <T extends Element>(sel: string) => el.querySelector(sel) as T;
  return { el, unmount, q };
}

describe("Pig on the page", () => {
  it("plays a roll and shows the turn total", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // die 4
    const { q, unmount } = setup();
    q<HTMLButtonElement>("[data-roll]").click();
    expect(q("[data-turn]").textContent).toBe("4");
    unmount();
  });

  it("ignores Roll and Hold during the bot's turn, and cleans up its timer on unmount", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0); // die 1: you bust, the bot starts
    const { q, unmount, el } = setup();
    q<HTMLButtonElement>("[data-roll]").click();
    expect(q<HTMLButtonElement>("[data-roll]").disabled).toBe(true);
    q<HTMLButtonElement>("[data-roll]").click();
    expect(q("[data-score='0']").textContent).toBe("0");
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(el.childNodes.length).toBe(0);
  });

  it("applies mechanic toggles on New game", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99); // die 6
    const { q, unmount } = setup();
    q<HTMLInputElement>("[data-mechanic='reward'][value='steady']").click();
    q<HTMLButtonElement>("[data-new]").click();
    q<HTMLButtonElement>("[data-roll]").click();
    expect(q("[data-turn]").textContent).toBe("4");
    expect(q("[data-dynamics]").textContent).toContain("Every safe roll pays 4");
    unmount();
  });
});
