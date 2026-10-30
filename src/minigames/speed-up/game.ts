export interface SpeedUpOptions { escalation: boolean }
export interface SpeedUpState {
  options: SpeedUpOptions;
  endsAt: number;
  /** The lit cell, 0 to CELLS - 1. */
  target: number;
  /** When the lit cell goes dark and costs a life. */
  deadline: number;
  hits: number;
  lives: number;
  over: "time" | "lives" | null;
}

export const CELLS = 9;
export const ROUND_MS = 60_000;
export const LIVES = 3;
/** How long a target stays lit at the start, and always when escalation is off. */
export const START_WINDOW_MS = 1200;
export const MIN_WINDOW_MS = 400;
/** Each hit multiplies the window by this when escalation is on. */
export const SPEEDUP = 0.98;

/** How long the next target stays lit after `hits` hits. This is the mechanic the toggle changes. */
export function windowFor(hits: number, options: SpeedUpOptions): number {
  if (!options.escalation) return START_WINDOW_MS;
  return Math.max(MIN_WINDOW_MS, Math.round(START_WINDOW_MS * SPEEDUP ** hits));
}

/** A cell other than `current`, so the target always moves. */
export function nextTarget(current: number, random: () => number = Math.random): number {
  return (current + 1 + Math.floor(random() * (CELLS - 1))) % CELLS;
}

export function start(options: SpeedUpOptions, now: number, random: () => number = Math.random): SpeedUpState {
  return {
    options, endsAt: now + ROUND_MS,
    target: Math.floor(random() * CELLS), deadline: now + windowFor(0, options),
    hits: 0, lives: LIVES, over: null,
  };
}

function loseLife(s: SpeedUpState, now: number, random: () => number): SpeedUpState {
  const lives = s.lives - 1;
  if (lives <= 0) return { ...s, lives: 0, over: "lives" };
  return { ...s, lives, target: nextTarget(s.target, random), deadline: now + windowFor(s.hits, s.options) };
}

/** The player taps `cell`. The lit cell scores and moves; any other cell costs a life. */
export function tap(s: SpeedUpState, cell: number, now: number, random: () => number = Math.random): SpeedUpState {
  const t = tick(s, now, random);
  // A late tap on a target that just went dark costs only the life the tick took.
  if (t !== s) return t;
  if (cell !== t.target) return loseLife(t, now, random);
  const hits = t.hits + 1;
  return { ...t, hits, target: nextTarget(t.target, random), deadline: now + windowFor(hits, t.options) };
}

/** Advance the clock: end the round at time, or cost a life if the target went dark. */
export function tick(s: SpeedUpState, now: number, random: () => number = Math.random): SpeedUpState {
  if (s.over) return s;
  if (now >= s.endsAt) return { ...s, over: "time" };
  if (now >= s.deadline) return loseLife(s, now, random);
  return s;
}
