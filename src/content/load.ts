import { applySourceLinks, parseBibliography, type BibEntry } from "./bibliography.ts";
import { readSources, readVideos } from "./csv.ts";
import { parseNote } from "./parse-note.ts";
import type { GamesFile, Proposal } from "./types.ts";
import { validateContent, type ContentInput } from "./validate.ts";

/** The raw text of every content file, as read from disk or bundled by Vite. */
export interface ContentFiles {
  note: string;
  gamesJson: string;
  proposalsJson: string;
  videosCsv: string;
  sourcesCsv: string;
}

function json<T>(file: string, text: string, errors: string[], fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    errors.push(`${file}: ${(err as Error).message}`);
    return fallback;
  }
}

/** Read and check all content. Every problem is returned as a message naming the file, entry and fix. */
export function loadContent(files: ContentFiles): { input: ContentInput; bibliography: BibEntry[]; errors: string[] } {
  const errors: string[] = [];
  let motivators: ContentInput["motivators"] = [];
  try {
    motivators = parseNote(files.note);
  } catch (err) {
    errors.push((err as Error).message);
  }
  const gamesFile = json<GamesFile>("content/games.json", files.gamesJson, errors, { games: [], ties: [] });
  const proposals = json<Proposal[]>("content/proposals.json", files.proposalsJson, errors, []);
  const videos = readVideos(files.videosCsv);
  const sources = readSources(files.sourcesCsv);
  const linked = applySourceLinks(parseBibliography(files.note), sources.sources);
  const input: ContentInput = { motivators, gamesFile, proposals, videos: videos.videos };
  errors.push(...videos.errors, ...sources.errors, ...linked.errors);
  if (!errors.length) errors.push(...validateContent(input));
  return { input, bibliography: linked.bibliography, errors };
}
