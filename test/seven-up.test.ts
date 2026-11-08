import { describe, expect, it } from "vitest";
import { rollDice, settleBet, type GameState } from "../src/minigames/seven-up/game";

const start: GameState = { money: 100, round: 0, status: "playing" };

describe("7Up", () => {
  it("pays the stated total return for each winning prediction", () => {
    expect(settleBet(start, 10, "under", [2, 3]).money).toBe(110);
    expect(settleBet(start, 10, "over", [5, 6]).money).toBe(110);
    expect(settleBet(start, 10, "seven", [3, 4]).money).toBe(140);
  });

  it("loses the stake on a wrong prediction and ends at bankruptcy or the goal", () => {
    expect(settleBet(start, 10, "over", [2, 3]).money).toBe(90);
    expect(settleBet({ ...start, money: 10 }, 10, "under", [5, 6]).status).toBe("bankrupt");
    expect(settleBet({ ...start, money: 990 }, 10, "under", [2, 3]).status).toBe("won");
  });

  it("makes seven twice as likely under the boosted dice rule", () => {
    const fair = rollDice(false, () => 0.5);
    expect(fair[0] + fair[1]).toBe(8);
    const boosted = rollDice(true, () => 0.1);
    expect(boosted[0] + boosted[1]).toBe(7);
  });
});
