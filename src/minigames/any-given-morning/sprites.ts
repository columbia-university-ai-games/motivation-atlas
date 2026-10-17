import tilemapUrl from "./assets/tilemap_packed.png";

// Each character is one pixel. Short rows are padded with transparency to 16px.
const palette: Record<string, string> = {
  o: "#3c3537", w: "#fff1cc", t: "#b67a4d", b: "#78513c", s: "#e4b18a",
  g: "#729b48", G: "#a6bc59", d: "#405c43", y: "#efc35c", r: "#c56b59",
  B: "#568f9d", c: "#89bec1", l: "#d4e3bf", p: "#b4829b", k: "#57576b",
};
function grid(...rows: string[]): string[] {
  return Array.from({ length: 16 }, (_, i) => (rows[i] ?? "").padEnd(16, ".").slice(0, 16));
}
export const GRIDS: Record<string, string[]> = {
  water: grid("BBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BBccBBBBBBBBBBBB", "BBBBcccBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BBBBBBBBBBcccBBB", "BBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BcccBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BBBBBBBccBBBBBBB", "BBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB"),
  water2: grid("BBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BBBBBBBBBBccBBBB", "BBBBBBBBBBBBBBBB", "BBBBcccBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BBBBBBBBcccBBBBB", "BBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BBBcccBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BBBBccBBBBBBBBBB", "BBBBBBBBBBBBBBBB", "BBBBBBBBBBBBBBBB"),
  shore: grid("GGtBBBBBBBBBBBBB", "GGttBBBBBBBBBBBB", "GGGtBBBBBBBBBBBB", "GGttcBBBBBBBBBBB", "GGtBBBBBBBBBBBBB", "GGtBBBBBBBBBBBBB", "GGttBBBBBBBBBBBB", "GGGtcBBBBBBBBBBB", "GGGtBBBBBBBBBBBB", "GGttBBBBBBBBBBBB", "GGtBBBBBBBBBBBBB", "GGttBBBBBBBBBBBB", "GGGtBBBBBBBBBBBB", "GGGtBBBBBBBBBBBB", "GGttBBBBBBBBBBBB", "GGtBBBBBBBBBBBBB"),
  shore2: grid("GGtBBBBBBBBBBBBB", "GGttcBBBBBBBBBBB", "GGGtBBBBBBBBBBBB", "GGttBBBBBBBBBBBB", "GGtcBBBBBBBBBBBB", "GGtBBBBBBBBBBBBB", "GGttBBBBBBBBBBBB", "GGGtBBBBBBBBBBBB", "GGGtcBBBBBBBBBBB", "GGttBBBBBBBBBBBB", "GGtBBBBBBBBBBBBB", "GGttBBBBBBBBBBBB", "GGGtBBBBBBBBBBBB", "GGGtBBBBBBBBBBBB", "GGttcBBBBBBBBBBB", "GGtBBBBBBBBBBBBB"),
  dock: grid(".oooooooooooooo.", ".otttbttttbttto.", ".otttbttttbttto.", ".obbbbbbbbbbbbo.", ".otttbttttbttto.", ".otttbttttbttto.", ".obbbbbbbbbbbbo.", ".otttbttttbttto.", ".otttbttttbttto.", ".obbbbbbbbbbbbo.", ".otttbttttbttto.", ".otttbttttbttto.", ".obbbbbbbbbbbbo.", ".otttbttttbttto.", ".oooooooooooooo."),
  fence: grid("..oo........oo..", ".ott o.....otto.".replaceAll(" ", "."), ".otto......otto.", "oottoooooooottoo", "otttttttttttttto", "obbbbbbbbbbbbbbo", ".otto......otto.", ".otto......otto.", "oottoooooooottoo", "otttttttttttttto", "obbbbbbbbbbbbbbo", ".otto......otto.", ".otto......otto.", ".oooo......oooo."),
  bench: grid("................", "................", ".oooooooooooooo.", ".otttttttttttto.", ".obbbbbbbbbbbbo.", ".otttttttttttto.", ".oooooooooooooo.", "..ob........bo..", ".oooooooooooooo.", "otttttttttttttto", "obbbbbbbbbbbbbbo", ".oo..........oo.", ".oo..........oo."),
  well: grid(".....oooooo.....", "...oorttrroo....", "..orrrrrrrrro...", ".oooooooooooooo.", "...bt......tb...", "...bt......tb...", "...btooooootb...", "...bt..bb..tb...", "..oookkkkkkooo..", ".okklBBBBBlkkko.", ".okkkkllkkkkkko.", "..oklkkkklkkko..", "..okkklkkkkkko..", "...oooooooooo..."),
  lamp: grid("......oo........", "....oooooo......", "....oyyyyo......", "....oywwyo......", "....oyyyyo......", "....oooooo......", "......bb........", "......bb........", "......bb........", "......bb........", "......bb........", "......bb........", ".....obbo.......", "....oooooo......"),
  stall: grid("..oooooooooooo..", ".orrrwwrrwwrrro.", "orrrwwrrwwrrrwwo", "oooooooooooooooo", "..bb........bb..", "..bb........bb..", "..bb..yyyy..bb..", "..bb..oooo..bb..", ".oooooooooooooo.", ".otttttttttttto.", ".obbbbbbbbbbbbo.", "..bb........bb..", "..bb........bb.."),
  dog: grid("................", "................", "..oo......oo....", ".otto....otto...", ".ottttoootttto..", "..ottstttstto...", "..otottttoto....", "..otttootttto...", "...ottttttto....", "....oooooo......", "..oottttttoo..o.", ".ottttttttttooto", ".otttttttttttto.", "..ootooootoooo..", "..ooo...ooo....."),
  frog: grid("................", "................", "................", "................", "....ooo..ooo....", "...oGwGooGwGo...", "...oGoGGGGoGo...", "....oGGGGGGo....", "...oGggggggGo...", "..oGGgoooogGGo..", "...ooGGGGGGoo...", "..oGGooooooGGo..", "...oo......oo..."),
  letter: grid("................", "................", "................", "................", "...oooooooooo...", "..oyyyyyyyyyyo..", "..oyoyyyyyyoyo..", "..oyyoyyyyoyyo..", "..oyyyooooyyyo..", "..oyyyyyyyyyyo..", "..oooooooooooo.."),
  apple: grid("................", "................", ".......bo.......", ".......bggo.....", ".....oorroo.....", "....orrrrrro....", "....orwrrrro....", "....orrrrrro....", ".....orrrro.....", "......oooo......"),
  hat: grid("................", "................", "................", "......oooo......", ".....oyyyyo.....", ".....oyyyyo.....", "....oyyyyyyo....", "....obbbbbbo....", "..ooyyyyyyyyoo..", ".oyyyyyyyyyyyyo.", "..oooooooooooo.."),
  stone: grid("................", "................", "................", "................", "................", ".....oooooo.....", "....oklll k o...".replaceAll(" ", "k"), "...okllkkkkko...", "...okkkkkkkko...", "....oooooooo...."),
  flowers: grid("................", "................", "....y...........", "...ywy.....p....", "....y.....pwp...", "....d......p....", "..g.d......d....", "...gd.g..g.d....", "....dg....gd....", "....d......dg...", "...ggg....ggg..."),
  alligator: grid("................", "................", "................", ".....oo..oo.....", "....oGwooGwo....", "...ogGoggGGo....", "..ogggggggggo...", "oogggggggggggoo.", "ogGggggggggggggo", ".oooooowowowoooo", "...ogggoooggggo.", "...oooggggoo....", "....oo....oo...."),
  alligator_glow: grid("................", "................", "................", ".....yy..yy.....", "....ywwyywwy....", "...yGwyGGwwy....", "..yGGGGGGGGGy...", "yyGGGGGGGGGGGyy.", "yGwGGGGGGGGGGGGy", ".yyyyyywywywyyyy", "...yGGGyyyGGGGy.", "...yyyGGGGyy....", "....yy....yy...."),
  ufo: grid("................", "......oooo......", ".....occcco.....", "....ocwwccco....", "....occcccco....", "..oookkkkkkooo..", ".okkkkkkkkkkkko.", "oklkkylkkylkkkko", ".oooooooooooooo.", "....oyywwyyo....", ".....oooooo....."),
  piano: grid("....ooooooo.....", "...okkkkkkko....", "..okkkkkkkko....", "..okkkkkkkkko...", "..okkkkkkkkkko..", "..okkkkkkkkkkko.", "..okkkkkkkkkkko.", "..ooooooooooooo.", "..owowowowowowo.", "..owwwwwwwwwwwo.", "..ooooooooooooo.", "...oo......oo...", "...oo......oo..."),
  meteor: grid(".............y..", "..........y.yy..", "........y.yyyr..", "......yyyyyrr...", ".....yyyrrro....", "....oyrrrro.....", "...okkkkko......", "..oktkkkkko.....", "..oktkkktko.....", "..okkkktkko.....", "...okkkkko......", "....ooooo......."),
  crow: grid("................", "................", "................", "..oo........oo..", "...oo......oo...", "....ooo..ooo....", ".....okkkko.....", "......okko......", ".......oo......."),
  tornado: grid("..kkkkkkkkkkk...", ".klllllllkkkkk..", "..kkkkkkkkkkkk..", "...kkkklllllk...", "....kkkkkkkk....", "...kkllllkkk....", "....kkkkkkk.....", ".....kkllk......", "......kkk.......", ".....kkk........", "......kk........", ".......k........"),
  body: grid(".....oooooo.....", "....obbbbbb o...".replaceAll(" ", "b"), "....obbbbbbo....", "....ossssss o...".replaceAll(" ", "s"), "....osossos o...".replaceAll(" ", "s"), ".....osssso.....", "......oooo......", "....ooBBBBoo....", "...osBBBBBBso...", "...osBBBBBBso...", "....ooBBBBo.....", ".....obbbbo.....", ".....obobbo.....", ".....oo.oo......"),
};

