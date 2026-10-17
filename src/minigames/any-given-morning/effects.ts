import { DYING_SECONDS, TELEGRAPH, type Life } from "./game";
import type { Sprites } from "./sprites";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function deathProgress(life: Life): number { return clamp(life.dyingElapsed / DYING_SECONDS); }
export function playerPose(life: Life): { x: number; y: number; alpha: number; scale: number } {
  const p = deathProgress(life), kind = life.death?.kind;
  let { x, y } = life.player, alpha = 1, scale = 1;
  if (life.round.screen !== "DYING" && life.round.screen !== "DEAD") return { x, y, alpha, scale };
  if (kind === "ufo") { y -= p * 180; alpha = 1 - p; }
  else if (kind === "gator_explodes") { x += p * 70; y -= Math.sin(p * Math.PI) * 95; alpha = 1 - clamp((p - 0.7) * 4); }
  else if (kind === "tornado" || kind === "crows") { x += Math.sin(p * 18) * p * 24; y -= p * 170; alpha = 1 - p; }
  else if (kind === "sinkhole") { scale = 1 - p; alpha = 1 - p; y += p * 9; }
  else if (kind === "flood") { x -= p * 120; alpha = 1 - p; }
  else if (["bloom", "wave_goodbye", "lights_out"].includes(kind ?? "")) alpha = 1 - p;
  else alpha = p < 0.15 ? 1 : 0;
  return { x, y, alpha, scale };
}

export function shake(life: Life, reduced: boolean): { x: number; y: number } {
  if (reduced || life.round.screen !== "DYING" || life.death?.peaceful) return { x: 0, y: 0 };
  const p = deathProgress(life), strength = Math.max(0, 1 - p * 2) * 3;
  return { x: Math.round(Math.sin(p * 125) * strength), y: Math.round(Math.cos(p * 97) * strength) };
}

