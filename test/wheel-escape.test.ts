// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { wheelEscape } from "../src/minigames/wheel-escape";
import { advanceLevel, isBlocked, LEVELS, newGame, start, jump, step, predictTrajectory, JUMP_SPEED, SLIDE_SPEED, STEP, SURFACE_Y, WHEELS, PLAYER_RADIUS, PREVIEW_SECONDS, type GameState } from "../src/minigames/wheel-escape/game";

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup());
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function onWheel(index: number, angle: number): GameState {
  const w = WHEELS[index], radius = w.radius + PLAYER_RADIUS;
  return { ...start(newGame()), wheel: index, highest: index, angle,
    x: w.x + Math.cos(angle) * radius, y: w.y + Math.sin(angle) * radius };
}

function land(state: GameState): GameState {
  for (let i = 0; i < 3 / STEP && state.status === "running" && state.wheel === null; i++) state = step(state);
  return state;
}

function shouldJump(state: GameState): boolean {
  if (state.wheel === null) return false;
  const forecast = land(jump(state));
  return forecast.wheel === state.wheel + 1 || forecast.status === "cleared" || forecast.status === "won";
}

describe("Wheel Escape rules", () => {
  it("predicts each actual physics tick through the first landing without changing the live state", () => {
    const state = Object.freeze(onWheel(0, 5));
    const original = { ...state };
    const forecast = predictTrajectory(state);
    let actual = jump(state);
    for (const point of forecast.slice(1)) {
      actual = step(actual);
      expect(point).toEqual({ x: actual.x, y: actual.y });
    }
    expect(actual.wheel).toBe(1);
    expect(forecast.length).toBeLessThan(PREVIEW_SECONDS / STEP + 1);
    expect(state).toEqual(original);
  });

  it("allows every adjacent upward transition in the authored level", () => {
    const launchAngles = [5.1, 4.4, 5.2, 4.05, 5.05, 4.5];
    for (let i = 0; i < WHEELS.length - 1; i++) {
      const result = land(jump(onWheel(i, launchAngles[i])));
      expect(result.wheel, `wheel ${i + 1} must reach ${i + 2}`).toBe(i + 1);
      expect(result.status).toBe("running");
    }
  });

  it("slides in either direction relative to a wheel and resumes riding on release", () => {
    for (let i = 0; i < WHEELS.length - 1; i++) {
      const wheel = WHEELS[i], state = onWheel(i, -Math.PI / 2);
      for (const direction of [-1, 1] as const) {
        const moved = step(state, direction);
        expect(moved.angle - state.angle).toBeCloseTo((wheel.speed + direction * SLIDE_SPEED / (wheel.radius + PLAYER_RADIUS)) * STEP);
        expect(Math.hypot(moved.x - wheel.x, moved.y - wheel.y)).toBeCloseTo(wheel.radius + PLAYER_RADIUS);
        expect(step(moved).angle - moved.angle).toBeCloseTo(wheel.speed * STEP);
      }
    }
  });

  it("previews sliding momentum accurately and prevents steering after takeoff", () => {
    const state = Object.freeze(onWheel(0, 5));
    const original = { ...state };
    for (const direction of [-1, 1] as const) {
      let actual = jump(state, direction);
      const forecast = predictTrajectory(state, direction);
      const c = Math.cos(state.angle), s = Math.sin(state.angle);
      expect(-actual.vx * s + actual.vy * c).toBeCloseTo(WHEELS[0].speed * (WHEELS[0].radius + PLAYER_RADIUS) + direction * SLIDE_SPEED);
      expect(step(actual, -1)).toEqual(step(actual, 1));
      for (const point of forecast.slice(1)) {
        actual = step(actual);
        expect(point).toEqual({ x: actual.x, y: actual.y });
      }
    }
    expect(state).toEqual(original);
  });

  it("rides each wheel at its own radius and speed and inherits its launch momentum", () => {
    WHEELS.forEach((wheel, i) => {
      const riding = step(onWheel(i, -Math.PI / 2));
      expect(Math.hypot(riding.x - wheel.x, riding.y - wheel.y)).toBeCloseTo(wheel.radius + PLAYER_RADIUS);
      expect(riding.angle).toBeCloseTo(-Math.PI / 2 + wheel.speed * STEP);
      const launched = jump(riding);
      const c = Math.cos(riding.angle), s = Math.sin(riding.angle);
      expect(launched.vx * c + launched.vy * s).toBeCloseTo(JUMP_SPEED);
      expect(-launched.vx * s + launched.vy * c).toBeCloseTo(wheel.speed * (wheel.radius + PLAYER_RADIUS));
    });
  });

  it("can complete all three increasingly difficult levels before lava catches the player", () => {
    let state = start(newGame());
    expect(state.y).toBeGreaterThan(SURFACE_Y);
    let totalTime = 0;
    for (let level = 0; level < LEVELS.length; level++) {
      for (let tick = 0; tick < 90 / STEP && state.status === "running"; tick++) {
        if (shouldJump(state)) state = jump(state);
        state = step(state);
      }
      expect(state.level).toBe(level);
      expect(state.status).toBe(level === LEVELS.length - 1 ? "won" : "cleared");
      expect(state.highest).toBe(6);
      expect(state.y).toBeLessThan(SURFACE_Y);
      totalTime += state.elapsed;
      if (level < LEVELS.length - 1) {
        const jumps = state.jumps;
        state = advanceLevel(state);
        expect(state.jumps).toBe(jumps);
        expect(state.elapsed).toBe(0);
        expect(state.lava).toBe(1160);
      }
    }
    expect(state.jumps).toBe(21);
    expect(totalTime).toBeLessThan(120);
    expect(advanceLevel(state)).toBe(state);
    expect(advanceLevel(newGame())).toEqual(newGame());
    WHEELS.forEach((wheel, i) => {
      expect(Math.abs(LEVELS[1].wheels[i].speed)).toBeGreaterThan(Math.abs(wheel.speed));
      expect(Math.abs(LEVELS[2].wheels[i].speed)).toBeGreaterThan(Math.abs(LEVELS[1].wheels[i].speed));
    });
  });

  it("keeps every wheel fully underground and does not clear a level by riding the highest wheel", () => {
    LEVELS.forEach(level => level.wheels.forEach(wheel => {
      expect(wheel.y - wheel.radius - PLAYER_RADIUS).toBeGreaterThan(SURFACE_Y);
    }));
    let state = onWheel(WHEELS.length - 1, -Math.PI / 2);
    for (let i = 0; i < 10 / STEP; i++) state = step(state);
    expect(state.wheel).toBe(WHEELS.length - 1);
    expect(state.status).toBe("running");
    expect(state.y).toBeGreaterThan(SURFACE_Y);
  });

  it("requires the final upward jump and stops the preview at the surface exit", () => {
    const top = WHEELS.length - 1;
    for (let level = 0; level < LEVELS.length; level++) {
      const state = { ...onWheel(top, -Math.PI / 2), level };
      const forecast = predictTrajectory(state);
      const escaped = land(jump(state));
      expect(escaped.status).toBe(level === LEVELS.length - 1 ? "won" : "cleared");
      expect(escaped.wheel).toBeNull();
      expect(escaped.launchWheel).toBe(top);
      expect(escaped.vy).toBeLessThan(0);
      expect(escaped.y + PLAYER_RADIUS).toBeLessThanOrEqual(SURFACE_Y);
      expect(forecast.at(-1)).toEqual({ x: escaped.x, y: escaped.y });
    }
    const nearSurface = { ...jump(onWheel(top, -Math.PI / 2)), y: SURFACE_Y - 2, vy: -10 };
    expect(step(nearSurface).status).toBe("running"); // Feet are still underground.
    const fromLowerWheel = { ...nearSurface, y: SURFACE_Y - PLAYER_RADIUS + 1, vy: -340, launchWheel: top - 1 };
    const lowerResult = step(fromLowerWheel);
    expect(lowerResult.y + PLAYER_RADIUS).toBeLessThan(SURFACE_Y);
    expect(lowerResult.status).toBe("running");
    const falling = { ...nearSurface, y: SURFACE_Y - PLAYER_RADIUS + 1, vy: 20 };
    expect(step(falling).status).toBe("running");
  });

  it("rotates blocked sections with their wheels, including across the angle wrap", () => {
    const wheel = LEVELS[1].wheels[1], arc = wheel.blocked!;
    for (const elapsed of [0, 2.5, 12]) {
      const angle = arc.start + arc.sweep / 2 + wheel.speed * elapsed;
      expect(isBlocked(wheel, angle + 4 * Math.PI, elapsed)).toBe(true);
      expect(isBlocked(wheel, angle + Math.PI, elapsed)).toBe(false);
      expect(isBlocked(WHEELS[1], angle, elapsed)).toBe(false);
    }
  });

  it("bounces from blocked sections, attaches to plain rims, and predicts the reflected path", () => {
    const wheel = LEVELS[1].wheels[1], arc = wheel.blocked!;
    function approach(angle: number): GameState {
      const radius = wheel.radius + PLAYER_RADIUS + 12;
      return { ...start(newGame(1)), wheel: null, launchWheel: null, clearedLaunch: true,
        x: wheel.x + Math.cos(angle) * radius, y: wheel.y + Math.sin(angle) * radius,
        vx: -Math.cos(angle) * 300, vy: -Math.sin(angle) * 300 };
    }
    const angle = arc.start + arc.sweep / 2;
    let bounced = approach(angle);
    for (let i = 0; i < 30 && bounced.bounces === 0; i++) bounced = step(bounced);
    expect(bounced.bounces).toBe(1);
    expect(bounced.wheel).toBeNull();
    const nx = Math.cos(bounced.angle), ny = Math.sin(bounced.angle);
    expect(bounced.vx * nx + bounced.vy * ny).toBeGreaterThan(0);
    const safe = land(approach(angle + Math.PI));
    expect(safe.wheel).toBe(1);
    expect(safe.bounces).toBe(0);
    expect(step(safe).wheel).toBe(1);

    // Find a jump that meets a striped section and verify the entire forecast,
    // including the bounce rather than stopping the path at the first impact.
    const source = { ...onWheel(0, 4.94), level: 1, elapsed: 2.25 };
    let actual = jump(source);
    for (const point of predictTrajectory(source).slice(1)) {
      actual = step(actual);
      expect(point).toEqual({ x: actual.x, y: actual.y });
    }
    expect(actual.bounces).toBeGreaterThan(0);
  });

  it("pushes a player off when sliding onto a blocked section, but lets them ride a safe section", () => {
    const wheel = LEVELS[1].wheels[1], angle = wheel.blocked!.start - 0.03;
    let state: GameState = { ...onWheel(1, angle), level: 1 };
    for (let i = 0; i < 120; i++) state = step(state);
    expect(state.wheel).toBe(1);
    expect(state.bounces).toBe(0);
    state = { ...onWheel(1, angle), level: 1 };
    for (let i = 0; i < 20 && state.wheel !== null; i++) state = step(state, 1);
    expect(state.wheel).toBeNull();
    expect(state.bounces).toBe(1);
    expect(state.jumps).toBe(0);
  });

  it("allows a lower wheel to catch a missed jump", () => {
    const falling = { ...start(newGame()), wheel: null, launchWheel: 1, clearedLaunch: true,
      highest: 1, x: WHEELS[0].x, y: WHEELS[0].y - WHEELS[0].radius - PLAYER_RADIUS - 40, vx: 0, vy: 200 };
    const result = land(falling);
    expect(result.wheel).toBe(0);
    expect(result.highest).toBe(1);
    expect(result.status).toBe("running");
  });

  it("uses swept collision checks so a fast fall cannot pass through a wheel", () => {
    const result = step({ ...start(newGame()), wheel: null, launchWheel: 1, clearedLaunch: true,
      x: WHEELS[0].x, y: WHEELS[0].y - WHEELS[0].radius - PLAYER_RADIUS - 30, vy: 30000 });
    expect(result.wheel).toBe(0);
    expect(result.y).toBeCloseTo(WHEELS[0].y - WHEELS[0].radius - PLAYER_RADIUS);
  });

  it("ignores jumps in flight and freezes ready and terminal states", () => {
    const ready = newGame();
    expect(jump(ready)).toBe(ready);
    expect(step(ready)).toBe(ready);
    const airborne = jump(start(ready));
    expect(jump(airborne)).toBe(airborne);
    for (const status of ["cleared", "won", "lost"] as const) {
      const ended = { ...airborne, status };
      expect(jump(ended)).toBe(ended);
      expect(step(ended)).toBe(ended);
      expect(predictTrajectory(ended)).toEqual([]);
    }
  });

  it("ends a round when rising lava reaches a player and resets deterministically", () => {
    let state = start(newGame());
    for (let i = 0; i < 120 / STEP && state.status === "running"; i++) state = step(state);
    expect(state.status).toBe("lost");
    expect(state.elapsed).toBeLessThan(120);
    expect(newGame()).toEqual(newGame());
    expect(newGame().jumps).toBe(0);
  });
});

