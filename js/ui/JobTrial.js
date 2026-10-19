// v0.31 หน้าทดลองเล่นอาชีพขั้นที่ 2 (โหลดเฉพาะ job2-trial.html) — ตัวละครทดลอง ไม่บันทึกเข้าบัญชีจริง
import { SKILLS, jobSkills } from '../data/skills.js?v=0.62.0';
import { JOBS, SECOND_OF } from '../data/progression.js?v=0.62.0';
import { QUESTS, JOB2_QUEST } from '../data/quests.js?v=0.62.0';
import { ITEMS } from '../data/items.js?v=0.62.0';

const FIRST = {
  swordsman: { w: 'astral_sword', attr: { str: 70, agi: 40, vit: 60, int: 15, dex: 45, luk: 20 } },
  mage: { w: 'astral_staff', attr: { str: 10, agi: 30, vit: 40, int: 80, dex: 60, luk: 20 } },
  archer: { w: 'astral_bow', attr: { str: 20, agi: 60, vit: 40, int: 20, dex: 80, luk: 25 } },
  acolyte: { w: 'astral_mace', attr: { str: 35, agi: 30, vit: 60, int: 75, dex: 50, luk: 20 } },
};
const t0 = setInterval(() => { const g = window.asteria; if (!g || !g.started) return; clearInterval(t0); init(g); }, 50);

