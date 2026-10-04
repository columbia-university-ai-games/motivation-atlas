import { EVIDENCE, evidenceFor } from "../content/evidence";
import { h } from "../lib/dom";

/** Small labels saying how each source behind a citation chose the game; hover or focus explains. */
export function evidenceTags(cite: string): HTMLElement[] {
  return evidenceFor(cite).map((kind) =>
    h("span", { class: `evidence ${kind}`, title: EVIDENCE[kind].explain, tabindex: 0 }, EVIDENCE[kind].label));
}
