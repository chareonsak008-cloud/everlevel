// สูตรการต่อสู้ (แบบเรียบง่าย — ระบบค่าสถานะเต็มรูปแบบจะมาใน v0.3)
import { clamp } from '../core/util.js';

// คืนค่า { miss, crit, amount }
export function rollAttack(att, def, rnd = Math.random) {
  const hitChance = clamp((att.hit ?? 90) - (def.flee ?? 5), 30, 98) / 100;
  if (rnd() > hitChance) return { miss: true, crit: false, amount: 0 };
  const [lo, hi] = att.atk;
  let dmg = lo + Math.floor(rnd() * (hi - lo + 1));
  const crit = rnd() < (att.crit ?? 0);
  if (crit) dmg = Math.round(dmg * 1.5);           // คริติคอลทะลุเกราะ
  else dmg = Math.max(1, dmg - (def.def ?? 0));
  return { miss: false, crit, amount: dmg };
}

// ดาเมจสกิล (v0.6): mult = ตัวคูณ · magic = ใช้ MATK และไม่มีวันพลาด (ลดด้วย MDEF)
export function rollSkill(att, def, { mult = 1, magic = false, hitBonus = 0 } = {}, rnd = Math.random) {
  if (magic) {
    const [lo, hi] = att.matk || [1, 1];
    const base = lo + Math.floor(rnd() * (hi - lo + 1));
    return { miss: false, crit: false, amount: Math.max(1, Math.round(base * mult) - (def.mdef ?? 0)) };
  }
  const hitChance = clamp((att.hit ?? 90) + hitBonus - (def.flee ?? 5), 30, 100) / 100;
  if (rnd() > hitChance) return { miss: true, crit: false, amount: 0 };
  const [lo, hi] = att.atk;
  const base = lo + Math.floor(rnd() * (hi - lo + 1));
  return { miss: false, crit: false, amount: Math.max(1, Math.round(base * mult) - (def.def ?? 0)) };
}
