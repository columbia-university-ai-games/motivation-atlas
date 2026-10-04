import gamesJson from "../../content/games.json?raw";
import note from "../../content/player-motivations.md?raw";
import proposalsJson from "../../content/proposals.json?raw";
import sourcesCsv from "../../content/sources.csv?raw";
import videosCsv from "../../content/videos.csv?raw";
import { buildAtlas } from "./build-atlas";
import { loadContent } from "./load";
import type { Atlas } from "./types";

export const noteText: string = note;

export class ContentError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(`Content check failed:\n- ${errors.join("\n- ")}`);
    this.errors = errors;
  }
}

let cached: Atlas | null = null;

export function loadAtlas(): Atlas {
  if (cached) return cached;
  const { input, bibliography, errors } = loadContent({ note, gamesJson, proposalsJson, videosCsv, sourcesCsv });
  if (errors.length) throw new ContentError(errors);
  cached = { ...buildAtlas(input), bibliography };
  return cached;
}
