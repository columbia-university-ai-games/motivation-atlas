# Speed Up: escalation

Motivator: Sensation. Author: SM5858.

## Mechanic

One cell of the 3×3 grid lights up. Tap it (or press its key, 1 to 9) before it goes dark. A miss or a wrong tap costs one of three lives. The round ends after 60 seconds or when your lives run out.

The toggle, applied when you press **Start**:

- **Escalation on:** each hit shortens how long the next target stays lit, from 1.2 seconds down to 0.4.
- **Escalation off:** every target stays lit for 1.2 seconds.

## Dynamic

Player A, a playtester, tried both. With escalation on, they scored about 15 hits and lost all three lives in almost every round, within about 20 seconds. They used the number keys and found that harder than expected. With it off, they scored about 80 and lasted the full 60 seconds, got bored and tapped carelessly, then focused again in the last ten seconds to raise their score.

## Aesthetic

Player A called escalation on "challenging" and off "too easy." The note names thrill as Sensation's feeling; Player A described something closer to the time pressure it lists under Challenge (Hunicke et al. 2004, p. 3), so escalation here sits between the two motivators.

## Sources

Quoted from the note's Sensation section:

- Escalation: invaders that speed up as you destroy them (Schell 2019, p. 56), or missiles raining down until you lose (Salen and Zimmerman 2003, ch. 24, "The Role of the Goal").

Claude Code (Anthropic) drafted the code, test and README wording from my design and playtest notes. One suggestion I changed: its first curve (×0.93 per hit, down to 0.35 s) ended a test round in under 8 seconds, so I kept a gentler one (×0.98, down to 0.4 s). Structure and styles follow the Atlas template and Pig; no outside art, sound or code.
