import { pig } from "./pig";
import type { Minigame } from "./types";

/** One line per minigame. */
export const minigames: Minigame[] = [pig];

export function minigamesFor(motivator: string): Minigame[] {
  return minigames.filter((g) => g.motivators.includes(motivator));
}
