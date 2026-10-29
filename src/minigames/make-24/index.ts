import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { breakStreak, dealHand, evaluateFormula, formulaText, scoreSubmission, type FormulaToken, type MathSymbol } from "./game";
import "./make-24.css";

const SYMBOLS: { value: MathSymbol; label: string }[] = [
  { value: "+", label: "Plus" }, { value: "−", label: "Minus" },
  { value: "×", label: "Multiply" }, { value: "÷", label: "Divide" },
  { value: "(", label: "Open parenthesis" }, { value: ")", label: "Close parenthesis" },
];

function mount(el: HTMLElement): () => void {
  let hand: number[] = [];
  let formula: FormulaToken[] = [];
  let history: { text: string; valid: boolean; detail: string; score?: string }[] = [];
  let submissions = new Set<string>();
  let score = 0;
  let streak = 0;
  let scoring = false;

  const start = h("button", { type: "button", class: "m24-primary", "data-start": "" }, "Start");
  const next = h("button", { type: "button", class: "m24-primary", "data-next": "", hidden: true }, "Next hand");
  const scoreSwitch = h("input", { type: "checkbox", "data-mechanic": "scoring", "aria-label": "Turn scoring on" });
  const scoreOutput = h("output", { class: "m24-score", "aria-live": "polite" }, "0");
  const info = h("button", { type: "button", class: "m24-info", "aria-expanded": "false", "aria-controls": "m24-scoring-rules" }, "i");
  const scoreRules = h("div", { class: "m24-scoring-rules", id: "m24-scoring-rules", hidden: true },
    h("strong", {}, "Scoring rules"),
    h("ul", {},
      h("li", {}, "Scoring encourages precision, building complicated formula, and using hard numbers."),
      h("li", {}, "A correct formula: +20 points."),
      h("li", {}, "Each 5 or 10: +10; each 7, 9, or 11: +20."),
      h("li", {}, "Use 4 numbers: +20; use 5: +40; use all 6: double the subtotal."),
      h("li", {}, "Use division: +40. Consecutive new correct formulas multiply by streak length."),
      h("li", {}, "An incorrect formula: −20 and reset the streak. The score will not go below 0."),
      h("li", {}, "Next hand ends the streak. Repeated equivalent formulas do not count or affect the streak."),
    ),
  );
  const handRow = h("div", { class: "m24-card-row", "aria-label": "Number cards" });
  const symbolRow = h("div", { class: "m24-symbol-row", "aria-label": "Math operations" });
  const formulaRow = h("div", { class: "m24-formula-row", "data-dropzone": "", "aria-label": "Formula builder" });
  const evaluation = h("p", { class: "m24-evaluation", "aria-live": "polite" });
  const historyList = h("ol", { class: "m24-history-list", "aria-live": "polite" });
  const emptyHistory = h("p", { class: "m24-muted" }, "Submitted formulas will appear here.");
  const status = h("p", { class: "m24-status", "aria-live": "polite" }, "Deal six number cards and arrange them to make 24.");
  const startLine = h("div", { class: "m24-controls" }, start, next);
  const root = h("section", { class: "make-24" },
    h("header", { class: "m24-header" },
      h("div", {}, h("h3", {}, "Make 24"), h("p", {}, "Use the cards to build a formula that equals 24.")),
      h("div", { class: "m24-score-setting" },
        h("label", {}, scoreSwitch, " Scoring"), info, h("span", { class: "m24-score-label" }, "Score ", scoreOutput),
      ),
    ),
    scoreRules,
    startLine,
    status,
    h("div", { class: "m24-play", hidden: true },
      h("div", { class: "m24-line" }, h("span", { class: "m24-line-label" }, "Cards"), handRow),
      h("div", { class: "m24-line" }, h("span", { class: "m24-line-label" }, "Operations"), symbolRow),
      h("div", { class: "m24-line m24-build-line" },
        h("span", { class: "m24-line-label" }, "Formula"),
        formulaRow,
        h("button", { type: "button", class: "m24-evaluate", "data-evaluate": "", disabled: true }, "= 24"),
      ),
      evaluation,
      h("section", { class: "m24-history" }, h("h4", {}, "This hand’s history"), emptyHistory, historyList),
    ),
    h("section", { class: "m24-reflect" },
      h("h4", {}, "Then check it against your own play"),
      h("ul", {},
        h("li", {}, "What do you feel after seeing a new hand of numbers, and after submitting a correct / incorrect formula?"),
        h("li", {}, "Toggle the scoring mechanic on / off, play again, and notice what changed: in what you did, and in how it felt."),
      ),
    ),
  );
  const playArea = root.querySelector<HTMLElement>(".m24-play")!;
  const evaluateButton = root.querySelector<HTMLButtonElement>("[data-evaluate]")!;
  el.append(root);

  function renderHand(): void {
    handRow.replaceChildren(...hand.map((value, cardId) => {
      const card = h("button", {
        type: "button", class: "m24-card", "data-card-id": cardId,
        draggable: "true", "aria-label": `Add number ${value}`,
      }, String(value));
      card.addEventListener("click", () => addNumber(cardId));
      card.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("application/x-make24-card", String(cardId));
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
      });
      return card;
    }));
    symbolRow.replaceChildren(...SYMBOLS.map(({ value, label }) => {
      const button = h("button", {
        type: "button", class: "m24-symbol", "data-symbol": value,
        draggable: "true", "aria-label": `Add ${label}`,
      }, value);
      button.addEventListener("click", () => addSymbol(value));
      button.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("application/x-make24-symbol", value);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
      });
      return button;
    }));
  }

  function renderFormula(): void {
    formulaRow.replaceChildren(...formula.map((token, index) => {
      const label = token.kind === "number" ? String(token.value) : token.value;
      const button = h("button", {
        type: "button", class: token.kind === "number" ? "m24-formula-number" : "m24-formula-symbol",
        "aria-label": `Remove ${label} from formula`,
      }, label);
      button.addEventListener("click", () => {
        formula.splice(index, 1);
        clearFeedback();
        renderFormula();
      });
      return button;
    }));
    for (const card of handRow.querySelectorAll<HTMLButtonElement>("[data-card-id]")) {
      const id = Number(card.dataset.cardId);
      const used = formula.some((token) => token.kind === "number" && token.cardId === id);
      card.disabled = used;
      card.classList.toggle("is-used", used);
    }
    evaluateButton.disabled = formula.length === 0;
  }

  function clearFeedback(): void {
    evaluation.textContent = "";
    evaluation.className = "m24-evaluation";
  }

  function addNumber(cardId: number): void {
    if (formula.some((token) => token.kind === "number" && token.cardId === cardId)) return;
    formula.push({ kind: "number", value: hand[cardId], cardId });
    clearFeedback();
    renderFormula();
  }

  function addSymbol(value: MathSymbol): void {
    formula.push({ kind: "symbol", value });
    clearFeedback();
    renderFormula();
  }

  function renderHistory(): void {
    emptyHistory.hidden = history.length > 0;
    historyList.replaceChildren(...history.map((record) => h("li", { class: record.valid ? "is-correct" : "is-incorrect" },
      h("span", { class: "m24-history-formula" }, record.text),
      h("span", {}, record.detail),
      record.score ? h("span", { class: "m24-history-score" }, record.score) : null,
    )));
  }

  function renderScore(): void {
    scoreOutput.textContent = String(score);
    root.classList.toggle("scoring-on", scoring);
    scoreOutput.parentElement!.hidden = !scoring;
  }

  function submit(): void {
    if (formula.length === 0) return;
    const text = formulaText(formula);
    const result = evaluateFormula(hand, formula);
    if (result.key && submissions.has(result.key)) {
      evaluation.textContent = "That formula is equivalent to one already submitted this hand. Try a different arrangement.";
      evaluation.className = "m24-evaluation";
      return;
    }
    if (result.key) submissions.add(result.key);
    const record = { text, valid: result.valid, detail: result.reason, score: "" };
    if (scoring) {
      const scored = scoreSubmission(formula, result, score, streak);
      score = scored.score;
      streak = scored.streak;
      record.score = `${scored.change >= 0 ? "+" : ""}${scored.change} points`;
      evaluation.textContent = `${result.reason} ${scored.breakdown}. Score: ${score}.`;
    } else {
      streak = result.valid ? streak + 1 : 0;
      evaluation.textContent = result.reason;
    }
    evaluation.classList.add(result.valid ? "is-correct" : "is-incorrect");
    history.unshift(record);
    renderHistory();
    renderScore();
    status.textContent = result.valid ? "Try another arrangement, or deal a new hand." : "Adjust the formula and try again.";
    formula = [];
    renderFormula();
  }

  function newHand(): void {
    hand = dealHand();
    formula = [];
    history = [];
    submissions = new Set();
    streak = breakStreak();
    evaluation.textContent = "";
    evaluation.className = "m24-evaluation";
    status.textContent = "Arrange the cards and operations to make 24.";
    renderHand();
    renderFormula();
    renderHistory();
    playArea.hidden = false;
    start.hidden = true;
    next.hidden = false;
  }

  start.addEventListener("click", newHand);
  next.addEventListener("click", newHand);
  evaluateButton.addEventListener("click", submit);
  scoreSwitch.addEventListener("change", () => {
    scoring = scoreSwitch.checked;
    score = 0;
    streak = 0;
    history = [];
    submissions = new Set();
    formula = [];
    clearFeedback();
    status.textContent = scoring ? "Scoring is on. Make 24 to earn points." : "Scoring is off. Your score has been cleared.";
    renderFormula();
    renderHistory();
    renderScore();
  });
  info.addEventListener("click", () => {
    scoreRules.hidden = !scoreRules.hidden;
    info.setAttribute("aria-expanded", String(!scoreRules.hidden));
  });
  formulaRow.addEventListener("dragover", (event) => { event.preventDefault(); });
  formulaRow.addEventListener("drop", (event) => {
    event.preventDefault();
    const card = event.dataTransfer?.getData("application/x-make24-card");
    const symbol = event.dataTransfer?.getData("application/x-make24-symbol") as MathSymbol | "" | undefined;
    if (card !== undefined && card !== "") addNumber(Number(card));
    else if (symbol && SYMBOLS.some((entry) => entry.value === symbol)) addSymbol(symbol);
  });

  renderScore();
  return () => root.remove();
}

export const make24: Minigame = { slug: "make-24", title: "Make 24", motivators: ["challenge"], author: "tony-wang-zh", mount };
