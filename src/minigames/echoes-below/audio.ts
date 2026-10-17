import type { EnemyKind, MusicScene } from "./game";

export const TRACK_NAMES: Record<MusicScene, string> = { explore: "Blue Silence", discovery: "Sunken Starlight", battle: "Undertow", boss: "Heart of the Abyss", beacon: "Far Shore Signal", victory: "Homebound Echoes", defeat: "Last Coordinates" };
export type Note = { midi: number; duration: number; instrument: "pad" | "bell" | "bass" | "kick"; volume: number };
const SCORES: Record<MusicScene, { bpm: number; root: number; melody: number[]; chord: number[] }> = {
  explore: { bpm: 66, root: 45, melody: [12, 19, 24, 26, 19, 16, 24, 19], chord: [0, 7, 14, 19] },
  discovery: { bpm: 82, root: 48, melody: [12, 16, 19, 23, 26, 23, 19, 16], chord: [0, 7, 11, 16] },
  battle: { bpm: 112, root: 38, melody: [12, 12, 19, 15, 12, 22, 19, 15], chord: [0, 7, 10, 15] },
  boss: { bpm: 138, root: 33, melody: [12, 13, 19, 12, 18, 13, 22, 19], chord: [0, 6, 7, 13] },
  beacon: { bpm: 78, root: 50, melody: [12, 16, 19, 24, 28, 26, 24, 19], chord: [0, 7, 12, 16] },
  victory: { bpm: 92, root: 48, melody: [12, 16, 19, 24, 21, 19, 16, 24], chord: [0, 4, 7, 12] },
  defeat: { bpm: 52, root: 41, melody: [19, 17, 15, 12, 10, 7, 3, 0], chord: [0, 3, 7, 14] },
};
export const tempoFor = (scene: MusicScene): number => SCORES[scene].bpm;

/** Original procedural score. Each scene changes melody, harmony and rhythm. */
export function notesFor(scene: MusicScene, step: number): Note[] {
  const score = SCORES[scene], notes: Note[] = [];
  const combat = scene === "battle" || scene === "boss";
  const interval = combat ? 1 : 2;
  if (step % interval === 0) notes.push({ midi: score.root + score.melody[Math.floor(step / interval) % score.melody.length], instrument: "bell", duration: combat ? .34 : 1.4, volume: combat ? .10 : .075 });
  if (step % 8 === 0) for (const interval of score.chord) notes.push({ midi: score.root + interval, instrument: "pad", duration: 3.4, volume: .032 });
  if (combat && step % 2 === 0) {
    notes.push({ midi: score.root - 12, instrument: "bass", duration: .22, volume: .16 });
    notes.push({ midi: step % 4 === 0 ? 30 : 37, instrument: "kick", duration: .16, volume: .17 });
  }
  if (scene === "boss" && step % 4 === 3) notes.push({ midi: score.root + 7, instrument: "bass", duration: .12, volume: .12 });
  return notes;
}

