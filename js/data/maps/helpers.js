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

// v0.41.1: ขยายทั้งแผนที่ (เมือง) ด้วยตัวคูณ S — พิกัด/ขนาดพื้นที่/ถนนคูณ S · สิ่งปลูกสร้างใหญ่ขึ้นทั้งโมเดล (vs) และพื้นที่ชน (fs)
// เพื่อให้บ้าน ร้านค้า หอคอย สมดุลกับตัวละครพิกเซลที่สูงขึ้น · ความหนากำแพง (ring) คงเดิม
export const FIELD_SCALE = 1.5;   // v0.41.2: ตัวคูณขนาดแผนที่ทุ่ง/ป่า/ดันเจี้ยนเปิด
// v0.41.2: ใช้กับทุกแผนที่ · spawns/restSpots ขยายตาม · mobMul = ตัวคูณจำนวนมอน (ไม่รวมบอส count 1)
// พิกัด arrive ของประตู/วาร์ปเขียนเป็นพิกัดเดิม (ก่อนขยาย) แล้ว Game.loadMap คูณ scaled ของแผนที่ปลายทางให้เอง
export function scaleMap(def, S, { treeScale = 1.2, keepThick = true, mobMul = 1 } = {}) {
  const R = (v) => Math.round(v * S);
  const span = (x, w) => { const a = R(x); return [a, Math.max(1, R(x + w) - a)]; };
  const reg = (g) => {
    const o = { ...g };
    if (g.rect) { const [x, w] = span(g.rect[0], g.rect[2]); const [y, h] = span(g.rect[1], g.rect[3]); o.rect = [x, y, w, h]; }
    if (g.circle) o.circle = g.circle.map((v) => v * S);
    if (g.ring) { const [x, w] = span(g.ring[0], g.ring[2]); const [y, h] = span(g.ring[1], g.ring[3]); o.ring = [x, y, w, h, keepThick ? g.ring[4] : R(g.ring[4])]; }
    if (g.path) { o.path = g.path.map(([x, y]) => [x * S, y * S]); o.w = Math.max(1, Math.round((g.w || 1) * S)); }
    return o;
  };
  const TREE = new Set(['tree', 'pine']);
  const obj = (o) => TREE.has(o.kind)
    ? { ...o, x: R(o.x), y: R(o.y), vs: treeScale }
    : { ...o, x: R(o.x), y: R(o.y), vs: S, fs: S };
  const pt = (p) => (p ? { ...p, x: p.x * S, y: p.y * S } : p);
  return {
    ...def,
    width: R(def.width), height: R(def.height),
    spawn: pt(def.spawn),
    districts: (def.districts || []).map(pt),
    regions: (def.regions || []).map(reg),
    objects: (def.objects || []).map(obj),
    npcs: (def.npcs || []).map((n) => ({ ...n, x: R(n.x), y: R(n.y) })),   // NPC ยืนบนช่องเต็ม (ช่องตันใต้ตัว)
    portals: (def.portals || []).map((p) => ({ ...p, x: R(p.x), y: R(p.y), w: R(p.w), h: R(p.h) })),
    spawns: def.spawns && def.spawns.map((sp) => ({ ...sp, count: sp.count > 1 ? Math.round(sp.count * mobMul) : sp.count, areas: sp.areas.map(([x, y, w, h]) => { const [ax, aw] = span(x, w), [ay, ah] = span(y, h); return [ax, ay, aw, ah]; }) })),
    restSpots: def.restSpots && def.restSpots.map((r) => ({ ...r, x: r.x * S, y: r.y * S, r: r.r * S })),
    scaled: S,
  };
}
