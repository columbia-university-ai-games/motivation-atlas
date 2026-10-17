import {s} from "../../lib/dom";
import {BRAIN_NAMES,cellOf,distance,key,reefAt,visible,vesselEvolution,leviathanStage,type Dive,type Point,type Projectile} from "./game";
import {creature,itemIcon} from "./sprites";
import {vesselForm} from "./vessel";
export const TILE=60;
export function viewportWidth(svg:SVGSVGElement):number {const width=svg.getBoundingClientRect().width;return width>0&&width<500?10:16;}
export function viewportHeight(svg:SVGSVGElement,width=viewportWidth(svg)):number {const bounds=svg.getBoundingClientRect();return bounds.width&&bounds.height?width*bounds.height/bounds.width:width*.625;}
export function cameraFor(d:Dive,width=16,height=width*.625):Point {return{x:Math.max(0,Math.min(d.chart.width-width,d.position.x-width/2+.5)),y:Math.max(0,Math.min(d.chart.height-height,d.position.y-height/2+.5))};}
const path=(d:string,fill="none",stroke="currentColor",width=1.5)=>s("path",{d,fill,stroke,"stroke-width":width,"stroke-linejoin":"round","stroke-linecap":"round"});
const rand=(x:number,y:number)=>{const n=Math.sin(x*71.3+y*83.7)*48291.2;return n-Math.floor(n);};
const px=(p:Point)=>({x:p.x*TILE+30,y:p.y*TILE+30});

