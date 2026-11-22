// The Velvet Vault — sound, synthesized with WebAudio: no audio files, no
// network. Footsteps, pickup chimes, the alert sting, the alarm pulse and the
// getaway jingle are all little oscillators.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.alarmOsc = null;
    this.alarmGain = null;
  }

  /** Create the audio context on the first user gesture (browsers require it). */
  ensure() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopAlarm();
    return this.muted;
  }

  tone(freq, seconds, type, volume, when = 0) {
    if (!this.ctx || this.muted) return;
    const start = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  footstep(sneaking) {
    this.tone(sneaking ? 90 : 140, 0.05, 'triangle', sneaking ? 0.015 : 0.03);
  }

  pickup() {
    this.tone(660, 0.12, 'sine', 0.12);
    this.tone(990, 0.18, 'sine', 0.12, 0.09);
  }

  lockpickTick() {
    this.tone(1200, 0.04, 'square', 0.04);
  }

  alert() {
    this.tone(220, 0.25, 'sawtooth', 0.1);
    this.tone(330, 0.3, 'sawtooth', 0.1, 0.12);
  }

  busted() {
    this.tone(180, 0.5, 'sawtooth', 0.14);
    this.tone(120, 0.7, 'sawtooth', 0.14, 0.25);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.12, i * 0.12));
  }

  click() {
    this.tone(800, 0.05, 'square', 0.05);
  }

  /** A low pulsing alarm while the meter is high; call every frame. */
  alarmPulse(alarm) {
    if (!this.ctx || this.muted) return;
    if (alarm < 55) {
      this.stopAlarm();
      return;
    }
    if (!this.alarmOsc) {
      this.alarmOsc = this.ctx.createOscillator();
      this.alarmGain = this.ctx.createGain();
      this.alarmOsc.type = 'sine';
      this.alarmOsc.frequency.value = 55;
      this.alarmGain.gain.value = 0.0;
      this.alarmOsc.connect(this.alarmGain).connect(this.ctx.destination);
      this.alarmOsc.start();
    }
    const target = 0.02 + (alarm / 100) * 0.05;
    this.alarmGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.2);
    this.alarmOsc.frequency.setTargetAtTime(50 + alarm * 0.6, this.ctx.currentTime, 0.3);
  }

  stopAlarm() {
    if (this.alarmOsc) {
      try { this.alarmOsc.stop(); } catch { /* already stopped */ }
      this.alarmOsc = null;
      this.alarmGain = null;
    }
  }
}
