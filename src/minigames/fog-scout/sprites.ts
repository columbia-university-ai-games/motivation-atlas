import { s } from "../../lib/dom";

/** Original pixel drawings, rendered as crisp SVG rectangles. No downloaded assets. */
const PALETTE: Record<string, string> = {
  h: "#382c2b", H: "#bc864b", s: "#edc29b", E: "#202936",
  c: "#174d54", C: "#45a59a", g: "#e5bb72", b: "#283242",
  B: "#58667a", d: "#19212d", o: "#183d3c", G: "#66c7a2",
  l: "#a0e5b6", w: "#ebf7e3", k: "#0c1722", r: "#a76141",
  y: "#f3d486", a: "#ed974d", f: "#f4e7bd", t: "#694338",
  p: "#526779", q: "#718698", v: "#344453", z: "#293642",
};
const DRAWINGS = {
  footprints: [
    "..qq......", ".qqqq.....", ".qqqq.....", "..qq......", ".......qq.",
    "..qq..qqqq", "......qqqq", ".......qq.", "..........", ".......qq.",
  ],
  hero: [
    "....hhhh....", "...hHHHHh...", "..hHHHHHHh..", "..hssssssh..",
    "...sEssEs...", "...ssssss...", "....ssss....", "...cccccc...",
    "..cCCCCCCc..", ".gcCCCCCCcf.", ".ggCCCCCCff.", "...cbbbc.f..",
    "...bBBBb....", "...bB.Bb....", "..bbb.bbb...", "..ddd.ddd...",
  ],
  monster: [
    ".....oooooo.....", "...ooGGllGGoo...", "..oGGGllllGGGo..",
    ".oGGGGGGGGGGGGo.", ".oGGwwGGGGwwGGo.", "oGGGwkwGGGwkwGGo",
    "oGGGGGGGGGGGGGGo", "oGGGGGGooGGGGGGo", ".oGGGGGGGGGGGGo.",
    "..oooGGGGGGooo..", ".oGGo......oGGo.", "..oo........oo..",
  ],
  relic: [
    "..tttttttttttt..", ".tggggggggggggt.", "tgyyyyyyyyyyyygt",
    "tgyyyyyyyyyyyygt", "tggggggggggggggt", "ttttttggggtttttt",
    "trrrrtgffgtrrrrt", "trrrrtgkkgtrrrrt", "trrrrtggggtrrrrt",
    "trrrrrrrrrrrrrrt", ".tttttttttttttt.", "..tt........tt..",
  ],
  exit: [
    "...qqqqqqqqqq...", "..qppppppppppq..", ".qppkkkkkkkkppq.",
    ".qpkkkGGGGkkkpq.", ".qpkGkkkkkkGkpq.", ".qpkGkkkkkkGkpq.",
    ".qpkGkkkkkkGkpq.", ".qpkGkkkkkkGkpq.", ".qpkGkkkkkkGkpq.",
    ".qpkkkkkkkkkkpq.", ".qppppppppppppq.", "qqqqqqqqqqqqqqqq",
    "pppppppppppppppp", ".vvvvvvvvvvvvvv.",
  ],
  torch: [
    ".......a........", "......aya.......", ".....ayfya......", ".....ayfya......",
    "......aya.......", ".....ggggg......", "......ttt.......", "......ttt.......",
    "......ttt.......", "......ttt.......", ".......t........",
  ],
  heart: [
    "..rr..rr..", ".raarraar.", ".raaaaaar.", ".raaaaaar.",
    "..raaaarr.", "...raar...", "....rr....",
  ],
  sword: [
    "..........qf", ".........qfq", "........qfq.", ".......qfq..",
    "......qfq...", ".....qfq....", ".g..qfq.....", "..gqfq......",
    "...gg.......", "..tggg......", ".tt..g......", "tt..........",
  ],
} as const;

export type Sprite = keyof typeof DRAWINGS;
const templates = new Map<Sprite, SVGSVGElement>();
export function sprite(kind: Sprite): SVGSVGElement {
  if (!templates.has(kind)) {
    const rows = DRAWINGS[kind];
    const width = Math.max(...rows.map((row) => row.length));
    const xOffset = Math.floor((16 - width) / 2), yOffset = Math.floor((16 - rows.length) / 2);
    const svg = s("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", focusable: "false", class: `fs-sprite fs-sprite-${kind}`, "shape-rendering": "crispEdges" });
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length;) {
        const color = row[x];
        let end = x + 1;
        while (row[end] === color && end < row.length) end++;
        if (color !== ".") svg.append(s("rect", { x: xOffset + x, y: yOffset + y, width: end - x, height: 1, fill: PALETTE[color] }));
        x = end;
      }
    });
    templates.set(kind, svg);
  }
  return templates.get(kind)!.cloneNode(true) as SVGSVGElement;
}
