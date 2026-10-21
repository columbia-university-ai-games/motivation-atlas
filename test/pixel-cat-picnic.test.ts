// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { advanceCat, advanceLevel, LEVEL_TARGETS, levelNames, targetFor, badges, boxResult, fishReward, fixedCell, FIXED_FISH_CELLS, catRadius, catSize, cellPosition, contacts, moveCat, clickObject, emptyClick, hungerRemaining, MAX_OBJECTS, newCat, pauseCat, powers, remainingMs, resumeCat, rewardFor, ROUND_MS, unit, type CatState, type ObjectKind } from "../src/minigames/pixel-cat-picnic/game";
import * as catRules from "../src/minigames/pixel-cat-picnic/game";
import { pixelCatPicnic } from "../src/minigames/pixel-cat-picnic";
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();document.body.replaceChildren();localStorage.clear();});
function fixture(kind:ObjectKind, extra:Partial<CatState>={}):CatState {
 return {...newCat(false,0,4),nextWave:999999,objects:[{id:1,kind,cell:0,born:0,expires:20000}],nextId:2,...extra};
}
function feedUntil(end:number,random=false,level=2):CatState {
 let s=newCat(random,0,4,level);
 for(let at=500;at<end;at+=1000){s=advanceCat(s,at);const fish=s.objects.find(o=>o.kind==="fish");if(fish)s=clickObject(s,fish.id,at);}
 return s;
}
describe("Pixel Cat core rules",()=>{
 it("covers all integer rewards 0 through 30 and matches the fixed mean of 15",()=>{
  const rewards=Array.from({length:31},(_,i)=>rewardFor(true,(i+.5)/31));
  expect(rewards).toEqual(Array.from({length:31},(_,i)=>i));
  expect(rewards.reduce((a,b)=>a+b,0)/31).toBe(15);
  expect([0,.3,.9999].map(n=>rewardFor(false,n))).toEqual([15,15,15]);
  for(const n of [-1,1,NaN])expect(()=>rewardFor(true,n)).toThrow();
 });
 it("starts with five hearts, an eight-second belly and two clickable fish",()=>{
  const s=newCat(true,0);expect(s.lives).toBe(5);expect(hungerRemaining(s)).toBe(8000);
  expect(s.objects.filter(o=>o.kind==="fish")).toHaveLength(2);expect(s.reason).toBe(null);
 });
 it("loses one heart per eight unfed seconds and catches up delayed frames",()=>{
  const s=newCat(false,0);expect(advanceCat(s,7999).lives).toBe(5);expect(advanceCat(s,8000).lives).toBe(4);
  const end=advanceCat(s,40000);expect(end.lives).toBe(0);expect(end.reason).toBe("starved");expect(end.elapsed).toBe(40000);
 });
 it("a zero-point fish still fully feeds the cat",()=>{
  let seed=1;while(rewardFor(true,unit(seed,1,77))!==0)seed++;
  const s=clickObject(fixture("fish",{randomness:true,seed}),1,7000);
  expect(s.score).toBe(0);expect(s.eaten).toBe(1);expect(s.lives).toBe(5);expect(s.hungerAt).toBe(15000);
 });
 it("a fish scores once and does not mutate its prior state",()=>{
  const original=fixture("fish"),s=clickObject(original,1,1000);
  expect(s.score).toBe(15);expect(s.eaten).toBe(1);expect(original.score).toBe(0);expect(original.objects).toHaveLength(1);
  expect(clickObject(s,1,1000).eaten).toBe(1);
 });
 it("expired fish and stale object ids cannot grant food or points",()=>{
  const s=fixture("fish",{objects:[{id:1,kind:"fish",cell:0,born:0,expires:1000}]});
  expect(clickObject(s,1,1000).score).toBe(0);expect(clickObject(s,999,1000).eaten).toBe(0);
 });
 it("empty clicks are harmless to hearts but break a chain",()=>{
  const s=emptyClick(fixture("fish",{streak:5}),1000);expect(s.lives).toBe(5);expect(s.streak).toBe(0);expect(s.misses).toBe(1);
 });
 it("wins immediately on the fish that reaches the target",()=>{
  const s=clickObject(fixture("fish",{score:LEVEL_TARGETS[0]-15}),1,1234);
  expect(s.reason).toBe("win");expect(s.elapsed).toBe(1234);
  expect(s.objects).toEqual([]);expect(remainingMs(s,80000)).toBe(ROUND_MS-1234);
  expect(advanceCat(s,90000)).toBe(s);expect(emptyClick(s,80000)).toBe(s);
 });
 it("a normal fixed-mode run can win in one to two minutes without waiting for dawn",()=>{
  const s=feedUntil(90000);expect(s.reason).toBe("win");
  expect(s.elapsed).toBeGreaterThanOrEqual(60000);expect(s.elapsed).toBeLessThan(ROUND_MS);
  expect(s.score).toBeGreaterThanOrEqual(LEVEL_TARGETS[2]);expect(s.lives).toBeGreaterThan(0);
 });
 it("uses a separate failure result when time expires below the target",()=>{
  const s=advanceCat({...fixture("fish"),elapsed:89999,hungerAt:999999,nextTick:90000,score:10},90000);
  expect(s.reason).toBe("picnic");expect(s.lives).toBeGreaterThan(0);
 });
 it("completed games reject later food and time changes",()=>{
  const s=advanceCat(newCat(false,0),40000);expect(clickObject(s,1,41000)).toBe(s);expect(advanceCat(s,50000)).toBe(s);
 });
 it("has three stages and bounded, non-overlapping spawn cells",()=>{
  expect(LEVEL_TARGETS).toEqual([500,800,1200]);expect(levelNames).toHaveLength(3);
  for(let seed=1;seed<15;seed++){
   let s=newCat(false,0,seed,seed%3);
   for(let now=0;now<90000;now+=700){s=advanceCat(s,now);expect(s.objects.length).toBeLessThanOrEqual(MAX_OBJECTS);expect(new Set(s.objects.map(o=>o.cell)).size).toBe(s.objects.length);for(const o of s.objects){const p=cellPosition(o.cell);expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(100);}}
  }
 });
 it("makes OFF independent of seeds while ON changes the layout",()=>{
  expect(advanceCat(newCat(false,0,1),7000)).toEqual(advanceCat(newCat(false,0,98765),7000));
  const a=newCat(true,0,1),b=newCat(true,0,2);
  expect(a.objects).not.toEqual(b.objects);
  expect(a.nextWave).toBe(newCat(false,0).nextWave);
 });
 it("pause freezes hunger, events and timed effects; resume retains their budgets",()=>{
  const s=pauseCat(newCat(false,0),3000);expect(advanceCat(s,50000)).toBe(s);expect(remainingMs(s,50000)).toBe(87000);
  expect(clickObject(s,s.objects[0].id,50000)).toBe(s);
  const resumed=resumeCat(s,53000);expect(advanceCat(resumed,57999).lives).toBe(5);expect(advanceCat(resumed,58000).lives).toBe(4);
 });
});
describe("treats and hazards",()=>{
 it("milk restores one heart, never above five",()=>{expect(clickObject(fixture("milk",{lives:3}),1,1000).lives).toBe(4);expect(clickObject(fixture("milk"),1,1000).lives).toBe(5);});
 it("bubble blocks one starvation loss then is consumed",()=>{let s=clickObject(fixture("bubble"),1,1000);s=advanceCat(s,8000);expect(s.lives).toBe(5);expect(s.blocks).toBe(1);expect(s.shield).toBe(false);expect(advanceCat(s,16000).lives).toBe(4);});
 it("ice extends existing fish and its active duration is bounded",()=>{
  const s=clickObject(fixture("ice",{objects:[{id:1,kind:"ice",cell:0,born:0,expires:20000},{id:2,kind:"fish",cell:1,born:0,expires:5000}]}),1,1000);
  expect(s.iceUntil).toBe(9000);expect(s.objects[0].expires).toBe(8000);
 });
 it("bell eats nearby fish only and pays each independent fish once",()=>{
  let s=fixture("bell",{objects:[{id:1,kind:"bell",cell:0,born:0,expires:20000},{id:2,kind:"fish",cell:1,born:0,expires:20000},{id:3,kind:"fish",cell:2,born:0,expires:20000},{id:4,kind:"spicy",cell:5,born:0,expires:20000}]});
  s=clickObject(s,1,1000);s=clickObject(s,2,1100);expect(s.eaten).toBe(2);expect(s.score).toBe(30);expect(s.objects.map(o=>o.kind)).toEqual(["spicy"]);expect(s.lives).toBe(5);
 });
 it("catnip adds at most three fish without occupying used cells",()=>{const s=clickObject(fixture("catnip"),1,1000);expect(s.objects).toHaveLength(3);expect(s.objects.every(o=>o.kind==="fish")).toBe(true);expect(new Set(s.objects.map(o=>o.cell)).size).toBe(3);});
 it("warm soup extends hunger and later fish cannot shorten the cozy protection",()=>{
  let s=clickObject(fixture("soup"),1,1000);expect(s.hungerAt).toBe(15000);
  s={...s,objects:[{id:2,kind:"fish",cell:1,born:0,expires:20000}]};s=clickObject(s,2,1100);expect(s.hungerAt).toBeGreaterThanOrEqual(15000);
 });
 it("spicy fish costs one heart; tins cost points without negative totals",()=>{
  expect(clickObject(fixture("spicy"),1,1000).lives).toBe(4);expect(clickObject(fixture("can",{score:10}),1,1000).score).toBe(0);
  expect(clickObject(fixture("spicy",{lives:1}),1,1000).reason).toBe("starved");
 });
 it("bubble protects both hazards and does not multiply rewards",()=>{for(const kind of ["spicy","can"] as const){const s=clickObject(fixture(kind,{shield:true,score:50}),1,1000);expect(s.lives).toBe(5);expect(s.score).toBe(50);expect(s.blocks).toBe(1);expect(s.shield).toBe(false);}});
 it("all nine pickup types occur in the seeded schedule",()=>{
  const found=new Set<string>();for(let seed=1;seed<40;seed++){let s=newCat(true,0,seed);for(let at=0;at<90000;at+=1000){s=advanceCat(s,at);for(const o of s.objects)if(powers.includes(o.kind as typeof powers[number]))found.add(o.kind);const f=s.objects.find(o=>o.kind==="fish");if(f)s=clickObject(s,f.id,at);}}
  expect([...found].sort()).toEqual([...powers].sort());
 });
 it("badges reflect actions rather than quiz answers or extra points",()=>{expect(badges({...newCat(false,0),eaten:12,items:3,blocks:1})).toEqual(["Fish fan","Little collector","Nine lives"]);});
});
describe("pixel cat input and lifecycle",()=>{
 it("does not eat by hovering, dragging or holding a pointer",()=>{
  vi.useFakeTimers();vi.setSystemTime(0);
  const host=document.createElement("div"),unmount=pixelCatPicnic.mount(host);host.querySelector<HTMLButtonElement>('[data-start]')!.click();
  const fish=host.querySelector<HTMLButtonElement>('[data-kind="fish"]')!,arena=host.querySelector<HTMLElement>('[data-arena]')!;
  arena.dispatchEvent(new MouseEvent("pointermove",{bubbles:true,clientX:20,clientY:20}));expect(host.querySelector('[data-eaten]')!.textContent).toBe("0");
  fish.dispatchEvent(new MouseEvent("pointerdown",{bubbles:true,clientX:20,clientY:20}));arena.dispatchEvent(new MouseEvent("pointermove",{bubbles:true,clientX:100,clientY:20}));arena.dispatchEvent(new MouseEvent("pointerup",{bubbles:true,clientX:100,clientY:20}));
  fish.dispatchEvent(new MouseEvent("click",{bubbles:true,detail:1}));expect(host.querySelector('[data-eaten]')!.textContent).toBe("0");
  fish.click();expect(host.querySelector('[data-eaten]')!.textContent).toBe("1");unmount();expect(vi.getTimerCount()).toBe(0);
 });
 it("provides a failure screen, mode switch, pause and clean unmount",()=>{
  vi.useFakeTimers();vi.setSystemTime(0);
  const host=document.createElement("div"),unmount=pixelCatPicnic.mount(host);expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
  host.querySelector<HTMLButtonElement>('[data-start]')!.click();host.querySelector<HTMLButtonElement>('[data-pause]')!.click();
  vi.advanceTimersByTime(45000);expect(host.querySelector('[data-lives]')!.textContent).toBe("5");
  host.querySelector<HTMLButtonElement>('[data-resume]')!.click();vi.advanceTimersByTime(40000);
  expect(host.querySelector<HTMLElement>('[data-result-screen]')!.dataset.outcome).toBe("fail");expect(host.textContent).toContain("TIME FOR A CAT NAP");
  host.querySelector<HTMLButtonElement>('[data-other-mode]')!.click();expect(host.querySelector<HTMLInputElement>('[data-mechanic]')!.checked).toBe(false);
  unmount();expect(host.childNodes).toHaveLength(0);expect(vi.getTimerCount()).toBe(0);
 });
});


