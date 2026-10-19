// แผนที่ (ตรรกะ): พื้น, จุดชน, วัตถุ, ประตูมิติ — ไม่ยุ่งกับการวาด
import { TILE } from '../config.js?v=0.55.1';
import { T, TILE_INFO } from '../data/tileTypes.js?v=0.55.1';
import { footprint } from '../data/objects.js?v=0.55.1';
import { rng } from '../core/util.js?v=0.55.1';

export const EDGE = { WALL_FACE: 1, SHADOW: 2, BANK: 4 };

export class GameMap {
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.subtitle = def.subtitle || '';
    this.w = def.width;
    this.h = def.height;
    this.pxW = this.w * TILE;
    this.pxH = this.h * TILE;
    const n = this.w * this.h;
    this.ground = new Uint8Array(n).fill(T[def.fill] ?? T.GRASS);
    this.solid = new Uint8Array(n);
    this.edges = new Uint8Array(n);
    this.variant = new Uint8Array(n);
    const r = rng(this.w * 7919 + this.h);
    for (let i = 0; i < n; i++) this.variant[i] = (r() * 4) | 0;

    for (const reg of def.regions || []) this.applyRegion(reg);
    for (let i = 0; i < n; i++) this.solid[i] = TILE_INFO[this.ground[i]].solid ? 1 : 0;
    this.computeEdges();

    // v0.27: def.prune = ตัดของตกแต่ง (ต้นไม้/พุ่ม/หิน) ที่งอกทับทางเดิน น้ำ หรือลาน ออกอัตโนมัติ
    let objs = def.objects || [];
    if (def.prune) {
      const DECOR = new Set(['tree', 'pine', 'bush', 'stump', 'boulder', 'bigshroom', 'icecrystal', 'obsidian']);
      const OPEN = new Set([T.GRASS, T.FLOWERS, T[def.fill] ?? T.GRASS]);
      const keepOut = (def.portals || []).map((p) => [p.x - 1, p.y - 1, p.w + 2, p.h + 2]).concat((def.npcs || []).map((n) => [n.x - 1, n.y - 1, 3, 3]));
      objs = objs.filter((o) => {
        if (o.keep || !DECOR.has(o.kind)) return true;
        const { fw, fh } = footprint(o);
        for (let j = o.y; j < o.y + fh; j++) for (let i = o.x; i < o.x + fw; i++) {
          if (!this.inBounds(i, j) || !OPEN.has(this.ground[this.idx(i, j)])) return false;
          if (keepOut.some(([x, y, w, h]) => i >= x && i < x + w && j >= y && j < y + h)) return false;
        }
        return true;
      });
    }
    this.objects = objs.map((o) => this.placeObject(o));
    this.portals = (def.portals || []).map((p) => ({
      ...p, inside: false,
      rect: [p.x * TILE, p.y * TILE, (p.x + p.w) * TILE, (p.y + p.h) * TILE],
      cx: (p.x + p.w / 2) * TILE, cy: (p.y + p.h / 2) * TILE,
    }));
    this.spawn = { x: def.spawn.x * TILE, y: def.spawn.y * TILE };
  }

  idx(x, y) { return y * this.w + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  setTile(x, y, t) { if (this.inBounds(x, y)) this.ground[this.idx(x, y)] = t; }

  applyRegion(reg) {
    const t = T[reg.tile];
    if (reg.rect) {
      const [x, y, w, h] = reg.rect;
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.setTile(i, j, t);
    } else if (reg.ring) {
      const [x, y, w, h, th] = reg.ring;
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
        const edge = i < x + th || i >= x + w - th || j < y + th || j >= y + h - th;
        if (edge) this.setTile(i, j, t);
      }
    } else if (reg.circle) {
      // v0.27: วงกลม/วงรี [cx, cy, rx, ry?] (จุดกึ่งกลางช่อง = x + 0.5)
      const [cx, cy, rx, ry = rx] = reg.circle;
      for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
        const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.setTile(i, j, t);
      }
    } else if (reg.path) {
      // v0.27: เส้นทางคดเคี้ยว { path: [[x,y],...], w: ความกว้าง }
      const pts = reg.path, hw = (reg.w || 3) / 2;
      for (let k = 0; k < pts.length - 1; k++) {
        const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
        const x0 = Math.floor(Math.min(ax, bx) - hw - 1), x1 = Math.ceil(Math.max(ax, bx) + hw + 1);
        const y0 = Math.floor(Math.min(ay, by) - hw - 1), y1 = Math.ceil(Math.max(ay, by) + hw + 1);
        const L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
        for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
          const px = i + 0.5, py = j + 0.5;
          const u = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L2));
          if (Math.hypot(px - ax - u * (bx - ax), py - ay - u * (by - ay)) <= hw) this.setTile(i, j, t);
        }
      }
    }
  }

  tileAt(x, y) { return this.inBounds(x, y) ? this.ground[this.idx(x, y)] : -1; }

  computeEdges() {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = this.idx(x, y), t = this.ground[i];
      let e = 0;
      if (t === T.WALL && this.tileAt(x, y + 1) !== T.WALL) e |= EDGE.WALL_FACE;
      if (t !== T.WALL && this.tileAt(x, y - 1) === T.WALL) e |= EDGE.SHADOW;
      if (t === T.WATER && this.tileAt(x, y - 1) !== T.WATER) e |= EDGE.BANK;
      this.edges[i] = e;
    }
  }

  placeObject(o) {
    const { fw, fh, solid } = footprint(o);
    if (solid) for (let j = o.y; j < o.y + fh; j++) for (let i = o.x; i < o.x + fw; i++) this.setSolid(i, j);
    // cx, cy = จุดกึ่งกลาง footprint (หน่วยช่อง) ใช้วางโมเดล 3 มิติ
    return { kind: o.kind, def: o, fw, fh, cx: o.x + fw / 2, cy: o.y + fh / 2 };
  }

  setSolid(x, y, v = 1) { if (this.inBounds(x, y)) this.solid[this.idx(x, y)] = v; }

  isSolidTile(x, y) { return !this.inBounds(x, y) || this.solid[this.idx(x, y)] === 1; }

  // ตรวจว่ากล่องชน (พิกัดโลก) ทับช่องที่เดินไม่ได้หรือไม่
  boxBlocked(x0, y0, x1, y1) {
    const tx0 = Math.floor(x0 / TILE), ty0 = Math.floor(y0 / TILE);
    const tx1 = Math.floor((x1 - 0.001) / TILE), ty1 = Math.floor((y1 - 0.001) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (this.isSolidTile(tx, ty)) return true;
    return false;
  }
}
