// v0.32 หน้าทดลองดันเจี้ยนถ้ำ + หอคอย (โหลดเฉพาะ dungeon-trial.html) — ตัวละครทดลอง ไม่บันทึกเข้าบัญชีจริง
import { SKILLS, jobSkills } from '../data/skills.js?v=0.43.1';
import { JOBS } from '../data/progression.js?v=0.43.1';
import { CAVE, TOWER } from '../data/dungeons.js?v=0.43.1';

const KIT = {
  swordsman: { w: 'astral_sword', attr: { str: 1, agi: 0.55, vit: 0.85, int: 0.2, dex: 0.6, luk: 0.25 } },
  mage: { w: 'astral_staff', attr: { str: 0.15, agi: 0.4, vit: 0.55, int: 1, dex: 0.8, luk: 0.25 } },
  archer: { w: 'astral_bow', attr: { str: 0.25, agi: 0.8, vit: 0.5, int: 0.25, dex: 1, luk: 0.3 } },
  acolyte: { w: 'astral_mace', attr: { str: 0.45, agi: 0.4, vit: 0.8, int: 1, dex: 0.65, luk: 0.25 } },
};
const t0 = setInterval(() => { const g = window.asteria; if (!g || !g.started) return; clearInterval(t0); init(g); }, 50);

