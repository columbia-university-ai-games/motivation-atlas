# Fogbound playtest evidence

## Design rationale — student account

The student enjoys finding optional chests without a guide, uncovering hidden content and exploring before main objectives in GTA and Genshin Impact. Early exploration feels rewarding when it makes later objectives easier. Fogbound translates that preference into torchlight, dim remembered terrain, optional collectibles and sight upgrades. Discovery is the focal motivator; collection and progression support it. Only fog of war is toggled in the comparison.

The student later clarified that muted terrain also draws on their memory of grey routes in Forza Horizon, including their remembered relationship to exploration and fast travel. This is a personal inspiration account, not a verified claim about Forza Horizon’s rules. Codex suggested retaining dim exploration memory; the student kept it and connected it to this inspiration. The student directed the camera, movement, chest rewards, Boost, staged quests and completion feedback. These are design intentions, separate from player observations.

## Another-person ON → OFF comparison — completed

Evidence: a 5 minute 28 second audio recording, its Gemini 3.6 Flash (high) transcript, and the student's follow-up confirmations. Participants are anonymous. The audio/transcript are retained privately outside this repository. The recording includes gameplay silence and conversation; its length is not either round's game duration. A few transcription words are unclear and excluded from conclusions.

The student confirmed fog ON first, fog OFF second, Restart each time, and the same final goal: open both outposts and collect all eight treasures. The OFF round was **10 seconds faster**, a confirmed test result supplied by the student. Individual absolute times were not recorded. The prototype is documented at branch revision 17acd00; the recording does not independently expose a revision identifier.

| Evidence | Fog ON | Fog OFF |
| --- | --- | --- |
| Goal reached | Both outposts and all eight treasures | Same goal completed |
| Completion time | Absolute time unrecorded | 10 seconds faster than ON; absolute time unrecorded |
| Navigation | Player said they followed the arrows | Arrows still guided play; player said they would collect items first |
| Obstacles | Terrain restricted by torch visibility | Designer observed distant walls/obstacles visible early enough to avoid |
| Feelings | Later described some exploration feeling | Initially little difference; later described no-fog play as less interesting |
| Assistance/usability | Controls explained; player questioned boots, outpost purpose and brief Boost duration | Designer offered an inventory/chest hint while player sought Boost |

### Player words and question context

Selected short English translations from the Chinese transcript:

- Asked how they chose a direction: “Aren’t there arrows?”
- First asked to compare feelings: “I don’t really feel anything different, because both have little arrows guiding you.”
- After the designer explained discovery and asked whether fog produced exploration: “Maybe a little. Without fog, it’s much less interesting.”

The first comparison was relatively open; the later exploration question was leading. The designer also announced that the mechanic had succeeded, after which the player agreed. That agreement is not presented as an independent finding.

### Interpretation

The confirmed speed difference and earlier obstacle visibility describe the observed comparison. Shared arrow guidance remained a strong influence on navigation, and the initial feeling comparison was weak. Later comments favor fog's exploration atmosphere but followed an explanation of the intended effect. The student also noted familiarity with the map in the second round. These observations support a qualified MDA reflection rather than a universal claim about Discovery.

No detailed route trace or counts of detours were recorded. Absolute round duration remains unknown, so the assignment's minute-or-two scale has not been verified by measured human timing. Two-outpost completion is the main objective; full collection is the tested final goal and remains available afterward.

## Student self-test — separate evidence

The designer's earlier prototype self-test reported unclear chest meaning, weak reward feedback, unexplained three-hit outposts, focus/resume frustration, slow movement and stopping play at the first win. They preferred dim remembered terrain and felt fog encouraged exploration. These are designer observations, not the other-person comparison above.

Subsequent user-directed revisions added in-world prompts, reward/hit feedback, supply costs, focus-loss pause and click-to-resume, start entry, brief movement easing, continued collection, rechargeable Boost, treasure-map guidance, staged quests and an immediately updating collection bar. The final user-approved guidance marks both remaining stars after the map, then remaining chests after collecting the stars.

## Assistant technical checks — separate evidence

Latest implementation checks on 2026-10-13: 125 tests passed across 20 files, including 25 Fogbound tests; typecheck and build passed. The existing 16 desktop/phone e2e tests passed; they do not include a full Discovery-game run.

Separate assistant browser checks verified start/resume focus, chest rewards, Boost energy, fog reset, staged quests, two-star guidance progressing to remaining-chest guidance and full completion. The page had no horizontal overflow at a 390px viewport. Scripted traversal timing is not human evidence. Rules tests cover visibility/memory, movement, resources, recharge, quest navigation and completion. Read-only review reported no demonstrated correctness issue in staged-quest changes.

No PR exists, so PR CI is pending. These checks do not measure fun or player feelings.

## Submission status

Human ON/OFF evidence is recorded; README uses actual behavior and feelings. Remaining: measured round duration if available, review and authorize PR contents, commit/push documentation when authorized, create PR, confirm CI, and student submission of the PR URL to CourseWorks. No identifying player details or recording files belong in the PR.

Documentation verification on 2026-10-14: npm test passed all 125 tests; npm run build passed; git diff --check passed. Only README and PLAYTEST were edited in the game repository during this documentation task. No commit, push or PR.

## Later design clarification and future directions — student account

The student imagined dim terrain as remembered information: it would preserve the last observed state while changes outside current sight remained unknown until revisiting. The current implementation retains dim explored terrain, but does not simulate a changing world or store stale snapshots of objects.

Future ideas, not implemented or tested in this submission:

- Give more treasures functional effects beyond descriptive text; current Boost and treasure-map items already have functions.
- Change parts of the map when treasures are opened, creating surprise behind the fog.
- Explore constrained random map changes while preserving reachable objectives and manageable difficulty.

These are possible later experiments, not findings from this playtest. The current ON/OFF comparison keeps the layout fixed. Any later changing-map version should use the same change rules and randomness in both modes if fog remains the tested mechanic.

The student further clarified that future terrain changes would generally preserve existing outpost and treasure positions. Given current completion progress and the desire for roughly minute-long play, these changes were deferred because they could add excessive difficulty. This is a scope decision and design concern, not a measured player-duration finding. The current map remains fixed.
