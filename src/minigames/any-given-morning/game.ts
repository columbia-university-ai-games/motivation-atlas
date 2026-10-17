import { COPY, DEATH_TEXT, DEED_TEXT, NPC_TEXT, type DeathKind, type DeedId } from "./text";
import { BIOMES, generateArea, isWalkable, mulberry32, seedFor, TRACE_KINDS, type Area, type Biome, type ItemKind, type LegacyTrace, type Npc, type Point, type Rng, type Station } from "./world";
export { mulberry32 } from "./world";

export const LIFESPAN_BASE = 20;
export const LIFESPAN_JITTER = 4;
export const TELEGRAPH = 1.3;
export const ROUND_LIVES = 5;
export const IMMORTAL_ROUND_SECONDS = 100;
export const DYING_SECONDS = 2.5;
export const LEGACY_CAP = 6;
export const MOVE_SPEED = 70;
export const INTERACTION_RADIUS = 22;
const EPSILON = 1e-9;

export type Screen = "MENU" | "PLAY" | "DYING" | "DEAD" | "LEDGER";
export interface ScreenMachine { screen: Screen }
export const SCREEN_TRANSITIONS: Record<Screen, readonly Screen[]> = {
  MENU: ["PLAY"],
  PLAY: ["DYING", "LEDGER", "MENU"],
  DYING: ["DEAD", "MENU"],
  DEAD: ["PLAY", "LEDGER", "MENU"],
  LEDGER: ["MENU"],
};
export function transition(machine: ScreenMachine, next: Screen): void {
  if (!SCREEN_TRANSITIONS[machine.screen].includes(next)) throw new Error(`Illegal screen transition ${machine.screen} -> ${next}`);
  machine.screen = next;
}

export interface DeathDefinition {
  kind: DeathKind;
  biomes: readonly Biome[];
  weight: number;
  peaceful: boolean;
  /** Stable animation identifier for the later renderer. */
  animation: string;
}
export const DEATHS: readonly DeathDefinition[] = [
  { kind: "meteor", biomes: BIOMES, weight: 3, peaceful: false, animation: "meteor_strike" },
  { kind: "lightning", biomes: BIOMES, weight: 2, peaceful: false, animation: "silhouette_ash" },
  { kind: "gator_explodes", biomes: ["riverside"], weight: 2, peaceful: false, animation: "gator_confetti" },
  { kind: "sinkhole", biomes: BIOMES, weight: 2, peaceful: false, animation: "ground_crack" },
  { kind: "ufo", biomes: BIOMES, weight: 2, peaceful: false, animation: "cow_beam" },
  { kind: "piano", biomes: BIOMES, weight: 2, peaceful: false, animation: "piano_drop" },
  { kind: "crows", biomes: BIOMES, weight: 1, peaceful: false, animation: "crow_cloud" },
  { kind: "tornado", biomes: BIOMES, weight: 2, peaceful: false, animation: "tornado_lift" },
  { kind: "hay_avalanche", biomes: ["farm"], weight: 2, peaceful: false, animation: "bale_topple" },
  { kind: "flood", biomes: ["riverside"], weight: 2, peaceful: false, animation: "water_wall" },
  { kind: "bloom", biomes: BIOMES, weight: 1, peaceful: true, animation: "flower_tree" },
  { kind: "lights_out", biomes: BIOMES, weight: 1, peaceful: true, animation: "sky_dim" },
  { kind: "wave_goodbye", biomes: BIOMES, weight: 1, peaceful: true, animation: "wave_fade" },
  { kind: "comet_pair", biomes: BIOMES, weight: 1, peaceful: false, animation: "double_strike" },
];

export function drawLifespan(rng: Rng): number {
  return LIFESPAN_BASE + (rng() * 2 - 1) * LIFESPAN_JITTER;
}

export function deathFor(biome: Biome, rng: Rng, previousKind: DeathKind | null = null): DeathDefinition {
  const choices = DEATHS.filter((death) => death.biomes.includes(biome) && death.kind !== previousKind);
  let draw = rng() * choices.reduce((total, death) => total + death.weight, 0);
  for (const death of choices) {
    draw -= death.weight;
    if (draw < 0) return death;
  }
  return choices[choices.length - 1];
}

