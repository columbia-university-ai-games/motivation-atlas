// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGame, move, interact, visibility, reveal, radius, WORLD, shouldShowCompass, compassTarget, hasEverything, questStage, navigationTargets } from "../src/minigames/fogbound/game";
import { fogbound } from "../src/minigames/fogbound";

afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });

describe("Fogbound rules", () => {
  it("hides unknown cells, remembers visited terrain, and reveals the viewport with fog off", () => {
    const g = createGame(true);
    expect(visibility(g, 5, 18)).toBe("lit");
    expect(visibility(g, 30, 3)).toBe("hidden");
    g.player = { x: 14.5, y: 19.5 }; reveal(g);
    expect(visibility(g, 5, 18)).toBe("memory");
    expect(visibility(g, 3, 19)).toBe("lit"); // camp keeps its own light
    g.fog = false;
    expect(visibility(g, 30, 3)).toBe("lit");
  });
  it("does not record unseen terrain just because the comparison mode is off", () => {
    const g = createGame(false); g.fog = true;
    expect(visibility(g, 30, 3)).toBe("hidden");
  });
  it("normalizes diagonal motion and blocks walls and world boundaries", () => {
    const a = createGame(true), b = createGame(true);
    move(a, 1, 0, 0.1); move(b, 1, -1, 0.1);
    expect(Math.hypot(b.player.x - 3.5, b.player.y - 19.5)).toBeCloseTo(a.player.x - 3.5);
    a.player = { x: 9.5, y: 14.5 }; move(a, 1, 0, 1);
    expect(a.player.x).toBeLessThan(10);
    a.player = { x: 0.25, y: 2.5 }; move(a, -1, 0, 1);
    expect(a.player.x).toBeGreaterThanOrEqual(0.2);
  });
  it("opens nearby outposts once, upgrades sight, and ends after both are opened", () => {
    const g = createGame(true), before = radius(g);
    interact(g); expect(g.outposts[0].hits).toBe(0);
    for (const c of g.chests.slice(0,2)) { g.player={...c};interact(g); }
    g.player = { ...g.outposts[0] };
    for (let i = 0; i < 3; i++) interact(g);
    expect(g.outposts[0].open).toBe(true); expect(radius(g)).toBeGreaterThan(before);
    interact(g); expect(radius(g)).toBe(before + 0.7);
    g.player = { ...g.outposts[1] };
    for (let i = 0; i < 3; i++) interact(g);
    expect(g.finished).toBe(true);
    const p = { ...g.player }; move(g, 1, 0, 1); expect(g.player.x).toBeGreaterThan(p.x);
    const c=g.chests.find(c=>!c.open)!;g.player={...c};interact(g);expect(c.open).toBe(true);
  });
  it("requires one supply per outpost, consumes it once, and keeps completion statistics", () => {
    const g=createGame(true);g.player={...g.outposts[0]};interact(g);expect(g.outposts[0].hits).toBe(0);
    g.player={...g.chests[0]};interact(g);expect(g.supplies).toBe(1);
    g.player={...g.outposts[0]};interact(g);expect(g.supplies).toBe(0);expect(g.outposts[0].hits).toBe(1);
    interact(g);interact(g);expect(g.outposts[0].open).toBe(true);expect(g.supplies).toBe(0);
    g.player={...g.chests[1]};interact(g);g.player={...g.outposts[1]};
    g.elapsed=75;interact(g);interact(g);interact(g);expect(g.completion?.elapsed).toBe(75);
    g.elapsed=90;expect(g.completion?.elapsed).toBe(75);
  });
  it("collects a chest only once and leaves distant chests untouched", () => {
    const g = createGame(true); interact(g);
    expect(g.chests.every(c => !c.open)).toBe(true);
    g.player = { ...g.chests[0] }; interact(g); interact(g);
    expect(g.chests.filter(c => c.open)).toHaveLength(1);
  });
  it("eases into motion and settles within a tiny distance after release", () => {
    const g=createGame(true);move(g,1,0,0.04);
    expect(g.player.x-3.5).toBeLessThan(2.16*0.04);
    move(g,1,0,0.2);const x=g.player.x,before=g.speed;
    move(g,0,0,0.016);expect(g.speed).toBeGreaterThan(0);expect(g.speed).toBeLessThan(before);
    move(g,0,0,0.2);expect(g.player.x-x).toBeGreaterThan(0);expect(g.player.x-x).toBeLessThan(0.05);expect(g.speed).toBe(0);
  });
  it("changes direction continuously rather than instantly reversing", () => {
    const g=createGame(true);move(g,1,0,0.2);const x=g.player.x;
    move(g,-1,0,0.016);expect(g.player.x).toBeGreaterThan(x);
    move(g,-1,0,0.2);expect(g.player.x).toBeLessThan(x);
  });
  it("gives equivalent movement at different update frequencies", () => {
    const a=createGame(true),b=createGame(true);move(a,1,0,0.2);
    for(let i=0;i<20;i++)move(b,1,0,0.01);
    expect(a.player.x).toBeCloseTo(b.player.x,8);expect(a.speed).toBeCloseTo(b.speed,8);
  });
  it("keeps supplies, collection, progression and movement identical in both fog modes", () => {
    const on=createGame(true),off=createGame(false);
    for(const g of [on,off]) {
      move(g,1,-1,0.1);g.player={...g.chests[0]};interact(g);
      g.player={...g.outposts[0]};interact(g);interact(g);interact(g);
    }
    expect(on.player).toEqual(off.player);expect(on.supplies).toBe(off.supplies);
    expect(on.chests).toEqual(off.chests);expect(on.outposts).toEqual(off.outposts);
    expect(radius(on)).toBe(radius(off));
  });
  it("hides the compass only when its target marker is actually visible", () => {
    const g=createGame(true);expect(shouldShowCompass(g)).toBe(true);
    g.player={x:17.5,y:11.5};reveal(g);expect(shouldShowCompass(g)).toBe(true); // on screen, still hidden by fog
    g.player={x:17.5,y:9.5};reveal(g);expect(shouldShowCompass(g)).toBe(false);
    g.player={x:22.5,y:7.5};reveal(g);expect(shouldShowCompass(g)).toBe(false); // remembered marker
    g.player={x:30.5,y:7.5};expect(shouldShowCompass(g)).toBe(true); // off screen again
    g.fog=false;g.player={x:17.5,y:11.5};expect(shouldShowCompass(g)).toBe(false);
    g.outposts.forEach(p=>p.open=true);expect(shouldShowCompass(g)).toBe(true); // now guides to the map
  });
  it("unlocks Boost in the first chest, spends only while moving and recharges during walking or idle", () => {
    const g=createGame(true);const normal=createGame(true);move(g,1,0,0.1,true);move(normal,1,0,0.1);
    expect(g.player).toEqual(normal.player);expect(g.boostUnlocked).toBe(false);
    g.player={...g.chests[0]};interact(g);expect(g.boostUnlocked).toBe(true);expect(g.boost).toBe(100);
    move(g,0,0,0.1,true);expect(g.boost).toBe(100);
    const x=g.player.x;move(g,1,0,0.5,true);expect(g.player.x-x).toBeGreaterThan(2.16*0.5);expect(g.boost).toBeLessThan(100);
    const charge=g.boost;move(g,0,0,0.5);expect(g.boost).toBeGreaterThan(charge);
    move(g,1,0,0.5);expect(g.boost).toBeGreaterThan(charge);
  });
  it("does not drain Boost against a wall and does not sputter after depletion", () => {
    const g=createGame(true);g.player={...g.chests[0]};interact(g);
    g.player={x:9.8,y:14.5};move(g,1,0,0.1,true);expect(g.boost).toBe(100);
    g.player={x:3.5,y:19.5};g.boost=1;move(g,1,0,0.1,true);expect(g.boost).toBe(0);
    move(g,1,0,0.1,true);expect(g.boost).toBe(0);expect(g.boosting).toBe(false);
    move(g,1,0,0.2);expect(g.boost).toBeGreaterThan(0);
    move(g,1,0,0.016,true);expect(g.boosting).toBe(true);
  });
  it("keeps near-depletion Boost travel equivalent at different update frequencies", () => {
    const a=createGame(true),b=createGame(true);
    for(const g of [a,b]){g.player={...g.chests[0]};interact(g);g.boost=1;}
    move(a,1,0,0.1,true);for(let i=0;i<10;i++)move(b,1,0,0.01,true);
    expect(a.player.x).toBeCloseTo(b.player.x,8);expect(a.boost).toBe(0);expect(b.boost).toBe(0);
  });
  it("locks the treasure map until outposts open and guides remaining stars then unopened chests", () => {
    const g=createGame(true);g.player={...g.chests[3]};interact(g);expect(g.chests[3].open).toBe(false);expect(g.treasureMap).toBe(false);
    g.outposts.forEach(p=>p.open=true);g.finished=true;interact(g);expect(g.treasureMap).toBe(true);
    expect(compassTarget(g)).toBe(g.chests[6]);g.player={...g.chests[6]};interact(g);
    expect(compassTarget(g)).toBe(g.chests[7]);g.player={...g.chests[7]};interact(g);expect(navigationTargets(g)).toEqual(g.chests.filter(c=>!c.open&&!c.rare));
    expect(hasEverything(g)).toBe(false);
    for(const c of g.chests.filter(c=>!c.open)){g.player={...c};interact(g);}expect(hasEverything(g)).toBe(true);expect(g.finalCompletion).not.toBeNull();
    const time=g.finalCompletion!.elapsed;g.elapsed+=10;interact(g);expect(g.finalCompletion!.elapsed).toBe(time);
  });
  it("advances quests and reveals all relevant targets without reopening early discoveries", () => {
    const g=createGame(true);expect(questStage(g)).toBe("outposts");expect(navigationTargets(g)).toEqual([g.outposts[0]]);
    g.outposts.forEach(p=>p.open=true);g.finished=true;expect(questStage(g)).toBe("map");expect(navigationTargets(g)).toEqual([g.chests[3]]);
    g.player={...g.chests[3]};interact(g);expect(questStage(g)).toBe("stars");expect(navigationTargets(g)).toEqual([g.chests[6],g.chests[7]]);
    g.player={...g.chests[6]};interact(g);expect(navigationTargets(g)).toEqual([g.chests[7]]);
    g.player={...g.chests[7]};interact(g);expect(questStage(g)).toBe("chests");expect(navigationTargets(g)).toEqual(g.chests.filter(c=>!c.open));
    for(const c of [...navigationTargets(g)]){g.player={...c};interact(g);}expect(questStage(g)).toBe("complete");expect(navigationTargets(g)).toEqual([]);
    const early=createGame(true);early.player={...early.chests[6]};interact(early);early.outposts.forEach(p=>p.open=true);early.finished=true;
    early.player={...early.chests[3]};interact(early);expect(navigationTargets(early)).toEqual([early.chests[7]]);
  });
  it("has a walkable path from camp to every collectible and outpost", () => {
    const seen = new Set(["3,19"]), queue = [[3,19]];
    for (let i = 0; i < queue.length; i++) {
      const [x,y] = queue[i];
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx=x+dx, ny=y+dy, k=`${nx},${ny}`;
        if(nx>=0 && ny>=0 && nx<WORLD.width && ny<WORLD.height && !WORLD.walls.has(k) && !seen.has(k)) { seen.add(k); queue.push([nx,ny]); }
      }
    }
    const g=createGame(true);
    for (const p of [...g.chests,...g.outposts]) expect(seen.has(`${Math.floor(p.x)},${Math.floor(p.y)}`)).toBe(true);
  });
});

