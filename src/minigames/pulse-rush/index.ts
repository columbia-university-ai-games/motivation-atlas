import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import {
  BASE_GAP_MS,
  ROUND_MS,
  finishGame,
  newGame,
  pulseGapMs,
  registerEarlyPress,
  registerHit,
  registerMiss,
  startGame,
  type PulseState,
} from "./game";
import "./pulse-rush.css";

const PULSE_WINDOW_MS = 600;

function mount(el: HTMLElement): () => void {
  let state: PulseState = newGame(true);
  let pulseOpen = false;
  let endsAt = 0;
  let pulseTimer: ReturnType<typeof setTimeout> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  let roundTimer: ReturnType<typeof setTimeout> | null = null;
  let clockTimer: ReturnType<typeof setInterval> | null = null;

  const escalation = h("input", {
    type: "checkbox",
    checked: true,
    "data-mechanic": "escalating-tempo",
  });
  const startButton = h("button", { type: "button", class: "pulse-start", "data-start": "" }, "Start 60-second round");
  const pulseButton = h("button", {
    type: "button",
    class: "pulse-target",
    "data-pulse-target": "",
    "aria-describedby": "pulse-instructions",
  }, "Ready");
  const status = h("p", { class: "pulse-status", "aria-live": "polite", "data-status": "" });
  const hits = h("output", { "data-hits": "" }, "0");
  const misses = h("output", { "data-misses": "" }, "0");
  const early = h("output", { "data-early": "" }, "0");
  const gap = h("output", { "data-gap": "" }, `${BASE_GAP_MS / 1000}s`);
  const time = h("output", { "data-time": "" }, "60.0s");
  const progress = h("progress", { max: ROUND_MS, value: ROUND_MS, "aria-label": "Time remaining" });

  const root = h("div", { class: "pulse-rush" },
    h("fieldset", { class: "pulse-mechanic" },
      h("legend", {}, "Mechanic for the next round"),
      h("label", {}, escalation, " Escalation: successful hits make the pulses arrive faster"),
      startButton,
    ),
    h("div", { class: "pulse-board" },
      h("p", { id: "pulse-instructions", class: "pulse-instructions" }, "When the circle says PULSE, press it with a mouse, tap it, or focus it and use Space or Enter."),
      pulseButton,
      status,
      h("div", { class: "pulse-stats" },
        h("p", {}, h("span", {}, "Hits"), hits),
        h("p", {}, h("span", {}, "Misses"), misses),
        h("p", {}, h("span", {}, "Early presses"), early),
        h("p", {}, h("span", {}, "Next gap"), gap),
      ),
      h("div", { class: "pulse-clock" }, time, progress),
    ),
    h("section", { class: "pulse-reflect" },
      h("h4", {}, "Then check it against your own play"),
      h("ul", {},
        h("li", {}, "Where did you feel the pace in your body: your hand, attention, or breathing?"),
        h("li", {}, "Play once with escalation on and once with it off. When did the fixed rhythm feel different from the accelerating one?"),
        h("li", {}, "Did speeding up create excitement, pressure, both, or neither?"),
      ),
    ),
  );
  el.append(root);

  pulseButton.disabled = true;

  function clearTimer(timer: ReturnType<typeof setTimeout> | null): void {
    if (timer !== null) clearTimeout(timer);
  }

  function clearAllTimers(): void {
    clearTimer(pulseTimer);
    clearTimer(closeTimer);
    clearTimer(roundTimer);
    if (clockTimer !== null) clearInterval(clockTimer);
    pulseTimer = null;
    closeTimer = null;
    roundTimer = null;
    clockTimer = null;
  }

  function remainingMs(): number {
    if (state.status === "ready") return ROUND_MS;
    if (state.status === "finished") return 0;
    return Math.max(0, endsAt - Date.now());
  }

  function render(): void {
    hits.textContent = String(state.hits);
    misses.textContent = String(state.misses);
    early.textContent = String(state.earlyPresses);
    gap.textContent = `${(pulseGapMs(state.hits, state.escalation) / 1000).toFixed(1)}s`;
    const remaining = remainingMs();
    time.textContent = `${(remaining / 1000).toFixed(1)}s`;
    progress.value = remaining;
    pulseButton.classList.toggle("is-open", pulseOpen);

    if (state.status === "ready") {
      pulseButton.textContent = "Ready";
      status.textContent = "Choose the mechanic, then start the round.";
    } else if (state.status === "finished") {
      pulseButton.textContent = "Round over";
      status.textContent = state.escalation
        ? `The quiet gap changed from ${(BASE_GAP_MS / 1000).toFixed(1)}s to ${(pulseGapMs(state.hits, true) / 1000).toFixed(1)}s.`
        : `The quiet gap stayed at ${(BASE_GAP_MS / 1000).toFixed(1)}s for the whole round.`;
    } else if (pulseOpen) {
      pulseButton.textContent = "PULSE!";
      status.textContent = "Now!";
    } else {
      pulseButton.textContent = "Wait…";
      status.textContent = state.escalation && state.hits >= 4 ? "The rhythm is accelerating." : "Listen for the next pulse.";
    }
  }

  function schedulePulse(): void {
    if (state.status !== "playing") return;
    pulseTimer = setTimeout(() => {
      pulseTimer = null;
      if (state.status !== "playing") return;
      pulseOpen = true;
      render();
      closeTimer = setTimeout(() => {
        closeTimer = null;
        if (!pulseOpen || state.status !== "playing") return;
        pulseOpen = false;
        state = registerMiss(state);
        render();
        schedulePulse();
      }, PULSE_WINDOW_MS);
    }, pulseGapMs(state.hits, state.escalation));
  }

  function finishRound(): void {
    if (state.status !== "playing") return;
    clearAllTimers();
    pulseOpen = false;
    state = finishGame(state);
    escalation.disabled = false;
    pulseButton.disabled = true;
    startButton.textContent = "Start another round";
    render();
  }

  function startRound(): void {
    clearAllTimers();
    state = startGame(newGame(escalation.checked));
    pulseOpen = false;
    endsAt = Date.now() + ROUND_MS;
    escalation.disabled = true;
    pulseButton.disabled = false;
    startButton.textContent = "Restart round";
    render();
    pulseButton.focus();
    schedulePulse();
    roundTimer = setTimeout(finishRound, ROUND_MS);
    clockTimer = setInterval(render, 100);
  }

  startButton.addEventListener("click", startRound);
  pulseButton.addEventListener("click", () => {
    if (state.status !== "playing") return;
    if (!pulseOpen) {
      state = registerEarlyPress(state);
      render();
      return;
    }
    pulseOpen = false;
    clearTimer(closeTimer);
    closeTimer = null;
    state = registerHit(state);
    render();
    schedulePulse();
  });

  render();
  return () => {
    clearAllTimers();
    root.remove();
  };
}

export const pulseRush: Minigame = {
  slug: "pulse-rush",
  title: "Pulse Rush: feel the tempo climb",
  motivators: ["sensation"],
  author: "HowrdWng",
  mount,
};
