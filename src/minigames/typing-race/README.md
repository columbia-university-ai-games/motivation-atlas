# Type Circuit

Motivator: Competition over other people. Author: ZevMM.

## Mechanic

Turn Competition on and type in the box. Your first character starts the clock and the opponent cars. The Reset button clears the passage and stops the race, ready for your next first character. Type the passage exactly, including punctuation and spaces. Backspace to fix mistakes. Pasting and dropping text are disabled. Finish the passage to save a time; only your fastest time counts.

The leaderboard shows how you stack up against other players: 50 WPM average adult, ZevMM at 80 WPM, Prof. Garakani at 110 WPM, and Ivan at 140 WPM. Your personal best also becomes a time to beat.

Turn Competition off to type the same passage without a clock, car, rank, score, or saved result. Switch modes at any time to reset the passage. Compare how the same typing task feels with and without other people to beat. The ten-minute race limit does not apply to practice.

The observations below are from the original prototype playtest, before the shared board was replaced with local preset targets.

## Dynamic

When the playtester had the competition toggle on, they were intently focused on the game. They appeared stressed when making mistakes, often pounding the delete key quite hard. When they made a series of mistakes they reset. They also voluntarily replayed the game until they achieved the fastest time on the leaderboard. When they turned the toggle off, they were significantly slower and wanted to stop playing; I had to encourage them to keep going (for science).

## Aesthetic

The playtester felt like the competition mode was an actual game, with a lot of excitement when they topped the leaderboard. On the other hand, the "non-competitive" mode felt like a boring school assignment. The fact that there is no score in the non-competitive mode means there's zero satisfaction, since the activity of typing is not intrinsically fun, and it's too easy for there to be any sense of accomplishment.

## Sources

The note describes adversarial play with "clear feedback about who is winning" (Hunicke et al. 2004, p. 3) and rivalry among friends, "one-upping each other by winning more points and prizes" (Schell 2019, p. 157). It lists public high-score lists as a mechanic (Schell 2019, p. 232; Lazzaro 2004b, sec. 4c). The rankings and preset opponents apply these mechanics without requiring simultaneous play.

All game code, visual elements, and the fixed passage were made for this minigame. No outside artwork, audio, or runtime libraries are used.

The game concept was inspired by TypeRacer, and the code was entirely implemented by Codex. Codex also wrote the "Mechanic" section of the README (although I cut out a couple paragraphs of yap).

Codex suggested making the leaderboard local, but I felt it was very important to have it hosted. Then Codex wanted to set up a Supabase database, which I felt was overkill, so I instructed it to use Cloudflare Workers. Finally, Codex put the leaderboard url as an env variable, but I changed it to be hardcoded since it is not sensitive and making everyone add an env variable would have been a pain.

Following instructor feedback, the shared leaderboard and all network code were removed. The minigame now uses preset paces and an optional local personal best; it collects no identifiers and requires no hosting or environment configuration.
