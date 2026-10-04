// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { startNavigation, navigateSection } from "../src/lib/navigation";
let root: HTMLElement;
let stop: () => void;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }); vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("scrollY", 0); history.scrollRestoration = "auto";
  history.replaceState({ unrelated: 42 }, "", "#/m/chance");
  root = document.createElement("main"); document.body.append(root);
});
afterEach(() => { stop?.(); root.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("keeps the same game and pending bot timer across section shortcuts, cleans on departure", () => {
  vi.spyOn(Math, "random").mockReturnValue(0.5); stop = startNavigation(root);
  const pig = root.querySelector(".pig");
  root.querySelector<HTMLButtonElement>("[data-roll]")!.click();
  root.querySelector<HTMLButtonElement>("[data-hold]")!.click();
  expect(vi.getTimerCount()).toBe(1);
  navigateSection("examples");
  expect(root.querySelector(".pig")).toBe(pig);
  expect(document.activeElement?.id).toBe("examples");
  expect(vi.getTimerCount()).toBe(1);
  const link = root.querySelector<HTMLAnchorElement>('a[href="#/"]')!; link.click();
  expect(root.querySelector("h1")?.textContent).toBe("Why people play");
  expect(vi.getTimerCount()).toBe(0);
});
it("preserves outgoing history metadata and restores focus and scroll on Back", () => {
  history.replaceState({ unrelated: 42 }, "", "#/?q=Halo&view=list");
  stop = startNavigation(root);
  const link = root.querySelector<HTMLAnchorElement>("#result-halo")!; link.focus();
  vi.stubGlobal("scrollY", 450); window.dispatchEvent(new Event("scroll"));
  expect(history.state).toEqual({ unrelated: 42, atlas: { scrollY: 450, focusId: "result-halo" } });
  const saved = history.state;
  link.click(); expect(root.querySelector("h1")?.textContent).toBe("Halo");
  // Model browser traversal: state and URL change before popstate, followed by hashchange.
  history.replaceState(saved, "", "#/?q=Halo&view=list");
  window.dispatchEvent(new PopStateEvent("popstate", { state: saved }));
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  expect(document.activeElement?.id).toBe("result-halo");
  expect(window.scrollTo).toHaveBeenLastCalledWith(0, 450);
  expect(root.querySelector<HTMLInputElement>("#game-search")?.value).toBe("Halo");
});
it("validates section targets and restores controller resources", () => {
  history.replaceState({}, "", "#/about?section=play"); stop = startNavigation(root);
  expect(document.activeElement?.tagName).toBe("H1");
  expect(history.scrollRestoration).toBe("manual");
  navigateSection("play"); expect(location.hash).toBe("#/about?section=play");
  navigateSection("contribute"); expect(document.activeElement?.id).toBe("contribute");
  stop(); expect(root.childElementCount).toBe(0); expect(history.scrollRestoration).toBe("auto");
  window.dispatchEvent(new HashChangeEvent("hashchange")); expect(root.childElementCount).toBe(0);
});
