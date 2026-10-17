// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  continueAfterDeath, createSession, DEATHS, deathFor, drawLifespan, DYING_SECONDS,
  IMMORTAL_ROUND_SECONDS, interact, mulberry32, nearestInteraction, ROUND_LIVES,
  startLife, step, summarizeLife, summarizeRound, TELEGRAPH, transition,
  type Input, type Life, type Screen,
} from "../src/minigames/any-given-morning/game";
import { anyGivenMorning } from "../src/minigames/any-given-morning";
import { COPY, DEATH_TEXT, DEED_TEXT, NPC_TEXT, type Archetype } from "../src/minigames/any-given-morning/text";
import { BIOMES, generateArea, MIN_INTERACTABLE_SPACING, TILE_SIZE, type Point } from "../src/minigames/any-given-morning/world";

function newLife(seed = 1, mortal = false): Life { return startLife(createSession({ seed, mortal })); }
function at(life: Life, point: Point): void {
  Object.assign(life.player, point, { vx: 0, vy: 0 });
}
function lifeWith(archetype: Archetype, mortal = false): Life {
  for (let seed = 0; seed < 2000; seed++) {
    const life = newLife(seed, mortal);
    if (life.world.npcs.some((npc) => npc.archetype === archetype)) return life;
  }
  throw new Error(`No generated ${archetype}`);
}
function use(life: Life, kind: Life["world"]["stations"][number]["kind"]): string | null {
  const station = life.world.stations.find((station) => station.kind === kind)!;
  expect(station).toBeDefined();
  at(life, station);
  return interact(life);
}

type Script = (life: Life, frame: number) => { dt: number; input: Input };
const scripts: Record<string, Script> = {
  idle: () => ({ dt: 0.5, input: {} }),
  wandering: (_, frame) => ({ dt: 0.2, input: { x: Math.sin(frame / 7), y: Math.cos(frame / 11) } }),
  repeated_interaction: () => ({ dt: 0.25, input: { interact: true } }),
  helping: (life, frame) => {
    const targets = [...life.world.items.filter((item) => !item.taken), ...life.world.npcs, ...life.world.stations];
    const target = targets[Math.floor(frame / 25) % targets.length];
    const x = target.x - life.player.x, y = target.y - life.player.y;
    const close = Math.hypot(x, y) < 10;
    return { dt: 0.2, input: close ? { interact: true } : { x, y } };
  },
  coarse_diagonal: (_, frame) => ({ dt: 0.73, input: { x: frame % 4 < 2 ? 1 : -1, y: 1, interact: frame % 3 === 0 } }),
};

