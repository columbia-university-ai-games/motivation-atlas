// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { armored, createGame, MAX_DRONES, startGame, tick, type Enemy, type GameState, type Projectile } from "../src/minigames/battle-forge/game";
import { battleForge } from "../src/minigames/battle-forge";

function enemy(kind: Enemy["kind"], hp = 100, x = 8, y = 6, id = 1000): Enemy {
  return { id, kind, hp, maxHp: hp, x, y, hit: 0, vx: 0, vy: 0, born: 1 };
}
function advance(g: GameState, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 120); i++) tick(g, 1 / 120);
}
function bullet(kind: Projectile["kind"], x = 6, y = 6, vx = 17): Projectile {
  return { id: 9000, kind, x, y, vx, vy: 0, damage: kind === "breach" ? 80 : 8, radius: .09, life: 2, hitIds: [] };
}

describe("Battle Forge passive rewards and combat", () => {
  it.each([true, false])("actual projectile defeats advance phases; unlocks=%s", progression => {
    const g = createGame(progression); startGame(g);
    g.kills = 5; g.enemies = [enemy("drone", 8)];
    advance(g, .2);
    expect(g.phase).toBe(1);
    expect(g.wave).toBe(progression);
    expect(g.pierce).toBe(false);
    expect(g.enemies.find(e => e.kind === "summoner")?.hp).toBe(600);
    g.enemies = [enemy("summoner", 8)];
    g.shotCooldown = 0; g.waveCooldown = 99;
    advance(g, .2);
    expect(g.phase).toBe(2);
    expect(g.pierce).toBe(progression);
    expect(g.enemies.find(e => e.kind === "warden")?.hp).toBe(1000);
  });

  it("the switch preserves initial enemies, movement, and basic bullets", () => {
    const on = createGame(true), off = createGame(false);
    startGame(on); startGame(off);
    advance(on, .5); advance(off, .5);
    expect(on.enemies).toEqual(off.enemies);
    expect(on.player).toEqual(off.player);
    expect(on.projectiles).toEqual(off.projectiles);
    expect(on.stats).toEqual(off.stats);
  });

  it("ordinary bullets travel before damaging the first obstruction", () => {
    const g = createGame(); startGame(g); g.shotCooldown = 99;
    const front = enemy("drone", 100, 8), back = enemy("drone", 100, 9, 6, 1001);
    g.enemies = [back, front]; g.projectiles = [bullet("bolt")];
    tick(g, .02);
    expect(front.hp).toBe(100);
    expect(g.projectiles[0].x).toBeGreaterThan(6);
    advance(g, .2);
    expect(front.hp).toBe(92); expect(back.hp).toBe(100);
    expect(g.projectiles).toHaveLength(0);
  });

  it("a fast bullet cannot tunnel through a small target", () => {
    const g = createGame(); startGame(g); g.shotCooldown = 99;
    const target = enemy("drone", 100); g.enemies = [target];
    g.projectiles = [bullet("bolt", 6, 6, 1000)];
    tick(g, 1 / 120);
    expect(target.hp).toBe(92);
  });

  it("Shockwave automatically clears nearby groups and waits for cooldown", () => {
    const g = createGame(); startGame(g); g.phase = 1; g.wave = true; g.shotCooldown = 99;
    g.enemies = [enemy("drone", 16, 7, 6, 1000), enemy("drone", 16, 8, 7, 1001), enemy("drone", 16, 16, 6, 1002), enemy("summoner", 650, 17, 8, 1003)];
    tick(g, .05);
    expect(g.enemies.map(e => e.id)).toEqual([1002, 1003]);
    expect(g.stats.waveKills).toBe(2);
    expect(g.stats.waveUses).toBe(1);
    g.enemies.push(enemy("drone", 16, 8, 6, 1004));
    advance(g, .5);
    expect(g.enemies.find(e => e.id === 1004)?.hp).toBe(16);
    expect(g.stats.waveUses).toBe(1);
  });

  it("automatic Breach targets the boss and penetrates intervening drones once", () => {
    const g = createGame(); startGame(g); g.phase = 2; g.pierce = true; g.shotCooldown = 99;
    const drone = enemy("drone", 200, 7.5), boss = enemy("warden", 800, 10, 6, 1001);
    g.enemies = [drone, boss];
    tick(g, .01);
    expect(g.projectiles.find(b => b.kind === "breach")?.targetId).toBe(boss.id);
    expect(armored(g)).toBe(true);
    advance(g, .5);
    expect(drone.hp).toBe(120); expect(boss.hp).toBe(720);
    expect(armored(g)).toBe(false); expect(g.stats.armorBreaks).toBe(1);
    expect(g.stats.pierceUses).toBe(1);
  });

  it("Shockwave discharges when its charge completes, even without nearby targets", () => {
    const g = createGame(); startGame(g); g.wave = true; g.waveCooldown = 2.8;
    g.enemies = []; g.shotCooldown = 99;
    advance(g, 2.7);
    expect(g.stats.waveUses).toBe(0);
    advance(g, .2);
    expect(g.stats.waveUses).toBe(1);
    expect(g.effects.some(e => e.kind === "wave")).toBe(true);
    expect(g.waveCooldown).toBeGreaterThan(2.6);
  });

  it("armor reduces basic damage, then permits full damage when exposed", () => {
    const g = createGame(false); startGame(g); g.phase = 2; g.shotCooldown = 99;
    const boss = enemy("warden", 800); g.enemies = [boss];
    g.projectiles = [bullet("bolt", boss.x, boss.y, 0)];
    tick(g, .01);
    expect(boss.hp).toBeCloseTo(797.2);
    g.phaseTime = 7; g.nextBarrage = 999; g.nextSummon = 999; g.nextHazard = 999;
    g.projectiles = [bullet("bolt", boss.x, boss.y, 0)];
    tick(g, .01);
    expect(boss.hp).toBeCloseTo(789.2);
  });

  it("locked or disabled passives never activate", () => {
    for (const progression of [true, false]) {
      const g = createGame(progression); startGame(g);
      if (!progression) g.wave = g.pierce = true;
      g.enemies = [enemy("summoner", 650)]; g.shotCooldown = 99;
      advance(g, 1);
      expect(g.stats.waveUses + g.stats.pierceUses).toBe(0);
    }
  });

  it("the Summoner repeatedly replenishes its swarm, bounded for performance", () => {
    const g = createGame(); startGame(g); g.phase = 1;
    g.enemies = [enemy("summoner", 650, 14)]; g.shotCooldown = 999; g.player.invulnerable = 999;
    advance(g, 2.1);
    expect(g.stats.summoned).toBe(6);
    advance(g, 3.2);
    expect(g.stats.summoned).toBe(12);
    advance(g, 25);
    expect(g.enemies.filter(e => e.kind === "drone")).toHaveLength(MAX_DRONES);
  });

  it("the Warden telegraphs radial shots, then repeats the attack", () => {
    const g = createGame(); startGame(g); g.phase = 2; g.enemies = [enemy("warden", 800, 14)];
    g.shotCooldown = 999; g.player.invulnerable = 999; g.nextSummon = g.nextHazard = 999;
    advance(g, 3.2);
    expect(g.barrageCharge).toBeGreaterThan(0);
    expect(g.stats.barrages).toBe(0);
    advance(g, .8);
    expect(g.stats.barrages).toBe(1);
    expect(g.projectiles.filter(b => b.kind === "orb")).toHaveLength(16);
    advance(g, 4.5);
    expect(g.stats.barrages).toBe(2);
  });

  it("enemy bullets damage the player but respect brief hit protection", () => {
    const g = createGame(); startGame(g); g.enemies = [];
    g.projectiles = [bullet("orb"), { ...bullet("orb"), id: 9001 }];
    tick(g, .01);
    expect(g.player.hp).toBe(92);
    expect(g.projectiles).toHaveLength(0);
  });

  it("movement eases in and out and agrees across common frame rates", () => {
    const slow = createGame(), fast = createGame();
    for (const g of [slow, fast]) { startGame(g); g.enemies = []; }
    tick(slow, 1 / 60, { x: 1, y: 0 });
    expect(slow.player.vx).toBeGreaterThan(0); expect(slow.player.vx).toBeLessThan(4.6);
    for (let i = 1; i < 60; i++) tick(slow, 1 / 60, { x: 1, y: 0 });
    for (let i = 0; i < 120; i++) tick(fast, 1 / 120, { x: 1, y: 0 });
    expect(slow.player.x).toBeCloseTo(fast.player.x, 8);
    tick(slow, 1 / 60);
    expect(slow.player.vx).toBeGreaterThan(0); expect(slow.player.vx).toBeLessThan(fast.player.vx);
    advance(slow, 1);
    expect(slow.player.vx).toBeLessThan(.001);
  });

  it("ground warnings damage only players still inside at detonation", () => {
    const hit = createGame(), escaped = createGame();
    for (const g of [hit, escaped]) {
      startGame(g); g.enemies = [];
      g.hazards = [{ x: 6, y: 6, radius: 1.5, left: .05 }];
    }
    escaped.player.x = 10;
    advance(hit, .1); advance(escaped, .1);
    expect(hit.player.hp).toBe(85); expect(escaped.player.hp).toBe(100);
  });

  it("stops at the deadline and ignores subsequent actions", () => {
    const g = createGame(); startGame(g); g.elapsed = 119.99;
    tick(g, .05);
    expect(g.status).toBe("timeout"); expect(g.elapsed).toBe(120);
    const before = JSON.stringify(g);
    tick(g, .05, { x: 1, y: 0 }); startGame(g);
    expect(JSON.stringify(g)).toBe(before);
  });

  it.each([true, false])("a complete movement-only route demonstrates the power gap; unlocks=%s", progression => {
    const g = createGame(progression); startGame(g);
    for (let frame = 0; frame < 14401 && g.status === "playing"; frame++) {
      const angle = g.elapsed * .55;
      tick(g, 1 / 120, { x: 0, y: 0, destination: { x: 10 + 5 * Math.cos(angle), y: 6 + 3.5 * Math.sin(angle) } });
    }
    if (progression) {
      expect(g.status).toBe("won"); expect(g.elapsed).toBeLessThan(90);
      expect(g.stats.waveKills).toBeGreaterThan(30); expect(g.stats.armorBreaks).toBeGreaterThan(0);
      expect(g.stats.barrages).toBeGreaterThan(1);
    } else {
      expect(["lost", "timeout"]).toContain(g.status);
      expect(g.stats.waveUses + g.stats.pierceUses).toBe(0);
    }
  });
});

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.replaceChildren(); });

