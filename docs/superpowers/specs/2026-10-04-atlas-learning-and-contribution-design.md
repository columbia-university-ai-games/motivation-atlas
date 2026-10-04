# Motivation Atlas: play, compare, contribute, apply

AI-use disclosure: Drafted with Codex from the existing Atlas, course materials, and instructor decisions; instructor review is pending.

Date: 2026-10-04
Status: Approved by the instructor in conversation; implementation plans require separate review
Scope: Local-first evolution of the Atlas across classroom demonstration, student contribution, and students' own game design

## 1. Purpose and decisions

The Atlas helps a student connect a rule to behavior observed during play and to the player's account of the experience. Its central loop is:

**Play → change one rule → compare → explain → apply to a project.**

The map and course note remain ways into that loop. Students can also enter through a short experiment, a particular gameplay moment, or a project question.

The instructor requested a design covering all seven improvements from the project review: a playable entrance, annotated videos, comparison across runs, searchable game lists, contextual contribution tools, three contrasting minigames, and project hypotheses. The instructor also selected local-first operation, personal notes, and student commits with GitHub Actions and instructor/TA approval for merging contributions. Hosting comes later.

The instructor clarified that “check-ins” meant commits: students must be able to contribute code and content to this repository. Student reflections remain on CourseWorks. Optional local notes support exploration and project planning; they are not repository submissions or a replacement reflection workflow. Section 10 defines the contribution and review boundary.

### Three uses

| Use | Student or instructor journey | Successful outcome |
| --- | --- | --- |
| Classroom demonstration | Open a direct experiment link, play, change a rule, discuss | Participants identify a changed rule and describe behavior or feeling that did or did not change |
| Contribution workshop | Find a missing example, prepare a contribution, run checks, submit a PR | A focused, attributable contribution reaches instructor/TA review with evidence of actual viewing or play |
| Project companion | Select intended motivations, state a hypothesis, prepare a playtest, record findings | A student connects an observation to a design decision in their own project |

These are entry points into one application, not separate modes with duplicated content. The Atlas remains optional teaching support. It introduces no quiz, grade, deadline, or new course submission requirement.

### Existing authority

- `AGENTS.md` governs contributor boundaries and minigame requirements.
- `content/player-motivations.md` supplies the note and its sourced relationships. This work does not edit it or the sourced `ties` in `content/games.json`.
- The teacher repository's `docs/syllabus-published.md` governs course requirements. G1 asks for intended motivations and a playtest question; later playtests connect findings to changes.
- The earlier teacher-repository spec, `docs/superpowers/specs/2026-10-04-motivation-atlas-design.md`, establishes the static, private, local-first scaffold. This document extends that scaffold and supersedes its UI details only where explicitly described here.

At review time the Atlas contains 91 games/activities, 107 sourced ties, 12 videos, Pig as its one registered minigame, and no student readings. All video timestamps and observation prompts are empty. The existing 97 unit tests pass; this review did not include a browser playtest.

## 2. Architectural approach

Use the existing Vite/TypeScript static application, file-based content, and GitHub PR workflow. Add a small local notebook and optional minigame reporting interface. No runtime model calls, application backend, authentication, or remote note storage are needed.

Alternatives considered:

1. **Local-first application with exportable notes, selected.** Fits the instructor's decision and current contribution model. Notes belong to a browser origin; export/import provides portability.
2. **Hosted static application.** Can reuse this design later and simplify opening experiments on phones. It still does not synchronize notes and requires a separate publishing decision.
3. **Hosted application with accounts and shared storage.** Enables cross-device notes and in-app review but introduces a server, identity, access, and moderation subsystem. Defer it until a concrete need justifies it.

Deliver the design as independently reviewable phases. An implementation plan must be scoped to a phase or coherent subset, not one large rewrite.

For classroom phone access, keep the existing `npm run dev:share` workflow and provide copyable experiment paths alongside its printed Network address. A localhost link only opens the recipient's own machine. The application must not promise a classmate can reach an address when campus Wi-Fi blocks peer connections. In that case, use the instructor's demonstration or students' own checkouts until hosting is introduced. No remote tunnel or public deployment is part of this design.