export interface Deed { id: DeedId; text: string }
export interface LifeSummary {
  number: number;
  seconds: number;
  died: boolean;
  kind: DeathKind | null;
  cause: string;
  deedCount: number;
  deeds: Deed[];
}
export interface RoundState extends ScreenMachine {
  mortal: boolean;
  seed: number;
  lifeCount: number;
  history: LifeSummary[];
  legacy: LegacyTrace[];
  previousKind: DeathKind | null;
}
export interface Session { state: RoundState; life: Life | null }
export interface Life {
  /** Shared round state, without a circular reference to the session. */
  round: RoundState;
  number: number;
  world: Area;
  player: Point & { vx: number; vy: number };
  elapsed: number;
  deathAt: number | null;
  death: DeathDefinition | null;
  telegraphAt: number | null;
  telegraph: boolean;
  dyingElapsed: number;
  ended: boolean;
  deeds: Deed[];
  inventory: (ItemKind | "grain" | "water")[];
  idleSeconds: number;
  nearbySeconds: Record<string, number>;
  dialogue: string | null;
}
export interface Input { x?: number; y?: number; interact?: boolean }

/** Rules mutate the supplied session/life and return it for the host's next render. */
export function createSession(options: { mortal: boolean; seed: number }): Session {
  if (!Number.isSafeInteger(options.seed)) throw new RangeError("Seed must be a safe integer");
  return { state: { ...options, seed: options.seed >>> 0, screen: "MENU", lifeCount: 0, history: [], legacy: [], previousKind: null }, life: null };
}

export function startLife(session: Session): Life {
  const round = session.state;
  if (round.screen !== "MENU" && round.screen !== "DEAD") throw new Error("A life can start only from MENU or DEAD");
  if (round.lifeCount >= (round.mortal ? ROUND_LIVES : 1)) throw new Error("The round has no lives left");
  if (round.screen === "MENU" && round.lifeCount !== 0) throw new Error("Create a new session after returning to MENU");
  const index = round.lifeCount;
  const world = generateArea(seedFor(round.seed, index, 1), round.legacy);
  const deathAt = round.mortal ? drawLifespan(mulberry32(seedFor(round.seed, index, 2))) : null;
  const death = round.mortal ? deathFor(world.biome, mulberry32(seedFor(round.seed, index, 3)), round.previousKind) : null;
  const life: Life = {
    round, number: index + 1, world, player: { ...world.spawn, vx: 0, vy: 0 }, elapsed: 0,
    deathAt, death, telegraphAt: deathAt !== null && death && !death.peaceful ? deathAt - TELEGRAPH : null,
    telegraph: false, dyingElapsed: 0, ended: false, deeds: [], inventory: [], idleSeconds: 0, nearbySeconds: {}, dialogue: null,
  };
  transition(round, "PLAY");
  round.lifeCount++;
  session.life = life;
  return life;
}

/** DEAD waits for a button/key. The fifth life then opens the ledger. */
export function continueAfterDeath(session: Session): Life | null {
  if (session.state.screen !== "DEAD") throw new Error("Continue requires DEAD");
  if (session.state.lifeCount === ROUND_LIVES) {
    transition(session.state, "LEDGER");
    return null;
  }
  return startLife(session);
}

function recordDeed(life: Life, id: DeedId): void {
  if (!life.deeds.some((deed) => deed.id === id)) life.deeds.push({ id, text: DEED_TEXT[id] });
}

function finishLife(life: Life): void {
  if (life.ended) return;
  life.ended = true;
  life.round.history.push(summarizeLife(life));
  if (!life.round.mortal || !life.death) return;
  life.round.previousKind = life.death.kind;
  // Each deed leaves one trace. The final deeds of a life are the newest traces.
  const traces = life.deeds.map((deed, index): LegacyTrace => ({
    id: `${life.number}-${deed.id}`, deed: deed.id, life: life.number,
    kind: TRACE_KINDS[Math.floor(mulberry32(seedFor(life.round.seed, life.number * 32 + index, 4))() * TRACE_KINDS.length)],
  }));
  life.round.legacy = [...traces.reverse(), ...life.round.legacy].slice(0, LEGACY_CAP);
}

