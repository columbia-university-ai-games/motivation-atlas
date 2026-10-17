/** Distances are in the table's SVG coordinates, independent of screen size. */
export const MIN_PULL = 8;
export const MAX_PULL = 110;
export interface Point { x: number; y: number }
/** Accept the ball ring AND the full visible stick, with touch-sized padding. */
export function canGrab(point:Point, cue:Point, angle:number, back:number, padding:number):boolean {
  if(Math.hypot(point.x-cue.x,point.y-cue.y)<=padding)return true;
  const ux=Math.cos(angle),uy=Math.sin(angle);
  const along=(point.x-cue.x)*ux+(point.y-cue.y)*uy;
  const closest=Math.max(-105-back,Math.min(-26-back,along));
  return Math.hypot(point.x-cue.x-closest*ux,point.y-cue.y-closest*uy)<=padding;
}
export function pullShot(start: Point, end: Point) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const distance = Math.min(MAX_PULL, Math.hypot(dx, dy));
  return {
    distance,
    angle: Math.atan2(-dy, -dx),
    power: Math.max(0, (distance - MIN_PULL) / (MAX_PULL - MIN_PULL) * 100),
    ready: distance > MIN_PULL,
  };
}
