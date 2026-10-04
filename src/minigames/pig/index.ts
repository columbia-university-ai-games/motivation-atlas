import { h, s } from "../../lib/dom";
import type { Minigame } from "../types";
import { botShouldHold, BOT_HOLD_AT, hold, leadChanges, newGame, roll, rollDie, type PigOptions, type PigState } from "./game";
import { dynamicsFor } from "./sources";
import "./pig.css";

const BOT_DELAY_MS = 650;
const FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
let mounts = 0;

function mount(el: HTMLElement): () => void {
  const id = ++mounts;
  let options: PigOptions = { pushYourLuck: true, reward: "face", target: 50 };
  let state: PigState = newGame(options);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const scoreYou = h("span", { class: "pig-score", "data-score": "0" }, "0");
  const scoreBot = h("span", { class: "pig-score", "data-score": "1" }, "0");
  const die = h("div", { class: "pig-die", "aria-live": "polite" }, "–");
  const status = h("p", { class: "pig-status", "data-status": "" });
  const turn = h("span", { "data-turn": "" }, "0");
  const rollBtn = h("button", { type: "button", class: "pig-btn", "data-roll": "" }, "Roll");
  const holdBtn = h("button", { type: "button", class: "pig-btn", "data-hold": "" }, "Hold ", turn);
  const push = h("input", { type: "checkbox", "data-mechanic": "push-your-luck", checked: true });
  const face = h("input", { type: "radio", name: `pig-reward-${id}`, value: "face", "data-mechanic": "reward", checked: true });
  const steady = h("input", { type: "radio", name: `pig-reward-${id}`, value: "steady", "data-mechanic": "reward" });
  const newBtn = h("button", { type: "button", class: "pig-btn secondary", "data-new": "" }, "New game");
  const spark = s("svg", { class: "pig-spark", viewBox: "0 0 300 60", role: "img", "aria-label": "Your lead over the bot, turn by turn" });
  const leadText = h("p", { class: "pig-lead" });
  const dynamics = h("ul", { class: "pig-dynamics", "data-dynamics": "" });

  const root = h("div", { class: "pig" },
    h("div", { class: "pig-board" },
      h("div", { class: "pig-scores" },
        h("div", { class: "pig-player" }, h("span", { class: "pig-name" }, "You"), scoreYou),
        h("div", { class: "pig-player" }, h("span", { class: "pig-name" }, `Bot (holds at ${BOT_HOLD_AT})`), scoreBot),
      ),
      die, status,
      h("div", { class: "pig-actions" }, rollBtn, holdBtn),
    ),
    h("fieldset", { class: "pig-mechanics" },
      h("legend", {}, "Mechanics, applied when you start a new game"),
      h("label", {}, push, " Push your luck: keep rolling until you hold or roll a 1"),
      h("label", {}, face, " Reward: the die's face"),
      h("label", {}, steady, " Reward: a steady 4 per safe roll"),
      newBtn,
    ),
    h("section", { class: "pig-panel" },
      h("h4", {}, "What emerges"),
      spark, leadText, dynamics,
    ),
  );
  el.append(root);

  function message(): string {
    if (state.winner === 0) return "You win. Start a new game, or change a mechanic and see how the game feels.";
    if (state.winner === 1) return `The bot wins. It holds at ${BOT_HOLD_AT} every turn, a strategy with no nerves at all.`;
    if (state.current === 1) {
      if (state.lastEvent === "busted" && state.lastRoll === 1 && state.turnTotal === 0) return "You rolled a 1 and lost the turn. The bot is rolling.";
      return "The bot is rolling.";
    }
    if (state.lastEvent === "busted") return "The bot rolled a 1 and lost its turn. Your roll.";
    if (state.lastEvent === "held") return "Your roll.";
    if (state.lastEvent === "rolled") return `Turn total ${state.turnTotal}. Roll again or hold.`;
    return options.pushYourLuck ? "First to 50. Roll to start; hold to bank your turn total." : "First to 50. One roll per turn.";
  }

  function drawSpark(): void {
    const history = state.leadHistory;
    const max = Math.max(10, ...history.map(Math.abs));
    const x = (i: number) => (history.length === 1 ? 0 : (i / (history.length - 1)) * 296 + 2);
    const y = (v: number) => 30 - (v / max) * 26;
    spark.replaceChildren(
      s("line", { x1: 0, y1: 30, x2: 300, y2: 30, class: "pig-zero" }),
      s("polyline", { points: history.map((v, i) => `${x(i)},${y(v)}`).join(" "), class: "pig-lead-line" }),
    );
  }

  function render(): void {
    scoreYou.textContent = String(state.scores[0]);
    scoreBot.textContent = String(state.scores[1]);
    die.textContent = state.lastRoll ? FACES[state.lastRoll] : "–";
    die.setAttribute("aria-label", state.lastRoll ? `Rolled ${state.lastRoll}` : "No roll yet");
    turn.textContent = String(state.turnTotal);
    status.textContent = message();
    const yourTurn = state.current === 0 && state.winner === null;
    rollBtn.disabled = !yourTurn;
    holdBtn.disabled = !yourTurn || !options.pushYourLuck || state.turnTotal === 0;
    drawSpark();
    const changes = leadChanges(state.leadHistory);
    leadText.textContent = `The lead has changed hands ${changes} ${changes === 1 ? "time" : "times"}.`;
    dynamics.replaceChildren(...dynamicsFor(options).map((text) => h("li", {}, text)));
  }

  function scheduleBot(): void {
    if (state.current !== 1 || state.winner !== null || timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      state = botShouldHold(state) ? hold(state) : roll(state, rollDie());
      render();
      scheduleBot();
    }, BOT_DELAY_MS);
  }

  rollBtn.addEventListener("click", () => {
    if (state.current !== 0 || state.winner !== null) return;
    state = roll(state, rollDie());
    render();
    scheduleBot();
  });
  holdBtn.addEventListener("click", () => {
    if (state.current !== 0) return;
    state = hold(state);
    render();
    scheduleBot();
  });
  newBtn.addEventListener("click", () => {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    options = { ...options, pushYourLuck: push.checked, reward: steady.checked ? "steady" : "face" };
    state = newGame(options);
    render();
  });

  render();
  return () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    root.remove();
  };
}

export const pig: Minigame = { slug: "pig", title: "Pig: push your luck", motivators: ["chance"], mount };
