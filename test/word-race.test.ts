import { describe, expect, it } from "vitest";
import { BOT_WPM, botDelayMs, botScores, newGame, nextWord, raceWords, submitWord, WORDS } from "../src/minigames/word-race/game";

describe("Word Race", () => {
  it("scores one point for a correct word and advances the player's course", () => {
    let state = newGame({ difficulty: "hard", target: 10 }, ["orbit", ...Array(9).fill("sun")]);
    state = submitWord(state, "orbit");
    expect(state.scores).toEqual([1, 0]);
    expect(state.word).toBe("sun");
  });

  it("scores the bot and finishes at the selected target", () => {
    let state = newGame({ difficulty: "easy", target: 2 }, ["orbit", "sun"]);
    state = botScores(state);
    expect(state.winner).toBeNull();
    state = botScores(state);
    expect(state.scores).toEqual([0, 2]);
    expect(state.winner).toBe(1);
  });

  it("rejects an incorrect word without changing the score", () => {
    const state = newGame({ difficulty: "hard", target: 10 }, ["orbit", ...Array(9).fill("sun")]);
    expect(submitWord(state, "wrong").scores).toEqual([0, 0]);
  });

  it("pre-generates the selected number of unique words", () => {
    const words = raceWords(20, () => 0);
    expect(words).toHaveLength(20);
    expect(new Set(words).size).toBe(20);
  });

  it("rejects a race longer than the word pool", () => {
    expect(() => raceWords(WORDS.length + 1)).toThrow(RangeError);
  });

  it("uses varied bot timing based on word length and difficulty", () => {
    expect(botDelayMs("abcdefghij", "hard")).toBe(1500);
    expect(BOT_WPM).toEqual({ easy: 40, normal: 60, hard: 80, expert: 100 });
  });

  it("selects words from the expanded word list", () => {
    expect(nextWord(() => 0)).toBe("sun");
    expect(nextWord(() => 0.999)).toBe("communication");
  });
});
