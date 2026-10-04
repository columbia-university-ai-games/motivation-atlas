export interface NoteItem { text: string; caution: boolean }
export interface Motivator {
  slug: string; shortName: string; name: string; gloss: string;
  namedBy: string; aesthetic: string; dynamics: NoteItem[]; mechanics: NoteItem[]; exampleLine: string;
}
export type GameKind = "video game" | "tabletop" | "activity";
export interface Game { slug: string; title: string; kind: GameKind }
export interface Tie { game: string; motivator: string; asNamed: string; cite: string }
export interface Proposal { game: string; motivator: string; mechanic: string; dynamic: string; github: string }
export interface Video { game: string; youtubeId: string; title: string; channel: string; start?: number; watchFor?: string }
export interface GamesFile { games: Game[]; ties: Tie[] }
export type Link =
  | { kind: "sourced"; motivator: string; asNamed: string; cite: string }
  | { kind: "proposed"; motivator: string; mechanic: string; dynamic: string; github: string };
export interface AtlasGame extends Game { links: Link[]; videos: Video[] }
import type { BibEntry } from "./bibliography";
export interface Atlas { motivators: Motivator[]; games: AtlasGame[]; bibliography?: BibEntry[] }
