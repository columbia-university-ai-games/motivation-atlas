import {s} from "../../lib/dom";
import type {EnemyKind,ItemKind} from "./game";
const rand = (x: number, y: number) => { const n = Math.sin(x * 71.3 + y * 83.7) * 48291.2; return n - Math.floor(n); };
const path = (d: string, fill = "none", stroke = "currentColor", width = 1.5) => s("path", { d, fill, stroke, "stroke-width": width, "stroke-linejoin": "round", "stroke-linecap": "round" });
let spriteIds=0;

export function itemIcon(kind: ItemKind): SVGGElement {
  const g = s("g", { class: `eb-item-icon eb-item-${kind}` });
  if (kind === "relic") {
    g.append(path("M-24 7-12-9 16-11 27 7 18 17-19 15Z", "#153e4b", "#67d3cc", 1), path("M-13-8-7-19 5-17 7-10M-20 5 22 3M-3-10 0 14M12-10 7 13", "none", "#58b4bb", 1), s("circle", { cx: 4, cy: 0, r: 4, fill: "#b3ffe5", class: "eb-glow" }));
  } else {
    const color = kind === "weapon" || kind === "ammo" ? "#edb879" : kind === "repair" || kind === "hull" ? "#8cdcc3" : "#a2adff";
    g.append(path("M0-18 17-9 17 10 0 19-17 10-17-9Z", "#102d3a", color, 1.2), s("circle", { r: 22, fill: "none", stroke: color, "stroke-opacity": .15, "stroke-dasharray": "2 5" }));
    if (kind === "weapon" || kind === "ammo") g.append(path("M-7 8 7-7 10-10 10-3-3 10Z", color, color, 1), path("M-7 1-12 0-9-4-3-4M0 7 0 12 4 9 4 3", color, color, 1));
    if (kind === "hull" || kind === "shield") g.append(path("M0-10 9-6 7 5 0 11-7 5-9-6Z", "none", color, 2), path("M-4 0 0 5 6-4", "none", color, 1.5));
    if (kind === "repair") g.append(path("M0-9V9M-9 0H9", "none", color, 4));
    if (kind === "sonar") g.append(s("circle", { r: 10, fill: "none", stroke: color, "stroke-width": 1.5 }), s("circle", { r: 5, fill: "none", stroke: color }), path("M0 0 8-8", "none", color, 2), s("circle", { r: 2, fill: color }));
  }
  return g;
}
export function creature(kind: EnemyKind, uid: string): SVGGElement {
  const g = s("g", { class: `eb-creature eb-creature-${kind}` });
  const skinId=`${uid}-skin-${++spriteIds}`,skin=`url(#${skinId})`;
  const tint=kind==="cuttle"?["#b4d5e5","#6967a3","#222641"]:kind==="angler"?["#7d9eae","#233e58","#091529"]:kind==="urchin"?["#d8b7ee","#60538f","#1e2844"]:kind==="jelly"?["#bcc6f1","#677ab4","#292a55"]:kind==="ray"?["#a9d5bc","#387c83","#142e45"]:["#96c3ce","#3d728a","#152b49"];
  g.append(s("defs",{},s("linearGradient",{id:skinId,x1:"0%",y1:"0%",x2:"25%",y2:"100%"},s("stop",{"stop-color":tint[0]}),s("stop",{offset:".4","stop-color":tint[1]}),s("stop",{offset:"1","stop-color":tint[2]}))));
  if (kind === "submarine") {
    g.append(s("ellipse", { cy: 8, rx: 32, ry: 12, fill: "#001016", opacity: .6 }), path("M-22-11H20C39-11 39 11 20 11H-22Z", "#53666b", "#b18e83", 1), path("M-16-11-21-21-7-19-2-11M-17 11-22 21-6 18 0 11M-27-9-36-15V15L-26 8", "#283c43", "#7c7774", 1), path("M-3-11V-20H6V-11", "#9d6154", "#da947c", 1), ...[-8, 5, 18].map((cx) => s("circle", { cx, cy: 0, r: 4, fill: "#f38b6b", stroke: "#301f26", "stroke-width": 2 })), path("M-20 6H24", "none", "#2d4047", 2));
    g.append(path("M-21-7H19M-22 8H21M-18-12-10-16H9L18-12","none","#b7c9c8",.65),path("M-26-6V6M-30-7V7","none","#efb996",1),s("circle",{cx:10,cy:-15,r:1.2,fill:"#f5bb9e"}));
  } else if(kind==="angler"){
    g.append(s("ellipse",{cy:12,rx:45,ry:20,fill:"#00101f",opacity:.5}),path("M-32 0-51-23-43 0-51 25Z",skin,"#678eaa",1),
      path("M-27-15-16-36 0-24 15-31 21-13M-29 12-20 30-1 21 16 28 21 12",skin,"#8aa5bc",.9),
      path("M-38 0Q-29-32 8-28 38-25 45-4L31 20Q-9 34-35 14Z",skin,"#94aabc",1.3),
      path("M16-10 43-5 30 6 45 14 21 23 5 12Z","#071423","#a8bdcb",1.2),
      path("M21-8 24 2 29-7 31 0 37-5M20 20 24 11 28 18 33 9 36 14","none","#d8dac8",1.3),
      path("M-1-23Q-3-53 22-48 39-43 31-31","none","#88a7bc",1.7),
      s("circle",{cx:31,cy:-30,r:11,fill:"#b7f2df",opacity:.08}),s("circle",{cx:31,cy:-30,r:5,fill:"#d3fff0",class:"eb-angler-lure eb-glow"}),
      s("ellipse",{cx:11,cy:-13,rx:6,ry:4,fill:"#eecf9d",stroke:"#152439","stroke-width":1.8}),s("ellipse",{cx:12,cy:-13,rx:1.4,ry:3.5,fill:"#192537"}));
    for(let i=0;i<5;i++)g.append(path(`M${-24+i*5} -14q-5 10 0 20`,"none",i%2?"#4c7891":"#091e34",1.3),s("circle",{cx:-28+i*6,cy:12,r:1.3,fill:"#a6d5de",opacity:.6}));
  } else if(kind==="cuttle"){
    const mantle=s("g",{class:"eb-cuttle-mantle"},path("M-42 0-20-24 7-18 23-5 26 0 16 12-18 24Z",skin,"#c3c3e6",1.2),
      path("M-38-1-23-30-3-26 17-12 5-17-20-18M-38 1-23 30-3 26 17 12 5 17-20 18",skin,"#8fadd5",.9),
      path("M-33 0-11-12 11-5M-33 0-11 12 11 5","none","#adb3de",.8));
    g.append(mantle);
    for(let i=0;i<6;i++){const y=(i-2.5)*4;g.append(path(`M16 ${y}Q38 ${y*2} 45 ${y}T${65-i*2} ${y*1.8}`,"none",i%2?"#8da7d7":"#c0acd9",1.7));}
    g.append(s("ellipse",{cx:15,cy:-8,rx:6,ry:4,fill:"#d1eef3",stroke:"#32314f","stroke-width":1}),s("ellipse",{cx:16,cy:-8,rx:2,ry:3.5,fill:"#2e2b47"}),
      path("M-18-7-5-10 6-4M-18 7-5 10 6 4","none","#d2a9e2",1.2));
    for(let i=0;i<6;i++)g.append(s("circle",{cx:-26+i*6,cy:Math.sin(i)*6,r:1.4,fill:i%2?"#a7e2dd":"#c7acf3",class:"eb-glow"}));
  } else if(kind==="urchin"){
    const spines=s("g",{class:"eb-urchin-spines"});
    for(let i=0;i<14;i++){const a=i*Math.PI/7,c=Math.cos(a),sn=Math.sin(a),r=i%2?41:50;spines.append(path(`M${c*18-sn*4} ${sn*18+c*4} ${c*r} ${sn*r} ${c*18+sn*4} ${sn*18-c*4}Z`,skin,"#a9b6d4",.7),s("circle",{cx:c*(r-4),cy:sn*(r-4),r:1.2,fill:"#f0d7ff",class:"eb-glow"}));}
    g.append(spines,s("circle",{r:25,fill:skin,stroke:"#b9bbdf","stroke-width":1.2}));
    for(let i=0;i<7;i++){const a=i*Math.PI/3.5;g.append(path(`M0 0 ${Math.cos(a)*21} ${Math.sin(a)*21} ${Math.cos(a+.9)*21} ${Math.sin(a+.9)*21}Z`,i%2?"#3d4968":"#6c6799","#b4b2d2",.65));}
    g.append(s("circle",{r:10,fill:"#1a2442",stroke:"#d0c1e4","stroke-width":1.3}),s("circle",{r:5.5,fill:"#e6c2f5",class:"eb-urchin-core eb-glow"}),path("M-3 0H3M0-3V3","none","#fff2ff",1.3));
  } else if (kind === "jelly") {
    g.append(s("ellipse",{cy:5,rx:28,ry:12,fill:"#646aab",opacity:.2}),path("M-28 3Q-28-34 0-34 28-34 28 3Q13 14 0 7-14 14-28 3Z",skin,"#c6c7ed",1.3),path("M-21-2Q0-24 21-2M-12 3Q-19-17 0-31 19-17 12 3","none","#c5d6f5",.8));
    const tentacles=s("g",{class:"eb-jelly-tendrils"});
    for(let i=0;i<8;i++)tentacles.append(path("M"+(-22+i*6)+" 7q-9 17 0 26t-1 19","none",i%2?"#b1a5eb":"#81b5d7",1.4),s("circle",{cx:-22+i*6,cy:8,r:1.6,fill:"#d9dbfb"}));
    g.append(tentacles,s("circle",{cy:-10,r:9,fill:"#a5a1e2",opacity:.6}),path("M0-22 6-11 0-4-6-11Z","#e1dcff","#bcb8ed",.7));
  } else if (kind === "ray") {
    g.append(path("M28 0Q-8-9-23-44L-15-12-31 0-15 12-23 44Q-8 9 28 0Z",skin,"#9bcbbb",1.2),path("M-25 0Q-49 5-65-3","none","#88aeb0",2),path("M15-5-13-31M15 5-13 31M7-4-13-20M7 4-13 20","none","#87b3b7",.7),path("M-10-4 10-8 24-3 28 0 24 3 10 8-10 4Z","#27475c","#afc7c7",.8),s("circle",{cx:15,cy:-4,r:2,fill:"#d2e8ab",class:"eb-glow"}),s("circle",{cx:15,cy:4,r:2,fill:"#d2e8ab",class:"eb-glow"}));
    for(let i=0;i<5;i++)g.append(s("circle",{cx:-10+i*4,cy:-13-i*3,r:1.1,fill:"#a6dfd3"}),s("circle",{cx:-10+i*4,cy:13+i*3,r:1.1,fill:"#a6dfd3"}));
  } else if (kind === "swarm") {
    g.append(path("M-23 0Q-5-13 25 0-5 13-23 0L-35-14-29 0-35 14Z",skin,"#a1d6d6",1),path("M-3-7 4-23 10-5M-3 7 4 23 10 5",skin,"#9bcfbe",.8),path("M-21 0H8M-11-5-7 0-11 5M-3-7 1 0-3 7","none","#b0d9d6",.6),s("circle",{cx:15,cy:-1,r:3,fill:"#ffdf91",class:"eb-glow"}),path("M21 2 27 0 23 5","#d9ebd1","none"));
  } else if (kind === "stalker") {
    g.append(path("M-28 0-42-20-35 0-42 20Z", skin, "#8daaba", 1), path("M-31 0Q-5-29 32-1 9 25-31 0Z", skin, "#92c6d3", 1.2), path("M-2-12 5-29 15-10M-4 12 6 26 14 9", skin, "#9dbccc", .9), path("M-12-9-16 5M-6-11-10 8M0-11-4 9", "none", "#9bd2d8", 1), s("ellipse", { cx: 20, cy: -4, rx:4,ry:3,fill: "#f0d29a", class: "eb-glow" }),s("ellipse",{cx:21,cy:-4,rx:1.1,ry:2.6,fill:"#14314a"}), path("M23 4 32 0 28 8 20 7", "#10273c", "#d6e9df", .7));
    for(let i=0;i<5;i++)g.append(s("circle",{cx:-22+i*6,cy:1,r:1.3,fill:"#9ccfdf",opacity:.65}));
  } else if (kind === "leviathan") {
    // An armored abyssal monarch: a coiled vertebral tail, translucent sail,
    // crown of sensory antlers and a luminous reactor-like throat organ.
    const armor = `${uid}-leviathan-armor`, sail = `${uid}-leviathan-sail`, heart = `${uid}-leviathan-heart`;
    g.append(s("defs", {},
      s("linearGradient", { id: armor, x1: "0%", y1: "0%", x2: "35%", y2: "100%" },
        s("stop", { offset: "0", "stop-color": "#95a9b9" }), s("stop", { offset: ".22", "stop-color": "#47667d" }),
        s("stop", { offset: ".55", "stop-color": "#20394f" }), s("stop", { offset: "1", "stop-color": "#0b172b" })),
      s("linearGradient", { id: sail, x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
        s("stop", { offset: "0", "stop-color": "#a5d9ec", "stop-opacity": ".75" }),
        s("stop", { offset: ".48", "stop-color": "#6977b4", "stop-opacity": ".5" }),
        s("stop", { offset: "1", "stop-color": "#253957", "stop-opacity": ".12" })),
      s("radialGradient", { id: heart }, s("stop", { offset: "0", "stop-color": "#f9f2ff" }),
        s("stop", { offset: ".3", "stop-color": "#b3dfff" }), s("stop", { offset: ".7", "stop-color": "#9276d4" }),
        s("stop", { offset: "1", "stop-color": "#292348", "stop-opacity": "0" }))));
    g.append(s("ellipse", { cx: 2, cy: 21, rx: 94, ry: 25, fill: "#020a18", opacity: .48 }));
    const fins = s("g", { class: "eb-leviathan-fins" });
    fins.append(
      path("M-47 9Q-42-12-53-45L-34-34-32-57-17-38-11-67 2-41 15-59 20-34 38-42 44-18Z", `url(#${sail})`, "#8bacca", .9),
      path("M-43 3-47-31M-33-2-31-43M-19-10-12-51M-6-15 4-39M8-13 20-35M24-9 36-27", "none", "#b4d6e6", .7),
      path("M3 16Q-4 41-30 59L-4 53 8 62 20 41 35 54 29 25Z", `url(#${sail})`, "#7a9db9", 1),
      path("M6 22-13 48M16 24 10 49M24 28 29 43", "none", "#9ab9d0", .8),
      path("M39-15Q33-37 49-56L48-33 60-39 56-18Z", "#30475f", "#a3b8c9", 1.2),
      path("M44 17Q38 43 59 56L56 35 68 37 64 18Z", `url(#${sail})`, "#93b8cb", 1));
    g.append(fins);
    const tail = s("g", { class: "eb-leviathan-tail" });
    tail.append(
      path("M25-22C-9-38-28-10-47 13S-83 25-88 4Q-88-10-107-20C-95-1-104 23-85 35-57 57-30 19-10 12 1 8 13 23 30 21Z", `url(#${armor})`, "#738ca7", 1.5),
      path("M-103-13-115-13-106-4-115 3-105 10-108 21-96 18", "#30475c", "#83a5bd", 1),
      path("M-94 9Q-87 41-59 27T-16-8Q4-25 23-14", "none", "#121e34", 8),
      path("M-94 9Q-87 41-59 27T-16-8Q4-25 23-14", "none", "#8dbbc6", .8));
    // Every plate crosses the curved spine rather than reading as a flat stripe.
    const vertebrae = [
      "M-92 9-96 18-87 29-77 32", "M-83 22-81 35-70 36-62 26", "M-69 22-61 32-49 27-45 15",
      "M-56 12-43 19-34 9-35-2", "M-43-1-30 6-22-3-25-15", "M-29-14-15-8-5-15-8-28",
      "M-13-24 1-18 11-20 13-31", "M6-29 17-20 28-18 31-26"
    ];
    for (let i = 0; i < vertebrae.length; i++) {
      tail.append(path(vertebrae[i], "none", "#b0c7d0", 1.4), path(vertebrae[i], "none", "#61869c", .55));
    }
    [[-84,22],[-67,25],[-51,15],[-37,1],[-23,-13],[-7,-23],[10,-25]].forEach(([cx,cy]) => {
      tail.append(s("circle", { cx, cy, r: 3.2, fill: "#324867", stroke: "#80adb9", "stroke-width": .7 }),
        s("circle", { cx, cy, r: 1.15, fill: "#b7e3ee", class: "eb-glow" }));
    });
    g.append(tail);
    const crown = s("g", { class: "eb-leviathan-crown" });
    crown.append(
      path("M52-18 49-37 57-51 53-63 65-55 62-38 69-29 70-48 81-62 78-40 87-48 83-31 91-27 101-38 96-20 82-11Z", "#344860", "#b8c9d6", 1.4),
      path("M56-52 64-47M74-43 81-51M85-28 93-29", "none", "#a3bacd", 1),
      path("M58-50 57-58M78-53 81-61M98-33 101-38", "none", "#d2eff4", 1.7));
    g.append(crown);
    const skull = s("g", { class: "eb-leviathan-skull" });
    skull.append(
      path("M16-25Q37-36 60-23L78-20 92-8 102-4 108 3 96 10 83 8 73 24Q51 33 27 17L13 5Z", `url(#${armor})`, "#a7bdce", 1.5),
      path("M19-19 35-25 42-10 30 2 17-2Z", "#425f76", "#8eabbf", .9),
      path("M34-25 53-26 62-16 52-7 42-10Z", "#537088", "#a0bbce", 1),
      path("M54-25 74-17 87-9 70-6 62-16Z", "#50667b", "#bdd0d8", .8),
      path("M76-5 93-6 102 1 93 4 82 2Z", "#23344c", "#7f9eb6", .8),
      path("M51 6 65 1 80 7 73 22 56 21 44 14Z", "#0c1529", "#718ca8", 1.2),
      path("M47-7Q33 4 42 18", "none", "#0b162b", 7),
      path("M45-6Q34 4 43 16", "none", "#a9c7d5", 1));
    const gills = s("g", { class: "eb-leviathan-gills" });
    for (let i = 0; i < 4; i++) {
      const x = 13 + i * 6;
      gills.append(path(`M${x} ${-13 + i}q-8 11 0 23`, "none", "#081527", 3.8),
        path(`M${x + 1} ${-12 + i}q-6 9 0 20`, "none", i % 2 ? "#c3a9e6" : "#8fcbe0", 1.1));
    }
    skull.append(gills,
      s("circle", { cx: 58, cy: 10, r: 16, fill: `url(#${heart})`, class: "eb-leviathan-core eb-glow" }),
      s("ellipse", { cx: 58, cy: 10, rx: 5, ry: 8, fill: "#b0d5ff", stroke: "#dceeff", "stroke-width": .7, class: "eb-leviathan-core" }),
      path("M58 3 60 10 58 17 56 10Z", "#f1f5ff", "none"));
    // A descending constellation of eyes makes the profile unmistakable.
    [[67,-12,4.1],[76,-9,3.2],[84,-5,2.3]].forEach(([cx,cy,r]) => {
      skull.append(s("ellipse", { cx, cy, rx: r + 1.7, ry: r, fill: "#07111f", stroke: "#b6cdd6", "stroke-width": .65 }),
        s("ellipse", { cx, cy, rx: r, ry: r * .57, fill: "#f8c789", class: "eb-glow eb-leviathan-eye" }),
        s("ellipse", { cx: cx + .8, cy, rx: .65, ry: r * .57, fill: "#352938" }));
    });
    const jaw = s("g", { class: "eb-leviathan-jaw" });
    jaw.append(path("M76 7 89 10 102 5 93 17 77 22 68 19Z", "#253a52", "#9eb8ca", 1.1),
      path("M77 8 82 8 79 15ZM86 9 91 8 87 15ZM94 6 99 5 94 12Z", "#d2e5df", "none"),
      path("M79 20 84 18 82 14ZM89 17 93 15 89 12Z", "#a4c4ce", "none"),
      path("M74 25Q84 42 72 51M83 21Q99 32 93 42", "none", "#8fc7d4", 1.2),
      s("circle", { cx: 72, cy: 51, r: 2, fill: "#d2ebee", class: "eb-glow" }),
      s("circle", { cx: 93, cy: 42, r: 1.5, fill: "#c4d9f0", class: "eb-glow" }));
    skull.append(jaw);
    g.append(skull);
  } else {
    const body = s("g");
    for (let i = 0; i < 6; i++) {
      const y = (i - 2.5) * 9;
      body.append(path(`M-9 ${y * .6}Q-33 ${y} -42 ${y + (i % 2 ? 17 : -15)}T-60 ${y + 5}`, "none", "#685988", 3), path(`M-9 ${y * .6}Q-33 ${y} -42 ${y + (i % 2 ? 17 : -15)}T-60 ${y + 5}`, "none", "#a2a0bf", .5));
    }
    body.append(path("M-21 0Q-22-29 4-25L31-7 39 0 30 14 1 25Q-21 27-21 0Z", skin, "#b0b8d4", 1.2), path("M-7-19 0-10 6-20 11-9 16-14M-8 18 0 10 8 19 13 9", "none", "#a5c5ce", 1), s("ellipse", { cx: 19, cy: -5, rx: 7, ry: 4, fill: "#e7a5d3", class: "eb-glow" }), s("ellipse", { cx: 21, cy: -5, rx: 1.5, ry: 4, fill: "#382b48" }), path("M19 9 32 4 27 13Z", "#d6d6b5", "none"),path("M-18-11-3-20 3-9-3 2-18 6ZM-13 12-1 4 8 12 0 21Z","#384461","#98aac8",.8),path("M-5-25 4-38 11-24M6 22 16 31 18 15",skin,"#b5bad1",.9));
    g.append(body);
  }
  return g;
}
