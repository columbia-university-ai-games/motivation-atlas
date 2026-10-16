export interface ConversationLine {
  speaker: "Maya" | "Livy";
  text: string;
}

export interface StickyNote {
  day: "Wednesday" | "Thursday" | "Friday";
  lines: ConversationLine[];
}

export const NOTES: StickyNote[] = [
  {
    day: "Wednesday",
    lines: [
      { speaker: "Maya", text: "Are you still coming to my parents' dinner Saturday? I told Mum we'd both be there." },
      { speaker: "Livy", text: "I said maybe. I don't want you telling them I promised when I haven't decided." },
    ],
  },
  {
    day: "Thursday",
    lines: [
      { speaker: "Livy", text: "I should've answered before you had to explain the change to your parents." },
      { speaker: "Maya", text: "I wasn't upset that you felt unsure. I was hurt that I had to explain it alone." },
      { speaker: "Livy", text: "I get that. I'm sorry I got defensive." },
    ],
  },
  {
    day: "Friday",
    lines: [
      { speaker: "Maya", text: "Would you still want our Friday dinner tonight, just us? Our pizza night routine?" },
      { speaker: "Livy", text: "Yes, I'd love that. Let's also talk about tomorrow when we meet, like not over text." },
    ],
  },
];

export interface NoteView {
  day: StickyNote["day"] | null;
  lines: ConversationLine[];
}

/** The toggle changes how much context accompanies the same three conversations. */
export function presentNotes(revealContext: boolean): NoteView[] {
  const displayedNotes = [NOTES[2], NOTES[0], NOTES[1]];
  return displayedNotes.map((note) => ({
    day: revealContext ? note.day : null,
    lines: note.lines,
  }));
}