describe("Any Given Morning central rule", () => {
  it("uses mulberry32 and includes both lifespan endpoints", () => {
    const rng = mulberry32(1);
    expect([rng(), rng(), rng()]).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
    expect(drawLifespan(() => 0)).toBe(16);
    expect(drawLifespan(() => 1)).toBe(24);
  });

  it.each(Object.entries(scripts))("dies at the preselected time for 500 seeds with %s input", (_, script) => {
    for (let seed = 0; seed < 500; seed++) {
      const life = newLife(seed, true);
      const deadline = life.deathAt!;
      expect(deadline, `seed ${seed}`).toBeGreaterThanOrEqual(16);
      expect(deadline).toBeLessThanOrEqual(24);
      for (let frame = 0; life.round.screen === "PLAY"; frame++) {
        const { dt, input } = script(life, frame);
        const before = life.elapsed;
        step(life, dt, input);
        if (before + dt < deadline - 1e-8) expect(life.ended).toBe(false);
      }
      expect(life.deathAt).toBe(deadline);
      expect(life.elapsed).toBe(deadline);
      expect(life.ended).toBe(true);
      expect(summarizeLife(life).died).toBe(true);
      expect(life.round.history).toHaveLength(1);
    }
  }, 30000);

  it.each(Object.entries(scripts))("never dies and ends at exactly 100 seconds with %s input", (_, script) => {
    for (let seed = 0; seed < 40; seed++) {
      const life = newLife(seed);
      for (let frame = 0; life.round.screen === "PLAY"; frame++) {
        const { dt, input } = script(life, frame);
        const before = life.elapsed;
        step(life, dt, input);
        expect(life.round.screen).not.toBe("DYING");
        expect(life.round.screen).not.toBe("DEAD");
        if (before + dt < 100 - 1e-8) expect(life.round.screen).toBe("PLAY");
      }
      expect(life.elapsed).toBe(IMMORTAL_ROUND_SECONDS);
      expect(life.deathAt).toBeNull();
      expect(life.death).toBeNull();
      expect(life.round.screen).toBe("LEDGER");
      expect(life.round.legacy).toEqual([]);
      expect(summarizeLife(life).died).toBe(false);
      expect(summarizeLife(life).cause).toBe(COPY.dayEnded);
      const snapshot = summarizeLife(life);
      step(life, 1000, { interact: true });
      expect(summarizeLife(life)).toEqual(snapshot);
    }
  }, 30000);

  it("clips oversized steps, locks dying input and handles the exact immortal boundary", () => {
    const life = newLife(3, true);
    step(life, life.deathAt!);
    expect(life.round.screen).toBe("DYING");
    const position = { ...life.player };
    const deeds = [...life.deeds];
    expect(interact(life)).toBeNull();
    step(life, DYING_SECONDS - 0.01, { x: 1, interact: true });
    expect(life.round.screen).toBe("DYING");
    expect(life.player).toEqual(position);
    expect(life.deeds).toEqual(deeds);
    step(life, 0.01);
    expect(life.round.screen).toBe("DEAD");
    expect(life.elapsed).toBe(life.deathAt);
    expect(life.round.history).toHaveLength(1);
    const overshoot = newLife(3, true);
    step(overshoot, 1000);
    expect(overshoot.round.screen).toBe("DEAD");
    expect(overshoot.elapsed).toBe(overshoot.deathAt);
    const immortal = newLife();
    step(immortal, 99.999);
    expect(immortal.round.screen).toBe("PLAY");
    step(immortal, 1000);
    expect(immortal.elapsed).toBe(100);
    expect(immortal.round.screen).toBe("LEDGER");
  });

  it("telegraphs strikes for 1.3 seconds and gives peaceful deaths no warning", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 400; seed++) {
      const life = newLife(seed, true);
      seen.add(life.death!.kind);
      if (life.death!.peaceful) {
        expect(life.telegraphAt).toBeNull();
        step(life, life.deathAt! - 0.01);
        expect(life.telegraph).toBe(false);
      } else {
        expect(life.telegraphAt).toBe(life.deathAt! - TELEGRAPH);
        step(life, life.telegraphAt! - 0.001);
        expect(life.telegraph).toBe(false);
        step(life, 0.001);
        expect(life.telegraph).toBe(true);
        expect(life.round.screen).toBe("PLAY");
        step(life, TELEGRAPH);
        expect(life.round.screen).toBe("DYING");
      }
    }
    expect(seen.size).toBe(DEATHS.length);
  });

  it("rejects invalid time, movement and seeds", () => {
    const life = newLife();
    for (const dt of [-1, NaN, Infinity]) expect(() => step(life, dt)).toThrow(RangeError);
    expect(() => step(life, 1, { x: NaN })).toThrow(RangeError);
    expect(() => createSession({ seed: 0.5, mortal: true })).toThrow(RangeError);
  });
});

