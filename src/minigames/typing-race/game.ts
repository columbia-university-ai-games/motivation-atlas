export const PASSAGE = "The little car waited by the starting line. A breeze moved through the trees as the road curved toward the river. There was room to find a rhythm, make a mistake, and begin again. Then the lights changed, and every driver chose their own pace.";
export const MAX_MS = 600_000;
export interface Entry { name: string; ms: number }
// A word is five characters, including spaces and punctuation, for scoring.
export const timeAtWpm = (wpm: number): number => Math.round(PASSAGE.length / 5 / wpm * 60_000);
export const wpmAtTime = (ms: number): number => PASSAGE.length / 5 / (ms / 60_000);
export const TARGETS: readonly Entry[] = [
  { name: "50 WPM target", ms: timeAtWpm(50) },
  { name: "ZevMM", ms: timeAtWpm(80) },
  { name: "Prof. Garakani", ms: timeAtWpm(110) },
  { name: "Ivan", ms: timeAtWpm(140) },
];
export function validTime(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 3000 && value <= MAX_MS;
}
export function bestTime(previous: number | undefined, ms: number): number {
  if (!validTime(ms)) throw new Error("Race time must be between 3 seconds and 10 minutes.");
  return Math.min(previous ?? Infinity, Math.round(ms));
}
export function entriesFor(best?: number): Entry[] {
  return [...TARGETS.map(e => ({ ...e })), ...(best === undefined ? [] : [{ name: "Your best", ms: best }])]
    .sort((a, b) => a.ms - b.ms || a.name.localeCompare(b.name));
}
export function correctPrefix(text: string): number {
  let i = 0;
  while (i < text.length && text[i] === PASSAGE[i]) i++;
  return i;
}
export interface Racer extends Entry { progress: number; finish: number; you: boolean }
export function positions(entries: Entry[], elapsed: number, typed: string): Racer[] {
  return [
    ...entries.map(e => ({ ...e, progress: Math.min(1, elapsed / e.ms), finish: e.ms, you: false })),
    { name: "You", ms: elapsed, progress: correctPrefix(typed) / PASSAGE.length, finish: typed === PASSAGE ? elapsed : Infinity, you: true },
  ].sort((a, b) => b.progress - a.progress || a.finish - b.finish || Number(b.you) - Number(a.you) || a.name.localeCompare(b.name));
}
