export interface BibEntry {
  /** How the note cites it, such as "Salen and Zimmerman 2003" or "Ryan et al. 2006". */
  key: string;
  title: string;
  /** Where a student can read it: a free copy, the publisher, or a Columbia Libraries search. Empty if none. */
  url: string;
  kind: "free" | "publisher" | "library" | "none";
}

const YEAR = String.raw`(?:19|20)\d{2}[a-z]?|n\.d\.`;
const CITATION = new RegExp(
  String.raw`Quantic Foundry reference sheet|[A-Z][\p{L}'-]+(?: and [A-Z][\p{L}'-]+| et al\.)? (?:${YEAR})(?![\p{L}\d])`,
  "gu",
);

/** Every author-year citation in a piece of text, in order. */
export function citationKeysIn(text: string): string[] {
  return [...text.matchAll(CITATION)].map((m) => m[0]);
}

function authorKey(authors: string, year: string): string {
  if (!authors.includes(",")) return `${authors} ${year}`; // an organization
  const parts = authors.split(",");
  const surname = parts[0].trim();
  const others = parts.slice(2).join(",").split(/,|\band\b|\bwith\b/).map((s) => s.trim()).filter(Boolean);
  if (others.length === 0) return `${surname} ${year}`;
  if (others.length === 1) return `${surname} and ${others[0].split(/\s+/).pop()} ${year}`;
  return `${surname} et al. ${year}`;
}

function pickUrl(entry: string): { url: string; kind: BibEntry["kind"] } {
  const urls = [...entry.matchAll(/<(https?:\/\/[^>]+)>/g)];
  const free = urls.find((m) => /(free copy:|free at|accepted manuscript:)\s*$/i.test(entry.slice(Math.max(0, m.index! - 40), m.index)));
  if (free) return { url: free[1], kind: "free" };
  const nonDoi = urls.find((m) => !m[1].includes("doi.org"));
  if (nonDoi) return { url: nonDoi[1], kind: "free" };
  if (urls.length) return { url: urls[0][1], kind: "publisher" };
  const isbn = /ISBN (\d{13}|\d{9}[\dX])/.exec(entry);
  if (isbn) return { url: `https://clio.columbia.edu/catalog?q=${isbn[1]}`, kind: "library" };
  return { url: "", kind: "none" };
}

/** Read the note's bibliography into entries keyed the way the note cites them. */
export function parseBibliography(markdown: string): BibEntry[] {
  const text = markdown.replace(/\r\n?/g, "\n");
  const start = text.indexOf("\n## Bibliography");
  if (start === -1) return [];
  const entries: BibEntry[] = [];
  const seen = new Set<string>();
  for (const block of text.slice(start).split(/\n\s*\n/)) {
    const paragraph = block.replace(/\s*\n\s*/g, " ").trim();
    // "Author. 2004a. Title" or "Author. n.d. Title" (n.d. carries its own period).
    const m = /^([^*#][^]*?)\. ((?:19|20)\d{2}[a-z]?\.|n\.d\.) (.*)$/.exec(paragraph);
    if (!m) continue;
    const [, authors, dated, rest] = m;
    const year = dated === "n.d." ? dated : dated.slice(0, -1);
    const title = rest.split(/\.\s/)[0].replace(/[*"]/g, "");
    const { url, kind } = pickUrl(rest);
    const keys = [authorKey(authors, year)];
    const alias = /Cited in this note as the ([^.]+)\./.exec(rest);
    if (alias) keys.push(alias[1]);
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ key, title, url, kind });
    }
  }
  return entries;
}
