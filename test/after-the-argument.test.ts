// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { afterTheArgument } from "../src/minigames/after-the-argument";
import { NOTES, presentNotes } from "../src/minigames/after-the-argument/game";

describe("After the Argument rules", () => {
  it("has three notes with no more than three messages each, dated Wednesday through Friday", () => {
    expect(NOTES.map((note) => note.day)).toEqual(["Wednesday", "Thursday", "Friday"]);
    expect(NOTES.every((note) => note.lines.length >= 2 && note.lines.length <= 3)).toBe(true);
  });

  it("keeps the notes shuffled and reveals dates and speakers without changing their order or dialogue", () => {
    const hidden = presentNotes(false);
    const revealed = presentNotes(true);
    const displayedNotes = [NOTES[2], NOTES[0], NOTES[1]];
    expect(hidden.map((note) => note.day)).toEqual([null, null, null]);
    expect(hidden.map((note) => note.lines[0].text)).toEqual(displayedNotes.map((note) => note.lines[0].text));
    expect(revealed.map((note) => note.day)).toEqual(["Friday", "Wednesday", "Thursday"]);
    expect(hidden.map((note) => note.lines)).toEqual(displayedNotes.map((note) => note.lines));
    expect(revealed.map((note) => note.lines)).toEqual(displayedNotes.map((note) => note.lines));
  });
});

describe("After the Argument interface", () => {
  it("starts without speaker or date labels and reveals context with the mechanic toggle", () => {
    const el = document.createElement("div");
    const unmount = afterTheArgument.mount(el);
    const displayedNotes = [NOTES[2], NOTES[0], NOTES[1]];
    const expectedSpeakers = displayedNotes.flatMap((note) => note.lines.map((line) => `${line.speaker}: `));
    expect(el.querySelectorAll(".argument-note")).toHaveLength(3);
    expect(el.querySelectorAll(".argument-line")).toHaveLength(displayedNotes.reduce((total, note) => total + note.lines.length, 0));
    expect([...el.querySelectorAll(".argument-note")].map((note) => note.querySelectorAll(".argument-line").length)).toEqual(displayedNotes.map((note) => note.lines.length));
    expect(el.querySelector(".argument-speaker")).toBeNull();
    expect(el.textContent).not.toContain("Wednesday");
    expect(el.querySelector(".argument-notes")!.textContent).not.toMatch(/Maya|Livy/);

    const toggle = el.querySelector<HTMLInputElement>("[data-mechanic='context-reveal']")!;
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change"));
    expect([...el.querySelectorAll(".argument-note-meta")].map((node) => node.textContent)).toEqual(["Friday", "Wednesday", "Thursday"]);
    expect([...el.querySelectorAll(".argument-speaker")].map((node) => node.textContent)).toEqual(expectedSpeakers);

    toggle.checked = false;
    toggle.dispatchEvent(new Event("change"));
    expect(el.querySelectorAll(".argument-note-meta")).toHaveLength(0);
    expect(el.querySelectorAll(".argument-speaker")).toHaveLength(0);
    unmount();
    expect(el.childNodes).toHaveLength(0);
  });

  it("has the required slug, Fantasy motivator, mechanic control, and reflection", () => {
    expect(afterTheArgument.slug).toBe("after-the-argument");
    expect(afterTheArgument.motivators).toContain("fantasy");
    const el = document.createElement("div");
    const unmount = afterTheArgument.mount(el);
    expect(el.querySelector("[data-mechanic='context-reveal']")).not.toBeNull();
    expect(el.textContent).toContain("Did revealing the context change the feeling");
    unmount();
  });
});
