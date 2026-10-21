/** Pixel-cat rules. Time is active milliseconds, independent of the renderer. */
export const ROUND_MS = 90_000;
export const LEVEL_TARGETS = [500, 800, 1_200] as const;
export const levelNames = ["Courtyard", "Night market", "Moonlit roof"];
export function targetFor(s: CatState): number { return LEVEL_TARGETS[s.level]; }
export const MAX_LIVES = 5;
export const HUNGER_MS = 8_000;
export const MAX_OBJECTS = 9;
export const FIXED_FISH_CELLS = [0, 2, 4, 6, 8, 10];
/** Routine-mode home cells never depend on the seed or a random sample. */
export function fixedCell(kind: ObjectKind): number {
 if(kind==="fish") return FIXED_FISH_CELLS[0];
 if(kind==="web"||kind==="spicy") return 3;
 if(kind==="bone") return 7;
 if(kind==="banana"||kind==="can") return 11;
 return powers.indexOf(kind as PowerKind)%2===0?1:9;
}
export type PowerKind = "milk" | "bubble" | "ice" | "bell" | "catnip" | "soup" | "cake" | "potion" | "mystery";
export type ContactKind = "web" | "bone" | "banana";
export type ObjectKind = "fish" | "spicy" | "can" | ContactKind | PowerKind;
export type EndReason = "win" | "starved" | "picnic" | null;
export interface SnackObject { id: number; kind: ObjectKind; cell: number; born: number; expires: number; }
export interface Point { x: number; y: number; }
export interface Dog extends Point { until: number; armedAt: number; updatedAt: number; }
export interface CatState {
 level: number; randomness: boolean; seed: number; fixedFishSlot: number; startedAt: number; pausedAt: number | null;
 elapsed: number; lives: number; score: number; eaten: number; streak: number; bestStreak: number;
 hungerAt: number; nextWave: number; wave: number; nextId: number; objects: SnackObject[];
 shield: boolean; iceUntil: number; bellUntil: number; cozyUntil: number;
 cat: Point; webUntil: number; slipUntil: number; sizeUntil: number; size: "normal" | "big" | "small";
 dog: Dog | null; safeUntil: number; nextTick: number; biteCount: number;
 lastBite: (Point & {until: number; hit: boolean}) | null; boxes: number;
 lastBox: {kind:PowerKind|ContactKind;positive:boolean;at:number} | null;
 items: number; blocks: number; hungerLosses: number; hazards: number; misses: number;
 lastReward: number | null; message: string; reason: EndReason;
}
export const powers: PowerKind[] = ["milk", "bubble", "ice", "bell", "catnip", "soup", "cake", "potion", "mystery"];
export const powerNames: Record<PowerKind, string> = { milk:"Milk", bubble:"Bubble", ice:"Ice box", bell:"Dinner bell", catnip:"Catnip", soup:"Warm soup", cake:"Eat me", potion:"Drink me", mystery:"? box" };
export const contacts: ContactKind[] = ["web", "bone", "banana"];
export const contactNames: Record<ContactKind, string> = {web:"Web", bone:"Dog bone", banana:"Banana peel"};
export function catSize(s: CatState): "normal" | "big" | "small" { return s.elapsed < s.sizeUntil ? s.size : "normal"; }
export function catRadius(s: CatState): number { return catSize(s)==="big"?8:catSize(s)==="small"?2.6:5; }
export function biteRadius(s: CatState): number { return catSize(s)==="big"?16:catSize(s)==="small"?6:9; }
function distance(a: Point, b: Point): number { return Math.hypot(a.x-b.x,a.y-b.y); }
export function unit(seed: number, index: number, salt: number): number {
 let n = (seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0;
 n = Math.imul(n ^ n >>> 16, 0x7feb352d); n = Math.imul(n ^ n >>> 15, 0x846ca68b);
 return ((n ^ n >>> 16) >>> 0) / 0x1_0000_0000;
}
export function rewardFor(randomness: boolean, sample: number): number {
 if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new RangeError("Sample must be in [0, 1).");
 return randomness ? Math.floor(sample*31) : 15;
}
export function remainingMs(s: CatState, now: number): number {
 if(s.reason)return Math.max(0,ROUND_MS-s.elapsed);
 const time = s.pausedAt ?? now;
 return Math.max(0, Math.min(ROUND_MS, ROUND_MS - (time - s.startedAt)));
}
export function hungerRemaining(s: CatState): number { return Math.max(0, s.hungerAt - s.elapsed); }
export function cellPosition(cell: number): {x:number;y:number} {
 return { x: 12.5 + (cell % 4) * 25, y: 18 + Math.floor(cell / 4) * 30 };
}
function addObject(s: CatState, kind: ObjectKind, at: number, lifetime: number): CatState {
 if (s.objects.length >= MAX_OBJECTS) return s;
 const occupied = new Set(s.objects.map(o => o.cell));
 let cell: number, fixedFishSlot=s.fixedFishSlot;
 if(s.randomness) {
  const start=Math.floor(unit(s.seed,s.nextId,19)*12);
  cell=start;
  while(occupied.has(cell))cell=(cell+1)%12;
 } else if(kind==="fish") {
  const free=FIXED_FISH_CELLS.map((_,i)=>(s.fixedFishSlot+i)%FIXED_FISH_CELLS.length)
   .find(index=>!occupied.has(FIXED_FISH_CELLS[index]));
  if(free===undefined)return s;
  cell=FIXED_FISH_CELLS[free];fixedFishSlot=(free+1)%FIXED_FISH_CELLS.length;
 } else {
  cell=fixedCell(kind);
  if(occupied.has(cell))return s;
 }
 const object: SnackObject={id:s.nextId,kind,cell,born:at,expires:at+lifetime};
 return {...s,fixedFishSlot,nextId:s.nextId+1,objects:[...s.objects,object]};
}
function spawnWave(s: CatState, at: number): CatState {
 const stage = s.level, life = stage===0?5_200:stage===1?4_600:4_000;
 let next = {...s,objects:s.objects.filter(o=>o.expires>at)};
 const count = stage===0?2:3;
 for (let i=0;i<count;i++) next=addObject(next,"fish",at,life+(at<s.iceUntil?3000:0));
 if(s.randomness) {
  if(s.wave>=2 && unit(s.seed,s.wave,3)<.48)
   next=addObject(next,powers[Math.floor(unit(s.seed,s.wave,4)*powers.length)],at,5_500);
  if(stage>0 && unit(s.seed,s.wave,5)<(stage===1?.38:.54))
   next=addObject(next,unit(s.seed,s.wave,6)<.65?"spicy":"can",at,4_000);
  if(s.wave>=3 && unit(s.seed,s.wave,130)<[.30,.44,.50][stage])
   next=addObject(next,contacts[Math.floor(unit(s.seed,s.wave,131)*contacts.length)],at,5_000);
 } else {
  if(s.wave>=2 && s.wave%2===0)
   next=addObject(next,powers[((s.wave-2)/2)%powers.length],at,5_500);
  if(stage>0 && s.wave%3===1)
   next=addObject(next,Math.floor(s.wave/3)%2===0?"spicy":"can",at,4_000);
  if(s.wave>=3 && s.wave%3===0)
   next=addObject(next,contacts[(s.wave/3-1)%contacts.length],at,5_000);
 }
 return {...next,wave:s.wave+1,nextWave:at+(stage===0?2_400:stage===1?2_000:1_600)};
}
export function newCat(randomness: boolean, now: number, seed=1, level=0): CatState {
 if(!Number.isInteger(level)||level<0||level>=LEVEL_TARGETS.length)throw new RangeError("Level must be 0, 1 or 2.");
 const s: CatState = {level,randomness,seed:randomness?seed>>>0:0,fixedFishSlot:0,startedAt:now,pausedAt:null,elapsed:0,lives:5,score:0,eaten:0,streak:0,bestStreak:0,
  hungerAt:HUNGER_MS,nextWave:0,wave:0,nextId:1,objects:[],shield:false,iceUntil:0,bellUntil:0,cozyUntil:0,
  cat:{x:50,y:65},webUntil:0,slipUntil:0,sizeUntil:0,size:"normal",dog:null,safeUntil:0,nextTick:100,biteCount:0,lastBite:null,boxes:0,lastBox:null,
  items:0,blocks:0,hungerLosses:0,hazards:0,misses:0,lastReward:null,message:"Dinner time! Click a fish to feed your cat.",reason:null};
 return spawnWave(s,0);
}
function hungerDamage(s: CatState, at: number): CatState {
 const lives=s.shield?s.lives:s.lives-1;
 return {...s,lives,shield:false,blocks:s.blocks+(s.shield?1:0),hungerLosses:s.hungerLosses+1,
  streak:0,hungerAt:at+HUNGER_MS,reason:lives<=0?"starved":null,
  message:s.shield?"Bubble saved a heart. Find a fish!":"Your cat is hungry: −1 heart. Any fish fills its belly."};
}
/** Resolve hunger and waves chronologically, even after a delayed frame. */
export function advanceCat(s: CatState, now: number): CatState {
 if (s.reason || s.pausedAt!==null || now<s.startedAt) return s;
 const target=Math.min(ROUND_MS,Math.max(s.elapsed,now-s.startedAt));
 let next=s;
 while (!next.reason) {
  const event=Math.min(next.hungerAt,next.nextWave,next.nextTick);
  if(event>target || event>=ROUND_MS) break;
  next={...next,elapsed:event};
  if(event===next.hungerAt) next=hungerDamage(next,event);
  else if(event===next.nextWave) next=spawnWave(next,event);
  else next={...worldTick(next,event),nextTick:event+100};
 }
 if(next.reason) return {...next,objects:[]};
 if(next.score>=targetFor(next)) return winCat(next);
 next={...next,elapsed:target,objects:next.objects.filter(o=>o.expires>target)};
 if(target===ROUND_MS) return {...next,reason:"picnic",objects:[],dog:null,message:"Time is up. The picnic basket is not full yet."};
 return next;
}
function winCat(s: CatState): CatState {
 return {...s,reason:"win",objects:[],dog:null,message:s.level===LEVEL_TARGETS.length-1?"All three picnics complete!":"Level "+(s.level+1)+" clear! Ready for the next picnic."};
}
/** Progress is unlocked by a win, never by a timeout or a failed attempt. */
export function advanceLevel(s: CatState, now: number, seed=1): CatState | null {
 if(s.reason!=="win"||s.level>=LEVEL_TARGETS.length-1)return null;
 return newCat(s.randomness,now,seed,s.level+1);
}
export function fishReward(s: CatState, id: number): number {
 return rewardFor(s.randomness,s.randomness?unit(s.seed,id,77):0);
}
/** Preview every routine box: its contents are always milk. */
export function boxResult(s: CatState, roll: number): {kind:PowerKind|ContactKind;positive:boolean} {
 if(!s.randomness)return {kind:"milk",positive:true};
 const good:PowerKind[]=["milk","bubble","ice","bell","catnip","soup","cake","potion"];
 const positive=unit(s.seed,roll,151)<.5;
 const pool=positive?good:contacts;
 return {kind:pool[Math.floor(unit(s.seed,roll,152)*pool.length)],positive};
}
export function clickObject(s: CatState, id: number, now: number): CatState {
 let next=advanceCat(s,now);
 if(next.reason || next.pausedAt!==null || now<next.startedAt) return next;
 const object=next.objects.find(o=>o.id===id);
 if(!object) return next;
 const p=cellPosition(object.cell);
 if(next.elapsed<next.webUntil && distance(next.cat,p)>biteRadius(next)) return {...next,message:"Caught in a web! You can only reach nearby snacks until it clears."};
 if(contacts.includes(object.kind as ContactKind)) {
  return object.born+700<=next.elapsed && next.elapsed>=next.safeUntil && distance(next.cat,p)<=catRadius(next)+3?consumeContact(next,object):next;
 }
 if(object.kind==="fish" && next.elapsed<next.slipUntil) {
  const index=next.biteCount+1;
  const aim={x:Math.max(0,Math.min(100,p.x+(next.randomness?(unit(next.seed,index,141)*2-1)*13:-6))),
   y:Math.max(0,Math.min(100,p.y+(next.randomness?(unit(next.seed,index,142)*2-1)*13:0)))};
  const hit=distance(aim,p)<=biteRadius(next);
  next={...next,biteCount:index,lastBite:{...aim,hit,until:next.elapsed+650}};
  if(!hit) return {...next,misses:next.misses+1,streak:0,message:"Slippery paws! Your bite landed off target. No heart lost."};
 }
 next={...next,objects:next.objects.filter(o=>o.id!==id)};
 if(object.kind==="fish") {
  const eaten=[object];
  if(next.elapsed<next.bellUntil || catSize(next)==="big") {
   const p=cellPosition(object.cell);
   const nearby=next.objects.filter(o=>{const q=cellPosition(o.cell);return o.kind==="fish"&&Math.hypot(p.x-q.x,p.y-q.y)<=(next.elapsed<next.bellUntil?32:28);});
   eaten.push(...nearby);const ids=new Set(nearby.map(o=>o.id));next={...next,objects:next.objects.filter(o=>!ids.has(o.id))};
  }
  let gain=0;for(const fish of eaten) gain+=fishReward(next,fish.id);
  const streak=next.streak+eaten.length;
  const fed:CatState={...next,score:next.score+gain,eaten:next.eaten+eaten.length,streak,bestStreak:Math.max(next.bestStreak,streak),
   hungerAt:Math.max(next.elapsed+HUNGER_MS,next.cozyUntil+HUNGER_MS),lastReward:gain,
   message:gain?`Nom! +${gain} snack points${eaten.length>1?` · collected ${eaten.length} fish`:""}.`:`Nom! Belly full, +0 points. The next fish may have a different value.`};
  return fed.score>=targetFor(fed)?winCat(fed):fed;
 }
 if(object.kind==="spicy"||object.kind==="can") {
  if(next.shield) return {...next,shield:false,blocks:next.blocks+1,hazards:next.hazards+1,message:"Bubble blocked the trouble!"};
  if(object.kind==="can") return {...next,score:Math.max(0,next.score-20),hazards:next.hazards+1,streak:0,message:"Empty tin! −20 points. Look for fish-shaped snacks."};
  const lives=next.lives-1;
  return {...next,lives,hazards:next.hazards+1,streak:0,reason:lives<=0?"starved":null,message:"Too spicy! −1 heart. Red snacks are trouble."};
 }
 return applyEffect({...next,items:next.items+1},object.kind as PowerKind,object.id);
}
/** Apply a mystery result without manufacturing an object or recursing into a box. */
function applyEffect(next: CatState, kind: PowerKind | ContactKind, roll: number): CatState {
 switch(kind) {
  case "milk": return {...next,lives:Math.min(MAX_LIVES,next.lives+1),message:"Milk! One heart restored, up to five."};
  case "bubble": return {...next,shield:true,message:"Bubble! Blocks one penalty, trap, or dog bite."};
  case "ice": return {...next,iceUntil:next.elapsed+8_000,objects:next.objects.map(o=>o.kind==="fish"?{...o,expires:o.expires+3_000}:o),message:"Ice box! Fish stay fresh 3 seconds longer for 8 seconds."};
  case "bell": return {...next,bellUntil:next.elapsed+8_000,message:"Dinner bell! Clicking a fish also eats nearby fish for 8 seconds."};
  case "soup": return {...next,cozyUntil:next.elapsed+6_000,hungerAt:Math.max(next.hungerAt,next.elapsed+HUNGER_MS)+6_000,message:"Warm soup! Six extra seconds before hunger returns."};
  case "catnip": for(let i=0;i<3;i++)next=addObject(next,"fish",next.elapsed,5_000);return {...next,message:"Catnip party! Three bonus fish, if there is room."};
  case "cake": return {...next,size:"big",sizeUntil:next.elapsed+10_000,message:"EAT ME! Big for 10s: bites collect nearby fish, but traps and the dog can reach you more easily."};
  case "potion": return {...next,size:"small",sizeUntil:next.elapsed+10_000,message:"DRINK ME! Small for 10s: easier to dodge, but banana-offset bites need more precise aim."};
  case "mystery": {
   const {kind:result,positive}=boxResult(next,roll);
   const revealed=applyEffect({...next,boxes:next.boxes+1},result,roll);
   return {...revealed,lastBox:{kind:result,positive,at:next.elapsed},message:(next.randomness?"? BOX → ":"MILK BOX → ")+(positive?powerNames[result as PowerKind]:contactNames[result as ContactKind])+". "+revealed.message};
  }
  default: {
   if(next.shield) return {...next,shield:false,blocks:next.blocks+1,safeUntil:next.elapsed+600,message:"Bubble blocked the "+contactNames[kind].toLowerCase()+"!"};
   const guarded={...next,hazards:next.hazards+1,safeUntil:next.elapsed+600};
   if(kind==="web") return {...guarded,webUntil:next.elapsed+2_200,message:"Web! Stuck for 2.2s. Nearby food is still within reach."};
   if(kind==="banana") return {...guarded,slipUntil:next.elapsed+6_000,message:next.randomness?"Banana peel! Random bite offsets for 6s. Misses cost no hearts.":"Banana peel! A predictable six-unit left offset for 6s. No random rolls."};
   if(next.dog) return {...guarded,message:"Another bone! Only one dog can chase you at a time."};
   const corners=[{x:3,y:8},{x:97,y:8},{x:3,y:92},{x:97,y:92}];
   const start=corners.sort((a,b)=>distance(b,next.cat)-distance(a,next.cat))[0];
   return {...guarded,dog:{...start,armedAt:next.elapsed+800,until:next.elapsed+8_000,updatedAt:next.elapsed},
    message:"Bone! A dog is coming: move kitty away. One bite costs one heart, then the dog leaves."};
  }
 }
}
function consumeContact(s: CatState, object: SnackObject): CatState {
 return applyEffect({...s,objects:s.objects.filter(o=>o.id!==object.id)},object.kind as ContactKind,object.id);
}
/** First intersection along a pointer segment; a fast mouse cannot skip a web. */
function entryOnSegment(from: Point, to: Point, center: Point, radius: number): number | null {
 const dx=to.x-from.x,dy=to.y-from.y,fx=from.x-center.x,fy=from.y-center.y;
 const c=fx*fx+fy*fy-radius*radius;
 if(c<=0)return 0;
 const a=dx*dx+dy*dy;
 if(a===0)return null;
 const b=2*(fx*dx+fy*dy),d=b*b-4*a*c;
 if(d<0)return null;
 const t=(-b-Math.sqrt(d))/(2*a);
 return t>=0&&t<=1?t:null;
}
function contactAlong(s: CatState, to: Point): CatState {
 let next=s;
 if(s.elapsed<s.safeUntil) return {...next,cat:to};
 const candidates=s.objects.filter(o=>contacts.includes(o.kind as ContactKind)&&o.born+700<=s.elapsed&&o.expires>s.elapsed)
  .map(o=>({o,t:entryOnSegment(s.cat,to,cellPosition(o.cell),catRadius(s)+3)}))
  .filter((v): v is {o:SnackObject;t:number}=>v.t!==null).sort((a,b)=>a.t-b.t);
 if(candidates.length) {
  const {o,t}=candidates[0];
  const at={x:s.cat.x+(to.x-s.cat.x)*t,y:s.cat.y+(to.y-s.cat.y)*t};
  next=consumeContact({...next,cat:at},o);
  if(next.elapsed<next.webUntil) return next;
 }
 return {...next,cat:to};
}
function dogContact(s: CatState): CatState {
 if(!s.dog || s.elapsed<s.dog.armedAt || s.elapsed<s.safeUntil || distance(s.cat,s.dog)>catRadius(s)+3+1e-8) return s;
 if(s.shield) return {...s,dog:null,shield:false,blocks:s.blocks+1,safeUntil:s.elapsed+1_200,message:"Bubble blocked the dog. Shoo!"};
 const lives=Math.max(0,s.lives-1);
 return {...s,dog:null,lives,streak:0,hazards:s.hazards+1,safeUntil:s.elapsed+1_200,reason:lives===0?"starved":null,message:"Woof! −1 heart. The dog has left."};
}
function worldTick(s: CatState, at: number): CatState {
 let next=contactAlong(s,s.cat);
 const dog=next.dog;
 if(dog) {
  if(at>=dog.until) next={...next,dog:null};
  else {
   const length=distance(dog,next.cat),step=Math.min(length,18*Math.max(0,at-Math.max(dog.updatedAt,dog.armedAt))/1000);
   next={...next,dog:{...dog,x:dog.x+(length?(next.cat.x-dog.x)*step/length:0),y:dog.y+(length?(next.cat.y-dog.y)*step/length:0),updatedAt:at}};
  }
 }
 return dogContact(next);
}
export function moveCat(s: CatState, x: number, y: number, now: number): CatState {
 const next=advanceCat(s,now);
 if(next.reason||next.pausedAt!==null||next.elapsed<next.webUntil||!Number.isFinite(x)||!Number.isFinite(y))return next;
 const moved=contactAlong(next,{x:Math.max(3,Math.min(97,x)),y:Math.max(6,Math.min(94,y))});
 if(moved.dog && moved.elapsed>=moved.dog.armedAt && moved.elapsed>=moved.safeUntil) {
  const t=entryOnSegment(next.cat,moved.cat,moved.dog,catRadius(moved)+3);
  if(t!==null){
   const at={x:next.cat.x+(moved.cat.x-next.cat.x)*t,y:next.cat.y+(moved.cat.y-next.cat.y)*t};
   const hit=dogContact({...moved,cat:at});
   return hit.reason?hit:{...hit,cat:moved.cat};
  }
 }
 return dogContact(moved);
}

export function emptyClick(s: CatState, now: number): CatState {
 const next=advanceCat(s,now);
 return next.reason||next.pausedAt!==null?next:{...next,misses:next.misses+1,streak:0,message:"A little air bite. Find a fish before the hunger bar empties."};
}
export function pauseCat(s: CatState, now: number): CatState {
 const next=advanceCat(s,now);return next.reason||next.pausedAt!==null?next:{...next,pausedAt:now};
}
export function resumeCat(s: CatState, now: number): CatState {
 return s.pausedAt===null||s.reason?s:{...s,startedAt:s.startedAt+Math.max(0,now-s.pausedAt),pausedAt:null};
}
export function badges(s: CatState): string[] {
 const result:string[]=[];if(s.eaten>=12)result.push("Fish fan");if(s.items>=3)result.push("Little collector");if(s.blocks>=1)result.push("Nine lives");return result;
}
