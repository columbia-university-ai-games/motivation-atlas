// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadAtlas } from "../src/content/atlas";
import { renderRoute } from "../src/app";
import { renderOverview } from "../src/pages/overview";
import { layoutConstellation } from "../src/pages/constellation-layout";
const key = "motivation-atlas.overview-view.v1";
let root: HTMLElement;
let cleanup: () => void;
beforeEach(() => { localStorage.clear(); history.replaceState({ other: 7 }, "", "#/"); root = document.createElement("div"); document.body.append(root); });
afterEach(() => { cleanup?.(); root.remove(); vi.restoreAllMocks(); });
const change = (selector: string, value: string) => { const el = root.querySelector<HTMLSelectElement>(selector)!; el.value = value; el.dispatchEvent(new Event("change")); };
it("shows actionable results, preserves focus and metadata while searching, and resets empty results", () => {
  cleanup = renderRoute(root, "#/?view=list");
  const search = root.querySelector<HTMLInputElement>("#game-search")!;
  search.focus(); search.value = "Halo"; search.dispatchEvent(new Event("input"));
  expect(root.querySelector('.catalog-results a[href="#/g/halo"]')).not.toBeNull();
  expect(root.querySelector(".count")?.textContent).toContain("1 game");
  expect(document.activeElement).toBe(search);
  expect(location.hash).toContain("q=Halo"); expect(history.state.other).toBe(7);
  search.value = "zzzzzz"; search.dispatchEvent(new Event("input"));
  expect(root.querySelector(".count")?.textContent).toContain("0 games");
  root.querySelector<HTMLButtonElement>("[data-reset]")!.click();
  expect(search.value).toBe(""); expect(root.querySelectorAll(".catalog-results > li").length).toBe(91);
});
it("uses URL, then saved view, then viewport without switching on resize", () => {
  vi.stubGlobal("innerWidth", 390);
  localStorage.setItem(key, "map"); cleanup = renderRoute(root, "#/");
  expect(root.querySelector(".constellation-wrap")?.hasAttribute("hidden")).toBe(false);
  cleanup(); cleanup = renderRoute(root, "#/?view=list");
  expect(root.querySelector(".constellation-wrap")?.hasAttribute("hidden")).toBe(true);
  root.querySelector<HTMLButtonElement>('[data-view="map"]')!.click();
  expect(localStorage.getItem(key)).toBe("map");
  window.dispatchEvent(new Event("resize"));
  expect(root.querySelector(".constellation-wrap")?.hasAttribute("hidden")).toBe(false);
  vi.unstubAllGlobals();
});
it("survives blocked storage and renders malicious titles literally", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  const atlas = loadAtlas(); atlas.games[0].title = "<img src=x onerror=alert(1)>";
  cleanup = renderOverview(root, atlas);
  root.querySelector<HTMLButtonElement>('[data-view="list"]')!.click();
  expect(root.querySelector("img[src=x]")).toBeNull();
  expect(root.querySelector(".catalog-results")?.textContent).toContain("<img src=x onerror=alert(1)>");
});
it("excludes proposed-only games from focus and pointer candidates and selects hubs persistently", () => {
  const atlas = loadAtlas(); atlas.games.push({ slug: "proposed-only", title: "Proposed only", kind: "activity", videos: [], links: [{ kind: "proposed", motivator: "chance", mechanic: "Rule", dynamic: "Behavior", github: "student" }] });
  cleanup = renderOverview(root, atlas);
  change("#relationship-filter", "sourced");
  const node = root.querySelector<SVGGElement>('g.game[data-game="proposed-only"]')!;
  expect(node.getAttribute("tabindex")).toBe("-1"); expect(node.getAttribute("aria-hidden")).toBe("true");
  const point = layoutConstellation(atlas).nodes.find(n => n.slug === "proposed-only")!;
  const svg = root.querySelector("svg")!;
  Object.defineProperty(svg, "getScreenCTM", { value: () => ({ inverse: () => ({}) }) });
  vi.stubGlobal("DOMPoint", class { matrixTransform() { return point; } });
  svg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  expect(location.hash).not.toContain("/g/proposed-only");
  const hub = root.querySelector<SVGGElement>('.hub[data-motivator="chance"]')!;
  hub.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  hub.dispatchEvent(new Event("mouseleave"));
  expect(root.querySelector<HTMLSelectElement>("#motivator-filter")!.value).toBe("chance");
  expect(root.querySelector('a[data-open-motivator]')?.getAttribute("href")).toBe("#/m/chance");
  vi.unstubAllGlobals();
});

it("offers playable and catalog entrances without deferred feature links", () => {
  cleanup = renderRoute(root, "#/");
  expect(root.querySelector('a[href="#/play/pig"]')).not.toBeNull();
  root.querySelector<HTMLButtonElement>("[data-explore]")!.click();
  expect(document.activeElement?.id).toBe("game-search");
  expect(root.querySelector('a[href^="#/notebook"]')).toBeNull();
});
