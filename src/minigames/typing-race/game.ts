export const PASSAGE_ID = "atlas-race-1";
export const PASSAGE = "The little car waited by the starting line. A breeze moved through the trees as the road curved toward the river. There was room to find a rhythm, make a mistake, and begin again. Then the lights changed, and every driver chose their own pace.";
export const MAX_PLAYERS = 50;
export const MAX_MS = 600_000;
export interface Entry { uni: string; ms: number }
export function normalizeUni(value: string): string {
  const uni = value.trim().toLowerCase();
  if (!/^[a-z]{2,4}[0-9]{1,5}$/.test(uni)) throw new Error("Enter a UNI with 2–4 letters followed by 1–5 digits.");
  return uni;
}
export function bestTimes(entries: Entry[], entry: Entry): Entry[] {
  const uni = normalizeUni(entry.uni);
  if (!Number.isFinite(entry.ms) || entry.ms < 3000 || entry.ms > MAX_MS) throw new Error("Race time must be between 3 seconds and 10 minutes.");
  const best = new Map<string, number>();
  for (const item of [...entries, { uni, ms: Math.round(entry.ms) }]) {
    const key = normalizeUni(item.uni);
    best.set(key, Math.min(best.get(key) ?? Infinity, item.ms));
  }
  return [...best].map(([uni, ms]) => ({ uni, ms })).sort((a, b) => a.ms - b.ms || a.uni.localeCompare(b.uni)).slice(0, MAX_PLAYERS);
}
export function parseBoard(value: unknown): Entry[] {
  if (!Array.isArray(value) || value.length > MAX_PLAYERS) throw new Error("Invalid leaderboard");
  let entries: Entry[] = [];
  for (const item of value) {
    if (!item || typeof item.uni !== "string" || typeof item.ms !== "number") throw new Error("Invalid leaderboard");
    entries = bestTimes(entries, item);
  }
  return entries;
}
export function correctPrefix(text: string): number {
  let i = 0;
  while (i < text.length && text[i] === PASSAGE[i]) i++;
  return i;
}
export interface Racer { uni: string; progress: number; finish: number; you: boolean }
export function positions(entries: Entry[], uni: string, elapsed: number, typed: string): Racer[] {
  return [
    ...entries.filter(e => e.uni !== uni).map(e => ({ uni: e.uni, progress: Math.min(1, elapsed / e.ms), finish: e.ms, you: false })),
    { uni, progress: correctPrefix(typed) / PASSAGE.length, finish: typed === PASSAGE ? elapsed : Infinity, you: true },
  ].sort((a, b) => b.progress - a.progress || a.finish - b.finish || Number(b.you) - Number(a.you) || a.uni.localeCompare(b.uni));
}
