/** Deterministic rules shared by actual jumps and the optional preview. */
export const WIDTH = 360;
export const HEIGHT = 1180;
export const VIEW_HEIGHT = 520;
export const STEP = 1 / 120;
export const PLAYER_RADIUS = 6;
export const GRAVITY = 480;
export const JUMP_SPEED = 340;
export const LAVA_SPEED = 10.8;
export const PREVIEW_SECONDS = 1.5;
// All wheel rims (including the highest one at y=118) stay beneath this line.
export const SURFACE_Y = 80;
const BOUNCE_SPEED = 135;
const BOUNCE_RESTITUTION = 0.85;
/** Speed along the rim relative to the wheel, in world units per second. */
export const SLIDE_SPEED = 85;
export type MoveDirection = -1 | 0 | 1; // Counterclockwise, ride, clockwise.

export interface BlockedArc { start: number; sweep: number }
export interface Wheel { x: number; y: number; radius: number; speed: number; blocked?: BlockedArc }
export interface Level { name: string; wheels: readonly Wheel[] }
// Authored irregular layout: both preview settings replay this exact course.
// Speed is signed radians per second; size and speed also affect launch momentum.
export const WHEELS: readonly Wheel[] = Object.freeze([
  { x: 100, y: 1050, radius: 50, speed: 0.58 },
  { x: 248, y: 900, radius: 32, speed: -1.05 },
  { x: 168, y: 755, radius: 44, speed: -0.72 },
  { x: 278, y: 610, radius: 28, speed: 1.25 },
  { x: 104, y: 470, radius: 52, speed: 0.52 },
  { x: 218, y: 315, radius: 34, speed: -0.9 },
  { x: 146, y: 160, radius: 42, speed: 0.8 },
].map(wheel => Object.freeze(wheel)));
export const LEVELS: readonly Level[] = Object.freeze([
  Object.freeze({ name: "First light", wheels: WHEELS }),
  Object.freeze({ name: "Unsteady ascent", wheels: Object.freeze(WHEELS.map((wheel, i) => Object.freeze({
    ...wheel, speed: wheel.speed * 1.2,
    ...([1, 3, 5].includes(i) ? { blocked: Object.freeze({ start: i * 0.9, sweep: Math.PI / 5 }) } : {}),
  }))) }),
  Object.freeze({ name: "Furnace escape", wheels: Object.freeze(WHEELS.map((wheel, i) => Object.freeze({
    ...wheel, speed: wheel.speed * 1.45,
    ...(i > 0 && i < WHEELS.length - 1 ? { blocked: Object.freeze({ start: i * 0.9, sweep: Math.PI / 3 }) } : {}),
  }))) }),
]);
export interface Point { x: number; y: number }
export interface GameState extends Point {
  level: number;
  vx: number; vy: number; angle: number;
  wheel: number | null; launchWheel: number | null; clearedLaunch: boolean;
  elapsed: number; lava: number; jumps: number; highest: number; bounces: number;
  status: "ready" | "running" | "cleared" | "won" | "lost";
}
export function newGame(level = 0): GameState {
  if (!Number.isInteger(level) || !LEVELS[level]) throw new RangeError("Unknown level");
  const wheel = LEVELS[level].wheels[0];
  return {
    level,
    x: wheel.x - wheel.radius - PLAYER_RADIUS, y: wheel.y,
    vx: 0, vy: 0, angle: -Math.PI, wheel: 0, launchWheel: null,
    clearedLaunch: false, elapsed: 0, lava: 1160, jumps: 0, highest: 0, bounces: 0, status: "ready",
  };
}
export function start(state: GameState): GameState {
  return state.status === "ready" ? { ...state, status: "running" } : state;
}
export function advanceLevel(state: GameState): GameState {
  if (state.status !== "cleared" || state.level >= LEVELS.length - 1) return state;
  return { ...start(newGame(state.level + 1)), jumps: state.jumps, bounces: state.bounces };
}

/** The blocked arc is attached to the wheel, so its world orientation changes over time. */
export function isBlocked(wheel: Wheel, angle: number, elapsed: number): boolean {
  if (!wheel.blocked) return false;
  const turn = Math.PI * 2;
  const local = ((angle - wheel.speed * elapsed - wheel.blocked.start) % turn + turn) % turn;
  return local < wheel.blocked.sweep;
}