describe("Battle Forge interface lifecycle", () => {
  function setup() {
    vi.useFakeTimers();
    const host = document.createElement("div"); document.body.append(host);
    const unmount = battleForge.mount(host);
    const q = <T extends HTMLElement>(selector: string) => host.querySelector(selector) as T;
    return { host, unmount, q };
  }
  it("applies the toggle on restart and pauses without advancing time", () => {
    const { q, unmount } = setup();
    q<HTMLButtonElement>("[data-bf-start]").click();
    vi.advanceTimersByTime(1000);
    q<HTMLInputElement>("[data-mechanic]").click();
    expect(q(".bf-mode").textContent).toBe("PROGRESSION ON");
    expect(q("[data-bf-start]").textContent).toBe("Apply OFF & restart");
    expect(q(".bf-pending").textContent).toContain("Current run: unlocks ON. Selected: OFF.");
    q<HTMLButtonElement>("[data-bf-pause]").click();
    const clock = q("[data-bf-time]").textContent;
    vi.advanceTimersByTime(5000);
    expect(q("[data-bf-time]").textContent).toBe(clock);
    expect(vi.getTimerCount()).toBe(0);
    q<HTMLButtonElement>("[data-bf-start]").click();
    expect(q(".bf-mode").textContent).toContain("NO UNLOCKS");
    expect(q("[data-bf-wave]").textContent).toContain("Disabled");
    expect(q("[data-bf-wave]").tagName).toBe("DIV");
    expect(q("[data-bf-time]").textContent).toBe("2:00");
    unmount();
  });
  it("the checkbox produces different earned abilities after six defeats", () => {
    const { q, unmount } = setup();
    q<HTMLInputElement>("[data-mechanic]").click();
    expect(q(".bf-mode").textContent).toContain("NO UNLOCKS");
    q<HTMLButtonElement>("[data-bf-start]").click();
    vi.advanceTimersByTime(14000);
    expect(q(".bf-phase").textContent).toContain("SUMMONER");
    expect(q("[data-bf-wave]").dataset.unlocked).toBe("false");
    expect(q("[data-bf-wave]").textContent).toContain("Disabled");
    q<HTMLInputElement>("[data-mechanic]").click();
    expect(q("[data-bf-start]").textContent).toBe("Apply ON & restart");
    q<HTMLButtonElement>("[data-bf-start]").click();
    vi.advanceTimersByTime(14000);
    expect(q(".bf-phase").textContent).toContain("SUMMONER");
    expect(q("[data-bf-wave]").dataset.unlocked).toBe("true");
    expect(q("[data-bf-wave]").textContent).toContain("Automatic");
    unmount();
  });
  it("keyboard movement works and window blur pauses the animation", () => {
    const { q, unmount } = setup();
    q<HTMLButtonElement>("[data-bf-start]").click();
    const arena = q("[data-bf-arena]");
    arena.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }));
    vi.advanceTimersByTime(500);
    arena.dispatchEvent(new KeyboardEvent("keyup", { key: "d", bubbles: true }));
    expect(Number(arena.dataset.playerX)).toBeGreaterThan(7);
    window.dispatchEvent(new Event("blur"));
    expect(q("[data-bf-status]").textContent).toContain("Paused");
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });
  it("unmount cancels animation frames and detaches global listeners", () => {
    const { host, q, unmount } = setup();
    const removeWindow = vi.spyOn(window, "removeEventListener");
    const removeDocument = vi.spyOn(document, "removeEventListener");
    q<HTMLButtonElement>("[data-bf-start]").click();
    vi.advanceTimersByTime(1);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(host.childNodes.length).toBe(0); expect(vi.getTimerCount()).toBe(0);
    expect(removeWindow).toHaveBeenCalledWith("blur", expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });
});
