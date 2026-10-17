# Rotation Room

Motivator: Challenge. Author: lfg2131.

## Mechanic

Manage four footballers over four matches. Select two starters, then press
**Play match**. Click/tap cards or use Tab and Space/Enter. Team power sums each
starter's `skill + floor(energy / 2)`; meeting the opponent target wins. A live
breakdown explains each contribution. **Fatigue ON:** starters lose three energy;
reserves recover three, bounded 0–6. **OFF:** everyone stays full. Changing the
toggle starts a fresh run. All targets are visible upfront; completed scores
can be compared.

## Dynamic

One real playtester won **2/4 ON** and **3/4 OFF**, changing lineups three times
in each run and choosing different pairs for match two. Without fatigue,
choosing the strongest players felt sufficient; with fatigue, they considered
whom to rest and when. This single observation suggests different decisions,
not a general effect on wins or lineup changes.

## Aesthetic

The tester liked the game, calling OFF "too easy" and ON "kinda harder and needs
thinking." They struggled to calculate power mentally; the resulting contribution
breakdown keeps the focus on planning.

## Sources

The note describes Challenge as **"game as obstacle course"** (Hunicke, LeBlanc,
and Zubek 2004, p. 2). Fatigue creates a constraint, repeated decisions and
possible failure.

Inspired by Kevin Toms' [*Football Manager* (1982)](https://kevintoms.itch.io/).
Codex implemented and tested the game; ChatGPT assisted README wording.
No outside code, art or sound was borrowed.

I **kept** Codex's suggestion to show all four targets because it makes fatigue
management a strategic planning challenge rather than a guessing game.
