import { advance, newGame, startGame, type Direction, type SnakeState } from "./game";

/** One safe route, checked against the same collision and pickup rules as play. */
export const ESCAPE_ROUTE: readonly (readonly [Direction, number])[] = [
  ["right", 12], ["down", 20], ["left", 2],
  ["down", 2], ["right", 10], ["up", 23], ["left", 20],
  ["down", 21], ["right", 22], ["up", 21], ["left", 22], ["down", 1],
];

export function replayFrames(widthGrowth: boolean): readonly SnakeState[] {
  let state = startGame(newGame(widthGrowth));
  const frames = [state];
  for (const [direction, count] of ESCAPE_ROUTE) for (let i = 0; i < count; i++) {
    state = advance(state, direction);
    frames.push(state);
    if (state.phase !== "playing") return frames;
  }
  return frames;
}
