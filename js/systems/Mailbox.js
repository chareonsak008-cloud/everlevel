// กล่องจดหมาย (v0.15)
// · ของขวัญต้อนรับ: ทุกตัวละครได้ 1 ฉบับ (เลือกชุดแฟชั่น 1 เซ็ต + สัตว์เลี้ยง 1 ตัว + ของใช้เริ่มต้น) — ใช้ได้ทุกโหมด
// · จดหมายจากแอดมิน (เซิร์ฟเวอร์ Supabase): ส่งถึงทุกคนหรือระบุชื่อตัวละคร · รับได้บัญชีละครั้งหรือตัวละครละครั้ง
import { ITEMS } from '../data/items.js';
import { PETS } from '../data/pets.js';
import { MAX_ZENY } from '../data/shops.js';
import { WELCOME_MAIL, normMail, setById, hasGift } from '../data/mail.js';

const REFRESH_SEC = 180;

export class Mailbox {
  constructor(game) {
    this.g = game;
    this.server = [];          // จดหมายจากเซิร์ฟเวอร์ (ตรวจแล้ว)
    this.claimed = new Set();  // `${id}:${cid|acct}`
    this.admin = false;
    this.serverOk = false;     // เซิร์ฟเวอร์มีระบบจดหมาย (รัน mail.sql แล้ว)
    this.loading = null;
    this.timer = REFRESH_SEC;
    this.onChange = null;
    this.seen = new Set();     // จดหมายที่แจ้งเตือนไปแล้ว
  }

  get online() { const o = this.g.online; return this.g.mode === 'online' && o && typeof o.fetchMail === 'function' ? o : null; }

  key(m) { return `${m.id}:${m.per === 'char' ? this.g.player.cid : 'acct'}`; }

  isClaimed(m) { return m.local ? !!this.g.player.mail.welcome : this.claimed.has(this.key(m)); }

  // รายการจดหมายของตัวละครนี้ (ใหม่สุดก่อน · ของขวัญต้อนรับอยู่บนสุดจนกว่าจะรับ)
  list() {
    const pl = this.g.player, now = Date.now(), name = pl.name.trim().toLowerCase();
    const out = [], welcome = this.welcome || (this.welcome = normMail(WELCOME_MAIL));
    if (!pl.mail.welcome) out.push(welcome);
    for (const m of this.server) {
      if (m.to && m.to.trim().toLowerCase() !== name) continue;
      if (m.expires && m.expires < now && !this.isClaimed(m)) continue;
      out.push(m);
    }
    if (pl.mail.welcome) out.push(welcome);   // รับแล้ว: เก็บไว้ท้ายรายการ
    return out;
  }

  unread() { return this.list().filter((m) => !this.isClaimed(m)).length; }

  find(id) { return this.list().find((m) => String(m.id) === String(id)) || null; }

  changed() { if (this.onChange) this.onChange(); }