describe("contact traps, Wonderland size and mystery effects",()=>{
 it("sweeps the pointer path into a web, freezes position, then releases it",()=>{
  let s=fixture("web",{cat:{x:3,y:18}});
  s=moveCat(s,90,18,1000);
  expect(s.webUntil).toBe(3200);expect(s.cat.x).toBeLessThan(12.5);
  const caught=s.cat;expect(moveCat(s,90,80,2000).cat).toEqual(caught);
  expect(moveCat(s,90,80,3200).cat).toEqual({x:90,y:80});
 });
 it("gives new contact hazards a warning before they arm",()=>{
  let s=fixture("web",{cat:{x:12.5,y:18}});
  s=advanceCat(s,699);expect(s.webUntil).toBe(0);
  expect(advanceCat(s,700).webUntil).toBe(2900);
 });
 it("cannot click remote snacks while stuck, but nearby fish remain edible",()=>{
  const s=fixture("fish",{cat:{x:12.5,y:18},webUntil:3000,objects:[{id:1,kind:"fish",cell:0,born:0,expires:20000},{id:2,kind:"milk",cell:11,born:0,expires:20000}]});
  expect(clickObject(s,2,1000).items).toBe(0);
  expect(clickObject(s,1,1000).eaten).toBe(1);
 });
 it("a bone summons one pursuing dog with a short arrival warning",()=>{
  let s=fixture("bone",{cat:{x:12.5,y:18}});
  s=advanceCat(s,1000);expect(s.dog).not.toBe(null);
  expect(s.dog!.armedAt).toBe(1500);
  const from=s.dog!;s=advanceCat(s,2000);
  expect(Math.hypot(s.dog!.x-s.cat.x,s.dog!.y-s.cat.y)).toBeLessThan(Math.hypot(from.x-s.cat.x,from.y-s.cat.y));
 });
 it("a dog bite removes one heart, dismisses the dog and never repeats",()=>{
  let s=fixture("fish",{dog:{x:50,y:65,armedAt:0,until:8000,updatedAt:0}});
  s=advanceCat(s,100);expect(s.lives).toBe(4);expect(s.dog).toBe(null);
  expect(advanceCat(s,2000).lives).toBe(4);
 });
 it("the dog cannot be skipped by moving the pointer through it in one event",()=>{
  let s=fixture("fish",{cat:{x:10,y:50},dog:{x:50,y:50,armedAt:0,until:8000,updatedAt:0}});
  s=moveCat(s,90,50,0);expect(s.lives).toBe(4);expect(s.dog).toBe(null);
 });
 it("a shield blocks a dog bite and each new contact trap once",()=>{
  const dog=advanceCat(fixture("fish",{shield:true,dog:{x:50,y:65,armedAt:0,until:8000,updatedAt:0}}),100);
  expect(dog.lives).toBe(5);expect(dog.blocks).toBe(1);expect(dog.shield).toBe(false);
  for(const kind of contacts){const s=advanceCat(fixture(kind,{shield:true,cat:{x:12.5,y:18}}),700);
   expect(s.blocks).toBe(1);expect(s.webUntil).toBe(0);expect(s.slipUntil).toBe(0);expect(s.dog).toBe(null);}
 });
 it("dogs leave on timeout, and pause freezes trap and chase budgets",()=>{
  let s=fixture("fish",{webUntil:2200,slipUntil:6000,size:"big",sizeUntil:10000,dog:{x:97,y:92,until:8000,armedAt:0,updatedAt:0}});
  s=pauseCat(s,100);const frozen=advanceCat(s,60000);expect(frozen).toBe(s);
  s=resumeCat(s,60100);expect(advanceCat(s,61100).elapsed).toBe(1100);
  s=advanceCat({...s,cat:{x:3,y:6},safeUntil:99999,hungerAt:99999},68000);expect(s.dog).toBe(null);
 });
 it("banana offset is bounded, actually changes the bite, and costs no heart on a miss",()=>{
  const outcomes=new Set<boolean>();
  for(let seed=0;seed<30;seed++){const s=clickObject(fixture("fish",{randomness:true,seed,slipUntil:6000}),1,1000);
   expect(s.lastBite).not.toBe(null);expect(Math.abs(s.lastBite!.x-12.5)).toBeLessThanOrEqual(13);
   expect(Math.abs(s.lastBite!.y-18)).toBeLessThanOrEqual(13);expect(s.lives).toBe(5);outcomes.add(s.eaten>0);
   if(!s.lastBite!.hit){expect(s.objects).toHaveLength(1);expect(s.hungerAt).toBe(8000);expect(s.misses).toBe(1);}
  }
  expect(outcomes.size).toBe(2);
 });
 it("slipping expires after six seconds without changing the reward odds",()=>{
  const s=clickObject(fixture("fish",{slipUntil:6000}),1,6000);expect(s.score).toBe(15);expect(s.lastBite).toBe(null);
 });
 it("cake grows the cat, widens collision and collects adjacent fish",()=>{
  let s=clickObject(fixture("cake"),1,1000);expect(catSize(s)).toBe("big");expect(catRadius(s)).toBe(8);
  s={...s,objects:[{id:2,kind:"fish",cell:0,born:0,expires:20000},{id:3,kind:"fish",cell:1,born:0,expires:20000}]};
  s=clickObject(s,2,1100);expect(s.eaten).toBe(2);expect(s.score).toBe(30);
  expect(catSize(advanceCat({...s,hungerAt:99999},11000))).toBe("normal");
 });
 it("potion shrinks the collision area and replaces growth instead of stacking",()=>{
  const s=clickObject(fixture("potion",{size:"big",sizeUntil:9000}),1,1000);
  expect(catSize(s)).toBe("small");expect(catRadius(s)).toBe(2.6);expect(s.sizeUntil).toBe(11000);
 });
 it("the same near-miss web is safe when small but caught when large",()=>{
  const base=fixture("web",{cat:{x:3,y:25},sizeUntil:10000});
  expect(moveCat({...base,size:"small"},90,25,1000).webUntil).toBe(0);
  expect(moveCat({...base,size:"big"},90,25,1000).webUntil).toBeGreaterThan(1000);
 });
 it("boxes reveal both positive and negative effects with no recursion or extra score",()=>{
  const results=new Set<string>();
  for(let seed=0;seed<150;seed++){
   const s=clickObject(fixture("mystery",{randomness:true,seed}),1,1000);
   expect(s.boxes).toBe(1);expect(s.items).toBe(1);expect(s.score).toBe(0);
   expect(s.message).toContain("? BOX → ");results.add(s.message.split(". ")[0]);
   expect(s.objects.every(o=>o.kind!=="mystery")).toBe(true);
  }
  for(const name of ["Milk","Eat me","Drink me","Web","Dog bone","Banana peel"])expect([...results].some(s=>s.includes(name))).toBe(true);
 });
 it("completed rounds reject pointer contact and dog movement",()=>{
  const s=advanceCat(newCat(false,0),40000);expect(moveCat(s,1,1,50000)).toBe(s);
 });
});


