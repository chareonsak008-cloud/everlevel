// v0.17: แปลงภาพวาด Canvas (เอฟเฟกต์ ไอคอน) ให้เป็นภาพพิกเซล: ย่อความละเอียด → ตัดความโปร่งเป็นขั้น → ลดเฉดสี
import { THREE } from './three.js';

// src = canvas · w,h = ขนาดพิกเซลปลายทาง · alpha = จำนวนขั้นความโปร่ง · color = จำนวนขั้นต่อสี (0 = ไม่ลด)
export function pixelizeCanvas(src, w, h = w, { alpha = 4, color = 0, cut = 0.08 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, w, h);
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let i = 0; i < d.length; i += 4) {
    let a = d[i + 3] / 255;
    // ความโปร่งเป็นขั้น + ดิทเธอร์ 4×4 (ขอบแสงจางเป็นลายจุดแบบภาพพิกเซล ไม่เป็นวงแข็ง)
    const px = (i / 4) % w, py = Math.floor(i / 4 / w), th = (B[(py % 4) * 4 + (px % 4)] + 0.5) / 16;
    a = a < cut * 0.5 ? 0 : Math.min(1, Math.floor(a * alpha + th) / alpha);
    if (alpha <= 1) a = d[i + 3] / 255 >= 0.5 ? 1 : 0;
    if (a > 0 && d[i + 3] > 0) {
      // สีเก็บแบบ premultiplied โดยนัย → คืนค่าสีจริงก่อนตัดขั้น
      for (let k = 0; k < 3; k++) { let v = d[i + k] / 255; if (color > 1) v = Math.round(v * (color - 1)) / (color - 1); d[i + k] = Math.round(v * 255); }
    }
    d[i + 3] = Math.round(a * 255);
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ตั้งค่าเท็กซ์เจอร์ให้ขอบพิกเซลคม
export function nearestTexture(c, { repeat = false, srgb = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.encoding = THREE.sRGBEncoding;
  return t;
}

// เส้นขอบ 1 พิกเซลรอบรูป (ไอคอน) — วาดสี ink ตรงพิกเซลโปร่งที่ติดกับพิกเซลทึบ
export function outlineCanvas(c, ink = [28, 18, 34]) {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  const img = g.getImageData(0, 0, w, h), d = img.data, a0 = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a0[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (a0[i]) continue;
    const n = (x > 0 && a0[i - 1]) || (x < w - 1 && a0[i + 1]) || (y > 0 && a0[i - w]) || (y < h - 1 && a0[i + w]);
    if (n) { d[i * 4] = ink[0]; d[i * 4 + 1] = ink[1]; d[i * 4 + 2] = ink[2]; d[i * 4 + 3] = 255; }
  }
  g.putImageData(img, 0, 0);
  return c;
}
