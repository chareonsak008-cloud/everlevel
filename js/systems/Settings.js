// การตั้งค่าเกม (v0.11) — เก็บในเครื่องนี้ (แต่ละอุปกรณ์ตั้งค่าแยกกัน)
const KEY = 'asteria.settings';

export const DEFAULT_SETTINGS = {
  quality: 'auto',      // auto | 0 สูงสุด | 1 สูง | 2 กลาง | 3 ประหยัด
  bloom: true,          // แสงเรือง
  shake: true,          // กล้องสั่น
  master: 0.8, music: 0.5, sfx: 0.8, muted: false,
  uiScale: 1,           // ขนาด UI 0.8–1.3
  dmgNumbers: true,     // ตัวเลขดาเมจ
  showFps: true,
  showHelp: true,       // แผงคำแนะนำปุ่ม (เดสก์ท็อป)
  showOthers: true,     // แสดงผู้เล่นคนอื่น (ออนไลน์)
  chatSound: true,
  pixel: true,          // v0.17: ภาพแบบพิกเซลอาร์ตทั้งเกม (ตัวละคร มอน สัตว์เลี้ยง ฉาก สกิล) · ปิด = 3 มิติแบบเดิม
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
