// v0.17: เท็กซ์เจอร์วัสดุแบบภาพพิกเซล (หิน ปูน กระเบื้องหลังคา ไม้ ลังไม้ ผ้าใบลายทาง)
// 48×48 พิกเซลต่อ 1 หน่วยโลก = 1 พิกเซลภาพที่ระยะกล้องปกติ · กรองแบบ nearest (ขอบคม)
import { THREE } from './three.js';
import { rng } from '../core/util.js';

const N = 48;
const hex = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const sh = (c, k) => (k >= 0 ? mix(c, [255, 248, 220], k) : mix(c, [30, 22, 52], -k));
const cache = new Map();

function make(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
  const P = (x, y, col) => { x = ((Math.round(x) % w) + w) % w; y = ((Math.round(y) % h) + h) % h; const i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; };
  const rect = (x, y, rw, rh, col) => { for (let yy = 0; yy < rh; yy++) for (let xx = 0; xx < rw; xx++) P(x + xx, y + yy, col); };
  draw({ P, rect, w, h });
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  cache.set(key, t); return t;
}

// ก้อนหิน/อิฐเรียงเป็นแถว: ขอบบนซ้ายสว่าง ล่างขวาเข้ม ร่องปูนเข้ม
export function stonePx(base = '#9a949c') {
  return make('stone' + base, N, N, ({ P, rect }) => {
    const r = rng(7), b = hex(base), mortar = sh(b, -0.48);
    rect(0, 0, N, N, mortar);
    for (let row = 0; row < 4; row++) {
      const y0 = row * 12; let x = row % 2 ? -8 : 0;
      while (x < N) {
        const bw = r() < 0.5 ? 16 : 24, c = sh(b, (r() - 0.5) * 0.18);
        for (let yy = 1; yy < 12; yy++) for (let xx = 1; xx < bw; xx++) {
          let cc = c;
          if (yy === 1) cc = sh(c, 0.2); else if (xx === 1) cc = sh(c, 0.1); else if (yy === 11) cc = sh(c, -0.24); else if (xx === bw - 1) cc = sh(c, -0.16);
          P(x + xx, y0 + yy, cc);
        }
        for (let k = 0; k < 3; k++) P(x + 3 + r() * (bw - 6), y0 + 3 + r() * 7, sh(c, r() < 0.5 ? -0.14 : 0.1));
        x += bw;
      }
    }
  });
}
export function plasterPx(base) {
  return make('plaster' + base, N, N, ({ P, rect }) => {
    const r = rng(11), b = hex(base);
    rect(0, 0, N, N, b);
    for (let i = 0; i < 40; i++) P(r() * N, r() * N, sh(b, (r() - 0.5) * 0.12));
    for (let i = 0; i < 4; i++) { const x = r() * N, y = r() * N; for (let k = 0; k < 4; k++) P(x + (k % 2), y + (k >> 1), sh(b, -0.07)); }
    if (r() < 0.7) { let x = r() * N, y = r() * N; for (let k = 0; k < 7; k++) { P(x, y, sh(b, -0.2)); x += r() < 0.5 ? 1 : 0; y += 1; } }
  });
}
// กระเบื้องหลังคาแถวละ 8 พิกเซล ขอบล่างโค้งมนเข้ม
export function shinglePx(base) {
  return make('shingle' + base, N, N, ({ P, rect }) => {
    const r = rng(5), b = hex(base), gap = sh(b, -0.5);
    rect(0, 0, N, N, gap);
    for (let row = 0; row < 6; row++) {
      const y0 = row * 8, off = row % 2 ? 4 : 0;
      for (let x0 = -8 + off; x0 < N; x0 += 8) {
        const c = sh(b, (r() - 0.5) * 0.16);
        for (let yy = 0; yy < 8; yy++) for (let xx = 1; xx < 8; xx++) {
          if (yy === 7 && (xx === 1 || xx === 7)) continue;          // มุมล่างมน
          let cc = c;
          if (yy === 0) cc = sh(c, 0.18); else if (yy >= 6) cc = sh(c, -0.25); else if (xx === 1) cc = sh(c, 0.08);
          P(x0 + xx, y0 + yy, cc);
        }
      }
    }
  });
}
// แผ่นไม้กว้าง 8 พิกเซล มีลายเสี้ยนขาดเป็นช่วง ๆ และตาไม้
export function woodPx(base = '#9b6b3e', vertical = true) {
  return make('wood' + base + vertical, N, N, ({ P }) => {
    const r = rng(3), b = hex(base), gapC = sh(b, -0.5);
    const at = (u, v, c) => (vertical ? P(u, v, c) : P(v, u, c));
    for (let k = 0; k < 6; k++) {
      const c = sh(b, (r() - 0.5) * 0.14), u0 = k * 8;
      for (let v = 0; v < N; v++) for (let u = 0; u < 8; u++) at(u0 + u, v, u === 0 ? gapC : u === 1 ? sh(c, 0.1) : u === 7 ? sh(c, -0.12) : c);
      for (let g = 0; g < 3; g++) { const u = u0 + 2 + ((r() * 5) | 0); let v = r() * N; const len = 6 + r() * 14; for (let i = 0; i < len; i++) at(u, v + i, sh(c, -0.16)); }
      if (r() < 0.45) { const u = u0 + 3 + r() * 2, v = r() * N; at(u, v, sh(c, -0.35)); at(u + 1, v, sh(c, -0.25)); at(u, v + 1, sh(c, -0.25)); at(u - 1, v, sh(c, -0.1)); }
    }
  });
}
export function cratePx() {
  return make('crate', N, N, ({ P, rect }) => {
    const b = hex('#b0824e'), frame = hex('#7a5230'), r = rng(9);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = Math.floor(y / 8); P(x, y, y % 8 === 0 ? sh(b, -0.4) : sh(b, ((k * 37) % 5 - 2) * 0.03)); }
    for (let i = 0; i < 20; i++) P(r() * N, r() * N, sh(b, -0.15));
    rect(0, 0, N, 4, frame); rect(0, N - 4, N, 4, frame); rect(0, 0, 4, N, frame); rect(N - 4, 0, 4, N, frame);
    for (let i = 4; i < N - 4; i++) for (let t = -2; t <= 2; t++) P(i + t, N - 1 - i, t === -2 ? sh(frame, 0.2) : t === 2 ? sh(frame, -0.25) : frame);
    for (const [x, y] of [[1, 1], [N - 3, 1], [1, N - 3], [N - 3, N - 3]]) rect(x, y, 2, 2, hex('#d8d0c0'));
    for (let i = 0; i < N; i++) { P(i, 0, sh(frame, 0.2)); P(0, i, sh(frame, 0.12)); }
  });
}
export function stripePx(color) {
  return make("stripe" + color, N, N, ({ P }) => {
    const c = hex(color), cream = hex('#f6f0e2');
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = Math.floor(x / 12) % 2, base = k ? cream : c;
      P(x, y, x % 12 === 0 ? sh(base, -0.18) : y === 0 ? sh(base, 0.15) : y >= N - 2 ? sh(base, -0.15) : base);
    }
  });
}
// แผ่นไม้แผ่นเดียว (ไม่มีร่องระหว่างแผ่น) — พื้นสะพาน ชั้นวางของ
export function boardPx(base = '#b98a58') {
  return make('board' + base, N, N, ({ P }) => {
    const r = rng(17), b = hex(base);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) P(x, y, sh(b, ((x * 7) % 11 === 0 ? -0.08 : 0)));
    for (let g = 0; g < 14; g++) { const x = r() * N; let y = r() * N; const len = 8 + r() * 20; for (let i = 0; i < len; i++) P(x, y + i, sh(b, -0.18)); }
    for (let k = 0; k < 3; k++) { const x = r() * N, y = r() * N; P(x, y, sh(b, -0.4)); P(x + 1, y, sh(b, -0.3)); P(x, y + 1, sh(b, -0.3)); }
  });
}
