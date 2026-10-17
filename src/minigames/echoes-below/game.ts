/** Real-time simulation. All time and input are explicit; no DOM or timers. */
export type Point = { x: number; y: number };
export type Direction = "up" | "right" | "down" | "left";
export type EnemyKind = "stalker" | "swarm" | "jelly" | "ray" | "elite" | "submarine" | "leviathan" | "angler" | "cuttle" | "urchin";
export type ItemKind = "weapon" | "hull" | "sonar" | "ammo" | "repair" | "shield" | "relic";
export type MusicScene = "explore" | "discovery" | "battle" | "boss" | "beacon" | "victory" | "defeat";
export type Brain = "patrol" | "pursuit" | "flank" | "aim" | "attack" | "recover" | "retreat" | "search";
export type AttackKind = "bite" | "charge" | "torpedo" | "volley" | "nova" | "sweep" | "tail" | "ink" | "spikes";
export type Enemy = Point & {
  id: string; kind: EnemyKind; name: string; hp: number; maxHp: number; attack: number; speed: number; range: number; aggro: number;
  home: Point; angle: number; phase: Brain; phaseUntil: number; attackAt: number; lastSeen: number; lastKnown: Point;
  aim: Point; attackKind: AttackKind; attackIndex: number; hit: boolean; lastFired: number; lastHit: number;
  path: Point[]; pathUntil: number; enraged: boolean; stage: 1 | 2 | 3; burstAt: number; burstIndex: number;
};
export type Item = Point & { id: string; kind: ItemKind; name: string; description: string };
export type Chart = { id: number; width: number; height: number; start: Point; reefs: Point[]; beacons: Point[]; enemies: Enemy[]; items: Item[] };
export type Projectile = Point & { id: number; owner: "player" | "enemy"; kind: "torpedo" | "acid" | "spine" | "wave" | "ink"; angle: number; speed: number; damage: number; born: number; life: number; radius: number; target: string | null; hit: boolean; area: number };
export type Hazard = Point & { id:number; kind:"ink"; born:number; life:number; radius:number };
export type Effect = Point & { id: number; kind: "explosion" | "muzzle" | "hit" | "sonar" | "pickup" | "wake" | "swipe"; born: number; life: number; color: string; size: number; angle: number };
export type Notice = { id: number; title: string; detail: string; color: string; showAt: number; until: number };
export type Input = { x: number; y: number; fire: boolean; aim?:number };
export type Dive = {
  chart: Chart; position: Point; velocity: Point; angle: number; explored: Set<string>; surveyKey: string; visited: Point[];
  restored: Set<string>; collected: Set<string>; enemies: Enemy[]; projectiles: Projectile[]; effects: Effect[]; notices: Notice[]; hazards:Hazard[];
  phase: "ready" | "playing" | "paused" | "won" | "lost"; fog: boolean; time: number; endedAt: number|null; travel: number; switches: number;
  hp: number; maxHp: number; armor: number; weapon: number; sonar: number; ammo: number; kits: number; shields: number; salvage: number;
  fireReady: number; pulseReady: number; repairReady: number; ammoAt: number; invincibleUntil: number; lastFired: number; lastHurt: number;
  event: string; eventAt: number; message: string; log: string[]; nextId: number; shots: number;
};
export const DELTAS: Record<Direction, Point> = { up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 } };
export const cellOf = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) });
export const key = (p: Point): string => `${Math.round(p.x)},${Math.round(p.y)}`;
export const same = (a: Point, b: Point): boolean => key(a) === key(b);
export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
export const ITEM_NAMES: Record<ItemKind, string> = { weapon: "Missile Amplifier", hull: "Titanium Plating", sonar: "Wideband Sonar", ammo: "Missile Cache", repair: "Repair Supplies", shield: "Phase Shield", relic: "Ancient Relic" };
export const MAX_AMMO=180;
export const FIRE_INTERVAL=.22;
export const BRAIN_NAMES: Record<Brain, string> = { patrol: "Patrol", pursuit: "Pursuit", flank: "Flanking", aim: "Locking", attack: "Attack", recover: "Reload", retreat: "Retreat", search: "Search" };
const STATS: Record<EnemyKind, { name: string; hp: number; attack: number; speed: number; range: number; aggro: number }> = {
  stalker: { name: "Ghostfin Hunter", hp: 46, attack: 16, speed: 2.1, range: 1.6, aggro: 6 },
  swarm: { name: "Needlefin Swarm", hp: 25, attack: 9, speed: 2.95, range: 1.45, aggro: 5.3 },
  jelly: { name: "Pulse Jelly", hp: 68, attack: 21, speed: 1, range: 3.5, aggro: 6.3 },
  ray: { name: "Venom Ray", hp: 65, attack: 14, speed: 1.95, range: 6.5, aggro: 7.2 },
  elite: { name: "Abyss Ripper", hp: 135, attack: 32, speed: 1.85, range: 4.4, aggro: 7.6 },
  submarine: { name: "Hunter Submarine", hp: 132, attack: 27, speed: 2, range: 8, aggro: 8.5 },
  leviathan: { name: "Leviathan", hp: 1400, attack: 60, speed: 1.45, range: 8.5, aggro: 11 },
  angler: { name: "Lantern Maw", hp:100, attack:35, speed:2.3, range:4.5, aggro:6 },
  cuttle: { name: "Prism Cuttle", hp:78, attack:15, speed:2.1, range:6.2, aggro:7.2 },
  urchin: { name: "Crystal Urchin", hp:124, attack:19, speed:.5, range:6.5, aggro:6.8 },
};
const hash = (x: number, y: number, seed: number) => { const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return n - Math.floor(n); };
export function makeEnemy(kind: EnemyKind, p: Point, id: string): Enemy {
  const cfg = STATS[kind];
  return { ...cfg, ...p, id, kind, maxHp: cfg.hp, home: { ...p }, angle: Math.PI, phase: "patrol", phaseUntil: 0, attackAt: 1.5, lastSeen: -99, lastKnown: { ...p }, aim: { ...p }, attackKind: "bite", attackIndex: 0, hit: false, lastFired: -99, lastHit: -99, path: [], pathUntil: 0, enraged: false, stage: 1, burstAt: 0, burstIndex: 0 };
}
export function inside(chart: Chart, p: Point): boolean { return p.x >= 0 && p.y >= 0 && p.x < chart.width && p.y < chart.height; }
const rockCache = new WeakMap<Chart, Set<string>>();
export function reefAt(chart: Chart, p: Point): boolean { let rocks = rockCache.get(chart); if (!rocks) { rocks = new Set(chart.reefs.map(key)); rockCache.set(chart, rocks); } return rocks.has(key(p)); }
export function chartFor(id = 0): Chart {
  const seed = ((Math.trunc(id) % 3) + 3) % 3;
  const shift = (p: Point): Point => seed === 1 ? { x: 29 - p.x, y: p.y } : seed === 2 ? { x: p.x, y: 19 - p.y } : p;
  const start = shift({ x: 3, y: 3 }), beacons = [{ x: 12, y: 4 }, { x: 24, y: 9 }, { x: 24, y: 17 }].map(shift);
  const spawn: Array<[EnemyKind, number, number]> = [
    ["stalker",9,5],["stalker",12,10],["stalker",16,4],["stalker",6,14],["stalker",20,8],
    ["swarm",11,7],["swarm",12,7],["swarm",11,8],["swarm",21,13],["swarm",22,13],["swarm",22,14],
    ["jelly",7,10],["jelly",18,11],["jelly",27,13],["ray",15,8],["ray",8,17],["ray",26,5],
    ["elite",15,13],["elite",22,16],["elite",12,17],["submarine",19,5],["submarine",26,10],["submarine",17,17],["leviathan",27,17],
    ["angler",10,11],["angler",21,6],["angler",25,16],
    ["cuttle",14,6],["cuttle",20,12],["cuttle",10,16],
    ["urchin",16,8],["urchin",23,11],["urchin",20,17],
  ];
  const sites: Array<[ItemKind, number, number]> = [
    ["weapon",5,3],["hull",6,5],["sonar",10,3],["ammo",4,8],["repair",9,7],["shield",12,6],
    ["relic",8,10],["weapon",17,9],["hull",18,13],["sonar",20,4],["ammo",22,9],["repair",13,14],
    ["relic",19,6],["relic",12,18],["shield",24,13],["weapon",23,15],["hull",7,17],["repair",24,17],
    ["ammo",28,14],["relic",28,5],["sonar",4,15],["ammo",18,18],
  ];
  const enemies = spawn.map(([kind,x,y], i) => {
    const enemy=makeEnemy(kind,shift({x,y}),`e${i}`);
    const depth=distance(enemy,start);
    if(kind!=="leviathan"&&depth>10){enemy.attack=Math.round(enemy.attack*(depth>19?1.2:1.12));enemy.hp=enemy.maxHp=Math.round(enemy.maxHp*(depth>19?1.15:1.06));}
    return enemy;
  });
  const items = sites.map(([kind,x,y], i): Item => ({ ...shift({x,y}), id:`i${i}`, kind, name:ITEM_NAMES[kind], description:kind === "relic" ? ["A lost star chart flickers back to life.","A sunken station still records the tides.","A stone tablet carries an echo from the far shore."][i%3] : "" }));
  const occupied = new Set([start,...beacons,...enemies,...items].map(key)), reefs: Point[] = [];
  for(let y=1;y<19;y++)for(let x=1;x<29;x++)if(distance({x,y},start)>4&&!occupied.has(key({x,y}))&&hash(x,y,seed+1)>.86)reefs.push({x,y});
  for(const t of [...beacons,...enemies,...items]) { let p={...start}; while(!same(p,t)){p=p.x!==t.x?{x:p.x+Math.sign(t.x-p.x),y:p.y}:{x:p.x,y:p.y+Math.sign(t.y-p.y)};const i=reefs.findIndex(r=>same(r,p));if(i>=0)reefs.splice(i,1);} }
  return {id:seed,width:30,height:20,start,reefs,beacons,enemies,items};
}
export function survey(chart: Chart, p: Point, previous: Set<string>, radius: number): Set<string> {
  const out = new Set(previous), center=cellOf(p);
  for(let y=center.y-radius;y<=center.y+radius;y++)for(let x=center.x-radius;x<=center.x+radius;x++)if(inside(chart,{x,y})&&distance(center,{x,y})<=radius)out.add(key({x,y}));
  return out;
}
export function newDive(chart = chartFor(), fog = true): Dive {
  return { chart, position:{...chart.start}, velocity:{x:0,y:0}, angle:0, explored:survey(chart,chart.start,new Set(),3), surveyKey:key(chart.start), visited:[{...chart.start}], restored:new Set(), collected:new Set(), enemies:chart.enemies.map(e=>({...e})), projectiles:[],effects:[],notices:[],hazards:[],phase:"ready",fog,time:0,endedAt:null,travel:0,switches:0,hp:160,maxHp:160,armor:1,weapon:1,sonar:1,ammo:90,kits:2,shields:0,salvage:0,fireReady:0,pulseReady:0,repairReady:0,ammoAt:.65,invincibleUntil:0,lastFired:-99,lastHurt:-99,event:"ready",eventAt:0,message:"Hold Space to fire from the bow. Point to aim, WASD to move, F toggles fog, Esc pauses.",log:["Expedition ready. Missiles fly straight: aim with the bow."],nextId:1,shots:0 };
}
export function complete(s: Dive): boolean { return s.restored.size===3&&s.enemies.every(e=>e.kind!=="leviathan"||e.hp<=0); }
export function finished(s: Dive): boolean { return s.phase==="won"||s.phase==="lost"; }
export function start(s: Dive): Dive { return s.phase==="ready"?{...s,phase:"playing"}:s; }
export function togglePause(s: Dive): Dive { return s.phase==="playing"?{...s,phase:"paused"}:s.phase==="paused"?{...s,phase:"playing"}:start(s); }
export function visible(s: Dive, p: Point): boolean { return !s.fog||s.explored.has(key(p)); }
export function setFog(s: Dive, fog: boolean): Dive { return s.fog===fog?s:{...s,fog,switches:s.switches+1}; }
export function weaponDamage(s: Dive): number { return 12+(s.weapon-1)*6; }
export function weaponRange(s: Dive): number { return 8+(s.weapon-1)*.5; }
export function vesselMuzzle(s:Dive):Point {const length=[.66,.75,.88,1.04][vesselEvolution(s).tier];return{x:s.position.x+Math.cos(s.angle)*length,y:s.position.y+Math.sin(s.angle)*length};}
export function inInk(s:Dive):boolean {return s.hazards.some(h=>distance(h,s.position)<h.radius);}
export function vesselEvolution(s: Dive): { tier: number; name: string; count: number; next: number | null } {
  const count=s.chart.items.filter(item=>s.collected.has(item.id)&&!["ammo","repair"].includes(item.kind)).length;
  const tier=Math.min(3,Math.floor(count/3));
  return {tier,name:["Firefly Scout","Tidewing Cruiser","Blackwhale Striker","Astral Explorer"][tier],count,next:tier<3?(tier+1)*3:null};
}
export function leviathanStage(e: Enemy): 1 | 2 | 3 { return e.hp>e.maxHp*.65?1:e.hp>e.maxHp*.3?2:3; }
export function lineClear(chart: Chart, a: Point, b: Point): boolean {
  const n=Math.max(1,Math.ceil(distance(a,b)*5));for(let i=1;i<n;i++)if(reefAt(chart,{x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;return true;
}
export function findPath(chart: Chart, from: Point, to: Point, known?: Set<string>): Point[] {
  const a=cellOf(from),b=cellOf(to),queue=[a],seen=new Set([key(a)]),parent=new Map<string,Point>();
  for(let i=0;i<queue.length;i++) {
    const p=queue[i];if(same(p,b)){const route:Point[]=[];let q=p;while(!same(q,a)){route.unshift(q);q=parent.get(key(q))!;}return route;}
    for(const d of Object.values(DELTAS)){const q={x:p.x+d.x,y:p.y+d.y};if(inside(chart,q)&&!reefAt(chart,q)&&!seen.has(key(q))&&(!known||known.has(key(q)))){seen.add(key(q));parent.set(key(q),p);queue.push(q);}}
  }return [];
}
function copy(s: Dive): Dive { return {...s,position:{...s.position},velocity:{...s.velocity},enemies:s.enemies.map(e=>({...e})),projectiles:s.projectiles.map(p=>({...p})),effects:[...s.effects],notices:[...s.notices],hazards:[...s.hazards]}; }
function event(s: Dive, kind: string, text: string): void { s.event=kind;s.eventAt=s.time;s.message=text;s.log=[...s.log,text].slice(-7); }
function fx(s: Dive, kind: Effect["kind"], p: Point, color: string, size=1, life=.55, angle=0): void { s.effects.push({...p,id:s.nextId++,kind,color,size,life,angle,born:s.time}); }
function notify(s: Dive,title:string,detail:string,color="#edd39b"):void { const showAt=Math.max(s.time,s.notices.at(-1)?.until??0);s.notices.push({id:s.nextId++,title,detail,color,showAt,until:showAt+1.55}); }
export function noticeFor(s: Dive): Notice|undefined { return s.notices.find(n=>s.time>=n.showAt&&s.time<n.until); }
function collect(s: Dive): void {
  const previousTier=vesselEvolution(s).tier;
  for(const item of s.chart.items)if(!s.collected.has(item.id)&&distance(item,s.position)<.53){
    s.collected=new Set(s.collected).add(item.id);let detail="";
    if(item.kind==="weapon"){const old=s.weapon;s.weapon=Math.min(4,s.weapon+1);s.ammo=Math.min(MAX_AMMO,s.ammo+30);detail=`Weapon Lv.${s.weapon} · Damage +${(s.weapon-old)*6} · Missiles +30`;}
    if(item.kind==="hull"){s.maxHp+=30;s.hp=Math.min(s.maxHp,s.hp+35);s.armor+=1;detail="Max hull +30 · Armor +1 · Repair +35";}
    if(item.kind==="sonar"){s.sonar=Math.min(3,s.sonar+1);s.surveyKey="";detail=`Sonar Lv.${s.sonar} · Detection range increased`;}
    if(item.kind==="ammo"){s.ammo=Math.min(MAX_AMMO,s.ammo+65);detail="Missiles +65";}
    if(item.kind==="repair"){s.kits+=1;detail="Kits +1";}
    if(item.kind==="shield"){s.shields+=2;detail="Shields +2 · Reduce the next two hits by 55%";}
    if(item.kind==="relic"){s.salvage+=4;s.shields++;detail=`Salvage +4 · Shield +1 · ${item.description}`;}
    notify(s,item.name,detail);fx(s,"pickup",item,"#b9f0cf",1.2,.9);event(s,item.kind==="relic"?"discovery":"upgrade",`Found ${item.name}: ${detail}`);
  }
  const evolution=vesselEvolution(s);
  if(evolution.tier>previousTier){notify(s,`Hull evolved · ${evolution.name}`,`${evolution.count} upgrades integrated · Hull, fins, and thrusters rebuilt`,"#b5e7ef");fx(s,"sonar",s.position,"#c5efff",2.5,1.2);}
  for(const b of s.chart.beacons)if(!s.restored.has(key(b))&&distance(b,s.position)<.62){s.restored=new Set(s.restored).add(key(b));s.hp=Math.min(s.maxHp,s.hp+50);s.ammo=Math.min(MAX_AMMO,s.ammo+24);s.kits+=s.kits<2?1:0;notify(s,`Beacon ${s.restored.size}/3 online`,"Hull +50 · Missiles +24 · Repair kits refilled toward 2","#a9e4e5");fx(s,"sonar",b,"#8fe1dc",5,1.3);event(s,"beacon",`Beacon ${s.restored.size}/3 online. Hull and ammunition replenished.`);}
}
function canStand(chart:Chart,p:Point,r=.2):boolean {return p.x>=-.2&&p.y>=-.2&&p.x<=chart.width-.8&&p.y<=chart.height-.8&&[-r,r].every(dx=>[-r,r].every(dy=>!reefAt(chart,{x:p.x+dx,y:p.y+dy})));}
function slide(chart:Chart,p:Point,v:Point,dt:number):Point {let q={...p};if(canStand(chart,{x:q.x+v.x*dt,y:q.y}))q.x+=v.x*dt;if(canStand(chart,{x:q.x,y:q.y+v.y*dt}))q.y+=v.y*dt;return q;}
const norm=(p:Point):Point=>{const n=Math.hypot(p.x,p.y)||1;return{x:p.x/n,y:p.y/n};};
export function turnAngle(current:number,target:number,max:number):number {const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));return current+Math.max(-max,Math.min(max,delta));}
function shoot(s:Dive,owner:"player"|"enemy",kind:Projectile["kind"],p:Point,angle:number,damage:number,speed:number,target:string|null=null):void {
  s.projectiles.push({...p,id:s.nextId++,owner,kind,angle,speed,damage,born:s.time,life:kind==="wave"?.8:3.3,radius:kind==="wave"?0:.14,target,hit:false,area:kind==="wave"?3.7:0});s.shots++;fx(s,"muzzle",p,owner==="player"?"#ffe2a7":"#ff9b86",.6,.2,angle);
}
function fireInto(s:Dive):void {
  if(s.phase!=="playing"||s.time<s.fireReady||s.ammo<=0)return;
  s.ammo--;s.fireReady=s.time+FIRE_INTERVAL;s.lastFired=s.time;
  const muzzle=vesselMuzzle(s);
  if(!canStand(s.chart,muzzle,.02)||!lineClear(s.chart,s.position,muzzle)){fx(s,"muzzle",s.position,"#ffe2a7",.35,.12,s.angle);return;}
  shoot(s,"player","torpedo",muzzle,s.angle,weaponDamage(s),11.5);
  s.projectiles.at(-1)!.life=weaponRange(s)/11.5;
}
export function fire(s:Dive):Dive {const next=copy(start(s));fireInto(next);return next;}
export function pulse(s:Dive):Dive {
  if(s.phase!=="playing"||s.time<s.pulseReady)return s;const n=copy(s);n.explored=survey(s.chart,s.position,s.explored,6+s.sonar);n.pulseReady=s.time+8;
  fx(n,"sonar",s.position,"#94e1e0",6+s.sonar,1.5);event(n,"pulse","Sonar pulse released. Nearby terrain and contacts recorded.");return n;
}
export function repair(s:Dive):Dive {if(s.phase!=="playing"||s.time<s.repairReady||s.kits<=0||s.hp>=s.maxHp)return s;const n=copy(s);n.kits--;n.hp=Math.min(n.maxHp,n.hp+60);n.repairReady=n.time+4;fx(n,"pickup",n.position,"#9de6c1",1.5,.7);event(n,"repair","Repair kit used. Up to 60 hull restored.");return n;}
function hurt(s:Dive,damage:number,p:Point):void {
  if(s.time<s.invincibleUntil||distance(s.position,s.chart.start)<2.15)return;
  let hit=Math.max(3,damage-s.armor);if(s.shields>0){s.shields--;hit=Math.ceil(hit*.45);}s.hp=Math.max(0,s.hp-hit);s.invincibleUntil=s.time+.3;s.lastHurt=s.time;fx(s,"hit",p,"#efa58e",1,.4);
  if(s.time-s.eventAt>.8)event(s,"damage",`Hull −${hit}. Sidestep incoming fire and leave windup zones.`);
}
function damageEnemy(s:Dive,e:Enemy,damage:number):void {
  const armor=e.kind==="leviathan"?6:e.kind==="elite"?3:e.kind==="urchin"&&!(["aim","attack"].includes(e.phase))?8:0;
  e.hp=Math.max(0,e.hp-Math.max(3,damage-armor));e.lastHit=s.time;
  if(e.hp<=0){s.salvage+=2;s.ammo=Math.min(MAX_AMMO,s.ammo+6);fx(s,"explosion",e,e.kind==="submarine"?"#f2ba83":"#b9a3e6",e.kind==="leviathan"?3:1.2,.9);event(s,"battle",`${e.name} defeated. Salvage +2 · Missiles +6.`);}
}
function steer(s:Dive,e:Enemy,target:Point,speed:number,dt:number):void {
  const clamp=(p:Point):Point=>({x:Math.max(0,Math.min(s.chart.width-1,p.x)),y:Math.max(0,Math.min(s.chart.height-1,p.y))});
  let goal=clamp(target);
  // Retreat and orbit goals can land in rock or outside the chart; choose a reachable shoulder.
  if(!canStand(s.chart,goal)||(distance(e,goal)<.3&&distance(goal,target)>.4)){
    const choices=Array.from({length:8},(_,i)=>clamp({x:goal.x+Math.cos(i*Math.PI/4),y:goal.y+Math.sin(i*Math.PI/4)})).filter(p=>canStand(s.chart,p)&&distance(e,p)>.4);
    choices.sort((a,b)=>distance(a,target)-distance(b,target));goal=choices[0]??e;
  }
  if(!lineClear(s.chart,e,goal)){
    if(s.time>=e.pathUntil||!e.path.length){e.path=findPath(s.chart,e,goal);e.pathUntil=s.time+.8;}
    if(e.path.length&&distance(e,e.path[0])<.25)e.path=e.path.slice(1);if(e.path[0])goal=e.path[0];
  }
  let v=norm({x:goal.x-e.x,y:goal.y-e.y});
  for(const other of s.enemies)if(other.id!==e.id&&other.hp>0){const d=distance(e,other);if(d<.85&&d>.01){v.x+=(e.x-other.x)/d*(.85-d)*1.6;v.y+=(e.y-other.y)/d*(.85-d)*1.6;}}
  v=norm(v);let p=slide(s.chart,e,{x:v.x*speed,y:v.y*speed},dt);
  if(distance(p,e)<speed*dt*.15&&distance(e,goal)>.3){
    const choices=[-.9,.9,-1.5,1.5].map(a=>({x:(v.x*Math.cos(a)-v.y*Math.sin(a))*speed,y:(v.x*Math.sin(a)+v.y*Math.cos(a))*speed})).map(velocity=>slide(s.chart,e,velocity,dt)).filter(q=>distance(q,e)>speed*dt*.25);
    choices.sort((a,b)=>distance(a,goal)-distance(b,goal));if(choices[0]){p=choices[0];v=norm({x:p.x-e.x,y:p.y-e.y});}
  }
  e.x=p.x;e.y=p.y;if(distance(e,goal)>.1)e.angle=turnAngle(e.angle,Math.atan2(v.y,v.x),dt*3.6);
}
function bossAttack(s:Dive,e:Enemy):AttackKind {
  const d=distance(e,s.position),moving=Math.hypot(s.velocity.x,s.velocity.y)>1.2;
  // Read spacing and lateral motion, then alternate threats instead of repeating a fixed combo.
  let choices:AttackKind[]=d<2.6?["tail","nova","charge"]:d>5.5?["volley","sweep","charge"]:moving?["sweep","charge","nova","volley"]:["nova","volley","charge","sweep"];
  if(e.stage===3&&d>=2.6&&d<=5.5)choices=["charge","sweep","nova","volley"];
  choices=choices.filter(kind=>kind!==e.attackKind);
  return choices[Math.floor(e.attackIndex/2)%choices.length];
}
function beginAttack(s:Dive,e:Enemy):void {
  e.phase="aim";e.hit=false;e.burstIndex=0;
  e.attackKind=e.kind==="submarine"?"torpedo":e.kind==="jelly"?"nova":e.kind==="ray"?"volley":e.kind==="elite"||e.kind==="angler"?"charge":e.kind==="cuttle"?"ink":e.kind==="urchin"?"spikes":e.kind==="leviathan"?bossAttack(s,e):"bite";
  const duration=e.kind==="leviathan"?(e.attackKind==="sweep"?1.2:e.attackKind==="tail"?.95:e.attackKind==="charge"?1.05:1.1):e.attackKind==="torpedo"?.9:e.attackKind==="nova"?.9:e.attackKind==="ink"?.85:e.attackKind==="spikes"?1.05:e.attackKind==="charge"?.9:e.kind==="swarm"?.43:.52;
  const lead=e.attackKind==="torpedo"?.32:e.attackKind==="charge"?.26:e.attackKind==="sweep"?.4:.12;
  // Prediction is locked here: moving after this visible windup can always evade the aim.
  e.aim={x:s.position.x+s.velocity.x*lead,y:s.position.y+s.velocity.y*lead};
  e.phaseUntil=s.time+duration;e.angle=Math.atan2(e.aim.y-e.y,e.aim.x-e.x);
}
function sweepBurst(s:Dive,e:Enemy):void {
  const bursts=e.stage+2,offset=-.62+1.24*e.burstIndex/(bursts-1);
  for(const spread of[-.1,0,.1])shoot(s,"enemy","spine",e,e.angle+offset+spread,e.attack*.63,6.3);
  e.burstIndex++;e.burstAt=s.time+.2;
}
function launchAttack(s:Dive,e:Enemy):void {
  e.phase="attack";e.phaseUntil=s.time+(e.attackKind==="sweep"?(e.stage+1)*.23+.2:e.attackKind==="charge"?.64:e.attackKind==="torpedo"?.55:e.attackKind==="tail"?.55:.32);e.attackIndex++;e.lastFired=s.time;
  const angle=Math.atan2(e.aim.y-e.y,e.aim.x-e.x);e.angle=angle;
  if(e.attackKind==="torpedo"){
    shoot(s,"enemy","torpedo",{x:e.x+Math.cos(angle)*.6,y:e.y+Math.sin(angle)*.6},angle-.065,e.attack,6.6);
    e.burstIndex=1;e.burstAt=s.time+.24;
  }
  if(e.attackKind==="volley"){
    const half=e.kind==="leviathan"?e.stage+2:2;
    for(let i=-half;i<=half;i++)shoot(s,"enemy",e.kind==="ray"?"acid":"spine",e,angle+i*.19,e.attack*.7,e.kind==="leviathan"?6.4:6);
  }
  if(e.attackKind==="sweep")sweepBurst(s,e);
  if(e.attackKind==="nova"){shoot(s,"enemy","wave",e,0,e.attack,0);s.projectiles.at(-1)!.area=e.kind==="leviathan"?3.5+e.stage*.4:3.5;}
  if(e.attackKind==="ink")for(const spread of[-.22,0,.22]){shoot(s,"enemy","ink",e,angle+spread,e.attack,4.5);s.projectiles.at(-1)!.life=Math.max(.4,Math.min(1.6,distance(e,e.aim)/4.5));}
  if(e.attackKind==="spikes")for(let i=0;i<12;i++)shoot(s,"enemy","spine",e,e.attackIndex*.17+i*Math.PI/6,e.attack,4.8);
  if(e.attackKind==="tail")e.burstAt=s.time+.22;
  if(["bite","charge","tail"].includes(e.attackKind))fx(s,"swipe",e,"#d9a6bd",e.kind==="leviathan"?2.4:1,.55,angle);
}
function dodgeProjectile(s:Dive,e:Enemy,dt:number):boolean {
  if(!["submarine","ray","elite","cuttle"].includes(e.kind))return false;
  const shot=s.projectiles.find(p=>p.owner==="player"&&distance(p,e)<2.3&&Math.cos(p.angle)*(e.x-p.x)+Math.sin(p.angle)*(e.y-p.y)>0);
  if(!shot)return false;
  const side=(Number(e.id.replace(/\D/g,""))||0)%2?1:-1;
  e.phase="flank";steer(s,e,{x:e.x-Math.sin(shot.angle)*side*2,y:e.y+Math.cos(shot.angle)*side*2},e.speed*1.3,dt);return true;
}
function updateEnemy(s:Dive,e:Enemy,dt:number):void {
  if(e.hp<=0)return;const d=distance(e,s.position),safe=distance(s.position,s.chart.start)<2.15,memory=e.kind==="leviathan"?5.5:4.2;
  if(e.kind==="leviathan"){
    const stage=leviathanStage(e);
    if(stage>e.stage){e.stage=stage;e.enraged=true;notify(s,stage===2?"Leviathan · Armored Awakening":"Leviathan · Abyssal Fury",stage===2?"Stronger sweeps and volleys · Watch the windups":"Phase 3 · Faster charges, longer sweeps. Keep moving.","#e8b1dc");fx(s,"sonar",e,"#c6a7f0",3,1);}
  }
  if(e.phase==="aim"){if(s.time>=e.phaseUntil)launchAttack(s,e);return;}
  if(e.phase==="attack"){
    if(e.attackKind==="charge"||e.attackKind==="bite"){
      const speed=e.attackKind==="charge"?(e.kind==="leviathan"?6.4+e.stage*.6:6.2):e.kind==="swarm"?4.5:4,p=slide(s.chart,e,{x:Math.cos(e.angle)*speed,y:Math.sin(e.angle)*speed},dt);e.x=p.x;e.y=p.y;
      if(!e.hit&&distance(e,s.position)<(e.kind==="leviathan"?1.05:.78)){hurt(s,e.attack,s.position);e.hit=true;}
    }
    if(e.attackKind==="sweep"&&e.burstIndex<e.stage+2&&s.time>=e.burstAt)sweepBurst(s,e);
    if(e.attackKind==="torpedo"&&e.burstIndex===1&&s.time>=e.burstAt){shoot(s,"enemy","torpedo",{x:e.x+Math.cos(e.angle)*.6,y:e.y+Math.sin(e.angle)*.6},e.angle+.065,e.attack*.85,6.6);e.burstIndex=2;}
    if(e.attackKind==="tail"&&!e.hit&&s.time>=e.burstAt){if(distance(e,s.position)<2.4)hurt(s,e.attack*1.15,s.position);e.hit=true;fx(s,"swipe",e,"#e3b8ec",2.4,.5,e.angle+Math.PI);}
    if(s.time>=e.phaseUntil){e.phase="recover";e.phaseUntil=s.time+(e.kind==="leviathan"?1.05-e.stage*.14:e.kind==="swarm"?.62:e.kind==="submarine"?1.05:e.kind==="urchin"?1.7:.95);e.attackAt=e.phaseUntil;}
    return;
  }
  if(e.phase==="recover"&&s.time<e.phaseUntil){
    if((e.kind==="submarine"||e.kind==="ray"||e.kind==="cuttle"||e.kind==="leviathan")&&!safe&&s.time-e.lastSeen<memory){
      if(dodgeProjectile(s,e,dt)){e.phase="recover";return;}
      const away=norm({x:e.x-s.position.x,y:e.y-s.position.y}),side=(Number(e.id.slice(1))%2?1:-1);
      const retreat=e.kind!=="leviathan"&&(e.hp<e.maxHp*.3||d<3.8);
      steer(s,e,retreat?{x:e.x+away.x*2-away.y*side*1.2,y:e.y+away.y*2+away.x*side*1.2}:{x:e.x-away.y*side*2,y:e.y+away.x*side*2},e.speed*.85,dt);
      e.angle=turnAngle(e.angle,Math.atan2(s.position.y-e.y,s.position.x-e.x),dt*3);
    }
    return;
  }
  const sees=!safe&&d<=e.aggro&&lineClear(s.chart,e,s.position);
  if(sees){e.lastSeen=s.time;e.lastKnown={...s.position};}
  if(!sees&&s.time-e.lastSeen>memory){
    e.phase="patrol";const i=Number(e.id.replace(/\D/g,""))||0,a=s.time*.16+i*1.7;
    if(e.kind==="angler"||e.kind==="urchin")return;
    const goal={x:e.home.x+Math.cos(a)*1.15,y:e.home.y+Math.sin(a)*1.15};
    if(canStand(s.chart,goal)&&distance(goal,s.chart.start)>3)steer(s,e,goal,e.speed*.38,dt);return;
  }
  if(!sees){e.phase="search";steer(s,e,e.lastKnown,e.speed*.8,dt);return;}
  if(s.time>=e.attackAt&&d<=e.range&&lineClear(s.chart,e,s.position)){beginAttack(s,e);return;}
  if(dodgeProjectile(s,e,dt))return;
  if(e.kind==="submarine"||e.kind==="ray"||e.kind==="cuttle"){
    const ideal=e.kind==="submarine"?5.2:e.kind==="cuttle"?4.5:4.2,away=norm({x:e.x-s.position.x,y:e.y-s.position.y}),low=e.hp<e.maxHp*.35;
    if((d<ideal||low)&&d<e.aggro){const side=Number(e.id.slice(1))%2?1:-1;e.phase="retreat";steer(s,e,{x:e.x+away.x*2-away.y*side*1.2,y:e.y+away.y*2+away.x*side*1.2},e.speed,dt);}
    else if(d<e.range&&lineClear(s.chart,e,s.position)){e.phase="flank";const side=(Number(e.id.slice(1))%2?1:-1);steer(s,e,{x:e.x-away.y*side,y:e.y+away.x*side},e.speed*.7,dt);e.angle=turnAngle(e.angle,Math.atan2(s.position.y-e.y,s.position.x-e.x),dt*3);}
    else{e.phase="pursuit";steer(s,e,s.position,e.speed,dt);}
  }else{
    e.phase=e.kind==="swarm"?"flank":"pursuit";
    const offset=e.kind==="swarm"?Number(e.id.slice(1))*2.4:0;
    const goal=e.kind==="swarm"&&d>1.8?{x:s.position.x+s.velocity.x*.22+Math.cos(offset)*1.25,y:s.position.y+s.velocity.y*.22+Math.sin(offset)*1.25}:e.kind==="stalker"?{x:s.position.x+s.velocity.x*.25,y:s.position.y+s.velocity.y*.25}:s.position;
    steer(s,e,goal,e.speed*(e.enraged?1.4:1),dt);
  }
}
function segmentDistance(p:Point,a:Point,b:Point):number {const dx=b.x-a.x,dy=b.y-a.y,q=((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),t=Math.max(0,Math.min(1,q));return distance(p,{x:a.x+dx*t,y:a.y+dy*t});}
function inkCloud(s:Dive,p:Point):void {if(inside(s.chart,p)&&!reefAt(s.chart,p)&&s.hazards.filter(h=>distance(h,p)<1).length===0)s.hazards.push({...p,id:s.nextId++,kind:"ink",born:s.time,life:4.5,radius:1.4});}
function updateProjectiles(s:Dive,dt:number):void {
  const retained:Projectile[]=[];
  for(const p of s.projectiles){
    const age=s.time-p.born;if(age>p.life){if(p.kind==="ink")inkCloud(s,p);continue;}
    if(p.kind==="wave"){
      p.radius=p.area*Math.min(1,age/p.life);
      if(!p.hit&&Math.abs(distance(p,s.position)-p.radius)<.45){hurt(s,p.damage,s.position);p.hit=true;}
      retained.push(p);continue;
    }
    const launch=p.owner==="player"&&age<=dt+.0001;
    const before=launch?{...s.position}:{x:p.x,y:p.y};p.x+=Math.cos(p.angle)*p.speed*dt;p.y+=Math.sin(p.angle)*p.speed*dt;
    if(!inside(s.chart,cellOf(p)))continue;
    if(reefAt(s.chart,p)){if(p.kind==="ink")inkCloud(s,before);fx(s,"explosion",p,"#c7a87c",.5,.4);continue;}
    if(p.owner==="player"){
      const target=s.enemies.find(e=>e.hp>0&&(!launch||(e.x-s.position.x)*Math.cos(p.angle)+(e.y-s.position.y)*Math.sin(p.angle)>0)&&segmentDistance(e,before,p)<(e.kind==="leviathan"?.95:.55));
      if(target){damageEnemy(s,target,p.damage);fx(s,"explosion",p,"#ffe0a2",.75,.55);continue;}
    }else if(segmentDistance(s.position,before,p)<.48){hurt(s,p.damage,s.position);if(p.kind==="ink")inkCloud(s,p);fx(s,"explosion",p,"#f0a28d",.8,.5);continue;}
    retained.push(p);
  }s.projectiles=retained;
}
export function advance(s:Dive,delta:number,input:Input={x:0,y:0,fire:false}):Dive {
  if(!Number.isFinite(delta)||delta<=0||s.phase==="ready"||s.phase==="paused")return s;const dt=Math.min(delta,1/20);
  if(finished(s)){const time=s.time+dt;return{...s,time,effects:s.effects.filter(e=>time-e.born<e.life),notices:s.notices.filter(e=>time<e.until)};}
  const n=copy(s);n.time+=dt;
  n.effects=n.effects.filter(e=>n.time-e.born<e.life);n.notices=n.notices.filter(e=>n.time<e.until);n.hazards=n.hazards.filter(h=>n.time-h.born<h.life);
  const magnitude=Math.hypot(input.x,input.y),speed=inInk(n)?2.15:3.45,desired=magnitude>.02?{x:input.x/Math.max(1,magnitude)*speed,y:input.y/Math.max(1,magnitude)*speed}:{x:0,y:0};
  // Thrusters accelerate into a turn; reverse thrust and release brake more firmly.
  const reversing=s.velocity.x*desired.x+s.velocity.y*desired.y<-.1;
  const blend=1-Math.exp(-dt*(magnitude>.02?(reversing?13:8):10.5));
  n.velocity={x:s.velocity.x+(desired.x-s.velocity.x)*blend,y:s.velocity.y+(desired.y-s.velocity.y)*blend};
  if(Math.hypot(n.velocity.x,n.velocity.y)<.012)n.velocity={x:0,y:0};
  const before=n.position,p=slide(n.chart,before,n.velocity,dt);
  if(Math.abs(p.x-before.x)<.00001&&Math.abs(n.velocity.x)>.01)n.velocity.x=0;
  if(Math.abs(p.y-before.y)<.00001&&Math.abs(n.velocity.y)>.01)n.velocity.y=0;
  n.travel+=distance(p,before);n.position=p;
  if(input.aim!==undefined&&Number.isFinite(input.aim))n.angle=turnAngle(n.angle,input.aim,dt*8.5);
  else if(Math.hypot(n.velocity.x,n.velocity.y)>.1){
    const heading={x:n.velocity.x+desired.x*.28,y:n.velocity.y+desired.y*.28};
    const target=Math.atan2(heading.y,heading.x),delta=Math.atan2(Math.sin(target-n.angle),Math.cos(target-n.angle));
    n.angle=turnAngle(n.angle,target,Math.min(dt*6.4,Math.abs(delta)*(1-Math.exp(-dt*12))));
  }
  const cell=key(n.position);if(cell!==n.surveyKey){n.surveyKey=cell;n.explored=survey(n.chart,n.position,n.explored,2+n.sonar);n.visited=[...n.visited,cellOf(n.position)].slice(-500);}
  collect(n);if(input.fire)fireInto(n);
  for(const enemy of n.enemies)updateEnemy(n,enemy,dt);updateProjectiles(n,dt);
  if(n.time>=n.ammoAt){n.ammo=Math.min(MAX_AMMO,n.ammo+1);n.ammoAt=n.time+.65;}
  if(distance(n.position,n.chart.start)<2.15)n.hp=Math.min(n.maxHp,n.hp+dt*3);
  if(n.hp<=0){n.phase="lost";n.endedAt=n.time;event(n,"defeat","Hull failure. Emergency recovery engaged. Dive again and watch for enemy windups." );}
  else if(complete(n)){n.phase="won";n.endedAt=n.time;event(n,"victory","All three beacons are online. The Leviathan is defeated. The deep echoes again." );notify(n,"The deep echoes again.","Expedition complete · Three beacons online","#bce8cc");}
  return n;
}
export function signal(s:Dive):{bearing:string;distance:number}|null {
  const targets:Point[]=s.chart.beacons.filter(b=>!s.restored.has(key(b)));if(!targets.length)targets.push(...s.enemies.filter(e=>e.kind==="leviathan"&&e.hp>0));targets.sort((a,b)=>distance(a,s.position)-distance(b,s.position));const t=targets[0];if(!t)return null;const dx=t.x-s.position.x,dy=t.y-s.position.y;return{bearing:`${dy<-.5?"N":dy>.5?"S":""}${dx<-.5?"W":dx>.5?"E":""}`||"Here",distance:distance(t,s.position)};
}
export function musicFor(s:Dive):MusicScene {
  if(s.phase==="lost")return"defeat";if(complete(s))return"victory";
  if(s.enemies.some(e=>e.kind==="leviathan"&&e.hp>0&&s.time-e.lastSeen<3.5))return"boss";
  if(s.enemies.some(e=>e.hp>0&&e.phase!=="patrol"&&s.time-e.lastSeen<3.5))return"battle";
  if(s.time-s.eventAt<3&&s.event==="beacon")return"beacon";if(s.time-s.eventAt<2.6&&["discovery","upgrade"].includes(s.event))return"discovery";return"explore";
}
