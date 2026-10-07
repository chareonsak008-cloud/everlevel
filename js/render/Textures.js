// เท็กซ์เจอร์ทั้งหมดวาดด้วย Canvas (ไม่มีไฟล์รูปภายนอก) — ลายเนียน ไล่เฉด
import { THREE } from './three.js';
import { rng } from '../core/util.js';
import { T } from '../data/tileTypes.js';

const PPT = 32; // พิกเซลต่อ 1 ช่อง บนพื้นผิวแผนที่

function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (srgb) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8;
  return t;
}

function blobs(g, r, x, y, w, h, n, colors, rMin, rMax, alpha) {
  for (let i = 0; i < n; i++) {
    const cx = x + r() * w, cy = y + r() * h, rad = rMin + r() * (rMax - rMin);
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
    const col = colors[(r() * colors.length) | 0];
    grd.addColorStop(0, col); grd.addColorStop(1, col + '00');
    g.globalAlpha = alpha; g.fillStyle = grd;
    g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  g.globalAlpha = 1;
}

// ใบหญ้าสั้น ๆ วาดแบบรวมเส้นตามสีเพื่อความเร็ว
function blades(g, r, pts, colors, len = 6) {
  const buckets = colors.map(() => []);
  for (const [x, y] of pts) buckets[(r() * colors.length) | 0].push([x, y, len * (0.5 + r() * 0.7), (r() - 0.5) * 3]);
  g.lineWidth = 1.2; g.lineCap = 'round';
  buckets.forEach((b, i) => {
    g.strokeStyle = colors[i]; g.beginPath();
    for (const [x, y, l, lean] of b) { g.moveTo(x, y); g.lineTo(x + lean, y - l); }
    g.stroke();
  });
}

/* ---------- พื้นแผนที่ ---------- */

export function groundTexture(map) {
  const W = map.w * PPT, H = map.h * PPT;
  const [c, g] = canvas(W, H);
  const r = rng(1234);
  const tile = (x, y) => map.tileAt(x, y);

  // หญ้าพื้นฐาน (ธีมแผนที่เปลี่ยนโทนสีได้ เช่น ป่าทึบสีเข้ม)
  const G = (map.def.theme || {}).grass || {};
  g.fillStyle = G.base || '#62a245'; g.fillRect(0, 0, W, H);
  blobs(g, r, 0, 0, W, H, 1400, G.blobs || ['#7dbb57', '#5f9d42', '#8cc566', '#56913b', '#76b04f'], 16, 90, 0.22);
  const pts = []; for (let i = 0; i < (W * H) / 40; i++) pts.push([r() * W, r() * H]);
  blades(g, r, pts, G.blades || ['#5a963d', '#629f45', '#73b04f', '#6aa94b']);
  // ใบไม้ร่วงบนพื้นป่า
  if (G.litter) {
    for (let i = 0; i < (W * H) / 900; i++) {
      const x = r() * W, y = r() * H, a = r() * Math.PI;
      g.fillStyle = G.litter[(r() * G.litter.length) | 0]; g.globalAlpha = 0.55 + r() * 0.35;
      g.beginPath(); g.ellipse(x, y, 2 + r() * 2.5, 1 + r() * 1.2, a, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }

  const fillTiles = (type, color) => {
    g.fillStyle = color;
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (tile(x, y) === type) g.fillRect(x * PPT, y * PPT, PPT, PPT);
  };
  // ขอบโค้งเป็นธรรมชาติ: วางวงกลมตามแนวขอบที่ติดหญ้า
  const softEdges = (type, color, rad = 7) => {
    g.fillStyle = color;
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      if (tile(x, y) !== type) continue;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of dirs) {
        const n = tile(x + dx, y + dy);
        if (n === type || n === T.PLAZA || n === T.PATH && type === T.DIRT) continue;
        for (let k = 0; k < 4; k++) {
          const t = (k + 0.5) / 4 + (r() - 0.5) * 0.15;
          const ex = dx === 0 ? x + t : x + (dx > 0 ? 1 : 0);
          const ey = dy === 0 ? y + t : y + (dy > 0 ? 1 : 0);
          g.beginPath(); g.arc(ex * PPT, ey * PPT, rad * (0.6 + r() * 0.6), 0, Math.PI * 2); g.fill();
        }
      }
    }
  };

  // ดิน (v0.11: ธีมแผนที่เปลี่ยนสีได้ เช่น ทางหิมะอัดแน่น / หินบะซอลต์)
  const D = (map.def.theme || {}).dirt || {};
  fillTiles(T.DIRT, D.base || '#a98058'); softEdges(T.DIRT, D.base || '#a98058', 8);
  forTiles(map, T.DIRT, (x, y) => {
    blobs(g, r, x * PPT, y * PPT, PPT, PPT, 4, D.blobs || ['#93693f', '#b99067', '#9c7449'], 4, 12, 0.5);
    for (let i = 0; i < 4; i++) pebble(g, r, x * PPT + r() * PPT, y * PPT + r() * PPT, 1 + r() * 2, D.pebble || '#8a7a68');
  });
  // รอยแยกลาวาเรืองแสงบนพื้น (ธีมภูเขาไฟ)
  if (D.cracks) {
    g.strokeStyle = D.cracks; g.lineCap = 'round';
    for (let i = 0; i < (W * H) / 5200; i++) {
      let x = r() * W, y = r() * H; g.lineWidth = 1 + r() * 1.6; g.globalAlpha = 0.5 + r() * 0.4;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 26; y += (r() - 0.5) * 26; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  // ถนนหินกรวด (เมืองใช้หินสีเทาฟ้าแบบเมืองหลวง)
  const gray = (map.def.theme || {}).cobble === 'gray';
  const pathBase = gray ? '#7d808c' : '#a88f69';
  fillTiles(T.PATH, pathBase); softEdges(T.PATH, pathBase, 6);
  forTiles(map, T.PATH, (x, y) => {
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const cx = x * PPT + (i + 0.5 + (j % 2 ? 0.3 : 0)) * (PPT / 3) + (r() - 0.5) * 2;
      const cy = y * PPT + (j + 0.5) * (PPT / 3) + (r() - 0.5) * 2;
      cobble(g, r, cx, cy, 4.2 + r() * 1.2, 3.6 + r() * 1, gray);
    }
  });

  // ลานหินกลางเมือง
  forTiles(map, T.PLAZA, (x, y) => {
    g.fillStyle = gray ? '#6e717c' : '#7f776a'; g.fillRect(x * PPT, y * PPT, PPT, PPT);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const sx = x * PPT + i * 16 + 1, sy = y * PPT + j * 16 + 1, s = 14;
      const base = gray ? ['#b9bcc6', '#aeb1bc', '#c2c5ce', '#a7aab6'][(r() * 4) | 0] : ['#c2b8a4', '#b9ae99', '#c8bfac', '#b2a792'][(r() * 4) | 0];
      const grd = g.createLinearGradient(sx, sy, sx + s, sy + s);
      grd.addColorStop(0, shadeHex(base, 0.08)); grd.addColorStop(1, shadeHex(base, -0.08));
      g.fillStyle = grd; roundRect(g, sx, sy, s, s, 2); g.fill();
      if (r() < 0.25) { g.strokeStyle = 'rgba(90,80,70,0.25)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(sx + r() * s, sy + 2); g.lineTo(sx + r() * s, sy + s - 2); g.stroke(); }
    }
  });
  // ลวดลายวงกลมรอบน้ำพุ
  const fountain = map.objects.find((o) => o.kind === 'fountain');
  if (fountain) {
    const fx = fountain.cx * PPT, fy = fountain.cy * PPT;
    g.save();
    g.strokeStyle = 'rgba(120,108,92,0.85)'; g.lineWidth = 7;
    g.beginPath(); g.arc(fx, fy, 3.3 * PPT, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(176,148,104,0.9)'; g.lineWidth = 3; g.setLineDash([10, 6]);
    g.beginPath(); g.arc(fx, fy, 3.75 * PPT, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, rx = fx + Math.cos(a) * 4.3 * PPT, ry = fy + Math.sin(a) * 4.3 * PPT;
      g.fillStyle = 'rgba(160,128,88,0.8)'; g.beginPath(); g.moveTo(rx, ry - 6); g.lineTo(rx + 5, ry); g.lineTo(rx, ry + 6); g.lineTo(rx - 5, ry); g.closePath(); g.fill();
    }
    g.restore();
  }

  // ก้นบ่อน้ำ + หินริมบ่อ
  const wet = (t) => t === T.WATER || t === T.BRIDGE;
  const bed = (x, y) => {
    const grd = g.createLinearGradient(x * PPT, y * PPT, x * PPT, (y + 1) * PPT);
    grd.addColorStop(0, '#2b5a63'); grd.addColorStop(1, '#244c57');
    g.fillStyle = grd; g.fillRect(x * PPT, y * PPT, PPT, PPT);
    blobs(g, r, x * PPT, y * PPT, PPT, PPT, 3, ['#3a6e6a', '#1f4450'], 5, 14, 0.5);
  };
  forTiles(map, T.WATER, bed); forTiles(map, T.BRIDGE, bed);
  forTiles(map, T.WATER, (x, y) => {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (wet(tile(x + dx, y + dy))) continue;
      for (let k = 0; k < 3; k++) {
        const t = (k + 0.5) / 3;
        const ex = dx === 0 ? x + t : x + (dx > 0 ? 1 : 0), ey = dy === 0 ? y + t : y + (dy > 0 ? 1 : 0);
        pebble(g, r, ex * PPT + (r() - 0.5) * 4, ey * PPT + (r() - 0.5) * 4, 4 + r() * 3, '#9a948a');
      }
    }
  });

  // ดอกไม้
  forTiles(map, T.FLOWERS, (x, y) => {
    const cols = ['#ffe36b', '#ff8fb8', '#ffffff', '#a9c8ff', '#ffb36b'];
    for (let i = 0; i < 7; i++) {
      const fx = x * PPT + r() * PPT, fy = y * PPT + r() * PPT, col = cols[(r() * cols.length) | 0];
      g.fillStyle = col;
      for (let p = 0; p < 5; p++) { const a = p * 1.256; g.beginPath(); g.arc(fx + Math.cos(a) * 1.6, fy + Math.sin(a) * 1.6, 1.3, 0, 7); g.fill(); }
      g.fillStyle = '#e8a030'; g.beginPath(); g.arc(fx, fy, 0.9, 0, 7); g.fill();
    }
  });

  // ใต้กำแพง
  fillTiles(T.WALL, '#5a5560');

  // หญ้าทับขอบถนนให้กลืนกัน
  const edgePts = [];
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const t = tile(x, y); if (t === T.GRASS || t === T.FLOWERS || t === T.WALL || t === T.WATER || t === T.BRIDGE) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = tile(x + dx, y + dy); if (n !== T.GRASS && n !== T.FLOWERS) continue;
      for (let k = 0; k < 14; k++) {
        const t2 = r(), inset = r() * 5;
        const ex = dx === 0 ? x * PPT + t2 * PPT : (dx > 0 ? (x + 1) * PPT - inset : x * PPT + inset);
        const ey = dy === 0 ? y * PPT + t2 * PPT : (dy > 0 ? (y + 1) * PPT - inset + 4 : y * PPT + inset);
        edgePts.push([ex, ey]);
      }
    }
  }
  blades(g, r, edgePts, G.edge || G.blades || ['#4f8a36', '#5c9a40', '#76b04f'], 6);   // v0.11: ธีมหิมะ/ลาวาใช้สีขอบตามพื้น

  // เงานุ่มใต้วัตถุ (ambient occlusion) ให้ดูมีมิติ
  g.save();
  const ROUND = { tree: 0.55, pine: 0.5, fountain: 1.7, tower: 1.1, lamp: 0.22, sign: 0.2, barrel: 0.35, crate: 0.4, well: 0.75, bush: 0.5, stump: 0.4, campfire: 0.45, pillar: 0.5, boulder: 0.6 };
  const NO_AO = { fence: 1 };
  for (const o of map.objects) {
    if (NO_AO[o.kind]) continue;
    const pad = o.kind === 'house' ? 0.35 : 0.1;
    g.shadowColor = 'rgba(20,30,10,0.55)'; g.shadowBlur = o.kind === 'house' ? 26 : 14;
    g.fillStyle = 'rgba(20,30,10,0.28)';
    if (ROUND[o.kind]) {
      const rad = ROUND[o.kind] * PPT * (o.kind === 'boulder' ? o.fw : 1);
      g.beginPath(); g.arc(o.cx * PPT, o.cy * PPT, rad, 0, 7); g.fill();
    } else {
      g.fillRect((o.def.x - pad) * PPT, (o.def.y - pad) * PPT, (o.fw + pad * 2) * PPT, (o.fh + pad * 2) * PPT);
    }
  }
  // กำแพงเงา
  g.shadowBlur = 18; g.fillStyle = 'rgba(20,30,10,0.35)';
  forTiles(map, T.WALL, (x, y) => g.fillRect(x * PPT, y * PPT, PPT, PPT));
  g.restore();

  const tex = toTexture(c, { repeat: false });
  return tex;
}

