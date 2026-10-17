import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { COPY } from "./text";

function mount(el: HTMLElement): () => void {
  const mortality = h("input", { type: "checkbox", checked: true, "data-mechanic": "mortality", "data-testid": "mortality" });
  const hint = h("p", { "aria-live": "polite" }, COPY.mortalityOn);
  const updateHint = () => { hint.textContent = mortality.checked ? COPY.mortalityOn : COPY.mortalityOff; };
  mortality.addEventListener("change", updateHint);
  const root = h("section", { "data-state": "menu", "data-testid": "any-given-morning", "aria-label": COPY.title },
    h("h3", {}, COPY.title),
    h("p", {}, COPY.subtitle),
    h("label", { style: "display:flex;align-items:center;gap:0.5rem;min-height:44px" }, mortality, COPY.mortality),
    hint,
    h("button", { type: "button", "data-testid": "start", style: "min-height:44px;min-width:44px" }, COPY.start),
    h("p", {}, COPY.controls),
    h("p", {}, COPY.placeholder),
  );
  el.append(root);
  return () => {
    mortality.removeEventListener("change", updateHint);
    root.remove();
  };
}

export const anyGivenMorning: Minigame = {
  slug: "any-given-morning", title: COPY.title, motivators: ["meaning"], author: "NICOH-YAY", mount,
};
