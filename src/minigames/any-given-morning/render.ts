import { nearestInteraction, type Life } from "./game";
import { drawEffects, playerPose, shake } from "./effects";
import { createSprites, type Sprites } from "./sprites";
import type { Point } from "./world";

export interface Renderer { ready: Promise<void>; draw(life: Life, dialogue: string | null): void; dispose(): void }

// Each glyph occupies three by five native pixels, with a one-pixel gap.
const GLYPHS: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
  E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
  I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
  M: "101111111101101", N: "101111111111101", O: "010101101101010", P: "110101110100100",
  Q: "010101101111011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
  Y: "101101010010010", Z: "111001010100111",
};
function pixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  [...text.toUpperCase()].forEach((letter, i) => {
    [...(GLYPHS[letter] ?? "")].forEach((pixel, j) => {
      if (pixel === "1") ctx.fillRect(x + i * 4 + j % 3, y + Math.floor(j / 3), 1, 1);
    });
  });
}

/** Derive icons from inventory each frame so used or removed items disappear. */
export function drawCarriedItems(ctx: CanvasRenderingContext2D, life: Life, sprites: Sprites, x: number, y: number): void {
  life.inventory.forEach((item, i) => {
    const left = Math.round(x - life.inventory.length * 5 + i * 10);
    if (item === "grain") {
      ctx.save(); ctx.translate(left, Math.round(y)); ctx.scale(0.5, 0.5); sprites.tile(ctx, 74, 0, 0); ctx.restore();
    } else sprites.draw(ctx, item === "water" ? "water_can" : item, left, Math.round(y), 8);
  });
}
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
        const sitting = life.round.screen === "PLAY" && life.sittingUntil > life.elapsed;
        if (sitting) ctx.scale(1, 0.75);
        sprites.person(ctx, 0, -8, -12 + bob, facing);
        if (sitting) rect("#3c3537", facing ? -6 : 2, 2, 5, 2);
        ctx.restore();
        if (life.round.screen === "PLAY") drawCarriedItems(ctx, life, sprites, player.x, Math.max(1, player.y - 24));
      });
      entities.sort((a, b) => a.at.y - b.at.y).forEach((e) => e.draw());
      const target = nearestInteraction(life), adjacent = target?.at;
      if (adjacent && target && life.round.screen === "PLAY") {
        const bob = Math.round(Math.sin(motion * 4));
        const markerY = Math.max(2, Math.round(adjacent.y - 22 + bob));
        rect("#3c3537", adjacent.x - 3, markerY, 7, 7); rect("#fff1cc", adjacent.x - 2, markerY + 1, 5, 4); rect("#fff1cc", adjacent.x, markerY + 6, 1, 2);
        const width = target.label.length * 4 + 3;
        const left = Math.max(1, Math.min(319 - width, Math.round(adjacent.x + 6)));
        rect("#fff1cc", left, markerY, width, 9);
        ctx.fillStyle = "#3c3537"; pixelText(ctx, target.label, left + 2, markerY + 2);
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
