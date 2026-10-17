export const ROUND_MS = 60_000;
export const BASE_GAP_MS = 1_200;
export const MIN_GAP_MS = 400;
export const HITS_PER_SPEED_STEP = 4;
export const SPEED_STEP_MS = 100;

export type PulseStatus = "ready" | "playing" | "finished";

export interface PulseState {
  escalation: boolean;
  hits: number;
  misses: number;
  earlyPresses: number;
  status: PulseStatus;
}

export function newGame(escalation: boolean): PulseState {
  return { escalation, hits: 0, misses: 0, earlyPresses: 0, status: "ready" };
}

export function startGame(state: PulseState): PulseState {
  if (state.status !== "ready") return state;
  return { ...state, status: "playing" };
}

/** The quiet gap before the next pulse. Escalation shortens it every four hits. */
export function pulseGapMs(hits: number, escalation: boolean): number {
  if (!escalation) return BASE_GAP_MS;
  const speedSteps = Math.floor(Math.max(0, hits) / HITS_PER_SPEED_STEP);
  return Math.max(MIN_GAP_MS, BASE_GAP_MS - speedSteps * SPEED_STEP_MS);
}

export function registerHit(state: PulseState): PulseState {
  if (state.status !== "playing") return state;
  return { ...state, hits: state.hits + 1 };
}

export function registerMiss(state: PulseState): PulseState {
  if (state.status !== "playing") return state;
  return { ...state, misses: state.misses + 1 };
}

export function registerEarlyPress(state: PulseState): PulseState {
  if (state.status !== "playing") return state;
  return { ...state, earlyPresses: state.earlyPresses + 1 };
}

export function finishGame(state: PulseState): PulseState {
  if (state.status !== "playing") return state;
  return { ...state, status: "finished" };
}