describe("global randomness switch and early completion",()=>{
 it("keeps OFF fish in marked lanes and every item in its fixed home",()=>{
  let s=newCat(false,0,99);
  for(let at=0;at<90000&&!s.reason;at+=500){
   s=advanceCat(s,at);
   for(const o of s.objects){
    if(o.kind==="fish")expect(FIXED_FISH_CELLS).toContain(o.cell);
    else expect(o.cell).toBe(fixedCell(o.kind));
   }
   for(const o of [...s.objects])if(o.kind==="fish"||powers.includes(o.kind as typeof powers[number]))s=clickObject(s,o.id,at);
  }
 });
 it("replays OFF exactly with the same actions, regardless of supplied seed",()=>{
  function run(seed:number){
   let s=newCat(false,0,seed);const trace:unknown[]=[];
   for(let at=0;at<=60000&&!s.reason;at+=1000){
    s=advanceCat(s,at);trace.push(s.objects.map(o=>({...o})));
    for(const f of s.objects.filter(o=>o.kind==="fish"))s=clickObject(s,f.id,at);
   }
   return {s,trace};
  }
  expect(run(1)).toEqual(run(0xffffffff));
 });
 it("always opens milk boxes in OFF and never samples a random outcome",()=>{
  for(const seed of [0,1,999]){
   const s=fixture("mystery",{seed,lives:3});
   expect(boxResult(s,77)).toEqual({kind:"milk",positive:true});
   const opened=clickObject(s,1,1000);
   expect(opened.lives).toBe(4);expect(opened.lastBox?.kind).toBe("milk");
   expect(opened.message).toContain("MILK BOX");
  }
 });
 it("uses one known left offset in OFF and seed-dependent offsets in ON",()=>{
  for(const seed of [1,2,30]){
   const s=clickObject(fixture("fish",{seed,slipUntil:6000}),1,1000);
   expect(s.lastBite).toEqual({x:6.5,y:18,until:1650,hit:true});
  }
  const a=clickObject(fixture("fish",{randomness:true,seed:1,slipUntil:6000}),1,1000);
  const b=clickObject(fixture("fish",{randomness:true,seed:2,slipUntil:6000}),1,1000);
  expect(a.lastBite).not.toEqual(b.lastBite);
 });
 it("the payout function covers all generated values, including zero and thirty",()=>{
  const values=new Set<number>();
  for(let seed=0;seed<300;seed++){
   const s=fixture("fish",{randomness:true,seed});
   const value=fishReward(s,1);values.add(value);
   expect(clickObject(s,1,1000).score).toBe(value);
  }
  expect(values.size).toBe(31);expect([...values]).toContain(0);expect([...values]).toContain(30);
 });
 it("changes the visible policy immediately and starts OFF without Math.random",()=>{
  vi.useFakeTimers();vi.setSystemTime(0);
  const host=document.createElement("div"),unmount=pixelCatPicnic.mount(host);
  const random=host.querySelector<HTMLInputElement>('[data-mechanic]')!;
  expect(host.querySelector('[data-mode-badge]')!.textContent).toContain("SURPRISE");
  random.checked=false;random.dispatchEvent(new Event("change"));
  expect(host.querySelector('[data-mode-badge]')!.textContent).toContain("FIXED ROUTINE");
  const spy=vi.spyOn(Math,"random").mockImplementation(()=>{throw new Error("OFF must not request entropy");});
  host.querySelector<HTMLButtonElement>('[data-start]')!.click();
  expect(spy).not.toHaveBeenCalled();
  expect([...host.querySelectorAll('[data-kind="fish"] .cat-object-label')].map(n=>n.textContent)).toEqual(["+15","+15"]);
  expect(host.querySelector('.cat-arena')!.classList.contains("is-routine")).toBe(true);
  unmount();
 });
 it("shows the victory screen immediately and stops its interval before 90 seconds",()=>{
  vi.useFakeTimers();vi.setSystemTime(0);
  const host=document.createElement("div"),unmount=pixelCatPicnic.mount(host);
  const random=host.querySelector<HTMLInputElement>('[data-mechanic]')!;random.checked=false;
  host.querySelector<HTMLButtonElement>('[data-start]')!.click();
  for(let i=0;i<90&&host.querySelector<HTMLElement>('[data-result-screen]')!.hidden;i++){
   for(const f of [...host.querySelectorAll<HTMLButtonElement>('[data-kind="fish"]')])f.click();
   vi.advanceTimersByTime(1000);
  }
  expect(host.querySelector<HTMLElement>('[data-result-screen]')!.dataset.outcome).toBe("win");
  expect(Number(host.querySelector('[data-clock]')!.textContent!.replace("s",""))).toBeGreaterThan(0);
  expect(vi.getTimerCount()).toBe(0);unmount();
 });
});


