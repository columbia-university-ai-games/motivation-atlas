import { bestTimes, normalizeUni, parseBoard, PASSAGE, PASSAGE_ID, type Entry } from "./game";

const KEY = "atlas-typing-race-v1";
const DEFAULT_ENDPOINT = "https://motivation-atlas-typing-race.motivation-atlas-typeracer.workers.dev";
export interface Ticket { id: string; started: number }
export function leaderboard(signal: AbortSignal) {
  const endpoint = ((import.meta.env.VITE_TYPING_RACE_URL as string | undefined) ?? DEFAULT_ENDPOINT).replace(/\/$/, "");
  async function request(path: string, body?: unknown): Promise<unknown> {
    const pending = new AbortController();
    const timeout = setTimeout(() => pending.abort(), 10_000);
    const cancel = () => { clearTimeout(timeout); pending.abort(); };
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    try {
      const response = await fetch(`${endpoint}${path}`, {
        signal: pending.signal,
        method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : {},
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Leaderboard unavailable");
      return result;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", cancel);
    }
  }
  function local(): Entry[] {
    return parseBoard(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  }
  return {
    shared: Boolean(endpoint),
    async read(): Promise<Entry[]> { return endpoint ? parseBoard(await request("/board")) : local(); },
    async start(uni: string): Promise<Ticket> {
      if (!endpoint) return { id: "local", started: Date.now() };
      const data = await request("/start", { uni: normalizeUni(uni), passage: PASSAGE_ID }) as Ticket;
      if (!data || typeof data.id !== "string" || !Number.isFinite(data.started)) throw new Error("Invalid race response");
      return data;
    },
    async finish(ticket: Ticket, uni: string): Promise<{ entries: Entry[]; ms: number }> {
      if (endpoint) {
        const data = await request("/finish", { id: ticket.id, text: PASSAGE }) as { entries: unknown; ms: number };
        if (!Number.isFinite(data.ms) || data.ms < 3000) throw new Error("Invalid race result");
        return { entries: parseBoard(data.entries), ms: data.ms };
      }
      const ms = Date.now() - ticket.started;
      const entries = bestTimes(local(), { uni, ms });
      localStorage.setItem(KEY, JSON.stringify(entries));
      return { entries, ms };
    },
  };
}
