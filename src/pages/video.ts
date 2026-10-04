import type { Video } from "../content/types";
import { h } from "../lib/dom";

export function renderVideo(video: Video): HTMLElement {
  const thumb = h("img", { src: `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`, alt: "", loading: "lazy" });
  const play = h("button", { type: "button", class: "video-play", "aria-label": `Play: ${video.title}` }, thumb, h("span", { class: "video-play-icon" }, "Play"));
  const frame = h("div", { class: "video-frame" }, play);
  thumb.addEventListener("error", () => frame.replaceChildren(h("p", { class: "video-missing" }, "This video is unavailable.")));
  play.addEventListener("click", () => {
    const start = video.start ? `?start=${video.start}&autoplay=1` : "?autoplay=1";
    frame.replaceChildren(h("iframe", {
      src: `https://www.youtube-nocookie.com/embed/${video.youtubeId}${start}`,
      title: video.title, allow: "autoplay; encrypted-media; picture-in-picture", allowfullscreen: true, loading: "lazy",
    }));
  });
  return h("figure", { class: "video" },
    frame,
    h("figcaption", {},
      h("span", { class: "video-title" }, video.title),
      h("span", { class: "video-channel" }, video.channel),
      video.watchFor ? h("span", { class: "video-watch" }, `Watch for: ${video.watchFor}`) : null,
    ),
  );
}
