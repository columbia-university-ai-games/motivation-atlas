export const BOT_WPM = { easy: 40, normal: 60, hard: 80, expert: 100 } as const;
export type BotDifficulty = keyof typeof BOT_WPM;
export const WORDS = [
  "sun", "map", "red", "fox", "cat", "dog", "bird", "tree", "moon", "star",
  "sky", "sea", "run", "hop", "jump", "walk", "play", "game", "win", "go",
  "yes", "no", "try", "fast", "slow", "warm", "cool", "rain", "wind", "fire",
  "book", "ball", "door", "home", "blue", "green", "happy", "smile", "laugh",
  "light", "sound", "space", "world", "orbit", "cactus", "lantern", "window", "puzzle",
  "rocket", "velvet", "thunder", "compass", "rainbow", "backpack",
  "butterfly", "adventure", "watermelon", "night", "keyboard",
  "mountain", "firefly", "marshmallow", "celebration", "constellation",
  "transformation", "extraordinary", "friendship", "imagination", "discovery",
  "ace", "dash", "glow", "quick", "silver", "planet", "harbor",
  "meadow", "crystal", "journey", "lighthouse", "pineapple", "strawberry",
  "thunderstorm", "playground", "handwriting", "counterpoint", "possibility",
  "misunderstanding", "responsibility", "unforgettable", "communication",
] as const;

export interface WordRaceOptions {
  difficulty: BotDifficulty;
  target: number;
}

export interface WordRaceState {
  options: WordRaceOptions;
  scores: [number, number];
  words: string[];
  wordIndex: number;
  word: string;
  winner: 0 | 1 | null;
  lastResult: "start" | "correct" | "wrong" | "bot";
}

export function raceWords(target: number, random: () => number = Math.random): string[] {
  if (!Number.isInteger(target) || target < 1 || target > WORDS.length) {
    throw new RangeError(`target must be between 1 and ${WORDS.length}, got ${target}`);
  }
  const available = [...WORDS];
  const selected: string[] = [];
  while (selected.length < target) {
    const index = Math.floor(random() * available.length);
    selected.push(available.splice(index, 1)[0]);
  }
  return selected;
}

export function newGame(
  options: WordRaceOptions,
  words: string[] = raceWords(options.target),
): WordRaceState {
  if (words.length !== options.target) {
    throw new RangeError(`words must contain ${options.target} entries, got ${words.length}`);
  }
  return { options, scores: [0, 0], words, wordIndex: 0, word: words[0], winner: null, lastResult: "start" };
}

export function submitWord(
  state: WordRaceState,
  typed: string,
): WordRaceState {
  if (state.winner !== null || typed !== state.word) {
    return { ...state, lastResult: typed === state.word ? state.lastResult : "wrong" };
  }
  const score = state.scores[0] + 1;
  const wordIndex = state.wordIndex + 1;
  return {
    ...state,
    scores: [score, state.scores[1]], wordIndex,
    word: state.words[wordIndex] ?? state.word,
    winner: score >= state.options.target ? 0 : null,
    lastResult: "correct",
  };
}

export function botScores(state: WordRaceState): WordRaceState {
  if (state.winner !== null) return state;
  const score = state.scores[1] + 1;
  return {
    ...state,
    scores: [state.scores[0], score],
    winner: score >= state.options.target ? 1 : null,
    lastResult: "bot",
  };
}

export function botDelayMs(word: string, difficulty: BotDifficulty): number {
  return (word.length / 5) * (60000 / BOT_WPM[difficulty]);
}