export interface Sprites {
  ready: Promise<void>;
  tile(ctx: CanvasRenderingContext2D, index: number, x: number, y: number, flip?: boolean): void;
  draw(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, size?: number, flip?: boolean): void;
  person(ctx: CanvasRenderingContext2D, variant: number, x: number, y: number, flip: boolean): void;
  dispose(): void;
}

export function createSprites(): Sprites {
  const images = new Map<string, HTMLImageElement>();
  const pending: (() => void)[] = [];
  const cache = new Map<string, HTMLCanvasElement>();
  const load = (name: string, url: string): Promise<void> => new Promise((resolve) => {
    const img = new Image();
    const done = () => { img.onload = null; img.onerror = null; resolve(); };
    img.onload = () => { images.set(name, img); done(); };
    img.onerror = done;
    pending.push(done);
    img.src = url;
  });
  const optional = import.meta.glob<string>("./assets/gen/{alligator,alligator_glow,ufo,piano}.png", { eager: true, query: "?url", import: "default" });
  const ready = Promise.all([load("tiles", tilemapUrl), ...Object.entries(optional).map(([path, url]) => load(path.split("/").pop()!.replace(".png", ""), url))]).then(() => {});
  const blit = (ctx: CanvasRenderingContext2D, source: CanvasImageSource, x: number, y: number, w: number, h: number, flip = false) => {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    if (flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(source, 0, 0, w, h); ctx.restore();
  };
  const bitmap = (name: string, colors = palette): HTMLCanvasElement | null => {
    const key = name + (colors.B ?? "");
    if (cache.has(key)) return cache.get(key)!;
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 16;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    (GRIDS[name] ?? GRIDS.stone).forEach((row, y) => [...row].forEach((pixel, x) => {
      if (colors[pixel]) { ctx.fillStyle = colors[pixel]; ctx.fillRect(x, y, 1, 1); }
    }));
    cache.set(key, canvas); return canvas;
  };
  const tile = (ctx: CanvasRenderingContext2D, index: number, x: number, y: number, flip = false) => {
    const sheet = images.get("tiles");
    if (!sheet) { ctx.fillStyle = index >= 108 ? palette.t : palette.g; ctx.fillRect(x, y, 16, 16); return; }
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    if (flip) { ctx.translate(16, 0); ctx.scale(-1, 1); }
    ctx.drawImage(sheet, index % 12 * 16, Math.floor(index / 12) * 16, 16, 16, 0, 0, 16, 16); ctx.restore();
  };
  return {
    ready, tile,
    draw(ctx, name, x, y, size = 16, flip = false) {
      const generated = images.get(name);
      if (generated) { blit(ctx, generated, x, y, size, size * generated.height / generated.width, flip); return; }
      const canvas = bitmap(name);
      if (canvas) blit(ctx, canvas, x, y, size, size, flip);
      else { ctx.fillStyle = palette[name === "water" ? "B" : "t"]; ctx.fillRect(x, y, size, size); }
    },
    person(ctx, variant, x, y, flip) {
      // Recolor the original 108/109 pixels without tinting their transparent outline.
      const key = `person-${variant}`;
      let canvas = cache.get(key);
      if (!canvas && images.has("tiles")) {
        canvas = document.createElement("canvas"); canvas.width = canvas.height = 16;
        const body = canvas.getContext("2d");
        if (body) {
          tile(body, 108 + (variant % 2), 0, 0);
          const pixels = body.getImageData(0, 0, 16, 16);
          const shirts = [[67, 117, 139], [179, 97, 80], [121, 113, 153], [204, 155, 70], [89, 133, 85]];
          const shirt = shirts[variant % shirts.length];
          for (let y = 10; y < 15; y++) for (let x = 0; x < 16; x++) {
            const i = (y * 16 + x) * 4;
            const red = pixels.data[i], green = pixels.data[i + 1], blue = pixels.data[i + 2];
            const shirtPixel = red === 242 && green === 132 && blue === 98;
            const shirtShade = red === 195 && green === 75 && blue === 53;
            const overalls = red === 82 && green === 96 && blue === 124;
            if (pixels.data[i + 3] && (shirtPixel || shirtShade || overalls)) {
              const tone = shirtShade ? 0.74 : overalls ? 0.82 : 1;
              pixels.data[i] = shirt[0] * tone; pixels.data[i + 1] = shirt[1] * tone; pixels.data[i + 2] = shirt[2] * tone;
            }
          }
          body.putImageData(pixels, 0, 0); cache.set(key, canvas);
        } else canvas = undefined;
      }
      const fallback = canvas ?? bitmap("body", { ...palette, B: ["#43758b", "#b36150", "#797199", "#cc9b46", "#598555"][variant % 5] });
      if (fallback) blit(ctx, fallback, x, y, 16, 16, flip);
      else tile(ctx, 108 + variant % 2, x, y, flip);
    },
    dispose() { pending.forEach((done) => done()); images.clear(); cache.clear(); },
  };
}
