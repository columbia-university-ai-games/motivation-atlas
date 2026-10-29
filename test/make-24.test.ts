import { describe, expect, it } from "vitest";
import { breakStreak, dealHand, evaluateFormula, scoreSubmission, type FormulaToken, type MathSymbol } from "../src/minigames/make-24/game";

function tokens(hand: number[], parts: (number | MathSymbol)[]): FormulaToken[] {
  return parts.map((part) => typeof part === "number"
    ? { kind: "number", value: hand[part], cardId: part }
    : { kind: "symbol", value: part });
}

describe("Make 24 deal", () => {
  it("draws six cards without replacement from a fresh bag of three copies of 1–12", () => {
    const hand = dealHand(() => 0);
    expect(hand).toHaveLength(6);
    expect(hand.every((n) => Number.isInteger(n) && n >= 1 && n <= 12)).toBe(true);
    expect(Math.max(...Array.from({ length: 12 }, (_, i) => hand.filter((n) => n === i + 1).length))).toBeLessThanOrEqual(3);
  });
});

describe("Make 24 formulas", () => {
  it("applies precedence and accepts an integer division", () => {
    const hand = [8, 3, 9];
    expect(evaluateFormula(hand, tokens(hand, [0, "×", "(", 2, "÷", 1, ")"]))).toMatchObject({ valid: true, value: 24n });
  });

  it("rejects non-integer intermediate division even if later multiplication would reach 24", () => {
    const hand = [8, 3, 9];
    expect(evaluateFormula(hand, tokens(hand, ["(", 0, "÷", 1, ")", "×", 2]))).toMatchObject({ valid: false, reason: "Every division must give a whole number." });
  });

  it("rejects card reuse, malformed expressions, and expressions not equal to 24", () => {
    const hand = [12, 3, 4];
    expect(evaluateFormula(hand, [{ kind: "number", value: 12, cardId: 0 }, { kind: "symbol", value: "+" }, { kind: "number", value: 12, cardId: 0 }]).reason).toMatch(/only once/);
    expect(evaluateFormula(hand, tokens(hand, [0, "+"])).valid).toBe(false);
    expect(evaluateFormula(hand, tokens(hand, [0, "+", 1])).reason).toBe("That equals 15, not 24.");
  });

  it("canonicalizes commutative reorderings but keeps subtraction order", () => {
    const hand = [12, 12, 3, 4];
    const first = evaluateFormula(hand, tokens(hand, [0, "+", 1]));
    const swapped = evaluateFormula(hand, tokens(hand, [1, "+", 0]));
    const sub = evaluateFormula(hand, tokens(hand, [2, "−", 3]));
    const reversedSub = evaluateFormula(hand, tokens(hand, [3, "−", 2]));
    expect(first.key).toBe(swapped.key);
    expect(sub.key).not.toBe(reversedSub.key);
  });
});

describe("Make 24 scoring", () => {
  it("adds bonuses before stacking the all-cards and streak multipliers", () => {
    const hand = [11, 1, 2, 3, 4, 5];
    const formula = tokens(hand, [0, "+", 1, "+", 2, "+", 3, "+", 4, "+", 5]);
    const result = scoreSubmission(formula, { valid: true, value: 24n, reason: "", key: "sum" }, 5, 1);
    expect(result).toEqual({ score: 205, streak: 2, change: 200, breakdown: "+20 correct; +30 number bonus; ×2 for all 6 numbers; ×2 streak = +200" });
  });

  it("floors an incorrect-formula penalty at zero and breaks the streak", () => {
    const result = scoreSubmission([], { valid: false, value: null, reason: "bad", key: null }, 10, 4);
    expect(result).toMatchObject({ score: 0, streak: 0, change: -10 });
    expect(breakStreak()).toBe(0);
  });
});