function init(g) {
  const p = g.player;
  g.saver.adapter = { load: async () => null, save: async () => true };
  p.mail.welcome = true; g.mailWin && g.mailWin.toggle(false);
  const css = document.createElement('style');
  css.textContent = `#jobTrial{position:fixed;z-index:25;left:12px;top:212px;width:min(330px,calc(100vw - 24px));font:13px Kanit,sans-serif;color:#eee6d6;background:#1c1a2aee;border:1px solid #d8b45c99;border-radius:14px;padding:10px 12px;box-shadow:0 8px 28px #0007}
#jobTrial summary{font-weight:600;color:#ffdc9e;cursor:pointer;list-style:none}#jobTrial summary::-webkit-details-marker{display:none}
#jobTrial details{max-height:calc(100vh - 330px);overflow:auto}#jobTrial h4{margin:9px 0 4px;font:600 11.5px Kanit,sans-serif;color:#b9b2c8;letter-spacing:.04em}
#jobTrial .row{display:flex;flex-wrap:wrap;gap:5px}#jobTrial button{font:inherit;padding:6px 9px;background:#353247;color:#eee6d6;border:1px solid #6a625d;border-radius:8px;cursor:pointer}
#jobTrial button.on{border-color:#ffd580;color:#ffdc9e;box-shadow:0 0 0 1px #ffd580 inset}#jobTrial button.go{background:linear-gradient(180deg,#4a3a7a,#2a2050);border-color:#c8a8ff}
#jobTrial .state{display:block;margin-top:8px;font-size:11.5px;color:#c9c2d6;line-height:1.5}#jobTrial .note{font-size:11px;color:#a9a2b7;margin:6px 0 0}
@media(max-width:700px){#jobTrial{top:auto;bottom:calc(96px + env(safe-area-inset-bottom));left:10px;transform:none;width:min(300px,calc(100vw - 20px));font-size:12px}#jobTrial details{max-height:42vh}}`;
  document.head.append(css);
  const panel = document.createElement('section'); panel.id = 'jobTrial';
  panel.innerHTML = `<details open><summary>⚔ ทดลองอาชีพขั้นที่ 2 · v0.35 (Wizard ชุดใหม่) ▾</summary>
    <h4>1 · เลือกสายอาชีพ (Base Lv.60 · Job Lv.40)</h4><div class="row" data-g="jobs"></div>
    <h4>2 · บททดสอบเลื่อนขั้น (คุยกับออเรล ประมุขสมาคม)</h4><div class="row" data-g="quest"></div>
    <h4>3 · หลังเลื่อนขั้น</h4><div class="row" data-g="after"></div>
    <h4>4 · สนามลองสกิล</h4><div class="row" data-g="zones"></div>
    <span class="state"></span>
    <p class="note">ตัวละครทดลอง ไม่บันทึกเข้าบัญชีจริง · เดินไปคุยกับออเรล (ป้าย !) เพื่อรับเควสบททดสอบจริง หรือกดข้ามได้</p></details>`;
  document.body.append(panel);
  for (const ev of ['pointerdown', 'pointerup', 'click', 'wheel', 'touchstart', 'keydown']) panel.addEventListener(ev, (e) => e.stopPropagation());
  const btn = (grp, text, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; if (cls) b.className = cls; b.onclick = () => { try { fn(); } catch (e) { console.error(e); g.hud.log('ทดลอง: ' + e.message, 'sys'); } refresh(); }; panel.querySelector(`[data-g="${grp}"]`).append(b); return b; };
  const log = (t) => g.hud.log('🧪 ' + t, 'sys');
  let first = 'swordsman';

  function reset() {
    g.clearTarget(); g.timeline = []; g.heroAnims = []; p.path = []; p.cast = null; p.pendingTalk = null; p.pendingSkill = null;
    p.lockUntil = p.skillDelayUntil = 0; p.dead = false; p.attackCd = 0; p.cooldowns = {}; p.buffs = [];
    g.auto && g.auto.stop && g.auto.stop(); g.root.querySelector('.death') && g.root.querySelector('.death').classList.remove('open');
  }
  function refreshAll() {
    p.recalc(); p.look = p.computeLook();
    g.gfx.refreshLook(p); g.hud.setPlayer(p); g.hud.setBuffs(p.buffs); g.hotbar.render(); g.skillWin.render(); g.status.render(); g.refreshItemsUI();
    g.dirty = true;
  }
  function hotbarFor(ids) { p.hotbar = [...ids, 'white_potion', 'mana_potion'].slice(0, 9); while (p.hotbar.length < 9) p.hotbar.push(null); }

  // ตั้งตัวละครเป็นอาชีพขั้น 1 ที่ Job Lv.40 พร้อมเลื่อนขั้น
  function setFirst(job) {
    first = job; reset();
    const F = FIRST[job];
    p.name = `${JOBS[job].thai} · ทดลอง`; p.jobId = job; p.jobLv1 = 0; p.baseLevel = 60; p.jobLevel = 40; p.baseExp = p.jobExp = 0;
    p.statPoints = 0; p.skillPoints = 0; p.attr = { ...F.attr };
    p.skills = { first_aid: 1, basic: 9 };
    const act = [];
    for (const id of jobSkills(job)) { const sk = SKILLS[id]; p.skills[id] = Math.min(sk.maxLv, sk.maxLv >= 10 ? 7 : 4); if (sk.kind === 'active') act.push('skill:' + id); }
    hotbarFor(act.slice(-6));
    p.equip.weapon = F.w; for (const sl of ['body', 'head', 'shield', 'garment', 'shoes', 'accessory']) p.equip[sl] = 'astral_' + sl;
    if (job === 'archer' || job === 'mage' || job === 'acolyte') p.equip.shield = { archer: 'qv_a', mage: 'ob_a', acolyte: 'tm_a' }[job] || p.equip.shield;
    // ล้างความคืบหน้าบททดสอบเดิม
    for (const q of Object.values(JOB2_QUEST)) { delete p.quests.active[q]; delete p.quests.done[q]; }
    g.refreshQuestUI();
    for (const [id, n] of [['white_potion', 200], ['mana_potion', 200], ['return_scroll', 5]]) if (p.inventory.count(id) < n) p.inventory.add(id, n - p.inventory.count(id), true);
    p.zeny = Math.max(p.zeny, 300000);
    refreshAll(); p.hp = p.maxHp; p.sp = p.maxSp; g.hud.setPlayer(p);
    log(`ตั้งเป็น ${JOBS[job].name} Job Lv.40 แล้ว — เดินไปคุยกับออเรล หรือกด "ข้ามบททดสอบ"`);
    panel.querySelectorAll('[data-g="jobs"] button').forEach((b) => b.classList.toggle('on', b.dataset.job === job));
  }
  const firstOf = () => (JOBS[p.jobId] && JOBS[p.jobId].parent) || p.jobId;
  const aurel = () => (g.npcs || []).find((n) => n.id === 'aurel') || { id: 'aurel', bubble: null };

  for (const job of Object.keys(FIRST)) { const b = btn('jobs', `${JOBS[job].thai} → ${JOBS[SECOND_OF[job]].name}`, () => { setFirst(job); if (g.map.id !== 'asteria_town') g.warp('asteria_town', { x: 50.5, y: 14.5, angle: Math.PI }); }); b.dataset.job = job; }

  btn('quest', 'ไปหาออเรล', () => { if (g.map.id === 'asteria_town') { p.x = 50.5 * 16 * (g.map.def.scaled || 1); p.y = 14.5 * 16 * (g.map.def.scaled || 1); p.path = []; } else g.warp('asteria_town', { x: 50.5, y: 14.5, angle: Math.PI }); });
  btn('quest', 'รับวัตถุดิบเควส', () => {
    const q = QUESTS[JOB2_QUEST[firstOf()]]; if (!q) { log('ต้องเป็นอาชีพขั้น 1 ก่อน'); return; }
    for (const gl of q.goals) if (gl.type === 'collect') p.inventory.add(gl.item, gl.n, true);
    log('ได้วัตถุดิบครบแล้ว — ยังต้องล่ามอนตามเควส (หรือกดข้าม)'); g.refreshItemsUI();
  });
  btn('quest', 'ข้ามบททดสอบ', () => {
    const qid = JOB2_QUEST[firstOf()]; if (!qid || p.jobLv1) { log('เลื่อนขั้นแล้ว หรือยังไม่ได้เลือกสาย'); return; }
    delete p.quests.active[qid]; p.quests.done[qid] = true; log(`ผ่าน "${QUESTS[qid].name}" แล้ว — คุยกับออเรลเพื่อเลื่อนขั้น`);
    g.refreshQuestUI();
  });

  btn('after', 'เลื่อนขั้นทันที', () => {
    if (p.jobLv1) { log('เลื่อนขั้นแล้ว'); return; }
    const qid = JOB2_QUEST[firstOf()]; if (qid) { delete p.quests.active[qid]; p.quests.done[qid] = true; }
    if (g.dialog.open) g.dialog.close();
    g.doJobChange2(aurel());
  }, 'go');
  btn('after', 'สกิลขั้น 2 เต็มทุกตัว', () => {
    if (!p.jobLv1) { log('ต้องเลื่อนขั้นก่อน'); return; }
    p.jobLevel = Math.max(p.jobLevel, 50);
    const ids = jobSkills(p.jobId); for (const id of ids) p.skills[id] = SKILLS[id].maxLv;
    hotbarFor(ids.filter((id) => SKILLS[id].kind === 'active').map((id) => 'skill:' + id).concat(jobSkills(firstOf()).filter((id) => SKILLS[id].kind === 'active').slice(-2).map((id) => 'skill:' + id)));
    refreshAll(); p.hp = p.maxHp; p.sp = p.maxSp; g.hud.setPlayer(p);
    log('ปลดสกิลขั้น 2 ครบ Lv.สูงสุด และใส่ปุ่มลัดให้แล้ว (Job Lv.50)');
  });
  btn('after', 'ใส่อาวุธเฉพาะอาชีพ', () => {
    if (!p.jobLv1) { log('ต้องเลื่อนขั้นก่อน'); return; }
    const pair = { knight: ['wpn_knight_lance', 'wpn_knight_greatsword'], wizard: ['wpn_wizard_rod', 'wpn_wizard_staff'], hunter: ['wpn_hunter_bow', 'wpn_hunter_xbow'], priest: ['wpn_priest_scepter', 'wpn_priest_book'] }[p.jobId];
    if (p.baseLevel < 75) p.baseLevel = 75;
    const next = p.equip.weapon === pair[1] ? pair[0] : pair[1];
    p.equip.weapon = next; if (ITEMS[next].twoHand) p.equip.shield = null;
    refreshAll(); log(`สวม ${ITEMS[next].name} (Base Lv.75)`);
  });
  btn('after', 'เติม HP/SP · รีคูลดาวน์', () => { p.dead = false; p.hp = p.maxHp; p.sp = p.maxSp; p.cooldowns = {}; g.hud.setPlayer(p); });

  btn('zones', 'ยอดเขาหิมะ · Lv.20–45', () => g.warp('frostveil', null));
  btn('zones', 'ปล่องภูเขาไฟ · Lv.42–80', () => g.warp('ember_caldera', null));
  btn('zones', 'ซากโบราณ · Lv.60–78', () => g.warp('ancient_ruins', null));
  btn('zones', 'กลับเมือง', () => g.warp('asteria_town', { x: 50.5, y: 14.5, angle: Math.PI }));

  const state = panel.querySelector('.state');
  function refresh() {
    const qid = JOB2_QUEST[firstOf()], st = qid ? g.questLog.status(qid) : '-';
    const ST = { locked: 'ยังรับไม่ได้', available: 'รับได้ที่ออเรล', active: 'กำลังทำ', ready: 'ส่งเควสได้', done: 'ผ่านแล้ว' };
    state.textContent = `${p.job} · Base Lv.${p.baseLevel} · Job Lv.${p.jobLevel}${p.jobLv1 ? ` (ขั้น 1 Lv.${p.jobLv1})` : ''} · บททดสอบ: ${p.jobLv1 ? 'เลื่อนขั้นแล้ว' : ST[st] || st} · ${g.map.name}`;
  }
  const timer = setInterval(refresh, 600);
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
  const q = new URLSearchParams(location.search).get('job');
  setFirst(FIRST[q] ? q : 'swordsman');
  if (window.matchMedia('(max-width:700px)').matches) panel.querySelector('details').open = false;
  refresh();
}
