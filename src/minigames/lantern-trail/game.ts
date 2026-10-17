export const SIZE = 6;
export const RELICS = [5, 20, 33];
export type Direction = 'up' | 'down' | 'left' | 'right';
export interface State { position: number; visited: number[]; collected: number[] }
export function start(): State { return { position: 0, visited: [0], collected: [] }; }
export function move(state: State, direction: Direction): State {
  const row = Math.floor(state.position / SIZE), col = state.position % SIZE;
  if ((direction === 'up' && row === 0) || (direction === 'down' && row === SIZE - 1)
    || (direction === 'left' && col === 0) || (direction === 'right' && col === SIZE - 1)) return state;
  const position = state.position + { up: -SIZE, down: SIZE, left: -1, right: 1 }[direction];
  return { position,
    visited: state.visited.includes(position) ? state.visited : [...state.visited, position],
    collected: RELICS.includes(position) && !state.collected.includes(position)
      ? [...state.collected, position] : state.collected };
}
export function visible(state: State, tile: number, fog: boolean): boolean {
  return !fog || state.visited.includes(tile);
}