describe("hidden surprise rewards",()=>{
 it("hides ON rewards in text and accessible labels until the fish is eaten",()=>{
  vi.useFakeTimers();vi.setSystemTime(0);vi.spyOn(Math,"random").mockReturnValue(1/0x100000000);
  const host=document.createElement("div"),unmount=pixelCatPicnic.mount(host);
  host.querySelector<HTMLButtonElement>('[data-start]')!.click();
  const fish=[...host.querySelectorAll<HTMLButtonElement>('[data-kind="fish"]')];
  expect(fish.length).toBeGreaterThan(0);
  for(const f of fish){
   expect(f.textContent).toBe("Fish");
   expect(f.getAttribute("aria-label")).not.toMatch(/[0-9]/);
   expect(f.hasAttribute("title")).toBe(false);
   expect(f.hasAttribute("data-reward")).toBe(false);
  }
  expect(host.querySelector('[data-score]')!.textContent).toBe("0");
  fish[0].click();
  expect(Number(host.querySelector('[data-score]')!.textContent)).toBeGreaterThan(0);
  expect(host.querySelector('[role="status"]')!.textContent).toContain("Nom! +");
  expect(host.querySelector('.cat-pop')!.textContent).toMatch(/^\+[0-9]+$/);
  expect([...host.querySelectorAll('[data-kind="fish"]')].every(f=>f.textContent==="Fish")).toBe(true);
  unmount();
 });
});