## 3. Entrance, navigation, and evidence

### Home

Keep the heading and constellation. Place three concise entry links before the map:

- **Try a two-minute experiment:** opens Pig's experiment page with rules immediately available. The duration is an aim to verify in playtesting, not a guaranteed timer.
- **Explore games and examples:** moves to the searchable list/map area.
- **Use this in my project:** opens the local hypothesis notebook, with a short explanation for first-time visitors.

Add a Contribute link in the main navigation. Avoid a tutorial that must be completed before browsing.

### Motivator pages

Keep the note-derived Mechanics, Dynamics, and Aesthetic bands. Add anchors near the title for Play, Examples, Sources, and Use in my project. Play goes directly to available minigames; when none exist, show an actionable minigame contribution link without suggesting the motivator has a playable demonstration.

Change only interface transitions around the note: rules **can give rise to** dynamics, which players **may experience as** an aesthetic. Preserve quoted note text and citations exactly. Distinguish the sources' expectations, the application's measured events, and the student's interpretation wherever they appear together.

### Search and list

Provide Map and List controls with the same search and filters. On phones, initially show List; on larger screens, initially show Map. Preserve an explicit user choice locally. Always offer both.

Initial filters: title search, motivator, evidence relationship (sourced/student reading), and video availability. A game having a linked motivator with an experiment does not mean that game itself is playable; offer a separate experiment directory instead of mislabeling game results.

The list uses real links with title, kind, linked motivators, evidence labels, and video availability. Search results are actionable and announce a result count. Match title case-insensitively as today; do not add fuzzy search initially. Combining filters uses intersection. Hiding student readings affects eligibility, counts, links, and pointer hit testing consistently. Empty results offer a clear reset.

Map selection can persist on tap or keyboard activation, with an explicit Open motivator action, rather than requiring hover. Game points and list links reach the same game detail page. Keep the map's solid/dashed distinction and its visible explanation.

### Routes

Preserve existing hash routes. Add:

- `#/g/<slug>`: a game page with evidence, student readings, and videos.
- `#/play/<slug>`: a focused experiment page with instructions, mechanics, comparison, and source context.
- `#/experiments`: the registered minigames, linked to their motivators.
- `#/contribute`: contribution chooser, with validated optional game/motivator parameters.
- `#/notebook`: locally saved hypotheses and selected experiment records.

Shareable URLs contain public catalog identifiers and filter settings only. Never encode personal notes in a URL. Existing cards can be reused as page content; use ordinary page navigation initially rather than introducing two competing modal/history behaviors. Back navigation restores the overview's search, view, and scroll position. Unknown identifiers show a useful not-found page.

## 4. Gameplay videos as observations

### First increment

Use the existing `start` and `watchFor` columns in `content/videos.csv`. For each of the 12 videos, a contributor watches a relevant segment, records its start in whole seconds, and writes a concrete observation prompt. The reviewer checks that the moment supports the description. Unreviewed timestamps are left empty; never infer them from titles.

Prompts point to visible actions or consequences and invite interpretation. They do not assert that a viewer or player must feel a named emotion. Preserve YouTube's verified title and channel. Keep `npm run check-videos` for metadata and availability checks.

Add a normal Watch on YouTube link, including the start time, beside each player. Thumbnail failure or an unavailable embed must leave the title, prompt, and external link usable. Continue loading embeds only after activation.

### Later increment: prompts by motivator

Keep video identity in `videos.csv`. Introduce optional `content/video-observations.csv` with columns `game,youtubeId,motivator,start,watchFor,github`. Each row references an existing video and existing game-to-motivator relationship; it creates no new tie. A new student interpretation first needs its proposal.

Allow one contextual row per game/video/motivator initially. On a motivator page, that row overrides the generic timestamp and prompt. On the game page, show available contextual prompts with their motivator and author. If no contextual row exists, retain the generic prompt.

Validate foreign keys, nonempty prompts, nonnegative integer start times, author handles, and duplicate keys. Students' text is rendered with `textContent`. Review checks the actual video moment; validation cannot establish its interpretive quality. Existing CSV rows remain valid without migration.

