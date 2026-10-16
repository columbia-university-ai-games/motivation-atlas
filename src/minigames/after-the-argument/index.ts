import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { presentNotes } from "./game";
import "./notes.css";

function mount(el: HTMLElement): () => void {
  const reveal = h("input", { type: "checkbox", "data-mechanic": "context-reveal" });
  const notes = h("div", { class: "argument-notes", "aria-live": "polite" });

  function render(): void {
    notes.replaceChildren(...presentNotes(reveal.checked).map((note, index) => {
      const label = note.day ? h("p", { class: "argument-note-meta" }, note.day) : null;
      const paragraphs = note.lines.map((line) => h("p", { class: "argument-line" },
        ...(reveal.checked ? [h("span", { class: "argument-speaker" }, `${line.speaker}: `)] : []),
        line.text,
      ));
      return h("article", { class: "argument-note", "aria-label": note.day ? `${note.day} conversation` : `Conversation ${index + 1}` },
        label,
        ...paragraphs,
      );
    }));
  }

  reveal.addEventListener("change", render);
  const root = h("div", { class: "after-argument" },
    h("p", { class: "argument-intro" }, "Three notes from a couple's week. Read them, then reveal the context."),
    h("label", { class: "argument-toggle" }, reveal, " Show dates and who wrote each line"),
    notes,
    h("section", { class: "argument-reflect" },
      h("h4", {}, "Then check it against your own reading"),
      h("ul", {},
        h("li", {}, "What did you think the disagreement was about before the context appeared?"),
        h("li", {}, "After seeing the dates and names, what changed in your reading of the two people?"),
        h("li", {}, "Did revealing the context change the feeling of the story for you? Did it change your perception of their relationship?"),
      ),
    ),
  );
  el.append(root);
  render();
  return () => root.remove();
}

export const afterTheArgument: Minigame = {
  slug: "after-the-argument",
  title: "After the Argument",
  motivators: ["fantasy"],
  author: "erica-ll",
  mount,
};
