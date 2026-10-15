export interface FishingOptions {
  /** On: each cast bites with chance 1 in `ratio`. Off: every `ratio`th cast bites. */
  variable: boolean;
  ratio: number;
  bait: number;
}

export interface FishingState {
  options: FishingOptions;
  casts: number;
  fish: number;
  /** One entry per cast so far: true for a bite. */
  log: boolean[];
  /** The most casts in a row without a bite. */
  longestDry: number;
  lastEvent: "start" | "bite" | "miss";
  over: boolean;
  packedUp: boolean;
}

export const DEFAULT_OPTIONS: FishingOptions = { variable: true, ratio: 4, bait: 24 };

export function newGame(options: FishingOptions): FishingState {
  return { options, casts: 0, fish: 0, log: [], longestDry: 0, lastEvent: "start", over: false, packedUp: false };
}

/** The central rule: whether this cast bites. `roll` is a random number in [0, 1), used only when the schedule is variable. */
export function bites(options: FishingOptions, castNumber: number, roll: number): boolean {
  return options.variable ? roll < 1 / options.ratio : castNumber % options.ratio === 0;
}

function dryRun(log: boolean[]): number {
  const last = log.lastIndexOf(true);
  return log.length - 1 - last;
}

export function cast(s: FishingState, roll: number): FishingState {
  if (s.over) return s;
  if (!(roll >= 0 && roll < 1)) throw new RangeError(`roll must be in [0, 1), got ${roll}`);
  const casts = s.casts + 1;
  const bite = bites(s.options, casts, roll);
  const log = [...s.log, bite];
  return {
    ...s, casts, log,
    fish: s.fish + (bite ? 1 : 0),
    longestDry: Math.max(s.longestDry, dryRun(log)),
    lastEvent: bite ? "bite" : "miss",
    over: casts >= s.options.bait,
  };
}

export function packUp(s: FishingState): FishingState {
  if (s.over) return s;
  return { ...s, over: true, packedUp: true };
}