function near(a: Point, b: Point): boolean { return Math.hypot(a.x - b.x, a.y - b.y) <= INTERACTION_RADIUS; }
function take(life: Life, item: Life["inventory"][number]): void {
  if (!life.inventory.includes(item)) life.inventory.push(item);
}
function consume(life: Life, item: Life["inventory"][number]): boolean {
  const index = life.inventory.indexOf(item);
  if (index < 0) return false;
  life.inventory.splice(index, 1);
  return true;
}

function talk(life: Life, npc: Npc): string {
  const lines = NPC_TEXT[npc.archetype];
  if (npc.done) return lines.thanks;
  npc.talks++;
  let deed: DeedId | null = null;
  switch (npc.need) {
    case "hat": if (consume(life, "hat")) deed = "returned_hat"; break;
    case "stone": if (consume(life, "stone")) deed = "talked_to_child"; break;
    case "letter": if (consume(life, "letter")) deed = "delivered_letter"; break;
    case "line": if (npc.talks >= 2) deed = "helped_fisherman"; break;
    case "pet": deed = "pet_dog"; break;
    case "hello": deed = "said_hello"; break;
    case "quiet": npc.awake = true; deed = "woke_sleeper"; break;
  }
  if (deed) {
    recordDeed(life, deed);
    npc.done = true;
    return lines.thanks;
  }
  return npc.talks === 1 ? lines.ask : lines.again;
}

function useStation(life: Life, station: Station): string | null {
  switch (station.kind) {
    case "grain_sack": take(life, "grain"); return COPY.grain;
    case "trough":
      if (!consume(life, "grain")) return null;
      recordDeed(life, "fed_chickens");
      life.world.npcs.filter((npc) => npc.need === "grain").forEach((npc) => { npc.done = true; });
      return COPY.fed;
    case "well": take(life, "water"); return COPY.can;
    case "crop_plot":
      if (!consume(life, "water")) return null;
      recordDeed(life, "watered_crops");
      life.world.npcs.filter((npc) => npc.need === "water").forEach((npc) => { npc.done = true; });
      return COPY.watered;
    case "flowers": recordDeed(life, "picked_flowers"); return COPY.flowers;
    case "water_bank": recordDeed(life, "sat_by_water"); return COPY.water;
    case "bench": return null;
  }
}

/** Nearest reachable object wins. Input is ignored outside this life in PLAY. */
export function interact(life: Life): string | null {
  if (life.round.screen !== "PLAY" || life.ended) return null;
  life.idleSeconds = 0;
  life.nearbySeconds = {};
  const targets = [
    ...life.world.items.filter((item) => !item.taken).map((item) => ({ at: item, act: () => {
      item.taken = true; take(life, item.kind); return COPY.pickedUp[item.kind];
    } })),
    ...life.world.npcs.map((npc) => ({ at: npc, act: () => talk(life, npc) })),
    ...life.world.stations.map((station) => ({ at: station, act: () => useStation(life, station) })),
    ...life.world.traces.map((trace) => ({ at: trace, act: () => COPY.trace })),
  ].filter(({ at }) => near(life.player, at)).sort((a, b) =>
    Math.hypot(a.at.x - life.player.x, a.at.y - life.player.y) - Math.hypot(b.at.x - life.player.x, b.at.y - life.player.y));
  life.dialogue = targets[0]?.act() ?? null;
  return life.dialogue;
}