## 5. Comparing runs and keeping notes

### Player flow

1. Read the short rules and play with one set of mechanics.
2. Finish or explicitly stop the run. Record the reason; an interrupted run is not a completed one.
3. Choose Keep for comparison. The student may add what they noticed and felt.
4. Change one mechanic and start another run. The interface identifies changed settings without preventing exploratory changes to several settings.
5. Compare the two runs and optionally save them with a hypothesis.

Comparison shows settings, outcome, and a few relevant observations defined by the minigame. For Pig these can include rolls, holds, busts, and lead changes. The player's explanation appears beside those observations, never computed from them. Win rate or lead changes are not measures of enjoyment.

Prompt separately for **what happened**, **what I felt**, and **what I would try next**. Accept disagreement with the source's expectation and allow all questions to be skipped. Do not score completion or infer a personality profile.

Repeated play involves learning, order, and chance. The comparison should briefly acknowledge these when interpreting differences. Randomness is not automatically controlled by replaying a seed: changed decisions can consume draws differently. Record scenario/seed metadata where supported, without promising a controlled experiment.

### Optional reporting contract

Keep existing `mount(el): cleanup` minigames working. Add an optional host context as a second parameter, so games can report a completed or stopped run without accessing storage. Existing one-argument implementations remain valid.

The host owns a small versioned `RunSummary`: local ID, game slug, rules version, local timestamp, status (`completed` or `stopped`), mechanic settings, optional scenario ID, and bounded labeled observations. Require JSON-safe values, finite numbers, known fields, and conservative size limits. Do not accept arbitrary HTML or game callbacks. A run identifier prevents duplicate final reports.

Initial limits are 20 settings and 20 observations per summary, 120 characters per label, and 500 characters per string value. Each observation includes its unit where relevant. Comparison uses matching observation keys and rules versions; when versions differ, show the records with a visible incompatibility explanation rather than calculating differences.

Games own rules and observations; the experiment host owns comparison, saving, and reflection. Games without reporting still work and offer manual reflections. Navigating away cleans up the game and does not fabricate a result. A saved record is a summary, not a replay.

Pig integration is a course-maintainer change, not permission for student contributors to modify another author's minigame. Update shared contributor documentation only when the reporting extension is implemented and verified; keep the template itself unchanged under the existing repository rule.

### Local persistence

Store small, versioned notebook documents in localStorage through a dedicated adapter. Save only records the student chooses to keep; do not persist every action. Show saved/unsaved state. On blocked storage or quota errors, keep the draft usable in memory and offer export.

Offer readable Markdown export and versioned JSON export/import. Markdown is for a student's own project documents; JSON preserves structured data for another browser. Import validates types, size, references, and versions before a preview. Merge with new local IDs by default; never silently overwrite existing notes. An unsupported version or malformed import leaves current data untouched. Missing catalog references remain readable as archived labels with a warning.

Cap a JSON import at 1 MiB and 200 records, with 5,000 characters per reflection field. Enforce equivalent limits on saved documents and explain how to export/delete older records when at capacity. Treat storage failures as recoverable even below these limits. Parse imported objects through an allowlist instead of merging their properties into application configuration.

Provide individual deletion and a clear local-data reset. Explain that notes stay in this browser, can be lost when browser data is cleared, and do not follow localhost to a network address or later hosted origin. No analytics, automatic uploads, or GitHub credentials are part of the notebook.

## 6. Project hypotheses

A hypothesis records a project label, one or more motivators, an intended feeling, a proposed mechanic, expected behavior, an observation to look for, a neutral player question, and optional source/experiment links. Students write their own claims. No automated completion invents observations or citations.

Use the short prompt:

> I intend players to feel ___. The mechanic is ___. I expect players to ___. In a playtest, I will observe ___ and ask ___.

After a playtest, allow actual observations, the player's reported experience, a design decision, and a build/PR reference. Keep expected and actual results separate. A hypothesis can be untested, tested, or revised, explicitly selected by the student. Preserve the earlier hypothesis when revising so the observation is not retrofitted to a new prediction.

