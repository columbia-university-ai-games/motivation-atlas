import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { loadContent } from "./load.ts";

export function contentCheck(root: string = process.cwd()): Plugin {
  return {
    name: "content-check",
    buildStart() {
      const read = (file: string) => readFileSync(join(root, file), "utf8");
      const { errors } = loadContent({
        note: read("content/player-motivations.md"),
        gamesJson: read("content/games.json"),
        proposalsJson: read("content/proposals.json"),
        videosCsv: read("content/videos.csv"),
        sourcesCsv: read("content/sources.csv"),
      });
      if (errors.length) this.error(`Content check failed:\n- ${errors.join("\n- ")}`);
    },
  };
}
