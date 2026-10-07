// หน้าจอข้อมูล (DOM): สถานะตัวละคร, แชท, ชื่อแผนที่, FPS, บัฟ
import { SKILLS } from '../data/skills.js';
import { skillIconURL } from '../render/SkillIcons.js';
export class HUD {
  constructor(root) {
    this.el = {
      name: root.querySelector('#charName'),
      job: root.querySelector('#charJob'),
      hpBar: root.querySelector('#hpBar'), hpText: root.querySelector('#hpText'),
      spBar: root.querySelector('#spBar'), spText: root.querySelector('#spText'),
      mapName: root.querySelector('#mapName'),
      coords: root.querySelector('#coords'),
      banner: root.querySelector('#banner'),
      chat: root.querySelector('#chat'),
      fps: root.querySelector('#fps'),
      target: root.querySelector('#target'),
      targetName: root.querySelector('#targetName'),
      targetLv: root.querySelector('#targetLv'),
      targetBar: root.querySelector('#targetBar'),
      targetHp: root.querySelector('#targetHp'),
      hurt: root.querySelector('#hurt'),
      bexpBar: root.querySelector('#bexpBar'), bexpText: root.querySelector('#bexpText'),
      jexpBar: root.querySelector('#jexpBar'), jexpText: root.querySelector('#jexpText'),
      badge: root.querySelector('#ptBadge'),
      skBadge: root.querySelector('#skBadge'),
      crest: root.querySelector('.crest'),
      buffs: root.querySelector('#buffs'),
      boss: root.querySelector('#bossBar'), bossName: root.querySelector('#bossName'), bossLv: root.querySelector('#bossLv'),
      bossHpBar: root.querySelector('#bossHpBar'), bossHp: root.querySelector('#bossHp'),
    };
    this.targetMob = null; this.targetHp = -1;
    this.lastCoords = '';
    this.bannerTimer = null;
  }

  setPlayer(p) {
    this.el.name.textContent = p.name;
    this.el.job.textContent = `${p.job} · Base Lv.${p.baseLevel} · Job Lv.${p.jobLevel}`;
    this.el.hpBar.style.width = `${(p.hp / p.maxHp) * 100}%`;
    this.el.spBar.style.width = `${(p.sp / p.maxSp) * 100}%`;
    this.el.hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    this.el.spText.textContent = `${Math.floor(p.sp)} / ${p.maxSp}`;
    this.el.hpBar.parentElement.classList.toggle('low', p.hp / p.maxHp < 0.3);
    const bk = p.baseNext === Infinity ? 1 : p.baseExp / p.baseNext;
    const jk = p.jobNext === Infinity ? 1 : p.jobExp / p.jobNext;
    this.el.bexpBar.style.width = `${bk * 100}%`; this.el.bexpText.textContent = p.baseNext === Infinity ? 'MAX' : `${(bk * 100).toFixed(1)}%`;
    this.el.jexpBar.style.width = `${jk * 100}%`; this.el.jexpText.textContent = p.jobNext === Infinity ? 'MAX' : `${(jk * 100).toFixed(1)}%`;
    this.el.badge.hidden = p.statPoints <= 0;
    this.el.badge.textContent = p.statPoints;
    if (this.el.skBadge) { this.el.skBadge.hidden = p.skillPoints <= 0; this.el.skBadge.textContent = p.skillPoints; }
    const jd = p.jobDef;
    if (this.el.crest && this.el.crest.textContent !== jd.crest) {
      this.el.crest.textContent = jd.crest;
      this.el.crest.dataset.job = p.jobId;
    }
    if (this.onPlayer) this.onPlayer(p);   // v0.11: ตัวเลขแต้มบนเมนู ☰
  }

