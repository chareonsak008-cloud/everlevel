// แผนที่ (ตรรกะ): พื้น, จุดชน, วัตถุ, ประตูมิติ — ไม่ยุ่งกับการวาด
import { TILE } from '../config.js';
import { T, TILE_INFO } from '../data/tileTypes.js';
import { footprint } from '../data/objects.js';
import { rng } from '../core/util.js';

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

    this.objects = (def.objects || []).map((o) => this.placeObject(o));
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
