import { bestTime, entriesFor, validTime } from "./game";

// A new key deliberately does not reuse or display old UNI-based records.
const KEY = "atlas-typing-race-personal-best-v2";
export function leaderboard() {
  let best: number | undefined;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (validTime(saved)) best = saved;
  } catch { /* Storage is optional; target cars and races still work. */ }
  return {
    read: () => entriesFor(best),
    finish(ms: number) {
      best = bestTime(best, ms);
      let saved = true;
      try { localStorage.setItem(KEY, JSON.stringify(best)); }
      catch { saved = false; }
      return { entries: entriesFor(best), best, saved };
    },
  };
}
