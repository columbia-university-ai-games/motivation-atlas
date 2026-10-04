# AGENTS.md

Read this first, whether you are a student in AI in Practice: Game Design and
Development or the coding agent a student is working with. `CLAUDE.md` imports
this file, so Claude Code reads the same text.

## What this is

The Motivation Atlas is an interactive companion to the course note on why
people play. The note gathers the main frameworks of player motivation into
eleven motivators and describes each in the three layers of the MDA
framework: mechanics (the rules a designer builds), dynamics (what emerges
while the rules run) and aesthetics (what the player feels). The Atlas draws
those motivators as a map, gives each one a page that runs from mechanics to
feeling, links the example games to playthrough videos, and hosts minigames
that let you change a mechanic and feel the difference.

You make it bigger. You can add a playthrough video, propose that a game
belongs under a motivator, build a minigame, or improve how a page looks or
works.

One rule holds everything together. A solid line from a game to a motivator
means a cited source in the note ties them together. Only the note decides
those. Your own readings appear as dashed lines, labeled as student readings,
and they must name the mechanic and the dynamic that carry the motivator.

## Run it

You need Node 22.18 or later (`node --version`) and the GitHub CLI. The
repository is private, so sign in to GitHub once before you clone it.

```bash
gh auth login
gh repo clone columbia-university-ai-games/motivation-atlas
cd motivation-atlas
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173). The page
reloads when you save a file.

| Command | What it does |
| --- | --- |
| `npm run dev` | Serves the site on localhost while you work |
| `npm run dev:share` | Serves it to other computers on your network too, so classmates can play what you are building |
| `npm test` | Runs every check: content, pages, minigames, Pig |
| `npm run typecheck` | Checks the TypeScript |
| `npm run check-videos` | Asks YouTube whether every video exists and embeds (needs the internet) |
| `npm run build` | Builds the site into `dist/`; fails if a content file has a problem |
| `npm run e2e` | Opens the built site in a real browser; run `npx playwright install chromium` once first |

## Play what your classmates are building

**On the same network.** Run `npm run dev:share` instead of `npm run dev`.
It prints a second address, labeled Network, such as
`http://192.168.1.23:5173/`. A classmate on the same Wi-Fi opens that
address, adds `#/m/` and the motivator (for example
`http://192.168.1.23:5173/#/m/chance`), and plays your minigame as you
change it. Stop the server with Ctrl+C when you are done; anyone on the
network can reach it while it runs. Some networks, including many campus and
public Wi-Fi networks, block one laptop from reaching another. If the
address does not load for your classmate, use the next option.

**From a pull request.** Any open pull request can run on your own machine:

```bash
gh pr list
gh pr checkout 12
npm install
npm run dev
```

Replace `12` with the number from `gh pr list`. Return to your own work
with `git switch -` (or `git switch your-github-username/short-topic`).

## Map of the repo

| Path | What it holds | Edit it? |
| --- | --- | --- |
| `content/player-motivations.md` | A copy of the course note. The motivator pages are built from it. | **Never.** The instructor updates it. |
| `content/games.json` | Every game, and the ties the note makes between games and motivators | Add a game when you propose a tie for it; never add or change a tie |
| `content/proposals.json` | Student readings: a game, a motivator, the mechanic and the dynamic | Yes |
| `content/videos.csv` | Playthrough videos, one row per video | Yes |
| `content/sources.csv` | Where a citation's link should go, when the bibliography's link is not the best one | Yes |
| `src/minigames/` | One folder per minigame, plus `src/minigames/registry.ts` | Yes, your own folder and one line in the registry |
| `src/minigames/_template/` | A tiny working minigame to copy | Copy it; do not edit it |
| `src/pages/` | The map, motivator pages, note and about pages | Yes, for look and interaction improvements |
| `src/content/` | Parsing and checking the content | Rarely; talk to the instructor first |
| `test/` | Tests. `npm test` runs them all. | Add tests for what you build |

