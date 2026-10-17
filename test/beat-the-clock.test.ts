// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { advance, LAYOUTS, newRound, nextChallenge, shoot, tick, type Target, type State } from '../src/minigames/beat-the-clock/game';
import { ball, DT, moving, POCKETS, simulate, step, strike } from '../src/minigames/beat-the-clock/physics';
import { beatTheClock } from '../src/minigames/beat-the-clock';
import { minigamesFor } from '../src/minigames/registry';
import { renderRoute } from '../src/app';
import { canGrab, MIN_PULL, MAX_PULL, pullShot } from '../src/minigames/beat-the-clock/controls';
import solutions from '../src/minigames/beat-the-clock/solutions.json';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();document.body.replaceChildren();});
describe('pool physics',()=>{
 it('transfers momentum on a head-on collision without overlap or repeated impulses',()=>{
  const world={balls:[{...ball('cue',100,100),vx:200},ball('easy',120,100)],steps:0};
  const next=step(world);expect(next.balls[1].vx).toBeGreaterThan(180);expect(next.balls[0].vx).toBeLessThan(10);
  expect(Math.hypot(next.balls[1].x-next.balls[0].x,next.balls[1].y-next.balls[0].y)).toBeGreaterThanOrEqual(20);
  expect(world.balls[0].x).toBe(100);
  const separating=step({balls:[{...ball('cue',100,100),vx:-100},{...ball('easy',119,100),vx:100}],steps:0});
  expect(separating.balls[0].vx).toBeLessThan(0);expect(separating.balls[1].vx).toBeGreaterThan(0);
 });
 it('rebounds at cushions, captures pockets, and friction stops motion',()=>{
  expect(step({balls:[{...ball('cue',11,100),vx:-400}],steps:0}).balls[0].vx).toBeGreaterThan(0);
  const sunk=step({balls:[{...ball('cue',300,19),vy:-100}],steps:0}).balls[0];expect(sunk.sunk).toBe(true);expect(sunk.vy).toBe(0);
  const result=simulate({balls:[ball('cue',300,170)],steps:0},0,10);expect(moving(result)).toBe(false);expect(result.steps).toBeLessThanOrEqual(1440);
 });
 it('repeats exactly with the same inputs and bounds maximum movement per step',()=>{
  expect(simulate(LAYOUTS[0],-.5,60)).toEqual(simulate(LAYOUTS[0],-.5,60));
  expect(Math.hypot(strike(LAYOUTS[0],0,100).balls[0].vx)*DT).toBeLessThan(3);
 });
 it('deflects glancing contacts without adding energy or producing invalid coordinates',()=>{
  const world={balls:[{...ball('cue',100,100),vx:400},ball('hard',117,110)],steps:0};
  const result=step(world);
  expect(result.balls[0].vy).toBeLessThan(0);expect(result.balls[1].vy).toBeGreaterThan(0);
  const energy=result.balls.reduce((sum,b)=>sum+b.vx*b.vx+b.vy*b.vy,0);
  expect(energy).toBeLessThanOrEqual(400*400);
  expect(result.balls.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y))).toBe(true);
 });
});
// Replay recorded shots through the production engine. No search or scoring stubs.
function replay(index:number,target:Target) {
 const shot=solutions[index][target];
 let world=strike(LAYOUTS[index],shot.angle,shot.power), banks=0, cushionContacts=0, targetContacted=false, cut:number|null=null;
 const targetIndex=world.balls.findIndex(b=>b.id===target);
 while(moving(world)) {
  const next=step(world);
  if(!world.balls[targetIndex].sunk) for(const i of [0,targetIndex]) {
   const before=world.balls[i],after=next.balls[i];
   if(!after.sunk&&((after.x===10&&before.vx<0)||(after.x===590&&before.vx>0)||(after.y===10&&before.vy<0)||(after.y===330&&before.vy>0))){cushionContacts++;if(i===targetIndex||!targetContacted)banks++;}
  }
  if(cut===null&&Math.hypot(world.balls[targetIndex].vx,world.balls[targetIndex].vy)===0&&Math.hypot(next.balls[targetIndex].vx,next.balls[targetIndex].vy)>1) {
   const cue=world.balls[0],object=world.balls[targetIndex],d=Math.hypot(object.x-cue.x,object.y-cue.y),v=Math.hypot(cue.vx,cue.vy);
   if(d<25&&v>1)cut=Math.acos(Math.max(-1,Math.min(1,((object.x-cue.x)*cue.vx+(object.y-cue.y)*cue.vy)/(d*v))))*180/Math.PI;
  }
  if(Math.hypot(next.balls[targetIndex].vx,next.balls[targetIndex].vy)>0||next.balls[targetIndex].sunk)targetContacted=true;
  world=next;
 }
 return {world,banks,cushionContacts,cut};
}
describe('challenge feasibility and rules',()=>{
 for(let index=0;index<8;index++) for(const target of ['easy','hard'] as const) {
  it(`replays the recorded ${target} solution for layout ${index+1} without a scratch`,()=>{
   const shot=solutions[index][target],{world,banks,cushionContacts,cut}=replay(index,target);
   expect(world.balls[0].sunk).toBe(false);expect(world.balls.find(b=>b.id===target)!.sunk).toBe(true);
   expect(world.steps*DT).toBeCloseTo(shot.seconds,8);expect(banks).toBe(shot.banks);
   expect(cushionContacts).toBe(shot.cushionContacts);
   if(shot.cutDegrees===null)expect(cut).toBeNull();else expect(cut).toBeCloseTo(shot.cutDegrees,6);
   if(index>=6&&target==='hard')expect(banks).toBeGreaterThan(0);
   let state:State={...newRound(false,0),challenge:index,world:structuredClone(LAYOUTS[index])};
   state=shoot(state,target,shot.angle,shot.power,0);while(state.phase==='moving')state=advance(state,1000);
   expect(state.score).toBe(target==='easy'?1:3);
   for(const offset of [-shot.angleTolerance,shot.angleTolerance]) {
    const result=simulate(LAYOUTS[index],shot.angle+offset,shot.power);
    expect(result.balls[0].sunk).toBe(false);expect(result.balls.find(b=>b.id===target)!.sunk).toBe(true);
   }
   for(const offset of [-shot.powerTolerance,shot.powerTolerance]) {
    const result=simulate(LAYOUTS[index],shot.angle,shot.power+offset);
    expect(result.balls[0].sunk).toBe(false);expect(result.balls.find(b=>b.id===target)!.sunk).toBe(true);
   }
  });
 }
 it('uses distinct non-overlapping layouts with obstacles in levels 5–8',()=>{
  expect(solutions).toHaveLength(8);
  expect(new Set(LAYOUTS.map(l=>JSON.stringify(l.balls))).size).toBe(8);
  for(let i=0;i<8;i++) {
   const balls=LAYOUTS[i].balls;
   expect(balls.filter(b=>b.id.startsWith('obstacle')).length).toBe(i<4?0:i===4||i===6?1:2);
   for(let a=0;a<balls.length;a++)for(let b=a+1;b<balls.length;b++)expect(Math.hypot(balls[a].x-balls[b].x,balls[a].y-balls[b].y)).toBeGreaterThan(20);
  }
  expect(solutions[0].easy.cutDegrees!).toBeLessThan(1);
  expect(solutions[0].hard.cutDegrees!).toBeLessThan(1);
  expect(solutions[2].hard.cutDegrees!).toBeGreaterThan(25);
  expect(solutions[3].hard.cutDegrees!).toBeGreaterThan(25);
 });
 it('scores only once, scratches score zero, and eight attempts end the round',()=>{
  let state=shoot(newRound(false,0),'hard',0,20,0);
  state.world.balls.forEach(b=>{b.vx=b.vy=0;});state.world.balls[2].sunk=true;
  state=advance(state,1);expect(state.score).toBe(3);expect(advance(state,2).score).toBe(3);
  let wrong=shoot(newRound(false,0),'hard',0,20,0);
  wrong.world.balls.forEach(b=>{b.vx=b.vy=0;});wrong.world.balls[1].sunk=true;
  expect(advance(wrong,1).score).toBe(0);
  let scratch=shoot(newRound(false,0),'hard',0,20,0);
  scratch.world.balls.forEach(b=>{b.vx=b.vy=0;b.sunk=true;});expect(advance(scratch,1).score).toBe(0);
  let round=newRound(false,0);
  for(let i=0;i<8;i++) {round=shoot(round,'easy',0,0,0);while(round.phase==='moving')round=advance(round,1);round=nextChallenge(round,2);}
  expect(round.shots).toBe(8);expect(round.phase).toBe('ended');expect(shoot(round,'hard',0,100,3)).toBe(round);
 });
 it('expires at exactly 60s including in-flight shots; OFF has identical physics without expiry',()=>{
  const on=shoot(newRound(true,0),'hard',-.6,45,0),off=shoot(newRound(false,0),'hard',-.6,45,0);
  expect(on.world).toEqual(off.world);expect(tick(on,59999).phase).toBe('moving');
  expect(advance(on,60000)).toMatchObject({phase:'ended',score:0});
  expect(tick(off,120000).phase).toBe('moving');
 });
 it('uses identical layouts, physics, controls-independent results, and scoring in both clock settings',()=>{
  let on=newRound(true,0),off=newRound(false,0);
  for(let i=0;i<8;i++) {
   expect(on.world).toEqual(off.world);
   const shot=solutions[i].easy;
   on=shoot(on,'easy',shot.angle,shot.power,1000);off=shoot(off,'easy',shot.angle,shot.power,1000);
   while(on.phase==='moving'){on=advance(on,1000);off=advance(off,1000);}
   expect(on.world).toEqual(off.world);expect(on.score).toBe(off.score);
   on=nextChallenge(on,1000);off=nextChallenge(off,1000);
  }
  expect(on.score).toBe(8);expect(off.score).toBe(8);expect(on.phase).toBe('ended');expect(off.phase).toBe('ended');
 });
});
function setup(){const el=document.createElement('div');document.body.append(el);const unmount=beatTheClock.mount(el);return {el,unmount,q:<T extends HTMLElement>(s:string)=>el.querySelector<T>(s)!};}
describe('pool interface',()=>{
 it('has exactly one mechanic checkbox, locks it, expires, and cleans up animations',()=>{
  vi.useFakeTimers();const {el,q,unmount}=setup();
  expect(el.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);expect(el.querySelectorAll('[data-mechanic]')).toHaveLength(1);
  const toggle=q<HTMLInputElement>('[data-mechanic="time-pressure"]');expect(toggle.closest('label')!.textContent).toContain('Time pressure');
  q('[data-start]').click();expect(toggle.disabled).toBe(true);vi.advanceTimersByTime(60016);
  expect(q<HTMLButtonElement>('[data-shoot]').disabled).toBe(true);expect(q('[data-status]').textContent).toContain('Time is up!');
  expect(q('.btc-reflect').hidden).toBe(false);q('[data-new]').click();expect(toggle.disabled).toBe(false);
  q('[data-start]').click();vi.advanceTimersByTime(0);unmount();expect(el.childNodes).toHaveLength(0);expect(vi.getTimerCount()).toBe(0);
 });
 it('supports untimed play, power, keyboard aiming, and disables shots while moving',()=>{
  vi.useFakeTimers();const {q,unmount}=setup();q<HTMLInputElement>('[data-mechanic]').click();q('[data-start]').click();
  vi.advanceTimersByTime(65000);expect(q('[data-clock]').textContent).toBe('Untimed');
  q('[data-target="hard"]').click();const power=q<HTMLInputElement>('[data-power]');power.value='65';power.dispatchEvent(new Event('input'));
  expect(q('output').textContent).toBe('65%');
  const svg=q('svg'),line=svg.querySelector('.btc-guide')!,before=line.getAttribute('x2');
  svg.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));expect(line.getAttribute('x2')).not.toBe(before);
  q('[data-shoot]').click();expect(q<HTMLButtonElement>('[data-shoot]').disabled).toBe(true);
  vi.advanceTimersByTime(7000);expect(q<HTMLButtonElement>('[data-shoot]').disabled).toBe(false);unmount();
 });
 it('is discovered on the Challenge page',()=>{
  expect(minigamesFor('challenge')).toContain(beatTheClock);const el=document.createElement('div');const dispose=renderRoute(el,'#/m/challenge');
  expect(el.querySelector('.btc-table')).not.toBeNull();dispose();
 });
});

