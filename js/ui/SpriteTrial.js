// ทดลอง: ตัวละครสไปรต์ชีตวาดมือในเกมจริง (โหลดเฉพาะ sprite-trial.html) — ไม่บันทึกเข้าบัญชีจริง
import { SKILLS, jobSkills } from '../data/skills.js?v=0.89.0';
import { JOBS } from '../data/progression.js?v=0.89.0';
import { SheetSprite } from '../render/SheetChars.js?v=0.89.0';

const KIT = {
  swordsman: { w: 'astral_sword', attr: { str: 1, agi: 0.55, vit: 0.85, int: 0.2, dex: 0.6, luk: 0.25 } },
  archer: { w: 'astral_bow', attr: { str: 0.25, agi: 0.8, vit: 0.5, int: 0.25, dex: 1, luk: 0.3 } },
  mage: { w: 'astral_staff', attr: { str: 0.15, agi: 0.4, vit: 0.55, int: 1, dex: 0.8, luk: 0.25 } },
  acolyte: { w: 'astral_mace', attr: { str: 0.45, agi: 0.4, vit: 0.8, int: 1, dex: 0.65, luk: 0.25 } },
};
const t0 = setInterval(() => { const g = window.asteria; if (!g || !g.started) return; clearInterval(t0); init(g); }, 50);