function forTiles(map, type, fn) {
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (map.tileAt(x, y) === type) fn(x, y);
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function cobble(g, r, cx, cy, rx, ry, gray) {
  const base = gray ? ['#b3b6c0', '#a6a9b5', '#bec1ca', '#9b9eab', '#aeb2bd'][(r() * 5) | 0] : ['#c9b391', '#bea883', '#d2bd9a', '#b59d78', '#c4ae8a'][(r() * 5) | 0];
  g.fillStyle = 'rgba(70,55,35,0.35)';
  g.beginPath(); g.ellipse(cx + 0.8, cy + 1.2, rx, ry, 0, 0, 7); g.fill();
  const grd = g.createRadialGradient(cx - rx * 0.4, cy - ry * 0.5, 0.5, cx, cy, rx * 1.2);
  grd.addColorStop(0, shadeHex(base, 0.25)); grd.addColorStop(1, shadeHex(base, -0.1));
  g.fillStyle = grd; g.beginPath(); g.ellipse(cx, cy, rx, ry, (r() - 0.5) * 0.6, 0, 7); g.fill();
}

function pebble(g, r, x, y, rad, col) {
  g.fillStyle = 'rgba(40,40,30,0.35)'; g.beginPath(); g.ellipse(x + 0.6, y + 0.8, rad, rad * 0.75, 0, 0, 7); g.fill();
  const grd = g.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 0, x, y, rad);
  grd.addColorStop(0, shadeHex(col, 0.25)); grd.addColorStop(1, shadeHex(col, -0.15));
  g.fillStyle = grd; g.beginPath(); g.ellipse(x, y, rad, rad * 0.75, r() * 3, 0, 7); g.fill();
}

