// ระบบสะสมและเป้าหมายระยะยาว (v0.18) — สมุดมอนสเตอร์ · ความสำเร็จ/ฉายา · อัลบั้มการ์ด · เช็กอินรายวัน
// ข้อมูลอยู่ในเซฟตัวละคร (player.col) → ไม่ต้องตั้งค่าเซิร์ฟเวอร์เพิ่ม · โบนัสรวมอยู่ที่ player.colBonus (คิดรวมในค่าสถานะ)
import { MONSTERS } from '../data/monsters.js';
import { CARDS } from '../data/cards.js';
import { ITEMS, itemMods, describeBonus } from '../data/items.js';
import { BOOK, BOOK_ORDER, bookTier, bookTiers, CARD_SETS, ACHIEVEMENTS, ACH_BY_ID, loginReward, LOGIN_DAYS } from '../data/collection.js';

const SET_OF = (o) => Object.keys(o);
const addTo = (out, o) => { for (const [k, v] of Object.entries(o || {})) out[k] = +(((out[k] || 0) + v).toFixed(4)); return out; };
const MAX_LOCAL_MAILS = 20;

// วันที่ตามเวลาเครื่อง 'YYYY-MM-DD'
export function localDay(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const dayBefore = (s) => { const [y, m, d] = s.split('-').map(Number); return localDay(new Date(y, m - 1, d - 1)); };

// ตรวจข้อมูลจากเซฟ (เซฟเก่าไม่มี → เริ่มว่าง)
export function normCol(c) {
  const o = { kills: {}, total: 0, quests: 0, cards: [], ach: {}, title: null, ci: { last: '', count: 0, day: 0, streak: 0, best: 0 } };
  if (!c || typeof c !== 'object') return o;
  const int = (v, max = 1e9) => (Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);
  if (c.kills && typeof c.kills === 'object') for (const [t, n] of Object.entries(c.kills)) if (MONSTERS[t]) o.kills[t] = int(n);
  o.total = Math.max(int(c.total), Object.values(o.kills).reduce((a, b) => a + b, 0));
  o.quests = int(c.quests);
  if (Array.isArray(c.cards)) o.cards = [...new Set(c.cards.filter((id) => CARDS[id]))];
  if (c.ach && typeof c.ach === 'object') for (const [id, v] of Object.entries(c.ach)) if (ACH_BY_ID[id]) o.ach[id] = int(v) || 1;
  if (typeof c.title === 'string' && o.ach[c.title]) o.title = c.title;
  const ci = c.ci && typeof c.ci === 'object' ? c.ci : {};
  o.ci = { last: typeof ci.last === 'string' && /^\d{4}-\d\d-\d\d$/.test(ci.last) ? ci.last : '', count: int(ci.count, 99999), day: int(ci.day, LOGIN_DAYS), streak: int(ci.streak, 99999), best: int(ci.best, 99999) };
  return o;
}

export class Collection {
  constructor(game) {
    this.g = game;
    this.evalT = 0; this.cardT = 0; this.dayT = 0;
    this.started = false;
    this.onChange = null;   // หน้าต่างสมุดสะสมเปิดอยู่ → วาดใหม่
  }

  get pl() { return this.g.player; }
  get c() { return this.pl.col; }
  changed() { if (this.onChange) this.onChange(); }

  // เริ่มเกม/โหลดตัวละครเสร็จ: เก็บการ์ดที่มีอยู่แล้ว · ปลดล็อกความสำเร็จที่ทำครบไว้ก่อนแล้ว (แจ้งรวมครั้งเดียว) · เช็กอินวันนี้
  start() {
    this.started = true;
    this.scanCards(true);
    this.evaluate(true);
    this.apply(false);
    this.checkDay();
  }

  /* ---------- ตัวนับ ---------- */
  onKill(type) {
    if (!MONSTERS[type]) return;
    const c = this.c, before = c.kills[type] || 0;
    c.kills[type] = before + 1; c.total++;
    if (BOOK[type] && bookTier(type, before + 1) > bookTier(type, before)) {
      const tier = bookTier(type, before + 1), reward = BOOK[type][tier - 1];
      this.g.hud.log(`📖 สมุดมอนสเตอร์: ${MONSTERS[type].name} ขั้นที่ ${tier} (กำจัดครบ ${(before + 1).toLocaleString('en-US')} ตัว) · ${describeBonus(reward)} ถาวร`, 'lv');
      this.cheer(`สมุดมอนสเตอร์ ขั้น ${tier}`);
      this.apply(true);
    }
    this.evalT = Math.max(this.evalT, 0.7);   // ตรวจความสำเร็จเร็ว ๆ นี้
  }

  onQuest() { this.c.quests++; this.evalT = 1; }

  update(dt) {
    if (!this.started) return;
    this.evalT += dt; this.cardT += dt; this.dayT += dt;
    if (this.cardT > 2) { this.cardT = 0; this.scanCards(false); }
    if (this.evalT > 1.5) { this.evalT = 0; this.evaluate(false); }
    if (this.dayT > 30) { this.dayT = 0; this.checkDay(); }
  }

  /* ---------- สถานะรวมสำหรับตรวจความสำเร็จ ---------- */
  state() {
    const pl = this.pl, c = this.c, g = this.g;
    let refine = 0;
    const look = (key) => { if (key && key.includes('*')) refine = Math.max(refine, itemMods(key).refine); };
    for (const s of pl.inventory.stacks) look(s.id);
    for (const k of Object.values(pl.equip)) look(k);
    if (g.storage) for (const s of g.storage.stacks) look(s.id);
    const k = (t) => c.kills[t] || 0;
    return {
      lv: pl.baseLevel, jlv: pl.jobLevel, job: pl.jobId, kills: c.total, quests: c.quests, k,
      mvpKills: BOOK_ORDER.filter((t) => MONSTERS[t].mvp).reduce((a, t) => a + k(t), 0),
      bookAt: (n) => BOOK_ORDER.filter((t) => bookTier(t, k(t)) >= n).length,
      cards: c.cards.length, sets: this.setsDone().length,
      maps: pl.visited ? pl.visited.size : 1, zeny: pl.zeny,
      pets: Object.keys(pl.pets.owned).length, fashion: pl.fashion.owned.size, refine,
      checkins: c.ci.count, bestStreak: c.ci.best,
    };
  }

  progress(a, S = this.state()) { const [cur, goal] = a.need(S); return { cur: Math.max(0, Math.min(cur, goal)), goal, done: !!this.c.ach[a.id] }; }

  evaluate(first) {
    const S = this.state(), c = this.c, fresh = [];
    for (const a of ACHIEVEMENTS) {
      if (c.ach[a.id]) continue;
      const [cur, goal] = a.need(S);
      if (cur >= goal) { c.ach[a.id] = Math.floor(Date.now() / 86400000); fresh.push(a); }
    }
    if (!fresh.length) return;
    const g = this.g;
    if (first && fresh.length > 2) {
      g.hud.log(`🏆 ปลดล็อกความสำเร็จที่ทำครบไว้แล้ว ${fresh.length} รายการ — กด B เพื่อดูและเลือกฉายา`, 'lv');
    } else {
      for (const a of fresh) g.hud.log(`🏆 ความสำเร็จ "${a.title}" — ${a.desc} · ได้ฉายาใหม่ + ${describeBonus(a.bonus)}`, 'lv');
      this.cheer(`ฉายาใหม่: ${fresh[fresh.length - 1].title}`);
    }
    // ยังไม่มีฉายา → ใส่ฉายาแรกให้เลย
    if (!c.title) c.title = fresh[fresh.length - 1].id;
    this.apply(true);
    g.dirty = true;
  }

  cheer(text) {
    const g = this.g;
    if (!g.started) return;
    g.sfx('questDone');
    g.gfx.floatText(this.pl, text, 'loot r-epic', { h: 2.3, life: 2, rise: 0.7, drift: false });
  }

  /* ---------- อัลบั้มการ์ด: ได้การ์ดมาเมื่อไหร่ (เก็บ/ซื้อ/รับจดหมาย/ใส่อุปกรณ์) → บันทึกอัตโนมัติ ---------- */
  scanCards(first) {
    const pl = this.pl, g = this.g, have = new Set(this.c.cards), found = [];
    const take = (key) => {
      if (!key) return;
      if (CARDS[key]) { if (!have.has(key)) { have.add(key); found.push(key); } return; }
      if (key.includes('*')) for (const cid of itemMods(key).cards) if (CARDS[cid] && !have.has(cid)) { have.add(cid); found.push(cid); }
    };
    for (const s of pl.inventory.stacks) take(s.id);
    for (const k of Object.values(pl.equip)) take(k);
    if (g.storage) for (const s of g.storage.stacks) take(s.id);
    if (!found.length) return;
    const setsBefore = this.setsDone().map((s) => s.id);
    this.c.cards.push(...found);
    if (!first) {
      for (const id of found) g.hud.log(`🃏 อัลบั้มการ์ด: บันทึก "${ITEMS[id].name}" แล้ว (${this.c.cards.length}/${Object.keys(CARDS).length})`, 'r-epic');
      for (const s of this.setsDone()) if (!setsBefore.includes(s.id)) { g.hud.log(`🃏 สะสมการ์ดครบชุด "${s.name}"! โบนัสชุด: ${describeBonus(s.bonus)}`, 'lv'); this.cheer('การ์ดครบชุด!'); }
    }
    this.apply(true);
    g.dirty = true;
  }

  setsDone() { const have = new Set(this.c.cards); return CARD_SETS.filter((s) => s.cards.every((id) => have.has(id))); }

  /* ---------- โบนัสรวม ---------- */
  bonusParts() {
    const c = this.c, book = {}, ach = {}, cards = {};
    for (const t of BOOK_ORDER) { const tier = bookTier(t, c.kills[t] || 0); for (let i = 0; i < tier; i++) addTo(book, BOOK[t][i]); }
    for (const id of SET_OF(c.ach)) if (ACH_BY_ID[id]) addTo(ach, ACH_BY_ID[id].bonus);
    for (const s of this.setsDone()) addTo(cards, s.bonus);
    return { book, ach, cards };
  }

  apply(refresh) {
    const P = this.bonusParts(), all = addTo(addTo(addTo({}, P.book), P.ach), P.cards);
    const pl = this.pl, sig = JSON.stringify(all);
    if (sig !== this.lastSig) { this.lastSig = sig; pl.colBonus = all; pl.afterEquipChange(true); }
    if (refresh && this.g.started) { this.g.hud.setPlayer(pl); this.g.status.render(); }
    this.changed();
  }

  /* ---------- ฉายา ---------- */
  setTitle(id) {
    const c = this.c;
    if (id && !c.ach[id]) return false;
    c.title = id || null;
    this.g.dirty = true;
    this.changed();
    return true;
  }
  titleOf(id) { const a = id && ACH_BY_ID[id]; return a ? a.title : ''; }

  /* ---------- เช็กอินรายวัน ----------
     วันใหม่ (เวลาเครื่อง) ครั้งแรกที่อยู่ในเกม → นับเช็กอิน + ส่งรางวัลวันที่ 1–7 เข้ากล่องจดหมาย
     ไม่ต้องเข้าติดกัน (วันที่ขาดไม่ทำให้รอบเริ่มใหม่) · เข้าติดกันนับเป็นสถิติ "ติดต่อกัน" แยก */
  checkDay() {
    const g = this.g, c = this.c.ci, today = localDay();
    if (!g.started || c.last === today) return;
    if (c.last && today < c.last) return;   // นาฬิกาเครื่องย้อนกลับ → ไม่นับ
    c.streak = c.last && dayBefore(today) === c.last ? c.streak + 1 : 1;
    c.best = Math.max(c.best, c.streak);
    c.last = today; c.count++;
    c.day = (c.day % LOGIN_DAYS) + 1;
    const r = loginReward(c.day, this.pl.baseLevel);
    this.sendMail({
      id: `ci${c.count}-${today}`, sender: 'ปฏิทินเช็กอิน',
      title: `รางวัลเช็กอินวันที่ ${c.day}/${LOGIN_DAYS}${c.day === LOGIN_DAYS ? ' 🎉' : ''}`,
      body: `ขอบคุณที่แวะมาผจญภัยวันนี้! เช็กอินรวม ${c.count} วัน · ติดต่อกัน ${c.streak} วัน\n${c.day === LOGIN_DAYS ? 'ครบรอบ 7 วันแล้ว รับรางวัลใหญ่ไปเลย — พรุ่งนี้เริ่มรอบใหม่' : `อีก ${LOGIN_DAYS - c.day} วันจะได้รางวัลใหญ่วันที่ 7`}`,
      items: r.items, zeny: r.zeny,
    });
    g.hud.log(`📅 เช็กอินวันที่ ${c.day}/${LOGIN_DAYS} (รวม ${c.count} วัน) — รางวัลส่งเข้ากล่องจดหมายแล้ว กด M เพื่อรับ`, 'lv');
    g.dirty = true;
    this.evalT = 1;
    this.changed();
  }

  // จดหมายในเครื่อง (ระบบเกมส่งให้ตัวละครนี้) — เก็บในเซฟตัวละคร · แสดงในกล่องจดหมายเดิม
  sendMail({ id, sender, title, body, items = [], zeny = 0 }) {
    const box = this.pl.mail.box;
    if (box.some((m) => m.id === id)) return;
    box.unshift({ id, sender, title, body, items, zeny, at: Date.now(), got: false });
    // เก็บไม่เกิน 20 ฉบับ (ลบฉบับเก่าที่รับแล้วก่อน)
    while (box.length > MAX_LOCAL_MAILS) { const i = box.map((m) => m.got).lastIndexOf(true); box.splice(i >= 0 ? i : box.length - 1, 1); }
    this.g.mailbox.changed();
    this.g.mailbox.notifyNew();
  }

  /* ---------- เป้าหมายถัดไป (หน้าแรกของสมุดสะสม) ---------- */
  goals(n = 6) {
    const S = this.state(), c = this.c, pl = this.pl, out = [];
    // สมุดมอนของแผนที่ปัจจุบัน + มอนที่เลเวลใกล้ตัว
    const here = new Set((this.g.map && this.g.map.def.spawns || []).map((s) => s.mob));
    for (const t of BOOK_ORDER) {
      const k = c.kills[t] || 0, tiers = bookTiers(t), tier = bookTier(t, k);
      if (tier >= 3) continue;
      const m = MONSTERS[t], near = here.has(t) || Math.abs(m.level - pl.baseLevel) <= 8;
      if (!near) continue;
      out.push({ kind: 'book', key: t, label: `ล่า${m.name}`, cur: k, goal: tiers[tier], reward: describeBonus(BOOK[t][tier]) + ' ถาวร', w: (here.has(t) ? 2 : 1) + k / tiers[tier] });
    }
    for (const a of ACHIEVEMENTS) {
      if (c.ach[a.id]) continue;
      const [cur, goal] = a.need(S);
      out.push({ kind: 'ach', key: a.id, label: a.desc, cur: Math.max(0, cur), goal, reward: `ฉายา "${a.title}" · ${describeBonus(a.bonus)}`, w: 0.6 + Math.max(0, cur) / goal });
    }
    return out.sort((a, b) => b.w - a.w).slice(0, n);
  }
}
