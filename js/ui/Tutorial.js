// v0.94 สอนผู้เล่นใหม่ (5–10 นาทีแรก) — การ์ดขั้นตอนเล็ก ๆ ใต้แถบด้านบน + ไฮไลต์ปุ่มที่ต้องกด
// เดิน → คุยกับมีร่า (รับเควสแรก) → ไป Beginner Field → ตีมอน → เก็บของ → เปิดกระเป๋า → อัปสเตตัส → จบ (รับรางวัลเล็กน้อย 1 ครั้งต่อตัวละคร)
// ช่วงที่ 2 (v0.94): สกิลพื้นฐาน → สวมอุปกรณ์ → ตีออโต้ → เก็บ Job Lv.10 + ทักษะพื้นฐาน Lv.9 → รู้จัก 4 อาชีพ → เปลี่ยนอาชีพกับออเรล → รางวัล
// ตัวละครที่เลเวลเกิน 10 หรือเคยทำ/ข้ามแล้ว ไม่แสดง · บันทึกใน player.tut / player.tut2 ('done' หรือเลขขั้น)
import { START_EQUIP } from '../data/items.js?v=0.93.0-p2.14';
import { ITEMS } from '../data/items.js?v=0.93.0-p2.14';

const touch = () => document.body.classList.contains('touch');
const STEPS = [
  { id: 'move', title: 'เดินสำรวจ', hint: () => (touch() ? 'แตะพื้นเพื่อเดิน หรือใช้จอยซ้ายล่าง' : 'คลิกพื้นเพื่อเดิน หรือกด W A S D'), done: (g, s) => Math.hypot(g.player.x - s.x, g.player.y - s.y) > 48 },
  { id: 'talk', title: 'รับเควสแรก', hint: () => `${touch() ? 'แตะ' : 'คลิก'} <b>มีร่า</b> ผู้นำทาง (มีเครื่องหมาย <b>!</b> เหนือหัว) แล้วกดรับเควส`, done: (g) => g.questLog.status('m1_first_steps') !== 'available' },
  { id: 'field', title: 'ออกไปที่ทุ่ง', hint: () => 'เดินตาม<b>ลูกศรสีทอง</b>ไปที่ประตูตะวันออก เข้าสู่ <b>Beginner Field</b>', done: (g) => g.map && g.map.id !== 'asteria_town' },
  { id: 'kill', title: 'ตีมอนสเตอร์', hint: () => (touch() ? 'แตะมอนสเตอร์ หรือกดปุ่ม ⚔ เพื่อโจมตีตัวที่ใกล้ที่สุด' : 'คลิกมอนสเตอร์ หรือกด <kbd>Space</kbd> เพื่อโจมตีตัวที่ใกล้ที่สุด'), done: (g, s) => s.kills > 0 },
  { id: 'loot', title: 'เก็บของที่ดรอป', hint: () => `${touch() ? 'แตะ' : 'คลิก'}ไอเทมที่ตกบนพื้น${touch() ? '' : ' หรือกด <kbd>Z</kbd>'} — สีพื้นหลังบอกระดับของ (เทา · เขียว · ฟ้า · ม่วง)`, done: (g, s) => s.loot > 0 },
  { id: 'bag', title: 'เปิดกระเป๋า', hint: () => `กดปุ่ม <b>กระเป๋า</b>${touch() ? '' : ' หรือ <kbd>I</kbd>'} — ${touch() ? 'แตะ' : 'ดับเบิลคลิก'}อุปกรณ์เพื่อสวม ใช้ปุ่ม ⇅ จัดเรียงได้`, target: '#btnInv', menu: 'inv', done: (g, s) => s.bag > 0 || (g.inv && g.inv.open) },
  { id: 'stat', title: 'อัปค่าสถานะ', hint: () => `กดปุ่ม <b>สถานะ</b>${touch() ? '' : ' หรือ <kbd>C</kbd>'} แล้วกด + เพิ่มค่าที่เหมาะกับสายที่อยากเป็น (STR ตีแรง · AGI ตีเร็ว · INT เวท · DEX แม่น)`, target: '#btnStatus', menu: 'status', done: (g, s) => attrSum(g.player) > s.attr },
];
const attrSum = (p) => Object.values(p.attr || {}).reduce((a, v) => a + (+v || 0), 0);
const gearChanged = (p) => Object.entries(p.equip || {}).some(([sl, k]) => k && k !== START_EQUIP[sl]);
const JOBS4 = [
  ['⚔', 'นักดาบ', 'swordsman', 'ยืนหน้า ทนทาน ตีแรง', 'STR · VIT · DEX'],
  ['🏹', 'นักธนู', 'archer', 'ยิงไกล ตีเร็ว คริแรง', 'DEX · AGI · LUK'],
  ['🔮', 'นักเวท', 'mage', 'เวทวงกว้าง ดาเมจสูง ตัวบาง', 'INT · DEX'],
  ['✚', 'นักบวช', 'acolyte', 'ฮีล บัฟเพื่อน เล่นปาร์ตี้ดี', 'INT · VIT · DEX'],
];
const STEPS2 = [
  { id: 'skill', title: 'เรียนสกิลพื้นฐาน', hint: () => `กดปุ่ม <b>สกิล</b>${touch() ? '' : ' หรือ <kbd>K</kbd>'} แล้วใช้แต้มสกิลอัป <b>ทักษะพื้นฐาน</b> — ต้องถึง Lv.9 ถึงจะเปลี่ยนอาชีพได้`, target: '#btnSkill', menu: 'skill', done: (g) => g.player.skillLv('basic') >= 1 },
  { id: 'gear', title: 'สวมอุปกรณ์ใหม่', hint: () => `เก็บอุปกรณ์จากมอน หรือซื้อที่<b>ร้านอาวุธ/ชุดเกราะ</b>ในเมือง แล้วเปิดกระเป๋า${touch() ? 'แตะ' : 'ดับเบิลคลิก'}เพื่อสวม · ดูทั้งตัวได้ที่<b>เหรียญอาชีพ</b>${touch() ? '' : ' หรือ <kbd>G</kbd>'}`, target: '#btnInv', menu: 'inv', done: (g) => gearChanged(g.player) || g.player.baseLevel >= 8 },
  { id: 'auto', title: 'ลองตีออโต้', hint: () => `กดปุ่ม <b>AUTO</b> มุมล่าง${touch() ? '' : ' หรือ <kbd>Z</kbd>'} ตัวละครจะตีมอนในวงให้เอง (ใช้ได้นอกเมือง) · ตั้งค่าเก็บของ/ใช้ยาได้ที่ปุ่มฟันเฟือง`, target: '.ad-go', menu: 'auto', done: (g, s) => s.auto > 0 || !!(g.auto && g.auto.on) },
  { id: 'grind', title: 'ฝึกให้พร้อมเปลี่ยนอาชีพ', hint: (g) => { const s = g.player.jobChangeStatus(); return `ล่ามอนเก็บ <b>Job Lv.${Math.min(s.jobLv, s.needJob)}/${s.needJob}</b> · <b>ทักษะพื้นฐาน Lv.${s.basic}/${s.needBasic}</b> (ได้แต้มสกิลทุกครั้งที่ Job Lv. ขึ้น)<br>ทำเควสของลีน่าไปด้วย ได้ EXP เยอะ`; }, live: true, prog: (g) => { const s = g.player.jobChangeStatus(); return (Math.min(1, s.jobLv / s.needJob) + Math.min(1, s.basic / s.needBasic)) / 2; }, done: (g) => g.player.jobChangeStatus().ok || g.player.jobId !== 'novice' },
  { id: 'jobs', title: 'เลือกอาชีพที่ใช่', hint: () => `<span class="tut-jobs">${JOBS4.map(([i, n, , d, st]) => `<span><b>${i} ${n}</b><small>${d}</small><em>${st}</em></span>`).join('')}</span>`, ok: 'เลือกได้แล้ว', done: (g, s) => s.ok > 0 || g.player.jobId !== 'novice' },
  { id: 'change', title: 'เปลี่ยนอาชีพ', hint: () => `ไปหา <b>ออเรล</b> ประมุขสมาคมนักผจญภัย (เมือง Asteria ฝั่งบน · ตามลูกศรสีทอง) คุยแล้วเลือก <b>เปลี่ยนอาชีพ</b>${touch() ? '' : ' · ใช้ <kbd>M</kbd> ดูแผนที่'}`, done: (g) => g.player.jobId !== 'novice' },
];
const PHASES = [
  { key: 'tut', steps: STEPS, reward: { zeny: 500, items: [['red_potion', 10], ['return_scroll', 2], ['orange_potion', 5]] }, endTitle: 'พร้อมผจญภัยแล้ว!', endHint: 'ทำเควสของมีร่าต่อ แล้วไปตามลูกศรสีทองได้เลย', label: 'ผู้เล่นใหม่' },
  { key: 'tut2', steps: STEPS2, reward: { zeny: 2000, items: [['orange_potion', 20], ['blue_potion', 10], ['return_scroll', 3], ['exp_15', 1]] }, endTitle: 'ยินดีด้วยกับอาชีพใหม่!', endHint: 'กด <b>K</b> ดูสกิลอาชีพใหม่ แล้วลากลงปุ่มลัด · ใช้ใบรีเซ็ตสเตตัสฟรีได้ถ้าอยากจัดค่าใหม่', label: 'เปลี่ยนอาชีพ' },
];