export function shadeHex(hex, amt) {
  const h = hex.replace('#', '');
  const f = (i) => {
    const v = parseInt(h.slice(i, i + 2), 16);
    const o = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt);
    return Math.max(0, Math.min(255, Math.round(o))).toString(16).padStart(2, '0');
  };
  return '#' + f(0) + f(2) + f(4);
}

/* ---------- เท็กซ์เจอร์วัสดุ (วนซ้ำได้) — 1 รอบ = 1 หน่วยโลก ---------- */

const cache = new Map();
function cached(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }

export function stoneTexture(base = '#9a949c') {
  return cached('stone' + base, () => {
    const [c, g] = canvas(256, 256); const r = rng(7);
    g.fillStyle = shadeHex(base, -0.35); g.fillRect(0, 0, 256, 256);
    const rowH = 64;
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? -48 : 0;
      for (let x = off; x < 256; x += 96) {
        const bw = 92, bh = rowH - 5, by = row * rowH + 2;
        const col = shadeHex(base, (r() - 0.5) * 0.18);
        const grd = g.createLinearGradient(0, by, 0, by + bh);
        grd.addColorStop(0, shadeHex(col, 0.14)); grd.addColorStop(1, shadeHex(col, -0.12));
        g.fillStyle = grd;
        for (const dx of [0, 256, -256]) { roundRect(g, x + 2 + dx, by, bw, bh, 8); g.fill(); }
      }
    }
    blobs(g, r, 0, 0, 256, 256, 120, [shadeHex(base, -0.2), shadeHex(base, 0.15)], 3, 14, 0.25);
    return toTexture(c);
  });
}

