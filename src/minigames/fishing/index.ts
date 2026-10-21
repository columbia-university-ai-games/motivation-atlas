import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { cast, DEFAULT_OPTIONS, newGame, packUp, type FishingOptions, type FishingState } from "./game";
import "./fishing.css";

const WAIT_MS = 500;

function mount(el: HTMLElement): () => void {
  let options: FishingOptions = { ...DEFAULT_OPTIONS };
  let state: FishingState = newGame(options);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const pond = h("div", { class: "fishing-pond", "aria-hidden": "true" }, "🎣");
  const status = h("p", { class: "fishing-status", "aria-live": "polite", "data-status": "" });
  const fishCount = h("span", { class: "fishing-num", "data-fish": "" }, "0");
  const baitCount = h("span", { class: "fishing-num", "data-bait": "" }, String(options.bait));
  const log = h("div", { class: "fishing-log", role: "img", "data-log": "" });
  const castBtn = h("button", { type: "button", class: "fishing-btn", "data-cast": "" }, "Cast");
  const packBtn = h("button", { type: "button", class: "fishing-btn secondary", "data-pack": "" }, "Pack up");
  const variable = h("input", { type: "checkbox", "data-mechanic": "variable-ratio", checked: options.variable });
  const newBtn = h("button", { type: "button", class: "fishing-btn secondary", "data-new": "" }, "New round");
  const summary = h("p", { class: "fishing-summary", "data-summary": "" });

  const root = h("div", { class: "fishing" },
    h("div", { class: "fishing-board" },
      h("div", { class: "fishing-counts" },
        h("div", {}, h("span", { class: "fishing-label" }, "Fish"), fishCount),
        h("div", {}, h("span", { class: "fishing-label" }, "Bait left"), baitCount),
      ),
      pond, status, log,
      h("div", { class: "fishing-actions" }, castBtn, packBtn),
    ),
    h("fieldset", { class: "fishing-mechanics" },
      h("legend", {}, "Mechanic, applied when you start a new round"),
      h("label", {}, variable, ` Bites come at random: each cast has a 1 in ${options.ratio} chance. Off: every ${options.ratio}th cast bites.`),
      newBtn,
    ),
    h("section", { class: "fishing-reflect" },
      h("h4", {}, "Then check it against your own play"),
      summary,
      h("ul", {},
        h("li", {}, "How did you feel just before each cast? Did you want to keep casting, or pack up?"),
        h("li", {}, "Switch the mechanic, play another round, and compare. Both schedules catch the same number of fish on average. Did they feel the same?"),
      ),
    ),
  );
  el.append(root);

  function message(): string {
    if (timer !== null) return "Waiting for a bite…";
    if (state.over) {
      return state.packedUp ? "You packed up. Start a new round, or switch the mechanic and compare." : "Out of bait. Start a new round, or switch the mechanic and compare.";
    }
    if (state.lastEvent === "bite") return "A bite! You caught a fish.";
    if (state.lastEvent === "miss") return "Nothing this time.";
    return `You have ${options.bait} casts of bait. Cast as long as you like, or pack up whenever you want.`;
  }

  function render(): void {
    const waiting = timer !== null;
    pond.textContent = waiting ? "〰️" : state.lastEvent === "bite" ? "🐟" : "🎣";
    status.textContent = message();
    fishCount.textContent = String(state.fish);
    baitCount.textContent = String(options.bait - state.casts);
    log.replaceChildren(...state.log.map((bite) => h("span", { class: bite ? "fishing-mark bite" : "fishing-mark" }, bite ? "🐟" : "·")));
    log.setAttribute("aria-label", `Casts so far: ${state.log.map((b) => (b ? "fish" : "nothing")).join(", ") || "none"}`);
    // aria-disabled instead of disabled, so keyboard focus stays on the button while the line is out.
    castBtn.setAttribute("aria-disabled", String(waiting || state.over));
    packBtn.setAttribute("aria-disabled", String(waiting || state.over));
    summary.textContent = state.over
      ? `This round: ${state.fish} fish in ${state.casts} casts${state.packedUp ? `, packed up with ${options.bait - state.casts} bait left` : ""}. Longest stretch without a bite: ${state.longestDry} casts.`
      : "";
  }

  castBtn.addEventListener("click", () => {
    if (timer !== null || state.over) return;
    timer = setTimeout(() => {
      timer = null;
      state = cast(state, Math.random());
      render();
    }, WAIT_MS);
    render();
  });
  packBtn.addEventListener("click", () => {
    if (timer !== null) return;
    state = packUp(state);
    render();
  });
  newBtn.addEventListener("click", () => {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    options = { ...options, variable: variable.checked };
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

export const fishing: Minigame = {
  slug: "fishing",
  title: "Gone Fishing: when do the bites come?",
  motivators: ["chance"],
  author: "LuluLizzy8",
  mount,
};
