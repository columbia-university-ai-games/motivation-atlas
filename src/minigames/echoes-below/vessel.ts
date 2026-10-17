import { s } from "../../lib/dom";

const path = (d: string, fill: string, stroke = "#b7d4d0", width = 1) => s("path", { d, fill, stroke, "stroke-width": width, "stroke-linejoin": "round", "stroke-linecap": "round" });

/** Four complete silhouettes. Retained groups crossfade when the hull evolves. */
export function vesselForm(tier: number, uid: string): SVGGElement {
  const g = s("g", { class: "eb-vessel-form", "data-vessel-form": tier, opacity: tier === 0 ? 1 : 0 });
  const gold = `url(#${uid}-hull)`, silver = `url(#${uid}-titanium)`, dark = "#193a49";
  const glow = tier > 1 ? "#bcb6ff" : "#b9f1df";
  g.append(s("ellipse", { cy: 10, rx: 36 + tier * 7, ry: 16 + tier * 4, fill: "#020e1c", opacity: .55 }));
  if (tier === 0) {
    g.append(path("M-24-12-36-21-31 0-36 21-24 12M-12-13-7-25H5L10-13", "#687f7c", "#c0c9a7"),
      path("M-29-13H14C40-13 43 12 15 15H-25Q-34 6-29-13Z", gold, "#f7e9b5", 1.1),
      path("M-26 8H17M-25-8H16M-19-12V12", "none", "#9b8d64"),
      path("M-4-18V-29H9M8-29V-25", "none", "#c4d1bb", 1.6),
      path("M-36-10V10M-41-6V6", "none", "#86bcb6", 2));
  } else if (tier === 1) {
    g.append(path("M-25-8-39-29-16-25 9-13M-25 8-39 29-16 25 9 13", silver, "#91b9b9"),
      path("M-34-24H-7L3-18-7-13H-34ZM-34 13H-7L3 18-7 24H-34Z", dark, "#a2cec7"),
      path("M-30-15 19-14Q49-2 21 16H-30L-36 0Z", gold, "#f5e8c2", 1.2),
      path("M-24-12-11-18H12L24-10M-24 12-12 18H14L24 10", "#5b7b80", "#b3cec4"),
      path("M-12-18V-29H3L8-23M-29-11V11M-22-12V12", "none", "#cbdfc7"),
      path("M-34-22H-20M-34 22H-20", "none", glow, 2.3));
  } else if (tier === 2) {
    g.append(path("M-30-9-43-37-15-32 15-14 37-8M-30 9-43 37-15 32 15 14 37 8", silver, "#9bc7d0", 1.2),
      path("M-36-30-15-27 2-17-21-18ZM-36 30-15 27 2 17-21 18Z", dark, "#557c94"),
      path("M-40-29H-12L2-22-12-16H-40ZM-40 16H-12L2 22-12 29H-40Z", "#315466", "#b0d5d8"),
      path("M-30-17H17L43-5 46 2 21 17H-30L-38 0Z", silver, "#d6e5d9", 1.3),
      path("M-23-12H14L33-5 18 8H-24Z", gold, "#e3dab0"),
      path("M-13-17-7-29H7L17-17M-28-15V15", "#233b4d", "#adc8ce"),
      path("M-38-24H-18M-38 24H-18M-23 12H15", "none", glow, 1.8));
  } else {
    g.append(path("M-30-10-49-42-22-37 12-20 44-9 58 0 44 9 12 20-22 37-49 42-30 10Z", silver, "#a9c9df", 1.3),
      path("M-44-35-23-30 3-17-21-20ZM-44 35-23 30 3 17-21 20Z", "#253549", "#657d9f"),
      path("M-43-30H-13L9-20-12-15H-43ZM-43 15H-13L9 20-13 30H-43Z", "#40556c", "#c7d9e3"),
      path("M-35-15-11-23H16L42-10 51 0 33 15 5 21-34 14-42 0Z", silver, "#dde8ea", 1.4),
      path("M-23-12H17L38-4 23 9H-23Z", "#284456", "#c3d2d2"),
      path("M-15-19-6-31H12L24-17M-34-13V13", "#5b6985", "#c2d1dd"),
      path("M-39-25H-16M-39 25H-16M-27-17-10-20M-27 17-10 20M15 15 34 8", "none", glow, 1.9),
      s("circle", { cx: -19, r: 8, fill: "#7286af", stroke: "#e4e3ff", "stroke-width": 1 }),
      s("circle", { cx: -19, r: 4, fill: "#d1c8ff", class: "eb-reactor" }));
  }
  const windows = tier === 0 ? [-8, 9, 24] : tier === 1 ? [-7, 9, 26] : [1, 16, 31];
  for (const [i, cx] of windows.entries()) g.append(s("ellipse", { cx, rx: i === 2 ? 4 : 5.5, ry: i === 2 ? 4 : 6, fill: "#103143", stroke: tier < 2 ? "#fff0bd" : "#b5dce5", "stroke-width": 1.5 }), path(`M${cx - 2}-3h3`, "none", glow, 1.3));
  for (let i = 0; i < 3; i++) g.append(path(`M${-25 + i * 4}-7v4M${-25 + i * 4} 3v4`, "none", "#59716c", .8));
  g.append(s("circle", { cx: tier < 2 ? 34 : 44, r: 1.7, fill: "#ebfbe0", class: "eb-glow" }));
  return g;
}
