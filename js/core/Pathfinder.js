// หาเส้นทาง A* บนตารางช่อง (8 ทิศ, ไม่ตัดมุม) + ทำเส้นให้เรียบ
const SQ2 = Math.SQRT2;
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQ2], [1, -1, SQ2], [-1, 1, SQ2], [-1, -1, SQ2]];

class MinHeap {
  constructor() { this.items = []; this.prio = []; }
  get size() { return this.items.length; }
  push(item, p) {
    const a = this.items, q = this.prio; a.push(item); q.push(p);
    let i = a.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1; if (q[par] <= q[i]) break;
      [a[i], a[par]] = [a[par], a[i]]; [q[i], q[par]] = [q[par], q[i]]; i = par;
    }
  }
  pop() {
    const a = this.items, q = this.prio; const top = a[0];
    const lastI = a.pop(), lastP = q.pop();
    if (a.length) {
      a[0] = lastI; q[0] = lastP; let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1; let m = i;
        if (l < a.length && q[l] < q[m]) m = l;
        if (r < a.length && q[r] < q[m]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; [q[i], q[m]] = [q[m], q[i]]; i = m;
      }
    }
    return top;
  }
}

export function findPath(map, sx, sy, gx, gy, maxNodes = 8000) {
  if (map.isSolidTile(gx, gy)) return null;
  const W = map.w, N = W * map.h;
  const start = sy * W + sx, goal = gy * W + gx;
  if (start === goal) return [{ x: gx, y: gy }];
  const g = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const h = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return dx + dy + (SQ2 - 2) * Math.min(dx, dy); };
  const open = new MinHeap();
  g[start] = 0; open.push(start, h(sx, sy));
  let expanded = 0, found = false;
  while (open.size) {
    const cur = open.pop();
    if (cur === goal) { found = true; break; }
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (++expanded > maxNodes) return null;
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (map.isSolidTile(nx, ny)) continue;
      if (dx && dy && (map.isSolidTile(cx + dx, cy) || map.isSolidTile(cx, cy + dy))) continue;
      const ni = ny * W + nx;
      if (closed[ni]) continue;
      const ng = g[cur] + cost;
      if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; open.push(ni, ng + h(nx, ny)); }
    }
  }
  if (!found) return null;
  const out = [];
  for (let c = goal; c !== -1; c = came[c]) out.push({ x: c % W, y: (c / W) | 0 });
  return out.reverse();
}

export function lineClear(map, a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.max(1, Math.ceil(d / 2));
  for (let k = 1; k <= steps; k++) {
    const t = k / steps, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    if (map.boxBlocked(x - 4.5, y - 3.5, x + 4.5, y + 1.5)) return false;
  }
  return true;
}

// ตัดจุดที่ไม่จำเป็นออก ให้ตัวละครเดินเป็นเส้นตรงเมื่อมองเห็นกัน
export function smoothPath(map, start, pts) {
  const all = [start, ...pts], out = [];
  let i = 0;
  while (i < all.length - 1) {
    let j = all.length - 1;
    while (j > i + 1 && !lineClear(map, all[i], all[j])) j--;
    out.push(all[j]); i = j;
  }
  return out;
}

// หาช่องเดินได้ที่ใกล้ที่สุด (ใช้เมื่อคลิกโดนสิ่งกีดขวาง)
export function nearestWalkable(map, tx, ty, maxR = 4) {
  for (let r = 0; r <= maxR; r++) {
    let best = null, bestD = Infinity;
    for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) {
      if (Math.max(Math.abs(x - tx), Math.abs(y - ty)) !== r) continue;
      if (map.isSolidTile(x, y)) continue;
      const d = (x - tx) ** 2 + (y - ty) ** 2;
      if (d < bestD) { bestD = d; best = { x, y }; }
    }
    if (best) return best;
  }
  return null;
}
