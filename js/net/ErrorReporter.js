// v0.93 fix15 รายงานปัญหาอัตโนมัติ → ตาราง client_errors (supabase/update_v0.93_errors.sql)
// เก็บ: ข้อความ error · จุดที่พัง (stack) · เวอร์ชันเกม · สเปกเครื่องแบบกว้าง (ระบบ/เบราว์เซอร์/รุ่น/การ์ดจอ/RAM/จอ/การตั้งค่าภาพ)
// ไม่เก็บอีเมลหรือข้อมูลส่วนตัว · ส่งไม่ได้ (ยังไม่ต่อเซิร์ฟเวอร์/แท็บแครช) → เก็บคิวในเครื่อง ส่งรอบหน้า
const QK = 'everlevel.errq', MAXQ = 12;
const VER = (() => { try { return new URL(import.meta.url).searchParams.get('v') || ''; } catch (e) { return ''; } })();
let sb = null, ctx = () => ({}), seen = new Set(), sent = 0, devCache = null, model = '';

function readQ() { try { return JSON.parse(localStorage.getItem(QK) || '[]') || []; } catch (e) { return []; } }
function writeQ(q) { try { localStorage.setItem(QK, JSON.stringify(q.slice(-MAXQ))); } catch (e) { /* เต็ม */ } }

function gpuName() {
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const mx = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    return `${String(r).slice(0, 90)} · tex${mx}`;
  } catch (e) { return 'err'; }
}
export function deviceInfo() {
  if (!devCache) {
    const ua = navigator.userAgent || '';
    const os = (/Android [\d.]+/.exec(ua) || /iPhone OS [\d_]+/.exec(ua) || /iPad.*OS [\d_]+/.exec(ua) || /Windows NT [\d.]+/.exec(ua) || /Mac OS X [\d_]+/.exec(ua) || ['?'])[0];
    const br = (/(EdgA?|SamsungBrowser|OPR|Firefox|CriOS|Chrome|Version)\/[\d.]+/.exec(ua) || ['?'])[0];
    devCache = { os, br, gpu: gpuName(), mem: navigator.deviceMemory || 0, cores: navigator.hardwareConcurrency || 0, dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
      scr: `${screen.width}x${screen.height}`, touch: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) };
  }
  let st = {}; try { st = JSON.parse(localStorage.getItem('asteria.settings') || '{}') || {}; } catch (e) { /* */ }
  let safe = false; try { safe = localStorage.getItem('everlevel.safe') === '1'; } catch (e) { /* */ }
  return { ...devCache, model, vw: `${innerWidth}x${innerHeight}`, hd: st.hd !== false, q: String(st.quality ?? 'auto'), safe, ...ctx() };
}

// ส่งรายงาน (ซ้ำข้อความเดิมในรอบเดียวส่งครั้งเดียว · รอบหนึ่งไม่เกิน 15 รายการ)
export function report(kind, msg = '', stack = '', extra = {}) {
  try {
    const key = kind + '|' + String(msg).slice(0, 120);
    if (seen.has(key) || sent >= 15) return; seen.add(key); sent++;
    const c = ctx();
    const item = { kind: String(kind).slice(0, 32), msg: String(msg).slice(0, 500), stack: String(stack || '').slice(0, 2000), ver: VER, char: c.char || '', device: { ...deviceInfo(), ...extra }, at: Date.now() };
    delete item.device.char;
    const q = readQ(); q.push(item); writeQ(q);
    flush();
  } catch (e) { /* รายงานพังเองต้องไม่ทำให้เกมพัง */ }
}

export async function flush() {
  if (!sb) return;
  const q = readQ(); if (!q.length) return;
  writeQ([]);
  for (const it of q) {
    try { const { error } = await sb.rpc('report_client_error', { p: { ...it, msg: it.at && Date.now() - it.at > 60000 ? `${it.msg} (เกิดเมื่อ ${new Date(it.at).toLocaleString('th-TH')})` : it.msg } }); if (error && !/report_client_error|schema cache|exist/.test(error.message || '')) { /* ส่งไม่ผ่าน → ทิ้ง (กันวนส่ง) */ } }
    catch (e) { /* เน็ตหลุด → ทิ้ง */ }
  }
}

// เริ่มดักจับ error ทั้งหน้า (เรียกครั้งเดียวตอนบูต)
let hooked = false;
export function hookErrors() {
  if (hooked) return; hooked = true;
  const ours = (f) => !f || f.startsWith(location.origin) || f === '';
  window.addEventListener('error', (e) => {
    if (!e || (e.target && e.target !== window)) return;                 // โหลดรูป/สคริปต์ไม่สำเร็จ ไม่นับ
    const m = String(e.message || ''); if (!m || /ResizeObserver loop|Script error\.?$/i.test(m) || !ours(e.filename)) return;
    report('error', m, (e.error && e.error.stack) || `${e.filename}:${e.lineno}:${e.colno}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason, m = String((r && (r.message || r)) || ''); if (!m || /AbortError|NetworkError|Failed to fetch|Load failed/i.test(m)) return;
    report('promise', m, (r && r.stack) || '');
  });
  try { if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) navigator.userAgentData.getHighEntropyValues(['model', 'platformVersion']).then((v) => { model = String(v.model || '').slice(0, 40); }).catch(() => {}); } catch (e) { /* */ }
}

// ต่อเซิร์ฟเวอร์แล้ว: ส่งคิวที่ค้าง · ctxFn = ข้อมูลเกมตอนนั้น ({ char, map, fps })
export function attachReporter(client, ctxFn) { if (client) sb = client; if (ctxFn) ctx = ctxFn; flush(); }
