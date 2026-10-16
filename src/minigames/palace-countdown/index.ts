import { h, s } from "../../lib/dom";
import type { Minigame } from "../types";
import { choose, elapse, LIMIT_MS, newGame, type Action } from "./game";
import "./palace-countdown.css";

function mount(el: HTMLElement): () => void {
  let state = newGame(true, Math.floor(Math.random() * 4294967296));
  let started = false;
  let lastTime = performance.now();
  const toggle = h("input", { type: "checkbox", checked: true, "data-mechanic": "time-limit" });
  const clock = h("output", { "aria-label": "Seconds remaining" });
  const bar = h("progress", { max: LIMIT_MS, value: LIMIT_MS, "aria-label": "Time remaining in this room" });
  const heading = h("h3", { tabindex: "-1" });
  const obstacle = h("p");
  const scene = s("svg", { viewBox: "0 0 320 120", "aria-hidden": "true", class: "palace-scene" });
  const feedback = h("p", { role: "status" }, "Set the clock, then begin your escape.");
  const actions = h("div", { class: "palace-actions" });
  const start = h("button", { type: "button" }, "Begin escape");
  const reflection = h("aside", { class: "palace-reflection", hidden: true },
    h("h3", {}, "Then check it against your own play"),
    h("p", {}, "What did you feel with the clock on versus off? Did the time limit change how you chose, recovered from mistakes, or felt mastery? Try both settings and compare."));

  let displayedRoom: object | undefined;
  const buttons = new Map<Action, HTMLButtonElement>();

  function draw() {
    clock.hidden = !state.timed;
    bar.hidden = !state.timed;
    bar.value = state.remainingMs;
    clock.classList.toggle("palace-clock-urgent", state.remainingMs < 10_000);
    clock.textContent = `${(state.remainingMs / 1000).toFixed(1)} seconds left in this room`;
    actions.hidden = !started || state.status !== "playing";
    reflection.hidden = state.status === "playing";
    start.textContent = started ? "Restart escape" : "Begin escape";
    if (state.status !== "playing") {
      heading.textContent = state.status === "escaped" ? "You reached the dawn!" : "You fell! Time ran out.";
      obstacle.textContent = `${state.room} of ${state.route.length} rooms cleared. ${state.mistakes} wrong choices. Restart to try the other clock setting or master the route.`;
      return;
    }
    const room = state.route[state.room];
    heading.textContent = `Room ${state.room + 1} of ${state.route.length}: ${room.title}`;
    obstacle.textContent = room.obstacle;
    if (displayedRoom !== room) {
      // Move existing buttons only on room changes, preserving focus during ticks/retries.
      actions.replaceChildren(...room.actions.map((action) => buttons.get(action)!));
      displayedRoom = room;
    }
    const floor = room.kind === "gap" ? "M0 95H120 M180 95H320" : "M0 95H320";
    const feature = room.kind === "ledge" ? "M170 95V25H240 M180 85H200 M180 65H200 M180 45H200" : room.kind === "gate" ? "M210 0V60 M225 0V60 M240 0V60 M200 60H250" : "M120 100V115 M180 100V115";
    scene.replaceChildren(s("path", { d: "M15 80V35Q15 10 40 10H280Q305 10 305 35V80", class: "palace-arch" }),
      s("path", { d: floor + " " + feature, class: "palace-stone" }),
      s("circle", { cx: 65, cy: 60, r: 7 }),
      s("path", { d: "M65 67V82 M50 75L65 70L80 75 M65 82L55 94 M65 82L75 94", class: "palace-stone" }));
  }
  function syncTime() {
    const now = performance.now();
    if (started) state = elapse(state, now - lastTime);
    lastTime = now;
  }
  for (const action of ["jump", "climb", "run"] as Action[]) {
    const button = h("button", { type: "button" }, action[0].toUpperCase() + action.slice(1));
    button.addEventListener("click", () => {
      syncTime();
      if (state.status !== "playing") { draw(); return; }
      const previous = state.room;
      state = choose(state, action);
      feedback.textContent = state.status === "failed" ? "You fell. The time penalty used up your room timer." : state.room > previous ? "You pass through. Keep moving!" : state.timed ? "That route is blocked. Lost 5 seconds; try again." : "That route is blocked. Try again.";
      draw();
    });
    buttons.set(action, button);
  }
  function reset(begin: boolean) {
    state = newGame(toggle.checked, Math.floor(Math.random() * 4294967296));
    started = begin;
    lastTime = performance.now();
    feedback.textContent = begin ? "Your escape begins." : "Clock setting changed. Begin a fresh escape when ready.";
    draw();
  }
  toggle.addEventListener("change", () => reset(false));
  start.addEventListener("click", () => { reset(true); heading.focus(); });
  const root = h("div", { class: "palace-countdown" },
    h("label", {}, toggle, " Time limit (3 seconds per room; changing this resets the run)"),
    clock, bar, start, scene, heading, obstacle, actions, feedback, reflection);
  el.append(root);
  draw();
  const timer = setInterval(() => { syncTime(); draw(); }, 100);
  return () => { clearInterval(timer); root.remove(); };
}

export const palaceCountdown: Minigame = {
  slug: "palace-countdown", title: "Palace Countdown", motivators: ["challenge"], mount,
};
