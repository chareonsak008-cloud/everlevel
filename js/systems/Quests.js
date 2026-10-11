// ระบบเควส (v0.10): สถานะ ความคืบหน้า รับ/ส่ง/ยกเลิก — ข้อมูลเก็บใน player.quests (เซฟพร้อมตัวละคร)
import { weekKey } from '../data/events.js';
import { QUESTS, QUEST_KIND } from '../data/quests.js';
import { MONSTERS } from '../data/monsters.js';
import { ITEMS } from '../data/items.js';
import { MAPS } from '../data/maps/index.js';

// NPC ทุกตัวในทุกแผนที่ (ไว้บอกว่าเควสรับ/ส่งที่ไหน)
export const NPC_INDEX = {};
for (const [mapId, def] of Object.entries(MAPS)) for (const n of def.npcs || []) NPC_INDEX[n.id] = { name: n.name, title: n.title, map: mapId, mapName: def.name };
export const npcName = (id) => (NPC_INDEX[id] ? NPC_INDEX[id].name : id);
export const npcWhere = (id) => (NPC_INDEX[id] ? `${NPC_INDEX[id].name} (${NPC_INDEX[id].mapName})` : id);

// วันที่ตามเวลาเครื่อง (ใช้รีเซ็ตเควสรายวัน)
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function goalText(g) {
  switch (g.type) {
    case 'hunt': return 'กำจัดมอนสเตอร์ปกติ';
    case 'world': return 'ร่วมพิชิตบอสโลก';
    case 'kill': return `กำจัด${MONSTERS[g.mob] ? MONSTERS[g.mob].name : g.mob}`;
    case 'collect': return `เก็บ${ITEMS[g.item] ? ITEMS[g.item].name : g.item}`;
    case 'visit': return `เดินทางไปยัง ${MAPS[g.map] ? MAPS[g.map].name : g.map}`;
    case 'job': return 'เปลี่ยนเป็นอาชีพขั้นที่ 1';
    case 'refine': return 'ตีบวกอุปกรณ์สำเร็จ';
    case 'socket': return 'ใส่การ์ดในอุปกรณ์';
    case 'level': return `ถึง Base Lv.${g.n}`;
    default: return g.type;
  }
}

export function rewardText(r = {}) {
  const out = [];
  if (r.exp && (r.exp[0] || r.exp[1])) out.push(`Base EXP ${r.exp[0].toLocaleString('en-US')} · Job EXP ${r.exp[1].toLocaleString('en-US')}`);
  if (r.zeny) out.push(`${r.zeny.toLocaleString('en-US')} Zeny`);
  for (const [id, n] of r.items || []) out.push(`${ITEMS[id] ? ITEMS[id].name : id} x${n}`);
  return out;
}

export class QuestLog {
  constructor(player) {
    this.p = player;
    this.map = null;
    this.now = () => Date.now();
  }

  get st() { return this.p.quests; }

  // ล้างข้อมูลเควสที่ไม่มีแล้ว (เช่นเซฟจากเวอร์ชันอื่น)
  sanitize() {
    const st = this.st;
    for (const id of Object.keys(st.active)) {
      const q = QUESTS[id];
      if (!q) { delete st.active[id]; continue; }
      const a = st.active[id];
      if (!a || typeof a !== 'object') { delete st.active[id]; continue; }
      a.prog = q.goals.map((_, i) => Math.max(0, Math.floor((a.prog && a.prog[i]) || 0)));
    }
    for (const id of Object.keys(st.done)) if (!QUESTS[id]) delete st.done[id];
  }

  resetWeekly() {
    if(this.now()===null)return;
    const key = weekKey(this.now());
    for (const [id,a] of Object.entries(this.st.active)) if (QUESTS[id]?.kind === 'weekly' && a.week !== key) delete this.st.active[id];
  }

  isDone(id) {
    const q = QUESTS[id], d = this.st.done[id];
    if (!d) return false;
    return q.kind === 'weekly' ? d === weekKey(this.now()) : q.kind === 'daily' ? d === today() : true;
  }

  // locked | available | active | ready | done
  status(id) {
    this.resetWeekly();
    const q = QUESTS[id];
    if (!q) return 'locked';
    if(q.kind==='weekly' && this.now()===null)return 'locked';
    if (this.st.active[id]) return this.isComplete(id) ? 'ready' : 'active';
    if (this.isDone(id)) return 'done';
    if ((q.req || []).some((r) => !this.st.done[r])) return 'locked';
    if (this.p.baseLevel < (q.minLevel || 1)) return 'locked';
    return 'available';
  }

  lockReason(id) {
    const q = QUESTS[id];
    if(q.kind==='weekly' && this.now()===null)return 'รอเชื่อมต่อเวลาจากเซิร์ฟเวอร์';
    const miss = (q.req || []).filter((r) => !this.st.done[r]);
    if (miss.length) return `ต้องทำเควส "${QUESTS[miss[0]].name}" ก่อน`;
    if (this.p.baseLevel < (q.minLevel || 1)) return `ต้องการ Base Lv.${q.minLevel}`;
    return '';
  }

  // ความคืบหน้าแต่ละเป้าหมาย [{ text, cur, n, done }]
  progress(id) {
    const q = QUESTS[id], a = this.st.active[id], p = this.p;
    return q.goals.map((g, i) => {
      let cur = 0, n = g.n || 1;
      if (g.type === 'collect') cur = p.inventory.count(g.item);
      else if (g.type === 'job') cur = p.jobId !== 'novice' ? 1 : 0;
      else if (g.type === 'level') { cur = p.baseLevel; n = g.n; }
      else if (g.type === 'visit') cur = (a && a.prog[i]) || (this.map === g.map ? 1 : 0);
      else cur = (a && a.prog[i]) || 0;
      return { text: goalText(g), cur: Math.min(cur, n), n, done: cur >= n, type: g.type };
    });
  }

