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
    // Roll stays focusable so keyboard players keep their place; it is marked unavailable instead.
    expect(q<HTMLButtonElement>("[data-roll]").disabled).toBe(false);
    expect(q("[data-roll]").getAttribute("aria-disabled")).toBe("true");
    q<HTMLButtonElement>("[data-roll]").click();
    expect(q("[data-score='0']").textContent).toBe("0");
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(el.childNodes.length).toBe(0);
  });

  it("asks the player to reflect, and frames the panel as the sources' claims", () => {
    const { q, unmount } = setup();
    expect(q(".pig-reflect")!.textContent).toContain("What did you feel");
    expect(q(".pig-reflect")!.querySelector("input, textarea, select")).toBeNull();
    expect(q(".pig-panel h4")!.textContent).toBe("What the sources say emerges");
    unmount();
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
