import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import {
  currentTarget, finalResult, initialGame, MAX_ENERGY, playMatch, selectPlayer,
  TARGETS, teamPower, tournamentSummary, type GameState, type PlayerId,
} from "./game";
import "./rotation-room.css";

function mount(el: HTMLElement): () => void {
  let state = initialGame();
  // Comparison lasts for this mounted visit only; no browser storage is used.
  const completed = new Map<boolean, GameState>();
  let feedback = "Pick two starters. Win as many of the four matches as you can.";

  const fatigue = h("input", { type: "checkbox", checked: true, "data-mechanic": "fatigue" });
  const mode = h("span", { class: "rr-mode", "data-mode": "" });
  const match = h("strong", { "data-match": "" });
  const wins = h("span", { "data-wins": "" });
  const nextOpponent = h("p", { class: "rr-small", "data-next-opponent": "" });
  const fixtures = h("ol", { class: "rr-fixtures", "aria-label": "Four fixtures and required strengths" });
  const selection = h("span", { "data-selection": "" });
  const players = h("div", { class: "rr-players", role: "group", "aria-label": "Choose exactly two starters" });
  const power = h("output", { class: "rr-power", "data-power": "", "aria-label": "Selected team power" });
  const target = h("strong", { class: "rr-target", "data-target": "" });
  const projection = h("p", { class: "rr-small", "data-projection": "", "aria-live": "polite" });
  const play = h("button", { type: "button", class: "rr-button", "data-play": "" }, "Play match");
  const status = h("p", { class: "rr-feedback", role: "status", "aria-atomic": "true", "data-feedback": "" });
  const history = h("ol", { class: "rr-history", "aria-label": "This run's match results", "data-history": "" });
  const finishTitle = h("h4", { tabindex: -1, "data-final-score": "" });
  const finishDetail = h("p", { "data-lineup-changes": "" });
  const opposite = h("button", { type: "button", class: "rr-button", "data-opposite": "" });
  const replay = h("button", { type: "button", class: "rr-button rr-secondary", "data-replay": "" }, "Replay this mode");
  const finish = h("section", { class: "rr-finish", "data-final": "", hidden: true },
    h("p", { class: "rr-eyebrow" }, "Full time"), finishTitle, finishDetail,
    h("p", { class: "rr-small" }, "Final energy levels are shown on the four player cards above."),
    h("div", { class: "rr-replays" }, opposite, replay),
    h("p", { class: "rr-reflection" }, "What did you feel while playing? Did changing fatigue change your decisions or experience?"),
  );
  const comparison = h("section", { class: "rr-comparison", "data-comparison": "", hidden: true });
  const squadTitle = h("strong", {}, "Choose your starters");
  const matchup = h("div", { class: "rr-matchup" },
    h("div", {}, h("span", { class: "rr-small" }, "Your power"), power),
    h("span", { class: "rr-versus", "aria-hidden": "true" }, "/"),
    h("div", {}, h("span", { class: "rr-small" }, "Required strength"), target),
  );
  const formula = h("p", { class: "rr-formula" }, "Power = combined skill + half of each starter’s energy, rounded down.");

  const root = h("section", { class: "rotation-room", "aria-label": "Rotation Room" },
    h("header", { class: "rr-header" },
      h("p", { class: "rr-eyebrow" }, "Four players / two starters / four matches"),
      h("h4", { class: "rr-title" }, "ROTATION ROOM"),
      h("p", { class: "rr-goal" }, "Pick a pair. Meet the target. How many matches can your squad win?"),
    ),
    h("div", { class: "rr-rule" },
      h("label", { class: "rr-toggle" }, fatigue, h("strong", {}, "Fatigue matters"), mode),
      h("p", { class: "rr-small" }, "ON: starters lose 3 energy; resting players recover 3. OFF: everyone stays at 6/6."),
      h("p", { class: "rr-small" }, "Changing this starts a fresh four-match run. Same squad, same opponents."),
    ),
    h("div", { class: "rr-scoreboard" }, match, wins), nextOpponent, fixtures,
    status,
    h("div", { class: "rr-squad-label" }, squadTitle, selection), players,
    matchup, formula, projection, play, history, finish, comparison,
  );

  const cards = state.players.map((player) => {
    const picked = h("span", { class: "rr-picked" });
    const energy = h("span", { class: "rr-energy-text", "data-energy": player.id });
    const fill = h("span", { class: "rr-energy-fill" });
    const change = h("span", { class: "rr-energy-change" });
    const button = h("button", {
      type: "button", class: "rr-player", "data-player": player.id, "aria-pressed": "false",
    },
    h("span", { class: "rr-player-top" }, h("strong", { class: "rr-player-name" }, player.name), picked),
    h("span", { class: "rr-player-stats" }, h("span", {}, `Skill ${player.skill}`), energy),
    h("span", { class: "rr-energy-track", "aria-hidden": "true" }, fill), change,
    );
    players.append(button);
    return { id: player.id, button, picked, energy, fill, change };
  });

  function resultRow(result: GameState["results"][number]): HTMLLIElement {
    const names = result.lineup.map((id) => state.players.find((p) => p.id === id)!.name).join(" + ");
    return h("li", { "data-result": result.won ? "win" : "loss" },
      h("span", {}, `${result.match}. ${names}`),
      h("strong", {}, `${result.won ? "WIN" : "LOSS"} · ${result.power} / ${result.target}`),
    );
  }

  function renderComparison(): void {
    comparison.hidden = completed.size === 0;
    if (comparison.hidden) return;
    comparison.replaceChildren(
      h("h4", {}, "Your comparison"),
      h("p", { class: "rr-small" }, "Last completed run in each mode. Kept while this game stays open."),
      h("div", { class: "rr-comparison-grid" }, ...[true, false].map((on) => {
        const saved = completed.get(on);
        const heading = h("strong", {}, `Fatigue ${on ? "ON" : "OFF"}`);
        if (!saved) return h("div", { class: "rr-comparison-card" }, heading, h("p", {}, "Not played yet"));
        const summary = tournamentSummary(saved);
        return h("div", { class: "rr-comparison-card", "data-saved-mode": on ? "on" : "off" }, heading,
          h("p", { class: "rr-saved-score" }, `${summary.wins}/4 wins`),
          h("p", { class: "rr-small" }, `${summary.lineupChanges} lineup changes`),
          h("details", {}, h("summary", {}, "Lineups & results"), h("ol", {}, ...saved.results.map(resultRow))),
        );
      })),
    );
  }

  function render(): void {
    const summary = tournamentSummary(state);
    const last = state.results.at(-1);
    const fullPair = state.selected.length === 2;
    const required = currentTarget(state);
    fatigue.checked = state.fatigueMatters;
    mode.textContent = state.fatigueMatters ? "ON" : "OFF";
    match.textContent = summary.complete ? "Tournament complete · 4 of 4" : `Match ${state.results.length + 1} of 4`;
    wins.textContent = `Wins: ${summary.wins}`;
    nextOpponent.textContent = required === null ? "All four fixtures finished." : `Next opponent’s required strength: ${required}`;
    squadTitle.textContent = summary.complete ? "Final squad" : "Choose your starters";
    selection.textContent = summary.complete ? "Final energy" : `${state.selected.length} / 2 selected`;
    fixtures.replaceChildren(...TARGETS.map((value, i) => {
      const result = state.results[i];
      const active = !summary.complete && i === state.results.length;
      return h("li", { class: active ? "rr-fixture rr-current" : "rr-fixture", "aria-current": active ? "step" : undefined },
        h("span", {}, `M${i + 1}`), h("strong", {}, String(value)),
        h("span", { class: "rr-fixture-state" }, result ? (result.won ? "WIN" : "LOSS") : active ? "NEXT" : "—"),
      );
    }));
    for (const card of cards) {
      const player = state.players.find((p) => p.id === card.id)!;
      const selected = state.selected.includes(card.id);
      card.button.setAttribute("aria-pressed", String(selected));
      card.button.setAttribute("aria-disabled", String(summary.complete || (!selected && fullPair)));
      card.picked.textContent = selected ? "✓ Selected" : "Resting";
      card.energy.textContent = `Energy ${player.energy}/${MAX_ENERGY}`;
      card.fill.style.width = `${player.energy / MAX_ENERGY * 100}%`;
      const change = last?.energyChanges.find((c) => c.id === card.id);
      card.change.textContent = change
        ? `Last match: ${change.started ? "started" : "rested"} · ${change.before} → ${change.after} (${change.after - change.before > 0 ? "+" : ""}${change.after - change.before})`
        : "Ready for the opening match";
    }
    power.textContent = fullPair && !summary.complete ? String(teamPower(state)) : "—";
    target.textContent = required === null ? "—" : String(required);
    projection.textContent = summary.complete ? "Four matches played. Try the other setting and compare."
      : !fullPair ? "Select two players to see their projected power."
      : "Two starters ready. Keep this pair or deselect a player to swap.";
    play.hidden = summary.complete;
    matchup.hidden = summary.complete;
    formula.hidden = summary.complete;
    projection.hidden = summary.complete;
    play.setAttribute("aria-disabled", String(!fullPair || summary.complete));
    play.textContent = `Play match ${Math.min(state.results.length + 1, TARGETS.length)}`;
    status.textContent = feedback;
    history.replaceChildren(...state.results.map(resultRow));
    history.hidden = state.results.length === 0;
    finish.hidden = !summary.complete;
    if (summary.complete) {
      finishTitle.textContent = `${summary.wins} / 4 matches won · Fatigue ${state.fatigueMatters ? "ON" : "OFF"}`;
      finishDetail.textContent = `Lineup changed ${summary.lineupChanges} ${summary.lineupChanges === 1 ? "time" : "times"} between matches (maximum 3).`;
      opposite.textContent = `Compare with fatigue ${state.fatigueMatters ? "OFF" : "ON"} →`;
    }
    renderComparison();
  }

  function startRun(on: boolean): void {
    state = initialGame(on);
    feedback = `Fresh comparison run · Fatigue ${on ? "ON" : "OFF"}. Match 1 of 4; all energy reset to 6/6 and wins to 0.`;
    render();
  }

  function onClick(event: Event): void {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
    if (!button || !root.contains(button)) return;
    if (button.dataset.player) {
      if (tournamentSummary(state).complete) return;
      const next = selectPlayer(state, button.dataset.player as PlayerId);
      if (next === state) feedback = "Two starters are already selected. Deselect one before choosing a replacement.";
      state = next;
      render();
    } else if (button === play) {
      if (state.selected.length !== 2 || finalResult(state)) return;
      state = playMatch(state);
      const result = state.results.at(-1)!;
      const nextTarget = currentTarget(state);
      feedback = `Match ${result.match} · ${result.won ? "WIN" : "LOSS"}. Our power ${result.power} ${result.won ? "meets" : "falls below"} the opponent target ${result.target}. ${state.fatigueMatters ? "Energy changes are shown on each player card." : "Fatigue is OFF: everyone stays at full energy."}${nextTarget === null ? "" : ` Next: match ${result.match + 1}, required strength ${nextTarget}.`}`;
      if (finalResult(state)) completed.set(state.fatigueMatters, state);
      render();
      if (finalResult(state)) finishTitle.focus();
    } else if (button === opposite || button === replay) {
      startRun(button === opposite ? !state.fatigueMatters : state.fatigueMatters);
      cards[0].button.focus();
    }
  }

  function onChange(event: Event): void {
    if (event.target === fatigue) startRun(fatigue.checked);
  }

  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  el.append(root);
  render();
  return () => {
    root.removeEventListener("click", onClick);
    root.removeEventListener("change", onChange);
    completed.clear();
    root.remove();
  };
}

export const rotationRoom: Minigame = {
  slug: "rotation-room", title: "Rotation Room", motivators: ["challenge"], author: "lfg2131", mount,
};
