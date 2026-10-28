import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { completeTask, milestone, TASKS, TASK_MS } from "./game";
import "./almost-there.css";

function mount(el: HTMLElement): () => void {
  let completed = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const toggle = h("input", { type: "checkbox", checked: true, "data-mechanic": "show-progress" });
  const count = h("p");
  const bar = h("progress", { max: TASKS, value: 0, "aria-label": "Parcels packed" });
  const message = h("p");
  const feedback = h("div", { "data-feedback": "", "aria-live": "polite" }, count, bar, message);
  const status = h("p", { role: "status" }, "Ready to pack.");
  const pack = h("button", { type: "button" }, "Pack parcel");
  const restart = h("button", { type: "button" }, "Play again");
  const reflection = h("div", {},
    h("p", {}, "What did you feel? Did showing or hiding progress change your urge to finish? Play again with the other setting and compare."),
    restart,
  );
  reflection.hidden = true;
  const root = h("div", { class: "almost-there" },
    h("label", {}, toggle, " Show Progress"), feedback, status, pack, reflection,
  );
  el.append(root);

  function render(): void {
    feedback.hidden = !toggle.checked;
    // Clear hidden feedback too, so it cannot announce progress in OFF mode.
    count.textContent = toggle.checked ? `${completed} of ${TASKS} parcels packed` : "";
    message.textContent = toggle.checked ? milestone(completed) : "";
    bar.value = completed;
    pack.setAttribute("aria-disabled", String(timer !== null || completed === TASKS));
    reflection.hidden = completed !== TASKS;
  }
  toggle.addEventListener("change", render);
  pack.addEventListener("click", () => {
    if (timer !== null || completed === TASKS) return;
    status.textContent = "Packing… please wait.";
    timer = setTimeout(() => {
      timer = null;
      completed = completeTask(completed);
      status.textContent = completed === TASKS ? "Finished!" : "Ready to pack.";
      render();
    }, TASK_MS);
    render();
  });
  restart.addEventListener("click", () => {
    completed = 0;
    status.textContent = "Ready to pack.";
    render();
    pack.focus();
  });
  render();
  return () => {
    if (timer !== null) clearTimeout(timer);
    root.remove();
  };
}

export const almostThere: Minigame = {
  slug: "almost-there",
  title: "Almost There",
  motivators: ["progress"],
  author: "avarose444",
  mount,
};