export type EnemyCueEvent = "move" | "aim" | "attack";
export type AudioStatus = { enabled: boolean; running: boolean; available: boolean; scheduled: number; scene: MusicScene };
export function createAudio(onStatus: (status: AudioStatus) => void) {
  let context: AudioContext | null = null, master: GainNode | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let enabled = true, disposed = false, paused = false, scene: MusicScene = "explore", step = 0, nextTime = 0, scheduled = 0;
  const voices = new Set<AudioScheduledSourceNode>();
  const cueTimes = new Map<string, number>();
  let noiseBuffer: AudioBuffer | null = null, lastEnemyCue = -10, lastMovement = -10, soundVoices = 0;
  const available = () => typeof globalThis.AudioContext !== "undefined";
  const report = () => onStatus({ enabled, running: context?.state === "running", available: available(), scheduled, scene });
  function voice(note: Note, time: number): void {
    if (!context || !master || disposed) return;
    const oscillator = context.createOscillator(), gain = context.createGain(), filter = context.createBiquadFilter();
    const frequency = 440 * 2 ** ((note.midi - 69) / 12);
    oscillator.type = note.instrument === "bass" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, time);
    if (note.instrument === "kick") oscillator.frequency.exponentialRampToValueAtTime(30, time + .13);
    filter.type = "lowpass"; filter.frequency.value = note.instrument === "pad" ? 900 : 3200;
    const attack = note.instrument === "pad" ? .28 : .015;
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(note.volume, time + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, time + Math.max(attack + .01, note.duration));
    oscillator.connect(filter); filter.connect(gain); gain.connect(master);
    oscillator.start(time); oscillator.stop(time + note.duration + .1); voices.add(oscillator); scheduled++;
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  function schedule(): void {
    if (!context || context.state !== "running" || !enabled || paused || disposed) return;
    while (nextTime < context.currentTime + .12) {
      for (const note of notesFor(scene, step)) voice(note, nextTime);
      nextTime += 30 / tempoFor(scene); step++;
    }
    report();
  }
  async function unlock(): Promise<void> {
    if (disposed || !enabled || paused || !available()) { report(); return; }
    try {
      if (!context) {
        context = new AudioContext(); master = context.createGain();
        const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -18; compressor.ratio.value = 4;
        master.gain.value = .52; master.connect(compressor); compressor.connect(context.destination);
      }
      if (context.state === "suspended") await context.resume();
      if (disposed) return;
      if (timer === null) { nextTime = context.currentTime + .04; timer = setInterval(schedule, 100); schedule(); }
      report();
    } catch { report(); }
  }
  function setScene(value: MusicScene): void {
    if (scene === value) return;
    scene = value; step = 0;
    if (context) nextTime = context.currentTime + .08;
    report();
  }
  function effect(kind: "fire" | "pickup" | "pulse" | "hit"): void {
    if (disposed || !enabled || paused || !context || context.state !== "running") return;
    const time = context.currentTime + .01;
    if (kind === "pickup") [72, 76, 79, 84].forEach((midi, i) => voice({ midi, duration: .5, volume: .12, instrument: "bell" }, time + i * .09));
    else if (kind === "pulse") [57, 69].forEach((midi, i) => voice({ midi, duration: 1.3, volume: .12, instrument: "bell" }, time + i * .18));
    else voice({ midi: kind === "fire" ? 42 : 28, duration: kind==="fire"?.15:.24, volume: kind==="fire"?.13:.2, instrument: "kick" }, time);
  }
  /** Short, original enemy Foley. This never creates/resumes an audio context:
   * callers must first unlock audio through the player's normal interaction. */
  function enemyCue(kind: EnemyKind, event: EnemyCueEvent, intensity: number): void {
    if (disposed || !enabled || paused || !context || !master || context.state !== "running" || !Number.isFinite(intensity)) return;
    const strength = Math.max(0, Math.min(1, intensity));
    if (strength < .025 || soundVoices >= 14) return;
    const now = context.currentTime, boss = kind === "leviathan", cue = `${kind}:${event}`;
    const cooldown = event === "move" ? (boss ? 3.2 : 1.55) : event === "aim" ? (boss ? 1.15 : .75) : (boss ? .5 : .34);
    if (now - (cueTimes.get(cue) ?? -10) < cooldown || now - lastEnemyCue < .075 || (event === "move" && now - lastMovement < .48)) return;
    cueTimes.set(cue, now); lastEnemyCue = now;
    if (event === "move") lastMovement = now;
    const time = now + .012;
    // The distance curve keeps a distant contact audible without a harsh cutoff.
    const level = (.13 + .87 * Math.sqrt(strength)) * (event === "move" ? .72 : 1);
    function retain(source: AudioScheduledSourceNode, nodes: AudioNode[]): void {
      voices.add(source); soundVoices++;
      source.onended = () => { voices.delete(source); soundVoices--; source.disconnect(); for (const node of nodes) node.disconnect(); };
    }
    function tone(from: number, to: number, duration: number, volume: number, offset = 0, type: OscillatorType = "sine", cutoff = 1600, attack = .012): void {
      if (!context || !master) return;
      const source = context.createOscillator(), gain = context.createGain(), filter = context.createBiquadFilter(), start = time + offset;
      source.type = type; source.frequency.setValueAtTime(from, start); source.frequency.exponentialRampToValueAtTime(to, start + duration);
      filter.type = "lowpass"; filter.frequency.value = cutoff; filter.Q.value = .7;
      gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume * level), start + Math.min(attack, duration * .35));
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      source.connect(filter); filter.connect(gain); gain.connect(master); retain(source, [filter, gain]);
      source.start(start); source.stop(start + duration + .03); scheduled++;
    }
    function noise(duration: number, from: number, to: number, volume: number, offset = 0, filterType: BiquadFilterType = "bandpass", attack = .015): void {
      if (!context || !master) return;
      if (!noiseBuffer) {
        noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 2), context.sampleRate);
        const data = noiseBuffer.getChannelData(0); let seed = 81319, low = 0;
        for (let i = 0; i < data.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          const white = seed / 2147483648 - 1; low = low * .94 + white * .06;
          data[i] = white * .5 + low * 2.1;
        }
      }
      const source = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter(), start = time + offset;
      source.buffer = noiseBuffer; filter.type = filterType; filter.Q.value = filterType === "bandpass" ? 1.15 : .8;
      filter.frequency.setValueAtTime(from, start); filter.frequency.exponentialRampToValueAtTime(to, start + duration);
      gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume * level), start + Math.min(attack, duration * .35));
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      source.connect(filter); filter.connect(gain); gain.connect(master); retain(source, [filter, gain]);
      source.start(start); source.stop(start + duration + .03); scheduled++;
    }
    if (kind === "submarine") {
      if (event === "move") { tone(66, 59, .62, .035, 0, "triangle", 280, .08); tone(96, 84, .54, .018, .04, "sine"); noise(.45, 190, 95, .025, 0, "lowpass", .08); }
      else if (event === "aim") { [0,.14,.31].forEach((offset, i) => tone(690 + i * 90, 675 + i * 90, .15, .05, offset)); tone(170, 135, .4, .025, 0, "triangle", 600); }
      else { tone(146, 37, .27, .095, 0, "triangle", 800); noise(.28, 1400, 180, .07, 0, "lowpass"); tone(260, 100, .32, .03, .015, "sine"); }
    } else if (boss) {
      if (event === "move") { tone(46, 37, .95, .055, 0, "triangle", 240, .14); tone(73, 59, .85, .03, .02, "sine", 300, .12); noise(.9, 170, 70, .075, 0, "lowpass", .18); }
      else if (event === "aim") { tone(65, 165, .8, .065, 0, "triangle", 500, .16); tone(98, 244, .78, .032, .08, "sine", 800, .2); noise(.7, 250, 950, .055, .05, "bandpass", .15); }
      else { noise(.85, 650, 90, .115, 0, "lowpass", .025); tone(115, 32, .85, .095, 0, "triangle", 520, .025); tone(178, 63, .64, .045, .06, "sawtooth", 440, .03); tone(51, 35, .95, .04, .07, "sine", 200, .08); }
    } else if(kind==="angler"){
      if(event==="move"){tone(54,40,.5,.035,0,"triangle",250);noise(.35,270,90,.035);}
      else if(event==="aim"){tone(320,180,.65,.055,0,"sine");tone(55,110,.6,.04,0,"triangle",450);}
      else{noise(.38,1500,130,.09);tone(138,35,.35,.075,0,"sawtooth",400);}
    } else if(kind==="cuttle"){
      if(event==="move")noise(.36,460,210,.04,0,"bandpass",.1);
      else if(event==="aim")tone(420,860,.45,.04,0,"sine",1300,.08);
      else{noise(.45,1100,260,.085,0,"bandpass");tone(185,70,.3,.04,0,"triangle",500);}
    } else if(kind==="urchin"){
      if(event==="move")tone(260,190,.25,.02,0,"sine");
      else if(event==="aim")[0,.11,.23].forEach((offset,i)=>tone(600+i*120,650+i*120,.18,.04,offset));
      else{noise(.18,3100,900,.065);[0,.06,.12].forEach(offset=>tone(1700,450,.13,.035,offset,"triangle",2300));}
    } else if (kind === "jelly") {
      if (event === "move") { tone(520, 350, .3, .027); tone(780, 520, .22, .015, .1); }
      else if (event === "aim") { noise(.34, 900, 2600, .06); tone(270, 930, .32, .035, 0, "triangle", 1800, .06); }
      else { [0,.055,.13].forEach(offset => noise(.1, 2800, 500, .065, offset)); tone(1060, 210, .3, .045, 0, "triangle", 1800); }
    } else if (kind === "ray") {
      if (event === "move") noise(.42, 410, 130, .055, 0, "bandpass", .08);
      else if (event === "aim") { tone(220, 680, .34, .04, 0, "sine"); noise(.28, 650, 1800, .035, 0, "bandpass", .08); }
      else { noise(.32, 2700, 440, .085); tone(720, 160, .22, .04, .02, "triangle", 1500); }
    } else {
      const elite = kind === "elite", swarm = kind === "swarm";
      if (event === "move") { noise(.28, swarm ? 650 : 280, 95, .04, 0, "bandpass", .05); tone(elite ? 64 : 105, elite ? 49 : 68, .28, elite ? .035 : .02, 0, "sine"); }
      else if (event === "aim") { tone(elite ? 88 : 175, elite ? 165 : 310, .3, elite ? .055 : .035, 0, "triangle", 850, .06); noise(.26, 350, 900, .035, 0, "bandpass", .06); }
      else { noise(elite ? .34 : .2, elite ? 980 : 1550, 140, elite ? .09 : .065); tone(elite ? 146 : 230, elite ? 42 : 85, .21, elite ? .07 : .045, 0, "triangle", 900); }
    }
  }
  function toggle(): void {
    enabled = !enabled;
    if (context && master) master.gain.setTargetAtTime(enabled ? .52 : 0, context.currentTime, .05);
    if (enabled) { if (context) nextTime = context.currentTime + .04; void unlock(); }
    report();
  }
  function setPaused(value: boolean): void {
    paused = value;
    if (context && value) void context.suspend().then(report).catch(() => {});
    else if (!value && enabled) { if(context) nextTime=context.currentTime+.05; void unlock(); }
    report();
  }
  function dispose(): void {
    disposed = true;
    if (timer !== null) clearInterval(timer); timer = null;
    for (const oscillator of voices) { try { oscillator.stop(); } catch { /* already stopped */ } }
    voices.clear(); cueTimes.clear(); noiseBuffer = null; if (context) void context.close().catch(() => {}); context = null; master = null;
  }
  return { unlock, setScene, effect, enemyCue, toggle, setPaused, dispose };
}
