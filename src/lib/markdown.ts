import { Marked, marked } from "marked";

/** Inline Markdown to HTML. Use only for the course note, never for student-edited files. */
export function inline(md: string): string {
  return marked.parseInline(md, { async: false }) as string;
}

/** Block Markdown to HTML. Use only for the course note. */
export function block(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Markdown from student-edited files: raw HTML shows as text, and links go only to web pages. */
const safe = new Marked({
  async: false,
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    link({ href, tokens }) {
      const label = this.parser.parseInline(tokens);
      if (!/^https?:\/\//i.test(href)) return label;
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${label}</a>`;
    },
    image({ text }) {
      return escapeHtml(text);
    },
  },
});

export function safeBlock(md: string): string {
  return safe.parse(md) as string;
}