  // ไอคอนบัฟใต้กรอบตัวละคร พร้อมเวลาที่เหลือ
  setBuffs(buffs) {
    const box = this.el.buffs; if (!box) return;
    const key = buffs.map((b) => b.id).join(',');
    if (box.dataset.key !== key) {
      box.innerHTML = '';
      for (const b of buffs) {
        const d = document.createElement('div'); d.className = 'buff'; d.dataset.id = b.id;
        d.title = `${SKILLS[b.id].name} Lv.${b.lv}`;
        d.innerHTML = `<img alt="" src="${skillIconURL(b.id)}"><span></span>`;
        box.append(d);
      }
      box.dataset.key = key;
    }
    buffs.forEach((b, i) => {
      const d = box.children[i]; if (!d) return;
      const sec = Math.ceil(b.left);
      d.lastChild.textContent = sec >= 60 ? `${Math.ceil(sec / 60)}m` : `${sec}s`;
      d.classList.toggle('ending', b.left < 10);
    });
  }

  // แถบเลือดบอส MVP (แสดงเมื่ออยู่ใกล้หรือกำลังสู้)
  setBoss(m) {
    const el = this.el;
    if (!el.boss) return;
    if (m !== this.bossMob) {
      this.bossMob = m; this.bossHp = -1;
      el.boss.hidden = !m;
      if (m) { el.bossName.textContent = m.name; el.bossLv.textContent = `Lv.${m.level}`; }
    }
    // ถ้าเลือกบอสเป็นเป้าหมายอยู่ ใช้แถบบอสแทนกรอบเป้าหมายปกติ
    if (this.targetMob) el.target.hidden = !!m && this.targetMob === m;
    if (!m) return;
    el.boss.classList.toggle('enraged', !!m.enraged);
    if (m.hp !== this.bossHp) {
      this.bossHp = m.hp;
      el.bossHpBar.style.width = `${Math.max(0, m.hp / m.maxHp) * 100}%`;
      el.bossHp.textContent = `${Math.max(0, Math.ceil(m.hp)).toLocaleString('en-US')} / ${m.maxHp.toLocaleString('en-US')} (${Math.max(0, (m.hp / m.maxHp) * 100).toFixed(1)}%)`;
    }
  }

  // กรอบเป้าหมายด้านบนกลางจอ
  setTarget(mob) {
    this.targetMob = mob; this.targetHp = -1;
    this.el.target.hidden = !mob || mob === this.bossMob;
    if (mob) { this.el.targetName.textContent = `${mob.name}`; this.el.targetLv.textContent = `Lv.${mob.level}`; this.updateTarget(); }
  }

  updateTarget() {
    const m = this.targetMob; if (!m || m.hp === this.targetHp) return;
    this.targetHp = m.hp;
    this.el.targetBar.style.width = `${Math.max(0, m.hp / m.maxHp) * 100}%`;
    this.el.targetHp.textContent = `${Math.max(0, Math.ceil(m.hp))} / ${m.maxHp}`;
  }

  // แบนเนอร์กลางจอตอนเลเวลอัป
  levelBanner(title, sub) {
    const b = this.el.banner;
    b.innerHTML = '';
    b.append(document.createTextNode(title));
    const s = document.createElement('small'); s.textContent = sub; b.append(s);
    b.classList.add('show', 'lv');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show', 'lv'), 2200);
  }

  flashHurt() {
    const h = this.el.hurt;
    h.classList.remove('on'); void h.offsetWidth; h.classList.add('on');
  }

  setMap(map) {
    this.el.mapName.textContent = map.name;
    const b = this.el.banner;
    b.innerHTML = '';
    b.append(document.createTextNode(map.name));
    if (map.subtitle) { const s = document.createElement('small'); s.textContent = map.subtitle; b.append(s); }
    b.classList.remove('lv');
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), 2800);
  }

  log(text, type = 'info', who = '') {
    const line = document.createElement('div');
    line.className = type;
    line.textContent = who ? `${who} : ${text}` : text;
    this.el.chat.append(line);
    while (this.el.chat.children.length > 40) this.el.chat.firstChild.remove();
  }

  setCoords(tx, ty) {
    const s = `${tx}, ${ty}`;
    if (s !== this.lastCoords) { this.el.coords.textContent = s; this.lastCoords = s; }
  }

  setFps(fps) { this.el.fps.textContent = `${fps} FPS`; }
}
