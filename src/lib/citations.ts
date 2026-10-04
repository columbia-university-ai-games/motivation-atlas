import type { BibEntry } from "../content/bibliography";

/** Split a trailing citation off a note item: "Claim (Author 2004, p. 3)." becomes claim and cite. */
export function splitCitation(text: string): { claim: string; cite: string } {
  const m = /^([^]*?)\s*\(((?:[^()]|\([^()]*\))*)\)\.?$/.exec(text.trim());
  if (!m || !/(?:19|20)\d{2}|n\.d\.|reference sheet/.test(m[2])) return { claim: text, cite: "" };
  return { claim: `${m[1].replace(/[,;:]\s*$/, "")}.`, cite: m[2] };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Turn every citation key inside el's text into a link to its source. */
export function linkCitations(el: Element, bibliography: BibEntry[]): void {
  const linked = bibliography.filter((e) => e.url);
  if (!linked.length) return;
  const byKey = new Map(linked.map((e) => [e.key, e]));
  const pattern = new RegExp(
    `(${linked.map((e) => e.key).sort((a, b) => b.length - a.length).map(escape).join("|")})(?![\\p{L}\\d])`,
    "gu",
  );
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.parentElement?.closest("a")) nodes.push(node);
  }
  for (const node of nodes) {
    const text = node.data;
    pattern.lastIndex = 0;
    if (!pattern.test(text)) continue;
    pattern.lastIndex = 0;
    const frag = el.ownerDocument.createDocumentFragment();
    let last = 0;
    for (const m of text.matchAll(pattern)) {
      frag.append(text.slice(last, m.index));
      const entry = byKey.get(m[1])!;
      const a = el.ownerDocument.createElement("a");
      a.href = entry.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.className = `cite-link ${entry.kind}`;
      a.title = entry.kind === "library" ? `${entry.title} (Columbia Libraries; sign in with your UNI)` : entry.title;
      a.textContent = m[1];
      frag.append(a);
      last = m.index! + m[1].length;
    }
    frag.append(text.slice(last));
    node.replaceWith(frag);
  }
}
