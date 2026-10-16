# Rotation Room: anonymous comparison playtest

README status: **pending real human observations**. Automated checks do not
complete this requirement. Use one other real person; do not record their name,
contact details, account, or other identifying information.

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

## Tiny observation sheet

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

Return the filled sheet to Codex. Only then replace the pending README sections
with accurate observations, keeping its four sections and approximately 250
words. lfg2131 has decided to **KEEP** Codex's suggestion to show all four match
targets upfront, "because it makes fatigue management a strategic planning
challenge rather than a guessing game." This decision is recorded in Sources.

## Submission gate

GitHub identity must be `lfg2131`; remote must remain
`columbia-university-ai-games/motivation-atlas`; branch must be
`lfg2131/rotation-room`. At preparation, GitHub reports read access but
`permissions.push: false`. An instructor or repository administrator must grant
Write access (and you must accept any invitation) before pushing here. Recheck
permissions after that; do not switch repositories or force-push.

After the real playtest and README are complete: review only this folder and
`test/rotation-room.test.ts`, run `npm test`, `npm run typecheck`, and
`npm run build`, commit the observations, push this branch, open the PR with `gh pr create`, and
check its actual CI result. No PR should be opened while observations are pending.
