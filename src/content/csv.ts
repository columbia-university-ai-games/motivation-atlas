import type { Video } from "./types";

export interface CsvResult { rows: Record<string, string>[]; errors: string[] }

/** Read a CSV file (RFC 4180: quoted cells, doubled quotes, any line ending) into records keyed by header. */
export function parseCsv(text: string): CsvResult {
  const errors: string[] = [];
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); records.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (quoted) errors.push(`row ${records.length + 1} has an unclosed quote`);
  if (cell !== "" || row.length) { row.push(cell); records.push(row); }

  const nonEmpty = records.map((r, index) => ({ r, line: index + 1 })).filter(({ r }) => !(r.length === 1 && r[0].trim() === ""));
  if (!nonEmpty.length) return { rows: [], errors };
  const header = nonEmpty[0].r.map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (const { r, line } of nonEmpty.slice(1)) {
    if (r.length !== header.length) {
      errors.push(`row ${line} has ${r.length} cells; the header has ${header.length}`);
      continue;
    }
    rows.push(Object.fromEntries(header.map((name, k) => [name, r[k].trim()])));
  }
  return { rows, errors };
}

function missingColumns(file: string, text: string, required: string[]): string[] {
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/).find((l) => l.trim()) ?? "";
  const have = new Set(firstLine.split(",").map((h) => h.trim()));
  const missing = required.filter((c) => !have.has(c));
  return missing.length ? [`${file}: the header needs the columns ${missing.join(", ")}`] : [];
}

/** content/videos.csv: game, youtubeId, title, channel, start (seconds, optional), watchFor (optional). */
export function readVideos(text: string): { videos: Video[]; errors: string[] } {
  const missing = missingColumns("content/videos.csv", text, ["game", "youtubeId", "title", "channel"]);
  if (missing.length) return { videos: [], errors: missing };
  const { rows, errors } = parseCsv(text);
  const videos = rows.map((r) => {
    const video: Video = { game: r.game, youtubeId: r.youtubeId, title: r.title, channel: r.channel };
    if (r.start) video.start = /^\d+$/.test(r.start) ? Number(r.start) : Number.NaN;
    if (r.watchFor) video.watchFor = r.watchFor;
    return video;
  });
  return { videos, errors: errors.map((e) => `content/videos.csv: ${e}`) };
}

export interface SourceLink { key: string; url: string; note: string }

/** content/sources.csv: key (a citation as the note writes it), url, note (optional, for the team). */
export function readSources(text: string): { sources: SourceLink[]; errors: string[] } {
  const missing = missingColumns("content/sources.csv", text, ["key", "url"]);
  if (missing.length) return { sources: [], errors: missing };
  const { rows, errors } = parseCsv(text);
  return {
    sources: rows.map((r) => ({ key: r.key, url: r.url, note: r.note ?? "" })),
    errors: errors.map((e) => `content/sources.csv: ${e}`),
  };
}
