/** Pure simulation: seconds and world coordinates, independent of rendering. */
export const WIDTH = 20;
export const HEIGHT = 12;
export const ROUND_SECONDS = 120;
export const SHOCKWAVE_KILLS = 6;
export const MAX_DRONES = 36;
export const WAVE_INTERVAL = 2.8;
export const WAVE_RADIUS = 4.4;
export const BREACH_INTERVAL = 2.4;
export type Phase = 0 | 1 | 2;
export type Status = "ready" | "playing" | "won" | "lost" | "timeout";
export interface Point { x: number; y: number }
export interface Enemy extends Point {
  id: number; kind: "drone" | "summoner" | "warden";
  hp: number; maxHp: number; hit: number; vx: number; vy: number; born: number;
  killedBy?: "bolt" | "wave" | "breach";
}
export interface Effect extends Point {
  kind: "wave" | "burst" | "impact" | "spawn" | "break" | "armor-break";
  life: number; duration: number; radius: number;
}
export interface Hazard extends Point { left: number; radius: number }
export interface Projectile extends Point {
  id: number; kind: "bolt" | "breach" | "orb";
  vx: number; vy: number; damage: number; radius: number; life: number;
  hitIds: number[]; targetId?: number;
}
export interface Stats {
  shots: number; waveUses: number; waveKills: number; pierceUses: number;
  armorBreaks: number; damageTaken: number; summoned: number; barrages: number;
}
export interface GameState {
  progression: boolean; status: Status; phase: Phase;
  elapsed: number; phaseTime: number; kills: number;
  player: Point & { hp: number; invulnerable: number; vx: number; vy: number; muzzle: number };
  enemies: Enemy[]; nextId: number; effects: Effect[]; hazards: Hazard[]; projectiles: Projectile[];
  wave: boolean; pierce: boolean; waveCooldown: number; pierceCooldown: number;
  shotCooldown: number; brokenArmor: number; nextSummon: number; nextHazard: number;
  nextBarrage: number; barrageCharge: number;
  message: string; stats: Stats;
}
export interface Input { x: number; y: number; destination?: Point | null }
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const enemyRadius = (e: Enemy) => e.kind === "warden" ? 1.2 : e.kind === "summoner" ? 0.8 : 0.3;

