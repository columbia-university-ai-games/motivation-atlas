import { h } from "../../lib/dom";
import type { Minigame } from "../types";
import { advanceCat, advanceLevel, badges, LEVEL_TARGETS, levelNames, targetFor, FIXED_FISH_CELLS, catSize, cellPosition, contacts, contactNames, moveCat, clickObject, emptyClick, HUNGER_MS, hungerRemaining, newCat, pauseCat, powerNames, powers, remainingMs, resumeCat, type CatState, type ObjectKind } from "./game";
import { pixelSprite } from "./sprites";
import "./pixel-cat-picnic.css";

const descriptions: Record<string,string> = {
 milk:"Restore one heart, up to five.", bubble:"Block one penalty, contact trap or dog bite.", ice:"Fish stay fresh 3 seconds longer for 8 seconds.",
 bell:"Eat nearby fish with one click for 8 seconds.", catnip:"A little party: up to three extra fish.", soup:"Six extra seconds before hunger returns.",
 cake:"Big for 10s: collect nearby fish; larger collision area.",
 potion:"Small for 10s: dodge more easily; slipped bites need finer aim.",
 mystery:"ON: 50% helpful, 50% trouble. OFF: always a labeled milk box.",
 web:"Touch: stuck for 2.2s. You can still bite nearby snacks.",
 bone:"Touch: summons one dog for 8s. Dodge it; one bite costs a heart.",
 banana:"Touch: 6s of bite offset. ON: random, so bites may miss. OFF: fixed six-unit visual offset; fish still land.",
};
function mount(el: HTMLElement): () => void {
 let state:CatState|null=null,timer:ReturnType<typeof setInterval>|null=null,completed=false;
 let pointerStart:{x:number;y:number;moved:boolean}|null=null,suppressClick=false;
 let soundOn=false,audio:AudioContext|null=null;
 const nodes=new Map<number,HTMLButtonElement>(),toasts:{node:HTMLElement;until:number}[]=[],roundResults:string[]=[];
 let bests:Record<string,number>={};
 for(const mode of ["random","fixed"])for(let level=0;level<LEVEL_TARGETS.length;level++)bests[mode+"-"+level]=0;
 try{
  const data=JSON.parse(localStorage.getItem("pixel-cat-picnic-best-levels")??"{}");
  for(const key of Object.keys(bests))if(Number.isFinite(data[key])&&data[key]>=0)bests[key]=data[key];
 }catch{/* optional local records */}
 const random=h("input",{type:"checkbox",checked:true,"data-mechanic":"randomness"});
 const odds=h("p",{class:"cat-odds"});
 const modeBadge=h("strong",{class:"cat-mode-badge","data-mode-badge":""});
 const modeSummary=h("p",{class:"cat-mode-summary","data-mode-summary":""});
 const modeCard=h("div",{class:"cat-mode-card"},modeBadge,modeSummary);
 const score=h("output",{"data-score":"","aria-label":"Snack points"},"0");
 const time=h("strong",{"data-clock":""},"90s");
 const lives=h("output",{"data-lives":"","aria-label":"Hearts remaining"},"5");
 const heartArt=h("span",{class:"cat-hearts","aria-hidden":"true"},"♥♥♥♥♥");
 const hunger=h("progress",{max:HUNGER_MS,value:HUNGER_MS,"aria-label":"Time before hunger costs a heart"});
 const hungerText=h("span",{"data-hunger":""},"8.0s");
 const basket=h("progress",{max:LEVEL_TARGETS[0],value:0,"aria-label":"Picnic points toward the goal"});
 const phase=h("span",{class:"cat-stage","data-stage":""},"LEVEL 1/3 · COURTYARD");
 const goal=h("output",{"data-goal":""},String(LEVEL_TARGETS[0]));
 const levelTrack=h("div",{class:"cat-level-track","aria-label":"Three-level journey"},
  ...LEVEL_TARGETS.map((points,i)=>h("span",{"data-level-marker":i,class:i===0?"is-active":""},(i+1)+" · "+points)));
 const eaten=h("span",{"data-eaten":""},"0"),combo=h("span",{"data-streak":""},"0");
 const status=h("p",{role:"status","aria-live":"polite",class:"cat-status"},"Move your cat, then click a fish. Moving over food never eats it.");
 const effects=h("div",{class:"cat-effects","data-effects":""});
 const best=h("span",{"data-best":""},"0");
 const sound=h("button",{type:"button",class:"cat-small","aria-pressed":"false","data-sound":""},"SOUND OFF");
 const pause=h("button",{type:"button",class:"cat-small",disabled:true,"data-pause":""},"PAUSE");
 const introCat=h("div",{class:"cat-portrait"},pixelSprite("cat"));
 const start=h("button",{type:"button",class:"cat-primary","data-start":""},"START DINNER");
 const menu=h("section",{class:"cat-screen cat-menu","data-menu":""},
  h("p",{class:"cat-eyebrow"},"A TINY NIGHT-TIME ADVENTURE"),introCat,h("h3",{},"Pixel Cat Picnic"),
  h("p",{},"Your cursor is a hungry little cat. Click dried fish, collect helpful treats, and pack the picnic before time runs out."),
  h("div",{class:"cat-instruction-grid"},h("span",{},"MOVE THE CAT"),h("span",{},"CLICK TO EAT"),h("span",{},"BEAT THE 90s LIMIT")),
  h("p",{class:"cat-menu-goal"},`Clear three picnics: 500 → 800 → 1200 points. Each level has its own score and 90-second limit. Play one level in each mode for the comparison; the full journey is optional.`),start,
  h("p",{class:"cat-hint"},"Mouse: move + click. Touch: tap. Keyboard: Tab, then Enter/Space; arrows to move. No swiping."));
 const next=h("button",{type:"button",class:"cat-primary","data-next-level":"",hidden:true},"NEXT LEVEL");
 const resultTitle=h("h3",{},"SUNRISE!"),resultText=h("p",{}),resultStats=h("div",{class:"cat-result-stats"}),medals=h("p",{class:"cat-medals"});
 const replay=h("button",{type:"button",class:"cat-primary","data-replay":""},"PLAY AGAIN");
 const other=h("button",{type:"button",class:"cat-secondary","data-other-mode":""},"TRY OTHER MODE");
 const resultPortrait=h("div",{class:"cat-portrait"});
 const end=h("section",{class:"cat-screen cat-end",hidden:true,"data-result-screen":"","aria-label":"Round result"},
  h("p",{class:"cat-eyebrow"},"YOUR NIGHT IN THE GARDEN"),resultPortrait,resultTitle,resultText,resultStats,medals,
  h("div",{class:"cat-result-actions"},next,replay,other));
 const resume=h("button",{type:"button",class:"cat-primary","data-resume":""},"RESUME"),restart=h("button",{type:"button",class:"cat-secondary"},"RESTART LEVEL");
 const pauseScreen=h("section",{class:"cat-screen cat-pause",hidden:true,"data-pause-screen":""},pixelSprite("cat","sleep"),h("h3",{},"CAT NAP"),h("p",{},"Time, hunger and treats are all paused."),resume,restart);
 const cursor=h("div",{class:"cat-cursor","aria-hidden":"true"},pixelSprite("cat"),h("span",{class:"cat-trapped"},pixelSprite("web")));
 const dog=h("div",{class:"cat-dog",hidden:true,"aria-hidden":"true"},pixelSprite("dog"),h("span",{},"WOOF!"));
 const biteAim=h("div",{class:"cat-bite-aim",hidden:true,"aria-hidden":"true"},"+");
 const routeGrid=h("div",{class:"cat-route-grid","aria-hidden":"true"});
 for(let cell=0;cell<12;cell++){
  const name=FIXED_FISH_CELLS.includes(cell)?"FISH":[1,9].includes(cell)?"TREAT":[3,7,11].includes(cell)?"TRAP":"";
  if(!name)continue;
  const marker=h("span",{class:"cat-slot slot-"+name.toLowerCase()},name);
  const at=cellPosition(cell);marker.style.left=at.x+"%";marker.style.top=at.y+"%";routeGrid.append(marker);
 }
 const targetLayer=h("div",{class:"cat-targets"}),floatLayer=h("div",{class:"cat-floats","aria-hidden":"true"});
 const scene=h("div",{class:"cat-scenery","aria-hidden":"true"},h("div",{class:"cat-moon"}),h("div",{class:"cat-window"}),h("div",{class:"cat-stars"}),h("div",{class:"cat-floor"}),h("div",{class:"cat-plant plant-left"}),h("div",{class:"cat-plant plant-right"}));
 const arena=h("div",{class:"cat-arena","data-arena":"",tabindex:"0",role:"group","aria-label":"Pixel cat garden. Click fish or helpful items; avoid spicy fish and tins."},scene,routeGrid,targetLayer,floatLayer,dog,biteAim,cursor,menu,pauseScreen,end);
 const comparison=h("ul",{"data-results":""});
 const reflection=h("section",{class:"cat-reflection",hidden:true},h("h4",{},"After the picnic"),
  h("p",{},"Did the surprise mode make you improvise? Did fixed locations let you plan ahead? Was either mode more enjoyable or worth replaying?"),
  h("p",{},"Compare reacting to random surprises with learning a fixed routine. Both average 15 points per fish. This changes the whole randomness policy, so it does not isolate rewards from layout effects."),comparison);
 const pantry=h("details",{class:"cat-pantry"},h("summary",{},"PANTRY GUIDE · 14 treats & traps"),
  h("div",{class:"cat-pantry-grid"},...[...powers,...contacts].map(kind=>h("div",{},pixelSprite(kind),h("strong",{},contacts.includes(kind as typeof contacts[number])?contactNames[kind as typeof contacts[number]]:powerNames[kind as typeof powers[number]]),h("p",{},descriptions[kind])))),
  h("p",{},"Red spicy fish: −1 heart. Empty tin: −20 points. Webs, bones and peels activate on contact after a short warning. Bubble blocks one penalty or trap. Plain fish always reset hunger, including +0 bites."));
 const root=h("div",{class:"pixel-cat-game"},
  h("header",{class:"cat-header"},h("div",{},h("span",{class:"cat-eyebrow"},"MIDNIGHT MUNCH / CHANCE"),h("h3",{},"Pixel Cat Picnic")),h("div",{class:"cat-toolbar"},sound,pause)),
  h("fieldset",{class:"cat-rules"},h("legend",{},"Randomness rule for this journey"),h("label",{},random," Randomness ON / OFF"),odds),modeCard,levelTrack,
  h("div",{class:"cat-hud"},h("div",{},h("span",{},"PICNIC"),h("strong",{},score," / ",goal)),h("div",{},h("span",{},"DAWN IN"),time),h("div",{},h("span",{},"HEARTS"),h("strong",{},lives," / 5"),heartArt)),
  h("div",{class:"cat-bars"},h("div",{},h("label",{},"BELLY ",hungerText),hunger),h("div",{},h("label",{},"PICNIC BASKET"),basket)),
  h("div",{class:"cat-board-top"},phase,h("span",{},"BEST ",best)),arena,
  h("div",{class:"cat-small-stats"},h("span",{},"FISH ",eaten),h("span",{},"CHAIN ",combo),h("span",{},"BADGES: 12 fish · 3 treats · 1 block")),effects,status,
  h("p",{class:"cat-controls"},"Webs, bones and peels activate by touch; pale traps arm after 0.7s. Arrow keys move kitty; Tab only selects a snack. Click, tap or press Enter/Space to eat. A missed click does not cost a heart; an empty belly does. Leaving this tab pauses your night. Cake and potion replace each other’s size effect. Boxes show what you found."),pantry,reflection);
 el.append(root);
 function oddsText():void {
  odds.textContent="ON: hidden 0–30 points, revealed after eating (mean 15). OFF: every fish shows +15.";
  modeBadge.textContent=random.checked?"ON · SURPRISE MODE":"OFF · FIXED ROUTINE";
  modeSummary.textContent=random.checked?"Hidden random fish rewards, random spawn cells and item draws. Mystery boxes and banana offsets can surprise you.":"Fixed fish lanes, fixed item homes and a repeating item order. Boxes always contain milk; banana offsets always go left. No random rolls.";
  arena.classList.toggle("is-routine",!random.checked);
  modeCard.classList.toggle("is-routine",!random.checked);
  best.textContent=String(bests[(random.checked?"random":"fixed")+"-"+(state?.level??0)]);
  if(state?.reason)replay.textContent=random.checked!==state.randomness?"START LEVEL 1":state.reason==="win"&&state.level===LEVEL_TARGETS.length-1?"PLAY AGAIN":state.reason==="win"?"REPLAY LEVEL":"RETRY LEVEL";
 }
 function playTone(kind:"bite"|"item"|"ouch"|"win"):void {
  if(!soundOn)return;
  try{
   audio??=new AudioContext();if(audio.state==="suspended")void audio.resume();
   const a=audio,at=a.currentTime,freq=kind==="bite"?420:kind==="item"?660:kind==="win"?784:180;
   const oscillator=a.createOscillator(),gain=a.createGain();oscillator.type="square";oscillator.frequency.setValueAtTime(freq,at);
   oscillator.frequency.exponentialRampToValueAtTime(kind==="ouch"?100:freq*1.25,at+.09);
   gain.gain.setValueAtTime(.035,at);gain.gain.exponentialRampToValueAtTime(.001,at+.13);oscillator.connect(gain);gain.connect(a.destination);oscillator.start(at);oscillator.stop(at+.14);
  }catch{soundOn=false;sound.textContent="SOUND OFF";sound.setAttribute("aria-pressed","false");}
 }
 function syncCursor():void {
  if(!state)return;
  cursor.style.left=state.cat.x+"%";cursor.style.top=state.cat.y+"%";
  cursor.dataset.size=catSize(state);cursor.classList.toggle("is-webbed",state.elapsed<state.webUntil);
  cursor.classList.toggle("is-slippery",state.elapsed<state.slipUntil);
  dog.hidden=!state.dog||Boolean(state.reason);
  if(state.dog){dog.style.left=state.dog.x+"%";dog.style.top=state.dog.y+"%";dog.classList.toggle("is-coming",state.elapsed<state.dog.armedAt);}
  biteAim.hidden=!state.lastBite||state.lastBite.until<=state.elapsed||Boolean(state.reason);
  if(state.lastBite){biteAim.style.left=state.lastBite.x+"%";biteAim.style.top=state.lastBite.y+"%";biteAim.classList.toggle("is-hit",state.lastBite.hit);}
 }
 function moveCursor(x:number,y:number):void {
  if(!state||state.reason||state.pausedAt!==null)return;
  const before=state;
  state=moveCat(state,x/(arena.clientWidth||300)*100,y/(arena.clientHeight||380)*100,Date.now());
  syncCursor();
  if(state.message!==before.message||state.reason!==before.reason){
   status.textContent=state.message;
   if(state.hazards>before.hazards||state.lives<before.lives)playTone("ouch");
   render();
  }
 }
 function float(text:string,cell:number):void {
  const p=cellPosition(cell),node=h("span",{class:"cat-pop"},text);node.style.left=`${p.x}%`;node.style.top=`${p.y}%`;floatLayer.append(node);toasts.push({node,until:Date.now()+850});
 }
 function syncObjects():void {
  if(!state)return;
  const ids=new Set(state.objects.map(o=>o.id));
  for(const [id,node]of nodes)if(!ids.has(id)){node.remove();nodes.delete(id);}
  for(const object of state.objects){
   let button=nodes.get(object.id);
   if(!button){
    const name=object.kind==="mystery"&&!state.randomness?"Milk box":object.kind==="fish"?"Fish":object.kind==="spicy"?"Spicy!":object.kind==="can"?"Tin!":contacts.includes(object.kind as typeof contacts[number])?contactNames[object.kind as typeof contacts[number]]:powerNames[object.kind as typeof powers[number]];
    button=h("button",{type:"button",class:`cat-object object-${object.kind}`,"data-object-id":object.id,"data-kind":object.kind,"aria-label":`${name}${object.kind==="fish"?" : click to eat":object.kind==="spicy"?" : avoid, loses a heart":object.kind==="can"?" : avoid, loses 20 points":contacts.includes(object.kind as typeof contacts[number])?" : contact hazard, touch activates":" : collect treat"}`},pixelSprite(object.kind==="mystery"&&!state.randomness?"milk":object.kind),h("span",{class:"cat-object-label"},object.kind==="fish"?(state.randomness?"Fish":"+15"):object.kind==="mystery"&&!state.randomness?"Milk box":name));
    const id=object.id,cell=object.cell;
    button.addEventListener("click",event=>{
     event.stopPropagation();if(event.detail>0&&suppressClick)return;if(!state||state.reason||state.pausedAt!==null)return;
     const before=state;state=clickObject(state,id,Date.now());
     const reward=state.score-before.score,loss=state.lives<before.lives;
     if(state.misses>before.misses){float("SLIP!",cell);playTone("bite");}
     else if(state.eaten>before.eaten){float(state.eaten-before.eaten>1?"+"+reward+" / "+(state.eaten-before.eaten)+" FISH":reward?`+${reward}`:"+0",cell);playTone("bite");cursor.classList.add("is-eating");}
     else if(state.items>before.items){float("TREAT!",cell);playTone("item");}
     else if(state.hazards>before.hazards){float(loss?"−1 ♥":state.blocks>before.blocks?"BLOCK!":"−20",cell);playTone(loss?"ouch":"item");}
     status.textContent=state.message;render();
     if(event.detail===0&&!state.reason){const next=targetLayer.querySelector<HTMLButtonElement>('[data-kind="fish"]');next?.focus({preventScroll:true});}
    });
    const p=cellPosition(object.cell);button.style.left=`${p.x}%`;button.style.top=`${p.y}%`;targetLayer.append(button);nodes.set(id,button);
   }
   button.disabled=state.pausedAt!==null||state.reason!==null;
   button.classList.toggle("is-arming",contacts.includes(object.kind as typeof contacts[number])&&state.elapsed<object.born+700);
   button.classList.toggle("is-fading",object.expires-state.elapsed<1000);
  }
 }
 function finish():void {
  if(!state?.reason||completed)return;completed=true;
  if(timer!==null)clearInterval(timer);timer=null;pause.disabled=true;
  arena.classList.remove("is-playing","has-mouse");end.hidden=false;pauseScreen.hidden=true;menu.hidden=true;reflection.hidden=false;
  const win=state.reason==="win",canAdvance=win&&state.level<LEVEL_TARGETS.length-1,label=state.randomness?"ON : surprise":"OFF : routine";
  next.hidden=!canAdvance;other.hidden=canAdvance;random.disabled=canAdvance;
  next.textContent="LEVEL "+(state.level+2)+" · "+(LEVEL_TARGETS[state.level+1]??"")+" POINTS";
  replay.textContent=win&&!canAdvance?"PLAY AGAIN":win?"REPLAY LEVEL":"RETRY LEVEL";
  end.dataset.level=String(state.level+1);
  end.dataset.complete=String(win&&!canAdvance);
  end.classList.toggle("is-win",win);end.classList.toggle("is-fail",!win);end.dataset.outcome=win?"win":"fail";
  resultTitle.textContent=win?(canAdvance?"LEVEL "+(state.level+1)+" CLEAR!":"ALL 3 LEVELS CLEAR!"):state.reason==="starved"?"TIME FOR A CAT NAP":"ALMOST A FEAST";
  resultText.textContent=win?(canAdvance?"Picnic packed! Next level starts with a fresh score, five hearts and 90 seconds.":"You completed the entire three-level journey!"):state.reason==="starved"?"Kitty ran out of hearts. Try feeding sooner or save a bubble for trouble.":`Kitty survived, but the basket needs ${targetFor(state)} points. Try another night.`;
  resultPortrait.replaceChildren(pixelSprite("cat",win?"normal":"sleep"),...(win?[pixelSprite("fish")]:[]));
  const stars=win?(state.elapsed<=60000&&state.lives>=4?3:state.elapsed<=75000?2:1):0;
  resultStats.replaceChildren(h("strong",{},`${state.score} POINTS`),h("span",{},`${state.eaten} fish · ${state.items} treats · chain ${state.bestStreak}`),h("span",{},`${Math.ceil(state.elapsed/1000)}s survived · ${state.lives} hearts · ${label}`));
  medals.textContent=`${stars?"★".repeat(stars):"☆"} ${badges(state).join(" / ")||"A new night is another chance."}`;
  const key=(state.randomness?"random":"fixed")+"-"+state.level;bests[key]=Math.max(bests[key],state.score);best.textContent=String(bests[key]);
  try{localStorage.setItem("pixel-cat-picnic-best-levels",JSON.stringify(bests));}catch{/* optional local record */}
  roundResults.unshift(`Level ${state.level+1} · ${label}: ${state.score} points, ${state.eaten} fish, ${state.items} treats, ${state.lives} hearts, ${state.reason==="win"?"picnic complete":"try again"}.`);
  comparison.replaceChildren(...roundResults.slice(0,4).map(text=>h("li",{},text)));playTone(win?"win":"ouch");
  (canAdvance?next:replay).focus({preventScroll:true});
 }
 function render():void {
  if(!state)return;
  const old=state;state=advanceCat(state,Date.now());if(state.message!==old.message)status.textContent=state.message;
  const stage=state.level;phase.textContent="LEVEL "+(stage+1)+"/3 · "+levelNames[stage].toUpperCase();arena.dataset.phase=String(stage);
  for(const marker of levelTrack.children){
   const level=Number((marker as HTMLElement).dataset.levelMarker);
   marker.classList.toggle("is-active",level===stage);
   marker.classList.toggle("is-complete",level<stage||(level===stage&&state.reason==="win"));
  }
  const target=targetFor(state);goal.textContent=String(target);basket.max=target;
  best.textContent=String(bests[(state.randomness?"random":"fixed")+"-"+stage]);
  score.textContent=String(state.score);time.textContent=`${Math.ceil(remainingMs(state,Date.now())/1000)}s`;lives.textContent=String(state.lives);heartArt.textContent="♥".repeat(state.lives)+"♡".repeat(5-state.lives);
  hunger.value=Math.min(HUNGER_MS,hungerRemaining(state));hungerText.textContent=`${(hungerRemaining(state)/1000).toFixed(1)}s`;hunger.classList.toggle("is-low",hungerRemaining(state)<2500);
  basket.value=Math.min(target,state.score);eaten.textContent=String(state.eaten);combo.textContent=String(state.streak);
  pause.textContent=state.pausedAt!==null?"RESUME":"PAUSE";pauseScreen.hidden=state.pausedAt===null||Boolean(state.reason);
  arena.classList.toggle("is-paused",state.pausedAt!==null);
  const buffs:string[]=[];
  if(state.lastBox&&state.elapsed<state.lastBox.at+4000){
   const kind=state.lastBox.kind;
   buffs.push("BOX → "+(contacts.includes(kind as typeof contacts[number])?contactNames[kind as typeof contacts[number]]:powerNames[kind as typeof powers[number]]));
  }
  if(state.webUntil>state.elapsed)buffs.push("WEB "+((state.webUntil-state.elapsed)/1000).toFixed(1)+"s");
  if(state.slipUntil>state.elapsed)buffs.push("SLIPPERY "+Math.ceil((state.slipUntil-state.elapsed)/1000)+"s");
  if(catSize(state)!=="normal")buffs.push(catSize(state).toUpperCase()+" "+Math.ceil((state.sizeUntil-state.elapsed)/1000)+"s");
  if(state.dog)buffs.push("DOG "+Math.ceil((state.dog.until-state.elapsed)/1000)+"s : KEEP MOVING");
if(state.shield)buffs.push("BUBBLE READY");if(state.iceUntil>state.elapsed)buffs.push(`ICE ${Math.ceil((state.iceUntil-state.elapsed)/1000)}s`);if(state.bellUntil>state.elapsed)buffs.push(`BELL ${Math.ceil((state.bellUntil-state.elapsed)/1000)}s`);if(state.cozyUntil>state.elapsed)buffs.push(`COZY ${Math.ceil((state.cozyUntil-state.elapsed)/1000)}s`);
  effects.replaceChildren(...(buffs.length?buffs:["EAT FISH TO REFILL YOUR BELLY"]).map(text=>h("span",{},text)));
  arena.classList.toggle("has-bell",state.bellUntil>state.elapsed);arena.classList.toggle("has-bubble",state.shield);
  for(let i=toasts.length-1;i>=0;i--)if(toasts[i].until<Date.now()){toasts[i].node.remove();toasts.splice(i,1);}
  if(!toasts.length)cursor.classList.remove("is-eating");
  syncCursor();syncObjects();finish();
 }
 function begin(level=0,progress=false):void {
  if(progress&&(!state||state.reason!=="win"||state.level>=LEVEL_TARGETS.length-1))return;
  const seed=random.checked?Math.floor(Math.random()*0x1_0000_0000):0;
  const fresh=progress&&state?advanceLevel(state,Date.now(),seed):newCat(random.checked,Date.now(),seed,level);
  if(!fresh)return;
  if(timer!==null)clearInterval(timer);
  state=fresh;completed=false;pointerStart=null;suppressClick=false;
  for(const node of nodes.values())node.remove();nodes.clear();toasts.splice(0);floatLayer.replaceChildren();
  menu.hidden=true;end.hidden=true;pauseScreen.hidden=true;reflection.hidden=true;random.disabled=true;pause.disabled=false;
  arena.classList.add("is-playing");status.textContent=state.message;moveCursor(arena.clientWidth/2,arena.clientHeight*.65);
  render();timer=setInterval(render,100);
  targetLayer.querySelector<HTMLButtonElement>('[data-kind="fish"]')?.focus({preventScroll:true});
 }
 function togglePause():void {
  if(!state||state.reason)return;pointerStart=null;state=state.pausedAt===null?pauseCat(state,Date.now()):resumeCat(state,Date.now());render();
 }
 random.addEventListener("change",oddsText);
 start.addEventListener("click",()=>begin());
 replay.addEventListener("click",()=>begin(state&&random.checked!==state.randomness?0:state?.reason==="win"&&state.level===LEVEL_TARGETS.length-1?0:state?.level??0));
 restart.addEventListener("click",()=>begin(state?.level??0));
 next.addEventListener("click",()=>begin(0,true));
 other.addEventListener("click",()=>{random.checked=!random.checked;oddsText();begin();});pause.addEventListener("click",togglePause);resume.addEventListener("click",togglePause);
 sound.addEventListener("click",()=>{soundOn=!soundOn;sound.textContent=soundOn?"SOUND ON":"SOUND OFF";sound.setAttribute("aria-pressed",String(soundOn));if(soundOn)playTone("item");});
 arena.addEventListener("pointermove",event=>{
  if(pointerStart&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>8)pointerStart.moved=true;
  if(!state||state.reason||state.pausedAt!==null)return;
  if(event.pointerType==="mouse")arena.classList.add("has-mouse");
  const rect=arena.getBoundingClientRect();moveCursor(event.clientX-rect.left,event.clientY-rect.top);
 });
 arena.addEventListener("pointerdown",event=>{pointerStart={x:event.clientX,y:event.clientY,moved:false};suppressClick=false;const rect=arena.getBoundingClientRect();moveCursor(event.clientX-rect.left,event.clientY-rect.top);});
 arena.addEventListener("pointerup",()=>{suppressClick=pointerStart?.moved??false;pointerStart=null;});
 arena.addEventListener("pointercancel",()=>{pointerStart=null;suppressClick=true;});
 arena.addEventListener("pointerleave",()=>arena.classList.remove("has-mouse"));
 arena.addEventListener("click",event=>{
  if((event.detail>0&&suppressClick)||!state||state.reason||state.pausedAt!==null||!(event.target instanceof Element)||event.target.closest("button,.cat-screen"))return;
  state=emptyClick(state,Date.now());status.textContent=state.message;playTone("bite");render();
 });
 function onVisibility():void {if(document.hidden&&state&&!state.reason&&state.pausedAt===null){pointerStart=null;state=pauseCat(state,Date.now());render();status.textContent="Cat nap: your night paused while this tab was hidden.";}}
 arena.addEventListener("keydown",event=>{
  if(!state||state.reason||state.pausedAt!==null)return;
  const moves:Record<string,[number,number]>={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]};
  const direction=moves[event.key];if(!direction)return;
  event.preventDefault();state=moveCat(state,state.cat.x+direction[0],state.cat.y+direction[1],Date.now());status.textContent=state.message;render();
 });
 document.addEventListener("visibilitychange",onVisibility);oddsText();
 return ()=>{if(timer!==null)clearInterval(timer);document.removeEventListener("visibilitychange",onVisibility);if(audio)void audio.close().catch(()=>{});root.remove();};
}
export const pixelCatPicnic:Minigame={slug:"pixel-cat-picnic",title:"Pixel Cat Picnic",motivators:["chance"],author:"Alicey66",mount};
