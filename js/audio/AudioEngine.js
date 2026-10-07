// ระบบเสียง (v0.11): เพลงประกอบและเอฟเฟกต์เสียงสังเคราะห์ด้วย Web Audio ทั้งหมด (ไม่ใช้ไฟล์เสียง)
// เพลงแต่ละแผนที่สร้างจากข้อมูลโน้ตใน data/music.js · เสียงเอฟเฟกต์สร้างจากคลื่นเสียง + สัญญาณรบกวน
import { SONGS } from '../data/music.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.8, music: 0.5, sfx: 0.8 };
    this.muted = false;
    this.song = null; this.wanted = null;
    this.last = {};
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  // เบราว์เซอร์อนุญาตให้เล่นเสียงหลังผู้เล่นแตะ/กดปุ่มครั้งแรกเท่านั้น
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { this.ctx = null; return; }
    const c = this.ctx;
    this.master = c.createGain();
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3.5;
    this.master.connect(comp); comp.connect(c.destination);
    this.musicBus = c.createGain(); this.sfxBus = c.createGain();
    this.musicBus.connect(this.master); this.sfxBus.connect(this.master);
    // เสียงก้องเบา ๆ ให้เพลงมีมิติ (ดีเลย์ป้อนกลับ)
    this.echo = c.createDelay(1); this.echo.delayTime.value = 0.28;
    const fb = c.createGain(); fb.gain.value = 0.28;
    const wet = c.createGain(); wet.gain.value = 0.22;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    this.echo.connect(lp); lp.connect(fb); fb.connect(this.echo); lp.connect(wet); wet.connect(this.musicBus);
    // สัญญาณรบกวนสำหรับกลองและเสียงลม/ระเบิด
    const len = c.sampleRate * 1.5;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    this.timer = setInterval(() => this.schedule(), 25);
    if (this.wanted) this.music(this.wanted, true);
  }

  // แท็บถูกซ่อน → พักเสียงทั้งหมด (ตัวตั้งเวลาเบราว์เซอร์ช้าลงตอนซ่อน เพลงจะสะดุด)
  setHidden(h) {
    if (!this.ctx) return;
    if (h) this.ctx.suspend().catch(() => {});
    else this.ctx.resume().catch(() => {});
  }

  setVolumes(v) { Object.assign(this.vol, v); this.applyVolumes(); }
  setMuted(m) { this.muted = !!m; this.applyVolumes(); }
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.55, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx * 0.7, t, 0.05);
  }

  /* ---------- เครื่องดนตรีสังเคราะห์ ---------- */
  voice(type, freq, t, dur, vol, { attack = 0.01, release = 0.12, bus, filter = 0, q = 0.7, vib = 0, detune = 0, slide = 0, echo = false } = {}) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
    let node = o;
    if (filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; f.Q.value = q; o.connect(f); node = f; }
    if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + release + 0.05); }
    node.connect(g); g.connect(bus || this.sfxBus);
    if (echo) g.connect(this.echo);
    o.start(t); o.stop(t + dur + release + 0.05);
    return o;
  }

  noiseHit(t, dur, vol, { type = 'bandpass', freq = 1000, q = 1, bus, sweep = 0 } = {}) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  kick(t, vol = 0.9) { this.voice('sine', 150, t, 0.16, vol, { attack: 0.002, release: 0.08, bus: this.musicBus, slide: 0.28 }); }
  snare(t, vol = 0.45) { this.noiseHit(t, 0.16, vol, { freq: 1800, q: 0.8, bus: this.musicBus }); this.voice('triangle', 190, t, 0.06, vol * 0.6, { attack: 0.002, release: 0.05, bus: this.musicBus }); }
  hat(t, vol = 0.18) { this.noiseHit(t, 0.04, vol, { type: 'highpass', freq: 7500, bus: this.musicBus }); }

  instrument(kind, midi, t, dur, vol) {
    const f = mtof(midi), B = this.musicBus;
    switch (kind) {
      case 'bell':
        this.voice('sine', f, t, dur * 0.3, vol, { attack: 0.003, release: dur * 0.9, bus: B, echo: true });
        this.voice('sine', f * 2.76, t, 0.05, vol * 0.35, { attack: 0.002, release: dur * 0.4, bus: B, echo: true });
        break;
      case 'pluck':
        this.voice('sawtooth', f, t, dur * 0.25, vol * 0.7, { attack: 0.003, release: dur * 0.6, filter: 1600, bus: B, echo: true });
        this.voice('triangle', f, t, dur * 0.6, vol * 0.5, { attack: 0.005, release: 0.15, bus: B });
        break;
      case 'flute':
        this.voice('triangle', f, t, dur, vol, { attack: 0.06, release: 0.18, vib: 4, bus: B, echo: true });
        this.voice('sine', f * 2, t, dur, vol * 0.15, { attack: 0.08, release: 0.15, bus: B });
        break;
      case 'brass':
        this.voice('sawtooth', f, t, dur, vol * 0.6, { attack: 0.03, release: 0.12, filter: 1400, q: 2, bus: B });
        this.voice('square', f * 0.5, t, dur, vol * 0.25, { attack: 0.03, release: 0.12, filter: 900, bus: B });
        break;
      default: // square lead
        this.voice('square', f, t, dur, vol * 0.5, { attack: 0.01, release: 0.1, filter: 2600, vib: 3, bus: B, echo: true });
    }
  }

  /* ---------- เพลง ---------- */
  music(name, force = false) {
    this.wanted = name;
    if (!this.ctx) return;
    if (!force && this.song && this.song.name === name) return;
    const S = SONGS[name]; if (!S) return;
    const now = this.ctx.currentTime;
    this.song = { name, S, step: 0, next: now + 0.15, stepDur: 60 / S.bpm / 2, bars: S.melody.length, ties: S.melody.map(parseBar) };
  }

  schedule() {
    if (!this.ctx || !this.song || this.ctx.state !== 'running') return;
    const sg = this.song, S = sg.S, ahead = this.ctx.currentTime + 0.14;
    while (sg.next < ahead) {
      this.playStep(sg, S, sg.next);
      sg.next += sg.stepDur; sg.step++;
    }
  }

  playStep(sg, S, t) {
    const per = 8, total = sg.bars * per, step = sg.step % total;
    const bar = Math.floor(step / per), k = step % per;
    const deg = S.chords[bar % S.chords.length];
    const chord = [0, 2, 4].map((i) => noteOf(S, deg + i, 0));
    const d = S.drums || {};
    if (d.kick && d.kick[k] === '1') this.kick(t, d.kickVol || 0.8);
    if (d.snare && d.snare[k] === '1') this.snare(t, d.snareVol || 0.4);
    if (d.hat && d.hat[k] === '1') this.hat(t, d.hatVol || 0.15);
    if (d.hat16 && d.hat16) this.hat(t + sg.stepDur / 2, (d.hatVol || 0.15) * 0.7);
    // เบส
    if (S.bass === 'drive' || (S.bass !== 'none' && k % 2 === 0)) {
      const oct = S.bass === 'drive' && k % 2 ? 12 : 0;
      this.voice(S.bass === 'drive' ? 'sawtooth' : 'triangle', mtof(chord[0] - 24 + oct), t, sg.stepDur * (S.bass === 'drive' ? 0.9 : 1.8), S.bassVol || 0.32, { attack: 0.01, release: 0.08, filter: S.bass === 'drive' ? 700 : 0, bus: this.musicBus });
    }
    // คอร์ดค้าง (pad)
    if (S.pad && k === 0) for (const m of chord) this.voice('sawtooth', mtof(m - 12), t, sg.stepDur * per * 0.95, (S.padVol || 0.05), { attack: 0.5, release: 0.6, filter: 900, detune: (m % 3 - 1) * 8, bus: this.musicBus });
    // อาร์เปจจิโอ
    if (S.arp) { const m = chord[k % 3] + (k >= 4 ? 12 : 0); this.instrument(S.arp, m, t, sg.stepDur, S.arpVol || 0.08); }
    // ทำนองหลัก
    const tok = sg.ties[bar][k];
    if (tok && tok.start) this.instrument(S.lead, noteOf(S, tok.deg, 12), t, sg.stepDur * tok.len * 0.95, S.leadVol || 0.22);
  }

  /* ---------- เสียงเอฟเฟกต์ ---------- */
  play(name, opts = {}) {
    if (!this.ready || this.muted || this.vol.sfx <= 0) return;
    const nowMs = performance.now();
    if (this.last[name] && nowMs - this.last[name] < (opts.gap ?? 45)) return;   // กันเสียงเดียวกันซ้อนรัว
    this.last[name] = nowMs;
    const fn = SFX[name]; if (fn) { try { fn.call(this, this.ctx.currentTime + 0.005, opts); } catch (e) { /* เสียงล้มเหลวไม่กระทบเกม */ } }
  }
}

