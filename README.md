# Motivation Atlas

An interactive map of why people play, built from the course note for AI in
Practice: Game Design and Development (Columbia, Fall 2026). Eleven player
motivators, the games the sources tie to each, playthrough videos, and
minigames that show mechanics turning into dynamics and feelings.

```bash
npm install
npm run dev
```

Everything you need to run it and add to it is in [AGENTS.md](AGENTS.md).

## Current coverage

Snapshot as of October 4, 2026. Counts come from the repository's content files
and minigame registry; update this snapshot when adding content.

| Item | Count |
| --- | --- |
| Player motivators | 11 |
| Game and activity examples | 91: 73 video games, 5 tabletop games, 13 activities |
| Cited game–motivator connections | 105 distinct connections across 107 citation records |
| Embedded videos | 94 |
| Examples with at least one video | 91 of 91 (100%) |
| Videos with a “Watch for” prompt | 16 of 94 |
| Videos with a start timestamp | 0 of 94 |
| Playable minigames | 1: Pig on the Chance page |
| Motivators with a playable minigame | 1 of 11 |
| Student readings | 0 |

All 94 videos passed the YouTube existence and embedding check for this
snapshot. Activity examples use demonstrations, matches or performances;
not every video is a full playthrough. Availability can change, so run
`npm run check-videos` to check it again.

The videos are watchable inside the Atlas. The example games themselves are
not all playable here: Pig is the current interactive demonstration.
Next opportunities are original minigames for the other ten motivators,
more “Watch for” prompts and useful start timestamps. See
[AGENTS.md](AGENTS.md) for contribution instructions.
