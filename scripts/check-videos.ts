import { readFileSync } from "node:fs";
import { classifyOembed } from "../src/content/oembed.ts";
import type { Video } from "../src/content/types.ts";

const videos: Video[] = JSON.parse(readFileSync(new URL("../content/videos.json", import.meta.url), "utf8"));
let failed = 0;

for (const video of videos) {
  const watch = `https://www.youtube.com/watch?v=${video.youtubeId}`;
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`;
  let status = 0;
  let body: unknown = null;
  try {
    const res = await fetch(url);
    status = res.status;
    if (res.ok) body = await res.json();
  } catch {
    status = 0;
  }
  const result = classifyOembed(status, body, video);
  console.log(`${result.ok ? "ok  " : "FAIL"}  ${video.game}  ${video.youtubeId}  ${result.message}`);
  if (!result.ok) failed++;
}

if (failed) {
  console.error(`\n${failed} of ${videos.length} videos failed.`);
  process.exit(1);
}
console.log(`\nAll ${videos.length} videos exist and embed.`);
