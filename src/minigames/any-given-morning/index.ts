import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { continueAfterDeath, createSession, ROUND_LIVES, startLife, step, summarizeLife, summarizeRound, transition, type Screen, type Session } from "./game";
import { bindInput } from "./input";
import { createRenderer } from "./render";
import { COPY } from "./text";
import css from "./style.css?inline";

/** Optional observer lets headless tests inspect rules without adding player controls. */
export function mountMorning(el: HTMLElement, options: { seed?: number; onSession?: (session: Session) => void } = {}): () => void {
  const seed = options.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  let mortal = true, session = createSession({ seed, mortal }), disposed = false;
  let previous = 0, accumulator = 0, frame = 0, lastDialogue: string | null = null, dialogueUntil = 0;
  let dialogueOrigin = { x: 0, y: 0 }, dialogueStarted = 0, renderCount = 0;
  const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const reduced = () => motionQuery?.matches ?? false;
  const style = h("style", {}, css);
  const root = h("section", { class: "agm", "data-state": "menu", "data-testid": "any-given-morning", "aria-label": COPY.title, tabindex: -1 });
  const canvas = h("canvas", { "data-testid": "canvas", role: "img", "aria-label": "A small farm beside a dirt path.", width: 320, height: 192, tabindex: 0 });
  const stage = h("div", { class: "agm-stage" }, canvas);
  const hint = h("p", { class: "agm-first-hint", "data-testid": "first-life-hint", hidden: true }, COPY.firstLifeHint);
  const dialogue = h("p", { class: "agm-sr", "data-testid": "dialogue" });
  const live = h("div", { class: "agm-sr", "aria-live": "polite", "aria-atomic": "true" }, dialogue);
  const pane = h("div", { class: "agm-pane" });
  const touch = h("div", { class: "agm-touch", "aria-label": "Touch controls" });
  root.append(stage, hint, touch, pane, live); el.append(style, root);
  const renderer = createRenderer(canvas, reduced);
  const preview = startLife(createSession({ seed, mortal: false }));
  const removers: (() => void)[] = [], panelRemovers: (() => void)[] = [];
  const listen = (target: EventTarget, event: string, handler: EventListener, panel = true) => {
    target.addEventListener(event, handler);
    (panel ? panelRemovers : removers).push(() => target.removeEventListener(event, handler));
  };
  const button = (testid: string, text: string, act: () => void) => {
    const node = h("button", { type: "button", "data-testid": testid }, text);
    listen(node, "click", act); return node;
  };
  const checkbox = () => {
    const input = h("input", { type: "checkbox", "data-mechanic": "mortality", "data-testid": "mortality" });
    input.checked = mortal;
    const caption = h("p", { class: "agm-caption", "aria-live": "polite" }, mortal ? COPY.mortalityOn : COPY.mortalityOff);
    listen(input, "change", () => {
      mortal = input.checked;
      if (session.state.screen === "MENU") session.state.mortal = mortal;
      caption.textContent = mortal ? COPY.mortalityOn : COPY.mortalityOff;
    });
    return h("div", { class: "agm-switch" }, h("label", {}, input, COPY.mortality), caption);
  };
  function reset(): void {
    session = createSession({ seed, mortal }); options.onSession?.(session);
    controls.clear(); previous = 0; accumulator = 0; lastDialogue = null; dialogue.textContent = "";
  }
  function start(): void { reset(); startLife(session); sync(); canvas.focus({ preventScroll: true }); }
  function menu(): void {
    if (session.state.screen !== "MENU") transition(session.state, "MENU");
    reset(); sync(); pane.querySelector<HTMLButtonElement>('[data-testid="start"]')?.focus({ preventScroll: true });
  }
  function respawn(): void {
    if (session.state.screen !== "DEAD") return;
    continueAfterDeath(session); controls.clear(); lastDialogue = null; dialogue.textContent = ""; sync();
    if ((session.state.screen as Screen) === "PLAY") canvas.focus({ preventScroll: true });
  }
  const controls = bindInput(root, touch, () => session.state.screen, (action) => action === "menu" ? menu() : respawn());
  const describe = () => {
    const life = session.life;
    if (!life) return;
    const area = { farm: "A farm", riverside: "A riverside", orchard: "An orchard", village_edge: "A village edge" }[life.world.biome];
    const nearby = life.world.npcs.find((npc) => Math.hypot(npc.x - life.player.x, npc.y - life.player.y) < 23);
    canvas.setAttribute("aria-label", `${area}. You are ${Math.round(life.player.x / 16)} steps east and ${Math.round(life.player.y / 16)} steps south of the corner.${nearby ? " Someone is beside you." : ""}${lastDialogue ? ` ${lastDialogue}` : ""}`);
  };
  function sync(): void {
    const state = session.state.screen;
    root.dataset.state = state.toLowerCase();
    hint.hidden = state !== "PLAY" || session.life?.number !== 1;
    hint.style.opacity = "1";
    controls.clear(); panelRemovers.splice(0).forEach((remove) => remove()); pane.replaceChildren();
    touch.hidden = state !== "PLAY"; pane.hidden = state === "DYING";
    if (state === "MENU") {
      pane.append(h("p", { class: "agm-eyebrow" }, "A morning in the country"), h("h3", {}, COPY.title), h("p", {}, COPY.subtitle), checkbox(), button("start", COPY.start, start), h("p", { class: "agm-controls" }, COPY.controls));
      renderer.draw(preview, null);
    } else if (state === "PLAY") {
      pane.append(button("menu", "Menu", menu)); describe();
    } else if (state === "DYING") {
      lastDialogue = null; session.life!.dialogue = null; dialogue.textContent = "";
    } else if (state === "DEAD") {
      renderer.draw(session.life!, null);
      const summary = summarizeLife(session.life!);
      const final = session.state.lifeCount === ROUND_LIVES;
      pane.append(h("h3", {}, summary.cause), h("p", {}, COPY.lived(summary.seconds)), h("h4", {}, COPY.deedsHeading));
      if (summary.deeds.length) summary.deeds.forEach((deed) => pane.append(h("p", { class: "agm-deed" }, deed.text)));
      else pane.append(h("p", {}, COPY.noDeeds));
      pane.append(h("p", { class: "agm-caption" }, final ? COPY.roundOver : COPY.reset), h("p", {}, COPY.lifeNumber(Math.min(ROUND_LIVES, session.state.lifeCount + 1), ROUND_LIVES)), button("respawn", final ? COPY.finishRound : COPY.respawn, respawn), button("menu", COPY.backToMenu, menu));
      dialogue.textContent = `${summary.cause} ${COPY.lived(summary.seconds)} ${summary.deeds.map((deed) => deed.text).join(" ") || COPY.noDeeds}`;
      canvas.setAttribute("aria-label", summary.cause);
      pane.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    } else if (state === "LEDGER") {
      const round = summarizeRound(session);
      const body = h("tbody");
      const cards = h("div", { class: "agm-life-cards", "data-testid": "life-cards" }, h("p", {}, round.mode));
      for (const life of round.lives) {
        const deeds = h("td");
        if (life.deeds.length) life.deeds.forEach((deed) => deeds.append(h("p", {}, deed.text)));
        else deeds.append(COPY.noDeeds);
        body.append(h("tr", {}, h("th", { scope: "row" }, String(life.number)), h("td", {}, life.seconds.toFixed(1)), h("td", {}, life.cause), h("td", {}, String(life.deedCount)), deeds));
        const card = h("article", { class: "agm-life-card" }, h("h4", {}, COPY.lifeNumber(life.number, round.lives.length)), h("p", {}, COPY.lived(life.seconds)), h("p", {}, life.cause), h("h5", {}, COPY.deedsHeading));
        if (life.deeds.length) life.deeds.forEach((deed) => card.append(h("p", { class: "agm-deed" }, deed.text)));
        else card.append(h("p", {}, COPY.noDeeds));
        cards.append(card);
      }
      const table = h("table", {}, h("caption", {}, round.mode), h("thead", {}, h("tr", {}, ...["Life", COPY.secondsHeading, COPY.causeHeading, COPY.deedCountHeading, COPY.deedHeading].map((text) => h("th", { scope: "col" }, text)))), body);
      const reflection = h("aside", { class: "agm-reflection" }, h("h4", {}, COPY.reflectionTitle), h("p", {}, COPY.reflectionFeeling), h("p", {}, COPY.reflectionTime), h("p", {}, COPY.reflectionSwitch));
      pane.append(h("h3", {}, COPY.ledgerTitle), h("div", { class: "agm-table", tabindex: 0, role: "region", "aria-label": "Life ledger" }, table), cards, h("p", {}, COPY.deedsPerMinute(round.deedsPerMinute)), reflection, checkbox(), button("again", COPY.playAgain, () => { transition(session.state, "MENU"); start(); }), button("menu", COPY.backToMenu, menu));
      dialogue.textContent = `${COPY.dayEnded} ${round.mode}. ${COPY.reflectionFeeling}`;
      pane.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    }
  }
  const tick = (now: number) => {
    if (disposed) return;
    const dt = previous ? Math.min(0.1, Math.max(0, (now - previous) / 1000)) : 0;
    previous = now;
    if (!document.hidden && session.life && (session.state.screen === "PLAY" || session.state.screen === "DYING")) {
      accumulator += dt;
      while (accumulator >= 1 / 60) {
        const before: Screen = session.state.screen;
        const input = before === "PLAY" ? controls.read() : {};
        step(session.life, 1 / 60 * (before === "DYING" && reduced() ? 4 : 1), input);
        if (session.life.dialogue !== lastDialogue || (input.interact && session.life.dialogue)) {
          lastDialogue = session.life.dialogue; dialogue.textContent = lastDialogue ?? "";
          dialogueStarted = session.life.elapsed; dialogueUntil = dialogueStarted + 4.5;
          dialogueOrigin = { ...session.life.player }; describe();
        }
        const walkedAway = session.life.elapsed - dialogueStarted > 0.5 && Math.hypot(session.life.player.x - dialogueOrigin.x, session.life.player.y - dialogueOrigin.y) > 12;
        if (lastDialogue && (session.life.elapsed > dialogueUntil || walkedAway)) { session.life.dialogue = null; lastDialogue = null; dialogue.textContent = ""; }
        accumulator -= 1 / 60;
        if (session.state.screen !== before) { sync(); break; }
      }
      if (session.state.screen === "PLAY" || session.state.screen === "DYING" || session.state.screen === "LEDGER") renderer.draw(session.life, lastDialogue);
      hint.hidden = session.state.screen !== "PLAY" || session.life.number !== 1 || session.life.elapsed >= 6;
      hint.style.opacity = String(Math.min(1, Math.max(0, (6 - session.life.elapsed) / 0.8)));
      if (renderCount++ % 30 === 0 && session.state.screen === "PLAY") describe();
    } else { accumulator = 0; if (session.state.screen === "MENU") renderer.draw(preview, null); }
    frame = requestAnimationFrame(tick);
  };
  listen(document, "visibilitychange", () => { previous = 0; accumulator = 0; }, false);
  options.onSession?.(session); sync(); frame = requestAnimationFrame(tick);
  return () => {
    disposed = true; cancelAnimationFrame(frame); controls.dispose(); renderer.dispose();
    panelRemovers.splice(0).forEach((remove) => remove()); removers.forEach((remove) => remove());
    root.remove(); style.remove();
  };
}

export const anyGivenMorning: Minigame = {
  slug: "any-given-morning", title: COPY.title, motivators: ["meaning"], author: "NICOH-YAY", mount: mountMorning,
};
