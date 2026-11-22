// Shadow Vault — synthesised WebAudio sounds only. No audio files.
// Everything is built from oscillators + noise buffers at runtime.
// Safe to construct before any user gesture: the context is created
// lazily and resumed on first input; all methods no-op when muted
// or when the browser blocks audio (e.g. headless screenshots).
export function createAudio() {
  const a = {
    ctx: null,
    master: null,
    muted: false,
    _noiseBuf: null,
  };

  function ensure() {
    if (a.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      a.ctx = new AC();
      a.master = a.ctx.createGain();
      a.master.gain.value = 0.5;
      a.master.connect(a.ctx.destination);
      // shared noise buffer for footsteps
      const len = a.ctx.sampleRate * 0.1;
      a._noiseBuf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
      const data = a._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    } catch (e) {
      return false;
    }
    return true;
  }

  function resume() {
    if (a.ctx && a.ctx.state === 'suspended') a.ctx.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (a.muted || !ensure()) return;
    resume();
    const t = a.ctx.currentTime;
    const osc = a.ctx.createOscillator();
    const gain = a.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(a.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  function noise(dur, vol, filterFreq) {
    if (a.muted || !ensure()) return;
    resume();
    const t = a.ctx.currentTime;
    const src = a.ctx.createBufferSource();
    src.buffer = a._noiseBuf;
    const filt = a.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq;
    const gain = a.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(a.master);
    src.start(t);
    src.stop(t + dur);
  }

  a.unlock = () => { ensure(); resume(); };
  a.toggleMute = () => { a.muted = !a.muted; return a.muted; };

  // soft tick, quieter while sneaking
  a.footstep = (sneaking) => noise(0.07, sneaking ? 0.05 : 0.12, 500);
  // guard steps: louder the closer the guard (dist in px, < 320)
  a.guardStep = (dist) => {
    const vol = 0.02 + (1 - dist / 320) * 0.22;
    noise(0.09, vol, 350);
  };
  a.pickup = () => {
    tone(660, 0.12, 'sine', 0.25);
    setTimeout(() => tone(990, 0.18, 'sine', 0.25), 90);
  };
  a.alarm = () => {
    tone(220, 0.5, 'sawtooth', 0.22, 440);
    setTimeout(() => tone(440, 0.4, 'sawtooth', 0.18, 220), 160);
  };
  a.coin = () => tone(1900, 0.08, 'triangle', 0.18, 1200);
  a.win = () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.25), i * 130));
  };
  a.lose = () => tone(160, 0.7, 'sawtooth', 0.2, 70);
  return a;
}