  isComplete(id) { return this.progress(id).every((g) => g.done); }

  activeIds() { this.resetWeekly(); return Object.keys(this.st.active).filter((id) => QUESTS[id]); }

  // รับเควส: ได้ไอเทมเริ่มต้นทันที (ถ้ากระเป๋าไม่พอ รับไม่ได้)
  accept(id) {
    const q = QUESTS[id];
    if (this.status(id) !== 'available') return { error: this.lockReason(id) || 'รับเควสนี้ไม่ได้' };
    if (q.give && !this.p.inventory.fits(q.give)) return { error: 'กระเป๋าเต็ม รับของจากเควสไม่ได้' };
    this.st.active[id] = { prog: q.goals.map((g) => (g.type === 'visit' && this.map === g.map ? 1 : 0)), at: this.now(), week: q.kind === 'weekly' ? weekKey(this.now()) : undefined };
    // v0.16: ของเริ่มต้นได้ครั้งเดียว — ยกเลิกแล้วคืนของครบถึงจะได้ใหม่ (กันรับ-ยกเลิกปั๊มของ)
    const gave = this.st.gave || (this.st.gave = {});
    if (!gave[id]) { for (const [it, n] of q.give || []) this.p.inventory.add(it, n); if (q.give && q.give.length) gave[id] = 1; }
    return { ok: true };
  }

  abandon(id) {
    if (!this.st.active[id]) return false;
    const q = QUESTS[id], gave = this.st.gave || {};
    if (q && gave[id]) {
      let all = true;
      for (const [it, n] of q.give || []) if (this.p.inventory.remove(it, n) < n) all = false;
      if (all) delete gave[id];   // คืนครบ → รับเควสใหม่ได้ของอีก
    }
    delete this.st.active[id];
    return true;
  }

  // ส่งเควส: หักไอเทมที่เก็บ แล้วคืนรางวัลให้ Game แจกต่อ
  turnIn(id) {
    const q = QUESTS[id];
    if (this.status(id) !== 'ready') return { error: 'ยังทำเควสไม่ครบ' };
    const items = (q.rewards && q.rewards.items) || [];
    const take = q.goals.filter((g) => g.type === 'collect');
    // จำลองหักของก่อน แล้วค่อยตรวจว่ารางวัลใส่กระเป๋าได้
    for (const g of take) this.p.inventory.remove(g.item, g.n);
    if (!this.p.inventory.fits(items)) {
      for (const g of take) this.p.inventory.add(g.item, g.n, true);   // คืนของที่หักไว้ (แม้กระเป๋าเกินช่อง)
      return { error: 'กระเป๋าเต็ม ทำช่องว่างก่อนรับรางวัลนะ' };
    }
    delete this.st.active[id];
    this.st.done[id] = q.kind === 'weekly' ? weekKey(this.now()) : q.kind === 'daily' ? today() : true;
    return { ok: true, rewards: q.rewards || {} };
  }

  // เหตุการณ์ในเกม → คืนรายการความคืบหน้าที่เปลี่ยน [{ id, text, cur, n }]
  bump(type, match, by = 1) {
    const out = [];
    for (const id of this.activeIds()) {
      const q = QUESTS[id], a = this.st.active[id];
      if(q.kind==='weekly' && this.now()===null)continue;
      q.goals.forEach((g, i) => {
        if (g.type !== type || !match(g)) return;
        const n = g.n || 1;
        if (a.prog[i] >= n) return;
        a.prog[i] = Math.min(n, a.prog[i] + by);
        out.push({ id, text: goalText(g), cur: a.prog[i], n });
      });
    }
    return out;
  }

  onKill(mobType) { return [...this.bump('kill', (g) => g.mob === mobType), ...(!MONSTERS[mobType]?.mvp ? this.bump('hunt',()=>true) : [])]; }
  onWorldBoss() { return this.bump('world',()=>true); }
  onRefine() { return this.bump('refine', () => true); }
  onSocket() { return this.bump('socket', () => true); }
  onMap(mapId) { this.map = mapId; return this.bump('visit', (g) => g.map === mapId); }

  // เควสที่เกี่ยวกับ NPC ตัวนี้
  forNpc(npcId) {
    const out = { ready: [], available: [], active: [] };
    for (const [id, q] of Object.entries(QUESTS)) {
      const s = this.status(id);
      if (s === 'ready' && q.turnIn === npcId) out.ready.push(id);
      else if (s === 'available' && q.giver === npcId) out.available.push(id);
      else if (s === 'active' && (q.turnIn === npcId || q.giver === npcId)) out.active.push(id);
    }
    return out;
  }

  // เครื่องหมายเหนือหัว NPC: ? = ส่งเควสได้ · ! = มีเควสใหม่ (เนื้อเรื่องสีทอง/รายวันสีเขียว)
  markFor(npcId) {
    const f = this.forNpc(npcId);
    if (f.ready.length) return '?';
    if (f.available.some((id) => QUESTS[id].kind !== 'daily')) return '!';
    if (f.available.length) return 'd';
    if (f.active.length) return '…';
    return null;
  }

  // เควสที่รับได้ทั้งหมด (สำหรับหน้าต่างเควส)
  availableIds() { return Object.keys(QUESTS).filter((id) => this.status(id) === 'available'); }
  kindName(id) { return QUEST_KIND[QUESTS[id].kind].name; }
}
