import gamesFile from "../../content/games.json";
import proposals from "../../content/proposals.json";
import videos from "../../content/videos.json";
import note from "../../content/player-motivations.md?raw";
import { buildAtlas } from "./build-atlas";
import { parseNote } from "./parse-note";
import type { Atlas, GamesFile, Proposal, Video } from "./types";
import { validateContent, type ContentInput } from "./validate";

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
  let input: ContentInput;
  try {
    input = {
      motivators: parseNote(note),
      gamesFile: gamesFile as GamesFile,
      proposals: proposals as unknown as Proposal[],
      videos: videos as unknown as Video[],
    };
  } catch (err) {
    throw new ContentError([(err as Error).message]);
  }
  const errors = validateContent(input);
  if (errors.length) throw new ContentError(errors);
  cached = buildAtlas(input);
  return cached;
}