describe("Fogbound input and lifecycle", () => {
  it("shows only the first quest and no treasure totals at startup", () => {
    vi.useFakeTimers();const host=document.createElement("div");document.body.append(host);const stop=fogbound.mount(host);
    expect(host.querySelector("[data-quest]")).not.toBeNull();expect(host.querySelector("[data-quest]")!.textContent).toContain("0/2");
    expect(host.querySelector(".fog-hud")!.textContent).not.toMatch(/0\/8|stars/i);
    expect(host.querySelector(".fog-instructions")!.textContent).not.toMatch(/8 treasures|2 hidden stars/);
    stop();
  });
  it("fills the collection bar from the first chest before reaching the star quest", () => {
    vi.useFakeTimers();const host=document.createElement("div");document.body.append(host);const stop=fogbound.mount(host);
    const bar=host.querySelector<HTMLProgressElement>('[aria-label="Collected treasures"]')!;
    expect(bar.hidden).toBe(false);expect(bar.value).toBe(0);
    host.querySelector<HTMLButtonElement>("[data-start]")!.click();
    const button=host.querySelector<HTMLButtonElement>('[aria-label="Move northeast"]')!;
    for(let i=0;i<8;i++)button.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));
    host.querySelector<HTMLButtonElement>("[data-interact]")!.click();
    expect(bar.hidden).toBe(false);expect(bar.value).toBe(1);
    expect(host.querySelector("[data-quest]")!.textContent).toContain("0/2");
    expect(host.querySelector(".fog-hud")!.textContent).not.toContain("1/8");stop();
  });
  it("starts from a fresh viewport click and supports its in-game start button", () => {
    vi.useFakeTimers();const host=document.createElement("div");document.body.append(host);const stop=fogbound.mount(host);
    const board=host.querySelector<HTMLElement>("[data-board]")!;
    board.click();board.dispatchEvent(new KeyboardEvent("keydown",{key:"d",bubbles:true}));vi.advanceTimersByTime(200);
    expect(Number(board.getAttribute("data-player-x"))).toBeGreaterThan(3.5);
    host.querySelector<HTMLInputElement>("[data-mechanic]")!.click();
    const entry=host.querySelector<HTMLButtonElement>("[data-entry]");expect(entry).not.toBeNull();
    expect(entry!.hidden).toBe(false);entry!.focus();entry!.click();
    expect(entry!.hidden).toBe(true);expect(document.activeElement===board).toBe(true);
    board.dispatchEvent(new KeyboardEvent("keydown",{key:"d",bubbles:true}));vi.advanceTimersByTime(200);
    expect(Number(board.getAttribute("data-player-x"))).toBeGreaterThan(3.5);stop();
  });
  it("starts, moves with keyboard, resets the comparison, and cleans up", () => {
    vi.useFakeTimers();
    const host=document.createElement("div"); document.body.append(host);
    const stop=fogbound.mount(host);
    host.querySelector<HTMLButtonElement>("[data-start]")!.click();
    const board=host.querySelector<HTMLElement>("[data-board]")!;
    board.dispatchEvent(new KeyboardEvent("keydown",{key:"d",bubbles:true})); vi.advanceTimersByTime(400);
    expect(Number(board.getAttribute("data-player-x"))).toBeGreaterThan(3.5);
    board.dispatchEvent(new KeyboardEvent("keyup",{key:"d",bubbles:true}));
    host.querySelector<HTMLInputElement>("[data-mechanic]")!.click();
    expect(board.getAttribute("data-player-x")).toBe("3.5");
    expect(host.querySelector("[data-status]")!.textContent).toContain("Fog off");
    stop(); expect(host.childNodes.length).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
  it("pauses on window focus loss and resumes in the viewport without losing progress", () => {
    vi.useFakeTimers();const host=document.createElement("div");document.body.append(host);const stop=fogbound.mount(host);
    host.querySelector<HTMLButtonElement>("[data-start]")!.click();
    const board=host.querySelector<HTMLElement>("[data-board]")!;
    board.dispatchEvent(new KeyboardEvent("keydown",{key:"d",bubbles:true}));vi.advanceTimersByTime(200);
    const x=board.getAttribute("data-player-x");window.dispatchEvent(new Event("blur"));vi.advanceTimersByTime(800);
    expect(board.getAttribute("data-player-x")).toBe(x);
    const resume=host.querySelector<HTMLButtonElement>("[data-resume]")!;expect(resume.hidden).toBe(false);resume.click();
    expect(document.activeElement===board).toBe(true);expect(resume.hidden).toBe(true);
    board.dispatchEvent(new KeyboardEvent("keydown",{key:"d",bubbles:true}));vi.advanceTimersByTime(200);
    expect(Number(board.getAttribute("data-player-x"))).toBeGreaterThan(Number(x));stop();
  });
  it("resumes when hiding the focused overlay triggers browser focusout", () => {
    vi.useFakeTimers();const host=document.createElement("div");document.body.append(host);const stop=fogbound.mount(host);
    host.querySelector<HTMLButtonElement>("[data-start]")!.click();window.dispatchEvent(new Event("blur"));
    const overlay=host.querySelector<HTMLButtonElement>("[data-resume]")!;
    // jsdom does not blur focused elements on hiding them. Reproduce the
    // actual in-app browser side effect at this DOM boundary only.
    Object.defineProperty(overlay,"hidden",{configurable:true,get(){return overlay.hasAttribute("hidden");},set(value:boolean){
      overlay.toggleAttribute("hidden",value);
      if(value&&document.activeElement===overlay)overlay.dispatchEvent(new FocusEvent("focusout",{bubbles:true,relatedTarget:null}));
    }});
    overlay.focus();overlay.click();
    expect(overlay.hidden).toBe(true);
    const board=host.querySelector<HTMLElement>("[data-board]")!;
    expect(document.activeElement===board).toBe(true);
    board.dispatchEvent(new KeyboardEvent("keydown",{key:"d",bubbles:true}));vi.advanceTimersByTime(200);
    expect(Number(board.getAttribute("data-player-x"))).toBeGreaterThan(3.5);stop();
  });
  it("shows Boost after collecting boots and handles Shift without breaking movement", () => {
    vi.useFakeTimers();const host=document.createElement("div");document.body.append(host);const stop=fogbound.mount(host);
    host.querySelector<HTMLButtonElement>("[data-start]")!.click();
    const northeast=host.querySelector<HTMLButtonElement>('[aria-label="Move northeast"]')!;
    for(let i=0;i<8;i++)northeast.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));
    host.querySelector<HTMLButtonElement>("[data-interact]")!.click();
    const energy=host.querySelector<HTMLProgressElement>('[aria-label="Boost energy"]')!;
    expect(host.querySelector<HTMLButtonElement>("[data-boost]")!.hidden).toBe(false);
    const board=host.querySelector<HTMLElement>("[data-board]")!;
    board.dispatchEvent(new KeyboardEvent("keydown",{key:"Shift",bubbles:true}));
    vi.advanceTimersByTime(100);expect(energy.value).toBe(100);
    board.dispatchEvent(new KeyboardEvent("keydown",{key:"d",bubbles:true}));
    vi.advanceTimersByTime(400);expect(energy.value).toBeLessThan(100);
    const before=energy.value;board.dispatchEvent(new KeyboardEvent("keyup",{key:"Shift",bubbles:true}));
    vi.advanceTimersByTime(200);expect(energy.value).toBeGreaterThan(before);
    board.dispatchEvent(new KeyboardEvent("keyup",{key:"d",bubbles:true}));const walkingEnergy=energy.value;
    vi.advanceTimersByTime(200);expect(energy.value).toBeGreaterThan(walkingEnergy);
    window.dispatchEvent(new Event("blur"));const pausedEnergy=energy.value;
    vi.advanceTimersByTime(400);expect(energy.value).toBe(pausedEnergy);stop();
  });
  it("returns movement focus after clicking an interaction and pauses safely", () => {
    vi.useFakeTimers();
    const host=document.createElement("div");document.body.append(host);
    const stop=fogbound.mount(host);
    host.querySelector<HTMLButtonElement>("[data-start]")!.click();
    const board=host.querySelector<HTMLElement>("[data-board]")!;
    const action=host.querySelector<HTMLButtonElement>("[data-interact]")!;
    action.focus();action.click();expect(document.activeElement).toBe(board);
    const pause=Array.from(host.querySelectorAll("button")).find(b=>b.textContent==="Pause")!;
    pause.click();
    board.dispatchEvent(new KeyboardEvent("keydown",{key:"d",bubbles:true}));vi.advanceTimersByTime(400);
    expect(board.getAttribute("data-player-x")).toBe("3.5");
    stop();
  });
});
