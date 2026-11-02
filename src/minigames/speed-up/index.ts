import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { CELLS, LIVES, ROUND_MS, start, tap, tick, windowFor, type SpeedUpOptions, type SpeedUpState } from "./game";
import "./speed-up.css";

const TICK_MS = 50;

function mount(el: HTMLElement): () => void {
  let options: SpeedUpOptions = { escalation: true };
  let state: SpeedUpState | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const time = h("span", { class: "speedup-stat", "data-time": "" }, String(ROUND_MS / 1000));
  const hits = h("span", { class: "speedup-stat", "data-hits": "" }, "0");
  const lives = h("span", { class: "speedup-stat", "data-lives": "" }, "♥".repeat(LIVES));
  const speed = h("span", { "data-window": "" });
  const status = h("p", { class: "speedup-status", "aria-live": "polite" });
  const cells = Array.from({ length: CELLS }, (_, i) =>
    h("button", { type: "button", class: "speedup-cell", "data-cell": i, "aria-label": `Cell ${i + 1}` }, String(i + 1)));
  const escalation = h("input", { type: "checkbox", "data-mechanic": "escalation", checked: true });
  const startBtn = h("button", { type: "button", class: "speedup-btn", "data-start": "" }, "Start");

  const root = h("div", { class: "speedup" },
    h("div", { class: "speedup-stats" },
      h("div", {}, h("span", { class: "speedup-name" }, "Seconds"), time),
      h("div", {}, h("span", { class: "speedup-name" }, "Hits"), hits),
      h("div", {}, h("span", { class: "speedup-name" }, "Lives"), lives),
    ),
    h("p", { class: "speedup-window" }, "Each target stays lit for ", speed, "."),
    h("div", { class: "speedup-grid" }, ...cells),
    status,
    h("fieldset", { class: "speedup-mechanics" },
      h("legend", {}, "Mechanic, applied when you press Start"),
      h("label", {}, escalation, " Escalation: every hit makes the next target vanish faster"),
      startBtn,
    ),
    h("section", { class: "speedup-reflect" },
      h("h4", {}, "Then check it against your own play"),
      h("ul", {},
        h("li", {}, "What did you feel in the last ten seconds of your round?"),
        h("li", {}, "Flip escalation, play again, and notice what changed: in how you tapped, and in how it felt."),
        h("li", {}, "Did the speed-up feel like thrill, like stress, or like nothing much? Does that match what the sources say?"),
      ),
    ),
  );
  el.append(root);

  function stop(): void {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  function message(): string {
    if (!state) return "Tap the lit cell before it goes dark. A miss or a wrong tap costs a life. Press Start.";
    if (state.over === "lives") return `Out of lives after ${state.hits} hits. Flip the mechanic and try again.`;
    if (state.over === "time") return `Time! ${state.hits} hits. Flip the mechanic and try again.`;
    return state.options.escalation ? "Faster with every hit…" : "Steady pace.";
  }

  function render(now = Date.now()): void {
    const s = state;
    time.textContent = String(s ? Math.max(0, Math.ceil((s.endsAt - now) / 1000)) : ROUND_MS / 1000);
    hits.textContent = String(s?.hits ?? 0);
    lives.textContent = "♥".repeat(s?.lives ?? LIVES) || "–";
    speed.textContent = `${(windowFor(s?.hits ?? 0, s?.options ?? { escalation: escalation.checked }) / 1000).toFixed(2)} s`;
    status.textContent = message();
    const live = s !== null && s.over === null;
    cells.forEach((cell, i) => cell.classList.toggle("lit", live && s.target === i));
    startBtn.textContent = live ? "Restart" : "Start";
  }

  function update(next: SpeedUpState): void {
    state = next;
    if (state.over) stop();
    render();
  }

  cells.forEach((cell, i) => cell.addEventListener("click", () => {
    if (state && !state.over) update(tap(state, i, Date.now()));
  }));
  // Keys 1 to 9 tap the matching cell, so the keyboard plays as fast as a finger.
  const onKey = (e: KeyboardEvent) => {
    if (!state || state.over || !root.isConnected || !/^[1-9]$/.test(e.key)) return;
    e.preventDefault();
    update(tap(state, Number(e.key) - 1, Date.now()));
  };
  document.addEventListener("keydown", onKey);
  escalation.addEventListener("change", () => { if (!state || state.over) render(); });
  startBtn.addEventListener("click", () => {
    stop();
    options = { escalation: escalation.checked };
    state = start(options, Date.now());
    timer = setInterval(() => { if (state) update(tick(state, Date.now())); }, TICK_MS);
    render();
  });

  render();
  return () => {
    stop();
    document.removeEventListener("keydown", onKey);
    root.remove();
  };
}

export const speedUp: Minigame = {
  slug: "speed-up",
  title: "Speed Up: escalation",
  motivators: ["sensation"],
  author: "SM5858",
  mount,
};