describe("Any Given Morning seeded rounds", () => {
  it("replays whole rounds deterministically and keeps the two modes' first areas identical", () => {
    for (let seed = 0; seed < 200; seed++) {
      const a = createSession({ seed, mortal: true }), b = createSession({ seed, mortal: true });
      let left = startLife(a), right = startLife(b);
      const used = new Set<string>();
      expect(left.world).toEqual(newLife(seed).world);
      for (let i = 0; i < ROUND_LIVES; i++) {
        expect(left.world).toEqual(right.world);
        expect(left.death).toEqual(right.death);
        expect(left.deathAt).toBe(right.deathAt);
        expect(used.has(left.death!.kind), `seed ${seed}, life ${i + 1}`).toBe(false);
        used.add(left.death!.kind);
        step(left, 30); step(right, 30);
        if (i < ROUND_LIVES - 1) {
          left = continueAfterDeath(a)!;
          right = continueAfterDeath(b)!;
        }
      }
      continueAfterDeath(a); continueAfterDeath(b);
      expect(a.state.screen).toBe("LEDGER");
      expect(summarizeRound(a)).toEqual(summarizeRound(b));
    }
  });

  it("keeps future worlds and death schedules independent of earlier actions", () => {
    for (let seed = 0; seed < 60; seed++) {
      const a = createSession({ seed, mortal: true }), b = createSession({ seed, mortal: true });
      let left = startLife(a), right = startLife(b);
      for (let i = 0; i < 5; i++) {
        expect(left.deathAt).toBe(right.deathAt);
        expect(left.death).toEqual(right.death);
        expect(left.world.seed).toBe(right.world.seed);
        expect(left.world.collision).toEqual(right.world.collision);
        for (const key of ["npcs", "items", "stations", "props", "animals", "easterEgg"] as const) expect(left.world[key]).toEqual(right.world[key]);
        step(left, 30);
        for (let frame = 0; right.round.screen === "PLAY"; frame++) {
          const { dt, input } = scripts.helping(right, frame);
          step(right, dt, input);
        }
        step(right, DYING_SECONDS);
        if (i < 4) { left = continueAfterDeath(a)!; right = continueAfterDeath(b)!; }
      }
    }
  });

  it("reaches every death kind, obeys biome restrictions and excludes all used kinds", () => {
    const seen = new Set<string>();
    const contexts = new Set<string>();
    expect(DEATHS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(DEATHS.map((death) => death.animation)).size).toBe(DEATHS.length);
    for (const biome of BIOMES) {
      const rng = mulberry32(145);
      let used: (typeof DEATHS[number]["kind"])[] = [];
      for (let i = 0; i < 2000; i++) {
        if (used.length === 5) used = [];
        const death = deathFor(biome, rng, used);
        expect(used).not.toContain(death.kind);
        expect(death.biomes).toContain(biome);
        if (death.kind === "gator_explodes" || death.kind === "flood") expect(biome).toBe("riverside");
        if (death.kind === "hay_avalanche") expect(biome).toBe("farm");
        seen.add(death.kind);
        contexts.add(`${biome}-${death.kind}`);
        used.push(death.kind);
      }
    }
    expect([...seen].sort()).toEqual(DEATHS.map((death) => death.kind).sort());
    for (const death of DEATHS) for (const biome of death.biomes) expect(contexts.has(`${biome}-${death.kind}`)).toBe(true);
    // The production life factory must also expose every kind.
    expect(new Set(Array.from({ length: 500 }, (_, seed) => newLife(seed, true).death!.kind)).size).toBe(DEATHS.length);
  });

  it("summarizes five lives once, excludes animation time and copies ledger data", () => {
    const session = createSession({ seed: 17, mortal: true });
    for (let i = 0; i < 5; i++) {
      const life = startLife(session);
      use(life, "flowers");
      step(life, 30);
      if (i === 4) {
        expect(() => startLife(session)).toThrow(/no lives left/);
        expect(continueAfterDeath(session)).toBeNull();
      }
    }
    const summary = summarizeRound(session);
    expect(summary.lives).toHaveLength(5);
    expect(summary.seconds).toBe(session.state.history.reduce((sum, life) => sum + life.seconds, 0));
    const active = summary.lives.flatMap((life) => life.deeds).filter((deed) => deed.id !== "looked_at_sky" && deed.id !== "let_sleeper_sleep");
    expect(summary.deedsPerMinute).toBe(active.length * 60 / summary.seconds);
    summary.lives[0].deeds[0].text = "changed";
    expect(session.state.history[0].deeds[0].text).toBe(DEED_TEXT.picked_flowers);
    expect(() => startLife(session)).toThrow();
    expect(summarizeRound(createSession({ seed: 0, mortal: true })).deedsPerMinute).toBe(0);
  });

  it("lists passive deeds while excluding both from the rate", () => {
    const life = lifeWith("sleeper");
    const npc = life.world.npcs.find((npc) => npc.archetype === "sleeper")!;
    at(life, npc); step(life, 4);
    expect(life.deeds.map((deed) => deed.id)).toEqual(expect.arrayContaining(["looked_at_sky", "let_sleeper_sleep"]));
    const session = { state: life.round, life };
    session.state.history = [summarizeLife(life)];
    expect(summarizeRound(session).deedsPerMinute).toBe(0);
    interact(life);
    session.state.history = [summarizeLife(life)];
    const summary = summarizeRound(session);
    expect(summary.deedsPerMinute).toBeCloseTo(15);
    expect(summary.deedCount).toBe(3);
    expect(summary.lives[0].deeds.map((deed) => deed.id)).toEqual(["let_sleeper_sleep", "looked_at_sky", "woke_sleeper"]);
  });
});