export function createGame(progression = true): GameState {
  return {
    progression, status: "ready", phase: 0, elapsed: 0, phaseTime: 0, kills: 0,
    player: { x: 6, y: 6, hp: 100, invulnerable: 0, vx: 0, vy: 0, muzzle: 0 }, enemies: [], nextId: 1,
    effects: [], hazards: [], projectiles: [], wave: false, pierce: false,
    waveCooldown: 0, pierceCooldown: 0, shotCooldown: 0, brokenArmor: 0,
    nextSummon: 2, nextHazard: 4, nextBarrage: 3, barrageCharge: 0,
    message: "Move to survive. Your arsenal fights automatically.",
    stats: { shots: 0, waveUses: 0, waveKills: 0, pierceUses: 0, armorBreaks: 0, damageTaken: 0, summoned: 0, barrages: 0 },
  };
}
function effect(s: GameState, kind: Effect["kind"], p: Point, radius: number, duration: number): void {
  s.effects.push({ x: p.x, y: p.y, kind, radius, duration, life: duration });
}
function spawn(s: GameState, kind: Enemy["kind"], x: number, y: number): void {
  const hp = kind === "drone" ? 16 : kind === "summoner" ? 600 : 1000;
  const e: Enemy = { id: s.nextId++, kind, x, y, hp, maxHp: hp, hit: 0, vx: 0, vy: 0, born: 0 };
  s.enemies.push(e);
  effect(s, "spawn", e, kind === "drone" ? 0.7 : 1.6, 0.65);
}
function spawnDrones(s: GameState, count: number, aroundBoss = false): void {
  const boss = s.enemies.find(e => e.kind !== "drone");
  const available = MAX_DRONES - s.enemies.filter(e => e.kind === "drone").length;
  for (let i = 0; i < Math.min(count, available); i++) {
    const angle = i / count * Math.PI * 2 + s.phaseTime * 0.8;
    const x = aroundBoss && boss ? boss.x + Math.cos(angle) * 2 : 10 + Math.cos(angle) * 7.8;
    const y = aroundBoss && boss ? boss.y + Math.sin(angle) * 2 : 6 + Math.sin(angle) * 4.6;
    spawn(s, "drone", clamp(x, 0.5, 19.5), clamp(y, 0.5, 11.5));
    if (aroundBoss) s.stats.summoned++;
  }
}
export function startGame(s: GameState): void {
  if (s.status !== "ready") return;
  s.status = "playing";
  spawnDrones(s, 6);
  s.message = s.progression ? "Defeat 6 drones to earn an automatic Shockwave." : "NO GROWTH: the same arena, without passive abilities. Near-impossible challenge.";
}
export function armored(s: GameState): boolean {
  return s.phase === 2 && s.brokenArmor <= 0 && s.phaseTime % 10 < 6;
}
function nextPhase(s: GameState, phase: Phase): void {
  s.phase = phase; s.phaseTime = 0;
  s.enemies = []; s.hazards = []; s.projectiles = []; s.effects = [];
  s.brokenArmor = 0;
  s.player.hp = Math.min(100, s.player.hp + 30);
  s.player.invulnerable = 2;
  s.nextSummon = 2; s.nextHazard = 4; s.nextBarrage = 3; s.barrageCharge = 0;
  spawn(s, phase === 1 ? "summoner" : "warden", 14, 6);
  spawnDrones(s, phase === 1 ? 6 : 4, true);
}
function resolveDefeats(s: GameState): void {
  const defeated = s.enemies.filter(e => e.hp <= 0);
  if (!defeated.length) return;
  for (const enemy of defeated) {
    s.kills++;
    if (enemy.killedBy === "wave") s.stats.waveKills++;
    effect(s, "burst", enemy, enemyRadius(enemy) * 2, 0.5);
  }
  s.enemies = s.enemies.filter(e => e.hp > 0);
  if (defeated.some(e => e.kind === "warden")) {
    s.status = "won"; s.enemies = []; s.hazards = []; s.projectiles = [];
    s.message = "Arena cleared. Did automatic power change where you moved?";
  } else if (defeated.some(e => e.kind === "summoner")) {
    s.pierce = s.progression; s.pierceCooldown = BREACH_INTERVAL; nextPhase(s, 2);
    s.message = s.pierce ? "BREACH ONLINE · automatic armor-piercing rounds. Dodge the Warden's radial barrage! +30 HP."
      : "IRON WARDEN · heavy armor and radial barrages. No Breach available. +30 HP.";
  } else if (s.phase === 0 && s.kills >= SHOCKWAVE_KILLS) {
    s.wave = s.progression; s.waveCooldown = WAVE_INTERVAL; nextPhase(s, 1);
    s.message = s.wave ? "SHOCKWAVE ONLINE · automatic area pulses. Let the Summoner's swarm approach your radius. +30 HP."
      : "SUMMONER · six reinforcements every 3.2s. No crowd-clearing passive. +30 HP.";
  }
}
function hurtEnemy(s: GameState, e: Enemy, amount: number, source: "bolt" | "wave" | "breach"): void {
  if (e.hp <= 0) return;
  if (source === "breach" && e.kind === "warden") {
    if (armored(s)) { s.stats.armorBreaks++; effect(s, "armor-break", e, 1.8, 0.65); }
    s.brokenArmor = 3;
  }
  e.hp -= e.kind === "warden" && armored(s) && source !== "breach" ? amount * 0.35 : amount;
  e.hit = 0.09;
  if (e.hp <= 0) e.killedBy = source;
}
function nearest(s: GameState, range: number, preferBoss = false): Enemy | undefined {
  let best: Enemy | undefined, bestScore = Infinity;
  for (const e of s.enemies) {
    const d = distance(e, s.player);
    if (e.hp <= 0 || d > range) continue;
    const score = d - (preferBoss && e.kind !== "drone" ? 100 : 0);
    if (score < bestScore) { best = e; bestScore = score; }
  }
  return best;
}
function fire(s: GameState, target: Enemy, kind: "bolt" | "breach"): void {
  const speed = kind === "bolt" ? 17 : 19;
  const lead = distance(s.player, target) / speed;
  const angle = Math.atan2(target.y + target.vy * lead - s.player.y, target.x + target.vx * lead - s.player.x);
  s.projectiles.push({ id: s.nextId++, kind, x: s.player.x, y: s.player.y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    damage: kind === "bolt" ? 8 : 80, radius: kind === "bolt" ? 0.09 : 0.17,
    life: 1.4, hitIds: [], targetId: kind === "breach" ? target.id : undefined });
  s.player.muzzle = 0.08;
}
function passiveWeapons(s: GameState): void {
  if (s.progression && s.wave && s.waveCooldown <= 0) {
    const targets = s.enemies.filter(e => e.hp > 0 && distance(e, s.player) <= WAVE_RADIUS + enemyRadius(e));
    s.waveCooldown = WAVE_INTERVAL; s.stats.waveUses++;
    effect(s, "wave", s.player, WAVE_RADIUS, 0.45);
    for (const target of targets) hurtEnemy(s, target, 36, "wave");
  }
  if (s.progression && s.pierce && s.pierceCooldown <= 0) {
    const target = nearest(s, 12, true);
    if (target) { fire(s, target, "breach"); s.pierceCooldown = BREACH_INTERVAL; s.stats.pierceUses++; }
  }
  if (s.shotCooldown <= 0) {
    const target = nearest(s, 9);
    if (target) { fire(s, target, "bolt"); s.shotCooldown = 0.45; s.stats.shots++; }
  }
}
function damagePlayer(s: GameState, amount: number): void {
  if (s.player.invulnerable > 0) return;
  const damage = Math.min(amount, s.player.hp);
  s.player.hp -= damage; s.stats.damageTaken += damage; s.player.invulnerable = 0.65;
  if (s.player.hp <= 0) { s.status = "lost"; s.message = "Overwhelmed. Keep moving, find gaps, and let your passives clear the swarm."; }
}
/** Swept collision prevents fast bullets tunneling through small enemies. */
export function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function updateProjectiles(s: GameState, dt: number): void {
  for (const bullet of s.projectiles) {
    const old = { x: bullet.x, y: bullet.y };
    if (bullet.kind === "breach") {
      const target = s.enemies.find(e => e.id === bullet.targetId && e.hp > 0 && !bullet.hitIds.includes(e.id));
      if (target) {
        const d = Math.max(0.01, distance(bullet, target));
        const blend = 1 - Math.exp(-14 * dt);
        bullet.vx += ((target.x - bullet.x) / d * 19 - bullet.vx) * blend;
        bullet.vy += ((target.y - bullet.y) / d * 19 - bullet.vy) * blend;
      }
    }
    bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt;
    if (bullet.kind === "orb") {
      if (segmentDistance(s.player, old, bullet) <= 0.27 + bullet.radius) {
        damagePlayer(s, bullet.damage); bullet.life = 0;
        effect(s, "impact", bullet, 0.35, 0.16);
      }
    } else {
      // Test in travel order so the first obstruction catches ordinary bullets.
      const targets = s.enemies.filter(e => e.hp > 0 && !bullet.hitIds.includes(e.id)
        && segmentDistance(e, old, bullet) <= enemyRadius(e) + bullet.radius).sort((a, b) => distance(a, old) - distance(b, old));
      for (const e of targets) {
        hurtEnemy(s, e, bullet.damage, bullet.kind);
        bullet.hitIds.push(e.id); effect(s, "impact", bullet, bullet.kind === "breach" ? 0.5 : 0.2, 0.18);
        if (bullet.kind === "bolt") { bullet.life = 0; break; }
      }
    }
    if (bullet.x < -1 || bullet.x > WIDTH + 1 || bullet.y < -1 || bullet.y > HEIGHT + 1) bullet.life = 0;
  }
  s.projectiles = s.projectiles.filter(b => b.life > 0);
}
function barrage(s: GameState, boss: Enemy): void {
  // Rotating gaps keep the pattern readable; the second ring is staggered in later attacks.
  const offset = s.stats.barrages * 0.29;
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI * 2 / 16 + offset;
    s.projectiles.push({ id: s.nextId++, kind: "orb", x: boss.x + Math.cos(a) * 1.45, y: boss.y + Math.sin(a) * 1.45,
      vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2, damage: 11, radius: 0.14, life: 7, hitIds: [] });
  }
  s.stats.barrages++; effect(s, "break", boss, 2, 0.5);
}
function move(s: GameState, dt: number, input: Input): void {
  const p = s.player;
  let dx = input.x, dy = input.y;
  const steering = !!(dx || dy);
  if (!steering && input.destination) { dx = input.destination.x - p.x; dy = input.destination.y - p.y; }
  const d = Math.hypot(dx, dy);
  const speed = steering ? 4.6 : Math.min(4.6, d * 10);
  const blend = 1 - Math.exp(-16 * dt);
  p.vx += ((d > 0.02 ? dx / d * speed : 0) - p.vx) * blend;
  p.vy += ((d > 0.02 ? dy / d * speed : 0) - p.vy) * blend;
  p.x = clamp(p.x + p.vx * dt, 0.4, WIDTH - 0.4);
  p.y = clamp(p.y + p.vy * dt, 0.4, HEIGHT - 0.4);
  for (const e of s.enemies) {
    e.hit = Math.max(0, e.hit - dt); e.born += dt;
    const dist = Math.max(0.01, distance(e, p));
    const speed = e.kind === "drone" ? 1.65 : e.kind === "warden" ? 0.85 : 0.55;
    const stop = e.kind === "drone" ? 0.32 : 2.6;
    let vx = dist > stop ? (p.x - e.x) / dist * speed : 0;
    let vy = dist > stop ? (p.y - e.y) / dist * speed : 0;
    if (e.kind === "drone") for (const other of s.enemies) {
      if (other.id === e.id) continue;
      const separation = distance(e, other), spacing = enemyRadius(other) + 0.34;
      if (separation > 0.001 && separation < spacing) {
        const strength = (spacing - separation) / spacing * 2;
        vx += (e.x - other.x) / separation * strength;
        vy += (e.y - other.y) / separation * strength;
      }
    }
    const blend = 1 - Math.exp(-8 * dt);
    e.vx += (vx - e.vx) * blend; e.vy += (vy - e.vy) * blend;
    e.x = clamp(e.x + e.vx * dt, 0.35, WIDTH - 0.35);
    e.y = clamp(e.y + e.vy * dt, 0.35, HEIGHT - 0.35);
    if (e.born > 0.65 && distance(e, p) < enemyRadius(e) + 0.27) damagePlayer(s, e.kind === "drone" ? 5 : 14);
  }
}
function step(s: GameState, dt: number, input: Input): void {
  s.elapsed += dt; s.phaseTime += dt;
  if (s.elapsed >= ROUND_SECONDS) {
    s.elapsed = ROUND_SECONDS; s.status = "timeout";
    s.message = "Time is up. Compare how the two arsenals handled the same escalating arena."; return;
  }
  s.waveCooldown = Math.max(0, s.waveCooldown - dt); s.pierceCooldown = Math.max(0, s.pierceCooldown - dt);
  s.shotCooldown = Math.max(0, s.shotCooldown - dt); s.brokenArmor = Math.max(0, s.brokenArmor - dt);
  s.player.invulnerable = Math.max(0, s.player.invulnerable - dt); s.player.muzzle = Math.max(0, s.player.muzzle - dt);
  s.effects = s.effects.filter(e => (e.life -= dt) > 0);
  move(s, dt, input);
  if (s.status !== "playing") return;
  for (const hazard of s.hazards) {
    hazard.left -= dt;
    if (hazard.left <= 0) {
      effect(s, "break", hazard, hazard.radius, 0.3);
      if (distance(hazard, s.player) < hazard.radius) damagePlayer(s, 15);
    }
  }
  s.hazards = s.hazards.filter(h => h.left > 0);
  if (s.status !== "playing") return;
  if (s.phase > 0 && s.phaseTime >= s.nextHazard) {
    s.hazards.push({ x: s.player.x, y: s.player.y, radius: 1.5, left: 1.2 }); s.nextHazard += 6;
  }
  if (s.phase > 0 && s.phaseTime >= s.nextSummon) {
    spawnDrones(s, s.phase === 1 ? 6 : 4, true);
    s.nextSummon += s.phase === 1 ? 3.2 : 5;
  }
  const boss = s.enemies.find(e => e.kind === "warden");
  if (boss) {
    if (s.barrageCharge > 0) {
      s.barrageCharge -= dt;
      if (s.barrageCharge <= 0) { s.barrageCharge = 0; barrage(s, boss); }
    } else if (s.phaseTime >= s.nextBarrage) {
      s.barrageCharge = 0.9; s.nextBarrage += 4.5;
    }
  }
  passiveWeapons(s);
  updateProjectiles(s, dt);
  if (s.status === "playing") resolveDefeats(s);
}
/** Substeps keep acceleration and swept projectile collisions stable at different refresh rates. */
export function tick(s: GameState, seconds: number, input: Input = { x: 0, y: 0 }): void {
  if (s.status !== "playing" || !Number.isFinite(seconds) || seconds <= 0) return;
  let left = Math.min(0.1, seconds);
  while (left > 1e-8 && s.status === "playing") {
    const dt = Math.min(left, 1 / 120); step(s, dt, input); left -= dt;
  }
}
