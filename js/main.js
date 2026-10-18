// จุดเริ่มต้นของเกม — ตรวจว่าโหลด Three.js ได้ก่อน แล้วค่อยโหลดตัวเกม
// v0.11: หน้าเข้าเกม (เลือก/สร้างตัวละคร หรือเล่นออฟไลน์) ก่อนเริ่มโลก
// v0.12: ถ้าตั้งค่าเซิร์ฟเวอร์ Supabase ไว้ (js/net/server-config.js) → สมัคร/เข้าสู่ระบบด้วยอีเมล + รหัสผ่าน เล่นบนเบราว์เซอร์ไหนก็ได้
// v0.13: โหลดไฟล์ตั้งค่าแบบไม่บังคับ — ถ้าไม่มีไฟล์นี้ เกมยังเปิดได้ (โหมดออฟไลน์/บัญชี Claude)
async function serverConfig() {
  if(window.__contentPreview)return {};
  try { return await import('./net/server-config.js?v=0.53.0'); } catch (e) { return {}; }
}

const root = document.getElementById('game');
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

function fatal(msg) {
  const el = document.createElement('div');
  el.className = 'fatal';
  el.textContent = msg;
  root.append(el);
  root.classList.add('ready');
}

// v0.31.1: อัปเดตเกมแล้วเบราว์เซอร์ยังจำไฟล์เก่าบางไฟล์ (แคช ~10 นาทีของ GitHub Pages) → ไฟล์เก่า/ใหม่ปนกันจนเริ่มเกมไม่ได้
// เริ่มไม่สำเร็จครั้งแรก: โหลดไฟล์ .js/.css ของเกมใหม่จากเซิร์ฟเวอร์ (ข้ามแคช) แล้วรีเฟรชหน้า 1 ครั้ง
async function healCache() {
  try {
    if (sessionStorage.getItem('everlevel.heal')) return false;
    sessionStorage.setItem('everlevel.heal', '1');
  } catch (e) { return false; }
  const urls = [...new Set(performance.getEntriesByType('resource').map((e) => e.name)
    .filter((u) => u.startsWith(location.origin) && /\.(js|css)(\?|$)/.test(u)))];
  await Promise.all(urls.map((u) => fetch(u, { cache: 'reload' }).catch(() => null)));
  location.reload();
  return true;
}

function loadScript(src, ms = 15000) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    const t = setTimeout(() => resolve(false), ms);
    s.src = src; s.async = true;
    s.onload = () => { clearTimeout(t); resolve(true); };
    s.onerror = () => { clearTimeout(t); resolve(false); };
    document.head.append(s);
  });
}

// เลือกระบบออนไลน์: เซิร์ฟเวอร์ของเกมเอง (Supabase) → บัญชี Claude (เปิดผ่าน claude.ai) → ออฟไลน์
async function createOnline({ Online }) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = await serverConfig();
  // รับได้ทั้ง Project URL และลิงก์ที่มี /rest/v1/ ต่อท้าย (ตัดเหลือแค่ https://xxxx.supabase.co)
  let url = String(SUPABASE_URL || '').trim();
  try { url = new URL(url).origin; } catch (e) { url = ''; }
  const key = String(SUPABASE_ANON_KEY || '').trim();
  const configured = /^https:\/\/.+/.test(url) && key.length > 20;
  if (configured && !window.__noServer) {
    if (window.supabase || await loadScript(SUPABASE_JS)) {
      try {
        const { SupabaseOnline } = await import('./net/SupabaseOnline.js?v=0.53.0');
        const client = window.supabase.createClient(url, key, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        });
        return new SupabaseOnline(client);
      } catch (e) { console.warn('เริ่มระบบออนไลน์ไม่สำเร็จ', e); }
    }
    const o = new Online();
    o.serverDown = true;   // หน้าเข้าเกมจะบอกว่าต่อเซิร์ฟเวอร์ไม่ได้
    return o;
  }
  return new Online();
}

if (!window.THREE) {
  fatal('โหลดกราฟิก 3 มิติ (Three.js) ไม่สำเร็จ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วรีเฟรชหน้า');
} else {
  Promise.all([import('./core/Game.js?v=0.53.0'), import('./net/Online.js?v=0.53.0'), import('./audio/AudioEngine.js?v=0.53.0'), import('./ui/TitleScreen.js?v=0.53.0'), import('./core/Save.js?v=0.53.0'), import('./render/CardPortraits.js?v=0.53.0')])
    .then(async ([{ Game }, OnlineMod, { AudioEngine }, { TitleScreen }, { SaveManager }, Portraits]) => {
      const step = (v, t) => { try { if (window.__loadStep) window.__loadStep(v, t); } catch (e) { /* หน้าโหลดไม่มีก็ได้ */ } };
      step(30, 'กำลังวาดตัวละครและมอนสเตอร์…');
      await Portraits.preloadMonsterPortraits();
      step(48, 'กำลังเชื่อมต่อเซิร์ฟเวอร์…');   // v0.24.2: ไอคอนอุปกรณ์วาดสดแล้ว ไม่ต้องโหลดภาพ
      const online = await createOnline(OnlineMod);
      const audio = new AudioEngine();
      step(66, 'กำลังสร้างโลก…');
      const game = new Game(root, { online, audio });
      window.asteria = game; // ไว้ดีบักผ่านคอนโซล
      // ทดสอบอัตโนมัติ: ข้ามหน้าเข้าเกม
      if (window.__autostart) return game.start(window.__autostart === true ? null : window.__autostart);
      root.classList.add('ready', 'title');
      const localSave = await new SaveManager().load();
      const choice = await new TitleScreen(root, { online, audio, localSave }).run();
      root.classList.remove('title', 'ready');
      void root.offsetWidth;
      return game.start(choice);
    })
    .then(() => { try { sessionStorage.removeItem('everlevel.heal'); } catch (e) { /* ไม่มีที่เก็บ */ } })
    .catch(async (err) => {
      console.error(err);
      if (await healCache()) return;   // กำลังโหลดไฟล์ใหม่แล้วรีเฟรช
      fatal('เริ่มเกมไม่สำเร็จ: ' + (err && err.message ? err.message : err) + ' — ลองกด Ctrl+Shift+R (มือถือ: ล้างแคชเบราว์เซอร์) แล้วเปิดใหม่');
    });
}
