import type { PigOptions } from "./game";

/** Items quoted verbatim from the Chance section of the note; a test checks each one. */
export const SOURCES = {
  pushYourLuck: "Pushing your luck, as in the dice game Pig, \"astonishingly simple, strategically deep, and increasingly dramatic\" (Salen and Zimmerman 2003, ch. 15, \"Pig\").",
  reversals: "Reversals of fortune, as the chutes and ladders of Chutes and Ladders produce (Salen and Zimmerman 2003, ch. 15, \"Chance and Game Play\").",
  alternating: "Chance alternating with skill, \"an alternating pattern of tension and relaxation\" (Schell 2019, p. 225).",
  variable: "Variable rewards: a one-in-three chance of thirty points \"stays rewarding for a much longer time\" than ten points every time, though the average is the same (Schell 2019, p. 233).",
} as const;

export function dynamicsFor(options: PigOptions): string[] {
  const out: string[] = [];
  if (options.pushYourLuck) out.push(SOURCES.pushYourLuck, SOURCES.alternating);
  else out.push("With one roll per turn there is no decision left. The game is pure chance, and pushing your luck is gone.");
  if (options.reward === "face") out.push(SOURCES.variable);
  else out.push("Every safe roll pays 4. The average matches the die's, but the swings are smaller. Compare how it feels with the die's face.");
  out.push(SOURCES.reversals);
  return out;
}