Export a concise Markdown record that can be used in the student's existing project/GDD/playtest workflow. Include a field for the student's AI-use disclosure, consistent with the published syllabus; do not invent the disclosure on their behalf. Student reflections are submitted on CourseWorks. The Atlas provides no reflection submission, review, grading, or CourseWorks synchronization. It does not replace course playtest consent, Asana coordination, or the required project evidence.

## 7. Contextual contributions

Replace empty-state references to AGENTS.md with a specific action and a link to the guide. Prefill known game and motivator fields. Offer three paths:

- **Video:** prepare a valid CSV row with exact metadata, timestamp, and observation prompt.
- **Student reading:** prepare a proposal naming the game, motivator, mechanic, dynamic, and GitHub author. Reject sourced duplicates and known invalid references.
- **Minigame:** provide the folder/registry workflow, contract checklist, and a link to an existing worked example. Do not generate a complete game inside a browser form.

For a new game proposal, export both the new `games` entry and proposal as a clearly labeled bundle; never generate a sourced tie. Validate them together. All output is a preview for copy/download, followed by instructions to edit a branch and open a PR. The application neither commits files nor authenticates to GitHub.

Share pure validation/serialization logic between the form and repository checks where practical. Correctly quote commas, newlines, and quotes in CSV. Generated JSON contains only allowlisted fields. Preview all user text safely.

Show a worked reading with an explicit instructional-example label. Use an invented demonstration game so the example does not add an uncited factual claim about a commercial game. Do not insert this sample into live proposals or the constellation.

Forms distinguish syntactic success from review readiness: a valid mechanic/dynamic field can still be a weak argument. Ask the contributor to explain what they actually watched or played in the PR, using the existing template's intent. Avoid publishing personal playtester information.

## 8. Three contrasting minigames

Each game lives in its own folder with pure rules, DOM adapter, README, and rules tests, plus registry registration. Each is designed for roughly one or two minutes, with an explicit finish/stop action and mouse, touch, and keyboard controls. Actual duration and clarity require human playtesting. No network calls or uncredited external assets.

### Discovery: Lantern Walk (`lantern-walk`)

Explore a small connected grid, find three landmarks, and return to the entrance. Move using arrow keys or large directional buttons. There is no damage or time limit. A mechanic selects fogged versus fully visible terrain; fog reveals the current cell and adjacent cells, and explored cells remain visible.

The rules generate a reachable layout from a recorded seed. A comparison can reuse the layout, with an explicit reminder that the second run benefits from familiarity; a fresh-layout option is also available. Record movement count, distinct cells visited, and landmarks found. Ask whether revealing the map changed route choices or curiosity.

Source basis: the note's Discovery section discusses revealing hidden information (Malone 1980, p. 67; Salen and Zimmerman 2003, ch. 17), worlds to map, and secrets to find. The game's exact causal interpretation is a design hypothesis. Tests establish reachability, movement bounds, reveal rules, and completion under both settings.

### Fellowship: Shared Crossing (`shared-crossing`)

Two people share a phone and move two couriers and their parcels across a small sequence of gates. Each courier has a distinct set of turn-based controls. With interdependence enabled, operating one courier's switch opens the other courier's gate; coordinating roles is required. With it disabled, each courier can operate its own gate. Keep the map, goals, and number of gates fixed across variants.

Use latched switches and sequential actions, so success never requires simultaneous touch or sustained button presses. A person can operate both roles for accessibility or inspection; label that as solo play rather than evidence about social connection. There is no chat service, remote multiplayer, or identity collection.

Record actions, deliveries, and switch activations. Do not infer cooperation quality from counts or try to detect conversation. Ask what the two people negotiated and whether needing the other role changed the experience. Record participant mode in comparison summaries.

Source basis: the note's Fellowship section discusses interdependence and tasks that need others (Hunicke et al. 2004, p. 3; Schell 2019, p. 229). The README must state that the rules require complementary roles, not that the device can enforce two distinct humans. Tests prove each role's gate permissions, reachable completion, and reset behavior in both variants.

### Submission: Pattern Garden (`pattern-garden`)