export class Tutorial {
  constructor(root, game) {
    this.g = game; this.i = -1; this.ph = 0; this.s = { kills: 0, loot: 0, bag: 0, ok: 0, x: 0, y: 0, attr: 0 }; this.t = 0;
    const el = this.el = document.createElement('div');
    el.className = 'tut-card'; el.hidden = true; el.setAttribute('role', 'status');
    el.innerHTML = '<div class="tut-top"><span class="tut-step"></span><b class="tut-title"></b><button type="button" class="tut-skip" title="ข้ามคำแนะนำ">ข้าม</button></div><p class="tut-hint"></p><button type="button" class="tut-ok" hidden></button><div class="tut-bar"><i></i></div>';
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    el.querySelector('.tut-skip').addEventListener('click', () => {
      const b = el.querySelector('.tut-skip');
      if (this.el.dataset.sure !== '1') { this.el.dataset.sure = '1'; b.textContent = 'ยืนยันข้าม?'; setTimeout(() => { this.el.dataset.sure = ''; b.textContent = 'ข้าม'; }, 3000); return; }
      this.finish(false);
    });
    el.querySelector('.tut-ok').addEventListener('click', () => { this.s.ok++; this.t = 0; });
    (root.querySelector('.hud') || root).append(el);
    // เปิดกระเป๋าแป๊บเดียวก็นับ (ไม่ต้องค้างไว้จนถึงรอบตรวจ)
    const A = game.auto; if (A && A.start) { const a0 = A.start.bind(A); A.start = (...x) => { const r = a0(...x); if (r) this.s.auto = (this.s.auto || 0) + 1; return r; }; }
    const inv = game.inv; if (inv && inv.toggle) { const t0 = inv.toggle.bind(inv); inv.toggle = (f) => { const r = t0(f); if (inv.open) this.on('bag'); return r; }; }
  }