function takeoff(state: GameState, move: MoveDirection, outwardSpeed: number): GameState {
  const wheel = LEVELS[state.level].wheels[state.wheel!];
  const tangent = wheel.speed * (wheel.radius + PLAYER_RADIUS) + move * SLIDE_SPEED;
  const c = Math.cos(state.angle), s = Math.sin(state.angle);
  return { ...state, wheel: null, launchWheel: state.wheel, clearedLaunch: false,
    vx: c * outwardSpeed - s * tangent, vy: s * outwardSpeed + c * tangent };
}
export function jump(state: GameState, move: MoveDirection = 0): GameState {
  if (state.status !== "running" || state.wheel === null) return state;
  return { ...takeoff(state, move, JUMP_SPEED), jumps: state.jumps + 1 };
}
/** First intersection of a movement segment and a wheel's expanded surface. */
function contact(from: Point, to: Point, wheel: Wheel): number | null {
  const dx = to.x - from.x, dy = to.y - from.y;
  const ox = from.x - wheel.x, oy = from.y - wheel.y;
  const a = dx * dx + dy * dy, b = 2 * (ox * dx + oy * dy);
  const c = ox * ox + oy * oy - (wheel.radius + PLAYER_RADIUS) ** 2;
  if (a === 0 || b >= 0 || c < -0.001) return null;
  const d = b * b - 4 * a * c;
  if (d < 0) return null;
  const t = (-b - Math.sqrt(d)) / (2 * a);
  return t >= -0.000001 && t <= 1 ? Math.max(0, t) : null;
}
/** Advance one fixed tick without mutating the input. */
export function step(state: GameState, move: MoveDirection = 0): GameState {
  if (state.status !== "running") return state;
  const wheels = LEVELS[state.level].wheels;
  const next: GameState = { ...state, elapsed: state.elapsed + STEP, lava: state.lava - LAVA_SPEED * STEP };
  if (state.wheel !== null) {
    const wheel = wheels[state.wheel];
    next.angle += (wheel.speed + move * SLIDE_SPEED / (wheel.radius + PLAYER_RADIUS)) * STEP;
    next.x = wheel.x + Math.cos(next.angle) * (wheel.radius + PLAYER_RADIUS);
    next.y = wheel.y + Math.sin(next.angle) * (wheel.radius + PLAYER_RADIUS);
    if (isBlocked(wheel, next.angle, next.elapsed)) {
      Object.assign(next, takeoff(next, move, BOUNCE_SPEED), { bounces: state.bounces + 1 });
    }
  } else {
    next.x += state.vx * STEP;
    next.y += state.vy * STEP + GRAVITY * STEP * STEP / 2;
    next.vy += GRAVITY * STEP;
    const source = state.launchWheel === null ? null : wheels[state.launchWheel];
    next.clearedLaunch = state.clearedLaunch || source === null ||
      Math.hypot(state.x - source.x, state.y - source.y) > source.radius + PLAYER_RADIUS + 1;
    let first = Infinity, landing = -1;
    wheels.forEach((wheel, index) => {
      if (index === state.launchWheel && !next.clearedLaunch) return;
      const t = contact(state, next, wheel);
      if (t !== null && t < first) { first = t; landing = index; }
    });
    if (landing !== -1) {
      const wheel = wheels[landing];
      next.angle = Math.atan2(state.y + (next.y - state.y) * first - wheel.y,
        state.x + (next.x - state.x) * first - wheel.x);
      next.x = wheel.x + Math.cos(next.angle) * (wheel.radius + PLAYER_RADIUS);
      next.y = wheel.y + Math.sin(next.angle) * (wheel.radius + PLAYER_RADIUS);
      const contactTime = state.elapsed + first * STEP;
      if (isBlocked(wheel, next.angle, contactTime)) {
        const nx = Math.cos(next.angle), ny = Math.sin(next.angle);
        const incomingY = state.vy + GRAVITY * first * STEP;
        const normalSpeed = state.vx * nx + incomingY * ny;
        next.vx = state.vx - (1 + BOUNCE_RESTITUTION) * normalSpeed * nx;
        next.vy = incomingY - (1 + BOUNCE_RESTITUTION) * normalSpeed * ny;
        next.x += nx * 0.5;
        next.y += ny * 0.5;
        next.launchWheel = landing;
        next.clearedLaunch = false;
        next.bounces++;
      } else {
        // Carry the contact point through the remaining fraction of this tick,
        // keeping it aligned with the rotating safe/blocked sections.
        next.angle += wheel.speed * (1 - first) * STEP;
        next.x = wheel.x + Math.cos(next.angle) * (wheel.radius + PLAYER_RADIUS);
        next.y = wheel.y + Math.sin(next.angle) * (wheel.radius + PLAYER_RADIUS);
        next.wheel = landing;
        next.vx = next.vy = 0;
        next.highest = Math.max(state.highest, landing);
      }
    }
    // Solid cavern walls keep missed jumps visible and allow recovery below.
    if (next.x < PLAYER_RADIUS || next.x > WIDTH - PLAYER_RADIUS) {
      next.x = Math.max(PLAYER_RADIUS, Math.min(WIDTH - PLAYER_RADIUS, next.x));
      next.vx = 0;
    }
    if (next.y < PLAYER_RADIUS) { next.y = PLAYER_RADIUS; next.vy = Math.max(0, next.vy); }
  }
  if (next.y + PLAYER_RADIUS >= next.lava) next.status = "lost";
  else if (state.wheel === null && next.wheel === null &&
    state.launchWheel === wheels.length - 1 && next.launchWheel === wheels.length - 1 &&
    state.y + PLAYER_RADIUS >= SURFACE_Y && next.y + PLAYER_RADIUS <= SURFACE_Y && next.vy < 0) {
    // Reaching the top wheel is preparation; the final upward jump clears the level.
    next.status = state.level === LEVELS.length - 1 ? "won" : "cleared";
  }
  return next;
}
/** Forecast on a copy; stop at contact/death or the preview time limit. */
export function predictTrajectory(state: GameState, move: MoveDirection = 0): Point[] {
  if (state.status !== "running" || state.wheel === null) return [];
  let simulated = jump(state, move);
  const points: Point[] = [{ x: simulated.x, y: simulated.y }];
  for (let i = 0; i < Math.round(PREVIEW_SECONDS / STEP); i++) {
    simulated = step(simulated);
    points.push({ x: simulated.x, y: simulated.y });
    if (simulated.wheel !== null || simulated.status !== "running") break;
  }
  return points;
}