function setup() {
  let id = 0, now = 0;
  const pending = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { pending.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => pending.delete(handle));
  const el = document.createElement("div");
  document.body.append(el);
  const unmount = wheelEscape.mount(el);
  cleanups.push(unmount);
  const q = <T extends Element = HTMLElement>(selector: string) => el.querySelector<T>(selector)!;
  function frames(count: number) {
    for (let i = 0; i < count; i++) {
      now += 1000 / 60;
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach(callback => callback(now));
    }
  }
  return { el, q, frames, pending, unmount };
}

describe("Wheel Escape controls and comparison", () => {
  it("shows the surface, progresses through three levels, preserves the preview choice, and restarts at level one", () => {
    const { q, frames } = setup();
    const checkbox = q<HTMLInputElement>("[data-mechanic]");
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));
    q<HTMLButtonElement>("[data-start]").click();
    let model = start(newGame());
    expect(q("[data-ground-line]")).not.toBeNull();
    for (let level = 0; level < LEVELS.length; level++) {
      expect(q("[data-level-heading]").textContent).toContain(`Level ${level + 1} / 3`);
      expect(q("[data-zone]").textContent).toContain("Underground");
      expect(checkbox.disabled).toBe(true);
      expect(checkbox.checked).toBe(false);
      frames(1); // First animation callback establishes the timestamp.
      for (let frame = 0; frame < 60 * 90 && model.status === "running"; frame++) {
        if (shouldJump(model)) {
          q<HTMLButtonElement>("[data-jump]").click();
          model = jump(model);
        }
        frames(1);
        model = step(step(model));
      }
      expect(q("[data-zone]").textContent).toContain("Above ground");
      if (level < LEVELS.length - 1) {
        expect(q("[data-status]").textContent).toContain(`Level ${level + 1} cleared!`);
        expect(q<HTMLButtonElement>("[data-next-level]").hidden).toBe(false);
        const summary = q("[data-summary]").textContent;
        frames(60);
        expect(q("[data-summary]").textContent).toBe(summary);
        q<HTMLButtonElement>("[data-next-level]").click();
        model = advanceLevel(model);
      }
    }
    expect(q("[data-status]").textContent).toContain("escaped all three levels");
    expect(q<HTMLElement>("[data-reflection]").hidden).toBe(false);
    expect(q<HTMLButtonElement>("[data-next-level]").hidden).toBe(true);
    q<HTMLButtonElement>("[data-restart]").click();
    expect(q("[data-level-heading]").textContent).toContain("Level 1 / 3");
    expect(checkbox.disabled).toBe(false);
  }, 15000);

  it("changes only the preview: identical input timing produces identical movement and lava in both modes", () => {
    const game = setup();
    const snapshots: string[][] = [];
    for (const enabled of [true, false]) {
      game.q<HTMLButtonElement>("[data-restart]").click();
      const checkbox = game.q<HTMLInputElement>("[data-mechanic]");
      checkbox.checked = enabled;
      checkbox.dispatchEvent(new Event("change"));
      game.q<HTMLButtonElement>("[data-start]").click();
      expect(checkbox.disabled).toBe(true);
      expect(game.q<SVGElement>("[data-trajectory]").style.display).toBe(enabled ? "" : "none");
      const record = () => [game.q(".we-explorer").getAttribute("transform")!,
        game.q("[data-lava]").getAttribute("y")!, game.q("[data-summary]").textContent!].join("|");
      const run = [record()];
      game.q(".we-stage").dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight", bubbles: true }));
      game.frames(12);
      game.q<HTMLButtonElement>("[data-jump]").click();
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowRight" }));
      game.frames(30);
      run.push(record());
      game.frames(60);
      run.push(record());
      snapshots.push(run);
    }
    expect(snapshots[0]).toEqual(snapshots[1]);
  });

  it("supports held arrow keys, cancels opposite directions, and releases keys even outside the game", () => {
    const { q, frames } = setup();
    q<HTMLButtonElement>("[data-start]").click();
    frames(1);
    const stage = q(".we-stage");
    const angle = () => {
      const coords = q(".we-explorer").getAttribute("transform")!.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!;
      return Math.atan2(Number(coords[2]) - WHEELS[0].y, Number(coords[1]) - WHEELS[0].x);
    };
    const delta = (before: number) => Math.atan2(Math.sin(angle() - before), Math.cos(angle() - before));
    const keyDown = (code: string) => stage.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }));
    let before = angle();
    expect(keyDown("ArrowRight")).toBe(false); // Prevent page scrolling.
    frames(6);
    expect(delta(before)).toBeCloseTo((WHEELS[0].speed + SLIDE_SPEED / (WHEELS[0].radius + PLAYER_RADIUS)) / 10);
    expect(q("[data-move='right']").getAttribute("aria-pressed")).toBe("true");
    before = angle();
    keyDown("ArrowLeft");
    frames(6);
    expect(delta(before)).toBeCloseTo(WHEELS[0].speed / 10);
    before = angle();
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowRight" }));
    frames(6);
    expect(delta(before)).toBeLessThan(0);
    before = angle();
    window.dispatchEvent(new Event("blur"));
    frames(6);
    expect(delta(before)).toBeCloseTo(WHEELS[0].speed / 10);
    expect(q("[data-move='left']").getAttribute("aria-pressed")).toBe("false");
  });

  it("supports held pointer controls, cancellation, and clearing movement on pause and restart", () => {
    const { q, frames } = setup();
    q<HTMLButtonElement>("[data-start]").click();
    const right = q<HTMLButtonElement>("[data-move='right']");
    const pointer = (type: string) => right.dispatchEvent(Object.assign(new Event(type, { bubbles: true, cancelable: true }), { pointerId: 4, button: 0 }));
    pointer("pointerdown");
    frames(6);
    expect(right.getAttribute("aria-pressed")).toBe("true");
    pointer("pointercancel");
    expect(right.getAttribute("aria-pressed")).toBe("false");
    pointer("pointerdown");
    q<HTMLButtonElement>("[data-pause]").click();
    expect(right.getAttribute("aria-pressed")).toBe("false");
    q<HTMLButtonElement>("[data-pause]").click();
    expect(right.getAttribute("aria-pressed")).toBe("false");
    pointer("pointerdown");
    q<HTMLButtonElement>("[data-restart]").click();
    expect(right.getAttribute("aria-pressed")).toBe("false");
    expect(right.hidden).toBe(true);
  });

  it("jumps on a second pointer press while a movement button remains held", () => {
    const { q, frames } = setup();
    q<HTMLButtonElement>("[data-start]").click();
    q("[data-move='right']").dispatchEvent(Object.assign(new Event("pointerdown", { bubbles: true, cancelable: true }), { pointerId: 1, button: 0 }));
    frames(12);
    q("[data-jump]").dispatchEvent(Object.assign(new Event("pointerdown", { bubbles: true, cancelable: true }), { pointerId: 2, button: 0 }));
    expect(q("[data-summary]").textContent).toContain("Jumps: 1");
    q("[data-jump]").dispatchEvent(new MouseEvent("click", { detail: 1, bubbles: true }));
    expect(q("[data-summary]").textContent).toContain("Jumps: 1");
  });

  it("handles keyboard jumps, ignores repeat keys, and pauses without advancing lava", () => {
    const { q, frames } = setup();
    q<HTMLButtonElement>("[data-start]").click();
    const stage = q(".we-stage");
    stage.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", repeat: true, bubbles: true }));
    expect(q("[data-summary]").textContent).toContain("Jumps: 0");
    stage.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
    expect(q("[data-summary]").textContent).toContain("Jumps: 1");
    q<HTMLButtonElement>("[data-pause]").click();
    const lava = q("[data-lava]").getAttribute("y");
    frames(60);
    expect(q("[data-lava]").getAttribute("y")).toBe(lava);
    expect(q("[data-status]").textContent).toBe("Paused. Resume when you are ready.");
    q<HTMLButtonElement>("[data-pause]").click();
    frames(12);
    expect(Number(q("[data-lava]").getAttribute("y"))).toBeLessThan(Number(lava));
  });

  it("pauses on a hidden tab and cancels animation/listeners on unmount", () => {
    const { q, pending, unmount, el } = setup();
    q<HTMLButtonElement>("[data-start]").click();
    expect(pending.size).toBe(1);
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(pending.size).toBe(0);
    q<HTMLButtonElement>("[data-pause]").click();
    expect(pending.size).toBe(1);
    const remove = vi.spyOn(document, "removeEventListener");
    unmount();
    expect(pending.size).toBe(0);
    expect(el.childNodes.length).toBe(0);
    expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  it("offers reflection and a quick restart after a loss", () => {
    const { q, frames, pending } = setup();
    q<HTMLButtonElement>("[data-start]").click();
    frames(900);
    expect(q("[data-status]").textContent).toContain("lava caught you");
    expect(q<HTMLElement>("[data-reflection]").hidden).toBe(false);
    expect(q("[data-reflection]").textContent).toContain("What did you feel?");
    expect(pending.size).toBe(0);
    q<HTMLButtonElement>("[data-restart]").click();
    expect(q<HTMLInputElement>("[data-mechanic]").disabled).toBe(false);
    expect(q("[data-summary]").textContent).toContain("Jumps: 0");
    expect(q("[data-lava]").getAttribute("y")).toBe("1160");
  });
});
