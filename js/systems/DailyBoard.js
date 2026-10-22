// v0.74 กระดานภารกิจรายวัน — สุ่มภารกิจวันละ 4 อย่างตามเลเวล · ทำครบรับกล่อง · ต่อเนื่องทุก 7 วันได้กล่องใหญ่
// สถานะเก็บใน player.daily (เซฟพร้อมตัวละคร) · วันที่ใช้เวลาเซิร์ฟเวอร์ (เวลาไทย) ถ้าเชื่อมต่ออยู่ กันการเลื่อนนาฬิกาเครื่อง
import { DAILY_TASKS, DAILY_COUNT, DAILY_REROLLS, DAILY_STREAK_BIG, DAILY_REWARD, huntMapFor, killMobFor } from '../data/daily.js?v=0.90.0';

export const bkkDay = (ms) => new Date(ms + 7 * 3600000).toISOString().slice(0, 10);
const prevDay = (day) => bkkDay(Date.parse(`${day}T12:00:00+07:00`) - 86400000);

// สุ่มแบบกำหนดค่าเริ่มต้นได้ (วัน + ชื่อตัวละคร) → โหลดเกมใหม่ได้ภารกิจชุดเดิม
function rng(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1e6) / 1e6; };
}

export class DailyBoard {
  constructor(game) { this.g = game; this.changed = null; }

  get pl() { return this.g.player; }
  now() { const e = this.g.events; return e && typeof e.now === 'function' ? e.now() : Date.now(); }
  get day() { return bkkDay(this.now()); }

  // สถานะวันนี้ (สร้างใหม่ถ้าข้ามวัน)
  get st() {
    const pl = this.pl, day = this.day;
    let d = pl.daily;
    if (!d || typeof d !== 'object') d = pl.daily = { day: '', tasks: [], bonus: false, rerolls: 0, streak: 0, lastBonus: '' };
    if (d.day !== day) {
      d.day = day; d.bonus = false; d.rerolls = 0;
      d.tasks = this.roll(day);
      if (d.lastBonus && d.lastBonus !== prevDay(day)) d.streak = 0;   // ขาดไปวันหนึ่ง → นับต่อเนื่องใหม่
    }
    if (!Array.isArray(d.tasks)) d.tasks = this.roll(day);
    d.tasks = d.tasks.filter((t) => t && DAILY_TASKS[t.id]);
    return d;
  }

  pool() {
    const lv = this.pl.baseLevel, online = this.g.mode === 'online';
    return Object.entries(DAILY_TASKS).filter(([, T]) => lv >= (T.minLv || 1) && (!T.online || online)).map(([id]) => id);
  }

  make(id) {
    const T = DAILY_TASKS[id], lv = this.pl.baseLevel;
    const t = { id, n: T.n(lv), prog: 0, claimed: false };
    if (id === 'huntMap') t.map = huntMapFor(lv);
    if (id === 'killMob') t.mob = killMobFor(lv, this.rnd || Math.random);
    return t;
  }

  roll(day) {
    const r = this.rnd = rng(`${day}|${this.pl.name || ''}|${this.pl.cid || ''}`);
    const pool = this.pool(), mains = pool.filter((id) => DAILY_TASKS[id].main), rest = pool.filter((id) => !DAILY_TASKS[id].main);
    const pick = [mains[Math.floor(r() * mains.length)]];
    while (pick.length < DAILY_COUNT && rest.length) pick.push(rest.splice(Math.floor(r() * rest.length), 1)[0]);
    const left = pool.filter((id) => !pick.includes(id));
    while (pick.length < DAILY_COUNT && left.length) pick.push(left.splice(Math.floor(r() * left.length), 1)[0]);
    const out = pick.map((id) => this.make(id)); this.rnd = null; return out;
  }

  text(t) { return DAILY_TASKS[t.id].text(t.n, t); }
  done(t) { return t.prog >= t.n; }
  claimable() { const d = this.st; return d.tasks.filter((t) => this.done(t) && !t.claimed).length + (this.bonusReady() ? 1 : 0); }
  bonusReady() { const d = this.st; return !d.bonus && d.tasks.length > 0 && d.tasks.every((t) => t.claimed); }
  rerollsLeft() { return Math.max(0, DAILY_REROLLS - (this.st.rerolls || 0)); }
  msToReset() { const now = this.now(); return Date.parse(`${bkkDay(now)}T00:00:00+07:00`) + 86400000 - now; }

  // เหตุการณ์ในเกม → เพิ่มความคืบหน้า (match ใช้กรองเช่นแผนที่)
  bump(type, match = null, by = 1) {
    const d = this.st;
    for (const t of d.tasks) {
      if (t.id !== type || t.claimed || this.done(t) || (match && !match(t))) continue;
      t.prog = Math.min(t.n, t.prog + by);
      if (this.done(t)) {
        this.g.hud.log(`📜 ภารกิจรายวัน "${DAILY_TASKS[t.id].name}" สำเร็จ! เปิดกระดานภารกิจเพื่อรับรางวัล`, 'quest-ok');
        this.g.sfx && this.g.sfx('questDone');
      }
      this.changed && this.changed();
    }
  }

  reroll(i) {
    const d = this.st, t = d.tasks[i];
    if (!t || t.claimed || this.done(t)) return { error: 'เปลี่ยนได้เฉพาะภารกิจที่ยังทำไม่เสร็จ' };
    if (!this.rerollsLeft()) return { error: 'วันนี้ใช้สิทธิ์เปลี่ยนภารกิจครบแล้ว' };
    const have = d.tasks.map((x) => x.id), opts = this.pool().filter((id) => !have.includes(id));
    if (!opts.length) return { error: 'ไม่มีภารกิจอื่นให้เปลี่ยน' };
    d.tasks[i] = this.make(opts[Math.floor(Math.random() * opts.length)]);
    d.rerolls = (d.rerolls || 0) + 1;
    return { ok: true };
  }

  // รางวัล → { exp:[b,j], zeny, items }
  expOf(pct) {
    const pl = this.pl, b = pl.baseNext, j = pl.jobNext;
    return [Number.isFinite(b) ? Math.round(b * pct) : 0, Number.isFinite(j) ? Math.round(j * pct) : 0];
  }
  rewardOf(kind) {
    const lv = this.pl.baseLevel, R = kind === 'task' ? DAILY_REWARD.task(lv) : DAILY_REWARD.bonus(lv);
    const out = { exp: R.expPct ? this.expOf(R.expPct) : [0, 0], zeny: R.zeny || 0, items: [...(R.items || [])] };
    if (kind === 'bonus' && ((this.st.streak || 0) + 1) % DAILY_STREAK_BIG === 0) out.items.push(...DAILY_REWARD.big(lv).items);
    return out;
  }

  claim(i) {
    const d = this.st, t = d.tasks[i];
    if (!t || t.claimed || !this.done(t)) return { error: 'ยังทำภารกิจไม่ครบ' };
    t.claimed = true;
    return { ok: true, rewards: this.rewardOf('task') };
  }

  claimBonus() {
    const d = this.st;
    if (!this.bonusReady()) return { error: 'รับรางวัลภารกิจให้ครบทุกข้อก่อน' };
    const rewards = this.rewardOf('bonus');
    if (!this.pl.inventory.fits(rewards.items)) return { error: 'กระเป๋าเต็ม ทำช่องว่างก่อนรับกล่องรางวัล' };
    d.bonus = true; d.streak = (d.streak || 0) + 1; d.lastBonus = d.day;
    return { ok: true, rewards, big: d.streak % DAILY_STREAK_BIG === 0 };
  }
}
