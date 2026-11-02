// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { speedUp } from "../src/minigames/speed-up";

afterEach(() => vi.useRealTimers());

describe("Speed Up on the page", () => {
  it("scores a hit after Start and clears its timer on unmount", () => {
    vi.useFakeTimers();
    const el = document.createElement("div");
    document.body.append(el);
    const unmount = speedUp.mount(el);
    el.querySelector<HTMLButtonElement>("[data-start]")!.click();
    expect(vi.getTimerCount()).toBe(1);
    el.querySelector<HTMLButtonElement>(".speedup-cell.lit")!.click();
    expect(el.querySelector("[data-hits]")!.textContent).toBe("1");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(el.childNodes.length).toBe(0);
    el.remove();
  });
});