describe("Any Given Morning worlds and movement", () => {
  it("keeps targets reachable and at least two tiles apart across 200 seeds in every biome", () => {
    const archetypes = new Set<string>();
    let eggs = 0;
    for (let seed = 0; seed < 200; seed++) for (const biome of BIOMES) {
      const legacy = Array.from({ length: 6 }, (_, i) => ({ id: String(i), kind: "cairn" as const, deed: "said_hello" as const, life: i + 1 }));
      const area = generateArea(seed, legacy, biome);
      const targets = [...area.npcs, ...area.items, ...area.stations];
      targets.forEach((a, i) => targets.slice(i + 1).forEach((b) => {
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${biome} seed ${seed}: ${a.id}, ${b.id}`).toBeGreaterThanOrEqual(MIN_INTERACTABLE_SPACING);
      }));
      expect(area).toEqual(generateArea(seed, legacy, biome));
      expect([area.width, area.height, area.tileSize]).toEqual([20, 12, 16]);
      expect(area.npcs.length).toBeGreaterThanOrEqual(2);
      expect(area.npcs.length).toBeLessThanOrEqual(4);
      expect(area.items.length).toBeGreaterThanOrEqual(1);
      expect(area.items.length).toBeLessThanOrEqual(2);
      expect(area.props.length).toBeGreaterThanOrEqual(3);
      expect(area.props.length).toBeLessThanOrEqual(6);
      expect(area.animals.length).toBeGreaterThan(0);
      if (biome === "riverside") expect(area.stations.find((station) => station.kind === "water_bank")!.x).toBe(14 * TILE_SIZE + 8);
      const couple = area.npcs.find((npc) => npc.need === "company");
      if (couple) {
        const bench = area.props.find((prop) => prop.kind === "bench")!;
        expect({ x: bench.x, y: bench.y }).toEqual(couple.home);
      }
      // Independent flood fill over tile centers. The physics test checks player clearance.
      const key = (x: number, y: number) => `${x},${y}`;
      const pending = [[Math.floor(area.spawn.x / 16), Math.floor(area.spawn.y / 16)]];
      const visited = new Set<string>();
      while (pending.length) {
        const [x, y] = pending.pop()!;
        if (visited.has(key(x, y)) || area.collision[y]?.[x] !== false) continue;
        visited.add(key(x, y));
        pending.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      for (const target of [...area.npcs, ...area.items, ...area.stations, ...area.traces]) {
        expect(visited.has(key(Math.floor(target.x / 16), Math.floor(target.y / 16))), `${biome} seed ${seed}`).toBe(true);
      }
      for (const npc of area.npcs) {
        archetypes.add(npc.archetype);
        if (npc.need === "hat" || npc.need === "letter" || npc.need === "stone") expect(area.items.some((item) => item.kind === npc.need)).toBe(true);
        if (npc.need === "grain") expect(area.stations.map((station) => station.kind)).toEqual(expect.arrayContaining(["grain_sack", "trough"]));
        if (npc.need === "water") expect(area.stations.map((station) => station.kind)).toEqual(expect.arrayContaining(["well", "crop_plot"]));
      }
      eggs += Number(area.easterEgg !== null);
    }
    expect([...archetypes].sort()).toEqual(Object.keys(NPC_TEXT).sort());
    expect(eggs).toBeGreaterThan(0);
    expect(eggs).toBeLessThan(80);
  });

  it("normalizes diagonal speed, accelerates, decelerates and cannot tunnel through walls", () => {
    const a = newLife(), b = newLife();
    // An open fixture isolates physics from procedural scenery.
    for (const life of [a, b]) {
      life.world.collision = Array.from({ length: 12 }, (_, y) => Array.from({ length: 20 }, (_, x) => y === 0 || y === 11 || x === 0 || x === 19));
      at(life, { x: 80, y: 80 });
    }
    step(a, 0.1, { x: 1 });
    expect(a.player.vx).toBeGreaterThan(0);
    expect(a.player.vx).toBeLessThan(70);
    step(a, 0.5, { x: 1 }); step(b, 0.6, { x: 1, y: 1 });
    expect(Math.hypot(a.player.vx, a.player.vy)).toBeCloseTo(70);
    expect(Math.hypot(b.player.vx, b.player.vy)).toBeCloseTo(70);
    step(a, 0.2);
    expect(a.player.vx).toBe(0);
    for (let y = 1; y < 11; y++) a.world.collision[y][12] = true;
    step(a, 40, { x: 1 });
    expect(a.player.x + 4).toBeLessThan(12 * TILE_SIZE);
  });
});

describe("Any Given Morning deeds and traces", () => {
  it("sits on an empty bench once per life and leaves occupied benches to the couple", () => {
    const life = newLife();
    life.world = generateArea(1, [], "orchard");
    // Find an unoccupied generated bench without changing its rule objects.
    for (let seed = 2; !life.world.stations.some((s) => s.kind === "bench"); seed++) life.world = generateArea(seed, [], "orchard");
    expect(use(life, "bench")).toBe(COPY.bench);
    expect(life.sittingUntil).toBeCloseTo(life.elapsed + 1.6);
    step(life, 1.7);
    expect(life.sittingUntil).toBeLessThan(life.elapsed);
    use(life, "bench"); use(life, "bench");
    expect(life.deeds.filter((deed) => deed.id === "sat_on_bench")).toEqual([{ id: "sat_on_bench", text: DEED_TEXT.sat_on_bench }]);
    step(life, 0.1, { x: 1 }); expect(life.sittingUntil).toBe(0);
    const occupied = lifeWith("couple");
    expect(occupied.world.stations.some((s) => s.kind === "bench")).toBe(false);
    at(occupied, occupied.world.npcs.find((n) => n.need === "company")!);
    expect(nearestInteraction(occupied)?.label).toBe("Couple");
    interact(occupied); step(occupied, 2);
    expect(occupied.deeds.map((deed) => deed.id)).toEqual(["listened_to_couple"]);
  });

  it("gives three distinct sleeper replies with no timing promise", () => {
    const life = lifeWith("sleeper"), npc = life.world.npcs.find((npc) => npc.need === "quiet")!;
    at(life, npc);
    const replies = [interact(life), interact(life), interact(life)];
    expect(new Set(replies).size).toBe(3);
    expect(replies).toEqual([NPC_TEXT.sleeper.ask, NPC_TEXT.sleeper.again, NPC_TEXT.sleeper.thanks]);
    expect(replies.join(" ")).not.toMatch(/second|minute|five/i);
    expect(life.deeds.map((deed) => deed.id)).toEqual(["woke_sleeper"]);
    expect(npc.awake).toBe(true);
  });

  it("labels the same nearest target that receives E", () => {
    for (let seed = 0; seed < 200; seed++) {
      const life = newLife(seed);
      for (const target of [...life.world.npcs, ...life.world.items, ...life.world.stations]) {
        at(life, target);
        const nearest = nearestInteraction(life)!;
        expect(nearest.at).toBe(target);
        expect(nearest.label.length).toBeGreaterThanOrEqual(2);
        expect(nearest.label.length).toBeLessThanOrEqual(12);
      }
    }
  });
  it("delivers required loose items and records each NPC deed once", () => {
    const cases = [
      ["hatless_farmer", "returned_hat"], ["river_child", "talked_to_child"], ["letter_recipient", "delivered_letter"],
      ["fisherman", "helped_fisherman"], ["dog", "pet_dog"], ["neighbor", "said_hello"], ["sleeper", "woke_sleeper"],
    ] as const;
    for (const [archetype, deed] of cases) {
      const life = lifeWith(archetype);
      const npc = life.world.npcs.find((npc) => npc.archetype === archetype)!;
      const item = life.world.items.find((item) => item.kind === npc.need);
      if (item) { at(life, item); interact(life); expect(item.taken).toBe(true); }
      at(life, npc);
      interact(life);
      if (archetype === "fisherman") expect(life.deeds).not.toContainEqual({ id: deed, text: DEED_TEXT[deed] });
      interact(life); interact(life);
      expect(life.deeds.filter((entry) => entry.id === deed)).toEqual([{ id: deed, text: DEED_TEXT[deed] }]);
      if (item) expect(life.inventory).not.toContain(item.kind);
    }
  });

  it("requires grain and water, and records station deeds once per life", () => {
    for (const [archetype, source, target, deed] of [
      ["chicken_keeper", "grain_sack", "trough", "fed_chickens"],
      ["gardener", "well", "crop_plot", "watered_crops"],
    ] as const) {
      const life = lifeWith(archetype);
      use(life, target);
      expect(life.deeds).toEqual([]);
      for (let i = 0; i < 3; i++) { use(life, source); use(life, target); }
      expect(life.deeds.filter((entry) => entry.id === deed)).toHaveLength(1);
      expect(life.world.npcs.find((npc) => npc.archetype === archetype)!.done).toBe(true);
    }
    const life = lifeWith("river_child");
    for (let i = 0; i < 4; i++) { use(life, "flowers"); use(life, "water_bank"); }
    expect(life.deeds.map((deed) => deed.id)).toEqual(["picked_flowers", "sat_by_water"]);
  });

  it("awards passive deeds only after continuous idle time, once per life", () => {
    const sky = newLife();
    step(sky, 3.99);
    expect(sky.deeds).toEqual([]);
    step(sky, 0.01); step(sky, 4);
    expect(sky.deeds.filter((deed) => deed.id === "looked_at_sky")).toHaveLength(1);
    const moving = newLife();
    step(moving, 3); step(moving, 0.1, { x: 1 }); step(moving, 3);
    expect(moving.deeds.map((deed) => deed.id)).not.toContain("looked_at_sky");
    for (const [archetype, duration, deed] of [["sleeper", 3, "let_sleeper_sleep"], ["couple", 2, "listened_to_couple"]] as const) {
      const life = lifeWith(archetype);
      const npc = life.world.npcs.find((npc) => npc.archetype === archetype)!;
      at(life, npc.home);
      step(life, duration - 0.01);
      expect(life.deeds.map((entry) => entry.id)).not.toContain(deed);
      step(life, 0.01); step(life, duration);
      expect(life.deeds.filter((entry) => entry.id === deed)).toHaveLength(1);
    }
    const woken = lifeWith("sleeper");
    at(woken, woken.world.npcs.find((npc) => npc.archetype === "sleeper")!);
    interact(woken); step(woken, 4);
    expect(woken.deeds.map((deed) => deed.id)).not.toContain("let_sleeper_sleep");
  });

  it("caps legacy at six newest traces, carries them into later worlds and allows inspection", () => {
    const session = createSession({ seed: 38, mortal: true });
    const expected: string[] = [];
    for (let i = 0; i < 5; i++) {
      const life = startLife(session);
      expect(life.world.traces.map((trace) => trace.id)).toEqual(expected.slice(0, 6));
      if (life.world.traces.length) {
        at(life, life.world.traces[0]);
        expect(interact(life)).toBe(COPY.trace);
        expect(life.deeds).toHaveLength(0);
      }
      use(life, "flowers"); step(life, 4); step(life, 30);
      expected.unshift(...life.deeds.map((deed) => `${i + 1}-${deed.id}`).reverse());
      expect(session.state.legacy.map((trace) => trace.id)).toEqual(expected.slice(0, 6));
      expect(session.state.legacy.length).toBeLessThanOrEqual(6);
    }
    expect(session.state.legacy).toHaveLength(6);
    // Repeating a finished step cannot append another summary or trace.
    const before = [...session.state.legacy];
    step(session.life!, 20);
    expect(session.state.legacy).toEqual(before);
    expect(session.state.history).toHaveLength(5);
  });
});

describe("Any Given Morning screens and copy", () => {
  it("throws for every illegal screen edge and for illegal life starts", () => {
    const allowed: Record<Screen, Screen[]> = { MENU: ["PLAY"], PLAY: ["DYING", "LEDGER", "MENU"], DYING: ["DEAD", "MENU"], DEAD: ["PLAY", "LEDGER", "MENU"], LEDGER: ["MENU"] };
    const screens = Object.keys(allowed) as Screen[];
    for (const screen of screens) for (const next of screens) {
      const machine = { screen };
      if (allowed[screen].includes(next)) { transition(machine, next); expect(machine.screen).toBe(next); }
      else { expect(() => transition(machine, next)).toThrow(/Illegal screen transition/); expect(machine.screen).toBe(screen); }
    }
    const session = createSession({ seed: 1, mortal: true });
    expect(() => continueAfterDeath(session)).toThrow();
    const old = startLife(session);
    expect(() => startLife(session)).toThrow();
    step(old, old.deathAt!);
    expect(() => startLife(session)).toThrow();
    step(old, DYING_SECONDS);
    const next = continueAfterDeath(session)!;
    const snapshot = summarizeLife(next);
    step(old, 100);
    expect(summarizeLife(next)).toEqual(snapshot);
    expect(next.round.screen).toBe("PLAY");
    transition(session.state, "MENU");
    expect(() => startLife(session)).toThrow();
  });

  it("mounts the menu, updates the toggle hint and starts play, then cleans up without timers", () => {
    vi.useFakeTimers();
    try {
      const el = document.createElement("div");
      const unmount = anyGivenMorning.mount(el);
      const checkbox = el.querySelector<HTMLInputElement>('[data-mechanic="mortality"]')!;
      expect(checkbox.checked).toBe(true);
      expect(el.textContent).toContain(COPY.mortalityOn);
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event("change"));
      expect(el.textContent).toContain(COPY.mortalityOff);
      el.querySelector<HTMLButtonElement>('[data-testid="start"]')!.click();
      expect(el.querySelector("[data-state]")!.getAttribute("data-state")).toBe("play");
      unmount();
      expect(el.childNodes).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it("keeps the source quotation exact and the two playtest placeholders unchanged", () => {
    const readme = readFileSync("src/minigames/any-given-morning/README.md", "utf8");
    const quote = readme.split("\n").find((line) => line.startsWith("> "))!.slice(2);
    const note = readFileSync("content/player-motivations.md", "utf8");
    const meaning = note.split("### Meaning and epic scale")[1].split("\n## ")[0];
    expect(meaning).toContain(quote);
    for (const heading of ["Dynamic", "Aesthetic"]) expect(readme.split(`## ${heading}\n\n`)[1].split("\n\n")[0]).toBe("PLAYTEST PENDING: one real person's report goes here.");
    expect(readme.split("\n")[0]).toContain("Codex");
    for (const kind of DEATHS.map((death) => death.kind)) expect(DEATH_TEXT[kind].length).toBeGreaterThan(0);
    expect(Object.keys(DEED_TEXT)).toHaveLength(15);
    // Small copy guard. Rhythm and literal meaning still require human review.
    const strings = [...Object.values(DEATH_TEXT), ...Object.values(DEED_TEXT), ...Object.values(NPC_TEXT).flatMap(Object.values)];
    for (const line of strings) {
      expect(line).not.toMatch(/[\u2014;]|\b(?:rather than|instead of|not just|crucial|delve|boasts|truly|really|literally)\b/i);
    }
  });
});
