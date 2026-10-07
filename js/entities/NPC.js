// NPC: ยืนประจำที่ คลิกเพื่อคุย หรือเปิดบริการ (ร้านค้า คลัง วาร์ป)
import { Entity } from './Entity.js';
import { TILE } from '../config.js';

export class NPC extends Entity {
  constructor(def) {
    super({ name: def.name, x: def.x * TILE + TILE / 2, y: def.y * TILE + TILE / 2, look: def.look, dir: def.dir || 'down' });
    this.id = def.id;
    this.title = def.title || '';
    this.tx = def.x; this.ty = def.y;
    this.lines = def.lines || ['...'];
    this.service = def.service || null;   // { type: 'shop' | 'storage' | 'warp', ... } (v0.5)
    this.greet = def.greet || this.lines[0];
    this.lineIdx = 0;
    this.homeAngle = this.angle;
    this.bubble = null;
  }

  talk(player) {
    const text = this.lines[this.lineIdx % this.lines.length];
    this.lineIdx++;
    this.faceToward(player);
    this.bubble = { text, t: 4.5 };
    return text;
  }

  // ทักทายตอนเปิดบริการ (ร้านค้า/คลัง/วาร์ป)
  greetPlayer(player) {
    this.faceToward(player);
    this.bubble = { text: this.greet, t: 3.5 };
    return this.greet;
  }

  update(dt) {
    if (this.bubble) {
      this.bubble.t -= dt;
      if (this.bubble.t <= 0) { this.bubble = null; this.angle = this.homeAngle; }
    }
  }
}
