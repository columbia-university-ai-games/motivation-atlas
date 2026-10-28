// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { almostThere } from "../src/minigames/almost-there";
import { completeTask, milestone, TASK_MS } from "../src/minigames/almost-there/game";

afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });

it("finishes exactly ten tasks and provides milestones", () => {
  let completed = 0;
  for (let i = 0; i < 12; i++) completed = completeTask(completed);
  expect(completed).toBe(10);
  expect([2, 5, 8, 10].map(milestone)).toEqual([
    "A good start!", "Halfway there!", "Almost there!", "All packed!",
  ]);
});

it.each([true, false])("keeps all ten tasks and timing identical with feedback %s", (show) => {
  vi.useFakeTimers();
  const el = document.createElement("div");
  document.body.append(el);
  const unmount = almostThere.mount(el);
  const toggle = el.querySelector("input")!;
  expect(el.querySelectorAll("input")).toHaveLength(1);
  expect(toggle.parentElement!.textContent).toBe(" Show Progress");
  if (!show) toggle.click();
  const feedback = el.querySelector<HTMLElement>("[data-feedback]")!;
  const pack = el.querySelector("button")!;
  for (let i = 0; i < 10; i++) {
    pack.click();
    pack.click(); // Cannot speed up packing with extra presses.
    vi.advanceTimersByTime(TASK_MS - 1);
    expect(el.querySelector("[role=status]")!.textContent).toContain("Packing");
    vi.advanceTimersByTime(1);
    expect(feedback.hidden).toBe(!show);
    if (show) expect(feedback.textContent).toContain(`${i + 1} of 10`);
    else expect(feedback.textContent).toBe("");
  }
  expect(el.querySelector("[role=status]")!.textContent).toBe("Finished!");
  pack.click();
  expect(vi.getTimerCount()).toBe(0);
  el.querySelectorAll("button")[1].click();
  expect(el.querySelector("[role=status]")!.textContent).toBe("Ready to pack.");
  vi.advanceTimersByTime(0); // Flush the focus event queued by jsdom after replay.
  pack.click();
  toggle.click(); // Mid-task toggling neither restarts nor cancels the task.
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(TASK_MS);
  toggle.checked = true;
  toggle.dispatchEvent(new Event("change"));
  expect(feedback.textContent).toContain("1 of 10");
  pack.click();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(el.childNodes).toHaveLength(0);
});
