// จุดเริ่มต้นของเกม — ตรวจว่าโหลด Three.js ได้ก่อน แล้วค่อยโหลดตัวเกม
// v0.11: หน้าเข้าเกม (เลือก/สร้างตัวละคร หรือเล่นออฟไลน์) ก่อนเริ่มโลก
// v0.12: ถ้าตั้งค่าเซิร์ฟเวอร์ Supabase ไว้ (js/net/server-config.js) → สมัคร/เข้าสู่ระบบด้วยอีเมล + รหัสผ่าน เล่นบนเบราว์เซอร์ไหนก็ได้
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './net/server-config.js';

const root = document.getElementById('game');
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

function fatal(msg) {
  const el = document.createElement('div');
  el.className = 'fatal';
  el.textContent = msg;
  root.append(el);
  root.classList.add('ready');
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
  const configured = /^https:\/\/.+/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;
  if (configured && !window.__noServer) {
    if (window.supabase || await loadScript(SUPABASE_JS)) {
      try {
        const { SupabaseOnline } = await import('./net/SupabaseOnline.js');
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  Promise.all([import('./core/Game.js'), import('./net/Online.js'), import('./audio/AudioEngine.js'), import('./ui/TitleScreen.js'), import('./core/Save.js')])
    .then(async ([{ Game }, OnlineMod, { AudioEngine }, { TitleScreen }, { SaveManager }]) => {
      const online = await createOnline(OnlineMod);
      const audio = new AudioEngine();
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
    .catch((err) => { console.error(err); fatal('เริ่มเกมไม่สำเร็จ: ' + (err && err.message ? err.message : err)); });
}
