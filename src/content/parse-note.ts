import type { Motivator } from "./types.ts";

const SECTION = "## The eleven motivators";

export function parseNote(markdown: string): Motivator[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const start = lines.findIndex((line) => line.trim() === SECTION);
  if (start === -1) throw new Error(`parseNote: heading "${SECTION}" not found`);

  const motivators: Motivator[] = [];
  let current: Motivator | null = null;
  let list: "dynamics" | "mechanics" | null = null;
  let seenBullet = false;

  for (const line of lines.slice(start + 1)) {
    if (/^## /.test(line)) break;

    const heading = /^### (.+)$/.exec(line);
    if (heading) {
      const name = heading[1].trim();
      const shortName = name.split(/[ ,]/)[0];
      current = {
        slug: shortName.toLowerCase(), shortName, name, gloss: "", namedBy: "", aesthetic: "",
        dynamics: [], mechanics: [], exampleLine: "",
      };
      motivators.push(current);
      list = null;
      seenBullet = false;
      continue;
    }
    if (!current) continue;

    const top = /^- \*\*([^*]+):\*\*\s*(.*)$/.exec(line);
    if (top) {
      const [, label, rest] = top;
      seenBullet = true;
      list = null;
      if (label === "Named by") current.namedBy = rest.trim();
      else if (label === "Aesthetic") current.aesthetic = rest.trim();
      else if (label === "Dynamics") list = "dynamics";
      else if (label === "Mechanics") list = "mechanics";
      else if (label === "Example games") current.exampleLine = rest.trim();
      else throw new Error(`parseNote: unknown label "${label}" under ${current.name}`);
      continue;
    }

    const nested = /^\s{2,}- (.+)$/.exec(line);
    if (nested && list) {
      const text = nested[1].trim();
      current[list].push({ text, caution: /^A caution:/.test(text) });
      continue;
    }

    const continuation = /^\s+(\S.*)$/.exec(line);
    if (continuation && list && current[list].length > 0) {
      const last = current[list][current[list].length - 1];
      last.text = `${last.text} ${continuation[1].trim()}`;
      continue;
    }

    if (!seenBullet && line.trim()) {
      current.gloss = current.gloss ? `${current.gloss} ${line.trim()}` : line.trim();
    }
  }
  return motivators;
}
