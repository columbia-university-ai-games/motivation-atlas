import { h, s } from "../../lib/dom";
import { SHORTCUTS } from "./burrow";
import { hitsWall } from "./geometry";
import { activeEggs, type Direction, type SnakeState } from "./game";

const ROTATION: Record<Direction, number> = { up: -90, right: 0, down: 90, left: 180 };

export function createBoard(initial: SnakeState, controlsId: string) {
  const svg = s("svg", {
    viewBox: `0 0 ${initial.maze.rows[0].length} ${initial.maze.rows.length}`,
    role: "img", "aria-label": "Burrow with narrow shortcuts and wide routes around the rocks",
  });
  const element = h("div", {
    class: "snake-pit-board", tabindex: 0, role: "group", "data-board": "",
    "aria-label": "Snake Pit play area", "aria-describedby": controlsId,
  }, svg);
  const floor = s("g", { class: "snake-pit-floor" });
  const hatchId = `${controlsId}-hatch`;
  const defs = s("defs", {}, s("pattern", { id: hatchId, width: 0.5, height: 0.5, patternUnits: "userSpaceOnUse" },
    s("rect", { width: 0.5, height: 0.5, fill: "var(--aes-soft)" }),
    s("path", { d: "M0 0L.5 .5", stroke: "var(--warn)", "stroke-width": 0.07 }),
  ));
  initial.maze.rows.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === ".") floor.append(s("rect", { x, y, width: 1, height: 1 }));
  }));
  const shortcuts = SHORTCUTS.map((gap) => s("rect", {
    x: gap.x, y: gap.y, width: gap.length, height: 1,
    class: "snake-pit-shortcut", "data-shortcut": "", rx: 0.15,
  }, s("title", {}, "Narrow shortcut: fits widths below one cell. Take the wide route when too large.")));
  const exit = s("g", { class: "snake-pit-exit" },
    s("rect", { x: initial.maze.exit.x - 0.3, y: initial.maze.exit.y - 0.3, width: 1.6, height: 1.6, rx: 0.25 }),
    s("path", { d: "M0 -.4v.7m-.3-.3.3.3.3-.3", transform: `translate(${initial.maze.exit.x + 0.5} ${initial.maze.exit.y + 0.5})` }),
  );
  const eggLayer = s("g", { class: "snake-pit-eggs" });
  const bodyLayer = s("g", { "data-snake": "" });
  const segments: SVGPolylineElement[] = [];
  const tail = s("circle", { class: "snake-pit-tail" });
  const head = s("circle", { class: "snake-pit-head", "data-head": "" });
  const face = s("g", {},
    s("circle", { cx: 0.12, cy: -0.12, r: 0.055, class: "snake-pit-eye" }),
    s("circle", { cx: 0.12, cy: 0.12, r: 0.055, class: "snake-pit-eye" }),
  );
  svg.append(defs, floor, ...shortcuts, exit, bodyLayer, tail, head, face, eggLayer);

  function update(state: SnakeState): void {
    const goal = state.maze.eggs.length;
    const open = state.eggs.length === 0;
    element.setAttribute("data-steps", String(state.steps));
    exit.setAttribute("data-open", String(open));
    svg.setAttribute("aria-label", `${goal - state.eggs.length} of ${goal} eggs collected. Width ${state.widths[0]} cells. Exit at top left ${open ? "open" : "locked"}.`);
    shortcuts.forEach((node, i) => {
      const gap = SHORTCUTS[i];
      const closed = hitsWall(state.maze.rows, { x: gap.x - 1, y: gap.y }, { x: gap.x + gap.length, y: gap.y }, state.widths[0]);
      node.setAttribute("data-closed", String(closed));
      node.style.fill = closed ? `url(#${hatchId})` : "var(--accent-soft)";
    });
    eggLayer.replaceChildren(...activeEggs(state).flatMap((egg) => [
      s("circle", { cx: egg.x + 0.5, cy: egg.y + 0.5, r: 0.85, class: "snake-pit-egg-ring" }),
      s("ellipse", { cx: egg.x + 0.5, cy: egg.y + 0.5, rx: 0.39, ry: 0.52 }),
    ]));
  }

  function draw(state: SnakeState, next: SnakeState = state, progress = 0): void {
    const points = next.body.map((cell, i) => {
      const from = state.body[i] ?? state.body.at(-1)!;
      return { x: from.x + (cell.x - from.x) * progress + 0.5, y: from.y + (cell.y - from.y) * progress + 0.5 };
    });
    const widths = next.widths.map((width, i) => {
      const from = state.widths[i] ?? state.widths.at(-1)!;
      return from + (width - from) * progress;
    });
    while (segments.length < points.length - 1) {
      const segment = s("polyline", { class: "snake-pit-body" });
      segments.push(segment);
      bodyLayer.append(segment);
    }
    while (segments.length > points.length - 1) segments.pop()!.remove();
    segments.forEach((segment, i) => {
      const a = points[i], b = points[i + 1];
      const joint = state.body[i] ?? state.body.at(-1)!;
      const bend = progress > 0 ? ` ${joint.x + 0.5},${joint.y + 0.5}` : "";
      segment.setAttribute("points", `${a.x},${a.y}${bend} ${b.x},${b.y}`);
      // The capsule radius is also used by geometry.ts for self collisions.
      segment.setAttribute("stroke-width", String(Math.max(widths[i], widths[i + 1])));
    });
    head.setAttribute("cx", String(points[0].x));
    head.setAttribute("cy", String(points[0].y));
    head.setAttribute("r", String(widths[0] / 2));
    tail.setAttribute("cx", String(points.at(-1)!.x));
    tail.setAttribute("cy", String(points.at(-1)!.y));
    tail.setAttribute("r", String(widths.at(-1)! / 2));
    face.setAttribute("transform", `translate(${points[0].x} ${points[0].y}) rotate(${ROTATION[next.direction]}) scale(${widths[0] / 0.6})`);
  }

  return { element, update, draw };
}
