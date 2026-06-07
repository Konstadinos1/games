'use strict';

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = Utils.loadState('muted', false);
    this.volume = Utils.loadState('volume', 0.7);
    this._initialized = false;
    this._bgmSource = null;
    this._bgmGain = null;
  }

  init() {
    if (this._initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
      this._initialized = true;
    } catch (e) { console.warn('Audio unavailable'); }
  }

  _resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(v) {
    this.muted = v;
    Utils.saveState('muted', v);
    if (this.masterGain) this.masterGain.gain.value = v ? 0 : this.volume;
  }

  setVolume(v) {
    this.volume = v;
    Utils.saveState('volume', v);
    if (!this.muted && this.masterGain) this.masterGain.gain.value = v;
  }

  // Create a note with oscillator
  _note(type, freq, startTime, dur, gainVal = 0.3) {
    if (!this._initialized || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + dur);
  }

  // Noise burst (for impacts)
  _noise(startTime, dur, gainVal = 0.1) {
    if (!this._initialized || this.muted) return;
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * gainVal;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 200;
    src.connect(filter);
    filter.connect(this.masterGain);
    src.start(startTime);
  }

  play(sound) {
    if (!this._initialized) return;
    this._resume();
    const t = this.ctx.currentTime;

    switch (sound) {
      case 'jump':
        this._note('sine',  300, t,       0.06, 0.3);
        this._note('sine',  500, t + 0.04, 0.1, 0.2);
        break;

      case 'catch_common':
        this._note('sine', 523, t,        0.08, 0.25);
        this._note('sine', 659, t + 0.07, 0.08, 0.25);
        break;

      case 'catch_rare':
        this._note('triangle', 659, t,        0.1, 0.3);
        this._note('triangle', 784, t + 0.08, 0.1, 0.3);
        this._note('triangle', 988, t + 0.16, 0.12, 0.3);
        break;

      case 'catch_epic':
        for (let i = 0; i < 4; i++) {
          const freqs = [523, 659, 784, 1047];
          this._note('square', freqs[i], t + i * 0.07, 0.12, 0.2);
        }
        break;

      case 'catch_legendary': {
        const melody = [784, 988, 1175, 1568, 1175, 988, 784];
        melody.forEach((f, i) => this._note('triangle', f, t + i * 0.06, 0.1, 0.35));
        break;
      }

      case 'miss':
        this._note('sawtooth', 200, t,       0.08, 0.25);
        this._note('sawtooth', 150, t + 0.07, 0.12, 0.2);
        this._noise(t, 0.08, 0.06);
        break;

      case 'hit':
        this._note('sawtooth', 120, t, 0.2, 0.35);
        this._noise(t, 0.15, 0.1);
        Utils.vibrate([100, 30, 80]);
        break;

      case 'streak_up': {
        const s = [523, 659, 784, 1047, 1319];
        s.forEach((f, i) => this._note('sine', f, t + i * 0.05, 0.1, 0.25));
        break;
      }

      case 'game_over': {
        const go = [523, 494, 440, 392];
        go.forEach((f, i) => this._note('sine', f, t + i * 0.18, 0.25, 0.3));
        break;
      }

      case 'level_up': {
        const lu = [523, 659, 784, 1047, 1319, 1047, 784];
        lu.forEach((f, i) => this._note('triangle', f, t + i * 0.08, 0.15, 0.35));
        break;
      }

      case 'coin':
        this._note('sine', 880, t,       0.06, 0.2);
        this._note('sine', 1175, t + 0.05, 0.06, 0.15);
        break;

      case 'button':
        this._note('sine', 440, t, 0.05, 0.15);
        break;

      case 'piri_zone':
        [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) =>
          this._note('sine', f, t + i * 0.06, 0.2, 0.3));
        Utils.vibrate([50, 20, 50, 20, 100]);
        break;

      case 'ar_catch':
        this._note('triangle', 784, t,       0.1, 0.4);
        this._note('triangle', 1175, t + 0.1, 0.15, 0.3);
        break;

      case 'powerup': {
        // Ascending whoosh chime
        const pu = [440, 554, 659, 880, 1109];
        pu.forEach((f, i) => this._note('sine', f, t + i * 0.05, 0.14, 0.3));
        this._note('triangle', 1760, t + 0.28, 0.25, 0.4);
        break;
      }

      case 'shield_break':
        // Clang + burst
        this._note('square', 220, t,       0.06, 0.3);
        this._note('square', 330, t + 0.04, 0.06, 0.25);
        this._noise(t, 0.12, 0.08);
        this._note('triangle', 880, t + 0.06, 0.15, 0.35);
        break;
    }
  }

  startBGM() {
    if (!this._initialized || this._bgmSource) return;
    this._resume();
    const t = this.ctx.currentTime;
    this._bgmGain = this.ctx.createGain();
    this._bgmGain.gain.value = 0.15;
    this._bgmGain.connect(this.masterGain);

    const playBeat = (startTime) => {
      const pattern = [
        [196, 0], [246, 0.25], [261, 0.5], [196, 0.75],
        [246, 1.0], [261, 1.25], [329, 1.5], [246, 1.75]
      ];
      const tempo = 0.3;
      pattern.forEach(([freq, offset]) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.08, startTime + offset * tempo);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + offset * tempo + 0.2);
        osc.connect(g);
        g.connect(this._bgmGain);
        osc.start(startTime + offset * tempo);
        osc.stop(startTime + offset * tempo + 0.25);
      });
    };

    const loopBGM = (startTime) => {
      playBeat(startTime);
      const loopDuration = 2.4;
      const scheduled = this.ctx.createOscillator();
      scheduled.frequency.value = 0;
      scheduled.connect(this.ctx.createGain());
      scheduled.start(startTime);
      scheduled.stop(startTime + loopDuration);
      scheduled.onended = () => {
        if (this._bgmGain) loopBGM(this.ctx.currentTime);
      };
      this._bgmSource = scheduled;
    };

    loopBGM(t);
  }

  stopBGM() {
    if (this._bgmSource) {
      try { this._bgmSource.stop(); } catch (e) {}
      this._bgmSource = null;
    }
    this._bgmGain = null;
  }
}

const Audio = new AudioSystem();
