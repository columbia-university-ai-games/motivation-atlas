/** Every minigame's README, keyed by folder name. Vite bundles them at build time. */
const files = import.meta.glob<string>("./*/README.md", { query: "?raw", import: "default", eager: true });

/** Split a README into its "## " sections, keyed by heading. */
export function readmeSections(markdown: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let current: string | null = null;
  let lines: string[] = [];
  const close = () => { if (current) sections[current] = lines.join("\n").trim(); };
  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = /^## (.+)$/.exec(line);
    if (heading) {
      close();
      current = heading[1].trim();
      lines = [];
    } else if (current) {
      lines.push(line);
    }
  }
  close();
  return sections;
}

export function readmeFor(slug: string): Record<string, string> {
  const text = files[`./${slug}/README.md`];
  return text ? readmeSections(text) : {};
}
