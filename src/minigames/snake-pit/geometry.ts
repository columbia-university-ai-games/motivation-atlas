import type { Cell } from "./game";

const EPSILON = 1e-8;

function distanceToSegment(point: Cell, a: Cell, b: Cell): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
    ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}

/** Both segments follow the grid axes. Overlapping bounding boxes mean they cross. */
function segmentDistance(a: Cell, b: Cell, c: Cell, d: Cell): number {
  const crosses = Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <= Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x))
    && Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <= Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y));
  return crosses ? 0 : Math.min(
    distanceToSegment(a, c, d), distanceToSegment(b, c, d),
    distanceToSegment(c, a, b), distanceToSegment(d, a, b),
  );
}

/** A swept circle, in grid coordinates (cell centers are integer positions). */
export function hitsWall(rows: readonly string[], from: Cell, to: Cell, width: number): boolean {
  const radius = width / 2;
  const minX = Math.min(from.x, to.x) + 0.5;
  const maxX = Math.max(from.x, to.x) + 0.5;
  const minY = Math.min(from.y, to.y) + 0.5;
  const maxY = Math.max(from.y, to.y) + 0.5;
  for (let y = Math.floor(minY - radius); y <= Math.floor(maxY + radius); y++) {
    for (let x = Math.floor(minX - radius); x <= Math.floor(maxX + radius); x++) {
      if (rows[y]?.[x] === ".") continue;
      const dx = Math.max(x - maxX, minX - x - 1, 0);
      const dy = Math.max(y - maxY, minY - y - 1, 0);
      if (Math.hypot(dx, dy) < radius - EPSILON) return true;
    }
  }
  return false;
}

export function hitsBody(from: Cell, to: Cell, width: number, body: readonly Cell[], widths: readonly number[]): boolean {
  // The head and its connected neck overlap naturally on a bend. A wider
  // circle overlaps one more neighboring cell; this is continuous body, not a crash.
  // Everything farther along the trail is an obstacle, including its thickness.
  for (let i = Math.ceil(width) + 1; i < body.length; i++) {
    const next = Math.min(i + 1, body.length - 1);
    const bodyWidth = Math.max(widths[i], widths[next]);
    if (segmentDistance(from, to, body[i], body[next]) < (width + bodyWidth) / 2 - EPSILON) return true;
  }
  return false;
}
