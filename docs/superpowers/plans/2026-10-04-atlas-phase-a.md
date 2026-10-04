# Atlas Phase A: Find and Try Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a newcomer immediately play Pig, find a game through a usable map or list, and inspect a specific gameplay moment.

**Architecture:** Extend the existing static Vite application with shareable hash routes, a shared minigame presentation component, and a pure catalog-filter module. Preserve the current minigame mount contract and file-based content. Store only the preferred overview view locally; encode public search/filter state in the URL and retain scroll position in browser history.

**Tech Stack:** TypeScript, Vite, native DOM/SVG, Vitest/jsdom, Playwright, existing npm scripts. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-04-atlas-learning-and-contribution-design.md`, approved in conversation. Read it and `AGENTS.md` before execution.

**Status:** Proposed implementation plan, awaiting review and execution-method selection. Only Phase A is planned here; approval of the broader design does not make this plan approved.

## Global Constraints

- Node 22.18 or later, as required by the repository.
- “This work does not edit it or the sourced `ties` in `content/games.json`.” This refers to the course note and its protected relationships.
- “Preserve quoted note text and citations exactly.”
- “Students' text is rendered with `textContent`.”
- “Shareable URLs contain public catalog identifiers and filter settings only. Never encode personal notes in a URL.”
- “Existing one-argument implementations remain valid.” Phase A does not change the mount interface at all.
- “No phase introduces navigation to an unimplemented page.” No notebook/contribution-form links yet.
- “Student reflections are submitted on CourseWorks.” No reflection submission feature.
- Use existing color tokens, support light/dark modes, keyboard, touch, reduced motion, and phone widths.
- Do not edit Pig, another author's minigame, or `_template`; factor only the existing shared presentation in `src/pages/motivator.ts`.
- Preserve student branch/PR workflow. This phase does not change access, branch rules, workflows, or deploy the application.
- Run `npm test` before any push. Do not push directly to `main`.

## Review Focus

1. A game with sourced and proposed links to different motivators must not match a sourced-only filter through its proposed link. Covered in Task 3.
2. A proposal-only point hidden from results must not remain pointer- or keyboard-activatable. Covered in Tasks 3 and 6.
3. Blocked localStorage, invalid URL parameters, and a changed viewport must leave a usable overview. Covered in Tasks 3 and 6.
4. Back navigation and same-page section shortcuts must not reset filters, remount Pig unnecessarily, or lose the user's place. Covered in Tasks 2, 4, and 6.
5. An unavailable thumbnail/embed must leave a working external video link and readable prompt, without claiming that a metadata check verified the footage. Covered in Tasks 5 and 6.

## File boundaries

| Files | Responsibility |
| --- | --- |
| `src/router.ts`, `src/app.ts` | Route recognition and dispatch |
| New `src/pages/game.ts` | Full game page, reusing `renderGameCard` content |
| New `src/minigames/presentation.ts` | Shared README, rules, author, source disclosure, host, and cleanup |
| New `src/pages/experiment.ts`, `src/pages/experiments.ts` | Focused minigame and registry directory |
| New `src/pages/catalog-filter.ts` | Filter state parsing, serialization, and matching |
| `src/pages/overview.ts`, `src/pages/overview.css` | Home entrance, map/list controls, results and selection |
| `src/pages/constellation-layout.ts` | Existing geometry; hit tests consume eligible points |
| `src/pages/motivator.ts`, `src/pages/motivator.css` | Section shortcuts and qualified transition wording |
| `src/main.ts`, new `src/lib/navigation.ts` | History scroll/focus handling and section navigation |
| `src/pages/video.ts`, `content/videos.csv` | Always-available external link and verified observation moments |
| `index.html`, `src/pages/about.ts` | Experiments navigation and real contributor-guide link |
| Existing and new `test/*.test.ts`, `e2e/*.spec.ts` | Behavior, safe rendering, cleanup and browser journeys |

## Task 1: Shareable game pages

**Files:** Modify `src/router.ts`, `src/app.ts`; create `src/pages/game.ts`; extend `test/router.test.ts`, `test/app.test.ts`, `test/pages.test.ts`.

**Interfaces:** Add Route variant `{ page: "game"; slug: string }`. Export `renderGame(root: HTMLElement, atlas: Atlas, slug: string): () => void`. Reuse `renderGameCard(game, atlas): HTMLElement`; promote its title to the page's single h1 without modifying source text.

- [ ] Add route tests: `parseRoute("#/g/halo")` equals `{page:"game",slug:"halo"}`; uppercase/malformed slugs remain not-found. Test rendering known/unknown games, sourced/proposed labels, and malicious proposal/video text remaining literal text.
- [ ] Run `npx vitest run test/router.test.ts test/app.test.ts test/pages.test.ts`; confirm new cases fail for missing routes/rendering, not broken fixtures.
- [ ] Implement the route and page with a Map link, game kind, existing evidence/citations, and videos. Preserve `renderGameCard` for content reuse; dialog removal happens when overview navigation changes in Task 3.
- [ ] Run the same tests and `npm run typecheck`; all pass.
- [ ] Commit only this task's files: `feat: add shareable game pages`.

## Task 2: Focused experiments using the existing contract

**Files:** Create `src/minigames/presentation.ts`, `src/pages/experiment.ts`, `src/pages/experiments.ts`, `test/experiment-pages.test.ts`; modify `src/pages/motivator.ts`, `src/router.ts`, `src/app.ts`, `index.html`.

**Interfaces:** Export `presentMinigame(game: Minigame): { element: HTMLElement; cleanup: () => void }`; reuse `readmeFor` and `mountSafely`. Export `renderExperiment(root: HTMLElement, slug: string): () => void` and `renderExperiments(root: HTMLElement): () => void`. Routes are `{page:"experiment",slug:string}` for `#/play/<slug>` and `{page:"experiments"}` for `#/experiments`.

- [ ] Add tests for Pig's direct URL, unknown experiment, registry directory links, README rules above the game, Sources in the disclosure, author text, and cleanup after starting a bot turn then navigating away. Use fake timers and assert no remaining timers or added nodes. Assert the motivator page still presents its existing minigame once.
- [ ] Run `npx vitest run test/experiment-pages.test.ts test/minigames.test.ts test/minigame-readme.test.ts test/app.test.ts`; confirm new cases fail.
- [ ] Extract the existing presentation logic without changing Pig or the mount signature. Implement pages and an Experiments header link. On the focused page, show the game's title as h1 and links back to its motivators; avoid a duplicate same-title heading inside its presentation.
- [ ] Run the tests above plus `npm run typecheck`; preserve existing tests, adjusting only assertions whose intended presentation changes.
- [ ] Commit: `feat: add focused experiment pages`.

## Task 3: Consistent searchable map and list

**Files:** Create `src/pages/catalog-filter.ts`, `test/catalog-filter.test.ts`, `test/overview.test.ts`; modify `src/pages/overview.ts`, `src/pages/overview.css`, `src/pages/constellation-layout.ts` if needed, `src/router.ts`, `src/app.ts`, `test/app.test.ts`, `e2e/smoke.spec.ts`.

**Interfaces:** Define `CatalogFilter = { query: string; motivator: string | null; relationship: "all" | "sourced" | "proposed"; videosOnly: boolean }` and `OverviewState = CatalogFilter & { view: "map" | "list" }`. Export `parseOverviewState(params: URLSearchParams, atlas: Atlas, defaultView: "map" | "list"): OverviewState`, `overviewHash(state: OverviewState): string`, and `selectGames(atlas: Atlas, filter: CatalogFilter): AtlasGame[]`.

URL keys are `q`, `motivator`, `relationship`, `videos=1`, and `view`. Unknown values fall back to defaults; invalid motivators clear that filter. Explicit URL view wins over saved preference, which wins over viewport default (list below 640 CSS pixels; map otherwise). Persist explicit view selection under `motivation-atlas.overview-view.v1`, catching storage errors. Do not switch views unexpectedly on resize.

`parseRoute` recognizes only the path before `?` and preserves existing no-query return values. Overview reads query parameters separately; no personal data is introduced. Replace the old Show student readings checkbox with the unambiguous relationship selector. A motivator/relationship conjunction must be satisfied by the same link.

- [ ] Add pure filter tests with games having mixed links, proposal-only links, and missing videos. Assert title matching is case-insensitive, filters intersect, results retain catalog order, malformed parameters normalize, and `parseOverviewState(new URLSearchParams(overviewHash(state).split("?")[1]), atlas, "map")` round-trips a valid state.
- [ ] Add DOM tests for clickable results, result count, empty/reset behavior, view preference precedence, blocked localStorage, and malicious titles rendering as text. Add a synthetic proposal-only point to verify exclusion from focus order and candidate hit tests when sourced-only is selected.
- [ ] Run `npx vitest run test/catalog-filter.test.ts test/overview.test.ts test/constellation-layout.test.ts test/router.test.ts`; confirm new cases fail.
- [ ] Implement shared filters and Map/List views. Both use the selected games and eligible relationships. In map view, dim nonmatching context points, remove them from tab order, and exclude them from `nearestNode` candidates. Hide excluded proposed links and proposal-only nodes. Only eligible game links appear in result summaries and open `#/g/<slug>`.
- [ ] Make each hub keyboard/touch selectable with persistent selection and a separate Open motivator link. Selection updates the motivator filter; Clear resets it. Hover may preview but must not erase persistent selection. Use semantic SVG controls and accessible names; do not retain `role="img"` if it conceals interactive descendants.
- [ ] Render game list entries with title, kind, linked motivators, evidence labels and video availability. Reuse evidence helpers. Keep an explicit Map/List choice, all eleven motivator links, a polite count, and Reset filters.
- [ ] Update URL filters with `history.replaceState` without rerendering the route or moving focus on each keystroke. Preserve any history metadata. Wire map/list game actions to ordinary hash navigation and stop invoking the dialog. Update old smoke tests that expected a modal to expect the game page instead; explicitly choose Map for map-specific tests on phones.
- [ ] Run targeted tests and `npm run typecheck`; all pass.
- [ ] Commit: `feat: add searchable map and list views`.

## Task 4: Entrance, section navigation, and return journeys

**Files:** Modify `src/pages/overview.ts`, `src/pages/motivator.ts`, `src/pages/motivator.css`, `src/pages/about.ts`, `src/main.ts`, `src/app.ts`, `index.html`; create `src/lib/navigation.ts`, `test/navigation.test.ts`; extend `test/motivator-layout.test.ts`, `test/overview.test.ts`.

**Interfaces:** Export `startNavigation(root: HTMLElement): () => void` from `src/lib/navigation.ts`; it calls existing `renderRoute`, owns render cleanup/listeners, and restores history position. `src/main.ts` imports styles and starts it. Export `navigateSection(section: "play" | "examples" | "sources" | "contribute"): void` for same-page section actions. Motivator shortcut URLs use `#/m/<slug>?section=<name>`; overview's Explore examples button targets the existing catalog region locally.

History metadata is namespaced as `history.state.atlas = { scrollY: number; focusId?: string }`, preserving unrelated state. Record outgoing position during scrolling and before link/keyboard navigation, so Back restores the old entry rather than reading the new route's position. Render once for each navigation; section-only changes on the same motivator scroll/focus without remounting its game. Use manual scroll restoration during this controller's lifetime and restore the original setting on cleanup. New routes start at h1/top; valid sections take precedence; Back restores a saved focus target and position after rendering.

- [ ] Add tests for route cleanup, no duplicate mount on section changes, invalid section fallback, history metadata preservation, outgoing position capture, and restoration after Back. Assert the cleanup restores listeners and the prior scroll-restoration mode.
- [ ] Update the existing band-arrow expectation to exactly `"can give rise to"` and `"which players may experience as"`. Preserve every note claim and citation assertion.
- [ ] Run `npx vitest run test/navigation.test.ts test/motivator-layout.test.ts test/overview.test.ts`; confirm new cases fail.
- [ ] Add the home links Try a two-minute experiment (`#/play/pig`) and Explore games and examples. Defer Use this in my project until its page exists. Add Play/Examples/Sources shortcuts on motivator pages; Sources targets the existing note-derived bands and citation links. Give target sections stable IDs and focusable headings. An empty Play section points to the real contributor guide.
- [ ] Link Contribute in the header to `#/about?section=contribute`, targeting Adding to it on About. That section links to `https://github.com/columbia-university-ai-games/motivation-atlas/blob/main/AGENTS.md` and explains private-repository access. Validate allowed section targets per route: play/examples/sources on motivators, contribute on About.
- [ ] Implement the navigation controller and responsive styles using existing tokens. Do not add local-note or contribution-form routes.
- [ ] Run targeted tests plus `npm run typecheck`; all pass.
- [ ] Commit: `feat: add playable entrance and preserve navigation context`.

## Task 5: Video fallbacks and observed gameplay moments

**Files:** Modify `src/pages/video.ts`, `content/videos.csv`; extend `test/pages.test.ts`. No new content schema or contextual observation CSV in this phase.

**Interfaces:** Preserve `renderVideo(video: Video): HTMLElement`. Add an always-visible normal anchor titled Watch on YouTube with `https://www.youtube.com/watch?v=<id>` and `&t=<seconds>s` when a nonzero start is present. The embed remains click-to-load.

- [ ] Add tests asserting the external URL at `start: 30`, missing start and zero; clicking Play is the only way an iframe appears; dispatching an image error preserves the title, channel, prompt and external link. Preserve malicious-text tests.
- [ ] Run `npx vitest run test/pages.test.ts`; confirm new cases fail.
- [ ] Add the external link outside the replaceable media frame. On thumbnail error say the preview could not load, rather than asserting that the entire video is unavailable. Keep the external link visible even after embed activation because third-party embed failure is not reliably inspectable.
- [ ] Run the tests; all pass. Commit renderer/tests: `fix: keep video links usable when previews fail`.
- [ ] Open each of the 12 listed videos and watch a relevant segment. Record a verified whole-second start and a concise, visible action/consequence to watch for. Use the linked note context to choose a relevant moment; never infer feelings or timestamps from metadata. Preserve verified title/channel values. If footage cannot be accessed, leave that row empty and report it as unfinished content work; do not declare video annotation complete.
- [ ] Run `npm run check-videos` with network access and `npm test`. Resolve data failures; report transient availability problems separately. Automated success does not replace actual viewing.
- [ ] Review the CSV diff against the watched segments, then commit only verified annotations: `content: annotate gameplay observation moments`.

## Task 6: Browser acceptance and phase handoff

**Files:** Extend `e2e/smoke.spec.ts`; create `e2e/exploration.spec.ts`. Touch implementation files only to resolve failures from these journeys, with regression coverage for each defect.

- [ ] Add desktop and phone journeys: home → Pig → roll/hold → navigate away; list search → game → Back retains query, view, focus and scroll; map selection → Open motivator; section shortcut during a bot turn does not reset the game; unknown game/experiment shows not-found.
- [ ] Add browser cases for keyboard-only map/list navigation, video-availability filtering against the real catalog, stored preference overriding viewport default, and a blocked thumbnail leaving the external link. Assert no overflow and meaningful accessible names; avoid live YouTube dependency in these checks. Mixed/proposal-only filtering uses Task 3's synthetic unit/DOM fixtures because the current catalog has no proposals; do not publish invented content to exercise it.
- [ ] Run `npm run typecheck`, `npm test`, and `npm run e2e`. The e2e command's configured web server builds the app. Confirm all pass; install the configured Chromium browser if missing. Do not treat a blocked browser environment as successful verification.
- [ ] Manually play Pig through a complete game from its focused page and try its mechanic settings. Check desktop and phone-width layouts in both themes, touch-sized controls, visible focus, and reduced motion. Confirm no double bot timers after section navigation. Record actual observations, not assumed usability.
- [ ] Check the phase diff leaves the course note, sourced ties, Pig, other minigames, `_template`, GitHub permissions, and workflows untouched. Confirm no dead links to deferred features and no generated local notes or secrets are tracked.
- [ ] Commit the acceptance tests and any verified fixes. Report commands/results, browser playtest observations, video rows actually viewed, and remaining limitations. Do not merge or publish as part of this plan; follow the repository's instructor/TA review process.

## Coverage and subsequent plans

Phase A covers approved spec sections 3, the first increment of 4, and the existing-contract portion of focused experiment presentation. It includes the relevant navigation, evidence, safety, and acceptance requirements from sections 9–12.

Separate plans will cover B (comparison and persistence), C (contribution preparation and GitHub controls), D (three independently deliverable minigames), and E (project hypotheses). None is implicitly included in this execution. Complete the current phase's review before selecting the next plan; prioritize C's repository protections before a broad student contribution workshop.
