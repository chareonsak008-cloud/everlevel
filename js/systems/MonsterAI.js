// จัดการมอนสเตอร์ในแผนที่: เกิด, เดินเล่น, ไล่ล่า, โจมตี, ตาย, เกิดใหม่
import { TILE } from '../config.js';
import { Monster } from '../entities/Monster.js';
import { findPath, smoothPath, lineClear } from '../core/Pathfinder.js';

const LEASH = 15 * TILE;      // ไล่ไกลจากบ้านเกินนี้แล้วจะกลับ
const WANDER_R = 4;           // รัศมีเดินเล่นรอบบ้าน (ช่อง)

export class MonsterManager {
  constructor(map, spawns = [], avoid = null) {
    this.map = map;
    this.avoid = avoid;       // จุดที่ไม่ให้เกิดใกล้ (เช่น ทางเข้าแผนที่)
    this.list = [];
    for (const def of spawns) {
      for (let i = 0; i < def.count; i++) {
        const p = this.randomSpot(def);
        if (p) this.list.push(new Monster(def.mob, p.x, p.y, def));
      }
    }
  }

  randomSpot(def) {
    for (let tries = 0; tries < 120; tries++) {
      const [ax, ay, aw, ah] = def.areas[(Math.random() * def.areas.length) | 0];
      const tx = ax + ((Math.random() * aw) | 0), ty = ay + ((Math.random() * ah) | 0);
      if (this.map.isSolidTile(tx, ty)) continue;
      const x = tx * TILE + 8, y = ty * TILE + 8;
      // ไม่เกิดใกล้ผู้เล่นตอนเข้าแผนที่ (ยกเว้นหาที่อื่นไม่ได้แล้ว เช่น บอสที่มีจุดเกิดเดียว)
      if (tries < 60 && this.avoid && Math.hypot(x - this.avoid.x, y - this.avoid.y) < 7 * TILE) continue;
      return { x, y };
    }
    return null;
  }

  // เรียกมอนเพิ่มกลางสนาม (บอสเรียกลูกน้อง) — ตายแล้วไม่เกิดใหม่
  spawnAt(type, x, y) {
    const m = new Monster(type, x, y, { mob: type, areas: [[Math.floor(x / TILE), Math.floor(y / TILE), 1, 1]] });
    m.summoned = true;
    this.list.push(m);
    return m;
  }

  remove(m) { const i = this.list.indexOf(m); if (i >= 0) this.list.splice(i, 1); }

  kill(m, time) {
    m.dead = true; m.moving = false; m.target = null; m.path = [];
    m.frozen = m.stunned = false; m.frozenUntil = m.stunUntil = 0;
    const [a, b] = m.data.respawn;
    m.respawnAt = time + a + Math.random() * (b - a);
  }

  aggro(m, target) {
    if (m.dead) return;
    m.target = target;
    m.state = 'chase';
    m.repath = 0;
  }

  // ให้มอนที่กำลังไล่ target นี้เลิกไล่ (เช่น ผู้เล่นหมดสติ)
  release(target) {
    for (const m of this.list) if (m.target === target) { m.target = null; m.state = 'return'; m.path = []; }
  }