describe("three-level progression",()=>{
 it("wins each level immediately at its own threshold, not the next threshold",()=>{
  for(let level=0;level<3;level++){
   const base={...fixture("fish"),level};
   const below=clickObject({...base,score:LEVEL_TARGETS[level]-16},1,1000);
   expect(below.score).toBe(LEVEL_TARGETS[level]-1);expect(below.reason).toBe(null);
   const clear=clickObject({...base,score:LEVEL_TARGETS[level]-15},1,1000);
   expect(clear.score).toBe(LEVEL_TARGETS[level]);expect(clear.reason).toBe("win");expect(clear.elapsed).toBe(1000);
  }
 });
 it("starts the next level with a fresh score, hearts, clock and effects",()=>{
  const cleared={...fixture("fish"),score:500,reason:"win" as const,lives:1,shield:true,webUntil:3000,slipUntil:4000,size:"big" as const,sizeUntil:5000,eaten:34};
  const next=advanceLevel(cleared,50000,77)!;
  expect(next.level).toBe(1);expect(targetFor(next)).toBe(800);
  expect(next.score).toBe(0);expect(next.lives).toBe(5);expect(next.elapsed).toBe(0);
  expect(remainingMs(next,50000)).toBe(90000);expect(next.hungerAt).toBe(8000);
  expect(next.webUntil).toBe(0);expect(next.slipUntil).toBe(0);expect(next.shield).toBe(false);expect(next.size).toBe("normal");
  expect(next.eaten).toBe(0);expect(cleared.score).toBe(500);
 });
 it("cannot advance before a win, after a loss or beyond the third level",()=>{
  const s=newCat(false,0);
  expect(advanceLevel(s,1000)).toBe(null);
  expect(advanceLevel({...s,reason:"picnic"},90000)).toBe(null);
  expect(advanceLevel({...s,level:2,reason:"win"},90000)).toBe(null);
 });
 it("retains the chosen policy across levels and normalizes OFF seeds",()=>{
  const on=advanceLevel({...newCat(true,0,1),reason:"win"},1000,77)!;
  expect(on.randomness).toBe(true);expect(on.seed).toBe(77);
  const off=advanceLevel({...newCat(false,0),reason:"win"},1000,77)!;
  expect(off.randomness).toBe(false);expect(off.seed).toBe(0);
 });
 it("uses increasing level pace and rejects invalid level indexes",()=>{
  const levels=[0,1,2].map(level=>newCat(false,0,1,level));
  expect(levels.map(s=>s.objects.length)).toEqual([2,3,3]);
  expect(levels.map(s=>s.nextWave)).toEqual([2400,2000,1600]);
  for(const level of [-1,3,1.5,NaN])expect(()=>newCat(false,0,1,level)).toThrow();
 });
 it("offers next-level screens, preserves mode, and shows final victory only after level three", { timeout: 20000 }, ()=>{
  vi.useFakeTimers();vi.setSystemTime(0);
  const host=document.createElement("div"),unmount=pixelCatPicnic.mount(host);
  const random=host.querySelector<HTMLInputElement>('[data-mechanic]')!;random.checked=false;
  host.querySelector<HTMLButtonElement>('[data-start]')!.click();
  for(let level=0;level<3;level++){
   expect(host.querySelector('[data-goal]')!.textContent).toBe(String(LEVEL_TARGETS[level]));
   expect(host.querySelector('[data-score]')!.textContent).toBe("0");
   expect(host.querySelector('[data-clock]')!.textContent).toBe("90s");
   for(let i=0;i<90&&host.querySelector<HTMLElement>('[data-result-screen]')!.hidden;i++){
    for(const fish of [...host.querySelectorAll<HTMLButtonElement>('[data-kind="fish"]')])fish.click();
    vi.advanceTimersByTime(1000);
   }
   const result=host.querySelector<HTMLElement>('[data-result-screen]')!;
   expect(result.dataset.outcome).toBe("win");expect(result.dataset.level).toBe(String(level+1));
   expect(result.dataset.complete).toBe(String(level===2));expect(vi.getTimerCount()).toBe(0);
   const next=host.querySelector<HTMLButtonElement>('[data-next-level]')!;
   expect(next.hidden).toBe(level===2);expect(random.disabled).toBe(level<2);
   if(level<2){
    next.click();next.click();
    expect(host.querySelector('[data-goal]')!.textContent).toBe(String(LEVEL_TARGETS[level+1]));
    expect(vi.getTimerCount()).toBe(1);
   }
  }
  expect(host.textContent).toContain("ALL 3 LEVELS CLEAR!");
  host.querySelector<HTMLButtonElement>('[data-replay]')!.click();
  expect(host.querySelector('[data-goal]')!.textContent).toBe("500");
  expect(random.checked).toBe(false);unmount();expect(vi.getTimerCount()).toBe(0);
 });
 it("retries a failed second level without skipping it or returning to level one",()=>{
  vi.useFakeTimers();vi.setSystemTime(0);
  const host=document.createElement("div"),unmount=pixelCatPicnic.mount(host);
  host.querySelector<HTMLInputElement>('[data-mechanic]')!.checked=false;
  host.querySelector<HTMLButtonElement>('[data-start]')!.click();
  for(let i=0;i<90&&host.querySelector<HTMLElement>('[data-result-screen]')!.hidden;i++){
   for(const fish of [...host.querySelectorAll<HTMLButtonElement>('[data-kind="fish"]')])fish.click();
   vi.advanceTimersByTime(1000);
  }
  host.querySelector<HTMLButtonElement>('[data-next-level]')!.click();vi.advanceTimersByTime(40000);
  expect(host.querySelector<HTMLElement>('[data-result-screen]')!.dataset.outcome).toBe("fail");
  expect(host.querySelector<HTMLButtonElement>('[data-next-level]')!.hidden).toBe(true);
  host.querySelector<HTMLButtonElement>('[data-replay]')!.click();
  expect(host.querySelector('[data-goal]')!.textContent).toBe("800");
  expect(host.querySelector('[data-score]')!.textContent).toBe("0");
  expect(host.querySelector('[data-lives]')!.textContent).toBe("5");
  vi.advanceTimersByTime(40000);
  const random=host.querySelector<HTMLInputElement>('[data-mechanic]')!;random.checked=true;random.dispatchEvent(new Event("change"));
  host.querySelector<HTMLButtonElement>('[data-replay]')!.click();
  expect(host.querySelector('[data-goal]')!.textContent).toBe("500");
  unmount();
 });
});

