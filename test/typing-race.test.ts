// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { bestTimes, correctPrefix, normalizeUni, parseBoard, PASSAGE, positions } from "../src/minigames/typing-race/game";
import { typingRace } from "../src/minigames/typing-race";
import worker, { RaceBoard } from "../src/minigames/typing-race/hosting/worker";
import { leaderboard } from "../src/minigames/typing-race/leaderboard";

afterEach(() => { vi.useRealTimers(); localStorage.clear(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Type Circuit", () => {
  it("uses the shared class leaderboard without environment configuration", async () => {
    vi.stubEnv("VITE_TYPING_RACE_URL", undefined);
    const fetchBoard = vi.fn().mockResolvedValue(Response.json([]));
    vi.stubGlobal("fetch", fetchBoard);
    const board = leaderboard(new AbortController().signal);
    expect(board.shared).toBe(true);
    expect(await board.read()).toEqual([]);
    expect(fetchBoard.mock.calls[0][0]).toBe("https://motivation-atlas-typing-race.motivation-atlas-typeracer.workers.dev/board");
  });
  it("normalizes UNIs and keeps one best time with deterministic ties and a 50-person cap", () => {
    expect(normalizeUni(" AB123 ")).toBe("ab123");
    expect(() => normalizeUni("<script>")).toThrow();
    let board = bestTimes([], { uni: "ab123", ms: 10000 });
    board = bestTimes(board, { uni: "AB123", ms: 12000 });
    expect(board).toEqual([{ uni: "ab123", ms: 10000 }]);
    board = bestTimes(board, { uni: "ab123", ms: 9000 });
    for (let i = 0; i < 60; i++) board = bestTimes(board, { uni: `cd${i}`, ms: 10000 + i });
    expect(board).toHaveLength(50); expect(board[0].ms).toBe(9000);
    expect(() => bestTimes(board, { uni: "ab123", ms: NaN })).toThrow();
    expect(() => parseBoard([{ uni: "ab123", ms: -1 }])).toThrow();
  });
  it("moves only with a correct prefix and ranks completed ghosts by their actual times", () => {
    expect(correctPrefix(PASSAGE.slice(0, 10) + "!" + PASSAGE.slice(11))).toBe(10);
    const board = [{ uni: "ab123", ms: 10000 }, { uni: "cd234", ms: 20000 }];
    expect(positions(board, "ef345", 15000, PASSAGE)[0].uni).toBe("ab123");
    expect(positions(board, "ef345", 15000, PASSAGE)[1].uni).toBe("ef345");
    expect(positions(board, "ab123", 1000, "").filter(r => r.uni === "ab123")).toHaveLength(1);
  });
  it("practice has no opponents, score, identity, or saved result", async () => {
    vi.stubEnv("VITE_TYPING_RACE_URL", "");
    const el = document.createElement("div"); const unmount = typingRace.mount(el);
    await Promise.resolve();
    const toggle = el.querySelector<HTMLInputElement>("[data-mechanic]")!;
    toggle.checked = false; toggle.dispatchEvent(new Event("change"));
    expect(el.querySelector<HTMLElement>(".tr-results")!.hidden).toBe(true);
    expect(el.querySelector<HTMLElement>(".tr-metrics")!.hidden).toBe(true);
    expect(el.querySelector<HTMLElement>(".tr-cars")!.hidden).toBe(true);
    const input = el.querySelector("textarea")!;
    input.value = PASSAGE; input.dispatchEvent(new Event("input"));
    expect(el.querySelector('[role="status"]')!.textContent).toContain("Passage complete");
    expect(localStorage.length).toBe(0);
    unmount(); expect(el.childNodes.length).toBe(0);
  });
  it("starts on the first character, excludes idle time, and uses the button only to reset", async () => {
    vi.stubEnv("VITE_TYPING_RACE_URL", ""); vi.useFakeTimers();
    const el = document.createElement("div"); const unmount = typingRace.mount(el);
    await Promise.resolve(); await Promise.resolve();
    el.querySelector<HTMLInputElement>('input[type="text"]')!.value = "ab123";
    const input = el.querySelector("textarea")!;
    expect(input.disabled).toBe(false);
    await vi.advanceTimersByTimeAsync(30000);
    expect(vi.getTimerCount()).toBe(0);
    input.value = PASSAGE[0]; input.dispatchEvent(new Event("input"));
    expect(input.value).toBe(PASSAGE[0]);
    expect(el.querySelector(".tr-metrics")!.textContent).toContain("0.0 s");
    await vi.advanceTimersByTimeAsync(20000);
    input.value = PASSAGE; input.dispatchEvent(new Event("input"));
    await vi.advanceTimersByTimeAsync(0);
    expect(JSON.parse(localStorage.getItem("atlas-typing-race-v1")!)).toEqual([{ uni: "ab123", ms: 20000 }]);
    el.querySelector<HTMLButtonElement>("button")!.click();
    expect(el.querySelector<HTMLButtonElement>("button")!.textContent).toBe("Reset");
    expect(input.value).toBe(""); expect(input.disabled).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(vi.getTimerCount()).toBe(0);
    input.value = "T"; input.dispatchEvent(new Event("input"));
    expect(vi.getTimerCount()).toBe(1);
    unmount(); expect(vi.getTimerCount()).toBe(0);
  });
});

describe("shared JSON leaderboard", () => {
  it("allows loopback origins on any port, echoes them for CORS, and rejects lookalike hosts", async () => {
    const env = {
      ALLOWED_ORIGINS: "https://atlas.example",
      LEADERBOARD: { idFromName: () => "class-race", get: () => ({ fetch: async () => Response.json([]) }) },
    };
    for (const origin of ["http://localhost:5174", "http://localhost:3000", "https://localhost:8080", "http://127.0.0.1:9000", "http://[::1]:5175", "https://atlas.example"]) {
      for (const method of ["OPTIONS", "GET"]) {
        const response = await worker.fetch(new Request("https://race.example/board", { method, headers: { Origin: origin } }), env);
        expect(response.status).toBe(method === "OPTIONS" ? 204 : 200);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
      }
    }
    for (const origin of ["http://localhost.evil.example:5173", "http://localhost@evil.example:5173", "https://elsewhere.example", "null"]) {
      const response = await worker.fetch(new Request("https://race.example/board", { headers: { Origin: origin } }), env);
      expect(response.status).toBe(403);
      expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
    }
  });
  it("uses server elapsed time, rejects repeat tickets, and preserves faster results", async () => {
    vi.useFakeTimers();
    const data = new Map<string, unknown>();
    const storage = { async get<T>(key: string) { return structuredClone(data.get(key)) as T | undefined; }, async put(key: string, value: unknown) { data.set(key, structuredClone(value)); } };
    const service = new RaceBoard({ storage: { ...storage, transaction: async callback => callback(storage) } });
    const send = (path: string, body: unknown) => service.fetch(new Request(`https://race.example${path}`, { method: "POST", body: JSON.stringify(body) }));
    const ticket = await (await send("/start", { uni: "ab123", passage: "atlas-race-1" })).json();
    await vi.advanceTimersByTimeAsync(12000);
    const result = await (await send("/finish", { id: ticket.id, text: PASSAGE })).json();
    expect(result.ms).toBe(12000); expect(result.entries).toEqual([{ uni: "ab123", ms: 12000 }]);
    expect((await send("/finish", { id: ticket.id, text: PASSAGE })).status).toBe(400);
    const next = await (await send("/start", { uni: "ab123", passage: "atlas-race-1" })).json();
    await vi.advanceTimersByTimeAsync(15000);
    const slower = await (await send("/finish", { id: next.id, text: PASSAGE })).json();
    expect(slower.entries).toEqual(result.entries);
    const incomplete = await (await send("/start", { uni: "cd234", passage: "atlas-race-1" })).json();
    expect((await send("/finish", { id: incomplete.id, text: "wrong passage" })).status).toBe(400);
  });
});
