export const BOARD = [
  "S..#..",
  ".#....",
  ".#.B#.",
  "...#..",
  "B#...B",
  "...#.E",
] as const;

export type Direction = "up" | "right" | "down" | "left";
export type Position = readonly [number, number];
export interface TrailState {
  readonly position: Position;
  readonly seen: readonly string[];
  readonly visits: Readonly<Record<string, number>>;
  readonly collected: readonly string[];
  readonly moves: number;
  readonly won: boolean;
}
const DELTAS: Record<Direction, Position> = {
  up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1],
};
export const key = ([r, c]: Position): string => `${r},${c}`;
export const BEACONS = BOARD.join("").split("B").length - 1;

function reveal(position: Position, seen: readonly string[]): string[] {
  const result = new Set(seen);
  for (let r = 0; r < BOARD.length; r++) {
    for (let c = 0; c < BOARD[r].length; c++) {
      if (Math.abs(r - position[0]) + Math.abs(c - position[1]) <= 1) {
        result.add(key([r, c]));
      }
    }
  }
  return [...result];
}

export function newGame(): TrailState {
  const position: Position = [0, 0];
  return { position, seen: reveal(position, []), visits: { [key(position)]: 1 }, collected: [], moves: 0, won: false };
}

export function move(state: TrailState, direction: Direction): TrailState {
  if (!Object.hasOwn(DELTAS, direction)) throw new Error("Unknown direction");
  if (state.won) return state;
  const [dr, dc] = DELTAS[direction];
  const position: Position = [state.position[0] + dr, state.position[1] + dc];
  const tile = BOARD[position[0]]?.[position[1]];
  if (!tile || tile === "#") return state;
  const collected = tile === "B" ? [...new Set([...state.collected, key(position)])] : [...state.collected];
  return {
    position,
    seen: reveal(position, state.seen),
    visits: { ...state.visits, [key(position)]: (state.visits[key(position)] ?? 0) + 1 },
    collected,
    moves: state.moves + 1,
    won: tile === "E" && collected.length === BEACONS,
  };
}

/** Full-map viewing never changes exploration history or movement rules. */
export function isVisible(state: TrailState, position: Position, fog: boolean): boolean {
  return !fog || state.seen.includes(key(position));
}
