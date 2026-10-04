// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderRoute } from "../src/app";
import { safeBlock } from "../src/lib/markdown";
import { readmeSections } from "../src/minigames/readme";

describe("readmeSections", () => {
  it("splits a README into its level-two sections", () => {
    const sections = readmeSections("# Title\n\nIntro.\n\n## Mechanic\n\nRoll.\n\n## Dynamic\r\n\r\nSwings.\n");
    expect(sections).toEqual({ Mechanic: "Roll.", Dynamic: "Swings." });
  });
});

describe("safeBlock", () => {
  it("renders Markdown but shows raw HTML as text and drops script links", () => {
    const html = safeBlock('**Bold** <img src=x onerror=alert(1)> [x](javascript:alert(1)) [ok](https://example.com)');
    const div = document.createElement("div");
    div.innerHTML = html;
    expect(div.querySelector("strong")!.textContent).toBe("Bold");
    expect(div.querySelector("img")).toBeNull();
    expect(div.textContent).toContain("<img src=x onerror=alert(1)>");
    expect(div.querySelector('a[href^="javascript"]')).toBeNull();
    expect(div.querySelector('a[href="https://example.com"]')).not.toBeNull();
  });
});

describe("minigames on a motivator page", () => {
  it("show how to play above the game and what it demonstrates below", () => {
    const root = document.createElement("div");
    renderRoute(root, "#/m/chance");
    const game = root.querySelector(".minigame")!;
    const howTo = game.querySelector(".minigame-howto")!;
    expect(howTo.textContent).toContain("How to play");
    expect(howTo.textContent).toContain("A roll of 1 wipes out your turn total");
    expect(howTo.compareDocumentPosition(game.querySelector(".minigame-host")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const about = game.querySelector("details.minigame-about")!;
    expect(about.textContent).toContain("What it demonstrates");
    expect(about.textContent).toContain("Salen and Zimmerman 2003, ch. 15");
  });
});
