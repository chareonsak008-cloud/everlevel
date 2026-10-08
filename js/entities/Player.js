// ผู้เล่น: เดินด้วยคีย์บอร์ด / จอย / คลิกตามเส้นทาง + เลเวล EXP และค่าสถานะ
import { Entity } from './Entity.js';
import { PLAYER_SPEED, TILE } from '../config.js';
import {
  derive, baseExpToNext, jobExpToNext, statPointsForLevel, statCost,
  START_STAT_POINTS, MAX_STAT, STAT_KEYS, JOBS, jobStatBonus, JOB_CHANGE_JOB_LEVEL, FIRST_JOBS,
} from '../data/progression.js';
import { ITEMS, EQUIP_SLOTS, START_INVENTORY, START_EQUIP, START_HOTBAR, canJobUse } from '../data/items.js';
import { SKILLS, skillTrees } from '../data/skills.js';
import { Inventory } from '../systems/Inventory.js';
import { START_ZENY, MAX_ZENY } from '../data/shops.js';
import { COSTUME_BY_ID } from '../data/costumes.js';
import { CONSUMABLES } from '../data/consumables.js';
import { PETS, STAR_MAX, PET_DUP_ZENY } from '../data/pets.js';
import { normAuto } from '../systems/AutoHunt.js';

// v0.13: บัฟจากไอเทม — คีย์ที่เป็นตัวคูณ/ความสามารถพิเศษ (ไม่ใช่ค่าสถานะ)
const SPECIAL_BUFF_KEYS = new Set(['exp', 'jexp', 'drop', 'card', 'petRadius', 'petSpeedPct', 'dmgCutSnow', 'dmgCutLava', 'combatRegen']);
const KEEP_ON_DEATH = new Set(['boost', 'pet']);   // หมวดที่ไม่หายตอนหมดสติ (ใบคูณ · ขนมสัตว์เลี้ยง)
export const MAX_ITEM_BUFF = 3 * 3600;               // ต่อเวลาใบคูณได้สูงสุด 3 ชั่วโมง
export const BAG_BASE = 60;

// ช่องแฟชั่น (v0.9) — ชุดทับ ไม่เพิ่มค่าสถานะ
export const FASHION_SLOTS = ['wings', 'outfit', 'head', 'face', 'back', 'weapon', 'aura', 'pet'];
// อาวุธแฟชั่นจะแสดงเมื่อถืออาวุธจริงประเภทที่เข้ากัน (ท่าโจมตีจะได้ตรงกับอาวุธ)
export const FASHION_WEAPON_FIT = { sword: ['sword', 'knife'], dual: ['knife', 'sword'], staff: ['staff'], mace: ['mace'], bow: ['bow'] };

export const PLAYER_LOOK = {
  hair: '#e8a838', skin: '#f6d2b0', eye: '#2a2030', tunic: '#3f6fc4',
  pants: '#5a4634', boot: '#3a2a20', belt: '#8a5a30', accessory: 'backpack', hairStyle: 'spiky', weapon: 'knife', scarf: '#d8433a',
};

// ชุดประจำอาชีพ (ทับหน้าตาพื้นฐาน ก่อนใส่อุปกรณ์)
export const JOB_LOOK = {
  novice: {},
  swordsman: { tunic: '#9a3a3a', pants: '#4a3a34', belt: '#3a2a20', boot: '#2e2420', scarf: null, accessory: 'none', jobGear: 'swordsman' },
  mage: { tunic: '#3e3a8a', pants: '#2e2a4a', belt: '#e8c050', boot: '#2a2238', scarf: '#e8c050', accessory: 'none', jobGear: 'mage' },
  archer: { tunic: '#3f7a3a', pants: '#5a4630', belt: '#7a5232', boot: '#4a3020', scarf: '#c9a24a', accessory: 'quiver', jobGear: 'archer' },
  acolyte: { tunic: '#f2ead8', pants: '#5a4a6a', belt: '#c94a3a', boot: '#3a2a30', scarf: '#c94a3a', accessory: 'none', jobGear: 'acolyte' },
};

// ช่องปุ่มลัดเก็บได้ทั้งไอเทม (id) และสกิล ('skill:id')
export const isSkillKey = (k) => typeof k === 'string' && k.startsWith('skill:');
export const validHotkey = (k) => (isSkillKey(k) ? !!SKILLS[k.slice(6)] : !!ITEMS[k]);

