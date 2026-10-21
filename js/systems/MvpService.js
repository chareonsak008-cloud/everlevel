// v0.53 MVP ร่วม — ทุกคนในแผนที่เห็น/ตี MVP ตัวเดียวกัน (เซิร์ฟเวอร์ถือเลือดกลาง · ต้องรัน supabase/mvp_shared.sql)
// ไม่มีเซิร์ฟเวอร์/ยังไม่ติดตั้ง → MVP กลับไปทำงานแบบเดิม (แยกเครื่องใครเครื่องมัน)
import { MONSTERS } from '../data/monsters.js?v=0.75.0';
import { TILE } from '../config.js?v=0.75.0';

const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');

export class MvpService {
  constructor(game) {
    this.g = game; this.timer = 0; this.busy = false; this.off = false; this.rows = new Map(); this.pending = new Map(); this.sending = new Set();
  }
  get on() { return !this.off && this.g.mode === 'online' && !!(this.g.online && this.g.online.mvpRPC); }

  // แถวสปอน MVP ของแผนที่ปัจจุบัน
  defs() { return ((this.g.map && this.g.map.def.spawns) || []).filter((s) => MONSTERS[s.mob] && MONSTERS[s.mob].mvp && !MONSTERS[s.mob].worldBoss); }
  mob(type) { return this.g.mobs && this.g.mobs.list.find((m) => m.type === type && !m.worldRun && !m.summoned); }

  onMapChange() { this.rows.clear(); this.pending.clear(); this.timer = 0.3; }

  update(dt) {
    if (!this.on || !this.g.mobs || !this.g.started) return;
    this.timer -= dt;
    if (this.timer <= 0 && !this.busy) { this.timer = 3; void this.refresh(); }
  }

  async refresh() {
    const defs = this.defs(); if (!defs.length) return;
    this.busy = true;
    try {
      const cand = {};
      for (const d of defs) { const p = this.g.mobs.randomSpot(d); if (p) cand[d.mob] = [Math.round(p.x), Math.round(p.y)]; }
      const mapId = this.g.map.def.id;
      const s = await this.g.online.mvpRPC('mvp_state', { p_map: mapId, p_cand: cand });
      if (this.g.map.def.id !== mapId) return;
      for (const row of (s && s.mvps) || []) this.apply(row);
    } catch (e) {
      if (!e.missing) console.warn('MVP ร่วม:', e.message);
      if (e.missing) { this.off = true; console.info('MVP ร่วม: เซิร์ฟเวอร์ยังไม่ได้รัน mvp_shared.sql — ใช้ MVP แบบเดิม'); }
    } finally { this.busy = false; }
  }

  // ปรับ MVP ในเครื่องให้ตรงกับเซิร์ฟเวอร์
  apply(row) {
    const g = this.g, m = this.mob(row.mob); if (!m) return;
    const prev = this.rows.get(row.mob); this.rows.set(row.mob, row);
    m.shared = row.run; m.maxHp = +row.max;
    if (row.status === 'alive') {
      if (m.dead || m.sharedRun !== row.run) {
        const fresh = m.sharedRun != null && m.sharedRun !== row.run;
        m.reset(row.x || m.home.x, row.y || m.home.y); m.sharedRun = row.run;
        if (m.dead === false && fresh) { g.gfx.playRespawn(m); g.hud.log(`⚠ MVP ${m.name} ปรากฏตัวที่ (${Math.floor(m.x / TILE)}, ${Math.floor(m.y / TILE)}) — ทุกคนในแผนที่ตีตัวเดียวกัน!`, 'r-epic'); g.sfx('bossWindup'); }
      }
      if (!this.sending.has(row.mob)) m.hp = Math.max(1, Math.min(m.hp, +row.hp));
      m.respawnAt = Infinity;
    } else this.died(m, row, prev);
  }

  // MVP ตาย (เห็นจากผลการตีหรือจากการดึงสถานะ)
  died(m, row, prev) {
    const g = this.g;
    m.sharedRun = row.run;
    const pl = g.player, done = (pl.quests.mvpRuns ||= {});
    const mine = +row.mine || 0, share = mine / Math.max(1, +row.max);
    if (mine > 0 && !done[row.run]) {
      done[row.run] = Date.now();
      const keys = Object.keys(done); if (keys.length > 40) for (const k of keys.sort((a, b) => done[a] - done[b]).slice(0, keys.length - 40)) delete done[k];
      if (m.dead) { m.dead = false; }   // ให้ killMonster เล่นท่าตายและแจกรางวัล
      if (share >= 0.01) {
        const top = +row.rank === 1;
        g.killMonster(m, { shared: true, expMul: Math.min(1, 0.3 + share), dropMul: top ? 1 : 0.5, mvpTop: top });
        g.hud.log(`🏆 ${m.name} ถูกปราบ! ดาเมจคุณ ${fmt(mine)} (${Math.round(share * 100)}%) อันดับ ${row.rank}/${row.n}${top ? ' — คุณคือ MVP!' : ''}`, 'r-epic');
      } else {
        g.killMonster(m, { shared: true, expMul: 0, dropMul: 0, mvpTop: false, noReward: true });
        g.hud.log(`${m.name} ถูกปราบแล้ว · ดาเมจของคุณไม่ถึง 1% จึงไม่ได้รางวัล`, 'sys');
      }
      g.dirty = true;
    } else if (!m.dead) {
      g.mobs.kill(m, g.time); g.gfx.playDeath(m);
      if (g.player.target === m) g.clearTarget();
      if (prev && prev.status === 'alive') g.hud.log(`${m.name} ถูก ${row.killer || 'ผู้เล่นอื่น'} ปราบแล้ว`, 'sys');
    }
    m.respawnAt = Infinity;
  }

  // ส่งดาเมจ (รวมเป็นก้อนทุก ~0.25 วิ)
  hit(m, amount) {
    const k = m.type;
    this.pending.set(k, (this.pending.get(k) || 0) + Math.max(1, Math.floor(amount)));
    if (!this.sending.has(k)) void this.flush(m);
  }
  async flush(m) {
    const k = m.type;
    this.sending.add(k);
    try {
      await new Promise((r) => setTimeout(r, 250));
      while ((this.pending.get(k) || 0) > 0 && m.shared && !m.dead) {
        const dmg = this.pending.get(k); this.pending.set(k, 0);
        const row = await Promise.race([this.g.online.mvpRPC('mvp_hit', { p_mob: k, p_run: m.shared, p_damage: Math.min(2000000000, dmg) }), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 8000))]);
        if (!this.g.mobs || !this.g.mobs.list.includes(m)) break;
        this.sending.delete(k);
        this.apply(row);
        this.sending.add(k);
      }
    } catch (e) { /* รอบถัดไปดึงสถานะใหม่เอง */ }
    finally { this.sending.delete(k); this.pending.delete(k); }
  }
}