// แปลงทำนองหนึ่งห้อง ("0 - 2 . 4") → [{ start, deg, len }]
function parseBar(str) {
  const toks = str.trim().split(/\s+/), out = Array(8).fill(null);
  let cur = null;
  toks.slice(0, 8).forEach((tk, i) => {
    if (tk === '-') { if (cur) cur.len++; return; }
    if (tk === '.') { cur = null; return; }
    cur = { start: true, deg: +tk, len: 1 }; out[i] = cur;
  });
  return out;
}

function noteOf(S, deg, octUp) {
  const n = S.scale.length, o = Math.floor(deg / n), i = ((deg % n) + n) % n;
  return S.root + S.scale[i] + o * 12 + octUp;
}

// เสียงเอฟเฟกต์ทั้งหมด (this = AudioEngine, t = เวลาเริ่ม)
const SFX = {
  click(t) { this.voice('square', 1250, t, 0.025, 0.06, { attack: 0.002, release: 0.03, filter: 3000 }); },
  open(t) { this.voice('sine', 660, t, 0.05, 0.12, { release: 0.06 }); this.voice('sine', 990, t + 0.05, 0.06, 0.1, { release: 0.08 }); },
  close(t) { this.voice('sine', 880, t, 0.05, 0.1, { release: 0.06 }); this.voice('sine', 587, t + 0.05, 0.06, 0.08, { release: 0.08 }); },
  error(t) { this.voice('square', 180, t, 0.08, 0.1, { filter: 900 }); this.voice('square', 150, t + 0.1, 0.1, 0.1, { filter: 900 }); },
  hit(t) { this.noiseHit(t, 0.08, 0.5, { freq: 900, q: 1.2 }); this.voice('sine', 130, t, 0.08, 0.5, { attack: 0.002, release: 0.06, slide: 0.5 }); },
  crit(t) { SFX.hit.call(this, t); this.voice('square', 1600, t, 0.04, 0.12, { release: 0.12, filter: 4000 }); this.voice('sine', 2400, t + 0.03, 0.05, 0.1, { release: 0.15 }); },
  miss(t) { this.noiseHit(t, 0.12, 0.18, { type: 'highpass', freq: 2500, sweep: 0.4 }); },
  swing(t) { this.noiseHit(t, 0.1, 0.16, { freq: 1600, q: 0.6, sweep: 0.5 }); },
  shoot(t) { this.voice('sawtooth', 260, t, 0.08, 0.18, { attack: 0.002, release: 0.08, filter: 1800, slide: 0.5 }); this.noiseHit(t, 0.06, 0.12, { type: 'highpass', freq: 3000 }); },
  hurt(t) { this.voice('square', 220, t, 0.1, 0.16, { attack: 0.002, release: 0.08, slide: 0.55, filter: 1200 }); this.noiseHit(t, 0.08, 0.25, { freq: 500 }); },
  cast(t) { [0, 4, 7, 12].forEach((s, i) => this.voice('sine', 523 * Math.pow(2, s / 12), t + i * 0.04, 0.08, 0.08, { release: 0.15 })); },
  skill(t) { this.noiseHit(t, 0.2, 0.3, { freq: 1200, sweep: 2 }); this.voice('triangle', 440, t, 0.15, 0.15, { slide: 1.6, release: 0.1 }); },
  explosion(t) { this.noiseHit(t, 0.7, 0.8, { type: 'lowpass', freq: 1400, sweep: 0.15 }); this.voice('sine', 90, t, 0.4, 0.7, { attack: 0.004, release: 0.3, slide: 0.35 }); },
  iceBlast(t) { this.noiseHit(t, 0.4, 0.35, { type: 'highpass', freq: 4000, sweep: 0.5 }); [0, 5, 9, 14].forEach((s, i) => this.voice('sine', 1320 * Math.pow(2, s / 12), t + i * 0.035, 0.05, 0.08, { release: 0.3 })); },
  thunder(t) { this.noiseHit(t, 0.05, 0.6, { type: 'highpass', freq: 1500 }); this.noiseHit(t + 0.03, 0.6, 0.5, { type: 'lowpass', freq: 600, sweep: 0.3 }); },
  heal(t) { [0, 4, 7, 12, 16].forEach((s, i) => this.voice('sine', 659 * Math.pow(2, s / 12), t + i * 0.05, 0.1, 0.07, { release: 0.2 })); },
  levelUp(t) { [0, 4, 7, 12].forEach((s, i) => { this.voice('square', 523 * Math.pow(2, s / 12), t + i * 0.09, 0.09, 0.09, { filter: 3000, release: 0.06 }); }); this.voice('triangle', 1046, t + 0.36, 0.4, 0.14, { release: 0.4, vib: 6 }); },
  pickup(t) { this.voice('square', 880, t, 0.04, 0.07, { filter: 3000 }); this.voice('square', 1320, t + 0.05, 0.05, 0.07, { filter: 3000, release: 0.06 }); },
  coin(t) { this.voice('square', 988, t, 0.05, 0.07, { filter: 4000 }); this.voice('square', 1319, t + 0.06, 0.15, 0.07, { filter: 4000, release: 0.15 }); },
  equip(t) { this.noiseHit(t, 0.06, 0.2, { freq: 3000, q: 3 }); this.voice('triangle', 700, t, 0.05, 0.1, { release: 0.08 }); },
  monsterDie(t) { this.voice('sine', 520, t, 0.12, 0.16, { slide: 0.3, release: 0.1 }); this.noiseHit(t, 0.12, 0.12, { freq: 700 }); },
  boxShake(t) { for (let i = 0; i < 4; i++) this.noiseHit(t + i * 0.07, 0.04, 0.14, { freq: 2200, q: 2 }); },
  boxReveal(t, o) {
    const tier = o.tier || 1, notes = [0, 4, 7, 12, 16, 19, 24].slice(0, 2 + tier);
    notes.forEach((s, i) => this.voice(tier >= 5 ? 'square' : 'triangle', 523 * Math.pow(2, s / 12), t + i * 0.07, 0.09, 0.09, { filter: 3500, release: 0.2 }));
    if (tier >= 4) this.voice('sine', 2093, t + notes.length * 0.07, 0.8, 0.12, { release: 0.8, vib: 8 });
    if (tier >= 5) this.noiseHit(t + notes.length * 0.07, 1.0, 0.25, { type: 'highpass', freq: 5000, sweep: 0.5 });
  },
  anvil(t) { this.voice('square', 1180, t, 0.03, 0.12, { release: 0.25, filter: 5000 }); this.voice('sine', 1770, t, 0.03, 0.1, { release: 0.35 }); this.noiseHit(t, 0.05, 0.3, { freq: 3500, q: 4 }); },
  refineOk(t) { [0, 7, 12, 19].forEach((s, i) => this.voice('triangle', 784 * Math.pow(2, s / 12), t + i * 0.07, 0.08, 0.1, { release: 0.25 })); },
  refineFail(t) { this.voice('sawtooth', 220, t, 0.25, 0.12, { slide: 0.6, filter: 800 }); },
  refineBreak(t) { this.noiseHit(t, 0.6, 0.6, { freq: 2500, q: 0.5, sweep: 0.3 }); this.voice('square', 160, t, 0.3, 0.12, { slide: 0.4, filter: 900 }); },
  questAccept(t) { this.voice('triangle', 784, t, 0.08, 0.12); this.voice('triangle', 1046, t + 0.09, 0.15, 0.12, { release: 0.15 }); },
  questDone(t) { [0, 4, 7, 12, 7, 12].forEach((s, i) => this.voice('square', 659 * Math.pow(2, s / 12), t + i * 0.08, 0.08, 0.08, { filter: 3200 })); },
  warp(t) { this.voice('sine', 300, t, 0.6, 0.14, { slide: 4, vib: 20, release: 0.2 }); this.noiseHit(t, 0.6, 0.12, { freq: 800, sweep: 4 }); },
  mvp(t) { [0, 0, 7, 12].forEach((s, i) => this.voice('sawtooth', 392 * Math.pow(2, s / 12), t + i * 0.16, i === 3 ? 0.6 : 0.13, 0.14, { filter: 1800, release: 0.2 })); },
  bossWindup(t) { this.voice('sawtooth', 60, t, 1.0, 0.25, { slide: 2.2, filter: 400, attack: 0.3 }); },
  slam(t) { this.noiseHit(t, 0.5, 0.7, { type: 'lowpass', freq: 600, sweep: 0.3 }); this.voice('sine', 70, t, 0.4, 0.8, { attack: 0.003, release: 0.3, slide: 0.4 }); },
  chat(t) { this.voice('sine', 1050, t, 0.04, 0.06, { release: 0.05 }); },
};
