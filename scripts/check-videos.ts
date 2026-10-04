import { readFileSync } from "node:fs";
import { classifyOembed } from "../src/content/oembed.ts";
import { readVideos } from "../src/content/csv.ts";

const { videos, errors } = readVideos(readFileSync(new URL("../content/videos.csv", import.meta.url), "utf8"));
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
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