  // ดึงจดหมายจากเซิร์ฟเวอร์ (เงียบ ๆ ถ้าเซิร์ฟเวอร์ยังไม่มีระบบจดหมาย)
  refresh() {
    const o = this.online;
    if (!o) { this.changed(); this.notifyNew(); return Promise.resolve(); }
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const r = await o.fetchMail();
        this.server = (r.mails || []).map(normMail).filter(Boolean);
        this.claimed = new Set((r.claims || []).map((c) => `${c.mail_id}:${c.cid}`));
        this.admin = !!r.admin; this.serverOk = true;
      } catch (e) {
        this.serverOk = false;
        if (!this.warnedSql) { this.warnedSql = true; console.warn('[Everlevel] ระบบจดหมายบนเซิร์ฟเวอร์ยังไม่พร้อม (รัน supabase/mail.sql หรือยัง?)', e && (e.message || e.code)); }
      } finally { this.loading = null; }
      this.changed();
      this.notifyNew();
    })();
    return this.loading;
  }

  update(dt) {
    if (!this.online) return;
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = REFRESH_SEC; this.refresh(); }
  }

  // แจ้งในแชตเมื่อมีจดหมายใหม่ที่ยังไม่เคยแจ้ง
  notifyNew() {
    const fresh = this.list().filter((m) => !this.isClaimed(m) && !this.seen.has(String(m.id)));
    for (const m of fresh) this.seen.add(String(m.id));
    if (!fresh.length) return;
    const gift = fresh.some(hasGift);
    this.g.hud.log(`📬 มีจดหมายใหม่ ${fresh.length} ฉบับ${gift ? ' (มีของแนบ)' : ''} — กด M หรือปุ่ม 📬 เพื่อเปิดอ่าน`, 'lv');
    this.g.sfx('questDone');
  }

  // รับของในจดหมาย · choice = { set: 's_xxx', pet: 'hamster' } · คืน { ok, msg, got[] }
  async claim(id, choice = {}) {
    const g = this.g, pl = g.player, m = this.find(id);
    if (!m) return { ok: false, msg: 'ไม่พบจดหมายนี้ (อาจหมดอายุแล้ว)' };
    if (this.isClaimed(m)) return { ok: false, msg: 'รับของในจดหมายนี้ไปแล้ว' };
    if (m.expires && m.expires < Date.now()) return { ok: false, msg: 'จดหมายหมดอายุแล้ว' };
    for (const p of m.picks) if (!p.options.includes(choice[p.kind])) return { ok: false, msg: p.kind === 'set' ? 'เลือกชุดแฟชั่นก่อน 1 เซ็ต' : 'เลือกสัตว์เลี้ยงก่อน 1 ตัว' };
    if (m.items.length && !pl.inventory.fits(m.items)) return { ok: false, msg: 'กระเป๋าไม่พอ — ทิ้งหรือฝากของก่อนแล้วกดรับใหม่' };
    if (!m.local) {
      const o = this.online;
      if (!o) return { ok: false, msg: 'ต้องเชื่อมต่อเซิร์ฟเวอร์ก่อนรับของ' };
      const err = await o.claimMail(m.id, m.per === 'char' ? pl.cid : 'acct');
      if (err === 'claimed') { this.claimed.add(this.key(m)); this.changed(); return { ok: false, msg: 'รับของในจดหมายนี้ไปแล้ว (อาจรับจากตัวละครอื่นในบัญชี)' }; }
      if (err) return { ok: false, msg: 'รับของไม่สำเร็จ: ' + err };
      this.claimed.add(this.key(m));
    } else pl.mail.welcome = true;

    // มอบของ
    const got = [];
    for (const [iid, q] of m.items) { const n = pl.inventory.add(iid, q); if (n) got.push(`${ITEMS[iid].name} x${n}`); }
    if (m.zeny) { pl.zeny = Math.min(MAX_ZENY, pl.zeny + m.zeny); got.push(`${m.zeny.toLocaleString('en-US')} Zeny`); }
    let setIds = null, petId = null;
    if (choice.set && m.picks.some((p) => p.kind === 'set')) {
      const s = setById(choice.set);
      setIds = s.items;
      let n = 0; for (const cid of s.items) if (pl.addFashion(cid)) n++;
      got.push(`ชุดแฟชั่นเซ็ต "${s.name}"${n < s.items.length ? ` (ชิ้นใหม่ ${n}/${s.items.length})` : ''}`);
    }
    if (choice.pet && m.picks.some((p) => p.kind === 'pet')) {
      petId = choice.pet;
      const r = pl.addPet(petId);
      got.push(r && r.kind === 'star' ? `${PETS[petId].name} (ตัวซ้ำ → ดาว +1)` : r && r.kind === 'zeny' ? `${PETS[petId].name} (ครบ ★5 → ${r.zeny} Zeny)` : `สัตว์เลี้ยง ${PETS[petId].name}`);
    }
    g.hud.log(`📬 รับของจาก "${m.title}": ${got.join(' · ') || 'อ่านแล้ว'}`, 'lv');
    if (hasGift(m)) { g.sfx('levelUp', { gap: 0 }); g.gfx.floatText(pl, 'ได้รับของขวัญ!', 'loot r-epic', { h: 2.2, life: 1.8, rise: 0.7, drift: false }); }
    // ของขวัญต้อนรับ: ยังไม่มีชุด/สัตว์เลี้ยง → สวมให้และเรียกออกมาเลย
    if (m.local && setIds && !Object.keys(pl.fashion.worn).length) g.wearFashionSet(setIds);
    if (m.local && petId && !pl.pets.active) g.summonPet(petId);
    g.refreshItemsUI(); g.hud.setPlayer(pl); g.status.render(); g.ward.render(); g.petWin.render();
    g.dirty = true;
    g.saveNow(false, true);   // บันทึกทันที กันรับซ้ำ
    this.changed();
    return { ok: true, msg: got.join(' · '), got, setIds, petId };
  }

  // จดหมายที่ไม่มีของแนบ: กดอ่านแล้วนับเป็นอ่านแล้ว
  async markRead(id) {
    const m = this.find(id);
    if (!m || hasGift(m) || this.isClaimed(m) || m.local) return;
    const o = this.online; if (!o) return;
    const err = await o.claimMail(m.id, m.per === 'char' ? this.g.player.cid : 'acct');
    if (!err || err === 'claimed') { this.claimed.add(this.key(m)); this.changed(); }
  }
}
