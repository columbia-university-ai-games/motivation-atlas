// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderRoute } from "../src/app";

describe("renderRoute", () => {
  const root = () => document.createElement("div");

  it("renders each page", () => {
    const r = root();
    renderRoute(r, "#/");
    expect(r.querySelector("h1")!.textContent).toBe("Why people play");
    renderRoute(r, "#/m/chance");
    expect(r.querySelector("h1")!.textContent).toBe("Chance");
    renderRoute(r, "#/note");
    expect(r.querySelector("h1")!.textContent).toBe("Why people play: motivators and example games");
    renderRoute(r, "#/about");
    expect(r.querySelector("h1")!.textContent).toBe("About the Atlas");
  });

  it("renders not found for an unknown path", () => {
    const r = root();
    renderRoute(r, "#/elsewhere");
    expect(r.textContent).toContain("Not on the map");
  });
});
