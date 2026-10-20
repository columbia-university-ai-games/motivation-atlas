import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { correctPrefix, MAX_MS, normalizeUni, PASSAGE, positions, type Entry } from "./game";
import { leaderboard, type Ticket } from "./leaderboard";
import "./race.css";

function mount(el: HTMLElement): () => void {
  const controller = new AbortController();
  const board = leaderboard(controller.signal);
  let entries: Entry[] = [];
  let ticket: Promise<Ticket | undefined> | undefined;
  let started = 0;
  let running = false;
  let generation = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let raceUni = "";
  let typed = "";
  let loaded = false;
  const competition = h("input", { type: "checkbox", "data-mechanic": "competition", checked: true });
  const uni = h("input", { type: "text", maxlength: 9, placeholder: "e.g. ab1234", autocomplete: "off", autocapitalize: "none", spellcheck: "false", "aria-label": "Your UNI" });
  const start = h("button", { type: "button" }, "Reset");
  const refresh = h("button", { type: "button" }, "Refresh leaderboard");
  const status = h("p", { role: "status" }, "Enter your UNI, then type. Your first character starts the clock.");
  const metrics = h("p", { class: "tr-metrics" }, "Ready to race");
  const passage = h("p", { class: "tr-passage", "aria-label": "Passage to type" }, PASSAGE);
  const input = h("textarea", { rows: 4, "aria-label": "Type the passage here", autocomplete: "off", autocorrect: "off", autocapitalize: "off", spellcheck: "false", placeholder: "Type here to begin…" });
  const cars = h("div", { class: "tr-cars", "aria-label": "Race positions" });
  const trackInfo = h("p", {}, "Cars replay other players’ best times at a steady pace. These are recorded opponents, not live players.");
  const boardBody = h("tbody");
  const results = h("section", { class: "tr-results" }, h("h4", {}, "Best times · top 50"),
    h("p", {}, board.shared ? "Shared class leaderboard · one best time per UNI." : "On this device only · shared hosting is not connected yet."),
    h("div", { class: "tr-table-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Rank"), h("th", { scope: "col" }, "UNI"), h("th", { scope: "col" }, "Time"))), boardBody)), refresh);
  const identity = h("div", {}, h("label", {}, "Your UNI ", uni),
    h("p", { class: "tr-small" }, "Your UNI labels your car and saved time. Other players can see it on a shared leaderboard. Labels are self-reported."));
  const root = h("div", { class: "typing-race" }, h("label", { class: "tr-toggle" }, competition, " Competition: race other players"),
    identity, start, status, metrics, trackInfo, cars, passage, input, results,
    h("section", { class: "tr-reflect" }, h("h4", {}, "Then check it against your own play"),
      h("p", {}, "Try the same passage with competition off. What did you feel when another car passed you, or when you moved up a rank? Did removing the opponents and score change your pace, attention, or enjoyment?")));
  el.append(root);

  function drawBoard(): void {
    boardBody.replaceChildren(...entries.map((entry, i) => h("tr", {}, h("td", {}, String(i + 1)), h("td", {}, entry.uni), h("td", {}, `${(entry.ms / 1000).toFixed(2)} s`))));
    if (!entries.length) boardBody.append(h("tr", {}, h("td", { colspan: 3 }, "No times yet. Be the first to finish a race.")));
  }
  function drawPassage(): void {
    const prefix = correctPrefix(typed);
    passage.replaceChildren(h("span", { class: "tr-correct" }, PASSAGE.slice(0, prefix)),
      h("span", { class: typed.length > prefix ? "tr-error" : "tr-next" }, PASSAGE.slice(prefix, Math.max(prefix + 1, typed.length))),
      PASSAGE.slice(Math.max(prefix + 1, typed.length)));
    input.setAttribute("aria-invalid", String(typed.length > prefix));
  }
  function drawCars(elapsed: number): void {
    const racers = positions(entries, raceUni, elapsed, typed);
    const rank = racers.findIndex(r => r.you) + 1;
    metrics.textContent = `${(elapsed / 1000).toFixed(1)} s · rank ${rank} of ${racers.length}`;
    cars.replaceChildren(...racers.map((r, i) => {
      const car = h("span", { class: `tr-car${r.you ? " tr-you" : ""}`, "aria-hidden": "true" }, "▰");
      car.style.left = `${r.progress * 90}%`;
      return h("div", { class: `tr-racer${r.you ? " tr-your-row" : ""}` },
        h("span", { class: "tr-car-label" }, `${i + 1}. ${r.uni}${r.you ? " (you)" : ""}`), h("div", { class: "tr-road" }, car));
    }));
  }
  function stop(): void { running = false; if (timer !== undefined) clearInterval(timer); timer = undefined; }
  function reset(): void {
    generation++; stop(); ticket = undefined; typed = ""; input.value = ""; input.disabled = false;
    uni.disabled = false; refresh.disabled = false; start.disabled = false;
    cars.replaceChildren(); metrics.textContent = "Ready to race"; drawPassage();
  }
  async function readBoard(): Promise<void> {
    const current = generation;
    refresh.disabled = true;
    try {
      const next = await board.read();
      if (controller.signal.aborted || generation !== current) return;
      entries = next; loaded = true; drawBoard();
    } catch {
      if (!controller.signal.aborted && generation === current) { loaded = false; status.textContent = "Could not load the leaderboard. Try Refresh, or switch competition off to practice."; }
    } finally { if (!controller.signal.aborted && generation === current) refresh.disabled = false; }
  }
  function modeChanged(): void {
    reset();
    const on = competition.checked;
    identity.hidden = !on; metrics.hidden = !on; cars.hidden = !on; results.hidden = !on; trackInfo.hidden = !on;
    status.textContent = on ? "Enter your UNI, then type. Your first character starts the clock." : "Just type. No score, no timer, no opponents, and nothing saved.";
    if (on && !loaded) void readBoard();
  }
  start.addEventListener("click", () => {
    modeChanged();
    input.focus();
  });
  function begin(): boolean {
    if (competition.checked) {
      try { raceUni = normalizeUni(uni.value); uni.value = raceUni; }
      catch (error) { status.textContent = (error as Error).message; input.value = ""; uni.focus(); return false; }
      if (!loaded) { status.textContent = "Refresh the leaderboard before typing, or switch competition off to practice."; input.value = ""; return false; }
    }
    const current = generation;
    uni.disabled = true; refresh.disabled = true;
    started = performance.now(); running = true;
    if (competition.checked) {
      ticket = board.start(raceUni).catch(() => {
        if (!controller.signal.aborted && generation === current) {
          stop(); input.disabled = true; uni.disabled = false; refresh.disabled = false;
          status.textContent = "Could not start the race. Reset to try again or switch competition off.";
        }
        return undefined;
      });
    }
      status.textContent = competition.checked ? "Go! Correct mistakes with Backspace. The clock is running." : "Take your time. Correct mistakes with Backspace and keep going.";
      if (competition.checked) {
        drawCars(0);
        timer = setInterval(() => {
          const elapsed = performance.now() - started;
          drawCars(elapsed);
          if (elapsed > MAX_MS) { stop(); input.disabled = true; status.textContent = "This race timed out. Start again, or try untimed practice."; }
        }, 100);
      }
    return true;
  }
  input.addEventListener("paste", e => { e.preventDefault(); status.textContent = "Type the passage yourself; pasting is turned off."; });
  input.addEventListener("drop", e => e.preventDefault());
  input.addEventListener("beforeinput", e => { if (["insertFromPaste", "insertFromDrop"].includes(e.inputType)) e.preventDefault(); });
  input.addEventListener("input", async () => {
    if (input.disabled || (!running && (!input.value || !begin()))) return;
    typed = input.value; drawPassage();
    if (competition.checked) drawCars(performance.now() - started);
    if (typed !== PASSAGE) return;
    const elapsed = performance.now() - started;
    stop(); input.disabled = true; refresh.disabled = false; uni.disabled = false;
    if (!competition.checked) { status.textContent = "Passage complete. How did typing without an opponent feel?"; return; }
    drawCars(elapsed); status.textContent = "Finished! Saving your best time…";
    const current = generation;
    try {
      const ready = await ticket;
      if (controller.signal.aborted || generation !== current) return;
      if (!ready) throw new Error("Race could not start");
      const result = await board.finish(ready, raceUni);
      if (controller.signal.aborted || generation !== current) return;
      entries = result.entries; drawBoard();
      const rank = entries.findIndex(e => e.uni === raceUni);
      const best = rank >= 0 ? entries[rank].ms : undefined;
      status.textContent = `Finished in ${(result.ms / 1000).toFixed(2)} s. ${rank < 0 ? "Outside the top 50 this time." : `Your best: ${(best! / 1000).toFixed(2)} s · leaderboard rank ${rank + 1}.`} Try competition off and compare how it feels.`;
    } catch {
      if (!controller.signal.aborted && generation === current) status.textContent = `Finished in ${(elapsed / 1000).toFixed(2)} s, but your result could not be saved. Try another race.`;
    }
  });
  competition.addEventListener("change", modeChanged);
  refresh.addEventListener("click", () => { void readBoard(); });
  drawBoard();
  void Promise.resolve().then(() => {
    if (!controller.signal.aborted) void readBoard();
  });
  return () => { generation++; stop(); controller.abort(); root.remove(); };
}

export const typingRace: Minigame = { slug: "typing-race", title: "Type Circuit", motivators: ["competition"], mount };