describe('pull-back calculation',()=>{
 it('fires opposite the drag and supports sideways fine adjustment',()=>{
  const straight=pullShot({x:100,y:100},{x:50,y:100});expect(straight.angle).toBeCloseTo(0);
  const adjusted=pullShot({x:100,y:100},{x:50,y:110});expect(adjusted.angle).toBeLessThan(0);
  expect(adjusted.angle).toBeGreaterThan(-.3);
 });
 it('maps distance continuously to bounded power and rejects accidental taps',()=>{
  expect(pullShot({x:0,y:0},{x:0,y:0}).ready).toBe(false);
  expect(pullShot({x:0,y:0},{x:MIN_PULL,y:0}).ready).toBe(false);
  const half=pullShot({x:0,y:0},{x:(MAX_PULL+MIN_PULL)/2,y:0});expect(half.power).toBeCloseTo(50);
  expect(pullShot({x:0,y:0},{x:500,y:0})).toMatchObject({distance:MAX_PULL,power:100,ready:true});
  expect(pullShot({x:0,y:0},{x:60,y:0}).power).toBeGreaterThan(pullShot({x:0,y:0},{x:59,y:0}).power);
 });
});
function dragSetup(){
 vi.useFakeTimers();
 vi.stubGlobal('DOMPoint',class {constructor(public x:number,public y:number){} matrixTransform(){return this;}});
 const result=setup(),svg=result.el.querySelector('svg')!,captured=new Set<number>();
 Object.assign(svg,{getScreenCTM:()=>({a:1,b:0,inverse:()=>({})}),
  setPointerCapture:(id:number)=>captured.add(id),hasPointerCapture:(id:number)=>captured.has(id),releasePointerCapture:(id:number)=>captured.delete(id)});
 const pointer=(type:string,x:number,y:number,id=1)=>{
  const event=new MouseEvent(type,{clientX:x,clientY:y,bubbles:true,button:0});
  Object.defineProperties(event,{pointerId:{value:id},isPrimary:{value:true},pointerType:{value:'touch'}});svg.dispatchEvent(event);
 };
 return {...result,svg,pointer};
}
describe('pull-back pointer lifecycle',()=>{
 it('shows pull-back power and a visible guide, then fires only once on release',()=>{
  const {q,svg,pointer,unmount}=dragSetup();q('[data-start]').click();
  const cue=svg.querySelector('.btc-cue:not(.btc-ball)')!,before=cue.getAttribute('x1');
  pointer('pointerdown',300,170);pointer('pointermove',240,180);
  expect(svg.classList.contains('btc-pulling')).toBe(true);expect(cue.getAttribute('x1')).not.toBe(before);
  expect(q('output').textContent).not.toBe('0%');expect(svg.querySelector<SVGElement>('.btc-guide')!.style.display).toBe('');
  expect(q<HTMLButtonElement>('[data-shoot]').disabled).toBe(true);
  pointer('pointerup',240,180);expect(q('[data-score]').textContent).toContain('7 shots left');
  pointer('pointerup',240,180);q('[data-shoot]').click();pointer('pointerdown',300,170);pointer('pointerup',210,170);
  expect(q('[data-score]').textContent).toContain('7 shots left');unmount();
 });
 it('rejects short taps, distant grabs, unrelated pointers, and inactive rounds',()=>{
  const {q,pointer,unmount}=dragSetup();pointer('pointerdown',300,170);pointer('pointerup',210,170);
  expect(q('[data-score]').textContent).toContain('8 shots left');q('[data-start]').click();
  pointer('pointerdown',20,20);pointer('pointerup',100,20);expect(q('[data-score]').textContent).toContain('8 shots left');
  pointer('pointerdown',300,170);pointer('pointerup',302,172);expect(q('[data-score]').textContent).toContain('8 shots left');
  pointer('pointerdown',300,170);pointer('pointermove',210,170,2);pointer('pointerup',210,170,2);
  expect(q('output').textContent).toBe('0%');pointer('pointercancel',300,170);unmount();
 });
 it('cancels on Escape, cancellation, capture loss, reset, or expiry without shooting',()=>{
  const {q,svg,pointer,unmount}=dragSetup();q('[data-start]').click();
  for(const event of ['escape','pointercancel','lostpointercapture']){
   pointer('pointerdown',300,170);pointer('pointermove',210,170);
   if(event==='escape')svg.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));else pointer(event,210,170);
   pointer('pointerup',210,170);expect(q('[data-score]').textContent).toContain('8 shots left');expect(q('output').textContent).toBe('45%');
  }
  pointer('pointerdown',300,170);pointer('pointermove',210,170);q('[data-new]').click();pointer('pointerup',210,170);
  q('[data-start]').click();pointer('pointerdown',300,170);pointer('pointermove',210,170);vi.advanceTimersByTime(60016);pointer('pointerup',210,170);
  expect(q('[data-status]').textContent).toContain('Time is up!');expect(q('[data-score]').textContent).toContain('8 shots left');unmount();
 });
});



