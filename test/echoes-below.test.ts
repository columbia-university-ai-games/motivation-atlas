// @vitest-environment jsdom
import {describe,expect,it,vi} from "vitest";
import {advance,chartFor,complete,fire,FIRE_INTERVAL,findPath,inInk,key,leviathanStage,makeEnemy,musicFor,newDive,noticeFor,pulse,repair,setFog,start,togglePause,vesselEvolution,vesselMuzzle,visible,weaponDamage,type Dive,type EnemyKind,type Input,type ItemKind} from "../src/minigames/echoes-below/game";
import {notesFor,tempoFor} from "../src/minigames/echoes-below/audio";
import {echoesBelow} from "../src/minigames/echoes-below";
function run(state:Dive,seconds:number,input:Input={x:0,y:0,fire:false}):Dive {let next=state;for(let i=0;i<Math.ceil(seconds*60);i++)next=advance(next,1/60,input);return next;}
function sandbox(kind:EnemyKind="stalker",x=15,y=10):Dive {
  const chart={...chartFor(),reefs:[],items:[],enemies:[makeEnemy(kind,{x,y},"e0")]};
  return {...start(newDive(chart)),position:{x:12,y:10},surveyKey:"",hp:180};
}
describe("real-time expedition",()=>{
  it.each([0,1,2])("chart %i includes ten enemy types, 33 enemies and reachable encounters",id=>{
    const chart=chartFor(id);expect(chartFor(id)).toEqual(chart);expect(chart.enemies).toHaveLength(33);expect(new Set(chart.enemies.map(e=>e.kind)).size).toBe(10);
    for(const target of [...chart.beacons,...chart.items,...chart.enemies])expect(findPath(chart,chart.start,target).length).toBeGreaterThan(0);
  });
  it("enemies move and attack even with zero player input",()=>{
    const original=sandbox(),next=run(original,4);
    expect(next.position).toEqual(original.position);expect(next.enemies[0].x).not.toBe(original.enemies[0].x);
    expect(next.hp).toBeLessThan(original.hp);expect(original.enemies[0].x).toBe(15);
  });
  it("accelerates gradually, turns smoothly and decelerates after release",()=>{
    const state={...sandbox(),enemies:[]};const first=advance(state,1/60,{x:1,y:0,fire:false});
    expect(first.position.x-state.position.x).toBeGreaterThan(0);expect(first.position.x-state.position.x).toBeLessThan(.03);
    const cruising=run(first,.5,{x:1,y:0,fire:false});expect(cruising.velocity.x).toBeGreaterThan(3);
    const stopping=advance(cruising,1/60);expect(stopping.velocity.x).toBeGreaterThan(0);expect(stopping.velocity.x).toBeLessThan(cruising.velocity.x);
    const stopped=run(stopping,1);expect(stopped.velocity.x).toBeLessThan(.01);
    const turning=advance(cruising,1/60,{x:0,y:1,fire:false});expect(turning.angle).toBeGreaterThan(0);expect(turning.angle).toBeLessThan(Math.PI/2);
  });
  it("normalizes diagonal thrust and brakes promptly when reversing direction",()=>{
    const state={...sandbox(),enemies:[]};
    const straight=run(state,1,{x:1,y:0,fire:false}),diagonal=run(state,1,{x:1,y:1,fire:false});
    expect(Math.hypot(diagonal.velocity.x,diagonal.velocity.y)).toBeCloseTo(Math.hypot(straight.velocity.x,straight.velocity.y),5);
    const released=advance(straight,1/60),reversing=advance(straight,1/60,{x:-1,y:0,fire:false});
    expect(reversing.velocity.x).toBeLessThan(released.velocity.x);expect(run(straight,.3,{x:-1,y:0,fire:false}).velocity.x).toBeLessThan(0);
  });
  it("pausing freezes both the world clock and incoming attacks",()=>{
    const state=run(sandbox("submarine"),2.7),paused=togglePause(state),next=run(paused,4);
    expect(next).toBe(paused);expect(next.time).toBe(state.time);expect(next.projectiles).toEqual(state.projectiles);
    expect(run(togglePause(next),1).time).toBeGreaterThan(state.time);
  });
  it("enemy submarines visibly lock before launching a traveling torpedo",()=>{
    let state=sandbox("submarine");let sawAim=false,sawProjectile=false,hit=false;
    for(let i=0;i<360;i++){state=advance(state,1/60);sawAim ||= state.enemies[0].phase==="aim";sawProjectile ||= state.projectiles.some(p=>p.owner==="enemy"&&p.kind==="torpedo");hit ||= state.hp<180;}
    expect(sawAim).toBe(true);expect(sawProjectile).toBe(true);expect(hit).toBe(true);
  });
  it("submarines kite and retreat at low health rather than only chasing",()=>{
    let state=sandbox("submarine");state.enemies[0].hp=10;state.enemies[0].attackAt=99;
    const next=run(state,1);expect(next.enemies[0].phase).toBe("retreat");expect(next.enemies[0].x).toBeGreaterThan(15);
  });
  it("retains last-seen information and finds a route around a reef wall",()=>{
    const state=sandbox("elite",15,10);state.chart={...state.chart,reefs:[{x:14,y:9},{x:14,y:10},{x:14,y:11}]};state.enemies[0].lastSeen=0;state.enemies[0].lastKnown={...state.position};state.enemies[0].attackAt=99;
    const next=run(state,2);expect(next.enemies[0].pathUntil).toBeGreaterThan(0);expect(next.enemies[0].y).not.toBe(10);
  });
  it("player torpedoes fly before dealing damage and respect the firing cooldown",()=>{
    const state={...sandbox(),weapon:3};const shot=fire(state);expect(shot.projectiles).toHaveLength(1);expect(shot.enemies[0].hp).toBe(state.enemies[0].hp);
    expect(fire(shot).projectiles).toHaveLength(1);const impact=run(shot,.45);expect(impact.enemies[0].hp).toBe(state.enemies[0].hp-weaponDamage(state));expect(impact.effects.some(e=>e.kind==="explosion")).toBe(true);
  });
  it("fires from the bow along the hull angle even without enemies, and never homes toward a target",()=>{
    const base={...sandbox(),angle:Math.PI/2},shot=fire(base),missile=shot.projectiles[0];
    expect(missile).toMatchObject({...vesselMuzzle(base),angle:Math.PI/2,target:null});
    expect(missile.y).toBeGreaterThan(base.position.y);expect(missile.x).toBeCloseTo(base.position.x);
    const after=run(shot,.4);expect(after.projectiles[0].angle).toBe(Math.PI/2);expect(after.enemies[0].hp).toBe(base.enemies[0].hp);
    expect(fire({...base,enemies:[]}).projectiles).toHaveLength(1);
  });
  it("held fire launches repeatedly at a faster cadence and stops when released",()=>{
    const base={...sandbox(),enemies:[],ammoAt:99};
    const firing=run(base,1,{x:0,y:0,fire:true});expect(firing.shots).toBe(5);expect(firing.ammo).toBe(base.ammo-5);
    expect(FIRE_INTERVAL).toBeLessThan(.3);expect(run(firing,.5).shots).toBe(firing.shots);
  });
  it("manual aim turns the entire vessel while independent thrust allows evasive movement",()=>{
    const base={...sandbox(),enemies:[]},aimed=run(base,.5,{x:0,y:1,fire:true,aim:0});
    expect(aimed.position.y).toBeGreaterThan(base.position.y);expect(aimed.angle).toBe(0);
    expect(aimed.projectiles.every(p=>p.angle===0&&p.target===null)).toBe(true);
    expect(run(base,.5,{x:0,y:0,fire:false,aim:Math.PI/2}).angle).toBeCloseTo(Math.PI/2);
  });
  it("a launched torpedo can be dodged by moving perpendicular to its trajectory",()=>{
    const base=sandbox("submarine",17,10);base.enemies[0].hp=0;
    base.projectiles=[{id:100,x:16,y:10,owner:"enemy",kind:"torpedo",angle:Math.PI,speed:5.2,damage:30,born:0,life:3,radius:.14,target:null,hit:false,area:0}];
    expect(run(base,1).hp).toBeLessThan(180);expect(run(base,1,{x:0,y:1,fire:false}).hp).toBe(180);
  });
  it("jellyfish charge an expanding shockwave; rays shoot a fan of projectiles",()=>{
    const jelly=run(sandbox("jelly",14,10),2.65);expect(jelly.projectiles.some(p=>p.kind==="wave")).toBe(true);
    const ray=run(sandbox("ray",16,10),2.2);expect(ray.projectiles.filter(p=>p.kind==="acid").length).toBe(5);
  });
  it("the three new species have distinct autonomous attacks",()=>{
    const angler=run(sandbox("angler",15,10),1.8);expect(angler.enemies[0].attackKind).toBe("charge");
    const cuttle=run(sandbox("cuttle",16,10),2.5);expect(cuttle.projectiles.some(p=>p.kind==="ink")).toBe(true);
    const urchin=run(sandbox("urchin",16,10),2.7);expect(urchin.projectiles.filter(p=>p.kind==="spine").length).toBe(12);
  });
  it("ink impact leaves a temporary cloud that slows thrust and expires",()=>{
    const base={...sandbox(),enemies:[]};
    base.projectiles=[{id:100,x:12.8,y:10,owner:"enemy",kind:"ink",angle:Math.PI,speed:4.5,damage:18,born:0,life:2,radius:.14,target:null,hit:false,area:0}];
    const hit=run(base,.12);expect(hit.hazards).toHaveLength(1);expect(inInk(hit)).toBe(true);
    const clear=run({...hit,hazards:[]},.3,{x:0,y:1,fire:false}),slowed=run(hit,.3,{x:0,y:1,fire:false});
    expect(slowed.velocity.y).toBeLessThan(clear.velocity.y);expect(run(hit,5).hazards).toHaveLength(0);
  });
  it("the crystal fortress exposes a weaker core during its telegraph",()=>{
    const base=sandbox("urchin",15,10);base.enemies[0].attackAt=99;
    const closed=run(fire(base),.3).enemies[0].hp;
    const opening={...base,enemies:[{...base.enemies[0],phase:"aim" as const,phaseUntil:99}]};
    const exposed=run(fire(opening),.3).enemies[0].hp;expect(exposed).toBeLessThan(closed);
  });
  it("queues short notices for every pickup and beacon, without changing the player's motion",()=>{
    let state=sandbox();state.enemies=[];state.chart={...state.chart,items:[{id:"i0",kind:"weapon",name:"Missile Amplifier",description:"",x:12,y:10}],beacons:[{x:12,y:10},{x:24,y:9},{x:24,y:17}]};
    state=advance(state,1/60);expect(state.weapon).toBe(2);expect(weaponDamage(state)).toBe(18);expect(state.notices).toHaveLength(2);expect(noticeFor(state)?.title).toBe("Missile Amplifier");
    expect(noticeFor(run(state,1.6))?.title).toContain("Beacon");expect(run(state,3.3).notices).toHaveLength(0);
  });
  it("beacon resupply preserves repair kits already above its refill target",()=>{
    const state=sandbox();state.enemies=[];state.kits=6;
    state.chart={...state.chart,beacons:[{...state.position},{x:24,y:9},{x:24,y:17}]};
    const supplied=advance(state,1/60);expect(supplied.restored.size).toBe(1);expect(supplied.kits).toBeGreaterThanOrEqual(state.kits);
  });
  it("evolves the whole vessel at three, six and nine permanent upgrades, excluding supplies and beacons",()=>{
    const kinds:ItemKind[]=["weapon","hull","sonar","shield","relic","weapon","hull","sonar","shield","ammo","repair"];
    const base=sandbox();base.chart={...base.chart,items:kinds.map((kind,i)=>({id:`tier-${i}`,kind,name:kind,description:"",x:20,y:10}))};
    expect(vesselEvolution(base)).toMatchObject({tier:0,count:0,next:3});
    for(const [count,tier,next] of [[2,0,3],[3,1,6],[5,1,6],[6,2,9],[8,2,9],[9,3,null]] as const){
      const collected=new Set(base.chart.items.slice(0,count).map(i=>i.id));collected.add("tier-9");collected.add("tier-10");
      expect(vesselEvolution({...base,collected,restored:new Set(base.chart.beacons.map(key))})).toMatchObject({tier,count,next});
    }
  });
  it("announces a new hull once when collecting an upgrade across an evolution threshold",()=>{
    let state=sandbox();state.enemies=[];
    state.chart={...state.chart,beacons:[],items:["weapon","hull","sonar"].map((kind,i)=>({id:`upgrade-${i}`,kind:kind as ItemKind,name:`Upgrade ${i}`,description:"",x:i===2?12:20,y:10}))};
    state.collected=new Set(["upgrade-0","upgrade-1"]);
    const picked=advance(state,1/60),evolution=vesselEvolution(picked);
    expect(evolution).toMatchObject({tier:1,count:3,next:6});
    expect(picked.notices.some(n=>n.title.includes(evolution.name))).toBe(true);
    const again=advance(picked,1/60);expect(vesselEvolution(again)).toEqual(evolution);expect(again.notices).toEqual(picked.notices);
  });
  it("raises the leviathan's combat stage as its health falls",()=>{
    const boss=makeEnemy("leviathan",{x:15,y:10},"boss");
    expect(leviathanStage(boss)).toBe(1);expect(leviathanStage({...boss,hp:boss.maxHp*.65})).toBe(2);expect(leviathanStage({...boss,hp:boss.maxHp*.3})).toBe(3);
  });
  it("adapts boss attacks to spacing and player motion without immediately repeating a move",()=>{
    const choices=[];
    for(const [range,moving] of [[2,false],[6.5,false],[4,true]] as const){
      const state=sandbox("leviathan",12+range,10);state.enemies[0].attackAt=0;
      if(moving)state.velocity={x:0,y:2.5};
      const input={x:0,y:moving?1:0,fire:false},first=advance(state,1/60,input).enemies[0];
      expect(first.phase).toBe("aim");choices.push(first.attackKind);
      state.enemies[0].attackKind=first.attackKind;
      expect(advance(state,1/60,input).enemies[0].attackKind).not.toBe(first.attackKind);
    }
    expect(new Set(choices).size).toBe(3);
  });
  it("locks the charge telegraph and gives a moving player time to evade it",()=>{
    const state=sandbox("leviathan",15,10),boss=state.enemies[0];
    Object.assign(boss,{phase:"aim",attackKind:"charge",phaseUntil:1.15,aim:{...state.position},angle:Math.PI});
    const evading=run(state,.6,{x:0,y:1,fire:false});expect(evading.enemies[0].aim).toEqual(state.position);
    expect(run(state,2).hp).toBeLessThan(state.hp);expect(run(state,2,{x:0,y:1,fire:false}).hp).toBe(state.hp);
  });
  it("escalates sweep bursts in the final boss stage while preserving a windup",()=>{
    const sweep=(final:boolean)=>{
      const state=sandbox("leviathan",20,10),boss=state.enemies[0];
      Object.assign(boss,{phase:"aim",attackKind:"sweep",phaseUntil:.2,aim:{...state.position},hp:final?boss.maxHp*.2:boss.maxHp});
      expect(run(state,.15).projectiles).toHaveLength(0);
      return run(state,1.3).projectiles.filter(p=>p.owner==="enemy"&&p.kind==="spine").length;
    };
    const opening=sweep(false),final=sweep(true);expect(opening).toBeGreaterThan(0);expect(final).toBeGreaterThan(opening);
  });
  it("makes dodging worthwhile: an upgraded vessel can win by evading but cannot just absorb every boss attack",()=>{
    function duel(evade:boolean):Dive {
      const chart={...chartFor(),reefs:[],items:[],enemies:[makeEnemy("leviathan",{x:20,y:10},"e23")]};
      let state={...start(newDive(chart)),position:{x:14,y:10},weapon:4,hp:250,maxHp:250,armor:4,ammo:180,kits:0,restored:new Set(chart.beacons.map(key))};
      for(let i=0;i<3600&&state.phase==="playing";i++){
        const boss=state.enemies[0],range=Math.hypot(state.position.x-boss.x,state.position.y-boss.y)||1,dx=(state.position.x-boss.x)/range,dy=(state.position.y-boss.y)/range;
        let x=0,y=0;
        if(evade){
          const radial=Math.max(-.9,Math.min(.9,(4.4-range)*1.2));x=-dy+dx*radial;y=dx+dy*radial;
          if(boss.phase==="aim"&&boss.attackKind==="nova"&&range<5.2){x=dx;y=dy;}
          if(state.position.x<2)x=Math.max(.5,x);if(state.position.x>27)x=Math.min(-.5,x);
          if(state.position.y<2)y=Math.max(.5,y);if(state.position.y>17)y=Math.min(-.5,y);
        }
        state=advance(state,1/60,{x,y,fire:true,aim:Math.atan2(boss.y-state.position.y,boss.x-state.position.x)});
      }
      return state;
    }
    const standing=duel(false),evading=duel(true);expect(standing.phase).toBe("lost");expect(evading.phase).toBe("won");expect(evading.hp).toBeGreaterThan(standing.hp);
  });
  it("puts stronger encounters deeper in each mirrored chart while preserving the opening area",()=>{
    for(const id of [0,1,2]){
      const chart=chartFor(id),opening=chart.enemies.find(e=>e.id==="e0")!,deep=chart.enemies.find(e=>e.id==="e4")!;
      expect(opening.hp).toBe(makeEnemy(opening.kind,{x:opening.x,y:opening.y},opening.id).hp);
      expect(deep.hp).toBeGreaterThan(makeEnemy(deep.kind,{x:deep.x,y:deep.y},deep.id).hp);expect(deep.attack).toBeGreaterThan(opening.attack);
    }
  });
  it("fog changes only visibility; identical real-time input produces identical combat",()=>{
    const initial=sandbox(),clear=setFog(initial,false);expect(visible(initial,{x:29,y:19})).toBe(false);expect(visible(clear,{x:29,y:19})).toBe(true);
    const a=run(initial,4,{x:0,y:1,fire:true}),b=run(clear,4,{x:0,y:1,fire:true});expect(a.enemies).toEqual(b.enemies);expect(a.hp).toBe(b.hp);expect(a.ammo).toBe(b.ammo);expect(a.explored).toEqual(b.explored);
  });
  it("scans and repairs use elapsed seconds rather than player turns",()=>{
    const state=sandbox(),scanned=pulse(state);expect(scanned.explored.size).toBeGreaterThan(state.explored.size);expect(pulse(scanned)).toBe(scanned);
    expect(pulse(run(scanned,8.1)).pulseReady).toBeGreaterThan(scanned.pulseReady);
    const repaired=repair({...state,hp:40});expect(repaired.hp).toBe(100);expect(repaired.kits).toBe(state.kits-1);
  });
  it("victory requires all beacons and the boss; defeat cannot be undone by ticking",()=>{
    const state=sandbox("leviathan");expect(complete({...state,restored:new Set(state.chart.beacons.map(key))})).toBe(false);
    const won=advance({...state,restored:new Set(state.chart.beacons.map(key)),enemies:[]},1/60);expect(won.phase).toBe("won");
    const lost=advance({...state,hp:0},1/60);expect(lost.phase).toBe("lost");expect(run(lost,2).enemies).toEqual(lost.enemies);
  });
});
describe("music and lifecycle",()=>{
  function pointer(target:EventTarget,type:string,id:number,x=0,y=0):void {
    const event=new Event(type,{bubbles:true,cancelable:true});Object.defineProperties(event,{pointerId:{value:id},clientX:{value:x},clientY:{value:y},pointerType:{value:"touch"}});target.dispatchEvent(event);
  }
  function mountTouch(){
    const host=document.createElement("div");document.body.append(host);const unmount=echoesBelow.mount(host),root=host.querySelector<HTMLElement>(".eb")!;
    host.querySelector<HTMLButtonElement>("[data-start]")!.click();root.classList.add("is-touch-cockpit");
    const move=host.querySelector<HTMLButtonElement>("[data-touch-move]")!,aim=host.querySelector<HTMLButtonElement>("[data-touch-aim]")!;
    for(const pad of[move,aim])vi.spyOn(pad,"getBoundingClientRect").mockReturnValue({x:0,y:0,left:0,top:0,right:100,bottom:100,width:100,height:100,toJSON:()=>({})});
    return{host,root,move,aim,dispose:()=>{unmount();host.remove();}};
  }
  it("lets one thumb steer while the other aims and fires, and releasing movement does not stop fire",()=>{
    vi.useFakeTimers();const touch=mountTouch();
    try{
      pointer(touch.move,"pointerdown",11,80,50);pointer(touch.aim,"pointerdown",22,50,20);vi.advanceTimersByTime(700);
      expect(Number(touch.root.dataset.x)).toBeGreaterThan(4);expect(touch.root.dataset.aimMode).toBe("touch-stick");
      expect(Number(touch.host.querySelector("[data-vessel]")!.getAttribute("data-angle"))).toBeCloseTo(-Math.PI/2,1);
      const lastShot=Number(touch.root.dataset.lastFired);pointer(window,"pointerup",11);vi.advanceTimersByTime(500);
      expect(Number(touch.root.dataset.lastFired)).toBeGreaterThan(lastShot);expect(touch.aim.classList.contains("is-active")).toBe(true);
      pointer(window,"pointerup",22);vi.advanceTimersByTime(200);const releasedAt=touch.root.dataset.lastFired;vi.advanceTimersByTime(500);expect(touch.root.dataset.lastFired).toBe(releasedAt);
      expect(touch.root.dataset.aimMode).toBe("heading");
    }finally{touch.dispose();expect(vi.getTimerCount()).toBe(0);vi.useRealTimers();}
  });
  it("clears captured thumbs on pause and does not resume firing until touched again",()=>{
    vi.useFakeTimers();const touch=mountTouch();
    try{
      pointer(touch.move,"pointerdown",11,80,50);pointer(touch.aim,"pointerdown",22,80,50);vi.advanceTimersByTime(300);
      touch.host.querySelector<HTMLButtonElement>("[data-touch-pause]")!.click();expect(touch.root.dataset.phase).toBe("paused");
      expect(touch.move.classList.contains("is-active")).toBe(false);expect(touch.aim.classList.contains("is-active")).toBe(false);
      const clock=touch.root.dataset.time;vi.advanceTimersByTime(400);expect(touch.root.dataset.time).toBe(clock);
      touch.host.querySelector<HTMLButtonElement>("[data-touch-pause]")!.click();const lastShot=touch.root.dataset.lastFired;vi.advanceTimersByTime(500);expect(touch.root.dataset.lastFired).toBe(lastShot);
    }finally{touch.dispose();expect(vi.getTimerCount()).toBe(0);vi.useRealTimers();}
  });
  it("stops a canceled or lost finger and clears controls when the screen rotates",()=>{
    vi.useFakeTimers();const touch=mountTouch();
    try{
      pointer(touch.aim,"pointerdown",22,80,50);vi.advanceTimersByTime(250);pointer(window,"pointercancel",22);vi.advanceTimersByTime(100);
      const canceledAt=touch.root.dataset.lastFired;vi.advanceTimersByTime(400);expect(touch.root.dataset.lastFired).toBe(canceledAt);
      pointer(touch.aim,"pointerdown",23,50,20);vi.advanceTimersByTime(250);pointer(touch.aim,"lostpointercapture",23);vi.advanceTimersByTime(100);
      const lostAt=touch.root.dataset.lastFired;vi.advanceTimersByTime(400);expect(touch.root.dataset.lastFired).toBe(lostAt);
      pointer(touch.move,"pointerdown",11,80,50);pointer(touch.aim,"pointerdown",24,80,50);window.dispatchEvent(new Event("resize"));
      expect(touch.move.classList.contains("is-active")).toBe(false);expect(touch.aim.classList.contains("is-active")).toBe(false);
    }finally{touch.dispose();expect(vi.getTimerCount()).toBe(0);vi.useRealTimers();}
  });
  it("uses F for fog while Space fires even when the fog switch has focus",()=>{
    vi.useFakeTimers();const host=document.createElement("div");document.body.append(host);const unmount=echoesBelow.mount(host);
    const root=host.querySelector<HTMLElement>(".eb")!,fog=host.querySelector<HTMLInputElement>("[data-mechanic]")!;
    const press=(key:string,repeat=false)=>{const event=new KeyboardEvent("keydown",{key,repeat,bubbles:true,cancelable:true});fog.dispatchEvent(event);return event;};
    try{
      host.querySelector<HTMLButtonElement>("[data-start]")!.click();fog.focus();
      const ammo=Number(host.querySelector("[data-ammo]")!.textContent);expect(press(" ").defaultPrevented).toBe(true);vi.advanceTimersByTime(500);window.dispatchEvent(new KeyboardEvent("keyup",{key:" "}));
      expect(root.dataset.fog).toBe("true");expect(fog.checked).toBe(true);expect(Number(host.querySelector("[data-ammo]")!.textContent)).toBeLessThan(ammo);
      expect(press("f").defaultPrevented).toBe(true);expect(root.dataset.fog).toBe("false");expect(fog.checked).toBe(false);
      press("f",true);expect(root.dataset.fog).toBe("false");press("F");expect(root.dataset.fog).toBe("true");
      press("Escape");expect(root.dataset.phase).toBe("paused");const pausedAt=root.dataset.time;press("f");vi.advanceTimersByTime(500);expect(root.dataset.fog).toBe("false");expect(root.dataset.phase).toBe("paused");expect(root.dataset.time).toBe(pausedAt);
    }finally{unmount();host.remove();expect(vi.getTimerCount()).toBe(0);vi.useRealTimers();}
  });
  it("selects battle music from autonomous enemy awareness and contains different scores",()=>{
    const state=run(sandbox(),.2);expect(musicFor(state)).toBe("battle");expect(musicFor(run(sandbox("leviathan"),.2))).toBe("boss");
    expect(notesFor("explore",0)).not.toEqual(notesFor("battle",0));expect(tempoFor("boss")).toBeGreaterThan(tempoFor("explore"));
  });
  it("starts, pauses and unmounts without leaving a frame loop or listeners behind",()=>{
    vi.useFakeTimers();const host=document.createElement("div");document.body.append(host);const unmount=echoesBelow.mount(host);
    host.querySelector<HTMLButtonElement>("[data-start]")!.click();expect(host.querySelector<HTMLElement>(".eb")!.dataset.phase).toBe("playing");
    host.querySelector<HTMLButtonElement>("[data-pause]")!.click();expect(host.querySelector<HTMLElement>(".eb")!.dataset.phase).toBe("paused");
    unmount();expect(host.childElementCount).toBe(0);expect(vi.getTimerCount()).toBe(0);host.remove();vi.useRealTimers();
  });
  it("holds Space to fire, reserves Escape for pause, and clears held fire when paused",()=>{
    vi.useFakeTimers();const host=document.createElement("div");document.body.append(host);const unmount=echoesBelow.mount(host);
    const root=host.querySelector<HTMLElement>(".eb")!,board=host.querySelector<HTMLElement>("[data-board]")!;
    const down=(key:string,repeat=false)=>board.dispatchEvent(new KeyboardEvent("keydown",{key,bubbles:true,cancelable:true,repeat}));
    const up=(key:string)=>window.dispatchEvent(new KeyboardEvent("keyup",{key,bubbles:true}));
    try{
      host.querySelector<HTMLButtonElement>("[data-start]")!.click();
      down("d");vi.advanceTimersByTime(1050);up("d");vi.advanceTimersByTime(350);
      const ammo=Number(host.querySelector("[data-ammo]")!.textContent);
      down(" ");vi.advanceTimersByTime(450);
      expect(root.dataset.phase).toBe("playing");expect(Number(host.querySelector("[data-ammo]")!.textContent)).toBeLessThan(ammo);
      down("Escape");expect(root.dataset.phase).toBe("paused");const pausedAt=root.dataset.time;
      down("Escape",true);down(" ");down("p");vi.advanceTimersByTime(1000);
      expect(root.dataset.phase).toBe("paused");expect(root.dataset.time).toBe(pausedAt);
      up(" ");down("Escape");expect(root.dataset.phase).toBe("playing");
      const resumedAmmo=Number(host.querySelector("[data-ammo]")!.textContent),lastFired=root.dataset.lastFired;vi.advanceTimersByTime(300);expect(Number(host.querySelector("[data-ammo]")!.textContent)).toBeGreaterThanOrEqual(resumedAmmo);expect(root.dataset.lastFired).toBe(lastFired);
    }finally{unmount();host.remove();expect(vi.getTimerCount()).toBe(0);vi.useRealTimers();}
  });
});
