import { armored, BREACH_INTERVAL, HEIGHT, WAVE_INTERVAL, WAVE_RADIUS, WIDTH, type GameState, type Point } from "./game";

/** Immediate-mode canvas avoids rebuilding hundreds of SVG nodes on every frame. */
export function createRenderer(canvas: HTMLCanvasElement): (state: GameState, destination: Point | null) => void {
  const ctx = typeof CanvasRenderingContext2D === "undefined" ? null : canvas.getContext("2d");
  if (!ctx) return () => {};
  function circle(x: number, y: number, r: number, fill?: string, stroke?: string, width = 0.04) {
    ctx!.beginPath(); ctx!.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    if (fill) { ctx!.fillStyle = fill; ctx!.fill(); }
    if (stroke) { ctx!.strokeStyle = stroke; ctx!.lineWidth = width; ctx!.stroke(); }
  }
  function polygon(x: number, y: number, radius: number, sides: number, angle: number, fill: string, stroke: string, inner = 1) {
    ctx!.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = angle + i / sides * Math.PI * 2;
      const r = radius * (i % 2 ? inner : 1);
      if (!i) ctx!.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else ctx!.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx!.closePath(); ctx!.fillStyle = fill; ctx!.fill(); ctx!.strokeStyle = stroke; ctx!.lineWidth = .06; ctx!.stroke();
  }
  return (state, destination) => {
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || width * HEIGHT / WIDTH;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
    ctx.setTransform(pixelWidth / WIDTH, 0, 0, pixelHeight / HEIGHT, 0, 0);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.setLineDash([]);
    ctx.fillStyle = "#09121e"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const light = ctx.createRadialGradient(10, 6, 0, 10, 6, 12);
    light.addColorStop(0, state.phase === 2 ? "#321b2a" : "#182c3b"); light.addColorStop(1, "#09121e");
    ctx.fillStyle = light; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = "#33475a55"; ctx.lineWidth = .018;
    ctx.beginPath();
    for (let x = 1; x < WIDTH; x++) { ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); }
    for (let y = 1; y < HEIGHT; y++) { ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); }
    ctx.stroke();
    const p = state.player;
    if (destination && state.status === "playing") {
      circle(destination.x, destination.y, .21, undefined, "#ffffff66");
      ctx.strokeStyle = "#ffffff44"; ctx.lineWidth = .025; ctx.beginPath();
      ctx.moveTo(destination.x - .3, destination.y); ctx.lineTo(destination.x + .3, destination.y);
      ctx.moveTo(destination.x, destination.y - .3); ctx.lineTo(destination.x, destination.y + .3); ctx.stroke();
    }
    if (state.wave) {
      const progress = Math.max(0, Math.min(1, 1 - state.waveCooldown / WAVE_INTERVAL));
      ctx.setLineDash([.1, .16]); circle(p.x, p.y, WAVE_RADIUS, "#72e8d706", "#72e8d75c", .035); ctx.setLineDash([]);
      // This expanding boundary shares the weapon's actual cooldown, including pause.
      circle(p.x, p.y, WAVE_RADIUS * progress, "#72e8d70d", "#85f5dc", .045);
      circle(p.x, p.y, WAVE_RADIUS * progress, undefined, "#85f5dc20", .16);
    }
    for (const h of state.hazards) {
      const growth = 1 - h.left / 1.2;
      circle(h.x, h.y, h.radius, "#ff803d18", "#ffc171aa", .045);
      circle(h.x, h.y, h.radius * growth, "#ff803d25");
      ctx.fillStyle = "#ffce8e"; ctx.font = "bold .6px monospace"; ctx.textAlign = "center"; ctx.fillText("!", h.x, h.y + .2);
    }
    for (const e of state.enemies) {
      const angle = state.elapsed * (e.kind === "warden" ? -.32 : .5);
      ctx.globalAlpha = Math.min(1, .3 + e.born * 2);
      const hit = e.hit > 0;
      if (e.kind === "drone") {
        polygon(e.x, e.y, .32, 4, angle, hit ? "#ffffff" : "#ab94de", "#ddc7ff");
      } else if (e.kind === "summoner") {
        circle(e.x, e.y, 1.15, "#a278ff0c", "#a278ff33", .025);
        polygon(e.x, e.y, .82, 6, angle, hit ? "#ffffff" : "#352954", "#c2a4ff");
        polygon(e.x, e.y, .42, 3, -angle, "#6e4c9c", "#e3caff");
        for (let i = 0; i < 3; i++) {
          const a = angle + i * Math.PI * 2 / 3;
          polygon(e.x + Math.cos(a) * 1.08, e.y + Math.sin(a) * 1.08, .13, 4, a, "#d2b9ff", "#d2b9ff");
        }
      } else {
        const charge = state.barrageCharge > 0;
        const r = 1.35 + .035 * Math.sin(state.elapsed * 3);
        circle(e.x, e.y, 1.8, "#ff544d0a", charge ? "#ffb7a6" : "#ff655933", charge ? .09 : .025);
        polygon(e.x, e.y, r, 16, angle, hit ? "#ffffff" : "#53212b", "#ff8977", .72);
        polygon(e.x, e.y, .85, 8, -angle, "#9b3639", "#ffb4a0");
        polygon(e.x, e.y, .4, 4, Math.PI / 4, charge ? "#ffffff" : "#ffc2a7", "#fff0d8");
        if (armored(state)) {
          ctx.setLineDash([.3, .13]); circle(e.x, e.y, 1.56, undefined, "#b3c4e9", .09); ctx.setLineDash([]);
        } else if (state.brokenArmor > 0) {
          // Broken gold segments remain visible for the actual armor-break duration.
          ctx.strokeStyle = "#ffd18a"; ctx.lineWidth = .075;
          for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2 + .15;
            ctx.beginPath(); ctx.arc(e.x, e.y, 1.62, a, a + .75 * state.brokenArmor / 3); ctx.stroke();
          }
          ctx.fillStyle = "#ffe0a6"; ctx.font = "bold .24px monospace"; ctx.textAlign = "center";
          ctx.fillText("BREACHED", e.x, e.y + 1.98);
        }
        if (charge) {
          circle(e.x, e.y, 1.8 + (1 - state.barrageCharge / .9) * .7, undefined, "#ffaf69", .06);
          for (let i = 0; i < 16; i++) {
            const a = i * Math.PI * 2 / 16 + state.stats.barrages * .29;
            ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * 1.6, e.y + Math.sin(a) * 1.6);
            ctx.lineTo(e.x + Math.cos(a) * 2.6, e.y + Math.sin(a) * 2.6);
            ctx.strokeStyle = "#ff917866"; ctx.lineWidth = .03; ctx.stroke();
          }
        }
      }
      const r = e.kind === "drone" ? .35 : e.kind === "summoner" ? .85 : 1.3;
      ctx.fillStyle = "#4c5264"; ctx.fillRect(e.x - r, e.y - r - .28, r * 2, .07);
      ctx.fillStyle = e.kind === "warden" ? "#ff9e85" : "#cfb8ff";
      ctx.fillRect(e.x - r, e.y - r - .28, r * 2 * Math.max(0, e.hp / e.maxHp), .07);
    }
    ctx.globalAlpha = 1;
    for (const b of state.projectiles) {
      if (b.kind === "orb") {
        circle(b.x, b.y, .24, "#ff7b4626"); circle(b.x, b.y, b.radius, "#ff9b64", "#ffe3a6", .03);
      } else {
        const color = b.kind === "breach" ? "#ffcb75" : "#88f5e5";
        if (b.kind === "breach") {
          for (let i = 5; i > 0; i--) {
            circle(b.x - b.vx * .018 * i, b.y - b.vy * .018 * i, .2 - i * .025, `rgba(255,192,91,${.5 - i * .07})`);
          }
          circle(b.x, b.y, .35, "#ffc77824");
        }
        ctx.lineWidth = b.kind === "breach" ? .13 : .06; ctx.lineCap = "round";
        ctx.strokeStyle = b.kind === "breach" ? "#ffcb7566" : "#88f5e566";
        ctx.beginPath(); ctx.moveTo(b.x - b.vx * .045, b.y - b.vy * .045); ctx.lineTo(b.x, b.y); ctx.stroke();
        circle(b.x, b.y, b.radius * 1.4, color); circle(b.x, b.y, b.radius * .62, "#ffffff");
      }
    }
    for (const e of state.effects) {
      const t = 1 - e.life / e.duration;
      ctx.globalAlpha = Math.max(0, 1 - t);
      if (e.kind === "wave") {
        // At discharge the charge circle has reached full radius: flash that boundary.
        circle(e.x, e.y, e.radius, "#86ffe814", "#c4fff0", .12 * (1 - t) + .025);
        circle(e.x, e.y, e.radius * (1 + t * .08), undefined, "#86ffe888", .035);
      } else if (e.kind === "armor-break") {
        circle(e.x, e.y, e.radius * (1 + t * .65), undefined, "#ffd18a", .09 * (1 - t));
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          polygon(e.x + Math.cos(a) * e.radius * (1 + t), e.y + Math.sin(a) * e.radius * (1 + t), .13 * (1 - t), 3, a + t * 3, "#ffe2a5", "#fff5d8");
        }
      } else if (e.kind === "burst") {
        for (let i = 0; i < 7; i++) {
          const a = i * Math.PI * 2 / 7;
          ctx.strokeStyle = "#ded2ff"; ctx.lineWidth = .055;
          ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * t * e.radius, e.y + Math.sin(a) * t * e.radius);
          ctx.lineTo(e.x + Math.cos(a) * (t * e.radius + .16), e.y + Math.sin(a) * (t * e.radius + .16)); ctx.stroke();
        }
      } else circle(e.x, e.y, e.radius * (.3 + t), undefined, e.kind === "spawn" ? "#c6acff" : e.kind === "break" ? "#ffac80" : "#ffffff", .05);
    }
    ctx.globalAlpha = 1;
    if (state.pierce) {
      const progress = Math.max(0, Math.min(1, 1 - state.pierceCooldown / BREACH_INTERVAL));
      const angle = -Math.PI / 2 + progress * Math.PI * 2;
      circle(p.x, p.y, .67, undefined, "#ffc77833", .07);
      ctx.beginPath(); ctx.arc(p.x, p.y, .67, -Math.PI / 2, angle);
      ctx.strokeStyle = "#ffd18a"; ctx.lineWidth = .075; ctx.stroke();
      circle(p.x + Math.cos(angle) * .67, p.y + Math.sin(angle) * .67, .09, "#fff0c9");
    }
    for (let i = 3; i > 0; i--) circle(p.x - p.vx * .025 * i, p.y - p.vy * .025 * i, .27 - .035 * i, `rgba(255,255,255,${.08 / i})`);
    circle(p.x, p.y, .46, "#ffffff0a");
    if (p.invulnerable > 0) circle(p.x, p.y, .43, undefined, "#ffffff99", .035);
    circle(p.x, p.y, .27, "#ffffff", "#ddeaff", .03);
    if (p.muzzle > 0) circle(p.x, p.y, .34 + (.08 - p.muzzle), undefined, "#aaffec66", .04);
  };
}
