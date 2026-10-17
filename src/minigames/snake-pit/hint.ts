import { h } from "../../lib/dom";
import { createBoard } from "./board";
import { MOVE_MS, type SnakeState } from "./game";
import { replayFrames } from "./hint-route";

const REPLAY_STEP_MS = MOVE_MS / 3;

/** A separate, opt-in replay; it never changes the player's round. */
export function createHint(id: number, mode: () => boolean, onOpen: () => void) {
  const events = new AbortController();
  const options = { signal: events.signal };
  const copy = h("p", { id: `snake-pit-hint-${id}` }, "Take wide loops, let your tail clear the upper nests, then approach the exit from above. Only the head collects eggs.");
  const host = h("div", { class: "snake-pit-hint-board" });
  const status = h("p", { "data-hint-status": "", role: "status" });
  const action = h("button", { type: "button", class: "snake-pit-button", "data-hint-action": "" }, "Pause replay");
  const element = h("details", { class: "snake-pit-hint", "data-hint": "", "data-hint-phase": "idle" },
    h("summary", {}, "Hint: watch a winning route · 3×"), copy, host, status, action,
  );
  const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let frames: readonly SnakeState[] = [];
  let board: ReturnType<typeof createBoard> | null = null;
  let opened = false;
  let playing = false;
  let elapsed = 0;
  let previousTime = 0;
  let previousIndex = -1;
  let frameId: number | null = null;
  let disposed = false;

  function render(): void {
    if (!board || frames.length === 0) return;
    const position = Math.min(frames.length - 1, elapsed / REPLAY_STEP_MS);
    const index = Math.floor(position);
    const state = frames[index];
    const ended = state.phase === "won" || state.phase === "lost";
    if (index !== previousIndex) {
      board.update(state);
      previousIndex = index;
    }
    board.draw(state, frames[index + 1] ?? state, reducedMotion ? 0 : position - index);
    element.setAttribute("data-hint-phase", ended ? state.phase : playing ? "playing" : "paused");
    action.textContent = ended ? "Replay" : playing ? "Pause replay" : "Resume replay";
    const progress = `${state.maze.eggs.length - state.eggs.length} / ${state.maze.eggs.length} eggs`;
    const label = `${state.phase === "won" ? "Escaped" : state.phase === "lost" ? "Route unavailable" : playing ? "Demo" : "Paused"} · Width growth ${state.widthGrowth ? "ON" : "OFF"} · 3× · ${progress}`;
    if (status.textContent !== label) status.textContent = label;
  }

  function pause(): void {
    playing = false;
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    render();
  }

  function tick(now: number): void {
    frameId = null;
    if (disposed || !playing || !element.open) return;
    const delta = now - previousTime;
    previousTime = now;
    if (delta > 500) { pause(); return; }
    elapsed = Math.min((frames.length - 1) * REPLAY_STEP_MS, elapsed + delta);
    if (elapsed === (frames.length - 1) * REPLAY_STEP_MS) playing = false;
    render();
    if (playing) frameId = requestAnimationFrame(tick);
  }

  function play(): void {
    if (disposed || playing) return;
    playing = true;
    previousTime = performance.now();
    render();
    frameId = requestAnimationFrame(tick);
  }

  function restart(): void {
    pause();
    frames = replayFrames(mode());
    board = createBoard(frames[0], copy.id);
    board.element.tabIndex = -1;
    board.element.setAttribute("aria-label", "Winning route replay");
    host.replaceChildren(board.element);
    elapsed = 0;
    previousIndex = -1;
    play();
  }

  function close(): void {
    opened = false;
    element.open = false;
    pause();
  }

  element.addEventListener("toggle", () => {
    if (disposed || opened === element.open) return;
    opened = element.open;
    if (opened) { onOpen(); restart(); }
    else pause();
  }, options);
  action.addEventListener("click", () => {
    if (elapsed >= (frames.length - 1) * REPLAY_STEP_MS) restart();
    else if (playing) pause();
    else play();
  }, options);
  window.addEventListener("blur", pause, options);
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); }, options);

  return { element, close, dispose() {
    disposed = true;
    pause();
    events.abort();
    element.remove();
  } };
}
