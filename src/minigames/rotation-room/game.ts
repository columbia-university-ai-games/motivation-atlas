export const MAX_ENERGY = 6;
export const ENERGY_STEP = 3;

export type PlayerId = "ari" | "bo" | "cleo" | "dev";

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  readonly skill: number;
  readonly energy: number;
}

export const PLAYERS: readonly Player[] = [
  { id: "ari", name: "Ari", skill: 5, energy: MAX_ENERGY },
  { id: "bo", name: "Bo", skill: 4, energy: MAX_ENERGY },
  { id: "cleo", name: "Cleo", skill: 4, energy: MAX_ENERGY },
  { id: "dev", name: "Dev", skill: 3, energy: MAX_ENERGY },
];

export const TARGETS: readonly number[] = [13, 12, 14, 13];

export interface EnergyChange {
  readonly id: PlayerId;
  readonly before: number;
  readonly after: number;
  readonly started: boolean;
}

export interface MatchResult {
  /** Fixture number, starting at 1. */
  readonly match: number;
  readonly lineup: readonly PlayerId[];
  readonly power: number;
  readonly target: number;
  readonly won: boolean;
  readonly energyChanges: readonly EnergyChange[];
}

export interface GameState {
  readonly fatigueMatters: boolean;
  readonly players: readonly Player[];
  readonly selected: readonly PlayerId[];
  readonly results: readonly MatchResult[];
}

export interface TournamentSummary {
  readonly wins: number;
  readonly losses: number;
  readonly lineupChanges: number;
  readonly complete: boolean;
}

export interface FinalResult extends TournamentSummary {
  readonly complete: true;
  readonly players: readonly Player[];
}

export function initialGame(fatigueMatters = true): GameState {
  return {
    fatigueMatters,
    players: PLAYERS.map((player) => ({ ...player })),
    selected: [],
    results: [],
  };
}

function assertPlayer(id: PlayerId): void {
  if (!PLAYERS.some((player) => player.id === id)) {
    throw new RangeError(`Unknown player: ${id}`);
  }
}

function assertSelection(ids: readonly PlayerId[], requireTwo: boolean): void {
  if (ids.length > 2 || (requireTwo && ids.length !== 2)) {
    throw new RangeError("Select exactly two players to play a match.");
  }
  for (const id of ids) assertPlayer(id);
  if (new Set(ids).size !== ids.length) {
    throw new RangeError("A lineup cannot contain the same player twice.");
  }
}

/** Toggle one player; a full lineup must make space before adding a third. */
export function selectPlayer(state: GameState, id: PlayerId): GameState {
  assertPlayer(id);
  if (currentTarget(state) === null) return state;
  const selected = state.selected.includes(id)
    ? state.selected.filter((selectedId) => selectedId !== id)
    : state.selected.length < 2 ? [...state.selected, id] : state.selected;
  return selected === state.selected ? state : { ...state, selected };
}

/** Select a complete lineup without changing the caller's array. */
export function setLineup(state: GameState, ids: readonly PlayerId[]): GameState {
  assertSelection(ids, true);
  if (currentTarget(state) === null) return state;
  return { ...state, selected: [...ids] };
}

/** Power uses the current, pre-match energy. The formula is identical in both modes. */
export function teamPower(state: GameState): number {
  assertSelection(state.selected, false);
  return state.players.reduce((power, player) => state.selected.includes(player.id)
    ? power + player.skill + Math.floor(player.energy / 2)
    : power, 0);
}

/** No opponent remains after all four fixtures have been played. */
export function currentTarget(state: GameState): number | null {
  return TARGETS[state.results.length] ?? null;
}

export function playMatch(state: GameState): GameState {
  const target = currentTarget(state);
  if (target === null) return state;
  assertSelection(state.selected, true);
  const power = teamPower(state);
  const energyChanges = state.players.map((player): EnergyChange => {
    const started = state.selected.includes(player.id);
    const after = state.fatigueMatters
      ? Math.max(0, Math.min(MAX_ENERGY, player.energy + (started ? -ENERGY_STEP : ENERGY_STEP)))
      : MAX_ENERGY;
    return { id: player.id, before: player.energy, after, started };
  });
  const result: MatchResult = {
    match: state.results.length + 1,
    lineup: [...state.selected],
    power,
    target,
    won: power >= target,
    energyChanges,
  };
  return {
    ...state,
    players: state.players.map((player, index) => ({ ...player, energy: energyChanges[index].after })),
    results: [...state.results, result],
  };
}

export function tournamentSummary(state: GameState): TournamentSummary {
  const wins = state.results.filter((result) => result.won).length;
  let lineupChanges = 0;
  for (let index = 1; index < state.results.length; index++) {
    const previous = state.results[index - 1].lineup;
    if (!state.results[index].lineup.every((id) => previous.includes(id))) lineupChanges++;
  }
  return {
    wins,
    losses: state.results.length - wins,
    lineupChanges,
    complete: currentTarget(state) === null,
  };
}

export function finalResult(state: GameState): FinalResult | null {
  const summary = tournamentSummary(state);
  return summary.complete ? { ...summary, complete: true, players: state.players } : null;
}
