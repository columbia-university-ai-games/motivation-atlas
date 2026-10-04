import { marked } from "marked";

/** Inline Markdown to HTML. Use only for the course note, never for student-edited files. */
export function inline(md: string): string {
  return marked.parseInline(md, { async: false }) as string;
}

/** Block Markdown to HTML. Use only for the course note. */
export function block(md: string): string {
  return marked.parse(md, { async: false }) as string;
}
