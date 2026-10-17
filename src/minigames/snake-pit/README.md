# Snake Pit: Escape the Burrow

Motivator: Challenge and mastery. Author: jianyangg.

## Mechanic

Collect six eggs and reach the exit. Up to two are visible; new eggs wait for the tail to clear their nest. Only the head collects eggs. Use arrows, WASD, or mouse/touch buttons. No reversing; walls and body contact end the round. **Space/Pause** pauses; **Restart** resets. A **3× hint** demonstrates an escape.

Each egg queues 18 length segments in both modes. **Width growth ON** adds 0.3 cells per egg (0.6–2.4), closing shortcuts after two eggs; **OFF** stays at 0.6. Other rules stay identical.

## Dynamic

With ON, the player collected three eggs but did not escape. Their body and tail ran alongside each other, leaving too little room to reach the next egg. Closed shortcuts forced wider routes. They made decisions more carefully and planned turns ahead. With OFF, they collected all six eggs easily and escaped. They mainly used WASD and found the hint helpful. Rounds took about 1.5 minutes.

## Aesthetic

ON felt fun and easy to play, with enough challenge to make improvement feel achievable. They wanted to try again. OFF felt simpler, less challenging, and less fun.

## Sources

Course note, Challenge and mastery:

> Clear goals, the possibility of failure, and immediate feedback (Lazzaro 2004b, sec. 2b).

Classic Snake inspired eating, length growth, and body avoidance. I designed the width-growth mechanic: eggs make the snake wider and close narrow shortcuts. Codex helped with implementation and tests. I kept its suggestion to use a few rock clusters instead of a full maze. The template and DOM helpers are from this repository. No outside code, art, or audio was borrowed.
