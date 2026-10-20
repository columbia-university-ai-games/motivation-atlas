# Type Circuit

Motivator: Competition over other people.

## Mechanic

Turn Competition on, enter your UNI, and type in the box. Your first character starts the clock and the opponent cars. The Reset button clears the passage and stops the race, ready for your next first character. Type the passage exactly, including punctuation and spaces. Backspace to fix mistakes. Pasting and dropping text are disabled. Finish the passage to save a time; only your fastest time counts. The leaderboard keeps at most 50 UNIs, ordered by best time.

Cars replay other players' best times at a constant pace, rather than reproducing their keystrokes, and the rows reorder as you overtake others. The same UNI's previous result is excluded from the opponents. 

Turn Competition off to type the same passage without a clock, car, rank, score, UNI, or saved result. Switch modes at any time to reset the passage. Compare how the same typing task feels with and without other people to beat. The ten-minute race limit does not apply to practice.

## Dynamic

When the playtester had the competition toggle on, they were intently focused on the game. They appeared stressed when making mistakes, often pounding the delete key quite hard. When they made a series of mistakes they reset. They also voluntarily replayed the game until they achieved the fastest time on the leaderboard. When they turned the toggle off, they were significantly slower and wanted to stop playing; I had to encourage them to keep going (for science).

## Aesthetic

The playtester felt like the competition mode was an actual game, with a lot of excitement when they topped the leaderboard. On the other hand, the "non-competitive" mode felt like a boring school assignment. The fact that there is no score in the non-competitive mode means there's zero satisfaction, since the activity of typing is not intrinsically fun, and it's too easy for there to be any sense of accomplishment.

## Sources

The note describes adversarial play with "clear feedback about who is winning" (Hunicke et al. 2004, p. 3) and rivalry among friends, "one-upping each other by winning more points and prizes" (Schell 2019, p. 157). It lists public high-score lists as a mechanic (Schell 2019, p. 232; Lazzaro 2004b, sec. 4c). The rankings and recorded opponents apply these mechanics without requiring simultaneous play.

All game code, visual elements, and the fixed passage were made for this minigame. No outside artwork, audio, or runtime libraries are used.

The game concept was inspired by TypeRacer, and the code was entirely implemented by Codex. Codex also wrote the "Mechanic" section of the README (although I cut out a couple paragraphs of yap).

Codex suggested making the leaderboard local, but I felt it was very important to have it hosted. Then Codex wanted to set up a Supabase database, which I felt was overkill, so I instructed it to use Cloudflare Workers. Finally, Codex put the leaderboard url as an env variable, but I changed it to be hardcoded since it is not sensitive and making everyone add an env variable would have been a pain.

## Shared leaderboard hosting

The game connects to `https://motivation-atlas-typing-race.motivation-atlas-typeracer.workers.dev` by default. Classmates can run the Atlas locally without creating an environment file. The included Cloudflare Worker persists one small JSON object containing best times and temporary race tickets. There is no database schema to manage and no API secret in the browser. The free Workers plan supports SQLite-backed Durable Objects; we use its key/value interface to store JSON.

1. Create a Cloudflare account. From this repository, run:

   ```sh
   npx wrangler login
   npx wrangler deploy --config src/minigames/typing-race/hosting/wrangler.jsonc
   ```

2. Local sites on `localhost`, `127.0.0.1`, or `[::1]` are automatically allowed on any port over HTTP or HTTPS. Classmates can use whichever local port Vite chooses. For a published Atlas, add its origin to `ALLOWED_ORIGINS` in `hosting/wrangler.jsonc`, separated by commas. Redeploy after changing it. An origin has no trailing slash or hash route.
3. The class Worker URL is already built into `leaderboard.ts`. Only if you deploy a different Worker, optionally override it in a root `.env.local` file:

   ```text
   VITE_TYPING_RACE_URL=https://motivation-atlas-typing-race.YOUR-SUBDOMAIN.workers.dev
   ```

4. Restart Vite after an override, or rebuild the published Atlas. The Competition page will say **Shared class leaderboard**. Share the Atlas URL, not the Worker API URL. For intentionally local-only play, set `VITE_TYPING_RACE_URL=` to an empty value; that mode stores times in localStorage and labels the board **on this device only**.

For a local backend rehearsal, run `npx wrangler dev --config src/minigames/typing-race/hosting/wrangler.jsonc` and set the URL to `http://localhost:8787`. Wrangler's development data is separate from the deployed leaderboard. Do not commit generated `.wrangler` files or actual student records.

The service accepts `GET /board`, `POST /start` with `{uni, passage: "atlas-race-1"}`, and `POST /finish` with `{id, text}`. It measures elapsed time on the server, verifies the submitted passage, expires race tickets after ten minutes, rejects implausibly short runs, and uses a storage transaction to merge simultaneous finishes. At most 100 active tickets and 50 best times are stored. The browser reads the board when the game opens or Refresh is selected; cars move locally with no per-keystroke traffic.

This is an honor-system classroom leaderboard: a UNI is not authentication, and scripted clients can fake typing or submit under another UNI. CORS is not authentication. For verified identities or stakes beyond a classroom activity, add institution login and a stronger result-verification design. Hosting account access is required to deploy; the repository alone does not create a live service.

Reference: [Cloudflare Durable Objects setup](https://developers.cloudflare.com/durable-objects/get-started/), [storage API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/), and [Workers pricing and free-plan limits](https://developers.cloudflare.com/workers/platform/pricing/).
