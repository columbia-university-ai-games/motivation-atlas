import { h } from "../../lib/dom";
import { createBoard } from "./board";
import { createHint } from "./hint";
import { activeEggs, advance, canTurn, MOVE_MS, newGame, SEGMENTS_PER_EGG, startGame, type Direction, type SnakeState } from "./game";

const ARROWS: Record<Direction, string> = { up: "↑", right: "→", down: "↓", left: "←" };
const KEYS: Record<string, Direction | undefined> = {
  ArrowUp: "up", w: "up", ArrowRight: "right", d: "right",
  ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left",
};
const clock = (milliseconds: number) => `${Math.floor(milliseconds / 60_000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, "0")}`;
let mounts = 0;

interface Movement { to: SnakeState; startedAt: number; elapsed: number }

export function mountSnakePit(el: HTMLElement): () => void {
  const id = ++mounts;
  const events = new AbortController();
  const options = { signal: events.signal };
  const motion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  let state = newGame(true);
  let movement: Movement | null = null;
  let queued: Direction | null = null;
  let paused = false;
  let disposed = false;
  let frameId: number | null = null;
  const goal = state.maze.eggs.length;

  const eggs = h("output", { "data-eggs": "" }, `0 / ${goal}`);
  const length = h("output", { "data-length": "" }, "3");
  const width = h("output", { "data-width": "", "aria-label": "Width in cells" }, "0.6");
  const time = h("output", { "aria-label": "Time moving" }, "0:00");
  const stat = (label: string, value: HTMLElement) => h("div", { class: "snake-pit-stat" }, h("span", {}, label), value);
  const growth = h("input", { type: "checkbox", checked: true, "data-mechanic": "width-growth" });
  const mode = h("span", {}, "Width growth ON");
  const action = h("button", { type: "button", class: "snake-pit-button snake-pit-primary", "data-action": "" }, "Start escape");
  const restart = h("button", { type: "button", class: "snake-pit-button", "data-restart": "" }, "Restart");
  const status = h("p", { class: "snake-pit-status", role: "status", "data-status": "" });
  const controls = h("p", { class: "snake-pit-help", id: `snake-pit-controls-${id}` }, "Arrows / WASD or tap the arrows. Space pauses. No reversing.");
  const boardView = createBoard(state, controls.id);
  const board = boardView.element;
  const hint = createHint(id, () => growth.checked, pause);

  const buttons = new Map<Direction, HTMLButtonElement>();
  const dpad = h("div", { class: "snake-pit-dpad", role: "group", "aria-label": "Direction controls" });
  for (const direction of ["up", "left", "down", "right"] as const) {
    const button = h("button", { type: "button", class: "snake-pit-turn", "data-direction": direction, "aria-label": `Turn ${direction}` }, ARROWS[direction]);
    buttons.set(direction, button);
    dpad.append(button);
    button.addEventListener("click", () => queueTurn(direction), options);
  }
  const reflection = h("section", { class: "snake-pit-reflect", "data-reflect": "", hidden: true },
    h("h4", {}, "Then try the other setting"),
    h("p", {}, "What did you feel? Did changing growth change your route, your decisions, or how escaping felt?"),
  );
  const root = h("div", { class: "snake-pit", "data-phase": "ready" },
    h("div", { class: "snake-pit-hud" }, stat("Eggs", eggs), stat("Length", length), stat("Width", width), stat("Time", time)),
    h("div", { class: "snake-pit-settings" },
      h("label", { class: "snake-pit-growth" }, growth, mode),
      h("span", { class: "snake-pit-setting-note" }, "ON widens with each egg. OFF stays slim.")),
    board,
    h("div", { class: "snake-pit-legend", "aria-hidden": "true" },
      h("span", {}, "⬭ Choose either egg"), h("span", {}, "▱ Striped gap = too narrow"), h("span", {}, `⇩ Exit at ${goal} eggs`)),
    status,
    h("div", { class: "snake-pit-play-controls" }, dpad, h("div", { class: "snake-pit-actions" }, action, restart)),
    controls, reflection, hint.element,
  );
  el.append(root);

  function stopClock(): void {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
  }

  function draw(): void {
    const progress = movement && !motion?.matches ? Math.min(1, movement.elapsed / MOVE_MS) : 0;
    boardView.draw(state, movement?.to ?? state, progress);
    time.textContent = clock(state.steps * MOVE_MS + (movement?.elapsed ?? 0));
  }

  function render(): void {
    const ended = state.phase === "won" || state.phase === "lost";
    root.setAttribute("data-phase", paused ? "paused" : state.phase);
    boardView.update(state);
    eggs.textContent = `${goal - state.eggs.length} / ${goal}`;
    length.textContent = state.growthPending ? `${state.body.length} +${state.growthPending}` : String(state.body.length);
    width.textContent = state.widths[0].toFixed(1);
    mode.textContent = `Width growth ${growth.checked ? "ON" : "OFF"}`;
    growth.disabled = state.phase === "playing";
    restart.disabled = state.phase === "ready";
    action.textContent = paused ? "Resume" : state.phase === "playing" ? "Pause" : ended ? "Try again" : "Start escape";
    reflection.hidden = !ended;
    const open = state.eggs.length === 0;
    for (const [direction, button] of buttons) {
      button.disabled = state.phase !== "playing" || paused;
      button.setAttribute("data-queued", String(queued === direction));
    }
    let message = `Collect ${goal} eggs and return to the exit. Choose either visible egg; each adds ${SEGMENTS_PER_EGG} length in both modes.`;
    if (paused) message = "Paused. Resume when you’re ready.";
    else if (state.phase === "won") message = `Escaped in ${clock(state.steps * MOVE_MS)} with width growth ${state.widthGrowth ? "ON" : "OFF"}. All ${goal} eggs are safe.`;
    else if (state.phase === "lost") message = state.collision === "clearance"
      ? "Too wide for that gap. Take a wider route around the rocks."
      : state.collision === "wall" ? "Hit a rock or boundary. Try a different turn." : "Caught in your own body. Try a wider loop.";
    else if (state.phase === "playing") message = open
      ? `All ${goal} eggs! Reach the exit at the top left.`
      : activeEggs(state).length < Math.min(2, state.eggs.length) ? "A nest is waiting for your tail to clear. Keep a wide loop; only your head collects eggs."
        : state.widths[0] > 1 ? "Shortcuts are too narrow now. Follow the wider routes."
        : `${state.eggs.length} ${state.eggs.length === 1 ? "egg" : "eggs"} to go. Leave room for your tail.`;
    if (status.textContent !== message) status.textContent = message;
    draw();
  }

  function queueTurn(direction: Direction): void {
    const heading = movement?.to.direction ?? state.direction;
    if (state.phase !== "playing" || paused || queued || heading === direction || !canTurn(heading, direction)) return;
    queued = direction;
    buttons.get(direction)!.setAttribute("data-queued", "true");
  }

  function beginMovement(now: number): Movement | null {
    const next = advance(state, queued ?? state.direction);
    queued = null;
    if (next.phase === "lost") {
      state = next;
      movement = null;
    } else {
      movement = { to: next, startedAt: now, elapsed: 0 };
    }
    render();
    return movement;
  }

  function schedule(): void {
    if (!disposed && !paused && state.phase === "playing" && frameId === null) frameId = requestAnimationFrame(frame);
  }

  function frame(now: number): void {
    frameId = null;
    if (disposed || paused || state.phase !== "playing" || !movement) return;
    const elapsed = now - movement.startedAt;
    // A suspended tab must never race through a backlog of unseen moves.
    if (elapsed > MOVE_MS * 2) { pause(); return; }
    movement.elapsed = Math.min(elapsed, MOVE_MS);
    if (elapsed >= MOVE_MS) {
      const boundary = movement.startedAt + MOVE_MS;
      state = movement.to;
      movement = null;
      if (state.phase === "playing") {
        const next = beginMovement(boundary);
        if (next) next.elapsed = now - boundary;
      } else render();
    }
    draw();
    schedule();
  }

  function pause(): void {
    if (state.phase !== "playing" || paused) return;
    paused = true;
    stopClock();
    render();
  }

  function primaryAction(): void {
    if (disposed) return;
    hint.close();
    if (state.phase === "playing") {
      if (paused) {
        paused = false;
        if (movement) movement.startedAt = performance.now() - movement.elapsed;
        render();
        schedule();
      } else pause();
    } else {
      state = startGame(newGame(growth.checked));
      paused = false;
      queued = null;
      beginMovement(performance.now());
      schedule();
    }
    board.focus({ preventScroll: true });
  }

  action.addEventListener("click", primaryAction, options);
  restart.addEventListener("click", () => {
    hint.close();
    stopClock();
    state = newGame(growth.checked);
    movement = null;
    queued = null;
    paused = false;
    render();
  }, options);
  growth.addEventListener("change", () => {
    hint.close();
    if (state.phase === "ready") state = newGame(growth.checked);
    render();
  }, options);
  root.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target !== board && !(target instanceof Element && target.closest("[data-direction]"))) return;
    const direction = KEYS[event.key] ?? KEYS[event.key.toLowerCase()];
    if (!direction && event.code !== "Space") return;
    event.preventDefault();
    if (event.repeat) return;
    if (event.code === "Space") primaryAction();
    else if (direction) queueTurn(direction);
  }, options);
  window.addEventListener("blur", pause, options);
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); }, options);
  render();

  return () => {
    disposed = true;
    stopClock();
    events.abort();
    hint.dispose();
    root.remove();
  };
}