## Things to make

### Add a playthrough video

1. Find a video on YouTube that shows the game being played. Longplays without
   commentary and official gameplay trailers work best.
2. Get its title and channel exactly as YouTube reports them by opening
   `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=VIDEO_ID`
   in your browser.
3. Add a row to `content/videos.csv`. The game must already be in
   `content/games.json`; use its `slug`. The columns are:

   | game | youtubeId | title | channel | start | watchFor |
   | --- | --- | --- | --- | --- | --- |
   | myst | VIDEO_ID | title from oEmbed | author_name from oEmbed | 95 | The first time the island's machinery responds to a switch |

   `start` (seconds) and `watchFor` (one line on where the motivator shows)
   are optional and make the video far more useful; leave a cell empty to
   skip it. The easiest way to edit the file is on GitHub: open
   `content/videos.csv`, choose the pencil icon, add your row, and propose
   the change, which opens a pull request. A spreadsheet works too (import
   the file, then download it as CSV). In a plain text editor, put any cell
   that contains a comma inside double quotes, and double any quote inside
   it: `"Tetris, the ""classic"""`.
4. Run `npm run check-videos` and `npm test`.

### Fix where a citation links

Every citation on the site links to its source. The link comes from the
course note's bibliography: a free copy of a paper if one exists, otherwise
the publisher, and for books a Columbia Libraries search. When you find a
better link (a direct e-book page in the library, a free copy the note does
not list), add a row to `content/sources.csv`:

| key | url | note |
| --- | --- | --- |
| Schell 2019 | https://… | Library e-book, chapter view |

`key` is the citation exactly as the site shows it ("Schell 2019",
"Salen and Zimmerman 2003", "Quantic Foundry reference sheet"). The row
changes only where that citation's link goes; what the note cites stays the
note's decision. `npm test` rejects a key the note never cites and a link
that is not a web address.

### Propose a tie (a student reading)

Pick a game you know well and a motivator the note does not attach it to.

1. If the game is new, add it to the `games` list in `content/games.json`:
   `{ "slug": "balatro", "title": "Balatro", "kind": "video game" }`.
   `kind` is `video game`, `tabletop` or `activity`. Do not touch the `ties`
   list; those come from the note.
2. Add your reading to `content/proposals.json`:

   ```json
   {
     "game": "balatro",
     "motivator": "chance",
     "mechanic": "Jokers that multiply each hand's score, drawn from a shop that restocks at random.",
     "dynamic": "Players push their luck on a build that might break or might snowball.",
     "github": "your-github-username"
   }
   ```

   The mechanic is a rule the designer built. The dynamic is what happens
   when players meet that rule. If you cannot name both, then you have a hunch;
   open the motivator's page and read its mechanics and dynamics for the
   vocabulary.
3. Run `npm test`. Motivator slugs are `challenge`, `competition`,
   `progress`, `discovery`, `fantasy`, `expression`, `fellowship`,
   `sensation`, `chance`, `submission` and `meaning`.

### Make a minigame

A minigame shows one motivator at work in something small enough to play in
a minute or two, with at least one mechanic the player can change. Pig, on
the Chance page, is the worked example: `src/minigames/pig/` has its
code, its rules engine and its README.

1. Copy the template into a folder named for your game (lowercase words
   joined by hyphens; `tug-of-war` here stands in for yours):

   ```bash
   cp -r src/minigames/_template src/minigames/tug-of-war
   ```

2. In `src/minigames/<your-slug>/index.ts`, rename the export, set
   `slug` to the folder name, set `title`, `motivators` and `author`, and
   build your game inside `mount`.
3. Fill in `src/minigames/<your-slug>/README.md`. The site shows your
   **Mechanic** section above the game as "How to play", so write it for a
   player: the goal, the controls, the rules, and what your toggle changes.
   **Dynamic**, **Aesthetic** and **Sources** (the note's items your game
   demonstrates, quoted with their citations) appear below the game under
   "What it demonstrates".
