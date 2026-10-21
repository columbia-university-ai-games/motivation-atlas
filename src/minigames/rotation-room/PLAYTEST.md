# Rotation Room: anonymous comparison playtest

README status: **real playtest observations confirmed by lfg2131; final README
approved**. The confirmed results and reactions are recorded in README.md.
The procedure and blank worksheet below remain available for repeat playtests.
Keep testers anonymous; do not record personal or identifying information.

Open the Atlas at `http://localhost:5173/#/m/challenge` and scroll to **Play with
it → Rotation Room**. If the server is stopped, run `npm run dev -- --host
127.0.0.1 --port 5173 --strictPort` from this repository. The test should take a
few minutes for both runs and the conversation.

## Read to the tester

“Try to win as many of the four matches as you can. Choose two starters, then
press Play match. Please finish once with Fatigue matters ON, then use the
comparison button to finish again with it OFF. You may read the rules and take
as much time as you need.”

Do not show the tester the automated winning strategy or describe expected
feelings. Start a fresh ON run with no completed comparison scores visible
(leave and reopen the Challenge page if needed). Let them choose freely.

## Observe

1. Watch all four ON matches. Record starters and WIN/LOSS each time.
2. Record the final wins, lineup changes, and player energies.
3. Use **Compare with fatigue OFF**; observe all four OFF matches the same way.
4. Ask: “What did you feel while playing? Did changing fatigue change your
   decisions or experience?”
5. Ask: “What did each version feel like? Which required more thought, and why?”
6. Record what they actually say. If they report no difference, record that.
   Note any clarification or help you provided and that ON came first; familiarity
   on the second run can affect this small comparison.

## Blank observation sheet for a repeat playtest

```text
Anonymous tester: A (no personal details)
Both runs actually completed: [ ] ON  [ ] OFF

Mode    Match 1 pair/W-L  Match 2 pair/W-L  Match 3 pair/W-L  Match 4 pair/W-L
ON      _____________   _____________   _____________   _____________
OFF     _____________   _____________   _____________   _____________

ON:  wins __/4; lineup changes __/3; final energy Ari __ Bo __ Cleo __ Dev __
OFF: wins __/4; lineup changes __/3; final energy Ari __ Bo __ Cleo __ Dev __

Decisions observed ON:
Decisions observed OFF:
Their words about feelings ON:
Their words about feelings OFF:
Which required more thought, and their reason:
Help/clarifications provided:
```

The author confirmed the original tester's scores (ON 2/4, OFF 3/4), three
lineup changes in each run, different match-two selections, the quoted reactions,
and the difficulty calculating power. No unreported lineups have been inferred.
lfg2131 has decided to **KEEP** Codex's suggestion to show all four match
targets upfront, "because it makes fatigue management a strategic planning
challenge rather than a guessing game." This decision is recorded in Sources.

## Submission gate

GitHub identity must be `lfg2131`; remote must remain
`columbia-university-ai-games/motivation-atlas`; branch must be
`lfg2131/rotation-room`. Upstream Write access is unavailable. The author has
explicitly authorized a fork under `lfg2131`, pushing this existing branch there,
and opening a PR into the upstream `main`. Keep `origin` pointing upstream and
use a separate `fork` remote. Do not force-push or push to upstream `main`.

Before submission, review only this folder and
`test/rotation-room.test.ts`, run `npm test`, `npm run typecheck`, and
`npm run build`, plus browser checks. Commit the approved observations, push
this branch to the authorized fork, open the upstream PR with `gh pr create`,
and check its actual CI result. Submit the PR URL on CourseWorks.