function approach(value: number, target: number, amount: number): number {
  return value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);
}
function canStand(world: Area, x: number, y: number): boolean {
  return [-4, 4].every((dx) => [-4, 4].every((dy) => isWalkable(world, x + dx, y + dy)));
}
function advance(life: Life, dt: number, input: Input): void {
  const x = input.x ?? 0, y = input.y ?? 0;
  const magnitude = Math.max(1, Math.hypot(x, y));
  const moving = x !== 0 || y !== 0;
  const acceleration = moving ? 450 : 600;
  const player = life.player;
  player.vx = approach(player.vx, x / magnitude * MOVE_SPEED, acceleration * dt);
  player.vy = approach(player.vy, y / magnitude * MOVE_SPEED, acceleration * dt);
  const nextX = player.x + player.vx * dt, nextY = player.y + player.vy * dt;
  if (canStand(life.world, nextX, player.y)) player.x = nextX; else player.vx = 0;
  if (canStand(life.world, player.x, nextY)) player.y = nextY; else player.vy = 0;
  life.elapsed += dt;
  const idle = !moving && !input.interact && Math.hypot(player.vx, player.vy) < 1;
  life.idleSeconds = idle ? life.idleSeconds + dt : 0;
  if (life.idleSeconds + EPSILON >= 4) recordDeed(life, "looked_at_sky");
  for (const npc of life.world.npcs) {
    // Slight wander stays inside the home tile and cannot affect collision.
    npc.x = npc.home.x + Math.sin(life.elapsed * 0.7 + npc.phase) * 1.5;
    npc.y = npc.home.y + Math.sin(life.elapsed * 0.5 + npc.phase) * 1.5;
    const quiet = idle && near(player, npc) && !npc.awake;
    life.nearbySeconds[npc.id] = quiet ? (life.nearbySeconds[npc.id] ?? 0) + dt : 0;
    if (npc.need === "quiet" && life.nearbySeconds[npc.id] + EPSILON >= 3) recordDeed(life, "let_sleeper_sleep");
    if (npc.need === "company" && life.nearbySeconds[npc.id] + EPSILON >= 2) {
      recordDeed(life, "listened_to_couple");
      npc.done = true;
    }
  }
}

/** dt is seconds. Large steps are subdivided for collision, then clipped at the deadline. */
export function step(life: Life, dt: number, input: Input = {}): Life {
  if (!Number.isFinite(dt) || dt < 0) throw new RangeError("dt must be finite and nonnegative");
  if (![input.x ?? 0, input.y ?? 0].every(Number.isFinite)) throw new RangeError("Movement must be finite");
  const round = life.round;
  // An old life must never advance the shared state after a respawn.
  if (life.number !== round.lifeCount) return life;
  if (round.screen === "DYING") {
    life.dyingElapsed = Math.min(DYING_SECONDS, life.dyingElapsed + dt);
    if (life.dyingElapsed + EPSILON >= DYING_SECONDS) transition(round, "DEAD");
    return life;
  }
  if (round.screen !== "PLAY" || life.ended) return life;
  if (input.interact) interact(life);
  const deadline = life.deathAt ?? IMMORTAL_ROUND_SECONDS;
  const activeTime = Math.min(dt, Math.max(0, deadline - life.elapsed));
  let remaining = activeTime;
  while (remaining > 0) {
    const frame = Math.min(1 / 60, remaining);
    advance(life, frame, input);
    remaining = Math.max(0, remaining - frame);
  }
  life.telegraph = life.telegraphAt !== null && life.elapsed + EPSILON >= life.telegraphAt;
  if (life.elapsed + EPSILON >= deadline) {
    life.elapsed = deadline;
    finishLife(life);
    transition(round, round.mortal ? "DYING" : "LEDGER");
    if (round.mortal) step(life, Math.max(0, dt - activeTime));
  }
  return life;
}

export function summarizeLife(life: Life): LifeSummary {
  const died = life.ended && life.round.mortal;
  return {
    number: life.number, seconds: life.elapsed, died, kind: died ? life.death!.kind : null,
    cause: died ? DEATH_TEXT[life.death!.kind] : COPY.dayEnded,
    deedCount: life.deeds.length, deeds: life.deeds.map((deed) => ({ ...deed })),
  };
}

export function summarizeRound(session: Session): { mortal: boolean; mode: string; lives: LifeSummary[]; seconds: number; deedCount: number; deedsPerMinute: number } {
  const lives = session.state.history.map((life) => ({ ...life, deeds: life.deeds.map((deed) => ({ ...deed })) }));
  const seconds = lives.reduce((sum, life) => sum + life.seconds, 0);
  const deedCount = lives.reduce((sum, life) => sum + life.deedCount, 0);
  return { mortal: session.state.mortal, mode: session.state.mortal ? COPY.mortalMode : COPY.immortalMode,
    lives, seconds, deedCount, deedsPerMinute: seconds > 0 ? deedCount * 60 / seconds : 0 };
}
