import { bestTimes, MAX_MS, normalizeUni, PASSAGE, PASSAGE_ID, type Entry } from "../game";

interface Stored { entries: Entry[]; tickets: Record<string, { uni: string; started: number }> }
interface Transaction { get<T>(key: string): Promise<T | undefined>; put(key: string, value: unknown): Promise<void> }
interface Storage extends Transaction { transaction<T>(callback: (txn: Transaction) => Promise<T>): Promise<T> }
interface Environment {
  ALLOWED_ORIGINS: string;
  LEADERBOARD: { idFromName(name: string): unknown; get(id: unknown): { fetch(request: Request): Promise<Response> } };
}

// A single object owns one small JSON value. Transactions prevent simultaneous
// finishes from overwriting each other's scores. No table or SQL setup needed.
export class RaceBoard {
  constructor(private ctx: { storage: Storage }) {}
  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/board" && request.method === "GET") {
      return Response.json((await this.ctx.storage.get<Stored>(PASSAGE_ID))?.entries ?? []);
    }
    if (request.method !== "POST" || !["/start", "/finish"].includes(path)) return Response.json({ error: "Not found" }, { status: 404 });
    let body: Record<string, unknown>;
    try {
      const text = await request.text();
      if (text.length > 1500) throw new Error();
      body = JSON.parse(text);
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
    try {
      const result = await this.ctx.storage.transaction(async tx => {
        const state = await tx.get<Stored>(PASSAGE_ID) ?? { entries: [], tickets: {} };
        const now = Date.now();
        for (const [id, ticket] of Object.entries(state.tickets)) if (now - ticket.started > MAX_MS) delete state.tickets[id];
        if (path === "/start") {
          if (body.passage !== PASSAGE_ID || typeof body.uni !== "string") throw new Error("Invalid race");
          const uni = normalizeUni(body.uni);
          if (Object.keys(state.tickets).length >= 100) throw new Error("Too many active races. Try again later.");
          const id = crypto.randomUUID();
          state.tickets[id] = { uni, started: now };
          await tx.put(PASSAGE_ID, state);
          return { id, started: now };
        }
        if (typeof body.id !== "string" || !Object.hasOwn(state.tickets, body.id) || body.text !== PASSAGE) throw new Error("Race expired or passage incomplete. Start again.");
        const ticket = state.tickets[body.id];
        const ms = now - ticket.started;
        state.entries = bestTimes(state.entries, { uni: ticket.uni, ms });
        delete state.tickets[body.id];
        await tx.put(PASSAGE_ID, state);
        return { entries: state.entries, ms };
      });
      return Response.json(result);
    } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not save race" }, { status: 400 }); }
  }
}

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = env.ALLOWED_ORIGINS.split(",").map(s => s.trim());
    let loopback = false;
    try {
      const url = new URL(origin);
      loopback = url.origin === origin && ["http:", "https:"].includes(url.protocol)
        && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    } catch { /* Invalid or opaque origins do not qualify as localhost. */ }
    if (origin && !loopback && !allowed.includes(origin)) return Response.json({ error: "Origin not allowed" }, { status: 403 });
    const headers = new Headers({
      "Access-Control-Allow-Origin": origin || allowed[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin", "Cache-Control": "no-store",
    });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const response = await env.LEADERBOARD.get(env.LEADERBOARD.idFromName("class-race")).fetch(request);
    response.headers.forEach((value, key) => headers.set(key, value));
    return new Response(response.body, { status: response.status, headers });
  },
};
