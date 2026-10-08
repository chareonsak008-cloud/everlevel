// ข้อมูลจดหมาย (v0.15) — ของขวัญต้อนรับผู้เล่นใหม่ + ตรวจข้อมูลจดหมายจากเซิร์ฟเวอร์
import { ITEMS } from './items.js';
import { SETS, COSTUME_BY_ID } from './costumes.js';
import { PETS } from './pets.js';
import { TIER_RANK } from './fashionBoxes.js';

// ชุดเซ็ตเริ่มต้นให้เลือก 1 เซ็ต (ระดับธรรมดา–หายาก ไม่แย่งของในกล่องสุ่ม) · สัตว์เลี้ยงระดับธรรมดา–หายาก
export const WELCOME_SETS = ['s_summer', 's_halloween', 's_ninja', 's_kitty', 's_cafe', 's_snowfest'];
export const WELCOME_PETS = ['hamster', 'squirrel', 'turtle', 'finch'];

export const WELCOME_MAIL = {
  id: 'welcome', local: true, per: 'char',
  sender: 'Everlevel', title: 'ของขวัญต้อนรับนักผจญภัยใหม่ 🎁',
  body: 'ยินดีต้อนรับสู่ Asteria Town! เลือกชุดแฟชั่นที่ชอบ 1 เซ็ต และสัตว์เลี้ยงคู่ใจ 1 ตัว พร้อมรับของใช้เริ่มต้นไว้ออกผจญภัยได้เลย\n— ทีมงาน Everlevel',
  items: [['red_potion', 20], ['blue_potion', 5], ['return_scroll', 3], ['warp_leaf', 5]],
  zeny: 2000,
  picks: [{ kind: 'set', options: WELCOME_SETS }, { kind: 'pet', options: WELCOME_PETS }],
};

export const PICK_LABEL = { set: 'เลือกชุดแฟชั่น 1 เซ็ต', pet: 'เลือกสัตว์เลี้ยง 1 ตัว' };
export const MAIL_MAX_ITEMS = 10;
export const MAIL_MAX_ZENY = 100000000;
export const setById = (id) => SETS.find((s) => s.id === id) || null;
export const setTier = (s) => s.rarity || s.items.map((id) => COSTUME_BY_ID[id]).reduce((t, c) => (c && TIER_RANK[c.rarity] > TIER_RANK[t] ? c.rarity : t), 'common');

const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

// ตรวจ/ทำความสะอาดจดหมายจากเซิร์ฟเวอร์ (ไอเทมที่ไม่มีในเกมถูกตัดทิ้ง)
export function normMail(r) {
  if (!r || typeof r !== 'object') return null;
  const items = [];
  for (const e of Array.isArray(r.items) ? r.items : []) {
    const [id, q] = Array.isArray(e) ? e : [e && e.id, e && e.qty];
    const qty = Math.max(1, Math.min(999, Math.floor(+q) || 1));
    if (ITEMS[id] && items.length < MAIL_MAX_ITEMS) items.push([id, qty]);
  }
  const picks = [];
  for (const p of Array.isArray(r.picks) ? r.picks : []) {
    if (!p || !['set', 'pet'].includes(p.kind) || picks.some((x) => x.kind === p.kind)) continue;
    const ok = (id) => (p.kind === 'set' ? !!setById(id) : !!PETS[id]);
    const options = [...new Set(Array.isArray(p.options) ? p.options.filter(ok) : [])].slice(0, 40);
    if (options.length) picks.push({ kind: p.kind, options });
  }
  return {
    id: r.id, local: !!r.local,
    sender: str(r.sender, 24) || 'GM', title: str(r.title, 60) || '(ไม่มีหัวข้อ)', body: str(r.body, 600),
    items, zeny: Math.max(0, Math.min(MAIL_MAX_ZENY, Math.floor(+r.zeny) || 0)), picks,
    per: r.per === 'char' ? 'char' : 'account', to: str(r.to_name, 16) || null,
    at: r.created_at ? Date.parse(r.created_at) || 0 : 0, expires: r.expires_at ? Date.parse(r.expires_at) || 0 : 0,
  };
}

export const hasGift = (m) => !!(m.items.length || m.zeny || m.picks.length);
