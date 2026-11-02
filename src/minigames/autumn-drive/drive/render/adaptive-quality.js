// Adapted from Oscar O'Donnell's Autumn Drive: racing/src/render/adaptive-quality.ts.
class AdaptiveQuality {
  level = 0;
  slow = 0;
  headroom = 0;
  average = 1e3 / 60;
  warmup = 2;
  settings(deviceRatio = 1) {
    const base = Math.min(deviceRatio, 1.25);
    return { pixelRatio: base * [1, 0.88, 0.8, 0.68, 0.68][this.level], shadowSize: this.level === 4 ? 1024 : 2048, level: this.level };
  }
  reset() {
    this.level = 0;
    this.slow = 0;
    this.headroom = 0;
    this.average = 1e3 / 60;
    this.warmup = 2;
  }
  update(frameMs) {
    if (!Number.isFinite(frameMs) || frameMs <= 0) return false;
    if (frameMs > 250) {
      this.slow = 0;
      this.headroom = 0;
      return false;
    }
    const dt = frameMs / 1e3;
    this.average += (frameMs - this.average) * (1 - Math.exp(-dt / 0.4));
    if (this.warmup > 0) {
      this.warmup -= dt;
      return false;
    }
    this.slow = this.average > 20 ? this.slow + dt : 0;
    this.headroom = this.average < 17.5 ? this.headroom + dt : 0;
    if (this.slow >= 2 && this.level < 4) {
      this.level++;
      this.slow = 0;
      this.headroom = 0;
      return true;
    }
    if (this.headroom >= 10 && this.level > 0) {
      this.level--;
      this.slow = 0;
      this.headroom = 0;
      return true;
    }
    return false;
  }
}
export {
  AdaptiveQuality
};
