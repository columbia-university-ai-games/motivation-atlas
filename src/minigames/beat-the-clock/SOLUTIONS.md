# Deterministic shot witnesses

Authoritative values are in `solutions.json` (full precision). These are
feasible examples, not prescribed player strategies or a claim of optimal play.
`test/beat-the-clock.test.ts` replays every witness through the unmodified
production physics and scoring rules: chosen target pocketed, cue ball not
pocketed, correct points, and motion settled within six simulated seconds.

Angles are radians from the positive x axis; positive y points down the table.
Power is the slider percentage. A pull of `8 + 1.02 * power` table units in
the direction opposite the angle produces the same launch parameters.

| Level | Target | Angle (rad, rounded) | Power | Settle (s) | Route banks | Cut (degrees) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | easy | -2.626043646 | 35 | 1.0167 | 0 | 0.00 |
| 1 | hard | 0.515549007 | 35 | 1.0167 | 0 | 0.00 |
| 2 | easy | -1.028521992 | 35 | 1.5792 | 0 | 20.54 |
| 2 | hard | 0.209409257 | 35 | 1.3042 | 0 | 1.34 |
| 3 | easy | -1.843301657 | 35 | 2.1417 | 0 | 34.34 |
| 3 | hard | 0.020304964 | 95 | 3.1792 | 0 | 26.51 |
| 4 | easy | 2.152258500 | 35 | 1.9542 | 0 | 27.47 |
| 4 | hard | 0.068016698 | 35 | 2.6292 | 0 | 44.77 |
| 5 | easy | -1.953176801 | 35 | 2.0417 | 0 | 34.51 |
| 5 | hard | 0.371963049 | 35 | 1.5792 | 0 | 2.80 |
| 6 | easy | 2.851682357 | 65 | 2.2083 | 2 | 21.77 |
| 6 | hard | -1.570796327 | 35 | 0.6917 | 0 | 0.00 |
| 7 | easy | 2.816642772 | 35 | 0.9375 | 0 | 12.23 |
| 7 | hard | -0.247469944 | 75 | 2.3542 | 1 | 16.92 |
| 8 | easy | -2.599549979 | 35 | 0.9625 | 0 | 3.78 |
| 8 | hard | 0.095983477 | 75 | 2.6042 | 1 | 23.91 |

A route bank counts a cue-ball cushion rebound **before the target first
moves**, or a target-ball cushion rebound before it is pocketed. Cue-ball
rebounds after target contact do not establish a bank route. The separate
`cushionContacts` field includes these incidental contacts. Bank witnesses
for both advanced Hard targets are verified; this does not prove a bank is
the only possible solution.

The cut angle is measured between the cue-ball velocity and the line of
centers immediately before the first direct cue-to-target contact. It is
a discrete-step approximation, not a human difficulty score. It is null
when that measurement cannot be established (for example, an indirect
collision). Tests recompute the measurements, rather than trusting labels.

Each recorded shot also succeeds at angle offsets of ±0.003 radians
(about 0.17 degrees), separately at power offsets of ±1. These finite probes
are verified independently; they are not a guarantee for every combination
of angle and power errors, nor proof that touch aiming is easy.

Level 1 has straight witnesses; level 2 has angled routes; levels 3–4 have
Hard-target cut contacts above 25 degrees. Levels 5–8 add one or two movable
obstacles, including a narrow channel and screened sight lines. Those are
observable structural differences. A monotonic progression in human
difficulty has **not** been measured. Another human playtest is required.

Fixed-step physics, pocket sizes, power mapping, friction, scoring, and
layouts are identical with the clock ON and OFF. Only the deadline differs.
