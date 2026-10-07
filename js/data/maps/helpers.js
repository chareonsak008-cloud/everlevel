// ตัวช่วยสร้างข้อมูลแผนที่

// ต้นไม้หนาแน่นรอบขอบแผนที่ (เว้นช่องทางเข้าออกตาม gaps)
// gaps: [{ x0, x1, y0, y1 }] พื้นที่ที่ห้ามมีต้นไม้
export function borderTrees(W, H, margin, gaps = [], seed = 12345, density = 0.85) {
  const out = []; let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const outside = x < margin || x >= W - margin || y < margin || y >= H - margin;
    if (!outside) continue;
    if (gaps.some((g) => x >= g.x0 && x <= g.x1 && y >= g.y0 && y <= g.y1)) continue;
    if ((x + y) % 2 === 0 && rnd() < density) out.push({ kind: rnd() < 0.3 ? 'pine' : 'tree', x, y, seed: x * 31 + y * 17 });
  }
  return out;
}

export function treesAt(list, seedBase = 500) {
  return list.map(([x, y], i) => ({ kind: i % 4 === 3 ? 'pine' : 'tree', x, y, seed: seedBase + i * 7 }));
}

// โปรยต้นไม้แบบสุ่ม (กำหนด seed) โดยเว้นพื้นที่ใน avoid: [[x, y, w, h], ...] หน่วยช่อง
export function scatterTrees(W, H, count, avoid = [], seed = 4242, margin = 3, pineRatio = 0.4) {
  const out = []; let s = seed; const taken = new Set();
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const blocked = (x, y) => avoid.some(([ax, ay, aw, ah]) => x >= ax - 1 && x < ax + aw + 1 && y >= ay - 1 && y < ay + ah + 1);
  for (let tries = 0; out.length < count && tries < count * 30; tries++) {
    const x = margin + Math.floor(rnd() * (W - margin * 2)), y = margin + Math.floor(rnd() * (H - margin * 2));
    const k = x + ',' + y;
    if (taken.has(k) || blocked(x, y)) continue;
    taken.add(k);
    out.push({ kind: rnd() < pineRatio ? 'pine' : 'tree', x, y, seed: x * 13 + y * 29 });
  }
  return out;
}