describe('first-gesture grab regression',()=>{
 it('accepts the entire visible cue stick, including points outside the old cue-ball circle',()=>{
  expect(canGrab({x:215,y:170},{x:300,y:170},0,7,24)).toBe(true);
  expect(canGrab({x:215,y:230},{x:300,y:170},0,7,24)).toBe(false);
  expect(canGrab({x:300,y:170},{x:300,y:170},0,7,24)).toBe(true);
 });
 it('keeps the cue stable on hover and shoots directly from its visible midpoint',()=>{
  const {q,svg,pointer,unmount}=dragSetup();q('[data-start]').click();
  const stick=svg.querySelector<SVGLineElement>('line.btc-cue')!;
  const before=[stick.getAttribute('x1'),stick.getAttribute('y1'),stick.getAttribute('x2'),stick.getAttribute('y2')];
  pointer('pointermove',50,50);pointer('pointermove',500,200);
  expect([stick.getAttribute('x1'),stick.getAttribute('y1'),stick.getAttribute('x2'),stick.getAttribute('y2')]).toEqual(before);
  const x=(Number(before[0])+Number(before[2]))/2,y=(Number(before[1])+Number(before[3]))/2;
  expect(Math.hypot(x-300,y-170)).toBeGreaterThan(60);
  pointer('pointerdown',x,y);expect(svg.classList.contains('btc-pulling')).toBe(true);
  expect(q('[data-status]').textContent).toContain('Cue grabbed');
  pointer('pointermove',x+40,y+30);pointer('pointerup',x+40,y+30);
  expect(q('[data-score]').textContent).toContain('7 shots left');unmount();
 });
 it('does not fire from hovering or tapping the cue stick',()=>{
  const {q,svg,pointer,unmount}=dragSetup();q('[data-start]').click();
  const stick=svg.querySelector<SVGLineElement>('line.btc-cue')!,x=(Number(stick.getAttribute('x1'))+Number(stick.getAttribute('x2')))/2,y=(Number(stick.getAttribute('y1'))+Number(stick.getAttribute('y2')))/2;
  pointer('pointermove',x,y);pointer('pointermove',x+100,y+100);
  pointer('pointerdown',x,y);pointer('pointerup',x+1,y+1);
  expect(q('[data-score]').textContent).toContain('8 shots left');unmount();
 });
});