4. Add one line to `src/minigames/registry.ts`: import your game and add
   it to the `minigames` list.
5. Run `npm test`, then play it on its motivator's page.

**The contract** (a test checks it):

- `mount(el)` draws your game inside `el` and returns a function that
  removes everything it added. If you start a timer or listen on `window`
  or `document`, stop it in that function.
- At least one control carries a `data-mechanic` attribute naming the
  mechanic it changes. Showing that changing a mechanic changes the dynamic
  is the point of every minigame here.
- It works with a mouse, a touchscreen and a keyboard, and fits a phone
  screen.
- It makes no network calls and uses only art, sound and code you have the
  right to use. Credit anything you did not make in your README.
- It never scores what a player knows. This course has no quizzes; a
  minigame is a game.
- End by asking the player what they felt and whether changing a mechanic
  changed it. Pig's "Then check it against your own play" box is the
  example. The sources say what tends to emerge; the player's own account is
  the evidence that tests it.
- Put the rules in their own file with no DOM code (Pig's is
  `src/minigames/pig/game.ts`) and test them, so your agent can change
  the rules without breaking the page.

**Ideas, one per motivator, from the note's own mechanics and dynamics:**

| Motivator | Try this |
| --- | --- |
| Challenge | Difficulty that rises with the player's skill; toggle it against a fixed difficulty |
| Competition | A race against a bot with a catch-up rule that punishes the leader; toggle the rule |
| Progress | A reward schedule: fixed against variable; or goals within goals |
| Discovery | Hidden information revealed bit by bit; toggle a fog that hides the map |
| Fantasy | The same task framed two ways: an intrinsic fantasy against one laid on top |
| Expression | A tiny builder whose creation others can see; toggle constraints on the palette |
| Fellowship | A task one player cannot finish alone, for two people sharing one phone |
| Sensation | Escalation: something that speeds up as you succeed; toggle the speed-up |
| Chance | Pig is here; try a variable-ratio reward, or chance alternating with skill |
| Submission | Rhythmic repetition with no fail state; toggle a timer and feel the difference |
| Meaning | A shared counter that every action adds to; toggle whether the player can see it |

### Improve a page

Pages live in `src/pages/`, one TypeScript file and one stylesheet each.
Keep three things true: text that came from `proposals.json` or
`videos.csv` is set with `textContent` (the `h` helper in
`src/lib/dom.ts` does this for you) and never with `innerHTML`; colors
come from the tokens in `src/styles.css` so both light and dark modes
work; and every page fits a phone screen. `npm run e2e` checks the last
one.

## Working with your agent

- Start your agent in this folder so it reads this file.
- Ask it for a plan before code: which files it will touch, and how you will
  see the result.
- Keep a minigame inside its own folder. The only other file it needs is one
  line in `src/minigames/registry.ts`.
- Your agent must not edit `content/player-motivations.md`, the `ties`
  in `content/games.json`, or anyone else's minigame.
- Run `npm test` before every push. If a test fails, read its message; most
  name the file, the entry and the fix.
- Play what you built. Tests prove the contract. Only playing shows whether
  it is fun.

## Sending it in

1. Make a branch named `your-github-username/short-topic`:
   `git switch -c your-github-username/pig-variant`.
2. Commit, push, and open a pull request with `gh pr create`. Write a
   title, then choose to edit the body: it opens with the template, which
   asks which motivator, which mechanic, and what dynamic you saw.
3. CI runs the tests and the build. The instructor or a TA reviews and
   merges. You cannot push to `main` directly; that is on purpose.
4. Keep pull requests small: one video batch, one reading, or one minigame
   each.

## House rules

- Cite a source for any factual claim about a game, and quote the note
  exactly when you quote it.
- No secrets, API keys or personal data in the repository.
- Never add the course's PDFs or book scans. They are copyrighted.
- Credit outside code, art and sound in your minigame's README, with its
  license.
- Be kind and specific in reviews.