export function plasterTexture(base) {
  return cached('plaster' + base, () => {
    const [c, g] = canvas(128, 128); const r = rng(11);
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    blobs(g, r, 0, 0, 128, 128, 90, [shadeHex(base, -0.08), shadeHex(base, 0.06)], 4, 18, 0.4);
    return toTexture(c);
  });
}

export function shingleTexture(base) {
  return cached('shingle' + base, () => {
    const [c, g] = canvas(128, 128); const r = rng(5);
    g.fillStyle = shadeHex(base, -0.45); g.fillRect(0, 0, 128, 128);
    const rowH = 32, sw = 32;
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? sw / 2 : 0, y = row * rowH;
      for (let x = -sw + off; x < 128 + sw; x += sw) {
        const col = shadeHex(base, (r() - 0.5) * 0.16);
        const grd = g.createLinearGradient(0, y, 0, y + rowH + 6);
        grd.addColorStop(0, shadeHex(col, 0.18)); grd.addColorStop(1, shadeHex(col, -0.22));
        g.fillStyle = grd;
        g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + sw - 1, y); g.lineTo(x + sw - 1, y + rowH - 6);
        g.quadraticCurveTo(x + sw / 2, y + rowH + 6, x + 1, y + rowH - 6); g.closePath(); g.fill();
      }
    }
    return toTexture(c);
  });
}