function init(g) {
  const p = g.player;
  g.saver.adapter = { load: async () => null, save: async () => true };
  p.mail.welcome = true; g.mailWin && g.mailWin.toggle(false);
  const css = document.createElement('style');
  css.textContent = `#dgTrial{position:fixed;z-index:25;left:12px;top:212px;width:min(310px,calc(100vw - 24px));font:13px Kanit,sans-serif;color:#eee6d6;background:#1c1a2aee;border:1px solid #d8b45c99;border-radius:14px;padding:10px 12px;box-shadow:0 10px 30px #0008}
#dgTrial summary{font-weight:600;color:#ffdc9e;cursor:pointer;list-style:none}#dgTrial summary::-webkit-details-marker{display:none}
#dgTrial details{max-height:calc(100vh - 330px);overflow:auto}#dgTrial h4{margin:9px 0 4px;font:600 11.5px Kanit,sans-serif;color:#b9b2c8;letter-spacing:.04em}
#dgTrial .row{display:flex;flex-wrap:wrap;gap:5px}#dgTrial button{font:inherit;padding:6px 9px;background:#353247;color:#eee6d6;border:1px solid #6a625d;border-radius:8px;cursor:pointer}
#dgTrial button.on{border-color:#ffd580;color:#ffdc9e;box-shadow:0 0 0 1px #ffd580 inset}#dgTrial button.go{background:linear-gradient(180deg,#4a3a7a,#2a2050);border-color:#c8a8ff}
#dgTrial .state{display:block;margin-top:8px;font-size:11.5px;color:#c9c2d6;line-height:1.5}#dgTrial .note{font-size:11px;color:#a9a2b7;margin:6px 0 0}
@media(max-width:700px){#dgTrial{top:auto;bottom:calc(96px + env(safe-area-inset-bottom));left:10px;width:min(290px,calc(100vw - 20px));font-size:12px}#dgTrial details{max-height:40vh}}`;
  document.head.append(css);
  const panel = document.createElement('section'); panel.id = 'dgTrial';
  panel.innerHTML = `<details open><summary>🏯 ทดลองดันเจี้ยน + หอคอย · v0.32 ▾</summary>
    <h4>1 · ตัวละครทดลอง</h4><div class="row" data-g="job"></div><div class="row" data-g="lv" style="margin-top:5px"></div>
    <h4>2 · เข้าเล่น (หรือเดินไปคุยกับบรอม/เซลวาที่ลานหอสมาคม)</h4><div class="row" data-g="go"></div>
    <h4>3 · ตัวช่วยทดสอบ</h4><div class="row" data-g="cheat"></div>
    <span class="state"></span>
    <p class="note">ตัวละครทดลอง ไม่บันทึกเข้าบัญชีจริง · อันดับหอคอยรวมใช้ได้ตอนออนไลน์ในเกมจริง</p></details>`;
  document.body.append(panel);
  for (const ev of ['pointerdown', 'pointerup', 'click', 'wheel', 'touchstart', 'keydown']) panel.addEventListener(ev, (e) => e.stopPropagation());
  const btn = (grp, text, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; if (cls) b.className = cls; b.onclick = () => { try { fn(); } catch (e) { console.error(e); } state(); }; panel.querySelector(`[data-g="${grp}"]`).append(b); return b; };
  const log = (t) => g.hud.log('🧪 ' + t, 'sys');
  let job = 'swordsman', lv = 60, god = false;

  function setup() {
    const K = KIT[job], pts = Math.round(lv * 1.1);
    g.clearTarget(); p.dead = false; p.cooldowns = {}; p.buffs = [];
    p.name = `${JOBS[job].thai} · ทดลอง`; p.jobId = job; p.jobLv1 = 0; p.baseLevel = lv; p.jobLevel = Math.min(50, Math.max(10, Math.round(lv / 2)));
    p.attr = Object.fromEntries(Object.entries(K.attr).map(([k, v]) => [k, Math.max(1, Math.round(pts * v))]));
    p.skills = { first_aid: 1, basic: 9 };
    const act = [];
    for (const id of jobSkills(job)) { const sk = SKILLS[id]; p.skills[id] = sk.maxLv; if (sk.kind === 'active') act.push('skill:' + id); }
    p.hotbar = [...act.slice(-6), 'white_potion', 'mana_potion', 'phoenix_feather'].slice(0, 9);
    p.equip.weapon = K.w; for (const sl of ['body', 'head', 'shield', 'garment', 'shoes', 'accessory']) p.equip[sl] = 'astral_' + sl;
    if (job !== 'swordsman') p.equip.shield = { archer: 'qv_a', mage: 'ob_a', acolyte: 'tm_a' }[job];
    for (const [id, n] of [['white_potion', 300], ['mana_potion', 300], ['phoenix_feather', 5]]) if (p.inventory.count(id) < n) p.inventory.add(id, n - p.inventory.count(id), true);
    p.recalc(); p.look = p.computeLook(); g.gfx.refreshLook(p);
    p.hp = p.maxHp; p.sp = p.maxSp;
    g.hud.setPlayer(p); g.hotbar.render(); g.skillWin.render(); g.status.render(); g.refreshItemsUI();
    panel.querySelectorAll('[data-g="job"] button').forEach((b) => b.classList.toggle('on', b.dataset.k === job));
    panel.querySelectorAll('[data-g="lv"] button').forEach((b) => b.classList.toggle('on', +b.dataset.k === lv));
  }
  for (const j of Object.keys(KIT)) { const b = btn('job', JOBS[j].thai, () => { job = j; setup(); log(`เป็น${JOBS[j].thai} Lv.${lv}`); }); b.dataset.k = j; }
  for (const L of [20, 45, 70, 99]) { const b = btn('lv', 'Lv.' + L, () => { lv = L; setup(); log(`Base Lv.${L} (สเตตัส/สกิลตั้งให้อัตโนมัติ)`); }); b.dataset.k = L; }

  const D = g.dungeon;
  btn('go', `เข้าถ้ำ (${CAVE.floors} ชั้น)`, () => { if (D.active) return log('อยู่ในดันเจี้ยนแล้ว'); if (D.caveLeft <= 0) D.st.cave = 0; D.startCave(); }, 'go');
  btn('go', 'หอคอยชั้น 1', () => { if (!D.active) D.startTower(1); }, 'go');
  btn('go', 'หอคอยชั้น 10 (บอสใหญ่)', () => { if (!D.active) D.startTower(10); });
  btn('go', 'หอคอยชั้น 50', () => { if (!D.active) D.startTower(50); });
  btn('go', 'กลับเมือง', () => { if (D.active) D.finish('leave'); else g.warp('asteria_town', { x: 51.5, y: 18.5, angle: Math.PI }); });

  btn('cheat', 'กำจัดมอนในชั้น', () => {
    if (!D.active || !g.mobs) return log('ต้องอยู่ในดันเจี้ยนก่อน');
    const R = D.run, list = g.mobs.list.filter((m) => !m.dead && m.dgRun === R.id && (!m.dgBoss || R.kind === 'tower' || true));
    for (const m of list) { m.hp = 0; g.killMonster(m); }
    log(`กำจัด ${list.length} ตัว`);
  });
  const gb = btn('cheat', 'อมตะ: ปิด', () => { god = !god; gb.textContent = 'อมตะ: ' + (god ? 'เปิด' : 'ปิด'); gb.classList.toggle('on', god); });
  btn('cheat', 'เติม HP/SP', () => { p.dead = false; p.hp = p.maxHp; p.sp = p.maxSp; p.cooldowns = {}; g.hud.setPlayer(p); });
  btn('cheat', 'รีเซ็ตรอบวันนี้', () => { D.st.cave = 0; D.st.tPaid = 0; D.st.tToday = 0; log('รอบถ้ำ/รางวัลหอคอยวันนี้รีเซ็ตแล้ว'); });
  btn('cheat', 'อันดับหอคอย', () => D.openRanking());

  const dmg = g.damagePlayer.bind(g);
  g.damagePlayer = (amount, src, big) => { if (god) { p.hp = Math.max(p.hp, p.maxHp * 0.6); return dmg(1, src, big); } return dmg(amount, src, big); };

  function state() {
    const st = D.st, R = D.run;
    panel.querySelector('.state').textContent = `ถ้ำเหลือวันนี้ ${D.caveLeft}/${CAVE.daily} · ผ่านถ้ำ ${st.clears} ครั้ง · หอคอยสูงสุดชั้น ${st.best || 0}${R ? ` · กำลังเล่น: ${R.kind === 'cave' ? 'ถ้ำ B' + R.floor : 'หอคอยชั้น ' + R.floor}` : ''}`;
  }
  setInterval(state, 1000);
  setup(); state();
  void TOWER;
}
