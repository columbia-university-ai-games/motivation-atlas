import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { GOAL_MONEY, rollDice, settleBet, STARTING_MONEY, type GameState, type Prediction } from "./game";

function mount(el: HTMLElement): () => void {
  let state: GameState = { money: STARTING_MONEY, round: 0, status: "playing" };
  const boost = h("input", { type: "checkbox", "data-mechanic": "seven-boost" });
  const amount = h("input", { type: "number", min: "1", step: "1", value: "10", "aria-label": "Bet amount" });
  const choice = h("select", { "aria-label": "Choose your prediction" },
    h("option", { value: "under" }, "Under 7 (sum 2–6)"),
    h("option", { value: "seven" }, "Exactly 7"),
    h("option", { value: "over" }, "Over 7 (sum 8–12)"),
  );
  const money = h("strong", {}, "$100");
  const status = h("p", { "aria-live": "polite" }, "Choose a bet and roll the dice.");
  const rollButton = h("button", { type: "button" }, "Place bet and roll");
  const newGame = h("button", { type: "button" }, "Play again");

  function render(): void {
    money.textContent = `$${state.money}`;
    amount.max = String(state.money);
    rollButton.disabled = state.status !== "playing";
    newGame.hidden = state.status === "playing";
  }
  rollButton.addEventListener("click", () => {
    const bet = Number(amount.value);
    const prediction = choice.value as Prediction;
    if (!Number.isInteger(bet) || bet < 1 || bet > state.money) {
      status.textContent = `Enter a whole dollar bet from $1 to $${state.money}.`;
      return;
    }
    const dice = rollDice(boost.checked);
    const before = state.money;
    state = settleBet(state, bet, prediction, dice);
    const sum = dice[0] + dice[1];
    const won = state.money > before - bet;
    status.textContent = `You rolled ${dice[0]} + ${dice[1]} = ${sum}. ${won ? `You won; your bet returned ${prediction === "seven" ? "5×" : "2×"}.` : "You lost your bet."} ${state.status === "won" ? "You reached $1,000!" : state.status === "bankrupt" ? "You are bankrupt." : ""}`;
    render();
  });
  newGame.addEventListener("click", () => {
    state = { money: STARTING_MONEY, round: 0, status: "playing" };
    status.textContent = "Choose a bet and roll the dice.";
    render();
  });

  const root = h("section", { class: "seven-up" },
    h("p", {}, "Start with $100. Predict the sum of two dice: under 7, exactly 7, or over 7. Under/over wins return 2× your bet; an exact 7 returns 5×. A loss costs the bet. Reach $1,000 to win; $0 ends the game."),
    h("label", {}, boost, " Seven Boost: make a sum of 7 more likely (off uses fair dice)"),
    h("p", {}, "Bankroll: ", money),
    h("label", {}, "Bet ($) ", amount), choice, rollButton, newGame, status,
    h("p", {}, "Try both settings. Did the changed odds affect your bet size or prediction, and how did each round feel?")
  );
  el.append(root);
  return () => root.remove();
}

export const sevenUp: Minigame = { slug: "seven-up", title: "7Up", motivators: ["chance"], mount };
