import { h, s } from "../../lib/dom";
import type { Minigame } from "../types";
import { advance, chartFor, complete, distance, findPath, finished, fire, FIRE_INTERVAL, inInk, key, leviathanStage, musicFor, newDive, noticeFor, pulse, repair, setFog, signal, start, togglePause, vesselEvolution, visible, weaponDamage, weaponRange, type Direction, type Dive, type Input, type Point } from "./game";
import { createAudio, TRACK_NAMES } from "./audio";
import { createScene, drawMinimap, viewportHeight, viewportWidth } from "./scene";
import { bindTouchStick } from "./touch";
import "./echoes-below.css";
let mounts = 0;
const col = (x: number) => String.fromCharCode(65 + x % 26) + (x >= 26 ? "′" : "");
const coordinateOf = (p: { x: number; y: number }) => `${col(Math.round(p.x))}${String(Math.round(p.y) + 1).padStart(2, "0")}`;

function mount(host: HTMLElement): () => void {
  const uid = `eb${++mounts}`;
  let dive = newDive(), chartId = 0;
  const root = h("section", { class: "eb", lang: "en", "aria-label": "Echoes Below: Abyssal Expedition" });
  const touchLayout = window.matchMedia?.("(any-pointer: coarse) and (max-width: 1100px)");
  const soundButton = h("button", { class: "eb-button eb-sound", type: "button", "data-sound": "", "aria-pressed": "true" }, "♫ Enable sound");
  const track = h("span", { "data-track": "" }, TRACK_NAMES.explore);
  const musicLabel = h("span", { class: "eb-music-state" }, "Start a dive to enable sound");
  let audioRunning = false, audioEnabled = true;
  const audio = createAudio((status) => {
    audioRunning = status.running; audioEnabled = status.enabled;
    root.dataset.audioRunning = String(status.running); root.dataset.audioScheduled = String(status.scheduled); root.dataset.music = status.scene;
    soundButton.textContent = !status.available ? "♫ Sound unavailable" : !status.enabled ? "♫ Sound off" : status.running ? "♫ Sound on" : dive.phase==="paused" ? "♫ Sound paused" : "♫ Enable sound";
    soundButton.setAttribute("aria-pressed", String(status.enabled));
    musicLabel.textContent = !status.enabled ? "Muted" : status.running ? "Playing" : dive.phase==="paused" ? "Paused with dive" : "Start a dive to enable sound";
    root.classList.toggle("is-playing", status.enabled && status.running);
  });
  const coordinate = h("span", { class: "eb-coordinates", "data-coordinate": "" });
  const region = h("span", { class: "eb-region" });
  const mode = h("span", { class: "eb-view-label" });
  const board = h("div", { class: "eb-board", tabindex: 0, role: "group", "aria-label": "Move with arrows or WASD. Point the mouse to turn the bow. Hold Space to fire forward. Q scans, R repairs, Esc pauses.", "data-board": "" });
  const ocean = s("svg", { class: "eb-ocean", role: "img", "aria-label": "Underwater viewport following the submarine" });
  const targetLabel = h("span", { "data-target": "" });
  const bossName = h("span", {}, "LEVIATHAN"), bossHealth = h("b", {"data-boss-health":""});
  const bossMeter = h("div", {role:"progressbar","aria-label":"Leviathan health","aria-valuemin":0});
  const bossBar = h("div", { class: "eb-boss-bar", hidden: true }, h("header", {}, bossName, bossHealth), bossMeter);
  const bossFill = h("i", {}); bossMeter.append(bossFill,h("em", {style:"left:30%"}),h("em", {style:"left:65%"}));
  const eventTag = h("span", { class: "eb-event-tag" }, "EXPLORE");
  const message = h("p", { class: "eb-status", role: "status", "aria-live": "polite", "data-status": "" });
  const hullValue = h("strong", { "data-hull": "" });
  const hullFill = h("i", {});
  const hullBar = h("div", { class: "eb-hull-track", role: "progressbar", "aria-label": "Hull integrity", "aria-valuemin": 0 }, hullFill);
  const weaponValue = h("strong", { "data-weapon": "" }), ammoValue = h("strong", { "data-ammo": "" }), sonarValue = h("strong", {}), shieldValue = h("strong", {});
  const beaconValue = h("strong", { "data-restored": "" }), charted = h("span", { "data-charted": "" }), turns = h("span", { "data-moves": "" });
  const signalText = h("span", { "data-signal": "" });
  const beaconRows = [0, 1, 2].map((i) => h("li", {}, h("span", { class: "eb-number" }, `0${i + 1}`), h("span", {}, ["Glimmer", "Tide", "Far Shore"][i]), h("span", {})));
  const minimap = s("svg", { class: "eb-minimap", role: "img", "aria-label": "Sea chart. The gold marker shows your submarine." });
  const fog = h("input", { type: "checkbox", checked: true, id: `${uid}-fog`, "data-mechanic": "fog-of-war", "aria-keyshortcuts":"F", title:"Toggle chart fog (F). Space fires missiles." });
  const fogCopy = h("span", { class: "eb-fog-copy" });
  const log = h("ol", { class: "eb-log", "aria-label": "Discovery log" });
  const fireButton = h("button", { class: "eb-action eb-fire", type: "button", "data-fire": "" }, h("span", {}, "⌁"), h("span", {}, "Fire missiles", h("small", {}, "Hold Space / Forward fire")));
  const pulseButton = h("button", { class: "eb-action", type: "button", "data-pulse": "" });
  const repairButton = h("button", { class: "eb-action", type: "button", "data-repair": "" });
  const pauseButton = h("button", { class: "eb-wait", type: "button", "data-pause": "" }, "Start dive");
  const restart = h("button", { class: "eb-button eb-restart", type: "button", "data-restart": "" }, "↻ Restart dive");
  const next = h("button", { class: "eb-button", type: "button", "data-next-chart": "" }, "New chart ↗");
  const reflection = h("div", { class: "eb-reflection", hidden: true, "data-reflection": "" });
  const dpad = h("div", { class: "eb-dpad", "aria-label": "Directional controls" });
  const moveThumb = h("span", { class: "eb-stick-thumb", "aria-hidden": "true" }, "✥");
  const aimThumb = h("span", { class: "eb-stick-thumb", "aria-hidden": "true" }, "⌖");
  const movePad = h("button", { type: "button", class: "eb-stick eb-move-stick", "data-touch-move": "", "aria-label": "Move joystick: drag in any direction" }, moveThumb);
  const aimPad = h("button", { type: "button", class: "eb-stick eb-aim-stick", "data-touch-aim": "", "aria-label": "Aim and fire joystick: hold to shoot, drag to turn the bow" }, aimThumb);
  const touchControls = h("div", { class: "eb-touch-controls", "aria-label": "Two-thumb controls" },
    h("div", { class: "eb-stick-group" }, movePad, h("span", {}, "MOVE")),
    h("div", { class: "eb-touch-hint" }, h("strong", {}, "TWO THUMBS"), h("span", {}, "Drag to move"), h("span", {}, "Hold + drag to fire")),
    h("div", { class: "eb-stick-group" }, aimPad, h("span", {}, "AIM + FIRE")));
  const touchPulse = h("button", { type: "button", "data-touch-pulse": "", "aria-label": "Sonar scan" }, "Scan");
  const touchRepair = h("button", { type: "button", "data-touch-repair": "", "aria-label": "Repair hull" }, "Repair");
  const touchFog = h("button", { type: "button", "data-touch-fog": "", "aria-label": "Toggle chart fog" }, "Fog on");
  const touchPause = h("button", { type: "button", "data-touch-pause": "" }, "Pause");
  const touchSound = h("button", { type: "button", "data-touch-sound": "", "aria-label": "Toggle sound" }, "Sound");
  const touchExit = h("button", { type: "button", "data-touch-exit": "", "aria-label": "Pause and return to page" }, "Notes ↗");
  const touchToolbar = h("div", { class: "eb-touch-toolbar", "aria-label": "Dive actions" }, touchPulse, touchRepair, touchFog, touchPause, touchSound, touchExit);
  const touchStatus = h("div", { class: "eb-touch-status" }, h("strong", { "data-touch-beacons": "" }), h("span", { "data-touch-signal": "" }));
  const touchLaunch = h("button", { type: "button", class: "eb-button eb-touch-launch", "data-touch-launch": "" }, "Open touch cockpit ↗");
  for (const [direction, arrow, label] of [["up", "↑", "Move north"], ["left", "←", "Move west"], ["down", "↓", "Move south"], ["right", "→", "Move east"]] as const) {
    const button = h("button", { class: `eb-direction eb-${direction}`, type: "button", "data-direction": direction, "aria-label": label }, arrow);
    bindDirection(button, direction); dpad.append(button);
  }
  const toastTitle = h("strong", {"data-loot-title":""});
  const toastDetail = h("span", {"data-loot-detail":""});
  const toast = h("div", {class:"eb-loot-toast",hidden:true,"data-loot-toast":"",role:"status","aria-live":"polite"}, h("i",{"aria-hidden":"true"},"✦"),toastTitle,toastDetail);
  const startTitle = h("h3", {}, "The sea will not wait.");
  const startCopy = h("p", {}, "Move continuously. Space fires; Esc pauses. Gather upgrades before entering the abyss.");
  const startButton = h("button", {type:"button",class:"eb-button eb-start","data-start":""}, "Start dive →");
  const overlay = h("div",{class:"eb-start-overlay","data-start-overlay":""},h("span",{class:"eb-eyebrow"},"REALTIME EXPEDITION"),startTitle,startCopy,startButton);
  const hurtOverlay = h("div",{class:"eb-hurt-overlay","aria-hidden":"true"});
  const inkOverlay = h("div",{class:"eb-ink-overlay","aria-hidden":"true"});
  const threat = h("div",{class:"eb-threat-banner",hidden:true,"data-threat":"",role:"status"});
  board.append(ocean,toast,overlay,hurtOverlay,inkOverlay,threat,
    h("div", { class: "eb-board-heading" }, h("span", {}, "● LIVE / DIVE LINK"), region, coordinate),
    h("div", { class: "eb-view-stamp", "aria-hidden": "true" }, h("span", {}, "ABYSSAL SURVEY"), mode),
    h("div", { class: "eb-crosshair eb-crosshair-tl", "aria-hidden": "true" }), h("div", { class: "eb-crosshair eb-crosshair-br", "aria-hidden": "true" }),
    bossBar,
    h("div", { class: "eb-board-bottom" }, h("span", {}, "◈ 30 × 20 CHART / FOLLOW CAMERA"), targetLabel));
  const hud = h("div", { class: "eb-hud" },
    h("div", { class: "eb-hull" }, h("div", {}, h("span", {}, "HULL INTEGRITY"), hullValue), hullBar),
    h("div", { class: "eb-hud-stat" }, h("span", {}, "WEAPON"), weaponValue),
    h("div", { class: "eb-hud-stat" }, h("span", {}, "MISSILE"), ammoValue),
    h("div", { class: "eb-hud-stat" }, h("span", {}, "SONAR"), sonarValue),
    h("div", { class: "eb-hud-stat" }, h("span", {}, "SHIELD"), shieldValue));
  const vesselName=h("strong", {"data-vessel-name":""}),evolutionCopy=h("span",{}),evolutionFill=h("i",{});
  const evolutionPanel=h("div",{class:"eb-evolution"},h("span",{class:"eb-evolution-mark","aria-hidden":"true"},"◈"),vesselName,h("div",{class:"eb-evolution-track"},evolutionFill),evolutionCopy);
  root.append(
    h("div", { class: "eb-masthead" }, h("span", { class: "eb-brand" }, h("i", {}, "◉"), " ABYSSAL / DEEP SEA OBSERVATORY"), h("div", { class: "eb-masthead-right" }, h("span", { class: "eb-version" }, "ABYSS V.1"), soundButton)),
    h("header", { class: "eb-heading" }, h("div", {}, h("p", { class: "eb-eyebrow" }, "WHERE THE LIGHT ENDS, THE EXPEDITION BEGINS"), h("h2", {}, "Echoes Below", h("em", {}, "Abyssal Expedition")), h("p", { class: "eb-subtitle" }, "Explore sunken ruins. Evolve your vessel. Face what waits below.")), h("div", { class: "eb-depth" }, "2,840", h("small", {}, "METERS BELOW THE SURFACE"))),
    touchLaunch,
    h("div", { class: "eb-layout" },
      h("div", { class: "eb-main" }, hud, evolutionPanel, touchToolbar, board,
        h("div", { class: "eb-event" }, eventTag, message),
        touchControls, touchStatus,
        h("div", { class: "eb-controls" }, h("div", { class: "eb-combat-controls" }, fireButton, pulseButton, repairButton, pauseButton), dpad)),
      h("aside", { class: "eb-sidebar", "aria-label": "Expedition instruments" },
        h("section", { class: "eb-mission" }, h("p", { class: "eb-eyebrow" }, "01 / THE SIGNALS"), h("div", { class: "eb-section-title" }, h("h3", {}, "Restore the network"), beaconValue), h("ul", { class: "eb-beacons" }, ...beaconRows), h("p", { class: "eb-goal" }, "Restore all three beacons and defeat the Leviathan.")),
        h("section", { class: "eb-map-section" }, h("div", { class: "eb-section-title" }, h("p", { class: "eb-eyebrow" }, "02 / CHARTED WATERS"), charted), minimap, h("p", { class: "eb-sonar-reading" }, h("span", {}, "◌ Nearest objective"), signalText)),
        h("section", { class: "eb-music-panel" }, h("div", { class: "eb-music-bars", "aria-hidden": "true" }, ...[1, 2, 3, 4, 5].map((i) => h("i", { style: `--i:${i}` }))), h("div", {}, h("p", { class: "eb-eyebrow" }, "DYNAMIC SCORE"), track, musicLabel)),
        h("section", { class: "eb-fog-panel" }, h("label", { for: fog.id, class: "eb-fog-label" }, h("span", {}, "Chart fog · F"), h("span", { class: "eb-switch" }, fog, h("i", { "aria-hidden": "true" }))), fogCopy)),
    ),
    reflection,
    h("div", { class: "eb-lower" },
      h("section", {}, h("p", { class: "eb-eyebrow" }, "FIELD NOTES / Discovery log"), log),
      h("section", { class: "eb-guide" }, h("p", { class: "eb-eyebrow" }, "EXPEDITION MANUAL / HOW TO DIVE"),
        h("p", {}, "Move with arrows / WASD. Point inside the viewport to turn the bow; hold Space to fire straight ahead. Outside the viewport, your heading follows movement. Q scans, R repairs, F toggles chart fog, Esc pauses. On phones, drag the left stick to move; hold and drag the right stick to aim and fire."),
        h("p", {}, "Enemies patrol and pursue in real time. Red lines warn of submarine locks, cones show charges, and purple rings mark shockwaves. Dodge the warnings and use reefs as cover."),
        h("p", {}, "Every three permanent upgrades unlock a new hull, up to four forms. Supplies and beacons do not count. Encounters become more dangerous farther from base."),
        h("p", {}, "Thirty-three enemies inhabit this sea. Lantern Maws ambush, Prism Cuttles leave slowing ink, and Crystal Urchins launch radial spikes. Urchin cores are vulnerable during windup. Keep out of ink and avoid getting surrounded."),
        h("div", { class: "eb-enemy-key" }, h("span", {}, "◈ Hunters / Swarms"), h("span", {}, "◎ Pulse Jelly"), h("span", {}, "⋈ Venom Ray"), h("span", {}, "✧ Abyss Ripper"), h("span", {}, "▰ HOSTILE SUB"), h("span", {}, "◉ Lantern Maw"), h("span", {}, "⋇ Prism Cuttle"), h("span", {}, "✺ Crystal Urchin"), h("span", {}, "♆ Leviathan")))),
    h("footer", { class: "eb-footer" }, h("span", {}, "Every distant light is worth a dive.", h("small", {}, "DISCOVERY · EXPLORATION · SURVIVAL")), h("span", { class: "eb-turns" }, "Travel ", turns, " cells"), h("div", {}, restart, next)));
  host.append(root);
  let scene = createScene(ocean, dive, uid);


  const heldKeys = new Set<string>(), pointerDirections = new Map<number,Direction>();
  let tapDirection:Direction|null=null,tapUntil=0,fireHeld=false,fireTapUntil=0,firePointer:number|null=null,aimCursor:Point|null=null;
  let touchMove:Point={x:0,y:0},touchAim:number|null=null,touchFire=false;
  let movementStick:ReturnType<typeof bindTouchStick>|undefined,aimingStick:ReturnType<typeof bindTouchStick>|undefined;
  let navigation:Point[]=[],goal:Point|null=null,lastFrame=performance.now(),accumulator=0,lastHud=-99,lastMap=-99;
  let disposed=false,frameId=0,lastPlayerFired=-99,lastHurt=-99,lastToast=-1,lastPulse=-1;
  let toastAnimation:Animation|null=null;
  const enemyAudioMemo=new Map<string,{phase:string;fired:number;nextMove:number}>();
  const requestFrame=(callback:FrameRequestCallback):number=>typeof window.requestAnimationFrame==="function"?window.requestAnimationFrame(callback):window.setTimeout(()=>callback(performance.now()),16);
  const cancelFrame=(handle:number):void=>{if(typeof window.cancelAnimationFrame==="function")window.cancelAnimationFrame(handle);else window.clearTimeout(handle);};

  function setCockpit(active:boolean):void {clearControls();root.classList.toggle("is-touch-cockpit",active&&!!touchLayout?.matches);}
  function configureTouch():void {root.classList.toggle("has-touch-controls",!!touchLayout?.matches);if(!touchLayout?.matches)setCockpit(false);renderHud();}
  function begin():void { if(dive.phase==="ready"){if(touchLayout?.matches&&!root.classList.contains("is-touch-cockpit"))setCockpit(true);dive=start(dive);lastFrame=performance.now();accumulator=0;void audio.unlock();renderHud();} }
  function clearControls():void {movementStick?.reset();aimingStick?.reset();touchMove={x:0,y:0};touchAim=null;touchFire=false;heldKeys.clear();pointerDirections.clear();tapDirection=null;tapUntil=0;fireHeld=false;firePointer=null;fireTapUntil=0;aimCursor=null;navigation=[];goal=null;}
  function pause():void {
    const previous=dive.phase;dive=togglePause(dive);clearControls();accumulator=0;lastFrame=performance.now();
    audio.setPaused(dive.phase==="paused");if(previous==="ready"||dive.phase==="playing")void audio.unlock();renderHud();
  }
  function act(action:(state:Dive)=>Dive):void {begin();dive=action(dive);renderHud();}
  function bindDirection(button:HTMLButtonElement,direction:Direction):void {
    button.addEventListener("pointerdown",event=>{
      event.preventDefault();if(dive.phase==="paused"||finished(dive))return;
      begin();pointerDirections.set(event.pointerId,direction);tapDirection=direction;tapUntil=performance.now()+280;navigation=[];goal=null;
      try{button.setPointerCapture(event.pointerId);}catch{/* synthetic pointers may not support capture */}
    });
    button.addEventListener("click",event=>{if(event.detail===0){begin();tapDirection=direction;tapUntil=performance.now()+280;navigation=[];goal=null;}});
  }
  function releasePointer(event:PointerEvent):void {pointerDirections.delete(event.pointerId);if(event.pointerId===firePointer){fireHeld=false;firePointer=null;}}
  function manualAim():Point|null {if(touchAim!==null)return{x:dive.position.x+Math.cos(touchAim)*4,y:dive.position.y+Math.sin(touchAim)*4};if(!aimCursor)return null;const width=viewportWidth(ocean),camera=scene.camera();return{x:camera.x+aimCursor.x*width-.5,y:camera.y+aimCursor.y*viewportHeight(ocean,width)-.5};}
  const keyDirections:Record<string,Direction>={ArrowUp:"up",ArrowRight:"right",ArrowDown:"down",ArrowLeft:"left",w:"up",d:"right",s:"down",a:"left"};
  function directionVector(direction:Direction):Point {return{x:direction==="left"?-1:direction==="right"?1:0,y:direction==="up"?-1:direction==="down"?1:0};}
  function inputAt(now:number):Input{
    let x=touchMove.x,y=touchMove.y;const directions=new Set<Direction>();for(const key of heldKeys){if(keyDirections[key])directions.add(keyDirections[key]);}for(const direction of pointerDirections.values())directions.add(direction);if(tapDirection&&now<tapUntil)directions.add(tapDirection);
    for(const direction of directions){const d=directionVector(direction);x+=d.x;y+=d.y;}
    if(x||y){navigation=[];goal=null;}
    else if(navigation.length){while(navigation.length&&distance(dive.position,navigation[0])<.23)navigation.shift();if(navigation[0]){const next=navigation[0];const n=Math.max(1,distance(dive.position,next));x=(next.x-dive.position.x)/n;y=(next.y-dive.position.y)/n;}else goal=null;}
    const aim=manualAim();return{x,y,fire:touchFire||fireHeld||heldKeys.has(" ")||now<fireTapUntil,...(aim&&distance(aim,dive.position)>.2?{aim:Math.atan2(aim.y-dive.position.y,aim.x-dive.position.x)}:{})};
  }
  function renderHud():void {
    root.dataset.complete=String(complete(dive));root.dataset.fog=String(dive.fog);root.dataset.dead=String(dive.hp<=0);root.dataset.phase=dive.phase;
    root.dataset.event=dive.event;root.dataset.time=dive.time.toFixed(3);root.dataset.chart=String(dive.chart.id);root.dataset.projectiles=String(dive.projectiles.length);
    root.dataset.x=dive.position.x.toFixed(4);root.dataset.y=dive.position.y.toFixed(4);
    root.dataset.lastFired=String(dive.lastFired);
    root.dataset.aimMode=touchAim!==null?"touch-stick":aimCursor?"manual-pointer":"heading";root.dataset.inked=String(inInk(dive));
    const evolution=vesselEvolution(dive);root.dataset.evolutionTier=String(evolution.tier);root.dataset.upgrades=String(evolution.count);
    vesselName.textContent=evolution.name;evolutionCopy.textContent=evolution.next===null?"Final hull unlocked":`${evolution.count} / ${evolution.next} upgrades`;
    evolutionFill.style.width=`${evolution.next===null?100:(evolution.count%3)/3*100}%`;evolutionPanel.dataset.tier=String(evolution.tier);
    coordinate.textContent=`${coordinateOf(dive.position)} / CHART 0${dive.chart.id+1}`;
    region.textContent=dive.position.y<7?"Twilight Gardens":dive.position.y<14?"Wreck Corridor":"Lightless Abyss";
    mode.textContent=dive.fog?"REALTIME / LOCAL SONAR":"REALTIME / FULL CHART";
    hullValue.textContent=`${Math.ceil(dive.hp)} / ${dive.maxHp}`;hullFill.style.width=`${dive.hp/dive.maxHp*100}%`;
    hullBar.setAttribute("aria-valuenow",String(Math.ceil(dive.hp)));hullBar.setAttribute("aria-valuemax",String(dive.maxHp));hullBar.classList.toggle("is-low",dive.hp/dive.maxHp<.3);
    weaponValue.textContent=`Lv.${dive.weapon}`;ammoValue.textContent=String(dive.ammo).padStart(2,"0");sonarValue.textContent=`Lv.${dive.sonar}`;shieldValue.textContent=String(dive.shields);
    beaconValue.textContent=`${dive.restored.size} / 3`;turns.textContent=String(Math.floor(dive.travel));charted.textContent=`${Math.round(dive.explored.size/600*100)}% charted`;
    if(message.textContent!==dive.message)message.textContent=dive.message;
    const labels:Record<string,string>={ready:"READY",upgrade:"UPGRADE",discovery:"DISCOVERY",battle:"ENGAGE",beacon:"SIGNAL",pulse:"SONAR",defeat:"LOST",victory:"COMPLETE",repair:"REPAIR",damage:"DAMAGE"};eventTag.textContent=dive.event==="ready"&&dive.phase==="playing"?"LIVE":labels[dive.event]??"REALTIME";
    const danger=dive.enemies.filter(e=>e.hp>0&&visible(dive,e)&&distance(e,dive.position)<9&&(e.phase==="aim"||dive.time-e.lastFired<.65)).sort((a,b)=>(a.kind==="submarine"?-1:0)-(b.kind==="submarine"?-1:0)||distance(a,dive.position)-distance(b,dive.position))[0];
    threat.hidden=(!danger&&!inInk(dive))||dive.phase!=="playing";
    if(inInk(dive))threat.textContent="⚠ INK CLOUD · Thrust reduced. Move clear";
    else if(danger)threat.textContent=danger.kind==="submarine"?danger.phase==="aim"?"⚠ SUB LOCKING · Move off the red line":"⚠ TORPEDO INBOUND · Sidestep or use cover":danger.attackKind==="ink"?"⚠ INK BURST · Dodge the violet projectiles":danger.attackKind==="spikes"?"⚠ RADIAL SPIKES · Find a gap; punish the exposed core":danger.attackKind==="nova"?"⚠ SHOCKWAVE CHARGING · Leave the violet ring":danger.attackKind==="tail"?"⚠ TAIL SWEEP · Break away":danger.attackKind==="sweep"?"⚠ SWEEPING FIRE · Flank or find cover":danger.attackKind==="charge"?"⚠ CHARGE WINDUP · Dodge the cone":danger.attackKind==="volley"?"⚠ VOLLEY CHARGING · Prepare to sidestep":"⚠ AMBUSH WINDUP · Keep your distance";
    targetLabel.textContent=`FORWARD FIRE · ${(1/FIRE_INTERVAL).toFixed(1)} rds/s · damage ${weaponDamage(dive)} · range ${weaponRange(dive).toFixed(1)}`;
    fireButton.setAttribute("aria-disabled",String(finished(dive)||dive.phase==="paused"||dive.ammo<=0));
    pulseButton.replaceChildren(h("span",{},"◎"),h("span",{},"Sonar pulse",h("small",{},dive.time<dive.pulseReady?`${Math.ceil(dive.pulseReady-dive.time)} s recharge`:"Q / Area scan")));
    repairButton.replaceChildren(h("span",{},"✚"),h("span",{},"Repair hull",h("small",{},`R / Kits ${dive.kits}`)));
    pauseButton.textContent=dive.phase==="ready"?"Start dive":dive.phase==="paused"?"▶ Resume dive · Esc":"Ⅱ Pause · Esc";
    const reading=signal(dive);signalText.textContent=reading?`${reading.bearing} · ${reading.distance<=5?"Strong signal":reading.distance<=12?"Contact":"Faint signal"}`:"Objectives complete";
    touchPulse.textContent=dive.time<dive.pulseReady?`Scan ${Math.ceil(dive.pulseReady-dive.time)}s`:"Scan";touchRepair.textContent=`Fix ${dive.kits}`;
    touchPulse.disabled=dive.phase!=="playing"||dive.time<dive.pulseReady;touchRepair.disabled=dive.phase!=="playing"||dive.kits<=0||dive.hp>=dive.maxHp||dive.time<dive.repairReady;touchPause.disabled=finished(dive);
    touchPause.textContent=dive.phase==="paused"?"Resume":"Pause";touchFog.textContent=dive.fog?"Fog on":"Fog off";touchFog.setAttribute("aria-pressed",String(dive.fog));
    touchSound.setAttribute("aria-pressed",String(audioEnabled));touchSound.textContent=audioEnabled?"Sound":"Muted";
    touchStatus.firstElementChild!.textContent=`BEACONS ${dive.restored.size} / 3`;touchStatus.lastElementChild!.textContent=signalText.textContent;
    beaconRows.forEach((row,i)=>{const b=dive.chart.beacons[i],done=dive.restored.has(key(b));row.classList.toggle("is-done",done);row.lastElementChild!.textContent=done?"Online ✓":visible(dive,b)?coordinateOf(b):"Undiscovered";});
    fog.checked=dive.fog;fogCopy.textContent=dive.fog?"On: discover the sea gradually. Turn it off to compare your route and experience.":"Off: the full chart is visible. Enemy AI, combat, and loot rules are unchanged.";
    const boss=dive.enemies.find(e=>e.kind==="leviathan");bossBar.hidden=!boss||boss.hp<=0||!visible(dive,boss)||distance(boss,dive.position)>9;bossFill.style.width=`${boss?boss.hp/boss.maxHp*100:0}%`;
    if(boss){const stage=leviathanStage(boss);bossName.textContent=`Leviathan · ${["Awakening","Hunt","Fury"][stage-1]} / 0${stage}`;bossHealth.textContent=`${Math.ceil(boss.hp)} / ${boss.maxHp}`;bossMeter.setAttribute("aria-valuenow",String(Math.ceil(boss.hp)));bossMeter.setAttribute("aria-valuemax",String(boss.maxHp));bossBar.dataset.stage=String(stage);}
    overlay.hidden=dive.phase!=="ready"&&dive.phase!=="paused";startTitle.textContent=dive.phase==="paused"?"Dive paused.":"Enter with caution.";startCopy.textContent=dive.phase==="paused"?"The world is paused. Resume when ready.":touchLayout?.matches?"Left thumb: drag to move. Right thumb: hold and drag to aim and fire. Lift to stop shooting. Scan, repair, and pause above.":"WASD to move. Point to turn the bow; hold Space to fire forward. Aim manually, dodge, and watch your supplies. Esc pauses.";startButton.textContent=dive.phase==="paused"?"Resume dive →":"Start dive →";
    if(root.dataset.log!==dive.log.join("|")){root.dataset.log=dive.log.join("|");log.replaceChildren(...dive.log.slice(-3).reverse().map(text=>h("li",{},h("span",{},"◈"),text)));}
    reflection.hidden=!finished(dive);
    if(finished(dive)&&!reflection.childNodes.length)reflection.replaceChildren(h("p",{class:"eb-eyebrow"},complete(dive)?"EXPEDITION COMPLETE":"EMERGENCY RECOVERY"),h("h3",{},complete(dive)?"The deep echoes again.":"Recovered. Next time, go farther."),h("p",{},"What did you choose, and how did it feel? Switch chart fog on or off and dive again. Did it change your route or experience?"));
    if(finished(dive)&&!reflection.querySelector(".eb-touch-result-actions")){
      clearControls();const retry=h("button",{type:"button",class:"eb-button"},"Dive again"),notes=h("button",{type:"button",class:"eb-button"},"Read notes");
      retry.addEventListener("click",()=>{reset(false);begin();});notes.addEventListener("click",()=>setCockpit(false));reflection.append(h("div",{class:"eb-touch-result-actions"},retry,notes));
    }
    const music=musicFor(dive);track.textContent=TRACK_NAMES[music];audio.setScene(music);
    const notice=noticeFor(dive);
    if(notice&&notice.id!==lastToast){
      lastToast=notice.id;toastTitle.textContent=notice.title;toastDetail.textContent=notice.detail;toast.style.setProperty("--loot-color",notice.color);toast.hidden=false;toast.dataset.notice=String(notice.id);toastAnimation?.cancel();
      if(typeof toast.animate==="function")toastAnimation=toast.animate([{opacity:0,transform:"translate(-50%, calc(-50% + 12px)) scale(.94)"},{opacity:1,transform:"translate(-50%, -50%) scale(1)",offset:.17},{opacity:1,transform:"translate(-50%, calc(-50% - 3px)) scale(1)",offset:.72},{opacity:0,transform:"translate(-50%, calc(-50% - 16px)) scale(.99)"}],{duration:1550,easing:"cubic-bezier(.2,.7,.2,1)",fill:"forwards"});
      audio.effect("pickup");
    }else if(!notice)toast.hidden=true;
  }
  function frame(now:number):void {
    if(disposed)return;const dt=Math.max(0,Math.min(.1,(now-lastFrame)/1000));lastFrame=now;accumulator+=dt;
    while(accumulator>=1/60){dive=advance(dive,1/60,inputAt(now));accumulator-=1/60;}
    scene.render(dive,dt,goal,manualAim());
    inkOverlay.style.opacity=inInk(dive)?".65":"0";
    hurtOverlay.style.opacity=String(Math.max(0,1-(dive.time-dive.lastHurt)/.3)*.55);
    if(dive.lastFired!==lastPlayerFired){lastPlayerFired=dive.lastFired;audio.effect("fire");}
    if(dive.lastHurt!==lastHurt){lastHurt=dive.lastHurt;if(lastHurt>=0)audio.effect("hit");}
    if(dive.pulseReady!==lastPulse){lastPulse=dive.pulseReady;if(lastPulse>0)audio.effect("pulse");}
    if(dive.phase==="playing"){
      const audible=new Set(dive.enemies.filter(e=>e.hp>0&&visible(dive,e)&&distance(e,dive.position)<(e.kind==="leviathan"?10:e.kind==="submarine"?9:7)).sort((a,b)=>(distance(a,dive.position)-(a.kind==="leviathan"?4:0))-(distance(b,dive.position)-(b.kind==="leviathan"?4:0))).slice(0,3).map(e=>e.id));
      const cueOrder=[...dive.enemies].sort((a,b)=>(a.kind==="leviathan"?-4:a.kind==="submarine"?-2:0)-(b.kind==="leviathan"?-4:b.kind==="submarine"?-2:0));
      for(const enemy of cueOrder){
        const previous=enemyAudioMemo.get(enemy.id)??{phase:"patrol",fired:-99,nextMove:dive.time+1};
        if(audible.has(enemy.id)){
          const intensity=Math.max(.12,1-distance(enemy,dive.position)/10);
          if(enemy.phase==="aim"&&previous.phase!=="aim")audio.enemyCue(enemy.kind,"aim",intensity);
          if((enemy.phase==="attack"&&previous.phase!=="attack")||enemy.lastFired>previous.fired)audio.enemyCue(enemy.kind,"attack",intensity);
          if(dive.time>=previous.nextMove&&["pursuit","flank","retreat","search"].includes(enemy.phase)){audio.enemyCue(enemy.kind,"move",intensity*.55);previous.nextMove=dive.time+(enemy.kind==="leviathan"?3.4:2.2);}
        }
        enemyAudioMemo.set(enemy.id,{phase:enemy.phase,fired:enemy.lastFired,nextMove:previous.nextMove});
      }
    }
    if(now-lastHud>85){renderHud();lastHud=now;}
    if(now-lastMap>280){drawMinimap(minimap,dive,viewportWidth(ocean),viewportHeight(ocean));lastMap=now;}
    frameId=requestFrame(frame);
  }
  fireButton.addEventListener("pointerdown",event=>{event.preventDefault();begin();fireHeld=true;firePointer=event.pointerId;fireTapUntil=performance.now()+180;try{fireButton.setPointerCapture(event.pointerId);}catch{/* synthetic input */}});
  movementStick=bindTouchStick(movePad,moveThumb,{enabled:()=>dive.phase==="playing"&&root.classList.contains("is-touch-cockpit"),start:()=>{aimCursor=null;navigation=[];goal=null;},move:vector=>{touchMove=vector;},end:()=>{touchMove={x:0,y:0};}});
  aimingStick=bindTouchStick(aimPad,aimThumb,{enabled:()=>dive.phase==="playing"&&root.classList.contains("is-touch-cockpit"),start:()=>{aimCursor=null;touchAim=dive.angle;touchFire=true;},move:vector=>{if(Math.hypot(vector.x,vector.y)>.02)touchAim=Math.atan2(vector.y,vector.x);},end:()=>{touchFire=false;touchAim=null;}});
  touchLaunch.addEventListener("click",()=>{setCockpit(true);renderHud();});
  touchExit.addEventListener("click",()=>{if(dive.phase==="playing")pause();setCockpit(false);});
  touchPulse.addEventListener("click",()=>act(pulse));touchRepair.addEventListener("click",()=>act(repair));touchPause.addEventListener("click",pause);
  touchFog.addEventListener("click",()=>{dive=setFog(dive,!dive.fog);renderHud();});touchSound.addEventListener("click",()=>soundButton.click());
  touchControls.addEventListener("contextmenu",event=>event.preventDefault());
  fireButton.addEventListener("click",event=>{if(event.detail===0){begin();dive=fire(dive);renderHud();}});
  pulseButton.addEventListener("click",()=>act(pulse));repairButton.addEventListener("click",()=>act(repair));pauseButton.addEventListener("click",pause);startButton.addEventListener("click",()=>dive.phase==="paused"?pause():begin());
  fog.addEventListener("change",()=>{dive=setFog(dive,fog.checked);renderHud();});
  soundButton.addEventListener("click",()=>{if(!audioRunning&&audioEnabled&&dive.phase!=="paused")void audio.unlock();else audio.toggle();});
  root.addEventListener("pointerdown",event=>{if(!soundButton.contains(event.target as Node)&&dive.phase!=="paused")void audio.unlock();});
  function reset(nextChart:boolean):void {if(nextChart)chartId=(chartId+1)%3;clearControls();enemyAudioMemo.clear();dive=newDive(chartFor(chartId),dive.fog);scene=createScene(ocean,dive,uid);audio.setPaused(false);lastFrame=performance.now();accumulator=0;lastToast=-1;lastPlayerFired=-99;lastHurt=-99;reflection.replaceChildren();toastAnimation?.cancel();toast.hidden=true;renderHud();drawMinimap(minimap,dive,viewportWidth(ocean),viewportHeight(ocean));}
  restart.addEventListener("click",()=>reset(false));next.addEventListener("click",()=>reset(true));
  board.addEventListener("pointermove",event=>{if(event.pointerType!=="mouse"||dive.phase!=="playing"||(event.target as Element).closest(".eb-start-overlay"))return;const b=ocean.getBoundingClientRect();if(b.width&&b.height)aimCursor={x:(event.clientX-b.left)/b.width,y:(event.clientY-b.top)/b.height};});
  board.addEventListener("pointerleave",()=>{aimCursor=null;});
  board.addEventListener("click",event=>{
    if((event.target as Element).closest("button")||dive.phase==="paused"||finished(dive))return;
    const bounds=ocean.getBoundingClientRect(),width=viewportWidth(ocean),camera=scene.camera();if(!bounds.width||!bounds.height)return;
    const p={x:Math.round(camera.x+(event.clientX-bounds.left)/bounds.width*width-.5),y:Math.round(camera.y+(event.clientY-bounds.top)/bounds.height*viewportHeight(ocean,width)-.5)};
    if(!visible(dive,p)&&distance(p,dive.position)>1.5)return;begin();navigation=findPath(dive.chart,dive.position,p,dive.fog&&visible(dive,p)?dive.explored:undefined);goal=navigation.length?p:null;
  });
  root.addEventListener("keydown",event=>{
    if(event.target instanceof HTMLTextAreaElement||event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.target instanceof HTMLInputElement&&event.target.type!=="checkbox")return;
    const k=event.key.length===1?event.key.toLowerCase():event.key;
    if(k==="Escape"){event.preventDefault();if(!event.repeat)pause();return;}
    if(k==="f"||(event.target===fog&&k==="Enter")){event.preventDefault();if(!event.repeat){dive=setFog(dive,!dive.fog);renderHud();}return;}
    if(dive.phase==="paused")return;
    if(keyDirections[k]){event.preventDefault();begin();heldKeys.add(k);if(!event.repeat){tapDirection=keyDirections[k];tapUntil=performance.now()+90;}navigation=[];goal=null;}
    else if(k===" "){event.preventDefault();begin();heldKeys.add(k);if(!event.repeat){dive=fire(dive);renderHud();}}
    else if(k==="q"||k==="r"){event.preventDefault();if(!event.repeat)act(k==="q"?pulse:repair);}
  });
  function keyup(event:KeyboardEvent):void {const k=event.key.length===1?event.key.toLowerCase():event.key;heldKeys.delete(k);if(k===" ")fireTapUntil=0;}
  function blur():void {clearControls();if(dive.phase==="playing"){dive=togglePause(dive);audio.setPaused(true);renderHud();}}
  function visibility():void {if(document.hidden)blur();}
  function resize():void {clearControls();lastMap=-99;}
  window.addEventListener("keyup",keyup);window.addEventListener("pointerup",releasePointer);window.addEventListener("pointercancel",releasePointer);window.addEventListener("blur",blur);document.addEventListener("visibilitychange",visibility);
  window.addEventListener("resize",resize);touchLayout?.addEventListener("change",configureTouch);configureTouch();drawMinimap(minimap,dive,viewportWidth(ocean),viewportHeight(ocean));frameId=requestFrame(frame);
  return()=>{disposed=true;cancelFrame(frameId);toastAnimation?.cancel();clearControls();movementStick?.dispose();aimingStick?.dispose();touchLayout?.removeEventListener("change",configureTouch);window.removeEventListener("resize",resize);window.removeEventListener("keyup",keyup);window.removeEventListener("pointerup",releasePointer);window.removeEventListener("pointercancel",releasePointer);window.removeEventListener("blur",blur);document.removeEventListener("visibilitychange",visibility);audio.dispose();root.remove();};
}
export const echoesBelow:Minigame={slug:"echoes-below",title:"Echoes Below: Abyssal Expedition",motivators:["discovery"],author:"Weihao-Zhou03",mount};