Build a small repeating garden by placing the next tile into any empty cell. Placement follows a simple repeating visual sequence and always succeeds on a free cell. Filling the board begins a new one. There are no wrong answers or knowledge checks.

The mechanic toggles a visible 60-second countdown. With the timer enabled, the round ends at zero and preserves the garden; without it, the player ends the round whenever they choose. There is no minimum target, failure state, speed ranking, or correctness score. Both modes can be paused and ended early.

Record placements, boards completed, active duration, and ending reason. Compare the player's report of pacing and attention; unequal durations make raw placement counts unsuitable as an improvement score. Use reduced-motion preferences and quiet visual feedback; sound is unnecessary.

Source basis: the note's Submission section discusses rhythmic repetition, simple rules, low risk, and turn-based play instead of a clock (Salen and Zimmerman 2003, ch. 24; Koster 2013, p. 100; Lazzaro 2004b, sec. 1c; Schell 2019, p. 143). The timer contrast is this game's hypothesis. Tests cover placement, board renewal, pause accounting, expiration, and cleanup.

For every README, copy any direct quotation exactly from the note at implementation time, with its citation. These prototypes are experiments in the note's ideas; adding them does not create sourced catalog ties.

## 9. Implementation boundaries and data flow

Proposed modules, to refine in phase-specific plans:

| Area | Responsibility | Expected files |
| --- | --- | --- |
| Navigation and discovery | Routes, filtered result state, game pages, entry links | `src/router.ts`, `src/app.ts`, `src/pages/overview.*`, new game/experiment pages |
| Evidence presentation | Note bands, contextual video prompts, fallback links | `src/pages/motivator.*`, `src/pages/video.ts`, `content/videos.csv` |
| Local notebook | Versioned records, persistence, import/export, hypothesis editor | new `src/notebook/` and notebook page |
| Experiment host | Optional reporting, comparison, manual reflections | `src/minigames/types.ts`, shared host module, experiment page |
| Contribution preparation | Forms, serializers, actionable empty states | new contribution page and pure helpers |
| Content extension | Optional contextual video rows and validation | `src/content/` plus new CSV; instructor-owned review |
| New games | Isolated rules and presentation | three new folders under `src/minigames/`, registry entries |
| Review automation | Checks and reviewer protection | `.github/workflows/`, `CODEOWNERS`, PR template and repository rules |

Content flows from repository files through build-time validation into the catalog. A contribution draft flows through pure validation to a downloadable snippet, then through a student-controlled branch/PR to review. A run summary flows from a minigame to its host, then to in-memory comparison, and only on explicit save to the notebook. Notes never enter the catalog implicitly.

Keep rendering helpers and stylesheet tokens. Use semantic controls, visible focus, and text equivalents for graphs. The comparison host isolates failures in optional reporting so a malformed report cannot erase notes or crash the surrounding page. Unmounting must remove timers and global listeners.

## 10. Student commits and GitHub approval

All shared changes arrive by PR. GitHub Actions provides evidence; the instructor or a designated TA approves the change. An automated pass never promotes a student interpretation to a sourced tie.

Students receive repository access that allows them to clone, create their own named branches, commit, push those branches, and open or update PRs in this private repository. They do not need approval for each local commit or branch push. Merging into protected `main` requires passing checks and instructor/TA approval. Students cannot approve their own merge or bypass those protections. Verify the actual organization permissions and branch rules with a student-access account before the contribution workshop.

### Required checks

- On every PR: install from the lockfile, typecheck, content/rules/component tests, build, and desktop/phone browser checks. Existing browser setup already builds the application; avoid duplicating the build unnecessarily.
- On video-data changes: check YouTube metadata and availability, plus contextual-reference validation when that format is introduced. Distinguish transient network failures from invalid content in the result. Keep the required job identity stable even when the video portion is skipped on unrelated PRs.
- Add an integrity check comparing the PR's protected note and sourced ties to its base revision. Block ordinary student changes to those fields. Instructor maintenance uses a separately documented maintainer path; do not make instructor updates impossible or silently exempt an author name in code.
- Ensure tests execute untrusted PR code with read-only repository permissions and no secrets. Use ordinary `pull_request` checks; do not run contributor code under a privileged `pull_request_target` workflow. Do not automate approval or merging.