export class Player extends Entity {
  constructor(name, x, y) {
    super({ name, x, y, look: PLAYER_LOOK });
    this.speed = PLAYER_SPEED;
    this.path = [];
    this.pendingTalk = null;
    this.arrived = false;

    // เลเวลและค่าสถานะ
    this.jobId = 'novice';
    this.baseLevel = 1;
    this.jobLevel = 1;
    this.baseExp = 0;
    this.jobExp = 0;
    this.attr = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 };
    this.statPoints = START_STAT_POINTS;
    this.skillPoints = 0;
    // ไอเทม
    this.inventory = new Inventory(60);
    for (const [id, n] of START_INVENTORY) this.inventory.add(id, n);
    this.equip = {};
    for (const sl of EQUIP_SLOTS) this.equip[sl.id] = START_EQUIP[sl.id] || null;
    this.hotbar = [...START_HOTBAR];
    this.zeny = START_ZENY;
    // สกิล (v0.6)
    this.skills = { first_aid: 1 };   // id → เลเวล
    this.buffs = [];                  // { id, lv, left, total, bonus }
    this.itemBuffs = {};              // v0.13: บัฟจากไอเทม group → { id, left }
    this.pets = { owned: {}, active: null, filter: 'all' };   // v0.13: สัตว์เลี้ยง id → ดาว
    this.bagUps = 0;                  // v0.13: ใช้กระเป๋าขยายไปแล้วกี่ใบ
    this.visited = new Set(['asteria_town']);   // v0.13: แผนที่ที่เคยไป (ใบวาร์ปเลือกแผนที่)
    this.auto = normAuto();           // v0.14: ตั้งค่าตีมอนออโต้ (แยกตามตัวละคร)
    this.cooldowns = {};              // id → เวลาเกมที่ใช้ได้อีกครั้ง
    this.cast = null;                 // กำลังร่าย { id, lv, target, t, total }
    this.pendingSkill = null;         // รอเดินเข้าระยะก่อนใช้สกิล
    this.weaponType = 'none';
    // แฟชั่น (v0.9): owned = ชิ้นที่สะสมได้ · worn = slot → id · opened = จำนวนกล่องที่เปิด
    this.fashion = { owned: new Set(), worn: {}, opened: 0, hidden: false };
    // เควส (v0.10): active = id → { prog: [จำนวนต่อเป้าหมาย] } · done = id → วันที่ส่ง (เควสรายวันรีเซ็ตทุกวัน)
    this.quests = { active: {}, done: {} };
    this.appearance = { hair: PLAYER_LOOK.hair, hairStyle: PLAYER_LOOK.hairStyle };   // v0.11: เลือกตอนสร้างตัวละคร
    this.baseLook = { ...PLAYER_LOOK };
    this.look = this.computeLook();

