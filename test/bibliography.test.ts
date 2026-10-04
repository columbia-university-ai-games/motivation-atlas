import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applySourceLinks, citationKeysIn, parseBibliography } from "../src/content/bibliography";
import { parseNote } from "../src/content/parse-note";

const note = readFileSync("content/player-motivations.md", "utf8");
const bib = parseBibliography(note);
const byKey = new Map(bib.map((e) => [e.key, e]));

describe("parseBibliography", () => {
  it("builds author-year keys the way the note cites them", () => {
    for (const key of [
      "Caillois 1961", "Salen and Zimmerman 2003", "Hunicke et al. 2004", "Malone and Lepper 1987",
      "Ryan et al. 2006", "Przybylski et al. 2010", "Lazzaro 2004a", "Lazzaro 2004b", "Lazzaro n.d.",
      "Marczewski n.d.", "Yee 2006", "Yee 2015", "Schell 2019", "Henricks 2010",
    ]) expect(byKey.has(key), key).toBe(true);
  });

  it("links a paper to its free copy and a book to a library search by ISBN", () => {
    expect(byKey.get("Ryan et al. 2006")!.url).toBe("https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf");
    expect(byKey.get("Yee 2006")!.url).toBe("https://nickyee.com/pubs/Yee%20-%20Motivations%20%282007%29.pdf");
    expect(byKey.get("Hunicke et al. 2004")!.url).toBe("https://cdn.aaai.org/Workshops/2004/WS-04-04/WS04-04-001.pdf");
    expect(byKey.get("Schell 2019")!.url).toBe("https://clio.columbia.edu/catalog?q=9781138632059");
    expect(byKey.get("Schell 2019")!.kind).toBe("library");
  });

  it("knows the reference sheet by the name the note uses for it", () => {
    expect(byKey.get("Quantic Foundry reference sheet")!.url).toBe(
      "https://quanticfoundry.com/wp-content/uploads/2019/04/Gamer-Motivation-Model-Reference.pdf");
  });

  it("resolves every citation on every motivator page", () => {
    const missing: string[] = [];
    for (const m of parseNote(note)) {
      const texts = [m.namedBy, m.aesthetic, m.exampleLine, ...m.dynamics.map((i) => i.text), ...m.mechanics.map((i) => i.text)];
      for (const key of texts.flatMap(citationKeysIn)) if (!byKey.get(key)?.url) missing.push(`${m.slug}: ${key}`);
    }
    expect(missing).toEqual([]);
  });
});

describe("citationKeysIn", () => {
  it("finds author-year citations and ignores game titles with numbers", () => {
    expect(citationKeysIn("Halo 3 and Super Mario 64 (Ryan et al. 2006; Lazzaro 2004a, p. 3)")).toEqual(["Ryan et al. 2006", "Lazzaro 2004a"]);
    expect(citationKeysIn("Caillois, as summarized in Salen and Zimmerman 2003, ch. 22")).toEqual(["Salen and Zimmerman 2003"]);
  });
});

describe("applySourceLinks", () => {
  it("replaces a citation's link and keeps the rest", () => {
    const { bibliography, errors } = applySourceLinks(bib, [{ key: "Schell 2019", url: "https://example.com/schell", note: "" }]);
    expect(errors).toEqual([]);
    const schell = bibliography.find((e) => e.key === "Schell 2019")!;
    expect(schell.url).toBe("https://example.com/schell");
    expect(schell.kind).toBe("team");
    expect(bibliography.find((e) => e.key === "Yee 2006")!.url).toBe(byKey.get("Yee 2006")!.url);
  });

  it("rejects a key the note never cites and a link that is not a web address", () => {
    const { errors } = applySourceLinks(bib, [
      { key: "Schell 2020", url: "https://example.com", note: "" },
      { key: "Koster 2013", url: "file:///book.pdf", note: "" },
    ]);
    expect(errors).toEqual([
      'content/sources.csv row 2: no bibliography entry is cited as "Schell 2020"',
      'content/sources.csv row 3 (Koster 2013): the url must start with https://',
    ]);
  });
});