### Repository configuration

Require a PR, passing required checks, a code-owner review, and renewed approval after substantive new commits. `CODEOWNERS` currently names only the instructor; add actual TA handles or a configured TA team when supplied. Approval by any authorized instructor/TA is sufficient by default. No invented handles and no broad student approval group.

Protect `CODEOWNERS`, workflow definitions, the course note, and source-tie maintenance with instructor ownership. Routine student additions can be reviewed by the instructor or TAs. Keep administrator bypass narrow and explicit. Repository settings must be inspected and configured during implementation; their current live state was not verified in this review.

Local test results help the contributor, but only the PR's checks and authorized review satisfy the merge gate. Run `npm test` before every push as required by AGENTS.md. Protecting a branch does not mean publishing its contents outside the current private audience.

### Contribution scope and CourseWorks boundary

Repository contributions include playthrough videos, student readings of games, students' own minigames, and page improvements under AGENTS.md. Student readings are shared mechanic-and-dynamic arguments in the catalog; they are distinct from course reflection assignments. Reflections remain on CourseWorks. Do not add reflection files, progress check-in records, or a reflection approval workflow to this repository. Local notebook records remain private to the browser and exportable for the student's own use; contribution tools never bundle them into a PR.

## 11. Delivery phases and acceptance

| Phase | Scope | Acceptance evidence |
| --- | --- | --- |
| A: Find and try | Playable entrance; motivator shortcuts; qualified MDA transition wording; actionable search/list; game routes; annotate current videos; video fallback links | A new visitor reaches Pig, a named game, and a specific video moment without repository knowledge; keyboard and phone journeys pass |
| B: Compare and keep | Focused experiment host; backward-compatible reporting; Pig adapter; comparison; local notebook and import/export | Two explicitly saved runs remain distinguishable after reload; storage/import failures preserve work; existing minigames still mount and clean up |
| C: Contribute and review | Contextual forms; worked reading; optional video observations; student branch/push access; GitHub check and reviewer configuration | A student commits and pushes a contribution branch, opens a valid focused PR, and can update it; invalid/protected changes fail; merging requires an authorized human review; notebook records are excluded |
| D: Broaden play | Discovery, Fellowship, Submission games | Rules tests pass; each variant is played on phone and keyboard; players can describe the changed rule and give their own account of its effect |
| E: Apply to projects | Hypothesis editor, revisions, links to runs and playtest findings, readable export | A student exports an intended mechanic/behavior/feeling hypothesis and later records a finding and resulting decision without overwriting the original prediction |

A does not depend on notebook work: its experiment route uses the existing mount contract, and B adds reporting and comparison. Show the project-notebook entry only when E ships, and contribution-form links only when C ships; earlier releases link to the existing contributor guide. No phase introduces navigation to an unimplemented page. The three D minigames are independently deliverable; their comparison integration uses B. E uses B's persistence. C's review protections should precede a broad student contribution workshop. Hosting remains a later decision.

## 12. Verification and review questions

Automated checks should exercise meaningful boundaries: safe rendering of student text; search/filter consistency; route/back navigation; old minigame compatibility; completed versus interrupted runs; persistence failures; malformed imports; source-tie protection; serializers; each game's invariants; cleanup; keyboard interaction and phone layout. Overflow checks alone do not establish that phone controls are usable.

Human acceptance includes an instructor-led short demonstration, a first contribution prepared by a student unfamiliar with the files, two-person Fellowship play, and a hypothesis carried into an actual project playtest. Ask whether students can explain the mechanic, distinguish observation from feeling, and find the evidence behind a claim. Record confusion and revise the interface. Do not grade students or claim educational effectiveness from a successful smoke test.

Before approving implementation, review:

1. The student contribution workflow and instructor/TA merge controls; reflections remain on CourseWorks.
2. The three minigame rules and whether the contrasts serve the desired teaching use.
3. The proposed phase order and which phase should be planned first.

This spec is a reviewable proposal. No application code, protected content, repository settings, or student data are changed by writing it.
