export const WIDTH = 600, HEIGHT = 340, RADIUS = 10, DT = 1 / 240;
export const POCKETS = [{x:0,y:0},{x:300,y:0},{x:600,y:0},{x:0,y:340},{x:300,y:340},{x:600,y:340}];
export interface Ball { id: string; x: number; y: number; vx: number; vy: number; sunk: boolean }
export interface World { balls: Ball[]; steps: number }
export function ball(id: string, x: number, y: number): Ball { return {id,x,y,vx:0,vy:0,sunk:false}; }
export function moving(world: World): boolean { return world.balls.some(b => !b.sunk && Math.hypot(b.vx,b.vy) > 0); }
export function strike(world: World, angle: number, power: number): World {
 const next = structuredClone(world), cue = next.balls[0];
 const speed = 180 + Math.max(0,Math.min(100,power)) * 5;
 cue.vx = Math.cos(angle)*speed; cue.vy = Math.sin(angle)*speed;
 return next;
}
export function step(world: World): World {
 const next = structuredClone(world); next.steps++;
 for (const b of next.balls) {
  if (b.sunk) continue;
  b.x += b.vx*DT; b.y += b.vy*DT;
  if (POCKETS.some(p=>Math.hypot(b.x-p.x,b.y-p.y)<22)) { b.sunk=true; b.vx=b.vy=0; continue; }
  if (b.x<RADIUS) {b.x=RADIUS; b.vx=Math.abs(b.vx)*.86;}
  if (b.x>WIDTH-RADIUS) {b.x=WIDTH-RADIUS; b.vx=-Math.abs(b.vx)*.86;}
  if (b.y<RADIUS) {b.y=RADIUS; b.vy=Math.abs(b.vy)*.86;}
  if (b.y>HEIGHT-RADIUS) {b.y=HEIGHT-RADIUS; b.vy=-Math.abs(b.vy)*.86;}
 }
 for(let i=0;i<next.balls.length;i++) for(let j=i+1;j<next.balls.length;j++) {
  const a=next.balls[i],b=next.balls[j]; if(a.sunk||b.sunk) continue;
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
  if(d>=RADIUS*2) continue;
  const nx=d>0?dx/d:1,ny=d>0?dy/d:0,overlap=(RADIUS*2-d)/2+.001;
  a.x-=nx*overlap; a.y-=ny*overlap; b.x+=nx*overlap; b.y+=ny*overlap;
  const approach=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
  if(approach>0) { const impulse=approach*.97; a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny; }
 }
 for(const b of next.balls) {
  const speed=Math.hypot(b.vx,b.vy), slowed=Math.max(0,speed-100*DT);
  if(speed<5 || next.steps>=1440) b.vx=b.vy=0;
  else {b.vx*=slowed/speed;b.vy*=slowed/speed;}
 }
 return next;
}
export function simulate(world: World, angle: number, power: number): World {
 let result=strike(world,angle,power);
 while(moving(result)) result=step(result);
 return result;
}
