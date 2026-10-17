import { INTERACTION_RADIUS, type Life } from "./game";
import { drawEffects, playerPose, shake } from "./effects";
import { createSprites } from "./sprites";
import type { Point } from "./world";

export interface Renderer { ready: Promise<void>; draw(life: Life, dialogue: string | null): void; dispose(): void }
export function createRenderer(canvas: HTMLCanvasElement, reduced: () => boolean): Renderer {
  const context = canvas.getContext("2d");
  // jsdom and browsers without canvas still get the complete DOM interface.
  if (!context) return { ready: Promise.resolve(), draw() {}, dispose() {} };
  const scene = document.createElement("canvas"); scene.width = 320; scene.height = 192;
  const ctx = scene.getContext("2d");
  if (!ctx) return { ready: Promise.resolve(), draw() {}, dispose() {} };
  const sprites = createSprites();
  let facing = false;
  const rect = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const shadow = (x: number, y: number, w = 6) => {
    ctx.save(); ctx.globalAlpha = 0.19; ctx.fillStyle = "#3c3537";
    ctx.beginPath(); ctx.ellipse(x, y + 4, w, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  const prop = (kind: string, x: number, y: number, time: number) => {
    const names: Record<string, string> = { market_stall: "stall", flower_patch: "flowers", hat_on_post: "hat", cairn: "stone", water_bank: "stone" };
    const tiles: Record<string, number> = { bush: 39, fruit_bush: 78, hay_bale: 96, stacked_hay: 97, grain_sack: 74, trough: 112, crop_plot: 30, boot_on_fence: 84 };
    if (kind === "barn") {
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) sprites.tile(ctx, [90, 102, 126][row] + col, x - 8 + col * 16, y - 24 + row * 16);
    } else if (kind === "crop_plots") {
      for (let i = 0; i < 6; i++) { sprites.tile(ctx, 49, x - 8 + i % 3 * 16, y - 8 + Math.floor(i / 3) * 16); sprites.tile(ctx, 29 + i % 2, x - 8 + i % 3 * 16, y - 11 + Math.floor(i / 3) * 16); }
    } else if (kind === "reeds") {
      for (let i = 0; i < 4; i++) { const sway = reduced() ? 0 : Math.round(Math.sin(time + i)); rect("#405c43", x - 5 + i * 3 + sway, y - 10 + i % 2 * 4, 1, 12 - i % 2 * 4); rect("#b67a4d", x - 5 + i * 3 + sway, y - 12 + i % 2 * 4, 2, 4); }
    } else if (kind === "dock") {
      for (let i = 0; i < 3; i++) sprites.draw(ctx, "dock", x - 8 + i * 16, y - 8);
    } else if (kind === "heart_in_dirt") {
      rect("#b67a4d", x - 4, y - 1, 3, 2); rect("#b67a4d", x + 1, y - 1, 3, 2); rect("#b67a4d", x - 3, y + 1, 6, 2); rect("#b67a4d", x - 1, y + 3, 2, 2);
    } else if (tiles[kind] !== undefined) sprites.tile(ctx, tiles[kind], x - 8, y - 10);
    else sprites.draw(ctx, names[kind] ?? kind, x - 8, y - 10);
  };
  return {
    ready: sprites.ready,
    draw(life, dialogue) {
      const available = Math.min(960, canvas.parentElement?.clientWidth || 320);
      const cssWidth = available < 320 ? available : Math.floor(available / 320) * 320;
      canvas.style.maxWidth = `${cssWidth}px`;
      const scale = Math.max(1, Math.floor(cssWidth * (window.devicePixelRatio || 1) / 320));
      if (canvas.width !== 320 * scale || canvas.height !== 192 * scale) { canvas.width = 320 * scale; canvas.height = 192 * scale; }
      ctx.imageSmoothingEnabled = context.imageSmoothingEnabled = false;
      const time = life.elapsed + life.dyingElapsed, motion = reduced() ? 0 : time;
      const world = life.world, waterFrame = Math.floor(motion * 1.5) % 2;
      rect("#a6bc72", 0, 0, 320, 192);
      ctx.save();
      const offset = shake(life, reduced()); ctx.translate(offset.x, offset.y);
      // Sparse seeded blades preserve the readable, pale ground of Tiny Farm.
      for (let row = 0; row < 12; row++) for (let col = 0; col < 20; col++) {
        const x = col * 16, y = row * 16, hash = (col * 37 + row * 73 + world.seed) >>> 0;
        if (world.biome === "riverside" && col >= 15 && col < 19 && row > 0 && row < 11) {
          sprites.draw(ctx, col === 15 ? (waterFrame ? "shore2" : "shore") : (waterFrame ? "water2" : "water"), x, y); continue;
        }
        if ((row === 6 && col > 0 && col < (world.biome === "riverside" ? 15 : 19)) || (col === 7 && row > 2 && row < 10)) {
          const horizontalOnly = row === 6 && col !== 7;
          rect("#d8ba83", x, y + (horizontalOnly ? 3 : 0), 16, horizontalOnly ? 10 : 16);
          if (hash % 3 === 0) rect("#b99a69", x + 5, y + 8, 2, 1);
        } else if (hash % 3 === 0) {
          const sway = Math.round(Math.sin(motion * 1.4 + hash)) * (hash % 2);
          rect("#819e55", x + 4 + sway, y + 9, 1, 3); rect("#819e55", x + 6, y + 10, 1, 2);
          rect("#bed185", x + 11, y + 4, 2, 1);
        }
      }
      // The boundary corresponds to the solid ring in the collision grid.
      for (let x = 0; x < 20; x++) { sprites.tile(ctx, x % 3 === 0 ? 15 : 39, x * 16, -3); sprites.tile(ctx, 39, x * 16, 177); }
      for (let y = 1; y < 11; y++) { sprites.tile(ctx, 39, -3, y * 16); sprites.tile(ctx, 39, 307, y * 16); }
      const entities: { at: Point; draw: () => void }[] = [];
      const add = (at: Point, draw: () => void) => entities.push({ at, draw });
      world.props.forEach((p) => add(p, () => { shadow(p.x, p.y, p.kind === "barn" ? 24 : 7); prop(p.kind, p.x, p.y, motion); }));
      world.stations.forEach((s) => {
        if (!world.props.some((p) => p.x === s.x && p.y === s.y && p.kind === s.kind)) add(s, () => prop(s.kind, s.x, s.y, motion));
      });
      world.traces.forEach((t) => add(t, () => prop(t.kind, t.x, t.y, motion)));
      if (world.easterEgg) { const egg = world.easterEgg; add(egg, () => prop(egg.kind, egg.x, egg.y, motion)); }
      world.items.filter((i) => !i.taken).forEach((i) => add(i, () => { shadow(i.x, i.y, 4); sprites.draw(ctx, i.kind, i.x - 8, i.y - 10); }));
      world.animals.filter((a) => !a.hidden).forEach((a, i) => add(a, () => {
        shadow(a.x, a.y);
        const peck = a.kind === "chicken" && Math.sin(motion * 2 + i) > 0.85 ? 2 : 0;
        if (a.kind === "frog") sprites.draw(ctx, "frog", a.x - 8, a.y - 9);
        else sprites.tile(ctx, { chicken: 122, cow: 121, sheep: 120, gator: 121 }[a.kind], a.x - 8, a.y - 10 + peck, Math.sin(motion * 0.3 + i) < 0);
        if (a.kind === "cow") rect("#78513c", a.x + 6, a.y - 2 + Math.round(Math.sin(motion * 3) * 2), 3, 1);
      }));
      world.npcs.forEach((npc, i) => add(npc, () => {
        shadow(npc.x, npc.y);
        const bob = reduced() ? 0 : Math.round(Math.sin(motion * 2 + npc.phase) * 0.65);
        if (npc.archetype === "dog") sprites.draw(ctx, "dog", npc.x - 8, npc.y - 11 + bob);
        else {
          if (npc.archetype === "sleeper" && !npc.awake) { ctx.save(); ctx.translate(npc.x, npc.y); ctx.rotate(Math.PI / 2); sprites.person(ctx, i + 1, -9, -8, false); ctx.restore(); }
          else sprites.person(ctx, i + 1, npc.x - 8, npc.y - 12 + bob, Math.sin(npc.phase) < 0);
          if (npc.archetype === "couple") sprites.person(ctx, i + 2, npc.x + 2, npc.y - 12 - bob, true);
        }
      }));
      const player = playerPose(life), speed = Math.hypot(life.player.vx, life.player.vy);
      if (life.player.vx !== 0) facing = life.player.vx < 0;
      add(life.player, () => {
        if (life.round.screen === "PLAY") shadow(player.x, player.y);
        if (!reduced() && speed > 15 && life.round.screen === "PLAY") {
          for (let i = 0; i < 3; i++) {
            const age = (time * 3 + i / 3) % 1; ctx.globalAlpha = (1 - age) * 0.3;
            rect("#fff1cc", player.x - life.player.vx / 13 * age + i - 2, player.y + 3 - age * 3, 2, 2);
          } ctx.globalAlpha = 1;
        }
        ctx.save(); ctx.globalAlpha = player.alpha;
        ctx.translate(Math.round(player.x), Math.round(player.y)); ctx.scale(player.scale, player.scale);
        const walking = !reduced() && speed > 8;
        if (walking) ctx.scale(1 + Math.sin(motion * 18) * 0.025, 1 - Math.sin(motion * 18) * 0.025);
        const bob = walking ? Math.round(Math.sin(motion * 18)) : 0;
        sprites.person(ctx, 0, -8, -12 + bob, facing); ctx.restore();
      });
      entities.sort((a, b) => a.at.y - b.at.y).forEach((e) => e.draw());
      const adjacent = [...world.items.filter((i) => !i.taken), ...world.npcs, ...world.stations, ...world.traces]
        .filter((at) => Math.hypot(at.x - life.player.x, at.y - life.player.y) <= INTERACTION_RADIUS)
        .sort((a, b) => Math.hypot(a.x - life.player.x, a.y - life.player.y) - Math.hypot(b.x - life.player.x, b.y - life.player.y))[0];
      if (adjacent && life.round.screen === "PLAY" && !dialogue) {
        const bob = Math.round(Math.sin(motion * 4));
        rect("#3c3537", adjacent.x - 3, adjacent.y - 22 + bob, 7, 7); rect("#fff1cc", adjacent.x - 2, adjacent.y - 21 + bob, 5, 4); rect("#fff1cc", adjacent.x, adjacent.y - 16 + bob, 1, 2);
      }
      // Cloud shadows cross at a different speed from ground animation.
      ctx.globalAlpha = 0.07;
      for (let i = 0; i < 4; i++) { const x = (motion * 2 + i * 111) % 440 - 70; rect("#fff1cc", x, 20 + i * 39, 40, 8); rect("#fff1cc", x + 10, 14 + i * 39, 22, 8); }
      ctx.globalAlpha = Math.min(1, life.elapsed / 20) * 0.17; rect("#c67c54", 0, 0, 320, 192); ctx.globalAlpha = 1;
      drawEffects(ctx, life, sprites, reduced()); ctx.restore();
      if (dialogue && life.round.screen === "PLAY") {
        ctx.font = "8px ui-monospace, monospace";
        const lines: string[] = []; let line = "";
        for (const word of dialogue.split(" ")) {
          if (ctx.measureText(`${line} ${word}`).width > 278) { lines.push(line); line = word; } else line += `${line ? " " : ""}${word}`;
        } lines.push(line);
        const height = 14 + lines.length * 11;
        rect("#3c3537", 10, 182 - height, 300, height); rect("#fff1cc", 12, 184 - height, 296, height - 4);
        ctx.fillStyle = "#3c3537"; lines.forEach((text, i) => ctx.fillText(text, 20, 194 - height + i * 11));
      }
      context.setTransform(scale, 0, 0, scale, 0, 0); context.clearRect(0, 0, 320, 192); context.drawImage(scene, 0, 0);
    },
    dispose() { sprites.dispose(); scene.width = scene.height = 0; },
  };
}
