import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { correctPrefix, MAX_MS, PASSAGE, positions, wpmAtTime } from "./game";
import { leaderboard } from "./leaderboard";
import "./race.css";

function mount(el: HTMLElement): () => void {
  const board = leaderboard();
  let entries = board.read();
  let started = 0;
  let running = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  let typed = "";
  const competition = h("input", { type: "checkbox", "data-mechanic": "competition", checked: true });
  const resetButton = h("button", { type: "button" }, "Reset");
  const status = h("p", { role: "status" }, "Type to race. Your first character starts the clock.");
  const metrics = h("p", { class: "tr-metrics" }, "Ready to race");
  const passage = h("p", { class: "tr-passage", "aria-label": "Passage to type" }, PASSAGE);
  const input = h("textarea", { rows: 4, "aria-label": "Type the passage here", autocomplete: "off", autocorrect: "off", autocapitalize: "off", spellcheck: "false", placeholder: "Type here to begin…" });
  const cars = h("div", { class: "tr-cars", "aria-label": "Race positions" });
  const trackInfo = h("p", {}, "Race the target cars and your personal best. Your car moves with correctly typed characters.");
  const boardBody = h("tbody");
  const results = h("section", { class: "tr-results" }, h("h4", {}, "Leaderboard"),
    h("p", {}, "Four preset paces, plus your best time on this device."),
    h("div", { class: "tr-table-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Rank"), h("th", { scope: "col" }, "Driver"), h("th", { scope: "col" }, "WPM"), h("th", { scope: "col" }, "Time"))), boardBody)));
  const root = h("div", { class: "typing-race" }, h("label", { class: "tr-toggle" }, competition, " Competition: race other drivers"),
    resetButton, status, metrics, trackInfo, cars, passage, input, results,
    h("section", { class: "tr-reflect" }, h("h4", {}, "Then check it against your own play"),
      h("p", {}, "Try the same passage with competition off. What did you feel when another car passed you, or when you moved up a rank? Did removing the opponents and score change your pace, attention, or enjoyment?")));
  el.append(root);

  function drawBoard(): void {
    boardBody.replaceChildren(...entries.map((entry, i) => h("tr", {}, h("td", {}, String(i + 1)), h("td", {}, entry.name), h("td", {}, String(Math.round(wpmAtTime(entry.ms)))), h("td", {}, `${(entry.ms / 1000).toFixed(2)} s`))));
  }
  function drawPassage(): void {
    const prefix = correctPrefix(typed);
    passage.replaceChildren(h("span", { class: "tr-correct" }, PASSAGE.slice(0, prefix)),
      h("span", { class: typed.length > prefix ? "tr-error" : "tr-next" }, PASSAGE.slice(prefix, Math.max(prefix + 1, typed.length))),
      PASSAGE.slice(Math.max(prefix + 1, typed.length)));
    input.setAttribute("aria-invalid", String(typed.length > prefix));
  }
  function drawCars(elapsed: number): void {
    const racers = positions(entries, elapsed, typed);
    const rank = racers.findIndex(r => r.you) + 1;
    metrics.textContent = `${(elapsed / 1000).toFixed(1)} s · rank ${rank} of ${racers.length}`;
    cars.replaceChildren(...racers.map((r, i) => {
      const car = h("span", { class: `tr-car${r.you ? " tr-you" : ""}`, "aria-hidden": "true" }, "▰");
      car.style.left = `${r.progress * 90}%`;
      return h("div", { class: `tr-racer${r.you ? " tr-your-row" : ""}` },
        h("span", { class: "tr-car-label" }, `${i + 1}. ${r.name}${r.you ? "" : ` · ${Math.round(wpmAtTime(r.ms))} WPM`}`), h("div", { class: "tr-road" }, car));
    }));
  }
  function stop(): void { running = false; if (timer !== undefined) clearInterval(timer); timer = undefined; }
  function reset(): void {
    stop(); typed = ""; input.value = ""; input.disabled = false;
    metrics.textContent = "Ready to race"; drawPassage();
    const on = competition.checked;
    metrics.hidden = !on; cars.hidden = !on; results.hidden = !on; trackInfo.hidden = !on;
    if (on) drawCars(0); else cars.replaceChildren();
    metrics.textContent = "Ready to race";
    status.textContent = on ? "Type to race. Your first character starts the clock." : "Just type. No score, no timer, no opponents, and nothing saved.";
  }
  function begin(): void {
    started = performance.now(); running = true;
    status.textContent = competition.checked ? "Go! Correct mistakes with Backspace. The clock is running." : "Take your time. Correct mistakes with Backspace and keep going.";
    if (competition.checked) timer = setInterval(() => {
      const elapsed = performance.now() - started;
      drawCars(elapsed);
      if (elapsed > MAX_MS) { stop(); input.disabled = true; status.textContent = "This race timed out. Reset to try again, or try untimed practice."; }
    }, 100);
  }
  resetButton.addEventListener("click", () => { reset(); input.focus(); });
  input.addEventListener("paste", e => { e.preventDefault(); status.textContent = "Type the passage yourself; pasting is turned off."; });
  input.addEventListener("drop", e => e.preventDefault());
  input.addEventListener("beforeinput", e => { if (["insertFromPaste", "insertFromDrop"].includes(e.inputType)) e.preventDefault(); });
  input.addEventListener("input", () => {
    if (input.disabled || (!running && !input.value)) return;
    if (!running) begin();
    typed = input.value; drawPassage();
    if (competition.checked) drawCars(performance.now() - started);
    if (typed !== PASSAGE) return;
    const elapsed = performance.now() - started;
    stop(); input.disabled = true;
    if (!competition.checked) { status.textContent = "Passage complete. How did typing without an opponent feel?"; return; }
    drawCars(elapsed);
    try {
      const result = board.finish(elapsed);
      entries = result.entries; drawBoard();
      const rank = entries.findIndex(e => e.name === "Your best") + 1;
      status.textContent = `Finished in ${(elapsed / 1000).toFixed(2)} s (${Math.round(wpmAtTime(elapsed))} WPM). Your best: ${(result.best / 1000).toFixed(2)} s · leaderboard rank ${rank}. ${result.saved ? "" : "Storage is unavailable; your best will last only for this visit. "}Try competition off and compare how it feels.`;
    } catch {
      status.textContent = "That run was too short to save. Reset and type the passage yourself.";
    }
  });
  competition.addEventListener("change", reset);
  drawBoard(); reset();
  return () => { stop(); root.remove(); };
}

export const typingRace: Minigame = { slug: "typing-race", title: "Type Circuit", motivators: ["competition"], author: "ZevMM", mount };