describe("keyboard focus safety",()=>{
 it("selects snacks without moving through an armed web or activating it",()=>{
  vi.useFakeTimers();vi.setSystemTime(0);
  vi.spyOn(catRules,"newCat").mockReturnValue({...fixture("fish"),objects:[
   {id:1,kind:"fish",cell:0,born:0,expires:20000},
   {id:2,kind:"web",cell:5,born:-1000,expires:20000}
  ]});
  const host=document.createElement("div");document.body.append(host);
  const unmount=pixelCatPicnic.mount(host);
  Object.defineProperties(host.querySelector(".cat-arena")!,{clientWidth:{value:400},clientHeight:{value:400}});
  host.querySelector<HTMLInputElement>('[data-mechanic]')!.checked=false;
  host.querySelector<HTMLButtonElement>('[data-start]')!.click();
  const cursor=host.querySelector<HTMLElement>(".cat-cursor")!;
  const location=[cursor.style.left,cursor.style.top];
  host.querySelector<HTMLButtonElement>('[data-kind="web"]')!.focus();
  host.querySelector<HTMLButtonElement>('[data-kind="fish"]')!.focus();
  expect(document.activeElement).toBe(host.querySelector('[data-kind="fish"]'));
  expect([cursor.style.left,cursor.style.top]).toEqual(location);
  expect(cursor.classList.contains("is-webbed")).toBe(false);
  expect(host.querySelector('[data-lives]')!.textContent).toBe("5");
  host.querySelector<HTMLButtonElement>('[data-kind="fish"]')!.click();
  expect(host.querySelector('[data-score]')!.textContent).toBe("15");
  unmount();
 });
});
