import type { Archetype, DeedId } from "./text";

export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 12;
export const TILE_SIZE = 16;
export const MIN_INTERACTABLE_SPACING = 2 * TILE_SIZE;
export const BIOMES = ["farm", "riverside", "orchard", "village_edge"] as const;
export type Biome = typeof BIOMES[number];
export type Rng = () => number;
export interface Point { x: number; y: number }
export type ItemKind = "hat" | "stone" | "letter" | "apple";
export type Need = "hat" | "grain" | "stone" | "line" | "company" | "pet" | "letter" | "quiet" | "water" | "hello" | "sky" | "flowers";
export interface Npc extends Point {
  id: string;
  archetype: Archetype;
  need: Need;
  home: Point;
  phase: number;
  talks: number;
  done: boolean;
  awake: boolean;
}
export interface Item extends Point { id: string; kind: ItemKind; taken: boolean }
export type StationKind = "grain_sack" | "trough" | "well" | "crop_plot" | "flowers" | "water_bank" | "bench";
export interface Station extends Point { id: string; kind: StationKind }
export interface Prop extends Point { kind: string; blocking: boolean }
export interface Animal extends Point { kind: "chicken" | "cow" | "sheep" | "frog" | "gator"; hidden: boolean }
export const TRACE_KINDS = ["flower_patch", "stacked_hay", "hat_on_post", "cairn", "heart_in_dirt"] as const;
export interface LegacyTrace { id: string; kind: typeof TRACE_KINDS[number]; deed: DeedId; life: number }
export interface PlacedTrace extends LegacyTrace, Point {}
export interface Area {
  seed: number;
  biome: Biome;
  width: number;
  height: number;
  tileSize: number;
  spawn: Point;
  /** Row-major. True means solid. NPCs, animals and stations never block movement. */
  collision: boolean[][];
  npcs: Npc[];
  items: Item[];
  props: Prop[];
  stations: Station[];
  animals: Animal[];
  traces: PlacedTrace[];
  easterEgg: (Point & { kind: "boot_on_fence" }) | null;
}

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stateless seed derivation keeps world generation independent of player actions. */
export function seedFor(seed: number, index: number, stream: number): number {
  let value = (seed ^ Math.imul(index + 1, 0x9e3779b9) ^ stream) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

const ARCHETYPES: { archetype: Archetype; need: Need; biomes?: readonly Biome[] }[] = [
  { archetype: "hatless_farmer", need: "hat" },
  { archetype: "chicken_keeper", need: "grain", biomes: ["farm"] },
  { archetype: "river_child", need: "stone", biomes: ["riverside"] },
  { archetype: "fisherman", need: "line", biomes: ["riverside"] },
  { archetype: "couple", need: "company", biomes: ["orchard", "village_edge"] },
  { archetype: "dog", need: "pet" },
  { archetype: "letter_recipient", need: "letter" },
  { archetype: "sleeper", need: "quiet", biomes: ["farm", "orchard"] },
  { archetype: "gardener", need: "water", biomes: ["farm", "orchard", "village_edge"] },
  { archetype: "pie_seller", need: "hello", biomes: ["village_edge"] },
  { archetype: "neighbor", need: "hello" },
  { archetype: "cloud_watcher", need: "sky" },
  { archetype: "florist", need: "flowers", biomes: ["orchard", "village_edge"] },
  { archetype: "shepherd", need: "hello", biomes: ["farm"] },
];

export function tileCenter(x: number, y: number): Point {
  return { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
}

export function isWalkable(area: Pick<Area, "collision">, x: number, y: number): boolean {
  return area.collision[Math.floor(y / TILE_SIZE)]?.[Math.floor(x / TILE_SIZE)] === false;
}

/** Return tile coordinates in the spawn's four-connected component. */
export function reachableTiles(collision: boolean[][], spawn: Point): Point[] {
  const first = { x: Math.floor(spawn.x / TILE_SIZE), y: Math.floor(spawn.y / TILE_SIZE) };
  if (collision[first.y]?.[first.x] !== false) return [];
  const queue = [first];
  const seen = new Set([`${first.x},${first.y}`]);
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = at.x + dx, y = at.y + dy;
      const id = `${x},${y}`;
      if (collision[y]?.[x] !== false || seen.has(id)) continue;
      seen.add(id);
      queue.push({ x, y });
    }
  }
  return queue;
}