export function createScene(svg:SVGSVGElement,initial:Dive,uid:string){
  svg.setAttribute("viewBox","0 0 960 600");svg.setAttribute("preserveAspectRatio","xMidYMid slice");
  const defs=s("defs",{},
    s("linearGradient",{id:`${uid}-sea`,x1:"0",y1:"0",x2:"0",y2:"1"},s("stop",{"stop-color":"#0e4553"}),s("stop",{offset:".52","stop-color":"#0c283c"}),s("stop",{offset:"1","stop-color":"#171c35"})),
    s("linearGradient",{id:`${uid}-rock`,x1:"0",y1:"0",x2:"1",y2:"1"},s("stop",{"stop-color":"#3e6570"}),s("stop",{offset:"1","stop-color":"#102938"})),
    s("linearGradient",{id:`${uid}-hull`,x1:"0",y1:"0",x2:".2",y2:"1"},s("stop",{"stop-color":"#bca76c"}),s("stop",{offset:".4","stop-color":"#fff0ac"}),s("stop",{offset:"1","stop-color":"#9b8457"})),
    s("linearGradient",{id:`${uid}-titanium`,x1:"0",y1:"0",x2:".25",y2:"1"},s("stop",{"stop-color":"#c4d9dc"}),s("stop",{offset:".35","stop-color":"#7fadb8"}),s("stop",{offset:".65","stop-color":"#436879"}),s("stop",{offset:"1","stop-color":"#202e43"})),
    s("linearGradient",{id:`${uid}-monster`,x1:"0",y1:"0",x2:"1",y2:"1"},s("stop",{"stop-color":"#6c6d99"}),s("stop",{offset:"1","stop-color":"#303148"})),
    s("radialGradient",{id:`${uid}-light`},s("stop",{"stop-color":"#88e9de","stop-opacity":.23}),s("stop",{offset:"1","stop-color":"#7ee2d6","stop-opacity":0})),
    s("linearGradient",{id:`${uid}-beam`},s("stop",{"stop-color":"#f5e9a2","stop-opacity":.29}),s("stop",{offset:"1","stop-color":"#e3e9ac","stop-opacity":0})));
  const world=s("g",{class:"eb-world"}),background=s("g"),objects=s("g"),hazardLayer=s("g"),warnings=s("g"),enemyLayer=s("g"),projectileLayer=s("g"),effectLayer=s("g");
  background.append(s("rect",{width:initial.chart.width*TILE,height:initial.chart.height*TILE,fill:`url(#${uid}-sea)`}));
  for(let i=0;i<14;i++)background.append(path(`M${-100+i*140} 0Q${280+i*70} 400 ${40+i*110} 740T${140+i*125} 1250`,"none","#78b7c0",.5));
  const tiles:Array<{point:Point;art:SVGGElement;fog:SVGRectElement}>=[];
  for(let y=0;y<initial.chart.height;y++)for(let x=0;x<initial.chart.width;x++){
    const point={x,y},p=px(point),art=s("g",{transform:`translate(${p.x} ${p.y})`}),r=rand(x,y);
    if(reefAt(initial.chart,point))art.append(s("ellipse",{cx:7,cy:12,rx:28,ry:17,fill:"#00141f",opacity:.5}),path("M-28 11-23-10-9-26 13-24 29-6 28 20 5 27-17 22Z",`url(#${uid}-rock)`,"#55818a",.5),path("M-9-26-2-5 13-24M-2-5 28 20M-2-5-17 22","none","#6c9396",.6));
    else if(r>.85)for(let i=0;i<3;i++){
      const bx=-13+i*11,bend=(rand(i+x,y)-.5)*20;
      art.append(path(`M${bx} 24Q${bx+bend} 3 ${bx+3} -28`,"none",y>12?"#698cb0":"#4b9187",1.5));
      for(let j=0;j<3;j++)art.append(path(`M${bx} ${15-j*12}q${j%2?10:-12} -10 ${j%2?9:-10} -14q${j%2?-11:10} 3 ${j%2?-9:10} 14`,y>12?"#527098":"#2d7972","none"));
    }else if(r>.68){const tint=y>12?"#b8a0db":"#69a7a3";art.append(path("M0 22V-12M0 5-13-5-15-16M0 0 11-11 10-22M0 13 19 2 23-9M-13-5-22-7M11-11 22-13M0-12-5-22","none",tint,1.4));for(const[cx,cy]of[[-15,-16],[10,-22],[23,-9],[-22,-7],[22,-13]])art.append(s("circle",{cx,cy,r:1.5,fill:tint,opacity:.65}));}
    else if(r>.38&&r<.45)for(let i=0;i<5;i++)art.append(s("ellipse",{cx:-15+i*7,cy:Math.sin(i*2)*9,rx:2.8,ry:1.1,fill:"#a0d6ce",opacity:.4}));
    else if(r<.2)art.append(path("M-25 10Q-10 0 15 12M-20 15Q-3 5 22 17M-22 20Q-2 11 19 22","none","#74a7b3",.4));
    const fog=s("rect",{x:x*TILE,y:y*TILE,width:TILE+.5,height:TILE+.5,fill:"#04121e",opacity:.97,class:"eb-fog-tile"});background.append(art,fog);tiles.push({point,art,fog});
  }
  const route=s("polyline",{fill:"none",stroke:"#a6d4b9","stroke-width":1,"stroke-dasharray":"3 6",opacity:.25});
  const dockP=px(initial.chart.start);objects.append(s("g",{transform:`translate(${dockP.x} ${dockP.y})`,opacity:.7},s("circle",{r:112,fill:"#226d5e","fill-opacity":.04,stroke:"#7bc6b5","stroke-opacity":.2,"stroke-dasharray":"3 10"}),s("circle",{r:28,fill:"#17464d",stroke:"#7bc6b5","stroke-width":1,"stroke-dasharray":"6 4"}),s("text",{y:42,"text-anchor":"middle",fill:"#a2cfc2","font-size":8,"letter-spacing":2},"BASE / SAFE ZONE")));
  const itemNodes=initial.chart.items.map(item=>{const p=px(item),node=s("g",{transform:`translate(${p.x} ${p.y})`,class:"eb-floating","data-world-item":item.id},itemIcon(item.kind));objects.append(node);return{item,node};});
  const beaconNodes=initial.chart.beacons.map((b,i)=>{const p=px(b),glow=s("path",{d:"M-6 0-35-110H35L6 0Z",fill:"currentColor",opacity:0}),node=s("g",{transform:`translate(${p.x} ${p.y})`,color:"#a1c5ee"},glow,s("circle",{r:32,fill:"none",stroke:"currentColor","stroke-opacity":.2}),path("M-17 18H17M-12 17-6-15H6L12 17M-7-7H7M-9 6H9","#17384b","currentColor",1.5),s("circle",{cy:-18,r:5,fill:"currentColor",class:"eb-glow"}),path("M-12-26A17 17 0 0 0-12-10M12-26A17 17 0 0 1 12-10"),s("text",{y:34,"font-size":8,fill:"currentColor","text-anchor":"middle","letter-spacing":1},`BEACON 0${i+1}`));objects.append(node);return{b,node,glow};});
  const enemyNodes=new Map<string,{node:SVGGElement;pose:SVGGElement;health:SVGRectElement;label:SVGTextElement;lock:SVGCircleElement;warn:SVGGElement;aim:SVGLineElement;area:SVGCircleElement;cone:SVGPathElement}>();
  for(const e of initial.enemies){
    const boss=e.kind==="leviathan",size=boss?142:54,barY=boss?-84:["angler","urchin","ray"].includes(e.kind)?-61:-46,barH=boss?12:9,pose=s("g",{},creature(e.kind,uid)),health=s("rect",{x:-size/2,y:barY,width:size,height:barH,rx:barH/2,fill:boss?"#dca6e2":"#e4a18e","data-enemy-health":""});
    if(e.kind==="submarine")pose.append(s("circle",{cx:28,r:2.5,fill:"#ff8d77",class:"eb-hostile-light"}),s("circle",{cx:-25,r:2,fill:"#df5b67",class:"eb-hostile-light"}));
    const label=s("text",{y:boss?84:42,"font-size":boss?10:8,fill:e.kind==="submarine"?"#edab99":"#bdc5d5","text-anchor":"middle",class:"eb-enemy-label"}),lock=s("circle",{r:boss?118:40,fill:"none",stroke:"#eeb28e","stroke-width":1,"stroke-dasharray":"8 10",class:"eb-target-ring"});
    const node=s("g",{"data-world-enemy":e.id,"data-kind":e.kind},pose,s("rect",{x:-size/2-1,y:barY-1,width:size+2,height:barH+2,rx:barH/2,fill:"#101d2c",stroke:"#7d6a8d","stroke-width":.5}),health,lock,label);
    const aim=s("line",{stroke:e.kind==="submarine"?"#ff826d":"#d5a7db","stroke-width":1.4,"stroke-dasharray":"6 7"}),area=s("circle",{fill:"#bba3ef","fill-opacity":.08,stroke:"#cfb4f2","stroke-width":1.5,"stroke-dasharray":"5 6"}),cone=path("M0 0 200-20 200 20Z","#e5979a","#e7b0ad",.8);
    const warn=s("g",{class:"eb-telegraph","data-telegraph":e.id},aim,area,cone);warnings.append(warn);enemyLayer.append(node);enemyNodes.set(e.id,{node,pose,health,label,lock,warn,aim,area,cone});
  }
  const player=s("g",{"data-vessel":""}),playerPose=s("g"),light=s("circle",{r:170,fill:`url(#${uid}-light)`}),ring=s("circle",{r:65,fill:"none",stroke:"#88dcc5","stroke-opacity":.18,"stroke-width":1,class:"eb-sonar-wave"}),shield=s("ellipse",{rx:47,ry:31,fill:"#9fa8ff","fill-opacity":.06,stroke:"#b7b8f2","stroke-opacity":.55});
  const bubbles=s("g",{},...Array.from({length:11},()=>s("circle",{fill:"#addce0"})));
  const jets=s("g",{},path("M-34-7Q-80 0-34 7Z","#b9e8ed","none"),path("M-40-25Q-83-20-40-15ZM-40 15Q-83 20-40 25Z","#bcb6ff","none"));
  const forms=[0,1,2,3].map(tier=>vesselForm(tier,uid));
  const recoil=s("g",{class:"eb-hull-sprite"},...forms);
  const turret=s("g",{"data-forward-launcher":""},s("rect",{x:0,y:-3,width:28,height:6,rx:2,fill:"#b3c3b8",stroke:"#e4dfbb","stroke-width":.6}),s("circle",{r:5,fill:"#70897f",stroke:"#e0d6a6","stroke-width":1}));
  const headingGuide=s("g",{class:"eb-heading-guide"},s("line",{x1:65,y1:0,x2:190,y2:0,stroke:"#f1daaa","stroke-width":.8,"stroke-opacity":.28,"stroke-dasharray":"2 8"}),path("M190-4 196 0 190 4","none","#e6d0a3",.8));
  const bank=s("g",{},jets,recoil,turret);
  playerPose.append(path("M20-12 180-72 180 72 20 12Z",`url(#${uid}-beam)`,"none"),headingGuide,bubbles,bank,shield);player.append(light,ring,playerPose);
  const clickMarker=s("g",{"data-navigation-marker":"",opacity:0},s("circle",{r:15,fill:"none",stroke:"#c8e8cb","stroke-width":1,"stroke-dasharray":"3 4"}),path("M-5 0H5M0-5V5","none","#c8e8cb",1));
  const aimMarker=s("g",{"data-manual-aim":"",opacity:0},s("circle",{r:11,fill:"none",stroke:"#f5da9d","stroke-width":.9}),path("M-17 0H-6M6 0H17M0-17V-6M0 6V17","none","#f5da9d",1));
  world.append(background,route,objects,hazardLayer,warnings,enemyLayer,player,projectileLayer,effectLayer,clickMarker,aimMarker);
  const particles=s("g",{class:"eb-drift","aria-hidden":"true"},...Array.from({length:65},(_,i)=>s("circle",{cx:rand(i,3)*960,cy:rand(i,7)*600,r:.4+rand(i,1)*1.4,fill:"#c6f4e9",opacity:.08+rand(i,8)*.2})));
  svg.replaceChildren(defs,world,particles);
  const projectiles=new Map<number,SVGGElement>(),effects=new Map<number,SVGGElement>(),hazards=new Map<number,SVGGElement>();
  let camera=cameraFor(initial,viewportWidth(svg),viewportHeight(svg)),backgroundKey="",previousAngle=initial.angle,banking=0;
  function display(node:SVGElement,on:boolean):void {node.style.display=on?"":"none";}
  function projectileNode(p:Projectile):SVGGElement {
    if(p.kind==="wave")return s("g",{"data-projectile":p.id,"data-owner":p.owner},s("circle",{fill:"none",stroke:"#d1b7e7","stroke-width":3}),s("circle",{fill:"#bba3de",opacity:.035}));
    const color=p.owner==="player"?"#ffe3a8":p.kind==="ink"?"#b7a1e4":p.kind==="acid"?"#acdda0":"#ff9b85";
    return s("g",{"data-projectile":p.id,"data-owner":p.owner},path("M-33 0H-10","none",color,2.5),s("ellipse",{rx:p.kind==="torpedo"?10:5,ry:3,fill:color,class:"eb-projectile-glow"}),path("M-10-3-15-7-13 0-15 7-10 3",color,"none",1));
  }
  function render(d:Dive,dt=1/60,goal:Point|null=null,manualAim:Point|null=null):void {
    const width=viewportWidth(svg),height=viewportHeight(svg,width),targetCamera=cameraFor(d,width,height),blend=1-Math.exp(-dt*10);camera={x:camera.x+(targetCamera.x-camera.x)*blend,y:camera.y+(targetCamera.y-camera.y)*blend};
    svg.setAttribute("viewBox",`0 0 ${width*TILE} ${height*TILE}`);world.setAttribute("transform",`translate(${-camera.x*TILE} ${-camera.y*TILE})`);
    const nextKey=`${key(d.position)}/${d.explored.size}/${d.fog}/${d.collected.size}/${d.restored.size}/${width}`;
    if(nextKey!==backgroundKey){
      backgroundKey=nextKey;
      for(const t of tiles){const known=visible(d,t.point);t.fog.setAttribute("opacity",known?distance(t.point,d.position)<=2+d.sonar?"0":".28":".97");t.art.setAttribute("opacity",known?"1":"0");}
      for(const{item,node}of itemNodes)display(node,!d.collected.has(item.id)&&visible(d,item));
      for(const{b,node,glow}of beaconNodes){display(node,visible(d,b));const restored=d.restored.has(key(b));node.setAttribute("color",restored?"#99f4cb":"#a1c5ee");glow.setAttribute("opacity",restored?".075":"0");}
      route.setAttribute("points",d.visited.map(p=>`${p.x*TILE+30},${p.y*TILE+30}`).join(" "));
    }
    const playerP=px(d.position),speed=Math.hypot(d.velocity.x,d.velocity.y),evolution=vesselEvolution(d);
    const angularDelta=Math.atan2(Math.sin(d.angle-previousAngle),Math.cos(d.angle-previousAngle));previousAngle=d.angle;
    banking+=(Math.max(-1,Math.min(1,angularDelta/Math.max(.001,dt)/4))-banking)*(1-Math.exp(-dt*8));
    player.setAttribute("transform",`translate(${playerP.x} ${playerP.y})`);playerPose.setAttribute("transform",`rotate(${d.angle*180/Math.PI})`);
    bank.setAttribute("transform",`translate(0 ${Math.sin(d.time*2.4)*.6}) scale(1 ${1-Math.abs(banking)*.12})`);
    player.dataset.x=d.position.x.toFixed(4);player.dataset.y=d.position.y.toFixed(4);player.dataset.angle=d.angle.toFixed(4);
    player.dataset.evolutionTier=String(evolution.tier);for(const[i,form]of forms.entries())form.style.opacity=i===evolution.tier?"1":"0";
    const thrust=Math.min(1,speed/3.25);jets.setAttribute("opacity",String(thrust*(.22+.05*Math.sin(d.time*37))));
    jets.lastElementChild!.setAttribute("display",evolution.tier>0?"":"none");
    Array.from(bubbles.children).forEach((bubble,i)=>{const age=(d.time*(1.7+thrust)+i*.31)%1;const side=i%2?1:-1;bubble.setAttribute("cx",String(-40-age*(40+thrust*42)));bubble.setAttribute("cy",String(side*(evolution.tier>0?18:4)+Math.sin(i*7+age*5)*(2+age*5)));bubble.setAttribute("r",String(.7+age*2));bubble.setAttribute("opacity",String((1-age)*thrust*.45));});
    const firing=Math.max(0,1-(d.time-d.lastFired)/.22);recoil.setAttribute("transform",`translate(${-Math.sin(firing*Math.PI)*4} 0)`);
    shield.setAttribute("opacity",d.shields>0?"1":"0");shield.setAttribute("rx",String(45+evolution.tier*6));shield.setAttribute("ry",String(31+evolution.tier*5));
    turret.setAttribute("transform",`translate(${[11,17,25,34][evolution.tier]-Math.sin(firing*Math.PI)*3} 0)`);
    if(manualAim){const p=px(manualAim);aimMarker.setAttribute("transform",`translate(${p.x} ${p.y})`);aimMarker.setAttribute("opacity",".8");}else aimMarker.setAttribute("opacity","0");
    const activeHazards=new Set(d.hazards.map(h=>h.id));for(const[id,node]of hazards)if(!activeHazards.has(id)){node.remove();hazards.delete(id);}
    for(const h of d.hazards){let node=hazards.get(h.id);if(!node){node=s("g",{"data-ink-cloud":h.id},...Array.from({length:7},(_,i)=>s("circle",{cx:Math.cos(i*2.4)*35,cy:Math.sin(i*2.4)*30,r:40,fill:i%2?"#12152e":"#323452",stroke:"#8b7ab3","stroke-width":.6,"stroke-opacity":.18})));hazards.set(h.id,node);hazardLayer.append(node);}const p=px(h),age=d.time-h.born;node.setAttribute("transform",`translate(${p.x} ${p.y}) scale(${Math.min(1,age*4)}) rotate(${age*6})`);node.setAttribute("opacity",String(Math.min(.7,(h.life-age)*.5)));display(node,visible(d,h));}
    for(const enemy of d.enemies){
      const n=enemyNodes.get(enemy.id);if(!n)continue;const on=enemy.hp>0&&visible(d,enemy);display(n.node,on);display(n.warn,on&&enemy.phase==="aim");if(!on)continue;
      const p=px(enemy),boss=enemy.kind==="leviathan",size=boss?142:54;
      n.node.setAttribute("transform",`translate(${p.x} ${p.y})`);n.node.dataset.phase=enemy.phase;n.node.dataset.x=enemy.x.toFixed(4);n.node.dataset.y=enemy.y.toFixed(4);n.node.dataset.hp=String(enemy.hp);
      n.node.dataset.attack=enemy.attackKind;if(boss)n.node.dataset.stage=String(leviathanStage(enemy));
      const recoilAge=d.time-enemy.lastFired,kick=enemy.kind==="submarine"&&recoilAge<.25?-Math.sin(recoilAge/.25*Math.PI)*5:0;
      n.pose.setAttribute("transform",`rotate(${enemy.angle*180/Math.PI}) translate(${kick} 0)`);n.pose.setAttribute("opacity",d.time-enemy.lastHit<.1?".45":"1");
      n.health.setAttribute("width",String(size*enemy.hp/enemy.maxHp));display(n.lock,false);
      n.node.dataset.armor=String(enemy.kind==="urchin"&&!["aim","attack"].includes(enemy.phase));
      if(enemy.kind==="angler")n.pose.style.opacity=enemy.phase==="patrol"?".52":"1";
      n.label.textContent=enemy.kind==="submarine"?`HOSTILE SUB · ${BRAIN_NAMES[enemy.phase]}`:boss?`LEVIATHAN · ${["Awakening","Hunt","Fury"][leviathanStage(enemy)-1]}`:enemy.kind==="elite"?"ELITE · "+BRAIN_NAMES[enemy.phase]:enemy.kind==="urchin"?enemy.phase==="aim"?"URCHIN · CORE OPEN":"URCHIN · ARMORED":enemy.kind==="angler"?"Lantern Maw":enemy.kind==="cuttle"?"Prism Cuttle":enemy.phase==="aim"?"WINDUP":enemy.kind==="jelly"?"Pulse Jelly":enemy.kind==="ray"?"Venom Ray":"";
      if(enemy.phase==="aim"){
        const aim=px(enemy.aim);n.aim.setAttribute("x1",String(p.x));n.aim.setAttribute("y1",String(p.y));n.aim.setAttribute("x2",String(aim.x));n.aim.setAttribute("y2",String(aim.y));
        const radial=enemy.attackKind==="nova"||enemy.attackKind==="tail"||enemy.attackKind==="spikes";
        display(n.aim,!radial);display(n.area,radial&&enemy.attackKind!=="spikes");display(n.cone,enemy.attackKind==="charge"||enemy.attackKind==="bite"||enemy.attackKind==="sweep"||enemy.attackKind==="spikes");
        n.area.setAttribute("cx",String(p.x));n.area.setAttribute("cy",String(p.y));n.area.setAttribute("r",String((enemy.attackKind==="tail"?2.4:enemy.attackKind==="spikes"?3.2:boss?3.5+leviathanStage(enemy)*.4:3.5)*TILE));
        n.area.setAttribute("stroke",enemy.attackKind==="tail"?"#f3c49b":"#cfb4f2");
        n.cone.setAttribute("d",enemy.attackKind==="sweep"?"M0 0 330-160Q380 0 330 160Z":"M0 0 200-20 200 20Z");
        if(enemy.attackKind==="charge"){const length=(boss?(.64*(6.4+leviathanStage(enemy)*.6)):.64*6.2)*TILE;n.cone.setAttribute("d",`M0 0 ${length}-22 ${length} 22Z`);}
        n.cone.setAttribute("transform",`translate(${p.x} ${p.y}) rotate(${enemy.angle*180/Math.PI})`);n.cone.setAttribute("opacity",String(.06+.18*(1-Math.min(1,(enemy.phaseUntil-d.time)/1.1))));
        if(enemy.attackKind==="spikes"){n.cone.setAttribute("d",Array.from({length:12},(_,i)=>{const a=i*Math.PI/6+(enemy.attackIndex+1)*.17;return`M${Math.cos(a)*36} ${Math.sin(a)*36}L${Math.cos(a)*250} ${Math.sin(a)*250}`;}).join(" "));n.cone.setAttribute("transform",`translate(${p.x} ${p.y})`);n.cone.setAttribute("opacity",".5");}
      }
    }
    const activeProjectiles=new Set(d.projectiles.map(p=>p.id));for(const[id,node]of projectiles)if(!activeProjectiles.has(id)){node.remove();projectiles.delete(id);}
    for(const p of d.projectiles){let node=projectiles.get(p.id);if(!node){node=projectileNode(p);projectiles.set(p.id,node);projectileLayer.append(node);}display(node,visible(d,p));const pos=px(p);node.setAttribute("transform",`translate(${pos.x} ${pos.y}) rotate(${p.angle*180/Math.PI})`);node.dataset.x=p.x.toFixed(4);node.dataset.y=p.y.toFixed(4);if(p.kind==="wave"){for(const child of Array.from(node.children))child.setAttribute("r",String(p.radius*TILE));node.setAttribute("opacity",String(1-(d.time-p.born)/p.life));}}
    const liveEffects=new Set(d.effects.map(e=>e.id));for(const[id,node]of effects)if(!liveEffects.has(id)){node.remove();effects.delete(id);}
    for(const e of d.effects){
      let node=effects.get(e.id);if(!node){node=s("g",{"data-effect":e.kind},s("circle",{fill:e.kind==="sonar"?"none":e.color,"fill-opacity":.16,stroke:e.color,"stroke-width":e.kind==="sonar"?1.5:2}));if(e.kind==="explosion"||e.kind==="muzzle")for(let i=0;i<7;i++)node.append(s("line",{x1:0,y1:0,x2:0,y2:0,stroke:e.color,"stroke-width":1.8}));if(e.kind==="swipe")node.append(path("M-18-28Q35-30 40 0Q35 30-18 28","none",e.color,2),path("M-3-20Q25-20 28 0Q25 20-3 20","none",e.color,1));effects.set(e.id,node);effectLayer.append(node);}
      const q=Math.min(1,(d.time-e.born)/e.life),p=px(e),radius=e.kind==="sonar"?e.size*TILE*q:e.size*TILE*(.08+.6*q);
      node.setAttribute("transform",`translate(${p.x} ${p.y}) rotate(${e.kind==="swipe"?e.angle*180/Math.PI:0})`);node.setAttribute("opacity",String((1-q)*(1-q)));node.firstElementChild!.setAttribute("r",String(radius));
      Array.from(node.children).slice(1).forEach((child,i)=>{if(e.kind==="swipe"){child.setAttribute("transform",`scale(${e.size*(.7+q*.5)})`);return;}const a=i/7*Math.PI*2+e.id;child.setAttribute("x1",String(Math.cos(a)*radius*.6));child.setAttribute("y1",String(Math.sin(a)*radius*.6));child.setAttribute("x2",String(Math.cos(a)*radius*1.5));child.setAttribute("y2",String(Math.sin(a)*radius*1.5));});
    }
    if(goal){const p=px(goal);clickMarker.setAttribute("transform",`translate(${p.x} ${p.y})`);clickMarker.setAttribute("opacity",".7");}else clickMarker.setAttribute("opacity","0");
  }
  render(initial,1);
  return{render,camera:()=>({...camera})};
}

