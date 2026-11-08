export type Prediction = "under" | "seven" | "over";
export interface GameState { money: number; round: number; status: "playing" | "won" | "bankrupt" }

export const STARTING_MONEY = 100;
export const GOAL_MONEY = 1000;

/** Roll two dice. Boost mode makes a seven twice as likely as with fair dice. */
export function rollDice(sevenBoost: boolean, random: () => number = Math.random): [number, number] {
  if (!sevenBoost) return [1 + Math.floor(random() * 6), 1 + Math.floor(random() * 6)];
  // One third of boosted rolls total seven; the remaining outcomes use the other sums.
  const ticket = random();
  if (ticket < 1 / 3) {
    const first = 1 + Math.floor(random() * 6);
    return [first, 7 - first];
  }
  const sums = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
  const sum = sums[Math.floor(random() * sums.length)];
  const low = Math.max(1, sum - 6);
  const high = Math.min(6, sum - 1);
  const first = low + Math.floor(random() * (high - low + 1));
  return [first, sum - first];
}

/** Winning payouts are total returns, including the stake. A loss forfeits the stake. */
export function settleBet(state: GameState, bet: number, prediction: Prediction, dice: [number, number]): GameState {
  if (!Number.isInteger(bet) || bet < 1 || bet > state.money) throw new RangeError("bet must be a whole dollar amount within your bankroll");
  if (dice.some((die) => !Number.isInteger(die) || die < 1 || die > 6)) throw new RangeError("each die must be 1 to 6");
  const sum = dice[0] + dice[1];
  const wins = prediction === "under" ? sum < 7 : prediction === "over" ? sum > 7 : sum === 7;
  const money = state.money - bet + (wins ? bet * (prediction === "seven" ? 5 : 2) : 0);
  return { money, round: state.round + 1, status: money >= GOAL_MONEY ? "won" : money === 0 ? "bankrupt" : "playing" };
}
