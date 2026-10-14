import { h, s } from "../../lib/dom";
import type { Minigame } from "../types";
import { createGame, move, interact, radius, visibility, WORLD, shouldShowCompass, hasEverything, questStage, navigationTargets } from "./game";
import "./fogbound.css";

function mount(el: HTMLElement): () => void {
  let game=createGame(true), running=false, paused=false;
  const keys=new Set<string>();
  let feedback: {x:number;y:number;age:number;color:string} | null=null;
  let victoryShown=false,finalShown=false,boostHeld=false;
  let directionPointer:number|null=null,boostPointer:number|null=null;
  let pointerDirection: [number,number]=[0,0];
  const fog=h("input",{type:"checkbox",checked:true,"data-mechanic":"fog-of-war"});
  const start=h("button",{type:"button","data-start":"",class:"fog-primary"},"Take torch & compass");
  const pause=h("button",{type:"button"},"Pause"); pause.disabled=true;
  const status=h("p",{"data-status":"",class:"fog-status",role:"status"});
  const counts=h("p",{class:"fog-counts"});
  const board=h("div",{tabindex:0,"data-board":"",class:"fog-board",role:"group","aria-label":"Expedition. WASD or arrows to move. Space or E to interact."});
  const svg=s("svg",{viewBox:"0 0 16 12","aria-hidden":"true",class:"fog-world"});
  const hud=h("div",{class:"fog-hud"});
  const collected=h("progress",{max:8,value:0,"aria-label":"Collected treasures"});
  const hudText=h("span",{});
  const quest=h("div",{class:"fog-quest","data-quest":""});
  hud.append(hudText,collected,quest);
  const boostMeter=h("progress",{max:100,value:100,"aria-label":"Boost energy"});
  const boostReadout=h("span",{});
  const boostHud=h("div",{class:"fog-boost-hud",hidden:true},boostReadout,boostMeter);
  const prompt=h("div",{class:"fog-prompt",hidden:true,"data-prompt":""});
  const toast=h("div",{class:"fog-toast",role:"status","data-reward":""});
  const resume=h("button",{type:"button",class:"fog-resume","data-resume":"",hidden:true},"Paused · Click to resume");
  const entry=h("button",{type:"button",class:"fog-resume fog-entry","data-entry":""},
    h("strong",{},"Click to start"),h("span",{},"WASD / arrows · Move"),h("span",{},"E / Space · Open chests & pulse outposts"),h("small",{},"Find supplies. Open both outposts. Keep exploring."));
  const win=h("div",{class:"fog-win",hidden:true},"You win! Outposts secured.");
  const finalWin=h("div",{class:"fog-final-win",hidden:true,role:"status"},h("strong",{},"You got everything!"),h("span",{},"Both outposts · All eight treasures"));
  const defs=s("defs");
  const world=s("g"); const tiles: SVGRectElement[]=[];
  for(let y=0;y<WORLD.height;y++) for(let x=0;x<WORLD.width;x++) {
    const tile=s("rect",{x,y,width:1,height:1}); tiles.push(tile); world.append(tile);
  }
  const entities=s("g"); world.append(entities);
  const halo=s("circle",{cx:8,cy:6,r:2.8,fill:"none",stroke:"#f6d583","stroke-width":0.025,opacity:0.5});
  const player=s("circle",{cx:8,cy:6,r:0.2,fill:"#fff4c8",stroke:"#ac792d","stroke-width":0.06});
  const compass=s("g");
  svg.append(defs,world,halo,player,compass); board.append(svg,hud,boostHud,prompt,toast,win,finalWin,resume,entry);
  const legend=h("p",{class:"fog-legend"},"Gold: chest · Red: sealed outpost · Blue: opened · Dim: explored terrain");
  const action=h("button",{type:"button",class:"fog-primary","data-interact":""},"Pulse / open chest");
  const boostButton=h("button",{type:"button",class:"fog-boost-button","data-boost":"",hidden:true},"Hold Boost · Shift");
  boostButton.addEventListener("pointerdown",e=>{if(running&&!paused&&game.boostUnlocked){e.preventDefault();boostHeld=true;boostPointer=e.pointerId;}});
  boostButton.addEventListener("keydown",e=>{if((e.key===" "||e.key==="Enter"||e.key==="Shift")&&running&&!paused){e.preventDefault();boostHeld=true;}});
  boostButton.addEventListener("keyup",()=>{boostHeld=false;});
  boostButton.addEventListener("blur",()=>{boostHeld=false;});
  const pad=h("div",{class:"fog-pad","aria-label":"Movement controls"});
  const buttons: [string,number,number][]=[["↖",-1,-1],["↑",0,-1],["↗",1,-1],["←",-1,0],["·",0,0],["→",1,0],["↙",-1,1],["↓",0,1],["↘",1,1]];
  for(const [label,dx,dy] of buttons) {
    const btn=h("button",{type:"button","aria-label":dx===0&&dy===0 ? "Stop" : `Move ${dy<0?"north":dy>0?"south":""}${dx<0?"west":dx>0?"east":""}`},label);
    btn.addEventListener("pointerdown",e=>{e.preventDefault(); if(running&&!paused) { directionPointer=e.pointerId;pointerDirection=[dx,dy]; move(game,dx,dy,0.12,boostHeld||keys.has("Shift")||e.shiftKey); render(); } });
    btn.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ") { e.preventDefault(); if(running&&!paused) {move(game,dx,dy,0.25,boostHeld||keys.has("Shift")||e.shiftKey);render();} }});
    pad.append(btn);
  }
  const journal=h("ul",{class:"fog-journal"});
  let journalCount=-1;
  const reflection=h("section",{class:"fog-reflection",hidden:true},
    h("h4",{},"What did you discover?"),
    h("p",{"data-result":""}),
    h("p",{},"Where did you choose to leave the compass route? What did you feel before and after opening a chest?"),
    h("p",{},"Try again with fog off. What changed in your route, curiosity or frustration? The second round may be easier because you remember the layout."));
  const root=h("div",{class:"fogbound"},
    h("header",{class:"fog-heading"},h("div",{},h("h3",{},"Fogbound"),h("p",{},"Leave a light. Find what lies between.")),
      h("label",{class:"fog-toggle"},fog," Fog of war")),
    h("p",{class:"fog-instructions"},"Open chests for supplies. Each outpost uses 1 supply and takes 3 pulses. Follow your current quest and discover what comes next. WASD / arrows: move · Space / E: interact. Mouse and touch: hold direction buttons."),
    board,counts,status,
    h("div",{class:"fog-controls"},pad,h("div",{class:"fog-actions"},action,boostButton,start,pause)),legend,h("details",{},h("summary",{},"Collected relics"),journal),reflection);
  el.append(root);
  let lastMessage="";
  function render(): void {
    world.setAttribute("transform",`translate(${8-game.player.x} ${6-game.player.y})`);
    board.setAttribute("data-player-x",String(game.player.x));
    board.setAttribute("data-player-y",String(game.player.y));
    halo.setAttribute("r",String(radius(game))); halo.setAttribute("visibility",game.fog ? "visible":"hidden");
    player.setAttribute("r",String(0.2+game.outposts.filter(o=>o.open).length*0.035));
    tiles.forEach((tile,i)=>{
      const x=i%WORLD.width,y=Math.floor(i/WORLD.width),v=visibility(game,x,y),wall=WORLD.walls.has(`${x},${y}`);
      const color=v==="hidden"?"#101b26":wall?(v==="lit"?"#778b94":"#35434c"):(v==="lit"?((x+y)%2?"#314c52":"#2d474e"):"#1e2e37");
      if(tile.getAttribute("fill")!==color) {
        tile.setAttribute("fill",color);tile.setAttribute("stroke",v==="hidden"?color:"#263c43");tile.setAttribute("stroke-width","0.025");
      }
    });
    entities.replaceChildren();
    const stage=questStage(game),targets=navigationTargets(game);
    const questLabels={outposts:`Open outposts ${game.outposts.filter(p=>p.open).length}/2`,map:"Claim the treasure map",stars:"Find the star relics",chests:"Open the remaining chests",complete:"Exploration complete"};
    quest.textContent=`Quest: ${questLabels[stage]}`;
    hudText.textContent=`Supplies ${game.supplies} · Discoveries ${game.chests.filter(c=>c.open).length}`;
    collected.value=game.chests.filter(c=>c.open).length;
    boostHud.hidden=!game.boostUnlocked;boostButton.hidden=!game.boostUnlocked;
    boostButton.disabled=!running||paused;
    boostMeter.value=game.boost;
    boostReadout.textContent=`${game.boosting?"Boosting":"Boost"} ${Math.ceil(game.boost)}% · Shift · Release to recharge`;
    player.setAttribute("fill",game.boosting?"#a9efff":"#fff4c8");
    if(hasEverything(game)&&!finalShown){finalShown=true;finalWin.hidden=false;win.hidden=true;}

    if(collected.value!==journalCount) {
      journalCount=collected.value;
      journal.replaceChildren(...game.chests.filter(c=>c.open).map(c=>h("li",{},`${c.rare?"★ ":""}${c.name}: ${c.story}`)));
      if(!journalCount)journal.append(h("li",{},"Your discoveries will appear here."));
    }
    const nearChest=game.chests.find(c=>!c.open&&Math.hypot(c.x-game.player.x,c.y-game.player.y)<1.3);
    const nearPost=game.outposts.find(p=>!p.open&&Math.hypot(p.x-game.player.x,p.y-game.player.y)<1.5);
    prompt.hidden=!running||paused||(!nearChest&&!nearPost);
    prompt.textContent=nearChest?nearChest===game.chests[3]&&!game.finished?"Treasure map · Open both outposts first":`E / Space · Open ${nearChest.rare?"star relic":nearChest===game.chests[3]?"treasure map":"chest"}`:nearPost?(nearPost.hits===0?`E / Space · Activate · 1 supply ${game.supplies?"":"needed"}`:`E / Space · Pulse · ${nearPost.hits}/3`):"";
    const nearby=nearChest??nearPost;
    if(nearby) {prompt.style.left=`${Math.max(25,Math.min(75,(8+nearby.x-game.player.x)/16*100))}%`;prompt.style.top=`${(6+nearby.y-game.player.y-0.5)/12*100}%`;}
    resume.hidden=!paused;entry.hidden=running;
    board.classList.toggle("fog-paused",paused);
    if(game.finished&&!victoryShown) {victoryShown=true;win.hidden=false;win.classList.add("fog-win-enter");}
    if(feedback) {
      const age=feedback.age;
      const burst=s("g",{opacity:Math.max(0,1-age/0.7)});
      burst.append(s("circle",{cx:feedback.x,cy:feedback.y,r:0.3+age*2,fill:"none",stroke:feedback.color,"stroke-width":0.05}));
      for(let i=0;i<8;i++) {const a=i*Math.PI/4;burst.append(s("circle",{cx:feedback.x+Math.cos(a)*age*2,cy:feedback.y+Math.sin(a)*age*2-age*0.5,r:0.06,fill:feedback.color}));}
      entities.append(burst);
    }
    const flag=(x:number,y:number,color:string,label:string)=>s("g",{},s("circle",{cx:x,cy:y,r:0.65,fill:color,opacity:0.14}),s("path",{d:`M ${x-0.15} ${y+0.3} v -0.8 l 0.6 0.2 -0.6 0.2`,fill:color,stroke:color,"stroke-width":0.07}),s("text",{x,y:y+0.9,"text-anchor":"middle","font-size":0.28,fill:color},label));
    if(visibility(game,3,19)!=="hidden") entities.append(flag(3.5,19.5,"#86c9f4","Camp"));
    for(const [i,p] of game.outposts.entries()) {
      const v=visibility(game,Math.floor(p.x),Math.floor(p.y));
      if(v==="hidden") continue;
      const marker=flag(p.x,p.y,p.open?"#86c9f4":"#ff9686",p.open?"Opened":`Outpost ${i+1} · ${p.hits}/3`);
      for(let segment=0;segment<3;segment++) marker.append(s("rect",{x:p.x-0.45+segment*0.32,y:p.y+1.05,width:0.27,height:0.12,fill:segment<p.hits?"#86c9f4":"#624449"}));
      marker.setAttribute("opacity",v==="memory"?"0.45":"1"); entities.append(marker);
    }
    for(const c of game.chests) {
      const v=visibility(game,Math.floor(c.x),Math.floor(c.y)); if(v==="hidden"&&!targets.includes(c)) continue;
      const marker=s("g",{opacity:v==="memory"&&!targets.includes(c)?0.4:1},
        c.rare?s("text",{x:c.x,y:c.y+0.2,"text-anchor":"middle","font-size":0.65,fill:c.open?"#625b48":"#f5c975"},"★"):s("rect",{x:c.x-0.25,y:c.y-0.18,width:0.5,height:0.36,rx:0.04,fill:c.open?"#625b48":"#f5c975",stroke:"#f5d99c","stroke-width":0.04}),
        s("text",{x:c.x,y:c.y+0.65,"text-anchor":"middle","font-size":0.25,fill:"#ffe1a2"},c.open?c.name:c.rare?"★ Star relic":"Chest")); entities.append(marker);
    }
    compass.replaceChildren();
    for(const target of targets) {
    if(shouldShowCompass(game,target)) {
      const dx=target.x-game.player.x,dy=target.y-game.player.y;
      const scale=Math.max(Math.abs(dx)/6.7,Math.abs(dy)/4.7,1);
      const x=8+dx/scale,y=6+dy/scale,angle=Math.atan2(dy,dx)*180/Math.PI;
      // When on-screen but hidden, the compass remains a direction cue, not an exact marker.
      const offscreen=scale>1;
      const px=offscreen?x:8+Math.cos(angle*Math.PI/180)*5.2;
      const py=offscreen?y:6+Math.sin(angle*Math.PI/180)*4.2;
      const symbol=stage==="stars"?"★":stage==="chests"?"▣":stage==="map"?"Map":"";
      compass.append(s("g",{"data-navigation":stage},s("path",{d:"M -.3 -.22 L .3 0 L -.3 .22 Z",fill:"#f6d583",transform:`translate(${px} ${py}) rotate(${angle})`}),s("text",{x:px,y:py+0.5,"text-anchor":"middle","font-size":0.3,fill:"#ffe1a2"},symbol)));
    }
    }
    counts.textContent=`Outposts ${game.outposts.filter(p=>p.open).length}/2    ·    Discoveries ${game.chests.filter(c=>c.open).length}    ·    Torch ${radius(game).toFixed(1)}    ·    ${Math.floor(game.elapsed)}s`;
    const text=paused?"Paused. Resume when ready.":!running?`${game.fog?"Fog on":"Fog off"}. Click the game to begin. Switching fog starts a fresh expedition.`:game.message;
    if(text!==lastMessage) {status.textContent=text;lastMessage=text;}
    action.disabled=!running||paused;
    reflection.hidden=!game.finished;
    if(game.finished && game.completion) {
      reflection.querySelector("[data-result]")!.textContent=`${game.fog?"Fog on":"Fog off"}: ${Math.floor(game.completion.elapsed)} seconds to win, ${game.completion.chests} discoveries at win, ${Math.round(game.completion.distance)} tiles traveled at win. Current collection: ${game.chests.filter(c=>c.open).length}. These are run statistics, not a report of your feelings.`;
    }
  }
  const directions: Record<string,[number,number]>={w:[0,-1],ArrowUp:[0,-1],s:[0,1],ArrowDown:[0,1],a:[-1,0],ArrowLeft:[-1,0],d:[1,0],ArrowRight:[1,0]};
  const clear=()=>{keys.clear();pointerDirection=[0,0];game.speed=0;game.velocity={x:0,y:0};game.boosting=false;boostHeld=false;directionPointer=null;boostPointer=null;};
  function setPaused(value:boolean):void {
    if(!running)return;
    paused=value;clear();pause.textContent=value?"Resume":"Pause";render();
  }
  function performInteraction():void {
    if(!running||paused)return;
    const before=game.chests.filter(c=>c.open).length+game.outposts.reduce((n,p)=>n+p.hits,0);
    const target=game.chests.find(c=>!c.open&&Math.hypot(c.x-game.player.x,c.y-game.player.y)<1.3)??game.outposts.find(p=>!p.open&&Math.hypot(p.x-game.player.x,p.y-game.player.y)<1.5);
    interact(game);
    if(before!==game.chests.filter(c=>c.open).length+game.outposts.reduce((n,p)=>n+p.hits,0)) {
      feedback={x:target?.x??game.player.x,y:target?.y??game.player.y,age:0,color:target&&"hits" in target?"#86c9f4":"#f5c975"};
      player.classList.remove("fog-player-pop");void player.getBoundingClientRect();player.classList.add("fog-player-pop");
    }
    toast.replaceChildren(h("span",{class:"fog-toast-enter"},game.message));render();
  }
  resume.addEventListener("click",()=>{board.focus();setPaused(false);});
  board.addEventListener("click",e=>{if(e.target===resume)return;if(!running)begin();else {board.focus();if(paused)setPaused(false);}});
  entry.addEventListener("click",e=>{e.stopPropagation();begin();});
  root.addEventListener("focusout",e=>{if(!root.contains(e.relatedTarget as Node|null))setPaused(true);});
  const outside=(e:Event)=>{if(!root.contains(e.target as Node))setPaused(true);};
  document.addEventListener("pointerdown",outside);
  const loseFocus=()=>setPaused(true);
  const releasePointer=(e:PointerEvent)=>{
    if(e.pointerId===directionPointer){pointerDirection=[0,0];directionPointer=null;}
    if(e.pointerId===boostPointer){boostHeld=false;boostPointer=null;}
  };
  board.addEventListener("keydown",e=>{
    const k=e.key.length===1?e.key.toLowerCase():e.key;
    if(k==="Shift") {e.preventDefault();keys.add(k);}
    if(directions[k]) {e.preventDefault();keys.add(k);}
    if((k===" "||k==="e")&&!e.repeat&&running&&!paused) {e.preventDefault();performInteraction();}
  });
  board.addEventListener("keyup",e=>{keys.delete(e.key.length===1?e.key.toLowerCase():e.key);});
  board.addEventListener("blur",clear);
  window.addEventListener("blur",loseFocus);
  window.addEventListener("pointerup",releasePointer);
  window.addEventListener("pointercancel",releasePointer);
  const visibilityChange=()=>{if(document.hidden)setPaused(true);};
  document.addEventListener("visibilitychange",visibilityChange);
  function begin():void {
    // Focus before hiding a focused overlay, avoiding a null-target blur pause.
    board.focus();game=createGame(fog.checked);feedback=null;victoryShown=false;finalShown=false;finalWin.hidden=true;win.hidden=true;win.classList.remove("fog-win-enter");toast.replaceChildren();running=true;paused=false;clear();start.textContent="Restart expedition";pause.disabled=false;pause.textContent="Pause";render();
  }
  start.addEventListener("click",begin);
  fog.addEventListener("change",()=>{game=createGame(fog.checked);feedback=null;victoryShown=false;finalShown=false;finalWin.hidden=true;win.hidden=true;win.classList.remove("fog-win-enter");toast.replaceChildren();running=false;paused=false;clear();start.textContent="Take torch & compass";pause.disabled=true;pause.textContent="Pause";render();});
  pause.addEventListener("click",()=>{paused=!paused;clear();pause.textContent=paused?"Resume":"Pause";render();if(!paused)board.focus();});
  action.addEventListener("click",()=>{if(running&&!paused) {performInteraction();board.focus();}});
  let lastTick=Date.now();
  const timer=setInterval(()=>{
    const now=Date.now(),seconds=(now-lastTick)/1000;lastTick=now;
    if(!running||paused) return;
    let [dx,dy]=pointerDirection;
    for(const k of keys) {if(directions[k]){dx+=directions[k][0];dy+=directions[k][1];}}
    if(feedback) {feedback.age+=seconds;if(feedback.age>0.7)feedback=null;}
    move(game,Math.sign(dx),Math.sign(dy),Math.min(seconds,0.1),boostHeld||keys.has("Shift"));game.elapsed+=seconds;render();
  },16);
  render();
  return ()=>{clearInterval(timer);window.removeEventListener("blur",loseFocus);window.removeEventListener("pointerup",releasePointer);window.removeEventListener("pointercancel",releasePointer);document.removeEventListener("pointerdown",outside);document.removeEventListener("visibilitychange",visibilityChange);root.remove();};
}
export const fogbound: Minigame={slug:"fogbound",title:"Fogbound: leave a light",motivators:["discovery"],author:"JarrettChen217",mount};
