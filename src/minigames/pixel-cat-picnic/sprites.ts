/** Original 16×16 sprites, drawn one square at a time. No image/font downloads. */
import { s } from "../../lib/dom";
import type { ObjectKind } from "./game";
const maps: Record<string,string[]> = {
 'web':['w......w......w.', 'ww.....w.....ww.', '.w.w...w...w.w..', '..ww.www.www.w..', '...ww..w..ww....', '...w.wwwww.w....', '....ww.w.ww.....', 'wwwwwwwwwwwwwwww', '....ww.w.ww.....', '...w.wwwww.w....', '...ww..w..ww....', '..ww.www.www.w..', '.w.w...w...w.w..', 'ww.....w.....ww.', 'w......w......w.', '................'],
 'bone':['...XXX......XXX.', '..XwwwX....XwwwX', '.XwwwwwXXXXwwwww', '..XwwwwwwwwwwwwX', '...XwwwwwwwwwwX.', '...XwwwwwwwwwwX.', '..XwwwwwwwwwwwwX', '.XwwwwwXXXXwwwww', '..XwwwX....XwwwX', '...XXX......XXX.', '................', '................', '................', '................', '................', '................'],
 'banana':['.......XX.......', '......XffX......', '......XffX......', '......XffX......', '.....XffffX.....', '....XffXXffX....', '...XffX..XffX...', '..XffX....XffX..', '.XffX......XffX.', 'XfffX......XfffX', 'XXXXX......XXXXX', '......XffX......', '.....XffffX.....', '....XffffffX....', '....XXXXXXXX....', '................'],
 'cake':['.......XX.......', '.......rr.......', '.......XX.......', '..XXXXXXXXXXXX..', '.XppppppppppppX.', 'XppwppwppwppwppX', 'XwwwwwwwwwwwwwwX', 'XffffffffffffffX', 'XffffffffffffffX', 'XppppppppppppppX', 'XppppppppppppppX', 'XffffffffffffffX', '.XXXXXXXXXXXXXX.', 'XXXXXXXXXXXXXXXX', '................', '................'],
 'potion':['......XXXX......', '......XffX......', '.....XXXXXX.....', '.....XwwwwX.....', '.....XwwwwX.....', '....XwwwwwwX....', '...XwwwwwwwwX...', '..XwwppppppwwX..', '.XwwppppppppwwX.', '.XwpppwppppppwX.', '.XwppwwppppppwX.', '.XwppppppppppwX.', '.XwwppppppppwwX.', '..XwwwwwwwwwwX..', '...XXXXXXXXXX...', '................'],
 'mystery':['................', '..XXXXXXXXXXXX..', '.XffffffffffffX.', 'XffbbbbbbbbbbffX', 'XffbbwwwwwwbbffX', 'XffbbwwbbwwbbffX', 'XffbbbbbbwwbbffX', 'XffbbbbbwwbbbffX', 'XffbbbbwwbbbbffX', 'XffbbbbbbbbbbffX', 'XffbbbbwwbbbbffX', 'XffbbbbwwbbbbffX', 'XffbbbbbbbbbbffX', '.XffffffffffffX.', '..XXXXXXXXXXXX..', '................'],
 'dog':['...XXXXXXXXXX...', '..XffffffffffX..', '.XrXffffffffXrX.', 'XrrXffXffXffXrrX', 'XffwXwffffwXwffX', 'XffwwwffffwwwffX', '.XffffooooffffX.', '..XffooXXooffX..', '...XoooooooXX...', '...XXffppffX....', '....XffffffX....', '..X.XffffffX....', '.XfXXffXXffX....', '..XffffXXffX....', '...XXXX..XX.....', '................'],

 cat:["..XX......XX....",".XffX....XffX...",".XppfXXXXfppX...",".XffffffffffX...","XffoooffoooofX..","XffoXoffoXoofX..","XffffffffffffX..","XfffffppfffffX..",".XfffXffXfffX...","..XXffffffXX....","..XffffffffX..X.","..XfffffXffX.XfX","..XffXffXffXXffX","..XffXffXffXffX.","...XX.XX.XX.XX..","................"],
 fish:["................","................","....XXXXXX......","..XXffffooXX..XX",".XffffffoXffXXfX","XfffffffffffffXX","Xfffffffffffffff","XfffffffffffffXX",".XffffffffffXXfX","..XXffffffXX..XX","....XXXXXX......","................","................","................","................","................"],
 milk:[".....XXXXXX.....",".....XwwwwX.....",".....XXXXXX.....","....XwwwwwwX....","...XwwwwwwwwX...","...XwwwwwwwwX...","...XwbbbbbbwX...","...XwbbbbbbwX...","...XwbwwwbbwX...","...XwbwbwbbwX...","...XwbbbbbbwX...","...XwwwwwwwwX...","...XwwwwwwwwX...","....XXXXXXXX....","................","................"],
 bubble:["......XXXX......","....XXbbbbXX....","...XbbwwbbbbX...","..XbbwwbbbbbbX..",".XbbwwbbbbbbbbX.",".XbbbbbbbbbbbbX.","XbbbbbbbbbbbbbbX","XbbbbbbbbbbbbbbX","XbbbbbbbbbbbbbbX",".XbbbbbbbbbbbbX.",".XbbbbbbbbbbbbX.","..XbbbbbbbbbbX..","...XbbbbbbbbX...","....XXbbbbXX....","......XXXX......","................"],
 ice:["................","...XXXXXXXXXX...","..XwwbbbbbbbbX..","..XwwbbbbbbbbX..","..XwbwwwbbbbbX..","..XbbwwwbbbbbX..","..XbbbbbbbbbbX..","..XbbbbbwbbbbX..","..XbbbbwwwbbbX..","..XbbbbbwbbbbX..","..XbbbbbbbbbbX..","..XbbbbbbbbbbX..","..XbbbbbbbbbbX..","...XXXXXXXXXX...","................","................"],
 bell:["......XXXX......","......XffX......",".....XXXXXX.....","....XffffffX....","....XffffffX....","...XffffffffX...","...XffffffffX...","...XffffffffX...","..XffffffffffX..","..XffffffffffX..",".XffffffffffffX.",".XXXXXXXXXXXXXX.","......XffX......",".......XX.......","................","................"],
 catnip:["................","......XX........",".....XggX.......",".....XggX..XX...","......XgX.XggX..","..XX..XgXXggX...",".XggX.XgXggX....","..XggXXgXXX.....","...XggXgX.......","....XXXgX.......","......XgX.......","...XXXXXXXXXX...","....XffffffX....","....XffffffX....",".....XXXXXX.....","................"],
 soup:["....X...X...X...","...X...X...X....","....X...X...X...","................","..XXXXXXXXXXXX..",".XffffffffffffX.","XffffffffffffffX","XwwwwwwwwwwwwwwX",".XwwwwwwwwwwwwX.",".XwwwwwwwwwwwwX.","..XwwwwwwwwwwX..","...XwwwwwwwwX...","....XXXXXXXX....",".....XffffX.....","......XXXX......","................"],
 can:["................","....XXXXXXXX....","...XooooooooX...","...XXXXXXXXXX...","...XrrrrrrrrX...","...XrwwwwwwrX...","...XrwrwwrwrX...","...XrwwrrwwrX...","...XrwwrrwwrX...","...XrwrwwrwrX...","...XrwwwwwwrX...","...XrrrrrrrrX...","...XrrrrrrrrX...","....XXXXXXXX....","................","................"],
};
export function pixelSprite(name: ObjectKind | "cat" | "dog", mood: "normal"|"sleep" = "normal"): SVGSVGElement {
 const kind=name==="spicy"?"fish":name;
 const rows=maps[kind]??maps.fish;
 const colors: Record<string,string> = {X:"#283141",f:name==="dog"?"#bc8862":name==="spicy"?"#ed785e":name==="fish"?"#edbc73":"#e8ad69",p:"#e99b9a",o:"#fcf3dd",w:name==="web"?"#91a7b9":"#fbf3dc",b:"#8cc9cd",g:"#8cae6a",r:name==="dog"?"#805b49":"#a97679"};
 const svg=s("svg",{viewBox:"0 0 16 16","aria-hidden":"true",class:`cat-pixel cat-pixel-${name}`,"shape-rendering":"crispEdges"});
 rows.forEach((row,y)=>row.padEnd(16,".").slice(0,16).split("").forEach((color,x)=>{
  if(color!==".")svg.append(s("rect",{x,y,width:1,height:1,fill:mood==="sleep"&&name==="cat"&&y===5?"#283141":colors[color]??"#283141"}));
 }));
 return svg;
}
