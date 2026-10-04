import { h } from "../lib/dom";
import "./text-pages.css";

export function renderAbout(root: HTMLElement): () => void {
  const page = h("article", { class: "page prose" },
    h("h1", {}, "About the Atlas"),
    h("p", {}, "The Atlas is built from the course note on player motivation. Each of its eleven motivators is described in the three layers of the MDA framework: the mechanics a designer builds, the dynamics that emerge while those rules run, and the aesthetic the player feels."),
    h("h2", {}, "Eleven groups, one synthesis"),
    h("p", {}, "No single study found eleven motivators. The note gathers what Bartle, Yee, Quantic Foundry, Lazzaro, self-determination theory, MDA, Caillois, Malone and others describe, and groups their categories where they overlap. The boundaries are the note's choice, and they blur. A game under a motivator does not tell you why any one player plays it: people mix motives, and the same person wants different things on different days. Treat each motivator as a question to ask about a play session, not a label for a player."),
    h("h2", {}, "How each source chose its games"),
    h("p", {}, "Every tie carries a label for how its source came to name the game:"),
    h("ul", {},
      h("li", {}, h("strong", {}, "chosen to illustrate: "), "an author picked the game as an example of the idea (Schell, McGonigal, Rules of Play, Lazzaro, the MDA paper, the Quantic Foundry reference sheet, Juul, Caillois)."),
      h("li", {}, h("strong", {}, "used in a study: "), "researchers used the game, or asked its players, in a study of motivation (Ryan, Rigby and Przybylski; Malone; Anto and colleagues)."),
      h("li", {}, h("strong", {}, "favored by high scorers: "), "players who score high on the motivation favor the game more than others do (Yee 2015). That is an association: it says who likes the game, not which mechanic draws them."),
    ),
    h("h2", {}, "Sourced and proposed"),
    h("p", {}, "A solid line from a game to a motivator means a cited source ties them together, and the game card names that source. The note's rule holds here: a game appears under a motivator only when a source attaches it there. A dashed line is a student reading: a classmate's argument, naming the mechanic and the dynamic that carry the motivator. Read those as hypotheses to test, the way your playtests treat intended motivations."),
    h("h2", {}, "Reading the citations"),
    h("p", {}, "Citations give author and year; the full bibliography is at the end of the note. Rules of Play and Reality Is Broken are cited by chapter because their print and ebook page numbers differ."),
    h("h2", {}, "Adding to it"),
    h("p", {}, "Everything here is files in the repository: videos, student readings and minigames. AGENTS.md at the top of the repository explains how to add each one and send it in as a pull request."),
    h("p", {}, h("a", { href: "#/note" }, "Read the note"), " or ", h("a", { href: "#/" }, "go back to the map"), "."),
  );
  root.replaceChildren(page);
  return () => page.remove();
}
