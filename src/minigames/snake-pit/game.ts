import { hitsBody, hitsWall } from "./geometry";
import { BURROW } from "./burrow";
export { BURROW } from "./burrow";

export interface Cell { readonly x: number; readonly y: number }
export type Direction = "up" | "right" | "down" | "left";
export interface Maze {
  readonly rows: readonly string[];
  /** Head first. */
  readonly start: readonly Cell[];
  readonly direction: Direction;
  readonly eggs: readonly Cell[];
  readonly exit: Cell;
}
export interface SnakeState {
  readonly maze: Maze;
  readonly widthGrowth: boolean;
  readonly body: readonly Cell[];
  /** Width at each body cell; new size propagates from head to tail. */
  readonly widths: readonly number[];
  /** Segments still to add, one per move, after eating. */
  readonly growthPending: number;
  readonly direction: Direction;
  /** All uncollected nests in reveal order, including those waiting for clearance. */
  readonly eggs: readonly Cell[];
  readonly visibleEggs: readonly Cell[];
  readonly phase: "ready" | "playing" | "won" | "lost";
  readonly collision: "wall" | "clearance" | "body" | null;
  readonly steps: number;
}

/** One shared clock and length rule; only width growth changes between modes. */
export const MOVE_MS = 240;
export const SEGMENTS_PER_EGG = 18;
const BASE_WIDTH = 0.6;

export function widthFor(growth: boolean, eggsEaten: number): number {
  return growth ? Math.min(2.4, (6 + eggsEaten * 3) / 10) : BASE_WIDTH;
}

/** Either visible egg can be collected; the rest remain in a fixed reveal order. */
export function activeEggs(state: SnakeState): readonly Cell[] {
  return state.visibleEggs;
}
const VECTORS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 }, right: { x: 1, y: 0 },
  down: { x: 0, y: 1 }, left: { x: -1, y: 0 },
};

export const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;

function revealEggs(state: SnakeState): SnakeState {
  const visibleEggs = [...state.visibleEggs];
  // Reserve the wider mode's clearance in BOTH modes so reveal timing stays equal.
  const clearance = widthFor(true, state.maze.eggs.length - state.eggs.length) / 2 + 0.56;
  for (const egg of state.eggs) {
    if (visibleEggs.length === 2) break;
    if (visibleEggs.some((visible) => sameCell(visible, egg))) continue;
    if (state.body.some((cell) => Math.hypot(cell.x - egg.x, cell.y - egg.y) < clearance)) break;
    visibleEggs.push(egg);
  }
  return { ...state, visibleEggs };
}

export function canTurn(current: Direction, requested: Direction): boolean {
  return VECTORS[current].x + VECTORS[requested].x !== 0
    || VECTORS[current].y + VECTORS[requested].y !== 0;
}

export function newGame(widthGrowth: boolean, maze: Maze = BURROW): SnakeState {
  return revealEggs({
    maze, widthGrowth, body: maze.start.map((cell) => ({ ...cell })), direction: maze.direction,
    eggs: maze.eggs.map((cell) => ({ ...cell })), visibleEggs: [], growthPending: 0, widths: maze.start.map(() => BASE_WIDTH),
    phase: "ready", collision: null, steps: 0,
  });
}

export function startGame(state: SnakeState): SnakeState {
  return state.phase === "ready" ? { ...state, phase: "playing" } : state;
}

/** One cell per tick. Illegal reversals continue forward; terminal states never move. */
export function advance(state: SnakeState, requested: Direction = state.direction): SnakeState {
  if (state.phase !== "playing") return state;
  const direction = canTurn(state.direction, requested) ? requested : state.direction;
  const delta = VECTORS[direction];
  const head = { x: state.body[0].x + delta.x, y: state.body[0].y + delta.y };
  const eatenIndex = activeEggs(state).findIndex((egg) => sameCell(head, egg));
  const eating = eatenIndex !== -1;
  const width = widthFor(state.widthGrowth, state.maze.eggs.length - state.eggs.length + Number(eating));
  if (hitsWall(state.maze.rows, state.body[0], head, width)) {
    const collision = state.maze.rows[head.y]?.[head.x] === "." ? "clearance" : "wall";
    return { ...state, direction, phase: "lost", collision };
  }
  const growthPending = state.growthPending + (eating ? SEGMENTS_PER_EGG : 0);
  const grows = growthPending > 0;
  const occupied = grows ? state.body : state.body.slice(0, -1);
  const occupiedWidths = grows ? state.widths : state.widths.slice(0, -1);
  if (hitsBody(state.body[0], head, width, occupied, occupiedWidths)) {
    return { ...state, direction, phase: "lost", collision: "body" };
  }
  const body = [head, ...occupied];
  const eggs = eating ? state.eggs.filter((_, index) => index !== eatenIndex) : state.eggs;
  return revealEggs({
    ...state, body, widths: [width, ...occupiedWidths], direction, eggs, steps: state.steps + 1,
    visibleEggs: eating ? state.visibleEggs.filter((_, index) => index !== eatenIndex) : state.visibleEggs,
    growthPending: grows ? growthPending - 1 : 0,
    phase: eggs.length === 0 && sameCell(head, state.maze.exit) ? "won" : "playing",
  });
}
