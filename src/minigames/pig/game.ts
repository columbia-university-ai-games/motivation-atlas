export type PlayerIndex = 0 | 1;
export interface PigOptions { pushYourLuck: boolean; reward: "face" | "steady"; target: number }
export interface PigState {
  options: PigOptions;
  scores: [number, number];
  turnTotal: number;
  current: PlayerIndex;
  lastRoll: number | null;
  lastEvent: "start" | "rolled" | "busted" | "held" | "won";
  winner: PlayerIndex | null;
  /** Your score minus the bot's, after each finished turn, starting at 0. */
  leadHistory: number[];
}

/** The mean of the faces 2 to 6, so steady mode keeps the die's average. */
export const STEADY_REWARD = 4;
export const BOT_HOLD_AT = 20;

export function newGame(options: PigOptions): PigState {
  return { options, scores: [0, 0], turnTotal: 0, current: 0, lastRoll: null, lastEvent: "start", winner: null, leadHistory: [0] };
}

function withScore(scores: [number, number], player: PlayerIndex, value: number): [number, number] {
  return player === 0 ? [value, scores[1]] : [scores[0], value];
}

function endTurn(s: PigState, scores: [number, number], event: "busted" | "held", die: number | null): PigState {
  return {
    ...s, scores, turnTotal: 0, lastRoll: die, lastEvent: event,
    current: s.current === 0 ? 1 : 0,
    leadHistory: [...s.leadHistory, scores[0] - scores[1]],
  };
}

export function roll(s: PigState, die: number): PigState {
  if (s.winner !== null) return s;
  if (!Number.isInteger(die) || die < 1 || die > 6) throw new RangeError(`die must be 1 to 6, got ${die}`);
  if (die === 1) return endTurn(s, s.scores, "busted", 1);
  const turnTotal = s.turnTotal + (s.options.reward === "face" ? die : STEADY_REWARD);
  const banked = s.scores[s.current] + turnTotal;
  if (banked >= s.options.target) {
    const scores = withScore(s.scores, s.current, banked);
    return { ...s, scores, turnTotal: 0, lastRoll: die, lastEvent: "won", winner: s.current, leadHistory: [...s.leadHistory, scores[0] - scores[1]] };
  }
  if (!s.options.pushYourLuck) return endTurn(s, withScore(s.scores, s.current, banked), "held", die);
  return { ...s, turnTotal, lastRoll: die, lastEvent: "rolled" };
}

export function hold(s: PigState): PigState {
  if (s.winner !== null || s.turnTotal === 0 || !s.options.pushYourLuck) return s;
  return endTurn(s, withScore(s.scores, s.current, s.scores[s.current] + s.turnTotal), "held", s.lastRoll);
}

export function botShouldHold(s: PigState): boolean {
  if (!s.options.pushYourLuck || s.turnTotal === 0) return false;
  return s.turnTotal >= BOT_HOLD_AT || s.scores[s.current] + s.turnTotal >= s.options.target;
}

export function rollDie(random: () => number = Math.random): number {
  return 1 + Math.floor(random() * 6);
}

/** How many times the lead passed from one player to the other. Ties do not count. */
export function leadChanges(history: number[]): number {
  let changes = 0;
  let sign = 0;
  for (const lead of history) {
    const next = Math.sign(lead);
    if (next === 0) continue;
    if (sign !== 0 && next !== sign) changes++;
    sign = next;
  }
  return changes;
}