  get P() { return PHASES[this.ph]; }

  // เรียกตอนเริ่มเกม · และหลังจบช่วงที่ 1 (เริ่มช่วงที่ 2 ต่อ)
  start() {
    const p = this.g.player;
    if (p.tut !== 'done') {
      if (p.baseLevel > 10 && p.tut == null) p.tut = 'done';   // ผู้เล่นเก่า ไม่ต้องสอนช่วงแรก
      else { this.ph = 0; this.go(Math.max(0, Math.min(STEPS.length - 1, Number.isInteger(p.tut) ? p.tut : 0))); return; }
    }
    if (p.tut2 === 'done') return;
    if (p.jobId !== 'novice') { p.tut2 = 'done'; return; }   // เปลี่ยนอาชีพไปแล้ว
    this.ph = 1; this.go(Math.max(0, Math.min(STEPS2.length - 1, Number.isInteger(p.tut2) ? p.tut2 : 0)));
  }

  go(i) {
    const P = this.P, p = this.g.player;
    this.i = i; p[P.key] = i; this.g.dirty = true;
    Object.assign(this.s, { x: p.x, y: p.y, attr: attrSum(p), kills: 0, loot: 0, bag: 0, ok: 0, auto: 0 });
    const S = P.steps[i];
    this.el.hidden = false; this.el.classList.remove('tut-pop'); void this.el.offsetWidth; this.el.classList.add('tut-pop');
    this.el.classList.toggle('tut-wide', S.id === 'jobs');
    this.el.querySelector('.tut-skip').hidden = false;
    this.el.querySelector('.tut-step').textContent = `${this.ph ? 'อาชีพ ' : ''}${i + 1}/${P.steps.length}`;
    this.el.querySelector('.tut-title').textContent = S.title;
    this.el.querySelector('.tut-hint').innerHTML = S.hint(this.g);
    const ok = this.el.querySelector('.tut-ok'); ok.hidden = !S.ok; ok.textContent = S.ok || '';
    this.bar(i / P.steps.length);
    this.mark(S);
  }
  bar(k) { this.el.querySelector('.tut-bar i').style.width = `${Math.round(k * 100)}%`; }

