import { h, s } from "../../lib/dom";
import type { Minigame } from "../types";
import { HEIGHT, LEVELS, PLAYER_RADIUS, STEP, SURFACE_Y, VIEW_HEIGHT, WIDTH, advanceLevel, jump, newGame, predictTrajectory, start, step, type MoveDirection } from "./game";
import "./wheel-escape.css";

let mounts = 0;
function mount(el: HTMLElement): () => void {
  const stripeId = `we-stripes-${++mounts}`;
  let state = newGame();
  let previewEnabled = true;
  let paused = false;
  let frame = 0;
  let previous: number | null = null;
  let accumulator = 0;
  let announcement = "";
  let destroyed = false;
  let drawnLevel = -1;
  let lastBounces = 0;
  let bounceUntil = 0;
  const heldKeys = new Map<string, MoveDirection>();
  const heldPointers = new Map<number, MoveDirection>();

  const preview = h("input", { type: "checkbox", checked: true, "data-mechanic": "trajectory-preview" });
  const startBtn = h("button", { type: "button", "data-start": "" }, "Start climb");
  const nextBtn = h("button", { type: "button", "data-next-level": "", hidden: true }, "Next level →");
  const jumpBtn = h("button", { type: "button", "data-jump": "", class: "we-jump" }, "Jump");
  const leftBtn = h("button", { type: "button", "data-move": "left", class: "we-move", "aria-label": "Move left around the wheel (counterclockwise)" }, "← Left");
  const rightBtn = h("button", { type: "button", "data-move": "right", class: "we-move", "aria-label": "Move right around the wheel (clockwise)" }, "Right →");
  const pauseBtn = h("button", { type: "button", "data-pause": "" }, "Pause");
  const restartBtn = h("button", { type: "button", "data-restart": "" }, "Restart / change preview");
  const status = h("p", { class: "we-status", "data-status": "", role: "status", "aria-live": "polite" });
  const summary = h("p", { class: "we-summary", "data-summary": "" });
  const mode = h("p", { class: "we-mode", "data-mode": "" });
  const levelHeading = h("h4", { class: "we-level", "data-level-heading": "" });
  const zone = h("p", { class: "we-zone", "data-zone": "" });
  const legend = h("p", { class: "we-legend", "data-hazard-legend": "" });
  const reflection = h("section", { class: "we-reflect", "data-reflection": "", hidden: true },
    h("h4", {}, "Check it against your own play"),
    h("p", {}, "What did you feel? Did the preview change when you jumped or how earned a landing felt? Try the other setting and compare what you did and felt."),
  );
  const world = s("g", {});
  const board = s("svg", {
    class: "we-board", viewBox: `0 0 ${WIDTH} ${VIEW_HEIGHT}`, role: "img",
    "aria-label": "Three levels with all seven rotating wheels underground. Jump from the highest wheel above the ground line to exit. Rising lava below; striped sections bounce you away.",
  }, world);
  board.prepend(s("defs", {}, s("pattern", { id: stripeId, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" },
    s("rect", { width: 6, height: 6, class: "we-stripe-bg" }),
    s("path", { d: "M0 0 V6", class: "we-stripe-line" }),
  )));
  world.append(
    s("rect", { x: 0, y: 0, width: WIDTH, height: SURFACE_Y, class: "we-sky" }),
    s("circle", { cx: 295, cy: 28, r: 16, class: "we-sun" }),
    s("path", { d: "M20 32 Q20 20 32 22 Q40 6 50 18 Q66 14 68 32 Z M220 42 Q220 30 232 32 Q240 16 252 30 Q264 26 268 42 Z", class: "we-cloud" }),
    s("path", { d: `M0 ${SURFACE_Y} V${SURFACE_Y - 20} L50 ${SURFACE_Y - 36} L100 ${SURFACE_Y - 10} L174 ${SURFACE_Y - 28} L248 ${SURFACE_Y - 14} L310 ${SURFACE_Y - 40} L360 ${SURFACE_Y - 16} V${SURFACE_Y} Z`, class: "we-hills" }),
    s("rect", { x: 0, y: SURFACE_Y, width: WIDTH, height: HEIGHT - SURFACE_Y, class: "we-earth" }),
    s("path", { d: `M30 ${SURFACE_Y} L18 440 L28 580 L16 720 L26 900 L18 ${HEIGHT} H342 L334 900 L344 720 L332 580 L342 440 L330 ${SURFACE_Y} Z`, class: "we-cavern" }),
  );
  for (let y = SURFACE_Y + 50; y < HEIGHT; y += 120) {
    world.append(s("path", { d: `M0 ${y} l22 15 -12 32 18 20 M360 ${y + 40} l-24 18 12 28 -20 22`, class: "we-crack" }));
  }
  world.append(
    s("path", { d: `M0 ${SURFACE_Y} H${WIDTH}`, class: "we-ground-line", "data-ground-line": "" }),
    s("text", { x: 10, y: SURFACE_Y - 12, class: "we-ground-label" }, "GROUND LEVEL"),
    s("text", { x: 32, y: SURFACE_Y + 23, class: "we-cave-label" }, "CAVE ↓"),
  );
  const exitLabel = s("text", { y: -64, "text-anchor": "middle", class: "we-exit", "data-exit-label": "" }, "EXIT ↑");
  world.append(s("g", { transform: `translate(${LEVELS[0].wheels.at(-1)!.x} ${SURFACE_Y})`, "data-surface-exit": "" },
    s("path", { d: "M-22 0 V-26 A22 22 0 0 1 22 -26 V0 Z", class: "we-exit-door" }), exitLabel,
  ));
  const wheelLayer = s("g", { "data-wheels": "" });
  world.append(wheelLayer);
  const spokes: SVGElement[] = [];
  function drawWheels(): void {
    wheelLayer.replaceChildren();
    spokes.length = 0;
    LEVELS[state.level].wheels.forEach((wheel, index) => {
      const ring = s("g", { transform: `translate(${wheel.x} ${wheel.y})` });
      const spin = s("g", { class: "we-spokes" });
      const spokeRadius = wheel.radius - 6;
      for (let n = 0; n < 6; n++) {
        const a = n * Math.PI / 3;
        spin.append(s("line", { x1: 0, y1: 0, x2: Math.cos(a) * spokeRadius, y2: Math.sin(a) * spokeRadius }));
      }
      ring.append(s("circle", { r: wheel.radius, class: "we-wheel" }), spin,
        s("circle", { r: Math.min(13, wheel.radius * 0.35), class: "we-hub" }),
        s("text", { y: 5, "text-anchor": "middle", class: "we-number" }, String(index + 1)));
      if (wheel.blocked) {
        const { start, sweep } = wheel.blocked;
        const r = wheel.radius;
        const d = `M${Math.cos(start) * r} ${Math.sin(start) * r} A${r} ${r} 0 0 1 ${Math.cos(start + sweep) * r} ${Math.sin(start + sweep) * r}`;
        spin.append(s("path", { d, class: "we-blocked", "data-blocked-arc": "" }, s("title", {}, "Striped section: bounces you away")),
          s("path", { d, class: "we-blocked-stripes", stroke: `url(#${stripeId})` }));
      }
      wheelLayer.append(ring);
      spokes.push(spin);
    });
    drawnLevel = state.level;
    bounceUntil = 0;
  }
  const trajectory = s("polyline", { class: "we-trajectory", "data-trajectory": "", "aria-hidden": "true" });
  const explorer = s("g", { class: "we-explorer" },
    s("circle", { r: PLAYER_RADIUS, class: "we-player" }),
    s("path", { d: "M-7 -2 Q0 -14 7 -2 Z", class: "we-helmet" }),
    s("circle", { cx: 3, cy: -2, r: 2, class: "we-lamp" }),
  );
  const lava = s("rect", { x: 0, width: WIDTH, class: "we-lava", "data-lava": "" });
  const lavaLine = s("path", { class: "we-lava-line" });
  world.append(trajectory, explorer, lava, lavaLine);
  const stage = h("div", {
    class: "we-stage", tabindex: 0, role: "group",
    "aria-label": "Wheel Escape play area. Hold Left or Right arrow to slide around the wheel. Press Space or Enter to jump.",
  }, board);
  const root = h("div", { class: "wheel-escape" },
    h("p", { class: "we-kicker" }, "WHEEL ESCAPE · CHALLENGE & MASTERY"),
    h("fieldset", { class: "we-options" },
      h("legend", {}, "Choose before starting"),
      h("label", {}, preview, " Jump trajectory preview"),
      h("p", {}, "A dotted path predicts a jump taken now. Lava rises in both modes."),
    ),
    levelHeading, zone, mode, stage,
    h("div", { class: "we-actions we-primary" }, startBtn, nextBtn, leftBtn, jumpBtn, rightBtn),
    h("div", { class: "we-actions we-secondary" }, pauseBtn, restartBtn),
    summary, status, legend,
    h("p", { class: "we-help" }, "Hold ← / → or the Left / Right buttons to slide around a wheel: left counterclockwise, right clockwise. Release to ride its rotation. Jump with the button, Space, or Enter. From the top wheel, jump above the ground line to exit. No steering in flight; lower wheels can catch you."),
    reflection,
  );
  el.append(root);

  function say(text: string): void {
    if (text !== announcement) { status.textContent = text; announcement = text; }
  }
  function movement(): MoveDirection {
    const inputs = [...heldKeys.values(), ...heldPointers.values()];
    return (Number(inputs.includes(1)) - Number(inputs.includes(-1))) as MoveDirection;
  }
  function clearMovement(): void {
    heldKeys.clear();
    heldPointers.clear();
  }
  function render(): void {
    if (paused || state.status !== "running") clearMovement();
    if (drawnLevel !== state.level) drawWheels();
    const level = LEVELS[state.level];
    root.dataset.level = String(state.level + 1);
    levelHeading.textContent = `Level ${state.level + 1} / ${LEVELS.length} — ${level.name}`;
    zone.textContent = state.y + PLAYER_RADIUS <= SURFACE_Y ? "Above ground · exit reached" : "Underground · climb toward daylight";
    exitLabel.textContent = state.level === LEVELS.length - 1 ? "FINISH ↑" : "EXIT ↑";
    legend.textContent = state.level === 0 ? "All wheels are underground. Jump from the top wheel above the ground line to exit." : "Striped orange rim sections rotate with the wheel. Landing or sliding onto one bounces you away.";
    if (state.bounces > lastBounces) bounceUntil = state.elapsed + 0.7;
    lastBounces = state.bounces;
    const camera = Math.max(0, Math.min(HEIGHT - VIEW_HEIGHT, state.y - 330));
    world.setAttribute("transform", `translate(0 ${-camera})`);
    spokes.forEach((spin, i) => spin.setAttribute("transform", `rotate(${level.wheels[i].speed * state.elapsed * 180 / Math.PI})`));
    explorer.setAttribute("transform", `translate(${state.x} ${state.y})`);
    lava.setAttribute("y", String(state.lava));
    lava.setAttribute("height", String(Math.max(0, HEIGHT - state.lava)));
    lavaLine.setAttribute("d", `M0 ${state.lava} H${WIDTH}`);
    const points = previewEnabled && !paused ? predictTrajectory(state, movement()) : [];
    trajectory.setAttribute("points", points.map(p => `${p.x},${p.y}`).join(" "));
    trajectory.style.display = points.length ? "" : "none";
    preview.disabled = state.status !== "ready";
    startBtn.hidden = state.status !== "ready";
    nextBtn.hidden = state.status !== "cleared";
    leftBtn.hidden = rightBtn.hidden = jumpBtn.hidden = state.status === "ready" || state.status === "cleared";
    pauseBtn.hidden = state.status !== "running";
    restartBtn.hidden = state.status === "ready";
    jumpBtn.disabled = state.status !== "running" || paused || state.wheel === null;
    for (const [button, direction] of [[leftBtn, -1], [rightBtn, 1]] as const) {
      button.disabled = jumpBtn.disabled;
      button.setAttribute("aria-pressed", String(movement() === direction));
    }
    pauseBtn.disabled = state.status !== "running";
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    pauseBtn.setAttribute("aria-pressed", String(paused));
    mode.textContent = `Trajectory preview: ${previewEnabled ? "ON" : "OFF"} · Rising lava: always ON`;
    summary.textContent = `Highest wheel: ${state.highest + 1} / ${level.wheels.length} · Jumps: ${state.jumps} · Bounces: ${state.bounces} · Time: ${Math.floor(state.elapsed)}s`;
    const ended = state.status === "won" || state.status === "lost";
    reflection.hidden = !ended;
    restartBtn.textContent = ended ? "Try again" : "Restart";
    restartBtn.title = "Reset all three levels and choose the preview setting again";
    if (state.status === "ready") say("Choose the preview setting, then start. Climb from the cave into open sky in three levels.");
    else if (state.status === "cleared") say(`Level ${state.level + 1} cleared! You reached daylight. Continue to level ${state.level + 2} for a harder climb.`);
    else if (state.status === "won") say("You escaped all three levels! Restart to compare the other preview setting.");
    else if (state.status === "lost") say(`The lava caught you on level ${state.level + 1}. Try again, or compare the other preview setting.`);
    else if (paused) say("Paused. Resume when you are ready.");
    else if (state.wheel === level.wheels.length - 1) say("Top wheel reached. Jump above the ground line to exit!");
    else if (state.wheel !== null) say(`Riding wheel ${state.wheel + 1}. Time your next jump.`);
    else if (state.elapsed < bounceUntil) say("Bounced off a striped section! Aim for a plain part of the rim.");
    else say("In flight. A lower wheel can still catch you.");
  }
  function tick(now: number): void {
    if (destroyed) return;
    if (previous !== null && !paused && state.status === "running") {
      accumulator += Math.min((now - previous) / 1000, 0.1);
      // Floating-point timestamp subtraction must not change the number of ticks after a restart.
      while (accumulator + 1e-9 >= STEP) { state = step(state, movement()); accumulator = Math.max(0, accumulator - STEP); }
      render();
    }
    previous = now;
    if (!paused && state.status === "running") frame = requestAnimationFrame(tick);
    else frame = 0;
  }
  function schedule(): void {
    previous = null;
    accumulator = 0;
    if (!frame && !paused && state.status === "running") frame = requestAnimationFrame(tick);
  }
  function doJump(): void {
    if (paused) return;
    state = jump(state, movement());
    render();
  }
  function pause(): void {
    if (state.status !== "running") return;
    paused = !paused;
    if (paused) { cancelAnimationFrame(frame); frame = 0; }
    else schedule();
    render();
  }
  function reset(): void {
    cancelAnimationFrame(frame);
    frame = 0;
    state = newGame();
    paused = false;
    previous = null;
    accumulator = 0;
    render();
    preview.focus();
  }
  const onKey = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement) return;
    const direction = event.code === "ArrowLeft" ? -1 : event.code === "ArrowRight" ? 1 : 0;
    const moveButton = (event.code === "Space" || event.code === "Enter") &&
      (event.target === leftBtn || event.target === rightBtn);
    if (direction || moveButton) {
      event.preventDefault();
      if (state.status === "running" && !paused) {
        heldKeys.set(event.code, direction || (event.target === leftBtn ? -1 : 1));
        render();
      }
      return;
    }
    if ((event.code === "Space" || event.code === "Enter") && event.repeat) { event.preventDefault(); return; }
    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement) return;
    if (event.code !== "Space" && event.code !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) doJump();
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    if (heldKeys.delete(event.code)) render();
  };
  const onBlur = (): void => { clearMovement(); render(); };
  const onFocusOut = (event: FocusEvent): void => {
    if (!(event.relatedTarget instanceof Node) || !root.contains(event.relatedTarget)) onBlur();
  };
  const releasePointer = (event: PointerEvent): void => {
    if (heldPointers.delete(event.pointerId)) render();
  };
  for (const [button, direction] of [[leftBtn, -1], [rightBtn, 1]] as const) {
    button.addEventListener("pointerdown", event => {
      if (event.button !== 0 || paused || state.status !== "running" || state.wheel === null) return;
      event.preventDefault();
      heldPointers.set(event.pointerId, direction);
      button.setPointerCapture?.(event.pointerId);
      render();
    });
    button.addEventListener("pointerup", releasePointer);
    button.addEventListener("pointercancel", releasePointer);
    button.addEventListener("lostpointercapture", releasePointer);
  }
  const onVisibility = (): void => {
    if (document.hidden && state.status === "running" && !paused) pause();
  };
  startBtn.addEventListener("click", () => {
    if (state.status !== "ready") return;
    previewEnabled = preview.checked;
    state = start(state);
    render();
    schedule();
    stage.focus({ preventScroll: true });
    stage.scrollIntoView?.({ block: "center", behavior: "instant" });
  });
  nextBtn.addEventListener("click", () => {
    if (state.status !== "cleared") return;
    clearMovement();
    state = advanceLevel(state);
    paused = false;
    render();
    schedule();
    stage.focus({ preventScroll: true });
    stage.scrollIntoView?.({ block: "center", behavior: "instant" });
  });
  preview.addEventListener("change", () => {
    if (state.status !== "ready") { preview.checked = previewEnabled; return; }
    previewEnabled = preview.checked;
    render();
  });
  // A second finger may not generate a click while another finger holds Move.
  // Jump on pointerdown; reserve click for keyboard and programmatic activation.
  jumpBtn.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    doJump();
    stage.focus({ preventScroll: true });
  });
  jumpBtn.addEventListener("click", event => {
    if (event.detail !== 0) return;
    doJump();
    stage.focus({ preventScroll: true });
  });
  pauseBtn.addEventListener("click", pause);
  restartBtn.addEventListener("click", reset);
  root.addEventListener("keydown", onKey);
  root.addEventListener("focusout", onFocusOut);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibility);
  render();
  return () => {
    destroyed = true;
    cancelAnimationFrame(frame);
    root.removeEventListener("keydown", onKey);
    root.removeEventListener("focusout", onFocusOut);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    clearMovement();
    document.removeEventListener("visibilitychange", onVisibility);
    root.remove();
  };
}

export const wheelEscape: Minigame = {
  slug: "wheel-escape", title: "Wheel Escape", motivators: ["challenge"], author: "rogerwangdev", mount,
};
