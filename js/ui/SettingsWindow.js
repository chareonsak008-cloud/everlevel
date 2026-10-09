// หน้าต่างตั้งค่า (v0.11): เสียง · กราฟิก · หน้าจอ · บัญชีออนไลน์
const QUALITY = [['auto', 'อัตโนมัติ'], ['0', 'สูงสุด'], ['1', 'สูง'], ['2', 'กลาง'], ['3', 'ประหยัด']];

export class SettingsWindow {
  constructor(root, settings, actions) {
    this.s = settings;
    this.act = actions;   // { change(key, value), account(): {mode,label,detail}, save(), switchChar(), exportSave(), importSave(file) }
    this.el = root.querySelector('#settings');
    this.$ = (id) => root.querySelector('#' + id);
    this.open = false;
    this.$('setClose').addEventListener('click', () => this.toggle(false));
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
    this.build();
  }

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    if (this.open) this.renderAccount();
  }

  build() {
    const body = this.$('setBody'); body.innerHTML = '';
    const group = (title) => { const g = document.createElement('section'); g.className = 'set-group'; g.innerHTML = `<h3>${title}</h3>`; body.append(g); return g; };
    const slider = (g, key, label, min, max, step, fmt = (v) => Math.round(v * 100) + '%') => {
      const row = document.createElement('label'); row.className = 'set-row';
      row.innerHTML = `<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}"><b></b>`;
      const inp = row.querySelector('input'), out = row.querySelector('b');
      inp.value = this.s[key]; out.textContent = fmt(this.s[key]);
      inp.addEventListener('input', () => { const v = +inp.value; out.textContent = fmt(v); this.act.change(key, v); });
      g.append(row);
    };
    const toggle = (g, key, label, sub = '') => {
      const row = document.createElement('label'); row.className = 'set-row set-check';
      row.innerHTML = `<span>${label}${sub ? `<small>${sub}</small>` : ''}</span><input type="checkbox"><i class="sw" aria-hidden="true"></i>`;
      const inp = row.querySelector('input'); inp.checked = !!this.s[key];
      inp.addEventListener('change', () => this.act.change(key, inp.checked));
      g.append(row);
    };

    const snd = group('🔊 เสียง');
    toggle(snd, 'muted', 'ปิดเสียงทั้งหมด');
    slider(snd, 'master', 'เสียงรวม', 0, 1, 0.05);
    slider(snd, 'music', 'เพลงประกอบ', 0, 1, 0.05);
    slider(snd, 'sfx', 'เสียงเอฟเฟกต์', 0, 1, 0.05);
    toggle(snd, 'chatSound', 'เสียงแจ้งเตือนแชต');

    const gfx = group('🎨 กราฟิก');
    const qrow = document.createElement('div'); qrow.className = 'set-row set-seg';
    qrow.innerHTML = '<span>คุณภาพภาพ<small>อัตโนมัติ = ลดคุณภาพเองเมื่อเฟรมตก</small></span><div class="seg"></div>';
    const seg = qrow.querySelector('.seg');
    for (const [v, name] of QUALITY) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.dataset.v = v;
      b.setAttribute('aria-pressed', String(String(this.s.quality) === v));
      b.addEventListener('click', () => { this.act.change('quality', v); seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === v))); });
      seg.append(b);
    }
    gfx.append(qrow);
    toggle(gfx, 'pixel', 'ภาพแบบพิกเซลอาร์ต', 'ตัวละคร ฉาก ต้นไม้ สิ่งปลูกสร้าง และสกิล · ปิด = 3 มิติแบบเดิม');
    toggle(gfx, 'bloom', 'แสงเรือง (Bloom)', 'ปิดเพื่อให้เครื่องเย็นและลื่นขึ้น');
    toggle(gfx, 'shake', 'กล้องสั่นตอนโจมตีแรง');
    toggle(gfx, 'dmgNumbers', 'แสดงตัวเลขดาเมจ');

    const ui = group('📱 หน้าจอ');
    slider(ui, 'uiScale', 'ขนาดปุ่มและหน้าต่าง', 0.8, 1.3, 0.05);
    toggle(ui, 'showFps', 'แสดง FPS');
    toggle(ui, 'showHelp', 'แสดงแผงคำแนะนำปุ่ม', 'เฉพาะคอมพิวเตอร์');
    toggle(ui, 'showOthers', 'แสดงผู้เล่นคนอื่น', 'โหมดออนไลน์');

    const acc = group('🌐 บัญชีและการบันทึก');
    acc.insertAdjacentHTML('beforeend', '<div class="set-acc" id="setAcc"></div><div class="set-btns" id="setBtns"></div>');
  }

  renderAccount() {
    const a = this.act.account();
    const box = this.$('setAcc');
    box.innerHTML = `<b class="${a.mode}"></b><small></small>`;
    box.querySelector('b').textContent = a.label;
    box.querySelector('small').textContent = a.detail;
    const btns = this.$('setBtns'); btns.innerHTML = '';
    const btn = (label, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.className = cls; b.addEventListener('click', fn); btns.append(b); return b; };
    btn('บันทึกตอนนี้', () => this.act.save(), 'primary');
    btn('เปลี่ยนตัวละคร', () => this.act.switchChar());
    btn('ส่งออกไฟล์เซฟ', () => this.act.exportSave());
    if (a.canLogout && this.act.logout) btn('ออกจากระบบ', () => this.act.logout(), 'danger');
    const imp = btn('นำเข้าไฟล์เซฟ', () => file.click());
    const file = document.createElement('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true;
    file.addEventListener('change', () => { if (file.files[0]) this.act.importSave(file.files[0]); file.value = ''; });
    btns.append(file);
    imp.title = 'โหลดตัวละครจากไฟล์ .json ที่ส่งออกไว้ (จะแทนที่ตัวละครปัจจุบัน)';
  }
}