  // ไฮไลต์ปุ่มที่ต้องกด · มือถือที่ปุ่มซ่อนอยู่ในเมนู ☰ → ไฮไลต์ปุ่มเมนู แล้วไฮไลต์ช่องในเมนูเมื่อเปิด
  mark(S) {
    const want = [];
    if (S && S.target) {
      const e = document.querySelector(S.target), menu = document.querySelector('#menuPanel');
      const menuOpen = menu && !menu.hidden;
      if (e && e.offsetParent && !menuOpen) want.push(e);
      else if (S.menu) { const it = menuOpen && menu.querySelector(`[data-act="${S.menu}"]`); want.push(it || document.querySelector('#btnMenu')); }
    }
    for (const e of document.querySelectorAll('.tut-glow')) if (!want.includes(e)) e.classList.remove('tut-glow');
    for (const e of want) if (e) e.classList.add('tut-glow');
  }
  // มีหน้าต่าง/เมนูเปิดอยู่ → ซ่อนการ์ดชั่วคราว (ไม่บังหน้าต่าง) · ปิดหน้าต่างแล้วการ์ดกลับมา
  busy() { return !!document.querySelector('.hud section.panel:not([hidden]), #menuPanel:not([hidden])'); }

  // เหตุการณ์จากเกม
  on(kind) { if (this.i < 0) return; if (kind === 'kill') this.s.kills++; if (kind === 'loot') this.s.loot++; if (kind === 'bag') this.s.bag++; }

  update(dt) {
    if (this.i < 0) return;
    this.t -= dt; if (this.t > 0) return; this.t = 0.25;
    const g = this.g; if (!g.player || g.player.dead) return;
    const P = this.P, S = P.steps[this.i];
    this.el.classList.toggle('tut-away', this.busy()); this.mark(S);
    if (S.live) {   // ขั้นที่ใช้เวลานาน: อัปเดตตัวเลขความคืบหน้า
      const h = S.hint(g); if (h !== this.lastHint) { this.lastHint = h; this.el.querySelector('.tut-hint').innerHTML = h; }
      if (S.prog) this.bar((this.i + S.prog(g)) / P.steps.length);
    }
    // ข้ามขั้นที่ทำไปแล้วโดยไม่ต้องรอ
    if (S.done(g, this.s)) {
      g.sfx && g.sfx('pickup');
      if (this.i + 1 >= P.steps.length) this.finish(true); else this.go(this.i + 1);
    }
  }

  finish(reward) {
    const g = this.g, p = g.player, P = this.P, ph = this.ph;
    this.i = -1; p[P.key] = 'done'; g.dirty = true; this.mark(null); this.el.classList.remove('tut-away');
    this.el.querySelector('.tut-ok').hidden = true; this.el.classList.remove('tut-wide');
    if (!reward) {
      this.el.hidden = true;
      g.hud.log(`ข้ามคำแนะนำ${P.label}แล้ว · ดูวิธีเล่นได้ที่ปุ่ม วิกิ ด้านบน`, 'sys');
      if (ph === 0) setTimeout(() => this.start(), 1500);   // ข้ามช่วงแรก → ยังแนะนำการเปลี่ยนอาชีพต่อ (ข้ามได้อีก)
      return;
    }
    const R = P.reward;
    p.zeny += R.zeny;
    const got = [];
    for (const [id, n] of R.items) if (ITEMS[id] && p.inventory.add(id, n, true) > 0) got.push(`${ITEMS[id].name} x${n}`);
    g.refreshItemsUI && g.refreshItemsUI(); g.hud.setPlayer && g.hud.setPlayer(p);
    this.el.querySelector('.tut-step').textContent = '✔';
    this.el.querySelector('.tut-title').textContent = P.endTitle;
    this.el.querySelector('.tut-hint').innerHTML = `รางวัล${P.label}: <b>${R.zeny.toLocaleString()} Zeny</b>${got.length ? ' · ' + got.join(' · ') : ''}<br>${P.endHint}`;
    this.bar(1);
    this.el.querySelector('.tut-skip').hidden = true;
    g.hud.log(`🎉 จบคำแนะนำ${P.label} — ได้รับ ${R.zeny.toLocaleString()} Zeny${got.length ? ' · ' + got.join(' · ') : ''}`, 'r-epic');
    g.sfx && g.sfx('levelUp');
    setTimeout(() => { if (this.i < 0) this.el.hidden = true; if (ph === 0) setTimeout(() => { if (this.i < 0) this.start(); }, 4000); }, 9000);
  }
}