    this.attackRange = 24;    // ระยะโจมตีระยะประชิด (พิกเซลโลก)
    this.attackCd = 0;
    this.target = null;
    this.dead = false;
    this.lastHitAt = -99;
    this.recalc();
    this.hp = this.maxHp; this.sp = this.maxSp;
  }

  get job() { return (JOBS[this.jobId] || JOBS.novice).name; }

  get jobDef() { return JOBS[this.jobId] || JOBS.novice; }

  // รวมโบนัสจากอุปกรณ์ที่สวมใส่
  equipBonus() {
    const bonus = {};
    for (const id of Object.values(this.equip)) {
      const it = id && ITEMS[id]; if (!it || !it.bonus) continue;
      for (const [k, v] of Object.entries(it.bonus)) bonus[k] = (bonus[k] || 0) + v;
    }
    return bonus;
  }

  // โบนัสทั้งหมด: อุปกรณ์ + Job Level + สกิลติดตัว + บัฟ
  bonusSources() {
    const bonus = this.equipBonus();
    const add = (o) => { for (const [k, v] of Object.entries(o || {})) bonus[k] = (bonus[k] || 0) + v; };
    add(jobStatBonus(this.jobId, this.jobLevel));
    for (const [id, lv] of Object.entries(this.skills)) {
      const sk = SKILLS[id];
      if (sk && sk.passive && lv > 0) add(sk.passive(lv, this));
    }
    for (const b of this.buffs) add(b.bonus);
    for (const b of Object.values(this.itemBuffs || {})) {
      const u = CONSUMABLES[b.id] && CONSUMABLES[b.id].use.buff;
      if (u) for (const [k, v] of Object.entries(u)) if (!SPECIAL_BUFF_KEYS.has(k)) bonus[k] = (bonus[k] || 0) + v;
    }
    return bonus;
  }

  statInput() {
    const w = this.equip.weapon && ITEMS[this.equip.weapon];
    this.weaponType = w ? w.wtype || 'knife' : 'none';
    return { baseLevel: this.baseLevel, attr: this.attr, bonus: this.bonusSources(), weaponName: w ? w.name : 'มือเปล่า', weaponType: this.weaponType, job: this.jobId };
  }

  // หน้าตาตัวละครเปลี่ยนตามอาชีพ + อุปกรณ์ (อาวุธ โล่ หมวก ชุด ผ้าคลุม)
  computeLook() {
    const L = { ...this.baseLook, ...(JOB_LOOK[this.jobId] || {}), weapon: 'none' };
    for (const sl of EQUIP_SLOTS) {
      const it = this.equip[sl.id] && ITEMS[this.equip[sl.id]];
      if (it && it.visual) Object.assign(L, it.visual);
    }
    return L;
  }

  // v0.11: สีผม/ทรงผมที่เลือกตอนสร้างตัวละคร
  setAppearance(a) {
    const A = a && typeof a === 'object' ? a : {};
    const hair = typeof A.hair === 'string' && /^#[0-9a-f]{6}$/i.test(A.hair) ? A.hair : PLAYER_LOOK.hair;
    const hairStyle = ['spiky', 'short', 'ponytail'].includes(A.hairStyle) ? A.hairStyle : PLAYER_LOOK.hairStyle;
    this.appearance = { hair, hairStyle };
    this.baseLook = { ...PLAYER_LOOK, hair, hairStyle };
    this.look = this.computeLook();
  }

  /* ---------- แฟชั่น (v0.9) ---------- */
  fashionFits(it) { return it.slot !== 'weapon' || (FASHION_WEAPON_FIT[it.wtype] || []).includes(this.weaponType); }

  // ชิ้นแฟชั่นที่แสดงบนตัวจริง (slot → ข้อมูลชิ้น) — อาวุธแฟชั่นที่ไม่เข้ากับอาวุธที่ถือจะถูกซ่อน
  fashionItems() {
    const out = {};
    if (this.fashion.hidden) return out;
    for (const [slot, id] of Object.entries(this.fashion.worn)) {
      const it = COSTUME_BY_ID[id];
      if (it && it.slot === slot && this.fashion.owned.has(id) && this.fashionFits(it)) out[slot] = it;
    }
    return out;
  }

  // คืนค่า true ถ้าเป็นชิ้นใหม่
  addFashion(id) {
    if (!COSTUME_BY_ID[id] || this.fashion.owned.has(id)) return false;
    this.fashion.owned.add(id);
    return true;
  }

  wearFashion(id) {
    const it = COSTUME_BY_ID[id];
    if (!it) return 'ไม่พบชิ้นแฟชั่นนี้';
    if (!this.fashion.owned.has(id)) return 'ยังไม่มีชิ้นแฟชั่นนี้';
    this.fashion.worn[it.slot] = id;
    this.fashion.hidden = false;
    this.look = this.computeLook();
    return null;
  }

  takeOffFashion(slot) {
    if (!this.fashion.worn[slot]) return false;
    delete this.fashion.worn[slot];
    this.look = this.computeLook();
    return true;
  }

  // คำนวณค่าต่อสู้ใหม่ทุกครั้งที่เลเวล/สเตตัส/อุปกรณ์เปลี่ยน
  recalc() {
    const input = this.statInput();
    const d = derive(input);
    this.derived = d;
    this.bonus = input.bonus;
    this.stats = { atk: d.atk, matk: d.matk, def: d.def, mdef: d.mdef, hit: d.hit, flee: d.flee, crit: d.crit };
    this.aspd = d.delay;
    this.speed = PLAYER_SPEED * (1 + (input.bonus.speedPct || 0) / 100);
    // ธนูยิงได้ไกล 5 ช่อง (+ สกิลสายตาไกล) อาวุธอื่นตีระยะประชิด
    this.attackRange = this.weaponType === 'bow' ? (5 + (input.bonus.rangeTiles || 0)) * TILE : 24;
    this.maxHp = d.maxHp; this.maxSp = d.maxSp;
    this.hp = Math.min(this.hp ?? d.maxHp, d.maxHp);
    this.sp = Math.min(this.sp ?? d.maxSp, d.maxSp);
  }

  get baseNext() { return baseExpToNext(this.baseLevel); }
  get jobNext() { return jobExpToNext(this.jobLevel, this.jobId); }

  /* ---------- รีเซ็ตสเตตัส (v0.10) ---------- */
  // แต้มที่จะได้คืนทั้งหมด = ผลรวมราคาที่จ่ายไปเพื่ออัปจาก 1 ถึงค่าปัจจุบัน
  statRefund() {
    let n = 0;
    for (const k of STAT_KEYS) for (let v = 1; v < this.attr[k]; v++) n += statCost(v);
    return n;
  }

  resetStats() {
    const n = this.statRefund();
    if (!n) return 0;
    for (const k of STAT_KEYS) this.attr[k] = 1;
    this.statPoints += n;
    this.recalc();
    return n;
  }

  canRaise(stat) {
    const v = this.attr[stat];
    return v < MAX_STAT && this.statPoints >= statCost(v);
  }

  // เพิ่มสเตตัสทีละหน่วย (สูงสุด times ครั้ง) คืนค่าจำนวนที่เพิ่มได้จริง
  raise(stat, times = 1) {
    let n = 0;
    while (n < times && this.canRaise(stat)) {
      this.statPoints -= statCost(this.attr[stat]);
      this.attr[stat]++;
      n++;
    }
    if (n) {
      const nd = derive(this.statInput());
      const hpGain = nd.maxHp - this.maxHp;
      const spGain = nd.maxSp - this.maxSp;
      this.recalc();
      if (hpGain > 0) this.hp = Math.min(this.maxHp, this.hp + hpGain);
      if (spGain > 0) this.sp = Math.min(this.maxSp, this.sp + spGain);
    }
    return n;
  }

  // ได้รับ EXP → คืนรายการเหตุการณ์เลเวลอัปเพื่อให้เกมแสดงผล
  gainExp(base, job) {
    const events = [];
    this.baseExp += base;
    while (this.baseExp >= this.baseNext) {
      this.baseExp -= this.baseNext;
      this.baseLevel++;
      const pts = statPointsForLevel(this.baseLevel);
      this.statPoints += pts;
      events.push({ kind: 'base', level: this.baseLevel, points: pts });
    }
    if (this.baseNext === Infinity) this.baseExp = 0;
    if (this.jobNext !== Infinity) {
      this.jobExp += job;
      while (this.jobExp >= this.jobNext) {
        this.jobExp -= this.jobNext;
        this.jobLevel++;
        this.skillPoints++;
        events.push({ kind: 'job', level: this.jobLevel, points: 1 });
      }
      if (this.jobNext === Infinity) this.jobExp = 0;
    }
    if (events.length) {
      this.recalc();
      if (events.some((e) => e.kind === 'base')) { this.hp = this.maxHp; this.sp = this.maxSp; } // เลเวลอัปฟื้นเต็ม
    }
    return events;
  }

  /* ---------- ไอเทม ---------- */

  // ใช้ไอเทมฟื้นฟู: คืนค่า { hp, sp } ที่ฟื้นจริง หรือ null ถ้าใช้ไม่ได้
  useItem(id) {
    const it = ITEMS[id];
    if (!it || it.type !== 'usable' || this.inventory.count(id) <= 0 || this.dead) return null;
    const roll = (r) => (r ? r[0] + Math.floor(Math.random() * (r[1] - r[0] + 1)) : 0);
    const hp = Math.min(this.maxHp - this.hp, roll(it.heal && it.heal.hp));
    const sp = Math.min(this.maxSp - this.sp, roll(it.heal && it.heal.sp));
    this.hp += hp; this.sp += sp;
    this.inventory.remove(id, 1);
    return { hp, sp };
  }

  // สวมใส่: คืนข้อความผิดพลาด หรือ null ถ้าสำเร็จ
  equipItem(id) {
    const it = ITEMS[id];
    if (!it || it.type !== 'equip') return 'ไอเทมนี้สวมใส่ไม่ได้';
    if (this.inventory.count(id) <= 0) return 'ไม่มีไอเทมนี้ในกระเป๋า';
    if (it.reqLevel && this.baseLevel < it.reqLevel) return `ต้องการ Base Lv.${it.reqLevel}`;
    if (!canJobUse(it, this.jobId)) return `${this.job} สวมใส่ ${it.name} ไม่ได้`;
    const old = this.equip[it.slot];
    this.inventory.remove(id, 1);
    if (old) this.inventory.add(old, 1);
    this.equip[it.slot] = id;
    this.afterEquipChange();
    return null;
  }

  unequip(slot) {
    const id = this.equip[slot];
    if (!id) return 'ช่องนี้ว่างอยู่แล้ว';
    if (!this.inventory.canAdd(id)) return 'กระเป๋าเต็ม';
    this.inventory.add(id, 1);
    this.equip[slot] = null;
    this.afterEquipChange();
    return null;
  }

  afterEquipChange() {
    const oldMax = this.maxHp, oldSp = this.maxSp;
    this.recalc();
    if (this.maxHp > oldMax) this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - oldMax));
    if (this.maxSp > oldSp) this.sp = Math.min(this.maxSp, this.sp + (this.maxSp - oldSp));
    this.look = this.computeLook();
  }

  // เงิน Zeny
  addZeny(n) { this.zeny = Math.min(MAX_ZENY, this.zeny + Math.max(0, Math.floor(n))); }
  spendZeny(n) { n = Math.floor(n); if (n < 0 || n > this.zeny) return false; this.zeny -= n; return true; }

  setPath(points) { this.path = points; this.arrived = false; }
  stop() { this.path = []; this.pendingTalk = null; }

  update(dt, vec, map) {
    let dx = 0, dy = 0;
    this.arrived = false;
    const len = Math.hypot(vec.x, vec.y);

    if (len > 0) {
      this.stop();
      const m = Math.min(1, len);
      dx = (vec.x / len) * m * this.speed * dt;
      dy = (vec.y / len) * m * this.speed * dt;
    } else if (this.path.length) {
      const t = this.path[0];
      const ex = t.x - this.x, ey = t.y - this.y, d = Math.hypot(ex, ey);
      const step = this.speed * dt;
      if (d <= step) {
        dx = ex; dy = ey; this.path.shift();
        if (!this.path.length) this.arrived = true;
      } else { dx = (ex / d) * step; dy = (ey / d) * step; }
    }

    if (dx || dy) {
      const moved = this.moveBy(dx, dy, map);
      this.face(dx, dy);
      this.moving = moved;
      this.speedFactor = moved ? Math.min(1, Math.hypot(dx, dy) / (this.speed * dt + 1e-6)) : 0;
      if (!moved && this.path.length) { this.path = []; this.arrived = true; }
    } else {
      this.moving = false;
      this.speedFactor = 0;
    }
  }

  /* ---------- สกิล ---------- */

  skillLv(id) { return this.skills[id] || 0; }

  // เรียนสกิลได้ไหม: คืนข้อความเหตุผลถ้าไม่ได้ (null = ได้)
  learnCheck(id) {
    const sk = SKILLS[id];
    if (!sk) return 'ไม่มีสกิลนี้';
    if (!skillTrees(this.jobId).includes(sk.job)) return `ต้องเป็น ${JOBS[sk.job].name}`;
    const lv = this.skillLv(id);
    if (lv >= sk.maxLv) return 'เลเวลสูงสุดแล้ว';
    if (sk.free) return 'ได้รับฟรีแล้ว';
    for (const [rid, rlv] of Object.entries(sk.req || {})) {
      if (this.skillLv(rid) < rlv) return `ต้องการ ${SKILLS[rid].name} Lv.${rlv}`;
    }
    if (this.skillPoints < 1) return 'Skill Point ไม่พอ';
    return null;
  }

  learn(id) {
    const why = this.learnCheck(id);
    if (why) return why;
    this.skillPoints--;
    this.skills[id] = this.skillLv(id) + 1;
    this.afterEquipChange();
    return null;
  }

  // บัฟ: ใส่ซ้ำจะรีเซ็ตเวลา
  addBuff(id, lv, bonus, duration) {
    this.buffs = this.buffs.filter((b) => b.id !== id);
    this.buffs.push({ id, lv, bonus, left: duration, total: duration });
    this.afterEquipChange();
  }

  // ลดเวลาบัฟ คืนรายการบัฟที่หมดเวลา
  updateBuffs(dt) {
    if (!this.buffs.length) return [];
    for (const b of this.buffs) b.left -= dt;
    const gone = this.buffs.filter((b) => b.left <= 0);
    if (gone.length) {
      this.buffs = this.buffs.filter((b) => b.left > 0);
      this.recalc();
      this.look = this.computeLook();
    }
    return gone;
  }

  /* ---------- บัฟจากไอเทม (v0.13) ---------- */
  // ผลรวม / ผลคูณของค่าพิเศษจากบัฟไอเทม เช่น exp, drop, petRadius
  itemBuffSum(key) { let v = 0; for (const b of Object.values(this.itemBuffs)) { const u = CONSUMABLES[b.id] && CONSUMABLES[b.id].use.buff; if (u && u[key]) v += u[key]; } return v; }
  itemBuffMul(key) { let m = 1; for (const b of Object.values(this.itemBuffs)) { const u = CONSUMABLES[b.id] && CONSUMABLES[b.id].use.buff; if (u && u[key]) m *= u[key]; } return m; }

  // ใช้บัฟ: กลุ่มเดียวกัน → ตัวเดิมต่อเวลา / ตัวแรงกว่าแทนที่ / ตัวอ่อนกว่าใช้ไม่ได้ · คืน { kind } หรือ { error }
  addItemBuff(id) {
    const it = CONSUMABLES[id];
    if (!it || !it.use.buff) return { error: 'ไอเทมนี้ไม่ใช่บัฟ' };
    const g = it.group || id, cur = this.itemBuffs[g];
    const power = (x) => { const v = Object.values(CONSUMABLES[x].use.buff)[0]; return typeof v === 'number' ? v : 0; };
    let kind = 'new';
    if (cur && CONSUMABLES[cur.id]) {
      if (cur.id === id) {
        if (cur.left >= MAX_ITEM_BUFF - 1) return { error: 'ต่อเวลาได้สูงสุด 3 ชั่วโมงแล้ว' };
        cur.left = Math.min(MAX_ITEM_BUFF, cur.left + it.dur); kind = 'extend';
      } else if (power(id) <= power(cur.id)) return { error: `มี${CONSUMABLES[cur.id].name}ที่แรงกว่าหรือเท่ากันทำงานอยู่` };
      else { this.itemBuffs[g] = { id, left: it.dur }; kind = 'replace'; }
    } else this.itemBuffs[g] = { id, left: it.dur };
    this.afterEquipChange();
    return { kind, prev: cur && cur.id, left: this.itemBuffs[g].left };
  }

  // ลดเวลาบัฟไอเทม คืนรายการ id ที่หมดเวลา
  updateItemBuffs(dt) {
    const gone = [];
    for (const [g, b] of Object.entries(this.itemBuffs)) { b.left -= dt; if (b.left <= 0 || !CONSUMABLES[b.id]) { gone.push(b.id); delete this.itemBuffs[g]; } }
    if (gone.length) this.afterEquipChange();
    return gone;
  }

  // หมดสติ: ยาบัฟหาย (ใบคูณและขนมสัตว์เลี้ยงยังอยู่)
  clearCombatBuffs() {
    let n = 0;
    for (const [g, b] of Object.entries(this.itemBuffs)) { const it = CONSUMABLES[b.id]; if (!it || !KEEP_ON_DEATH.has(it.cat)) { delete this.itemBuffs[g]; n++; } }
    if (n) this.recalc();
    return n;
  }

  // ขนาดกระเป๋า = 60 + กระเป๋าขยาย 10 ช่องต่อใบ + สัตว์เลี้ยงที่เรียกอยู่ (เต่าหีบสมบัติ +10)
  // ของที่เกินขนาด (เช่น เก็บเต่ากลับ) ยังอยู่ครบ แค่ใส่ของชนิดใหม่เพิ่มไม่ได้จนกว่าจะมีช่องว่าง
  updateBagCap() {
    const a = this.pets.active && PETS[this.pets.active];
    this.inventory.capacity = BAG_BASE + this.bagUps * 10 + ((a && a.mods.bag) || 0);
  }

  /* ---------- สัตว์เลี้ยง (v0.13) ---------- */
  // ได้สัตว์เลี้ยงจากการฟัก: ตัวใหม่ / ซ้ำ → ดาว +1 / ครบ ★5 → Zeny
  addPet(id) {
    const P = PETS[id]; if (!P) return null;
    const cur = this.pets.owned[id];
    if (cur == null) { this.pets.owned[id] = 0; return { kind: 'new', stars: 0 }; }
    if (cur < STAR_MAX) { this.pets.owned[id] = cur + 1; return { kind: 'star', stars: cur + 1 }; }
    const z = PET_DUP_ZENY[P.tier]; this.addZeny(z);
    return { kind: 'zeny', stars: cur, zeny: z };
  }

  // รีเซ็ตสกิล: คืนแต้มสกิลทั้งหมด (เก็บสกิลฟรี และทักษะพื้นฐานถ้าเปลี่ยนอาชีพแล้ว)
  resetSkills() {
    let n = 0; const keep = {};
    for (const [id, lv] of Object.entries(this.skills)) {
      const sk = SKILLS[id]; if (!sk) continue;
      if (sk.free || (id === 'basic' && this.jobId !== 'novice')) { keep[id] = lv; continue; }
      n += lv;
    }
    if (!n) return 0;
    if (!keep.first_aid) keep.first_aid = 1;
    this.skills = keep;
    this.skillPoints += n;
    this.buffs = [];
    this.hotbar = this.hotbar.map((k) => (isSkillKey(k) && !this.skills[k.slice(6)] ? null : k));
    this.afterEquipChange();
    return n;
  }

  /* ---------- เปลี่ยนอาชีพ ---------- */

  jobChangeStatus() {
    const basic = this.skillLv('basic');
    return {
      novice: this.jobId === 'novice',
      jobLv: this.jobLevel, needJob: JOB_CHANGE_JOB_LEVEL, basic, needBasic: 9,
      ok: this.jobId === 'novice' && this.jobLevel >= JOB_CHANGE_JOB_LEVEL && basic >= 9,
    };
  }

  // เปลี่ยนอาชีพ: คืนข้อมูล { removed: [ไอเทมที่ถอดออก], gift } หรือข้อความผิดพลาด
  changeJob(job) {
    if (!FIRST_JOBS.includes(job)) return { error: 'ไม่มีอาชีพนี้' };
    if (!this.jobChangeStatus().ok) return { error: 'ยังไม่ผ่านเงื่อนไขการเปลี่ยนอาชีพ' };
    this.jobId = job;
    this.jobLevel = 1;
    this.jobExp = 0;
    this.buffs = [];
    // ถอดอุปกรณ์ที่อาชีพใหม่ใช้ไม่ได้
    const removed = [];
    for (const sl of EQUIP_SLOTS) {
      const id = this.equip[sl.id];
      if (id && !canJobUse(ITEMS[id], job)) { this.inventory.add(id, 1); this.equip[sl.id] = null; removed.push(id); }
    }
    // อาวุธประจำอาชีพ: ถ้ามือว่างจะสวมให้ทันที
    // อาวุธประจำอาชีพ: สวมให้ทันที (เว้นแต่ถืออาวุธชนิดเดียวกันที่แรงกว่าอยู่แล้ว)
    const gift = JOBS[job].gift;
    let equippedGift = false;
    if (gift) {
      const cur = this.equip.weapon && ITEMS[this.equip.weapon], g = ITEMS[gift];
      const keep = cur && cur.wtype === g.wtype && (cur.bonus.atk || 0) > (g.bonus.atk || 0);
      if (keep) this.inventory.add(gift, 1);
      else { if (cur) this.inventory.add(this.equip.weapon, 1); this.equip.weapon = gift; equippedGift = true; }
    }
    this.afterEquipChange();
    this.hp = this.maxHp; this.sp = this.maxSp;
    return { removed, gift, equippedGift };
  }

  toSave() {
    return {
      name: this.name, x: Math.round(this.x), y: Math.round(this.y), dir: this.dir,
      job: this.jobId, baseLevel: this.baseLevel, jobLevel: this.jobLevel,
      baseExp: this.baseExp, jobExp: this.jobExp,
      attr: { ...this.attr }, statPoints: this.statPoints, skillPoints: this.skillPoints,
      inventory: this.inventory.toSave(), equip: { ...this.equip }, hotbar: [...this.hotbar], zeny: this.zeny,
      skills: { ...this.skills },
      hp: Math.round(this.hp), sp: Math.round(this.sp),
      fashion: { owned: [...this.fashion.owned], worn: { ...this.fashion.worn }, opened: this.fashion.opened, hidden: this.fashion.hidden },
      quests: JSON.parse(JSON.stringify(this.quests)),
      appearance: { ...this.appearance },
      // v0.13
      itemBuffs: Object.fromEntries(Object.entries(this.itemBuffs).map(([g, b]) => [g, { id: b.id, left: Math.max(1, Math.round(b.left)) }])),
      pets: { owned: { ...this.pets.owned }, active: this.pets.active, filter: this.pets.filter },
      bagUps: this.bagUps,
      visited: [...this.visited],
      auto: JSON.parse(JSON.stringify(this.auto)),   // v0.14
    };
  }

  // โหลดค่าจากเซฟ (รองรับเซฟเก่าที่ยังไม่มีระบบเลเวล)
  fromSave(p) {
    if (typeof p.name === 'string' && p.name.trim()) this.name = p.name.trim().slice(0, 16);
    this.setAppearance(p.appearance);
    if (p.job && JOBS[p.job]) this.jobId = p.job;
    const int = (v, d, min = 0) => (Number.isFinite(v) ? Math.max(min, Math.floor(v)) : d);
    this.baseLevel = int(p.baseLevel, 1, 1);
    this.jobLevel = int(p.jobLevel, 1, 1);
    this.baseExp = int(p.baseExp, 0);
    this.jobExp = int(p.jobExp, 0);
    if (p.attr) for (const k of STAT_KEYS) this.attr[k] = Math.min(MAX_STAT, int(p.attr[k], 1, 1));
    this.statPoints = int(p.statPoints, p.attr ? 0 : START_STAT_POINTS);
    this.skillPoints = int(p.skillPoints, 0);
    // v0.13: กระเป๋าขยาย (ตั้งขนาดก่อนโหลดของ) · บัฟไอเทม · สัตว์เลี้ยง
    this.bagUps = Math.min(4, int(p.bagUps, 0));
    this.visited = new Set(['asteria_town', ...(Array.isArray(p.visited) ? p.visited.filter((m) => typeof m === 'string' && m.length < 40).slice(0, 50) : [])]);
    this.auto = normAuto(p.auto);     // v0.14: ตั้งค่าออโต้
    this.itemBuffs = {};
    if (p.itemBuffs && typeof p.itemBuffs === 'object') {
      for (const [g, b] of Object.entries(p.itemBuffs)) {
        const it = b && CONSUMABLES[b.id];
        if (it && it.use.buff && (it.group || b.id) === g && Number.isFinite(b.left) && b.left > 0) this.itemBuffs[g] = { id: b.id, left: Math.min(MAX_ITEM_BUFF, b.left) };
      }
    }
    const PT = p.pets && typeof p.pets === 'object' ? p.pets : {};
    this.pets = { owned: {}, active: null, filter: ['all', 'skipCommon', 'rare'].includes(PT.filter) ? PT.filter : 'all' };
    if (PT.owned && typeof PT.owned === 'object') for (const [id, st] of Object.entries(PT.owned)) if (PETS[id]) this.pets.owned[id] = Math.max(0, Math.min(STAR_MAX, Math.floor(st) || 0));
    if (PT.active && this.pets.owned[PT.active] != null) this.pets.active = PT.active;
    if (Array.isArray(p.inventory)) { this.inventory.capacity = 999; this.inventory.fromSave(p.inventory); }
    this.updateBagCap();
    if (p.equip) for (const sl of EQUIP_SLOTS) this.equip[sl.id] = ITEMS[p.equip[sl.id]] ? p.equip[sl.id] : null;
    this.zeny = Math.min(MAX_ZENY, int(p.zeny, START_ZENY));
    if (Array.isArray(p.hotbar)) this.hotbar = Array.from({ length: 9 }, (_, i) => (validHotkey(p.hotbar[i]) ? p.hotbar[i] : null));
    this.skills = { first_aid: 1 };
    if (p.skills && typeof p.skills === 'object') {
      for (const [id, lv] of Object.entries(p.skills)) if (SKILLS[id]) this.skills[id] = Math.max(0, Math.min(SKILLS[id].maxLv, Math.floor(lv) || 0));
    }
    // เควส (v0.10) — ตรวจความถูกต้องใน systems/Quests.js ตอนโหลด
    const Q = p.quests && typeof p.quests === 'object' ? p.quests : {};
    this.quests = { active: Q.active && typeof Q.active === 'object' ? Q.active : {}, done: Q.done && typeof Q.done === 'object' ? Q.done : {} };
    // แฟชั่น (v0.9) — เซฟเก่าไม่มีข้อมูลนี้ → เริ่มว่าง
    const F = p.fashion && typeof p.fashion === 'object' ? p.fashion : {};
    this.fashion = { owned: new Set(Array.isArray(F.owned) ? F.owned.filter((id) => COSTUME_BY_ID[id]) : []), worn: {}, opened: int(F.opened, 0), hidden: !!F.hidden };
    if (F.worn && typeof F.worn === 'object') {
      for (const [slot, id] of Object.entries(F.worn)) if (FASHION_SLOTS.includes(slot) && COSTUME_BY_ID[id] && COSTUME_BY_ID[id].slot === slot && this.fashion.owned.has(id)) this.fashion.worn[slot] = id;
    }
    this.look = this.computeLook();
    this.recalc();
    if (Number.isFinite(p.hp) && p.hp > 0) this.hp = Math.min(this.maxHp, p.hp); else this.hp = this.maxHp;
    if (Number.isFinite(p.sp)) this.sp = Math.min(this.maxSp, p.sp);
  }
}