/** All effects use animation time, so leaving the screen creates no particle timers. */
export function drawEffects(ctx: CanvasRenderingContext2D, life: Life, sprites: Sprites, reduced: boolean): void {
  const dying = life.round.screen === "DYING" || life.round.screen === "DEAD";
  if (!life.death || (!dying && !life.telegraph)) return;
  const p = deathProgress(life), warning = clamp(1 - ((life.deathAt ?? 0) - life.elapsed) / TELEGRAPH);
  const { x, y } = life.player;
  const rect = (color: string, a: number, b: number, w: number, h: number) => {
    ctx.fillStyle = color; ctx.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h));
  };
  const oval = (color: string, a: number, b: number, rx: number, ry: number) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(a, b, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); ctx.fill();
  };
  const burst = (colors: string[], count: number, radius = 50, fall = 30) => {
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996, distance = (0.25 + (i % 7) / 9) * radius * Math.sqrt(p);
      rect(colors[i % colors.length], x + Math.cos(angle) * distance, y - 8 + Math.sin(angle) * distance + p * p * fall, 2, 2 + i % 2);
    }
  };
  const shadow = (size = 1) => {
    ctx.save(); ctx.globalAlpha = 0.25 + warning * 0.35;
    oval("#302f3b", x, y + 4, (3 + warning * 13) * size, (2 + warning * 5) * size); ctx.restore();
  };
  const meteor = (q: number, offset = 0) => {
    if (q < 0.22) {
      const d = (0.22 - q) * 500;
      ctx.strokeStyle = "#ffe1a1"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + d + 14 + offset, y - d - 35); ctx.lineTo(x + d + offset, y - d - 5); ctx.stroke();
      sprites.draw(ctx, "meteor", x + d - 8 + offset, y - d - 16, 24);
    } else {
      oval("#5d493c", x + offset, y + 4, 17, 7); oval("#3c3537", x + offset, y + 3, 12, 4);
    }
  };
  ctx.save();
  switch (life.death.kind) {
    case "meteor": case "comet_pair":
      if (!dying) shadow();
      else { meteor(p * 1.6); if (life.death.kind === "comet_pair" && p > 0.48) meteor((p - 0.48) * 2, 5); burst(["#efc35c", "#c56b59", "#78513c"], 25, 38, 27); }
      break;
    case "lightning":
      if (!dying) {
        const cloudY = Math.max(10, y - 56);
        oval("#57576b", x + 6, cloudY, 23, 7); rect("#efc35c", x + 4, cloudY + 7, 2, warning * 9);
      } else {
        if (p < 0.3) {
          ctx.strokeStyle = "#fff1cc"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 10, -20); ctx.lineTo(x - 5, y - 35); ctx.lineTo(x + 7, y - 35); ctx.lineTo(x, y); ctx.stroke();
          rect("#3c3537", x - 3, y - 13, 6, 5); rect("#3c3537", x - 4, y - 8, 8, 5);
          rect("#3c3537", x - 3, y - 3, 2, 5); rect("#3c3537", x + 1, y - 3, 2, 5);
        }
        burst(["#57576b", "#3c3537"], 24, 19, 8);
      }
      break;
    case "gator_explodes":
      if (!dying) sprites.draw(ctx, warning > 0.6 ? "alligator_glow" : "alligator", x + 10, y - 10, 32);
      else {
        burst(["#efc35c", "#b4829b", "#fff1cc", "#89bec1"], 46, 80, 50);
        for (let i = 0; i < 7; i++) oval("#729b48", x + Math.sin(i * 8) * p * 60, y + Math.cos(i * 5) * p * 25, 4, 2);
      }
      break;
    case "sinkhole":
      ctx.strokeStyle = "#57433a"; ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9, r = dying ? 24 : warning * 18;
        ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.4); ctx.lineTo(x + Math.cos(a + 0.25) * r, y + Math.sin(a + 0.25) * r * 0.6); ctx.stroke();
      }
      if (dying) { oval("#3c3537", x, y + 4, 5 + p * 15, 3 + p * 6); burst(["#b67a4d", "#78513c"], 18, 24, 12); }
      break;
    case "ufo": {
      const top = Math.max(12, y - 62) - (dying ? p * 100 : 0);
      ctx.globalAlpha = 0.24; ctx.fillStyle = "#d4e3bf"; ctx.beginPath(); ctx.moveTo(x - 8, top + 8); ctx.lineTo(x - 26, y + 12); ctx.lineTo(x + 26, y + 12); ctx.lineTo(x + 8, top + 8); ctx.fill(); ctx.globalAlpha = 1;
      sprites.draw(ctx, "ufo", x - 24, top - 12, 48);
      if (dying) sprites.tile(ctx, 121, x + 12, y - p * 170 - 12);
      break;
    }
    case "piano":
      if (!dying) shadow(1.2);
      else {
        sprites.draw(ctx, "piano", x - 18, y - 27 - Math.max(0, 0.2 - p) * 600, 36);
        if (p > 0.2) for (let i = 0; i < 8; i++) {
          const a = i * 0.9, r = p * 45, nx = x + Math.cos(a) * r, ny = y - 15 + Math.sin(a) * r - p * 15;
          oval("#3c3537", nx, ny, 2, 1); rect("#3c3537", nx + 1, ny - 7, 1, 7); rect("#3c3537", nx + 1, ny - 7, 4, 1);
        }
      }
      break;
    case "crows":
      for (let i = 0; i < 18; i++) {
        const r = dying ? 28 * (1 - p) : 34;
        sprites.draw(ctx, "crow", x + Math.cos(i * 3 + p * 20) * r - 8, y - (dying ? p * 150 : 45 + warning * 15) + Math.sin(i * 5) * 10, 16, i % 2 === 0);
      }
      if (dying && p > 0.5) { rect("#3c3537", x + p * 8, y - 15 + p * 22, 2, 5); rect("#57576b", x + p * 8 + 2, y - 16 + p * 22, 2, 3); }
      break;
    case "tornado":
      sprites.draw(ctx, "tornado", x - 16 + (dying ? p * 155 : (1 - warning) * 90), y - 30 - (dying ? p * 110 : 0), 36);
      if (dying) burst(["#d4b77d", "#729b48"], 22, 40, -70);
      break;
    case "hay_avalanche":
      for (let i = 0; i < 8; i++) {
        const q = dying ? clamp(p * 3 - i * 0.08) : 0;
        ctx.save(); ctx.translate(x + 26 + i % 3 * 13 - q * (26 + i % 3 * 13), y - 18 - Math.floor(i / 3) * 13 + q * 18); ctx.rotate(q * (i % 2 ? 0.7 : -0.7)); sprites.tile(ctx, 96, -8, -8); ctx.restore();
      }
      break;
    case "flood": {
      const edge = dying ? 320 - p * 440 : 310 - warning * 18;
      rect("#568f9d", edge, 0, 400, 192);
      for (let i = 0; i < 14; i++) { oval("#d4e3bf", edge + Math.sin(i * 2 + p * 20) * 5, i * 16, 5, 8); rect("#89bec1", edge + 12 + i % 4 * 16, i * 15, 20, 2); }
      if (dying) sprites.draw(ctx, "dock", x - p * 110, y + Math.sin(p * 10) * 6);
      break;
    }
    case "bloom":
      if (dying) {
        for (let i = 0; i < 12; i++) if (p > i / 20) sprites.draw(ctx, "flowers", x + Math.sin(i * 4) * 24 - 8, y + Math.cos(i * 3) * 9 - 8);
        rect("#78513c", x - 2, y - p * 25, 4, p * 27);
        for (let i = 0; i < 5; i++) oval(i % 2 ? "#729b48" : "#a6bc59", x + Math.sin(i * 5) * 11 * p, y - 23 * p + Math.cos(i * 5) * 7, p * 12, p * 10);
      }
      break;
    case "lights_out":
      if (dying) { ctx.globalAlpha = p; rect("#242839", 0, 0, 320, 192); ctx.globalAlpha = 1; for (let i = 0; i < 15; i++) if (p > 0.5) rect("#fff1cc", i * 23 % 320, i * 37 % 96, 1, 1); }
      break;
    case "wave_goodbye":
      if (dying) {
        sprites.person(ctx, 2, 255, 25, false);
        rect("#e4b18a", 267, 29 + Math.sin(p * 22) * 2, 2, 5);
        ctx.globalAlpha = 1 - p;
        rect("#e4b18a", x + 5, y - 11 + Math.sin(p * 22) * 2, 2, 5);
        ctx.globalAlpha = p * 0.55; rect("#fff1cc", 0, 0, 320, 192);
      }
      break;
  }
  if (!reduced && dying && !life.death.peaceful && p > 0.12 && p < 0.2) {
    ctx.globalAlpha = (0.2 - p) * 4; rect("#fff1cc", 0, 0, 320, 192);
  }
  ctx.restore();
}