export function woodTexture(base = '#9b6b3e', vertical = true) {
  return cached('wood' + base + vertical, () => {
    const [c, g] = canvas(128, 128); const r = rng(3);
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const p = (i * 128) / n;
      g.fillStyle = shadeHex(base, (r() - 0.5) * 0.15);
      if (vertical) g.fillRect(p + 1, 0, 128 / n - 2, 128); else g.fillRect(0, p + 1, 128, 128 / n - 2);
      g.strokeStyle = shadeHex(base, -0.18); g.lineWidth = 1;
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        const q = p + 4 + r() * (128 / n - 8);
        if (vertical) { g.moveTo(q, 0); g.bezierCurveTo(q + 3, 40, q - 3, 80, q, 128); } else { g.moveTo(0, q); g.bezierCurveTo(40, q + 3, 80, q - 3, 128, q); }
        g.stroke();
      }
    }
    g.fillStyle = shadeHex(base, -0.4);
    for (let i = 0; i <= n; i++) { const p = (i * 128) / n; if (vertical) g.fillRect(p - 1, 0, 2, 128); else g.fillRect(0, p - 1, 128, 2); }
    return toTexture(c);
  });
}

export function crateTexture() {
  return cached('crate', () => {
    const [c, g] = canvas(128, 128);
    g.drawImage(woodTexture('#b0824e', false).image, 0, 0);
    g.strokeStyle = '#6e4a28'; g.lineWidth = 14; g.strokeRect(7, 7, 114, 114);
    g.lineWidth = 12; g.beginPath(); g.moveTo(10, 118); g.lineTo(118, 10); g.stroke();
    g.strokeStyle = '#8a6036'; g.lineWidth = 8; g.strokeRect(7, 7, 114, 114);
    return toTexture(c);
  });
}

export function stripeTexture(color) {
  return cached('stripe' + color, () => {
    const [c, g] = canvas(128, 64);
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#f6f0e2' : color; g.fillRect(i * 32, 0, 32, 64); }
    const grd = g.createLinearGradient(0, 0, 0, 64);
    grd.addColorStop(0, 'rgba(255,255,255,0.15)'); grd.addColorStop(1, 'rgba(0,0,0,0.12)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 64);
    return toTexture(c);
  });
}

export function signTexture(text) {
  return cached('sign' + text, () => {
    const [c, g] = canvas(256, 96);
    g.drawImage(woodTexture('#b98450', false).image, 0, 0, 256, 96);
    g.strokeStyle = '#6e4a28'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 90);
    g.fillStyle = '#3a2614'; g.font = '600 30px Kanit, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 50);
    return toTexture(c, { repeat: false });
  });
}

