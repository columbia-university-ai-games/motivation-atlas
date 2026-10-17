/** Pure rules: no rendering, clocks, randomness or browser APIs. */
export const SIZE = 7;
export const RELICS = 3;
export const MAX_HEALTH = 3;
export type Direction = "up" | "right" | "down" | "left";
export type Tile = "unknown" | "wall" | "floor" | "relic" | "exit" | "monster";

export interface Monster {
  readonly id: number;
  readonly position: number;
  readonly awake: boolean;
}

export const MAPS = [
  { name: "Amber Court", monsters: [9, 26, 36], rows: [
    "S..#..R", ".#.#.#.", ".#...#.", "...#R..", "##.#.#.", "R..#...", "...#..E",
  ] },
  { name: "Jade Archive", monsters: [17, 28, 39], rows: [
    "S...#R.", ".##.#..", "..R...#", "#.##...", "...#.#.", ".#...#.", "R..#..E",
  ] },
] as const;

export interface ScoutState {
  readonly map: number;
  readonly fog: boolean;
  readonly position: number;
  readonly revealed: readonly number[];
  readonly visited: readonly number[];
  readonly collected: readonly number[];
  readonly steps: number;
  readonly backtracks: number;
  readonly health: number;
  readonly monsters: readonly Monster[];
  readonly awakened: readonly number[];
  readonly defeated: readonly number[];
  readonly facing: Direction;
  readonly lost: boolean;
  readonly won: boolean;
  readonly event: "start" | "moved" | "wall" | "edge" | "relic" | "locked" | "escaped" | "hurt" | "defeated" | "miss" | "fallen";
}

function terrain(map: number, position: number): string {
  return MAPS[map].rows[Math.floor(position / SIZE)][position % SIZE];
}

function neighbors(position: number): number[] {
  const row = Math.floor(position / SIZE), col = position % SIZE;
  return [row > 0 ? position - SIZE : -1, col < SIZE - 1 ? position + 1 : -1,
    row < SIZE - 1 ? position + SIZE : -1, col > 0 ? position - 1 : -1].filter((next) => next >= 0);
}

/** Reveal the current square and four neighbors; known squares stay known. */
function reveal(known: readonly number[], position: number): number[] {
  const row = Math.floor(position / SIZE);
  const col = position % SIZE;
  const nearby = [position];
  if (row > 0) nearby.push(position - SIZE);
  if (row < SIZE - 1) nearby.push(position + SIZE);
  if (col > 0) nearby.push(position - 1);
  if (col < SIZE - 1) nearby.push(position + 1);
  return [...new Set([...known, ...nearby])];
}

export function newGame(fog = true, map = 0): ScoutState {
  if (!Number.isInteger(map) || !MAPS[map]) throw new Error("Unknown ruins map");
  const position = MAPS[map].rows.join("").indexOf("S");
  return {
    map, fog, position, revealed: reveal([], position), visited: [position],
    collected: [], steps: 0, backtracks: 0, health: MAX_HEALTH, defeated: [],
    monsters: MAPS[map].monsters.map((position) => ({ id: position, position, awake: false })), awakened: [],
    facing: "down", lost: false, won: false, event: "start",
  };
}

/** Project visible information only; unknown squares disclose no terrain. */
export function tileAt(state: ScoutState, position: number): Tile {
  if (state.fog && !state.revealed.includes(position)) return "unknown";
  if (monsterAt(state, position)) return "monster";
  const tile = terrain(state.map, position);
  if (tile === "#") return "wall";
  if (tile === "E") return "exit";
  if (tile === "R" && !state.collected.includes(position)) return "relic";
  return "floor";
}

export function move(state: ScoutState, direction: Direction): ScoutState {
  if (state.won || state.lost) return state;
  state = { ...state, facing: direction, awakened: [] };
  const row = Math.floor(state.position / SIZE);
  const col = state.position % SIZE;
  const [dr, dc] = { up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] }[direction];
  const nextRow = row + dr;
  const nextCol = col + dc;
  if (nextRow < 0 || nextRow >= SIZE || nextCol < 0 || nextCol >= SIZE) return { ...state, event: "edge" };
  const position = nextRow * SIZE + nextCol;
  const tile = terrain(state.map, position);
  if (tile === "#") return { ...state, event: "wall" };
  if (monsterAt(state, position)) {
    const health = state.health - 1;
    return enemiesAct({ ...state, health, lost: health === 0, event: health === 0 ? "fallen" : "hurt" }, true);
  }
  const found = tile === "R" && !state.collected.includes(position);
  const collected = found ? [...state.collected, position] : state.collected;
  const won = tile === "E" && collected.length === RELICS;
  return enemiesAct({
    ...state, position, collected, won,
    revealed: reveal(state.revealed, position),
    visited: [...new Set([...state.visited, position])],
    steps: state.steps + 1,
    backtracks: state.backtracks + Number(state.visited.includes(position)),
    event: won ? "escaped" : tile === "E" ? "locked" : found ? "relic" : "moved",
  });
}

export function monsterAt(state: ScoutState, position: number): Monster | undefined {
  return state.monsters.find((monster) => monster.position === position);
}

/** Find a shortest legal chase step without crossing walls or other monsters. */
function chaseStep(state: ScoutState, from: number, monsters: readonly Monster[]): number {
  const occupied = new Set(monsters.filter((monster) => monster.position !== from).map((monster) => monster.position));
  const queue: Array<[number, number]> = [[from, from]];
  const seen = new Set([from]);
  for (const [position, first] of queue) {
    for (const next of neighbors(position)) {
      if (seen.has(next) || terrain(state.map, next) === "#" || occupied.has(next)) continue;
      const step = position === from ? next : first;
      if (next === state.position) return step;
      seen.add(next);
      queue.push([next, step]);
    }
  }
  return from;
}

/** Player acts first. Newly discovered slimes wake now and act next turn.
 * Discovery uses lantern range in both modes; a full-map preview does not wake slimes.
 * A slime either approaches or bites, never both. At most one heart is lost per turn.
 */
function enemiesAct(state: ScoutState, alreadyHurt = false): ScoutState {
  if (state.won || state.lost) return state;
  const monsters = state.monsters.map((monster) => ({ ...monster }));
  const awakened: number[] = [];
  let struck = false;
  for (const monster of monsters) {
    if (!monster.awake) {
      if (state.revealed.includes(monster.position)) {
        monster.awake = true;
        awakened.push(monster.id);
      }
      continue;
    }
    if (neighbors(state.position).includes(monster.position)) struck = true;
    else monster.position = chaseStep(state, monster.position, monsters);
  }
  const health = state.health - Number(struck && !alreadyHurt);
  return { ...state, monsters, awakened, health, lost: health === 0,
    event: health === 0 ? "fallen" : struck && !alreadyHurt ? "hurt" : state.event };
}

export function adjacentMonster(state: ScoutState): number | undefined {
  return state.monsters.find((monster) => neighbors(state.position).includes(monster.position))?.position;
}

export function attack(state: ScoutState): ScoutState {
  if (state.won || state.lost) return state;
  const target = adjacentMonster(state);
  if (target === undefined) return { ...state, awakened: [], event: "miss" };
  const id = monsterAt(state, target)!.id;
  return enemiesAct({ ...state, monsters: state.monsters.filter((monster) => monster.id !== id),
    defeated: [...state.defeated, id], awakened: [], event: "defeated" });
}
