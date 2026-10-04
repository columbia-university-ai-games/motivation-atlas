import type { Video } from "./types";

export interface OembedResult { ok: boolean; message: string }

export function classifyOembed(status: number, body: unknown, video: Video): OembedResult {
  if (status === 0) return { ok: false, message: "could not reach YouTube; check your connection and run again" };
  if (status === 400) return { ok: false, message: "YouTube says this is not a valid YouTube id" };
  if (status === 404) return { ok: false, message: "YouTube has no such video (404); check the id" };
  if (status === 401 || status === 403) return { ok: false, message: "the video's owner has disabled embedding; pick another video" };
  if (status !== 200) return { ok: false, message: `unexpected response ${status}` };
  const info = (body ?? {}) as { title?: string; author_name?: string };
  const notes: string[] = [];
  if (info.title !== video.title) notes.push(`title on YouTube is "${info.title}"`);
  if (info.author_name !== video.channel) notes.push(`channel on YouTube is "${info.author_name}"`);
  return { ok: true, message: notes.length ? `exists; update the file: ${notes.join("; ")}` : "exists and embeds" };
}
