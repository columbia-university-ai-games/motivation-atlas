import { h, s } from '../../lib/dom';
import type { Minigame } from '../types';
import { advance, LAYOUTS, newRound, nextChallenge, shoot, tick, type State, type Target } from './game';
import { DT, POCKETS } from './physics';
import { canGrab, pullShot, type Point } from './controls';
import './style.css';
function mount(el:HTMLElement):()=>void {
 let state:State|null=null,angle=-.5,target:Target='easy',frame=0,last=0,accumulator=0,feedbackAt=0;
 let pull: { id:number; start:Point; screen:Point; angle:number; power:string; distance:number; back:number } | null = null;
 let aimedChallenge=-1;
 const toggle=h('input',{type:'checkbox',checked:true,'data-mechanic':'time-pressure'});
 const start=h('button',{type:'button','data-start':''},'Start round');
 const reset=h('button',{type:'button','data-new':''},'New round');
 const easy=h('button',{type:'button','data-target':'easy'},'Easy · 1 point');
 const hard=h('button',{type:'button','data-target':'hard'},'Hard · 3 points');
 const power=h('input',{type:'range',min:0,max:100,step:.1,value:45,'data-power':'','aria-label':'Shot power'});
 const powerText=h('output',{},'45%');
 const fire=h('button',{type:'button','data-shoot':''},'Shoot');
 const score=h('p',{'data-score':'',class:'btc-score'});
 const clock=h('p',{'data-clock':'',class:'btc-clock'});
 const status=h('p',{role:'status','data-status':''});
 const heading=h('p',{class:'btc-challenge'});
 const svg=s('svg',{viewBox:'-30 -30 660 400',class:'btc-table',tabindex:0,role:'application','aria-label':'Pool table. Press directly on the cue stick or the ring around the white ball, pull back, and release in one gesture. Escape cancels. Arrow keys adjust aim; Shift gives fine adjustment. Power slider and Shoot are optional alternatives.'});
 svg.append(s('rect',{x:-28,y:-28,width:656,height:396,rx:24,class:'btc-wood'}),s('rect',{x:0,y:0,width:600,height:340,rx:12,class:'btc-felt'}));
 for(const p of POCKETS) svg.append(s('circle',{cx:p.x,cy:p.y,r:23,class:'btc-pocket'}));
 const guide=s('line',{class:'btc-guide'}),cueStick=s('line',{class:'btc-cue'}),balls=s('g'),grabRing=s('circle',{r:24,class:'btc-grab-ring','aria-hidden':'true'});
 svg.append(guide,cueStick,balls,grabRing);
 const reflect=h('p',{class:'btc-reflect'},'What did you feel? Did Time pressure change your aim, power, or choice of target? Try the other setting and compare.');
 const root=h('div',{class:'btc'},h('div',{class:'btc-top'},h('span',{class:'btc-kicker'},'BEAT THE CLOCK / POOL'),h('label',{},toggle,' Time pressure')),h('div',{class:'btc-hud'},score,clock,h('p',{class:'btc-livepower'},'Power ',powerText)),heading,svg,
 h('p',{class:'btc-help'},'Pull back the cue stick and release to shoot.'),
 h('p',{class:'btc-help'},'Press the stick or the white-ball ring, then pull back and release in one gesture. Sideways movement adjusts aim. Escape cancels. Keyboard, Power and Shoot remain available. Gray × balls are unscored obstacles.'),
 h('div',{class:'btc-actions',role:'group','aria-label':'Target for this shot'},easy,hard),
 h('label',{class:'btc-power'},'Shot power',power),h('div',{class:'btc-actions'},start,fire,reset),status,reflect);
 function draw() {
  const world=state?.world??LAYOUTS[0],cue=world.balls[0],aiming=state?.phase==='aiming';
  balls.replaceChildren();
  for(const b of world.balls) if(!b.sunk) {
   const group=s('g'); group.append(s('circle',{cx:b.x+2,cy:b.y+3,r:11,class:'btc-shadow'}));
   group.append(s('circle',{cx:b.x,cy:b.y,r:10,class:`btc-ball btc-${b.id.startsWith('obstacle')?'obstacle':b.id}`}));
   if(b.id!=='cue') { group.append(s('text',{x:b.x,y:b.y+4,'text-anchor':'middle',class:'btc-ball-label'},b.id==='easy'?'1':b.id==='hard'?'3':'×'));
    if(b.id===target&&aiming) group.append(s('circle',{cx:b.x,cy:b.y,r:15,class:'btc-selected'})); }
   balls.append(group);
  }
  const ux=Math.cos(angle),uy=Math.sin(angle);
  // Truncate the guide at the first ball or cushion; it does not solve the shot.
  let distance=190;
  for(const b of world.balls.slice(1)) if(!b.sunk) {
   const dx=b.x-cue.x,dy=b.y-cue.y,along=dx*ux+dy*uy,side=dx*uy-dy*ux;
   if(along>0&&Math.abs(side)<20) distance=Math.min(distance,Math.max(0,along-Math.sqrt(400-side*side)));
  }
  if(ux>0) distance=Math.min(distance,(590-cue.x)/ux); else if(ux<0) distance=Math.min(distance,(10-cue.x)/ux);
  if(uy>0) distance=Math.min(distance,(330-cue.y)/uy); else if(uy<0) distance=Math.min(distance,(10-cue.y)/uy);
  grabRing.setAttribute('cx',String(cue.x));grabRing.setAttribute('cy',String(cue.y));grabRing.style.display=aiming?'':'none';
  const back=pull?pull.back+pull.distance:Number(power.value)*.15;
  for(const [line,a,b] of [[guide,12,distance],[cueStick,-26-back,-105-back]] as const) {
   line.setAttribute('x1',String(cue.x+ux*a));line.setAttribute('y1',String(cue.y+uy*a));line.setAttribute('x2',String(cue.x+ux*b));line.setAttribute('y2',String(cue.y+uy*b));
   line.style.display=aiming?'':'none';
  }
 }
 function render() {
  const aiming=state?.phase==='aiming';
  if(!aiming) cancelPull();
  if(aiming&&state&&state.challenge!==aimedChallenge){aimedChallenge=state.challenge;pointAtTarget();}
  toggle.disabled=state!==null;start.hidden=state!==null;reset.hidden=state===null;fire.hidden=state===null;
  fire.disabled=easy.disabled=hard.disabled=power.disabled=!aiming||pull!==null;
  easy.setAttribute('aria-pressed',String(target==='easy'));hard.setAttribute('aria-pressed',String(target==='hard'));
  powerText.textContent=Math.round(Number(power.value))+'%';
  svg.classList.toggle('btc-pulling',pull!==null);
  const remaining=8-(state?.shots??0);
  score.textContent=`${state?.score??0} points · ${remaining} shot${remaining===1?'':'s'} left`;
  clock.textContent=state?.deadline!=null?`${Math.max(0,Math.ceil((state.deadline-performance.now())/1000))}s remaining`:toggle.checked?'60-second round':'Untimed';
  const layout=LAYOUTS[state?.challenge??0];
  heading.textContent=`${(state?.challenge??0)+1} / 8 · ${layout.name} — ${layout.hint}`;
  status.textContent=state?`${pull?'Cue grabbed — pull back, then release. Escape cancels.':state.message}${state.phase==='ended'?` Final score: ${state.score} / 24.`:''}`:'Choose Time pressure, then start. Press the stick or white-ball ring to shoot.';
  reflect.hidden=state?.phase!=='ended'; draw();
 }
 function loop(now:number) {
  if(!state||state.phase==='ended') {frame=0;return;}
  state=tick(state,now);
  accumulator+=Math.min((now-last)/1000,.1);last=now;
  while(accumulator>=DT&&state.phase==='moving') {
   state=advance(state,now);accumulator-=DT;
   if(state.phase==='feedback') feedbackAt=now;
  }
  if(state.phase!=='moving') accumulator=0;
  if(state.phase==='feedback'&&now-feedbackAt>=650) state=nextChallenge(state,now);
  render(); if(state.phase!=='ended') frame=requestAnimationFrame(loop);else frame=0;
 }
 function stop(){cancelAnimationFrame(frame);frame=0;}
 start.addEventListener('click',()=>{if(state)return;state=newRound(toggle.checked,performance.now());last=performance.now();accumulator=0;render();frame=requestAnimationFrame(loop);svg.focus();});
 reset.addEventListener('click',()=>{stop();cancelPull();state=null;aimedChallenge=-1;target='easy';angle=-.5;power.value='45';render();start.focus();});
 toggle.addEventListener('change',render);
 function pointAtTarget(){if(!state)return;const cue=state.world.balls[0],object=state.world.balls.find(b=>b.id===target)!;angle=Math.atan2(object.y-cue.y,object.x-cue.x);}
 for(const [button,choice] of [[easy,'easy'],[hard,'hard']] as const) button.addEventListener('click',()=>{target=choice;pointAtTarget();render();});
 power.addEventListener('input',render);
 function fireShot(){if(!state||state.phase!=='aiming')return;state=shoot(state,target,angle,Number(power.value),performance.now());accumulator=0;render();}
 fire.addEventListener('click',()=>{if(!pull)fireShot();});
 function point(event:PointerEvent):Point|null {
  const matrix=svg.getScreenCTM();if(!matrix)return null;
  return new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
 }
 function releaseCapture(id:number){if(svg.hasPointerCapture(id))svg.releasePointerCapture(id);}
 function cancelPull(){
  if(!pull)return;
  const previous=pull;pull=null;angle=previous.angle;power.value=previous.power;releaseCapture(previous.id);
 }
 function updatePull(e:PointerEvent){
  if(!pull||e.pointerId!==pull.id)return null;
  const end=point(e);if(!end)return null;
  const shot=pullShot(pull.start,end);
  pull.distance=shot.distance;
  if(shot.ready)angle=shot.angle;
  power.value=shot.power.toFixed(1);
  return {...shot,ready:shot.ready&&Math.hypot(e.clientX-pull.screen.x,e.clientY-pull.screen.y)>=8};
 }
 svg.addEventListener('pointerdown',e=>{
  if(state?.phase!=='aiming'||pull||e.button!==0||e.isPrimary===false)return;
  const start=point(e),matrix=svg.getScreenCTM();if(!start||!matrix)return;
  const cue=state.world.balls[0],grabRadius=Math.max(24,22/Math.hypot(matrix.a,matrix.b));
  if(!canGrab(start,cue,angle,Number(power.value)*.15,grabRadius))return;
  e.preventDefault();svg.focus();
  pull={id:e.pointerId,start,screen:{x:e.clientX,y:e.clientY},angle,power:power.value,distance:0,back:Number(power.value)*.15};
  svg.setPointerCapture(e.pointerId);power.value='0';render();
 });
 svg.addEventListener('pointermove',e=>{
  if(state?.phase!=='aiming')return;
  if(pull){updatePull(e);render();}
  // Hover must not move the stick away while a player approaches to grab it.
 });
 svg.addEventListener('pointerup',e=>{
  if(!pull||e.pointerId!==pull.id)return;
  if(state?.phase!=='aiming'){cancelPull();render();return;}
  const shot=updatePull(e);
  if(!shot?.ready){cancelPull();render();return;}
  const id=pull.id;pull=null;releaseCapture(id);fireShot();
 });
 for(const event of ['pointercancel','lostpointercapture'] as const)svg.addEventListener(event,e=>{if(pull?.id===e.pointerId){cancelPull();render();}});
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&pull){e.preventDefault();cancelPull();render();}});
 svg.addEventListener('keydown',e=>{if(state?.phase!=='aiming'||pull)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();angle+=(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)*(e.shiftKey?.002:.025);draw();}});
 el.append(root);render();return()=>{stop();cancelPull();root.remove();};
}
export const beatTheClock:Minigame={slug:'beat-the-clock',title:'Beat the Clock',motivators:['challenge'],author:'lzy2318831',mount};