/** Place interactables only after terrain, in the spawn's connected component. */
export function generateArea(seed: number, legacy: readonly LegacyTrace[] = [], forcedBiome?: Biome): Area {
  const rng = mulberry32(seed);
  const integer = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  const biome = forcedBiome ?? BIOMES[integer(0, BIOMES.length - 1)];
  const collision = Array.from({ length: GRID_HEIGHT }, (_, y) =>
    Array.from({ length: GRID_WIDTH }, (_, x) => x === 0 || y === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1));
  const spawn = tileCenter(2, 6);
  const props: Prop[] = [];
  const prop = (kind: string, x: number, y: number, blocking = false) => {
    props.push({ kind, ...tileCenter(x, y), blocking });
    if (blocking) collision[y][x] = true;
  };
  if (biome === "farm") {
    // A 3 x 2 barn footprint. The visible prop anchors its top-left corner.
    prop("barn", 3, 2, true);
    for (let y = 2; y <= 3; y++) for (let x = 3; x <= 5; x++) collision[y][x] = true;
    prop("crop_plots", 9, 3);
    prop("fence", 8, 8, true);
  } else if (biome === "riverside") {
    for (let y = 1; y < GRID_HEIGHT - 1; y++) {
      for (let x = 15; x < GRID_WIDTH - 1; x++) collision[y][x] = true;
    }
    for (let x = 15; x <= 17; x++) collision[6][x] = false;
    prop("dock", 15, 6);
    prop("reeds", 14, 3);
    prop("reeds", 14, 9);
  } else if (biome === "orchard") {
    prop("fruit_bush", 6, 3, true);
    prop("fruit_bush", 10, 8, true);
    prop("bench", 8, 5);
  } else {
    prop("well", 7, 3);
    prop("market_stall", 10, 3, true);
    prop("bench", 9, 8);
    prop("lamp", 12, 6, true);
  }
  const propCount = integer(props.length, 6);
  while (props.length < propCount) {
    const x = integer(7, 13), y = integer(2, 9);
    if (collision[y][x] || props.some((p) => p.x === tileCenter(x, y).x && p.y === tileCenter(x, y).y)) continue;
    prop(biome === "farm" ? "hay_bale" : "bush", x, y, true);
  }

  // Fixed scene targets reserve their space before random placements.
  const free = reachableTiles(collision, spawn).filter((p) => !(p.x === 2 && p.y === 6));
  const occupied = new Set(props.map((p) => `${p.x},${p.y}`));
  const spaced: Point[] = [];
  const reserve = (at: Point): Point => {
    occupied.add(`${at.x},${at.y}`);
    spaced.push(at);
    return at;
  };
  const place = (close = false, interactable = false): Point => {
    const choices = free.filter((p) => {
      const center = tileCenter(p.x, p.y);
      return !occupied.has(`${center.x},${center.y}`) && (!interactable || spaced.every((at) => Math.hypot(center.x - at.x, center.y - at.y) >= MIN_INTERACTABLE_SPACING));
    });
    if (choices.length === 0) throw new Error("Area has no reachable placement tile");
    const nearby = close ? choices.filter((p) => Math.hypot(tileCenter(p.x, p.y).x - spawn.x, tileCenter(p.x, p.y).y - spawn.y) <= 112) : [];
    const candidates = nearby.length ? nearby : choices;
    const tile = candidates[integer(0, candidates.length - 1)];
    const at = tileCenter(tile.x, tile.y);
    occupied.add(`${at.x},${at.y}`);
    if (interactable) spaced.push(at);
    return at;
  };
  const pool = ARCHETYPES.filter((npc) => !npc.biomes || npc.biomes.includes(biome));
  const selected: typeof ARCHETYPES = [];
  let requiredItems = 0;
  const npcCount = integer(2, 4);
  while (selected.length < npcCount) {
    const index = integer(0, pool.length - 1);
    const [definition] = pool.splice(index, 1);
    const needsItem = ["hat", "stone", "letter"].includes(definition.need);
    if (needsItem && requiredItems >= 2) continue;
    if (needsItem) requiredItems++;
    selected.push(definition);
  }
  const stations: Station[] = [];
  const addStation = (kind: StationKind, position?: Point) => {
    if (stations.some((station) => station.kind === kind)) return;
    const at = position ? reserve(position) : place(true, true);
    stations.push({ id: kind, kind, ...at });
  };
  if (biome === "riverside") addStation("water_bank", tileCenter(14, 6));
  const bench = props.find((prop) => prop.kind === "bench");
  const hasCouple = selected.some((npc) => npc.need === "company");
  if (bench) {
    if (hasCouple) reserve(bench);
    else addStation("bench", bench);
  }
  // An occupied bench has one target, the couple. It has no sitting station.
  const npcs: Npc[] = selected.map((definition) => {
    const home = definition.need === "company" && bench ? { x: bench.x, y: bench.y } : place(true, true);
    return { ...definition, id: definition.archetype, ...home, home, phase: rng() * Math.PI * 2, talks: 0, done: false, awake: false };
  });
  const items: Item[] = [];
  const addItem = (kind: ItemKind) => items.push({ id: `item-${items.length}`, kind, ...place(true, true), taken: false });
  for (const npc of npcs) {
    if (npc.need === "hat" || npc.need === "letter" || npc.need === "stone") addItem(npc.need);
  }
  const itemCount = Math.max(requiredItems, integer(1, 2));
  while (items.length < itemCount) addItem("apple");
  addStation("flowers");
  if (npcs.some((npc) => npc.need === "grain")) { addStation("grain_sack"); addStation("trough"); }
  if (npcs.some((npc) => npc.need === "water")) { addStation("well"); addStation("crop_plot"); }
  const animals: Animal[] = biome === "farm"
    ? ["chicken", "cow", "sheep"].map((kind) => ({ kind: kind as Animal["kind"], ...place(), hidden: false }))
    : [{ kind: biome === "riverside" ? "frog" : "chicken", ...place(), hidden: false }];
  if (biome === "riverside") animals.push({ kind: "gator", ...tileCenter(18, 7), hidden: true });
  const easterEgg = rng() < 1 / 32 ? { kind: "boot_on_fence" as const, ...place() } : null;
  const traces = legacy.slice(0, 6).map((trace) => ({ ...trace, ...place() }));
  return { seed, biome, width: GRID_WIDTH, height: GRID_HEIGHT, tileSize: TILE_SIZE, spawn, collision, npcs, items, props, stations, animals, traces, easterEgg };
}