export function drawMinimap(svg:SVGSVGElement,d:Dive,width=16,height=width*.625):void {
  svg.setAttribute("viewBox","0 0 300 200");const nodes:SVGElement[]=[s("rect",{width:300,height:200,fill:"#071825"})];
  for(let y=0;y<d.chart.height;y++)for(let x=0;x<d.chart.width;x++)if(visible(d,{x,y}))nodes.push(s("rect",{x:x*10,y:y*10,width:9.5,height:9.5,fill:reefAt(d.chart,{x,y})?"#416172":"#183f4a",opacity:.8}));
  for(const b of d.chart.beacons)if(visible(d,b))nodes.push(s("circle",{cx:b.x*10+5,cy:b.y*10+5,r:3,fill:d.restored.has(key(b))?"#a1f1c4":"#a7c4f5"}));
  for(const e of d.enemies)if(e.hp>0&&visible(d,e))nodes.push(s("circle",{cx:e.x*10+5,cy:e.y*10+5,r:e.kind==="leviathan"?4:2,fill:"#e3a29f"}));
  const camera=cameraFor(d,width,height);nodes.push(s("rect",{x:camera.x*10,y:camera.y*10,width:width*10,height:height*10,fill:"none",stroke:"#a2c5b5","stroke-width":.8,"stroke-opacity":.5}),s("circle",{cx:d.position.x*10+5,cy:d.position.y*10+5,r:3.5,fill:"#f3d79a",stroke:"#fdf4cf","stroke-width":1}));svg.replaceChildren(...nodes);
}
