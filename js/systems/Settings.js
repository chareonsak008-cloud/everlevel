// การตั้งค่าเกม (v0.11) — เก็บในเครื่องนี้ (แต่ละอุปกรณ์ตั้งค่าแยกกัน)
const KEY = typeof window !== 'undefined' && window.__contentPreview ? 'everlevel.content-preview.settings.v020' : 'asteria.settings';

export const DEFAULT_SETTINGS = {
  quality: 'auto',      // auto | 0 สูงสุด | 1 สูง | 2 กลาง | 3 ประหยัด
  hd: true,             // v0.89 ภาพ HD-2D (ปิด = ภาพพิกเซลแบบเดิม)
  bloom: true,          // แสงเรือง
  shake: true,          // กล้องสั่น
  master: 0.8, music: 0.5, sfx: 0.8, muted: false,
  uiScale: 1,           // ขนาด UI 0.8–1.3
  dmgNumbers: true,     // ตัวเลขดาเมจ
  showFps: true,
  showHelp: true,       // แผงคำแนะนำปุ่ม (เดสก์ท็อป)
  showOthers: true,     // แสดงผู้เล่นคนอื่น (ออนไลน์)
  chatSound: true,
  questNav: true,       // v0.38 ลูกศรนำทางเควส
  dayCycle: true,       // v0.86 กลางวัน/ตอนเย็น/กลางคืน
  chatSys: true,        // v0.86 แสดงข้อความระบบในกล่องแชต
  chatSize: 'm',        // v0.86 ขนาดกล่องแชต s | m | l
  partyInvites: true,   // v0.38 รับคำเชิญปาร์ตี้
};

export function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { s = {}; }
  const out = { ...DEFAULT_SETTINGS };
  for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in s && typeof s[k] === typeof DEFAULT_SETTINGS[k]) out[k] = s[k];
  out.uiScale = Math.min(1.3, Math.max(0.8, out.uiScale));
  for (const k of ['master', 'music', 'sfx']) out[k] = Math.min(1, Math.max(0, out[k]));
  if (!['auto', '0', '1', '2', '3'].includes(String(out.quality))) out.quality = 'auto';
  return out;
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* เบราว์เซอร์ปิดการเก็บข้อมูล */ }
}
