import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { parseNote } from "./parse-note.ts";
import { validateContent } from "./validate.ts";

export function contentCheck(root: string = process.cwd()): Plugin {
  return {
    name: "content-check",
    buildStart() {
      const read = (file: string) => readFileSync(join(root, file), "utf8");
      let errors: string[];
      try {
        errors = validateContent({
          motivators: parseNote(read("content/player-motivations.md")),
          gamesFile: JSON.parse(read("content/games.json")),
          proposals: JSON.parse(read("content/proposals.json")),
          videos: JSON.parse(read("content/videos.json")),
        });
      } catch (err) {
        errors = [(err as Error).message];
      }
      if (errors.length) this.error(`Content check failed:\n- ${errors.join("\n- ")}`);
    },
  };
}
