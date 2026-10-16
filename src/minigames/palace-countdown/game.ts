export type Action = "jump" | "climb" | "run";
export const LIMIT_MS = 3_000;
export const PENALTY_MS = 5_000;
export type Obstacle = "gap" | "ledge" | "gate";
export const actionForObstacle: Record<Obstacle, Action> = {
  gap: "jump", ledge: "climb", gate: "run",
};
export const rooms: readonly { title: string; obstacle: string; kind: Obstacle }[] = [
  { title: "Split courtyard", obstacle: "A narrow gap splits the floor. The far edge is level with your feet.", kind: "gap" },
  { title: "Walled garden", obstacle: "A high ledge blocks the path. Handholds lead up to its top.", kind: "ledge" },
  { title: "Falling portcullis", obstacle: "A closing gate is descending! The clear, level passage beneath it is still open.", kind: "gate" },
  { title: "Broken aqueduct", obstacle: "A short pit opens over the water. Its far edge is within jumping distance.", kind: "gap" },
  { title: "Moon tower", obstacle: "The exit is on a high ledge above you. A ladder reaches it.", kind: "ledge" },
  { title: "Dawn passage", obstacle: "A closing gate guards the exit. A clear, level corridor leads beneath it and outside.", kind: "gate" },
];
export interface Room {
  title: string;
  obstacle: string;
  kind: Obstacle;
  actions: Action[];
}
/** A reproducible 32-bit PRNG; the same seed gives the same route and buttons. */
export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
function makeRoute(seed: number): Room[] {
  const random = seededRandom(seed);
  return Array.from({ length: 10 }, () => {
    const room = rooms[Math.floor(random() * rooms.length)];
    const actions: Action[] = ["jump", "climb", "run"];
    for (let i = actions.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [actions[i], actions[j]] = [actions[j], actions[i]];
    }
    return { ...room, actions };
  });
}
export interface State {
  room: number;
  route: Room[];
  timed: boolean;
  remainingMs: number;
  status: "playing" | "escaped" | "failed";
  mistakes: number;
}
export function newGame(timed: boolean, seed: number = 0): State {
  return { room: 0, route: makeRoute(seed), timed, remainingMs: LIMIT_MS, status: "playing", mistakes: 0 };
}
export function elapse(state: State, ms: number): State {
  if (!state.timed || state.status !== "playing") return state;
  const remainingMs = Math.max(0, state.remainingMs - Math.max(0, ms));
  return { ...state, remainingMs, status: remainingMs === 0 ? "failed" : "playing" };
}
export function choose(state: State, action: Action): State {
  if (state.status !== "playing") return state;
  if (action !== actionForObstacle[state.route[state.room].kind]) {
    return elapse({ ...state, mistakes: state.mistakes + 1 }, PENALTY_MS);
  }
  const room = state.room + 1;
  return { ...state, room, remainingMs: state.timed && room < state.route.length ? LIMIT_MS : state.remainingMs, status: room === state.route.length ? "escaped" : "playing" };
}
