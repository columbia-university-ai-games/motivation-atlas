export const CASES_PER_ROUND = 3;
export interface Place {
  id: string;
  name: string;
  waterside: boolean;
  redRoof: boolean;
  openDoor: boolean;
}
export type Feature = "waterside" | "redRoof" | "openDoor";
export interface Clue { feature: Feature; value: boolean; text: string }
export interface CompassCase { places: readonly Place[]; targetId: string; clues: readonly Clue[] }
export interface GameState {
  seed: number;
  staged: boolean;
  caseIndex: number;
  puzzle: CompassCase;
  revealed: number;
  crossedOut: readonly string[];
  searched: readonly string[];
  searches: number;
  totalSearches: number;
  cluesOpened: number;
  solved: boolean;
}
export const PLACES: readonly Place[] = [
  { id: "boathouse", name: "Boathouse", waterside: true, redRoof: false, openDoor: false },
  { id: "cafe", name: "Harbor café", waterside: true, redRoof: false, openDoor: true },
  { id: "lighthouse", name: "Lighthouse", waterside: true, redRoof: true, openDoor: false },
  { id: "clockshop", name: "Clock shop", waterside: false, redRoof: false, openDoor: true },
  { id: "market", name: "Market hall", waterside: false, redRoof: true, openDoor: false },
  { id: "station", name: "Old station", waterside: false, redRoof: true, openDoor: true },
];
const FEATURES: readonly Feature[] = ["waterside", "redRoof", "openDoor"];
const WORDING: Record<Feature, readonly [string, string]> = {
  waterside: ["The compass is somewhere inland.", "The compass is beside the water."],
  redRoof: ["The building has a blue roof.", "The building has a red roof."],
  openDoor: ["Its front door is closed.", "Its front door is open."],
};
export function candidates(puzzle: CompassCase, count: number): readonly Place[] {
  return puzzle.places.filter(place => puzzle.clues.slice(0, count).every(clue => place[clue.feature] === clue.value));
}
export function makeCase(seed: number, caseIndex: number): CompassCase {
  if (!Number.isSafeInteger(seed) || seed < 1 || seed > 1_000_000) throw new RangeError("Invalid round seed");
  if (!Number.isInteger(caseIndex) || caseIndex < 0 || caseIndex >= CASES_PER_ROUND) throw new RangeError("Invalid case index");
  const target = PLACES[(seed - 1 + caseIndex) % PLACES.length];
  const first = FEATURES[(seed - 1 + caseIndex) % FEATURES.length];
  const second = FEATURES.filter(feature => feature !== first).find(feature =>
    PLACES.filter(place => place[first] === target[first] && place[feature] === target[feature]).length === 2)!;
  const order = [first, second, FEATURES.find(feature => feature !== first && feature !== second)!];
  return { places: PLACES, targetId: target.id,
    clues: order.map(feature => ({ feature, value: target[feature], text: WORDING[feature][Number(target[feature])] })) };
}
function startCase(seed: number, staged: boolean, caseIndex: number, totalSearches = 0, cluesOpened = 0): GameState {
  return { seed, staged, caseIndex, puzzle: makeCase(seed, caseIndex), revealed: staged ? 1 : 3,
    crossedOut: [], searched: [], searches: 0, totalSearches, cluesOpened, solved: false };
}
export function newGame(seed = 1, staged = true): GameState { return startCase(seed, staged, 0); }
export function revealClue(state: GameState): GameState {
  if (state.solved || state.revealed >= state.puzzle.clues.length) return state;
  return { ...state, revealed: state.revealed + 1, cluesOpened: state.cluesOpened + 1 };
}
export function toggleCrossedOut(state: GameState, id: string): GameState {
  if (state.solved || state.searched.includes(id) || !state.puzzle.places.some(place => place.id === id)) return state;
  return { ...state, crossedOut: state.crossedOut.includes(id) ? state.crossedOut.filter(value => value !== id) : [...state.crossedOut, id] };
}
export function searchPlace(state: GameState, id: string): GameState {
  if (state.solved || state.crossedOut.includes(id) || state.searched.includes(id) || !state.puzzle.places.some(place => place.id === id)) return state;
  return { ...state, searched: [...state.searched, id], searches: state.searches + 1,
    totalSearches: state.totalSearches + 1, solved: id === state.puzzle.targetId };
}
export function roundComplete(state: GameState): boolean { return state.solved && state.caseIndex === CASES_PER_ROUND - 1; }
export function nextCase(state: GameState): GameState {
  return state.solved && !roundComplete(state)
    ? startCase(state.seed, state.staged, state.caseIndex + 1, state.totalSearches, state.cluesOpened) : state;
}
