// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { linkCitations, splitCitation } from "../src/lib/citations";
import type { BibEntry } from "../src/content/bibliography";

const bib: BibEntry[] = [
  { key: "Malone 1980", title: "What Makes Things Fun to Learn?", url: "https://example.com/malone.pdf", kind: "free" },
  { key: "Malone and Lepper 1987", title: "Making Learning Fun", url: "https://doi.org/x", kind: "publisher" },
];

describe("splitCitation", () => {
  it("moves a trailing citation onto its own line", () => {
    expect(splitCitation("Score-keeping and speeded responses (Malone 1980, p. 66).")).toEqual({ claim: "Score-keeping and speeded responses.", cite: "Malone 1980, p. 66" });
    expect(splitCitation('Quake as "easy" (Salen and Zimmerman 2003, ch. 24, "Sculpting Desire").').cite).toBe('Salen and Zimmerman 2003, ch. 24, "Sculpting Desire"');
  });
  it("leaves text without a trailing citation alone", () => {
    expect(splitCitation("Dice.")).toEqual({ claim: "Dice.", cite: "" });
    expect(splitCitation("Levels (the hard ones).")).toEqual({ claim: "Levels (the hard ones).", cite: "" });
  });
});

describe("linkCitations", () => {
  it("wraps known keys in links that open the source in a new tab, longest key first", () => {
    const el = document.createElement("p");
    el.textContent = "Malone 1980, p. 66; Malone and Lepper 1987; Koster 2013";
    linkCitations(el, bib);
    const links = [...el.querySelectorAll("a")];
    expect(links.map((a) => a.textContent)).toEqual(["Malone 1980", "Malone and Lepper 1987"]);
    expect(links[0].getAttribute("href")).toBe("https://example.com/malone.pdf");
    expect(links[0].getAttribute("target")).toBe("_blank");
    expect(links[0].getAttribute("rel")).toBe("noopener");
    expect(el.textContent).toBe("Malone 1980, p. 66; Malone and Lepper 1987; Koster 2013");
  });
});