export function waterTexture(seed = 1) {
  return cached('water' + seed, () => {
    const [c, g] = canvas(256, 256); const r = rng(seed);
    g.fillStyle = '#ffffff00'; g.clearRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const x = r() * 256, y = r() * 256, len = 14 + r() * 30;
      g.lineWidth = 1 + r() * 2;
      for (const ox of [0, -256, 256]) for (const oy of [0, -256, 256]) {
        g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + len / 2, y + oy - 4, x + ox + len, y + oy); g.stroke();
      }
    }
    return toTexture(c, { srgb: false });
  });
}

export function skyTexture() {
  const [c, g] = canvas(4, 256);
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#7fb2e8'); grd.addColorStop(0.55, '#bcd9ef'); grd.addColorStop(1, '#f2dfc2');
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}

export function glowTexture() {
  return cached('glow', () => {
    const [c, g] = canvas(64, 64);
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return toTexture(c, { repeat: false, srgb: false });
  });
}

export function blobShadowTexture() {
  return cached('blob', () => {
    const [c, g] = canvas(64, 64);
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(0.6, 'rgba(0,0,0,0.25)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return toTexture(c, { repeat: false, srgb: false });
  });
}

// ลำแสงประตูมิติ: จางจากล่างขึ้นบน มีริ้วแสง
export function beamTexture() {
  return cached('beam', () => {
    const [c, g] = canvas(128, 128); const r = rng(9);
    for (let i = 0; i < 26; i++) {
      const x = r() * 128, w = 2 + r() * 6;
      const grd = g.createLinearGradient(0, 128, 0, 0);
      grd.addColorStop(0, 'rgba(255,255,255,0.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.globalAlpha = 0.3 + r() * 0.5; g.fillRect(x, 0, w, 128);
    }
    g.globalAlpha = 1;
    const fade = g.createLinearGradient(0, 128, 0, 0);
    fade.addColorStop(0, 'rgba(255,255,255,0.35)'); fade.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = fade; g.fillRect(0, 0, 128, 128);
    const t = toTexture(c, { srgb: false }); t.wrapT = THREE.ClampToEdgeWrapping; return t;
  });
}

// วงเวทย์: วงแหวนซ้อน + อักขระรูน + ดาวหกแฉก (สีขาว ย้อมสีด้วยวัสดุ)
export function magicCircleTexture() {
  return cached('magic', () => {
    const N = 512, C = N / 2;
    const [c, g] = canvas(N, N); const r = rng(21);
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
    const ring = (rad, w) => { g.lineWidth = w; g.beginPath(); g.arc(C, C, rad, 0, Math.PI * 2); g.stroke(); };
    ring(246, 6); ring(232, 2.5); ring(176, 3); ring(162, 2); ring(88, 3);
    // อักขระรูนรอบวง
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      g.save(); g.translate(C + Math.cos(a) * 204, C + Math.sin(a) * 204); g.rotate(a + Math.PI / 2);
      g.lineWidth = 3; g.beginPath();
      const k = (r() * 4) | 0;
      if (k === 0) { g.moveTo(-8, -10); g.lineTo(0, 10); g.lineTo(8, -10); }
      else if (k === 1) { g.moveTo(-8, -10); g.lineTo(8, -10); g.moveTo(0, -10); g.lineTo(0, 10); g.moveTo(-6, 4); g.lineTo(6, 4); }
      else if (k === 2) { g.arc(0, 0, 8, 0.4, Math.PI * 2 - 0.4); g.moveTo(0, -12); g.lineTo(0, 12); }
      else { g.moveTo(-8, 10); g.lineTo(-8, -10); g.lineTo(8, 0); g.lineTo(-8, 10); }
      g.stroke(); g.restore();
    }
    // ดาวหกแฉก
    g.lineWidth = 4;
    for (const off of [0, Math.PI / 3]) {
      g.beginPath();
      for (let i = 0; i <= 3; i++) { const a = off + (i / 3) * Math.PI * 2 - Math.PI / 2; const x = C + Math.cos(a) * 160, y = C + Math.sin(a) * 160; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.arc(C + Math.cos(a) * 168, C + Math.sin(a) * 168, 9, 0, Math.PI * 2); g.fill(); }
    // เรืองแสงจาง ๆ ตรงกลาง
    const gr = g.createRadialGradient(C, C, 0, C, C, 240);
    gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, N, N);
    return toTexture(c, { repeat: false, srgb: false });
  });
}

export { PPT };
