// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderRoute } from "../src/app";

function page(slug: string): HTMLElement {
  const root = document.createElement("div");
  renderRoute(root, `#/m/${slug}`);
  return root;
}

describe("a motivator page in three bands", () => {
  it("runs from mechanics through dynamics to the aesthetic, with the joining phrases", () => {
    const root = page("challenge");
    const bands = [...root.querySelectorAll(".band")].map((b) => b.querySelector("h2")!.textContent);
    expect(bands).toEqual(["Mechanics", "Dynamics", "Aesthetic"]);
    expect([...root.querySelectorAll(".band-arrow")].map((a) => a.textContent)).toEqual([
      "which, while the game runs, produce",
      "which players feel as",
    ]);
  });

  it("puts each item's citation on its own line, linked to the source", () => {
    const root = page("challenge");
    const first = root.querySelector(".band.mechanics .station")!;
    expect(first.querySelector(".claim")!.textContent).toBe(
      "Goals whose outcome is uncertain, through variable difficulty, multiple levels of goals, hidden information, or randomness.");
    const link = first.querySelector(".cite a.cite-link")!;
    expect(link.textContent).toBe("Malone 1980");
    expect(link.getAttribute("href")).toBe("https://www.hcs64.com/files/tm%20study%20144.pdf");
  });

  it("sends book citations to the library and links citations in the Named-by line", () => {
    const root = page("challenge");
    const schell = root.querySelector('.band a.cite-link.library')!;
    expect(schell.textContent).toBe("Schell 2019");
    expect(schell.getAttribute("href")).toBe("https://clio.columbia.edu/catalog?q=9781138632059");
    expect(root.querySelectorAll(".named-by a.cite-link").length).toBeGreaterThan(3);
  });

  it("shows the MDA aesthetic as the feeling card", () => {
    const card = page("challenge").querySelector(".band.aesthetic .feeling")!;
    expect(card.querySelector(".feeling-name")!.textContent).toBe('Challenge, "game as obstacle course".');
    expect(card.querySelector(".cite a")!.textContent).toBe("Hunicke et al. 2004");
  });
});
