// Adapted from Oscar O'Donnell's Autumn Drive: racing/src/audio.ts.
class DrivingAudio {
  constructor(config) {
    this.config = config;
  }
  context;
  master;
  engine;
  harmonic;
  engineGain;
  tireGain;
  windGain;
  waterGain;
  opponent;
  opponentGain;
  siren;
  sirenGain;
  volume = 0.32;
  async start() {
    if (!this.context) {
      const c = this.context = new AudioContext(), master = this.master = c.createGain();
      master.gain.value = this.volume;
      master.connect(c.destination);
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 700;
      filter.Q.value = 0.3;
      this.engineGain = c.createGain();
      this.engineGain.gain.value = 0.05;
      this.engineGain.connect(filter);
      filter.connect(master);
      this.engine = c.createOscillator();
      this.engine.type = "sawtooth";
      this.engine.frequency.value = 53;
      this.engine.connect(this.engineGain);
      this.engine.start();
      this.harmonic = c.createOscillator();
      this.harmonic.type = "triangle";
      this.harmonic.frequency.value = 106;
      this.harmonic.connect(this.engineGain);
      this.harmonic.start();
      const data = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), samples = data.getChannelData(0);
      let last = 0;
      for (let i = 0; i < samples.length; i++) {
        last = (last + Math.random() * 0.08 - 0.04) / 1.018;
        samples[i] = last * 3.5;
      }
      const noise = c.createBufferSource();
      noise.buffer = data;
      noise.loop = true;
      const layer = (frequency, type) => {
        const f = c.createBiquadFilter();
        f.type = type;
        f.frequency.value = frequency;
        const g = c.createGain();
        g.gain.value = 0;
        noise.connect(f);
        f.connect(g);
        g.connect(master);
        return g;
      };
      this.tireGain = layer(1700, "highpass");
      this.windGain = layer(750, "lowpass");
      this.waterGain = layer(450, "bandpass");
      noise.start();
    }
    await this.context.resume();
  }
  dispose() {
    void this.context?.close();
    this.context = void 0;
  }
  pause() {
    void this.context?.suspend();
  }
  /** Separate engine cadence and patrol tone share only the master volume bus. */
  updatePursuit(opponent, distance, patrolDistance) {
    if (!this.context || !this.master) return;
    const c = this.context, t = c.currentTime;
    if (!this.opponent) {
      this.opponent = c.createOscillator();
      this.opponent.type = "triangle";
      this.opponentGain = c.createGain();
      this.opponentGain.gain.value = 0;
      this.opponent.connect(this.opponentGain);
      this.opponentGain.connect(this.master);
      this.opponent.start();
      this.siren = c.createOscillator();
      this.siren.type = "sine";
      this.sirenGain = c.createGain();
      this.sirenGain.gain.value = 0;
      this.siren.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.siren.start();
    }
    this.opponent.frequency.setTargetAtTime(opponent.rpm / 60 * this.config.cylinderCount / 2, t, 0.08);
    this.opponentGain.gain.setTargetAtTime((0.025 + opponent.throttle * 0.055) / (1 + (distance / 10) ** 2), t, 0.12);
    this.siren.frequency.setTargetAtTime(730 + Math.sin(t * 3.8) * 240, t, 0.035);
    this.sirenGain.gain.setTargetAtTime(0.036 / (1 + (patrolDistance / 28) ** 2), t, 0.15);
  }
  update(state, nearWater) {
    if (!this.context || !this.engine) return;
    const t = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.volume, t, 0.1);
    const firing = state.rpm / 60 * this.config.cylinderCount / 2;
    this.engine.frequency.setTargetAtTime(firing, t, 0.07);
    this.harmonic.frequency.setTargetAtTime(firing * 2, t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.022 + state.throttle * 0.055, t, 0.1);
    const slip = Math.max(...state.wheels.filter((w) => w.grounded).map((w) => Math.abs(w.lateralSlip) * 2 + Math.max(0, Math.abs(w.slip) - 0.15)), 0);
    this.tireGain.gain.setTargetAtTime(Math.min(0.23, slip * 0.19) * Math.min(1, Math.abs(state.speed) / 6), t, 0.1);
    this.windGain.gain.setTargetAtTime(Math.min(0.2, Math.abs(state.speed) * 4e-3), t, 0.2);
    this.waterGain.gain.setTargetAtTime(nearWater ? 0.035 : 0, t, 0.8);
  }
}
export {
  DrivingAudio
};
