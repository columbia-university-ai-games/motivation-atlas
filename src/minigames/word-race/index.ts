import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { botDelayMs, botScores, newGame, raceWords, submitWord, type BotDifficulty, type WordRaceState } from "./game";
import "./word-race.css";

const TARGETS = [5, 10, 20];
const COUNTDOWN_MS = 2000;

function mount(el: HTMLElement): () => void {
  let state: WordRaceState = newGame({ difficulty: "hard", target: 20 });
  let started = false;
  let countdown = false;
  let timer: number | null = null;
  let countdownTimer: number | null = null;
  const difficulty = h("select", { class: "word-race-setting", "data-mechanic": "bot-difficulty", "aria-label": "Bot difficulty" },
    h("option", { value: "easy" }, "Easy (40 WPM)"),
    h("option", { value: "normal" }, "Normal (60 WPM)"),
    h("option", { value: "hard", selected: true }, "Hard (80 WPM)"),
    h("option", { value: "expert" }, "Expert (100 WPM)"),
  );
  const target = h("select", { class: "word-race-setting", "aria-label": "Points needed to win" },
    ...TARGETS.map((points) => h("option", { value: points, selected: points === 20 }, `${points} points`)),
  );
  const word = h("strong", { class: "word-race-word" });
  const input = h("input", { type: "text", class: "word-race-input", autocomplete: "off", autocapitalize: "none", spellcheck: false, "aria-label": "Type the displayed word" });
  const status = h("p", { class: "word-race-status", "aria-live": "polite" });
  const youScore = h("progress", { max: 20, value: 0, "aria-label": "Your progress" });
  const botScore = h("progress", { max: 20, value: 0, "aria-label": "Bot progress" });
  const youScoreText = h("output", {}, "0");
  const botScoreText = h("output", {}, "0");
  const beginButton = h("button", { type: "button", class: "word-race-begin" }, "Begin race");
  const newButton = h("button", { type: "button" }, "New race");
  const preview = h("span", { class: "word-race-preview", "aria-label": "Upcoming words" });
  const root = h("div", { class: "word-race" },
    h("fieldset", { class: "word-race-settings" },
      h("legend", {}, "Race settings"),
      h("label", {}, "Bot difficulty ", difficulty),
      h("label", {}, "Points to win ", target),
    ),
    h("p", {}, "Click Begin race, then type each word exactly. Correct words score automatically."),
    h("div", { class: "word-race-scores" },
      h("div", { class: "word-race-lane" }, h("strong", {}, "You"), youScore, youScoreText),
      h("div", { class: "word-race-lane" }, h("strong", {}, "Bot"), botScore, botScoreText),
    ),
    h("div", { class: "word-race-prompt" },
      word,
      preview,
    ),
    input,
    beginButton,
    status,
    newButton,
    h("section", { class: "word-race-reflect" },
      h("h4", {}, "Then check it against your own play"),
      h("p", {}, "What did the race feel like at each bot difficulty? Change the finish line, play again, and notice how race length changed the pressure."),
    ),
  );
  el.append(root);

  function render(): void {
    word.textContent = state.word;
    youScore.value = state.scores[0];
    botScore.value = state.scores[1];
    youScore.max = state.options.target;
    botScore.max = state.options.target;
    youScoreText.textContent = `${state.scores[0]} / ${state.options.target}`;
    botScoreText.textContent = `${state.scores[1]} / ${state.options.target}`;
    preview.textContent = state.words.slice(state.wordIndex + 1, state.wordIndex + 4).join("  ");
    status.textContent = countdown
      ? "Get ready..."
      : !started
        ? "Click Begin race when you are ready."
      : state.winner === 0
      ? "You win! Start a new race to try again."
      : state.winner === 1
        ? "The bot wins. Start a new race and type faster."
        : state.lastResult === "wrong"
          ? "Not quite. Correct the word and try again."
          : state.lastResult === "correct"
            ? "Correct! Keep typing."
            : "The race is on.";
    input.disabled = !started || countdown || state.winner !== null;
    beginButton.disabled = started || countdown;
    difficulty.disabled = started || countdown;
    target.disabled = started || countdown;
  }

  function stopBot(): void {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    if (countdownTimer !== null) window.clearTimeout(countdownTimer);
    countdownTimer = null;
  }

  beginButton.addEventListener("click", () => {
    started = true;
    countdown = true;
    render();
    countdownTimer = window.setTimeout(() => {
      countdown = false;
      const runBot = () => {
        const botWord = state.words[state.scores[1]];
        state = botScores(state);
        render();
        if (state.winner === null) {
          const nextBotWord = state.words[state.scores[1]] ?? botWord;
          timer = window.setTimeout(runBot, botDelayMs(nextBotWord, difficulty.value as BotDifficulty));
        }
      };
      timer = window.setTimeout(runBot, botDelayMs(state.word, difficulty.value as BotDifficulty));
      render();
      input.focus();
    }, COUNTDOWN_MS);
  });
  input.addEventListener("input", () => {
    if (!started || state.winner !== null) return;
    if (input.value === state.word) {
      state = submitWord(state, input.value);
      input.value = "";
    }
    render();
  });
  newButton.addEventListener("click", () => {
    stopBot();
    started = false;
    countdown = false;
    state = newGame({
      difficulty: difficulty.value as BotDifficulty,
      target: Number(target.value),
    }, raceWords(Number(target.value)));
    input.value = "";
    render();
  });

  render();
  return () => {
    stopBot();
    root.remove();
  };
}

export const wordRace: Minigame = {
  slug: "word-race",
  title: "Word Race",
  motivators: ["competition"],
  author: "epicm",
  mount,
};