function init(g) {
  const p = g.player;
  g.saver.adapter = { load: async () => null, save: async () => true };
  p.mail.welcome = true; g.mailWin && g.mailWin.toggle(false);
  const css = document.createElement('style');
  css.textContent = `#spTrial{position:fixed;z-index:25;left:12px;top:212px;width:min(300px,calc(100vw - 24px));font:13px Kanit,sans-serif;color:#eee6d6;background:#1c1a2aee;border:1px solid #d8b45c99;border-radius:14px;padding:10px 12px;box-shadow:0 10px 30px #0008}
#spTrial summary{font-weight:600;color:#ffdc9e;cursor:pointer;list-style:none}#spTrial summary::-webkit-details-marker{display:none}
#spTrial h4{margin:9px 0 4px;font:600 11.5px Kanit,sans-serif;color:#b9b2c8}#spTrial .row{display:flex;flex-wrap:wrap;gap:5px}
#spTrial button{font:inherit;padding:6px 9px;background:#353247;color:#eee6d6;border:1px solid #6a625d;border-radius:8px;cursor:pointer}
#spTrial button.on{border-color:#ffd580;color:#ffdc9e;box-shadow:0 0 0 1px #ffd580 inset}#spTrial .note{font-size:11px;color:#a9a2b7;margin:7px 0 0;line-height:1.5}
@media(max-width:700px){#spTrial{top:auto;bottom:calc(96px + env(safe-area-inset-bottom));left:10px;width:min(280px,calc(100vw - 20px));font-size:12px}}`;
  document.head.append(css);
  const panel = document.createElement('section'); panel.id = 'spTrial';
  panel.innerHTML = `<details open><summary>🎨 ทดลองตัวละครสไปรต์วาดมือ ▾</summary>
    <h4>อาชีพ</h4><div class="row" data-g="job"></div>
    <h4>เปรียบเทียบ</h4><div class="row" data-g="mode"></div>
    <h4>ไปลองเดิน/ตีมอน</h4><div class="row" data-g="go"></div>
    <h4>ลองสกิล (เอฟเฟกต์พิกเซลจาก PixelLab)</h4><div class="row" data-g="sk"></div>
    <h4>ทิศตอนนี้ (8 ทิศ)</h4><div class="dirinfo" style="font-size:12px;line-height:1.5;color:#e8dcc4">—</div>
    <p class="note">เดิน = ท่าวิ่ง · ตีมอน = ท่าโจมตี · กดสกิล (F1–F6) = ท่าใช้สกิล · หมุนกล้องได้ ภาพจะเปลี่ยนตามมุมจริง 8 ทิศ</p></details>`;
  document.body.append(panel);
  for (const ev of ['pointerdown', 'pointerup', 'click', 'wheel', 'touchstart', 'keydown']) panel.addEventListener(ev, (e) => e.stopPropagation());
  const btn = (grp, text, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = () => { try { fn(); } catch (e) { console.error(e); } }; panel.querySelector(`[data-g="${grp}"]`).append(b); return b; };

  let job = 'swordsman', on = true;
  g.gfx.spriteChars = false;   // หน้าทดลองคุมสไปรต์เอง (ครบ 4 อาชีพ)
  const spr = new SheetSprite(g.gfx.scene, job); window.__spr = spr;
  function setup() {
    const K = KIT[job], lv = 60, pts = 66;
    g.clearTarget(); p.dead = false; p.cooldowns = {}; p.buffs = [];
    p.name = `${JOBS[job].thai} · สไปรต์`; p.jobId = job; p.baseLevel = lv; p.jobLevel = 40;
    p.attr = Object.fromEntries(Object.entries(K.attr).map(([k, v]) => [k, Math.max(1, Math.round(pts * v))]));
    p.skills = { first_aid: 1, basic: 9 }; const act = [];
    for (const id of jobSkills(job)) { const sk = SKILLS[id]; p.skills[id] = sk.maxLv; if (sk.kind === 'active') act.push('skill:' + id); }
    p.hotbar = [...act.slice(-6), 'white_potion', 'mana_potion', null].slice(0, 9);
    p.equip.weapon = K.w; for (const sl of ['body', 'head', 'shield', 'garment', 'shoes', 'accessory']) p.equip[sl] = 'astral_' + sl;
    if (job !== 'swordsman') p.equip.shield = { archer: 'qv_a', mage: 'ob_a', acolyte: 'tm_a' }[job];
    for (const [id, n] of [['white_potion', 300], ['mana_potion', 300]]) if (p.inventory.count(id) < n) p.inventory.add(id, n - p.inventory.count(id), true);
    p.recalc(); p.look = p.computeLook(); g.gfx.refreshLook(p); p.hp = p.maxHp; p.sp = p.maxSp;
    g.hud.setPlayer(p); g.hotbar.render(); g.skillWin.render(); g.status.render(); g.refreshItemsUI();
    spr.setJob(job);
    panel.querySelectorAll('[data-g="job"] button').forEach((b) => b.classList.toggle('on', b.dataset.k === job));
  }
  for (const j of Object.keys(KIT)) { const b = btn('job', JOBS[j].thai, () => { job = j; setup(); }); b.dataset.k = j; }
  const mb = btn('mode', 'แบบใหม่ (สไปรต์)', () => { on = true; mb.classList.add('on'); ob.classList.remove('on'); });
  const ob = btn('mode', 'แบบเดิม (โมเดล)', () => { on = false; ob.classList.add('on'); mb.classList.remove('on'); });
  mb.classList.add('on');
  const nearMob = () => { const m = (g.mobs ? g.mobs.list : []).filter((x) => !x.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (!m) g.hud.log('ไม่มีมอนสเตอร์ใกล้ ๆ ลองไปทุ่งมือใหม่', 'sys'); return m; };
  const cast = (id) => { const m = nearMob(); if (!m) return; if (Math.hypot(m.x - p.x, m.y - p.y) > 80) { p.x = m.x - 40; p.y = m.y; } g.target = m; g.playSkillFx(id, 10, m); };
  btn('sk', '⚔️ ดาบสวรรค์ (ใหม่)', () => cast('sky_cleave'));
  btn('sk', 'ฟาดสะท้าน', () => cast('power_slash'));
  btn('sk', 'หอกทะลวงฟ้า', () => cast('lance_pierce'));
  btn('sk', 'เฉพาะภาพพิกเซล', () => { const m = nearMob(); if (!m) return; g.gfx.pixelVfx().play('sky_cleave', new (g.gfx.camera.position.constructor)(m.x / 16, 0, m.y / 16), { scale: 1.25 }); });
  btn('go', 'ทุ่งมือใหม่', () => g.warp('beginner_field', null));
  btn('go', 'ป่ากระซิบ', () => g.warp('whisper_forest', null));
  btn('go', 'ซากโบราณ', () => g.warp('ancient_ruins', null));
  btn('go', 'กลับเมือง', () => g.warp('asteria_town', null));

  const NAMES = { s: 'หันหน้าเข้าจอ', se: 'เฉียงขวาล่าง', e: 'หันขวา', ne: 'เฉียงขวาบน', n: 'หันหลัง', nw: 'เฉียงซ้ายบน', w: 'หันซ้าย', sw: 'เฉียงซ้ายล่าง' };
  const dirEl = panel.querySelector('.dirinfo');
  const render = g.gfx.render.bind(g.gfx);
  g.gfx.render = (dt, focus, simDt) => {
    const c = g.gfx.characters.get(p), view = c && c.view;
    if (view) view.root.visible = !on;
    spr.pivot.visible = on;
    if (on) spr.update(dt, p, view, g.gfx.camera, g.gfx.px && g.gfx.px.tint);
    if (on && spr.info && (g._dirT = (g._dirT || 0) - dt) <= 0) {
      g._dirT = 0.2; const I = spr.info, AN = { idle: 'ยืน', walk: 'เดิน', attack: 'โจมตี', skill: 'ใช้สกิล' };
      dirEl.innerHTML = `${NAMES[I.dir]} <b>(${I.dir.toUpperCase()})</b> · ${AN[I.anim]}<br><span style="color:#9fe0a8">ภาพวาดจริงครบ 8 ทิศ</span>`;
    }
    return render(dt, focus, simDt);
  };
  setup();
}
