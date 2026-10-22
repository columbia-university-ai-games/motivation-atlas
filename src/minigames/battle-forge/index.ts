import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { armored, createGame, HEIGHT, ROUND_SECONDS, startGame, tick, WIDTH, type Point } from "./game";
import { createRenderer } from "./render";
import "./battle-forge.css";

const PHASES = ["01 / FIRST SPARK", "02 / THE SUMMONER", "03 / THE IRON WARDEN"];
const directions: Record<string, Point> = {
  arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 },
};

function mount(el: HTMLElement): () => void {
  let state = createGame();
  let paused = false;
  let timer: number | undefined;
  let destination: Point | null = null;
  let lastTime = 0;
  let lastHud = 0;
  let recorded = false;
  const keys = new Set<string>();
  const history: Array<{ mode: string; result: string; time: number; kills: number }> = [];
  const cleanups: Array<() => void> = [];
  const on = (target: EventTarget, event: string, handler: EventListener) => {
    target.addEventListener(event, handler);
    cleanups.push(() => target.removeEventListener(event, handler));
  };
  const toggle = h("input", { type: "checkbox", checked: true, "data-mechanic": "combat-ability-unlocks" });
  const mode = h("span", { class: "bf-mode" }, "PROGRESSION ON");
  const start = h("button", { type: "button", class: "bf-start", "data-bf-start": "" }, "Enter the arena");
  const pause = h("button", { type: "button", class: "bf-pause", "data-bf-pause": "", disabled: true }, "Pause");
  const pending = h("p", { class: "bf-pending" }, "Switch applies to the next run. Enemy rules stay the same.");
  const phase = h("span", { class: "bf-phase" }, PHASES[0]);
  const clock = h("span", { class: "bf-clock", "data-bf-time": "" }, "2:00");
  const healthText = h("span", {}, "100 / 100 HP");
  const health = h("progress", { max: 100, value: 100, "aria-label": "Your health" });
  const kills = h("span", { class: "bf-kills" }, "0 defeated");
  const bossText = h("span", {});
  const bossHealth = h("progress", { max: 100, value: 100, "aria-label": "Boss health" });
  const bossRow = h("div", { class: "bf-boss-row", hidden: true }, bossText, bossHealth);
  const scene = h("canvas", { width: 1000, height: 600, "aria-hidden": "true" });
  const overlayTitle = h("strong", {}, "Earn your next move.");
  const overlayText = h("span", {}, "You are the white circle. Move. Dodge. Grow stronger.");
  const overlay = h("div", { class: "bf-overlay" }, overlayTitle, overlayText);
  const rewardLabel = h("small", {});
  const rewardTitle = h("strong", {});
  const rewardDetail = h("span", {});
  const reward = h("div", {
    class: "bf-reward", hidden: true, role: "status", "aria-live": "polite",
    "aria-atomic": "true", "data-bf-reward": "",
  }, rewardLabel, rewardTitle, rewardDetail);
  const arena = h("div", {
    class: "bf-arena", tabindex: 0, role: "group", "data-bf-arena": "",
    "aria-label": "Battle arena. You are the white circle. Move with arrow keys or WASD, or tap the arena. All weapons and abilities fire automatically. P pauses.",
  }, scene, reward, overlay);
  const status = h("p", { class: "bf-status", role: "status", "aria-live": "polite", "data-bf-status": "" });
  const waveButton = h("div", { class: "bf-skill", "data-bf-wave": "", role: "group", "aria-label": "Passive Shockwave" });
  const pierceButton = h("div", { class: "bf-skill", "data-bf-pierce": "", role: "group", "aria-label": "Passive Breach" });
  const waveDetail = h("span", {}, "Defeat 6 drones");
  const pierceDetail = h("span", {}, "Defeat the Summoner");
  waveButton.append(h("small", {}, "PASSIVE / AREA DAMAGE"), h("strong", {}, "Shockwave"), waveDetail);
  pierceButton.append(h("small", {}, "PASSIVE / ARMOR PIERCING"), h("strong", {}, "Breach rounds"), pierceDetail);
  const milestone = h("p", { class: "bf-milestone" });
  const dpad = h("div", { class: "bf-dpad", "aria-label": "Movement controls" });
  for (const [key, symbol, label] of [["arrowup", "↑", "Move up"], ["arrowleft", "←", "Move left"], ["arrowdown", "↓", "Move down"], ["arrowright", "→", "Move right"]]) {
    const button = h("button", { type: "button", class: `bf-${key}`, "aria-label": label }, symbol);
    on(button, "pointerdown", ((e: PointerEvent) => {
      if (e.button !== 0) return;
      destination = null; keys.add(key); button.setPointerCapture(e.pointerId);
    }) as EventListener);
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) on(button, event, () => { keys.delete(key); });
    on(button, "click", ((e: MouseEvent) => {
      if (e.detail === 0) destination = { x: state.player.x + directions[key].x, y: state.player.y + directions[key].y };
    }) as EventListener);
    dpad.append(button);
  }
  const results = h("section", { class: "bf-results", hidden: true, "data-bf-results": "" });
  const root = h("section", { class: "battle-forge", "aria-label": "Battle Forge minigame" },
    h("div", { class: "bf-heading" }, h("div", {}, h("p", { class: "bf-eyebrow" }, "FACILITY / EARNED POWER"), h("h4", {}, "BATTLE", h("span", {}, "FORGE"))), mode),
    h("div", { class: "bf-settings" }, h("label", { class: "bf-toggle" }, toggle, h("span", {}, "Combat unlocks abilities", h("small", {}, "Earn passive upgrades through combat"))), h("div", { class: "bf-run-buttons" }, start, pause)),
    pending,
    h("div", { class: "bf-hud" }, h("div", {}, phase, h("div", { class: "bf-health" }, health, healthText)), h("div", {}, clock, kills)),
    bossRow, arena,
    h("p", { class: "bf-instructions" }, "WHITE CIRCLE = YOU · WASD / arrows / tap to move · ALL ATTACKS AUTOMATIC · P to pause"), status,
    h("div", { class: "bf-controls" }, dpad, h("div", { class: "bf-skills" }, waveButton, pierceButton)), milestone,
    h("div", { class: "bf-roadmap" }, h("span", {}, "01", h("b", {}, "6 drones"), "Earn Shockwave"), h("span", {}, "02", h("b", {}, "Summoner"), "Earn Breach"), h("span", {}, "03", h("b", {}, "Iron Warden"), "Put power to work")),
    results,
    h("details", { class: "bf-notes" }, h("summary", {}, "Combat notes"),
      h("p", {}, "All weapons are passive. White/cyan bullets target the nearest enemy. The expanding cyan circle shows Shockwave charging: it reaches the outer boundary and pulses for 36 area damage every 2.8s. The small gold ring shows Breach charging. Its rounds seek bosses, pierce enemies, deal 80 damage and break armor for 3s; they fire every 2.4s when a target is in range."),
      h("p", {}, "The purple Summoner spawns six drones every 3.2s, up to 36 at once. The larger red Warden charges a 16-bullet radial barrage: weave between orange bullets and leave ground warnings. Each new phase restores 30 HP."),
      h("p", {}, "No-growth mode is deliberately near-impossible: the unchanged swarm and armored boss overwhelm the basic blaster. This compares a large power and difficulty gap, not an equal-difficulty test of motivation.")),
  );
  el.append(root);

  const paint = createRenderer(scene);
  function draw(): void {
    paint(state, destination);
    arena.dataset.playerX = state.player.x.toFixed(3);
    arena.dataset.playerY = state.player.y.toFixed(3);
    arena.dataset.projectiles = String(state.projectiles.length);
  }

  function showResults(): void {
    results.hidden = false;
    const table = h("table", {}, h("caption", {}, "This session · last 4 runs"),
      h("thead", {}, h("tr", {}, ...["Mode", "Result", "Time", "Defeats"].map(t => h("th", { scope: "col" }, t)))),
      h("tbody", {}, ...history.map(r => h("tr", {}, h("td", {}, r.mode), h("td", {}, r.result), h("td", {}, `${r.time}s`), h("td", {}, String(r.kills))))));
    const stats = state.stats;
    results.replaceChildren(h("h5", {}, "You played. Now compare."), table,
      h("p", {}, `This run: ${stats.waveUses} automatic pulses · ${stats.waveKills} area defeats · ${stats.pierceUses} Breach rounds · ${stats.armorBreaks} armor breaks · ${stats.summoned} reinforcements · ${stats.damageTaken} damage taken.`),
      h("p", {}, "Did you move closer to groups after earning Shockwave? Could you concentrate on dodging once Breach took care of armor? What felt powerful, satisfying, repetitive, or frustrating?"),
      h("p", {}, "Switch the mechanic and start again. No-growth mode is deliberately near-impossible; its difficulty and play order affect the comparison. Winning alone does not establish motivation. Results stay only in this page session."));
  }

  function render(): void {
    const active = state.status === "playing";
    const ended = !active && state.status !== "ready";
    mode.textContent = state.progression ? "PROGRESSION ON" : "NO UNLOCKS / EXTREME";
    mode.classList.toggle("bf-mode-off", !state.progression);
    phase.textContent = PHASES[state.phase];
    const remaining = Math.ceil(ROUND_SECONDS - state.elapsed);
    clock.textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
    health.value = state.player.hp;
    healthText.textContent = `${Math.ceil(state.player.hp)} / 100 HP`;
    kills.textContent = `${state.kills} defeated`;
    const boss = state.enemies.find(e => e.kind !== "drone");
    bossRow.hidden = !boss;
    if (boss) {
      bossHealth.value = boss.hp / boss.maxHp * 100;
      bossText.textContent = `${boss.kind === "summoner" ? `SUMMONER · reinforcements in ${Math.max(0, state.nextSummon - state.phaseTime).toFixed(1)}s` : `IRON WARDEN · ${state.barrageCharge > 0 ? `BARRAGE IN ${state.barrageCharge.toFixed(1)}s` : armored(state) ? "ARMORED" : state.brokenArmor > 0 ? "ARMOR BROKEN" : "EXPOSED"}`} · ${Math.ceil(boss.hp)} HP`;
    }
    const text = paused ? "Paused. Resume when ready; no time or health is lost." : state.message;
    if (status.textContent !== text) status.textContent = text;
    const modeChanged = toggle.checked !== state.progression;
    const selectedMode = toggle.checked ? "ON" : "OFF";
    start.textContent = modeChanged ? `Apply ${selectedMode} & restart`
      : state.status === "ready" ? "Enter the arena" : active ? "Restart run" : "Play again";
    pending.textContent = modeChanged
      ? `Current run: unlocks ${state.progression ? "ON" : "OFF"}. Selected: ${selectedMode}. Restart to apply the change.`
      : `Unlocks ${selectedMode}. Both modes start with basic shooting; abilities differ after defeating 6 drones. Switching during a run requires a restart.`;
    pending.classList.toggle("bf-pending-change", modeChanged);
    pause.disabled = !active; pause.textContent = paused ? "Resume" : "Pause";
    overlay.hidden = active && !paused;
    // Phase time follows pause/restart, so the notice needs no separate timer.
    const showReward = active && !paused && state.phase > 0 && state.phaseTime < 3.5;
    if (showReward) {
      const title = !state.progression ? "No new ability"
        : state.phase === 1 ? "Unlocked: Shockwave" : "Unlocked: Breach";
      const label = `STAGE ${state.phase} CLEARED`;
      if (rewardTitle.textContent !== title || rewardLabel.textContent !== label) {
        rewardLabel.textContent = label;
        rewardTitle.textContent = title;
        rewardDetail.textContent = !state.progression ? "Ability unlocks are off. Your basic blaster remains active."
          : state.phase === 1 ? "Passive: automatically pulse damage to all nearby enemies."
          : "Passive: homing rounds pierce enemies and break armor.";
      }
    }
    reward.hidden = !showReward;
    reward.classList.toggle("bf-reward-off", !state.progression);
    if (paused) { overlayTitle.textContent = "Take a breath."; overlayText.textContent = "Press P or Resume to return."; }
    else if (ended) {
      overlayTitle.textContent = state.status === "won" ? "FORGED IN BATTLE." : state.status === "lost" ? "A lesson, not the end." : "Time to reflect.";
      const earned = [state.wave ? "Shockwave" : "", state.pierce ? "Breach" : ""].filter(Boolean);
      overlayText.textContent = state.status === "won"
        ? `All stages cleared! Abilities earned: ${earned.length ? earned.join(" + ") : "none (unlocks disabled)"}.`
        : "Review your run below, then try again.";
    }
    const updateSkill = (card: HTMLElement, detail: HTMLElement, unlocked: boolean, cooldown: number, requirement: string) => {
      card.dataset.unlocked = String(unlocked);
      card.classList.toggle("bf-unlocked", unlocked);
      detail.textContent = !state.progression ? "Disabled · no-growth challenge" : !unlocked ? requirement : paused ? "Automatic · paused" : cooldown > 0 ? `Automatic · next in ${cooldown.toFixed(1)}s` : "Automatic · seeking targets";
    };
    updateSkill(waveButton, waveDetail, state.wave, state.waveCooldown, `${Math.min(6, state.kills)} / 6 drones`);
    updateSkill(pierceButton, pierceDetail, state.pierce, state.pierceCooldown, "Defeat the Summoner");
    milestone.textContent = !state.progression ? "EXTREME CHALLENGE → no passive upgrades against an escalating swarm"
      : state.phase === 0 ? "NEXT REWARD → Shockwave · clear the six drones"
      : state.phase === 1 ? "NEXT REWARD → Breach · defeat the Summoner"
      : "ARSENAL COMPLETE → automatic armor piercing; focus on dodging the barrage";
    if (ended && !recorded) {
      recorded = true;
      history.unshift({ mode: state.progression ? "Unlocks ON" : "Unlocks OFF", result: state.status === "won" ? "Cleared" : state.status === "lost" ? "Fell" : "Time up", time: Math.round(state.elapsed), kills: state.kills });
      history.splice(4); showResults(); stopTimer(); keys.clear(); destination = null;
    }
    draw();
  }

  function stopTimer(): void { if (timer !== undefined) cancelAnimationFrame(timer); timer = undefined; }
  function runTimer(): void {
    stopTimer(); lastTime = performance.now(); lastHud = lastTime;
    const frame = (now: number) => {
      timer = undefined;
      if (paused || state.status !== "playing") return;
      let x = 0, y = 0;
      for (const key of keys) { x += directions[key]?.x ?? 0; y += directions[key]?.y ?? 0; }
      tick(state, (now - lastTime) / 1000, { x, y, destination });
      lastTime = now;
      if (now - lastHud >= 100 || state.status !== "playing") { render(); lastHud = now; }
      else draw();
      if (state.status === "playing" && !paused) timer = requestAnimationFrame(frame);
    };
    timer = requestAnimationFrame(frame);
  }
  function setPaused(value: boolean): void {
    if (state.status !== "playing") return;
    paused = value; keys.clear(); destination = null;
    if (paused) stopTimer(); else runTimer();
    render();
  }
  on(toggle, "change", () => {
    if (state.status === "ready") state = createGame(toggle.checked);
    render();
  });
  on(start, "click", () => {
    stopTimer(); state = createGame(toggle.checked); paused = false; recorded = false;
    keys.clear(); destination = null; results.hidden = true;
    startGame(state); render(); arena.focus(); runTimer();
  });
  on(pause, "click", () => setPaused(!paused));
  on(root, "keydown", ((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement) return;
    const key = event.key.toLowerCase();
    if (directions[key]) { event.preventDefault(); keys.add(key); destination = null; }
    else if (key === "p") {
      event.preventDefault();
      if (!event.repeat) setPaused(!paused);
    }
  }) as EventListener);
  on(root, "keyup", ((event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()); }) as EventListener);
  on(root, "focusout", ((event: FocusEvent) => { if (!(event.relatedTarget instanceof Node) || !root.contains(event.relatedTarget)) setPaused(true); }) as EventListener);
  function point(event: PointerEvent): void {
    if (state.status !== "playing" || paused) return;
    const rect = arena.getBoundingClientRect();
    destination = { x: (event.clientX - rect.left) / rect.width * WIDTH, y: (event.clientY - rect.top) / rect.height * HEIGHT };
  }
  on(arena, "pointerdown", ((event: PointerEvent) => { if (event.button === 0) { arena.focus(); arena.setPointerCapture(event.pointerId); point(event); } }) as EventListener);
  on(arena, "pointermove", ((event: PointerEvent) => { if (arena.hasPointerCapture(event.pointerId)) point(event); }) as EventListener);
  on(arena, "pointercancel", () => { destination = null; });
  on(window, "blur", () => setPaused(true));
  on(document, "visibilitychange", () => { if (document.hidden) setPaused(true); });
  render();
  return () => { stopTimer(); cleanups.forEach(cleanup => cleanup()); root.remove(); };
}

export const battleForge: Minigame = {
  slug: "battle-forge", title: "Battle Forge", author: "yw4626", motivators: ["progress"], mount,
};
