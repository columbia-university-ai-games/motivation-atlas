// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { renderRoute } from "../src/app";
import { parseRoute } from "../src/router";
import { pig } from "../src/minigames/pig";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
it("opens focused Pig with rules, source context, and a motivator return link", () => {
  expect(parseRoute("#/play/pig")).toEqual({ page: "experiment", slug: "pig" });
  const root = document.createElement("div");
  const cleanup = renderRoute(root, "#/play/pig");
  expect(root.querySelector("h1")?.textContent).toBe("Pig: push your luck");
  expect([...root.querySelectorAll("h1,h2,h3")].filter(el => el.textContent === pig.title)).toHaveLength(1);
  expect(root.querySelector('a[href="#/m/chance"]')).not.toBeNull();
  const rules = root.querySelector(".minigame-howto")!;
  expect(rules.textContent).toContain("A roll of 1 wipes out your turn total");
  expect(rules.compareDocumentPosition(root.querySelector(".minigame-host")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(root.querySelector("details")?.textContent).toContain("Sources");
  cleanup();
  expect(root.childElementCount).toBe(0);
});
it("lists registered experiments and handles unknown ones", () => {
  const root = document.createElement("div");
  renderRoute(root, "#/experiments");
  expect(root.querySelector('a[href="#/play/pig"]')?.textContent).toBe(pig.title);
  renderRoute(root, "#/play/nope");
  expect(root.textContent).toContain("Not on the map");
});
it("cleans a pending bot turn and mounts only once on the motivator page", () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  const root = document.createElement("div");
  const cleanup = renderRoute(root, "#/play/pig");
  root.querySelector<HTMLButtonElement>("[data-roll]")!.click();
  root.querySelector<HTMLButtonElement>("[data-hold]")!.click();
  expect(vi.getTimerCount()).toBe(1);
  cleanup();
  expect(vi.getTimerCount()).toBe(0);
  expect(root.childElementCount).toBe(0);
  const cleanupMotivator = renderRoute(root, "#/m/chance");
  expect(root.querySelectorAll(".pig")).toHaveLength(1);
  cleanupMotivator();
});
it("retains author attribution in the shared presentation", async () => {
  const { presentMinigame } = await import("../src/minigames/presentation");
  const view = presentMinigame({ ...pig, author: "student" });
  expect(view.element.textContent).toContain("by student");
  view.cleanup();
  expect(view.element.querySelector(".pig")).toBeNull();
});
