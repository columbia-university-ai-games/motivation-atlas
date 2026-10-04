/** How a source came to name a game, following the note's section on attribution. */
export type Evidence = "illustration" | "study" | "statistic";

export const EVIDENCE: Record<Evidence, { label: string; explain: string }> = {
  illustration: {
    label: "chosen to illustrate",
    explain: "The author picked this game as an example of the idea.",
  },
  study: {
    label: "used in a study",
    explain: "Researchers used this game, or asked its players, in a study of motivation.",
  },
  statistic: {
    label: "favored by high scorers",
    explain:
      "Players who score high on this motivation favor the game more than others do. That is an association: it says who likes the game, not why.",
  },
};

// Matched against the start of each citation. Order matters only for readability.
const SOURCES: Array<[RegExp, Evidence]> = [
  [/^Yee 2015/, "statistic"],
  [/^(Ryan et al\. 2006|Przybylski et al\. 2010|Malone 19|Anto et al\. 2024)/, "study"],
  [/^(Schell|McGonigal|Salen and Zimmerman|Lazzaro|Hunicke et al\.|Quantic Foundry reference sheet|Juul|Caillois)/, "illustration"],
];

/** The kinds of evidence behind a tie's citation, each listed once, in the order above. */
export function evidenceFor(cite: string): Evidence[] {
  const found = new Set<Evidence>();
  for (const part of cite.split(";").map((p) => p.trim())) {
    const match = SOURCES.find(([pattern]) => pattern.test(part));
    if (match) found.add(match[1]);
  }
  return (["illustration", "study", "statistic"] as Evidence[]).filter((e) => found.has(e));
}
