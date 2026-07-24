import { Save } from './SaveManager';

/**
 * All audio is synthesised with the Web Audio API — no files.
 * The context is lazily created on first user gesture (browser autoplay policy).
 */
class AudioSynthImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = Save.muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
      } catch { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  get muted() { return Save.muted; }

  toggleMute(): boolean {
    Save.muted = !Save.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(Save.muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
    return Save.muted;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine',
               vol = 0.3, slideTo?: number, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol = 0.25, delay = 0, lpFreq = 1200) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = lpFreq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(lp).connect(g).connect(this.master);
    src.start(t0);
  }

  // ---- Named SFX hooks ----
  uiTick() { this.tone(720, 0.05, 'square', 0.08); }
  uiSelect() { this.tone(520, 0.08, 'triangle', 0.2); this.tone(780, 0.1, 'triangle', 0.18, undefined, 0.06); }
  start() { [330, 330, 330, 495].forEach((f, i) => this.tone(f, i === 3 ? 0.3 : 0.12, 'square', 0.16, undefined, i * 0.18)); }
  crash() { this.noise(0.28, 0.5, 0, 900); this.tone(110, 0.25, 'sawtooth', 0.3, 55); }
  pedYelp() { this.tone(880, 0.12, 'square', 0.2, 1400); }
  nearMiss() { this.tone(1200, 0.07, 'sine', 0.12, 900); }
  skid() { this.noise(0.12, 0.06, 0, 2400); }
  parkSuccess() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.22, undefined, i * 0.09)); }
  perfectPark() { [659, 831, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.24, undefined, i * 0.08)); }
  combo(mult: number) { this.tone(600 + mult * 120, 0.1, 'square', 0.16, 900 + mult * 120); }
  fail() { this.tone(300, 0.3, 'sawtooth', 0.25, 150); this.tone(200, 0.5, 'sawtooth', 0.2, 90, 0.2); }
  levelComplete() { this.parkSuccess(); this.tone(1319, 0.35, 'triangle', 0.2, undefined, 0.4); }
  victory() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.22, undefined, i * 0.14)); }
  star(i: number) { this.tone(900 + i * 180, 0.14, 'triangle', 0.22); }

  /** Continuous engine hum whose pitch follows speed 0..1. */
  engine(speed01: number, on: boolean) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (on && !this.engineOsc) {
      this.engineOsc = ctx.createOscillator();
      this.engineGain = ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 320;
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(lp).connect(this.engineGain).connect(this.master);
      this.engineOsc.start();
    }
    if (this.engineOsc && this.engineGain) {
      const t = ctx.currentTime;
      this.engineOsc.frequency.setTargetAtTime(45 + speed01 * 120, t, 0.05);
      this.engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.06 : 0, t, 0.08);
    }
  }

  stopEngine() {
    if (this.engineGain && this.ctx) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }
}

export const Sfx = new AudioSynthImpl();
