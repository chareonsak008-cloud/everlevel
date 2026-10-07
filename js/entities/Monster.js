// มอนสเตอร์: ค่าสถานะ + สถานะ AI (ตรรกะล้วน การวาดอยู่ใน render/Monsters.js)
import { Entity } from './Entity.js';
import { MONSTERS } from '../data/monsters.js';

let nextId = 1;

export class Monster extends Entity {
  constructor(type, x, y, spawnDef) {
    const d = MONSTERS[type];
    if (!d) throw new Error('Unknown monster: ' + type);
    super({ name: d.name, x, y, look: { model: d.model, color: d.color }, dir: 'down' });
    this.id = nextId++;
    this.type = type;
    this.data = d;
    this.isMonster = true;
    this.level = d.level;
    this.maxHp = d.hp;
    this.stats = { atk: d.atk, def: d.def, mdef: d.mdef || 0, hit: d.hit, flee: d.flee, crit: d.crit };
    this.speed = d.speed;
    this.spawnDef = spawnDef;
    this.angle = Math.random() * Math.PI * 2;
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x; this.y = y;
    this.home = { x, y };
    this.hp = this.maxHp;
    this.dead = false;
    this.state = 'idle';
    this.timer = 1 + Math.random() * 3;
    this.target = null;
    this.attackCd = 0;
    this.path = [];
    this.repath = 0;
    this.moving = false;
    this.frozenUntil = 0; this.stunUntil = 0; this.frozen = false; this.stunned = false;
    // บอส: ท่าพิเศษ / เรียกลูกน้อง / โกรธ
    this.busyUntil = 0; this.summonDone = 0; this.enraged = false; this.attackDelay = 0; this.slamCd = null; this.rootCd = null;
  }

  get alive() { return !this.dead; }
}