  update(dt, time, player, hooks) {
    const map = this.map;
    for (const m of this.list) {
      if (m.dead) {
        if (m.summoned) continue;              // มอนที่บอสเรียกมา ไม่เกิดใหม่
        if (time >= m.respawnAt) {
          const p = this.randomSpot(m.spawnDef) || m.home;
          m.reset(p.x, p.y);
          hooks.onRespawn && hooks.onRespawn(m);
        }
        continue;
      }
      // สถานะผิดปกติจากสกิล: แช่แข็ง / มึน → ขยับไม่ได้
      m.frozen = m.frozenUntil > time; m.stunned = m.stunUntil > time;
      if (m.frozen || m.stunned) { m.moving = false; m.path = []; continue; }
      if (m.busyUntil > time) { m.moving = false; continue; }   // บอสกำลังง้างท่าพิเศษ
      m.attackCd -= dt;
      const playerOk = player && !player.dead;
      const dPlayer = playerOk ? Math.hypot(player.x - m.x, player.y - m.y) : Infinity;

      switch (m.state) {
        case 'idle':
          m.moving = false;
          m.timer -= dt;
          if (m.data.aggressive && dPlayer < m.data.aggroRange) { this.aggro(m, player); hooks.onAggro && hooks.onAggro(m); break; }
          if (m.timer <= 0) {
            const w = this.wanderPoint(m);
            if (w) { m.wander = w; m.state = 'wander'; m.timer = 6; } else m.timer = 2;
          }
          break;

        case 'wander': {
          if (m.data.aggressive && dPlayer < m.data.aggroRange) { this.aggro(m, player); hooks.onAggro && hooks.onAggro(m); break; }
          m.timer -= dt;
          const d = this.steer(m, m.wander.x, m.wander.y, 0.45, dt);
          if (d < 2 || m.timer <= 0 || m.stuck) { m.state = 'idle'; m.timer = 2 + Math.random() * 4; m.moving = false; m.stuck = false; }
          break;
        }

        case 'chase': {
          const t = m.target;
          if (!t || t.dead) { m.state = 'return'; m.target = null; break; }
          if (Math.hypot(m.x - m.home.x, m.y - m.home.y) > (m.data.leash ? m.data.leash * TILE : LEASH)) { m.state = 'return'; m.target = null; m.path = []; break; }
          const d = Math.hypot(t.x - m.x, t.y - m.y);
          if (d <= m.data.attackRange) { m.state = 'attack'; m.moving = false; m.path = []; break; }
          m.repath -= dt;
          if (m.repath <= 0) {
            m.repath = 0.6;
            m.path = lineClear(map, m, t) ? [] : this.pathTo(m, t.x, t.y);
          }
          this.steer(m, t.x, t.y, 1, dt);
          if (m.blocked > 2) { m.state = 'return'; m.target = null; m.blocked = 0; } // ไปต่อไม่ได้ (เช่น ติดน้ำ)
          break;
        }

        case 'attack': {
          const t = m.target;
          m.moving = false;
          if (!t || t.dead) { m.state = 'return'; m.target = null; break; }
          const d = Math.hypot(t.x - m.x, t.y - m.y);
          m.face(t.x - m.x, t.y - m.y);
          if (d > m.data.attackRange * 1.35) { m.state = 'chase'; m.repath = 0; break; }
          if (m.attackCd <= 0) { m.attackCd = m.attackDelay || m.data.attackDelay; hooks.onAttack(m, t); }
          break;
        }

        case 'return': {
          m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.25 * dt);
          m.repath -= dt;
          if (m.repath <= 0) { m.repath = 1; m.path = lineClear(map, m, m.home) ? [] : this.pathTo(m, m.home.x, m.home.y); }
          const d = this.steer(m, m.home.x, m.home.y, 1.2, dt);
          if (d < 3 || m.stuck) { m.state = 'idle'; m.timer = 1 + Math.random() * 2; m.hp = m.maxHp; m.moving = false; m.stuck = false; }
          break;
        }
      }
    }
  }

  wanderPoint(m) {
    for (let i = 0; i < 12; i++) {
      const tx = Math.floor(m.home.x / TILE) + Math.round((Math.random() * 2 - 1) * WANDER_R);
      const ty = Math.floor(m.home.y / TILE) + Math.round((Math.random() * 2 - 1) * WANDER_R);
      if (this.map.isSolidTile(tx, ty)) continue;
      const p = { x: tx * TILE + 8, y: ty * TILE + 8 };
      if (lineClear(this.map, m, p)) return p;
    }
    return null;
  }

  pathTo(m, x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    const path = findPath(this.map, Math.floor(m.x / TILE), Math.floor(m.y / TILE), tx, ty, 2500);
    if (!path) return [];
    const pts = path.slice(1).map((p) => ({ x: p.x * TILE + 8, y: p.y * TILE + 8 }));
    return pts.length ? smoothPath(this.map, { x: m.x, y: m.y }, pts) : [];
  }

  // เดินไปหาเป้าหมาย (ตามเส้นทางถ้ามี) คืนค่าระยะที่เหลือ
  steer(m, tx, ty, speedMul, dt) {
    const goal = m.path.length ? m.path[0] : { x: tx, y: ty };
    const dx = goal.x - m.x, dy = goal.y - m.y, d = Math.hypot(dx, dy);
    if (d < 1.5) {
      if (m.path.length) m.path.shift();
      return Math.hypot(tx - m.x, ty - m.y);
    }
    const step = Math.min(d, m.speed * speedMul * dt);
    const moved = m.moveBy((dx / d) * step, (dy / d) * step, this.map);
    m.face(dx, dy);
    m.moving = moved;
    m.speedFactor = speedMul;
    m.stuck = !moved;
    m.blocked = moved ? 0 : (m.blocked || 0) + dt;
    if (!moved && !m.path.length) m.path = this.pathTo(m, tx, ty);
    return Math.hypot(tx - m.x, ty - m.y);
  }
}
