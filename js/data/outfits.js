// v0.91 สีชุด — ย้อมเฉพาะสีหลักของชุดในแผ่นสไปรต์เดิม (ผิว ผม อาวุธคงเดิม) · เลือกตอนสร้างตัวละคร / เปลี่ยนฟรีที่ตู้แฟชั่น
// m: 'h' = เปลี่ยนเฉดสี (h = องศา) · 'd' = โทนดำ · 'w' = โทนขาว
export const OUTFIT_COLORS = [
  { id: 'def', name: 'สีเดิม', sw: null },
  { id: 'red', name: 'แดง', m: 'h', h: 0, sw: '#d23c3c' },
  { id: 'orange', name: 'ส้ม', m: 'h', h: 28, sw: '#e2832e' },
  { id: 'gold', name: 'เหลืองทอง', m: 'h', h: 50, sw: '#d9b23a' },
  { id: 'green', name: 'เขียว', m: 'h', h: 125, sw: '#3fa24f' },
  { id: 'teal', name: 'เขียวมรกต', m: 'h', h: 172, sw: '#2aa596' },
  { id: 'sky', name: 'ฟ้า', m: 'h', h: 200, sw: '#3d9be0' },
  { id: 'blue', name: 'น้ำเงิน', m: 'h', h: 232, sw: '#3b56c9' },
  { id: 'purple', name: 'ม่วง', m: 'h', h: 272, sw: '#8a4fd0' },
  { id: 'pink', name: 'ชมพู', m: 'h', h: 322, sw: '#df5aa8' },
  { id: 'black', name: 'ดำ', m: 'd', sw: '#2a2a33' },
  { id: 'white', name: 'ขาว', m: 'w', sw: '#eceff4' },
];
export const OUTFIT_BY_ID = Object.fromEntries(OUTFIT_COLORS.map((c) => [c.id, c]));
export const OUTFIT_IDS = OUTFIT_COLORS.map((c) => c.id);
export const cleanOutfit = (id) => (OUTFIT_BY_ID[id] ? id : 'def');

// ช่วงสีของชุดในแต่ละแผ่น: [เฉดกลาง, ครึ่งความกว้าง (องศา), ความสว่างต่ำสุด] — ผมสีน้ำเงินเข้มของนักเวทไม่โดนย้อม (minV)
const BANDS = { novice: [110, 42, 0], swordsman: [220, 32, 0], archer: [145, 32, 0], mage: [212, 36, 0.42], acolyte: [205, 32, 0] };
export const outfitBand = (base) => BANDS[base] || null;

// ค่าที่ส่งเข้าเชดเดอร์: [โหมด (0 ไม่ย้อม · 1 เฉด · 2 ดำ · 3 ขาว), เฉดเป้าหมาย] + ช่วงสี
export function outfitParams(id, base) {
  const c = OUTFIT_BY_ID[id], b = BANDS[base];
  if (!c || !c.m || !b) return null;
  return { mode: c.m === 'h' ? 1 : c.m === 'd' ? 2 : 3, hue: c.h || 0, band: b };
}

// ย้อมภาพบนแคนวาส (หน้าดูตัวละคร · ตัวอย่างตอนเลือกสี) — สูตรเดียวกับเชดเดอร์
const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
function hsv2rgb(h, s, v) {
  h = (((h % 360) + 360) % 360) / 60; const i = Math.floor(h), f = h - i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
  return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
}
export function recolorPixels(data, id, base) {
  const P = outfitParams(id, base); if (!P) return;
  const [cen, hw, minV] = P.band;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < 1e-4) continue;
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
    const s = d / mx, v = mx, dh = Math.abs(((h - cen + 540) % 360) - 180);
    const w = (1 - ss(hw - 10, hw, dh)) * ss(0.1, 0.22, s) * (minV > 0 ? ss(minV - 0.06, minV + 0.02, v) : 1);
    if (w <= 0) continue;
    const n = P.mode === 1 ? hsv2rgb(P.hue + (h - cen), s, v) : P.mode === 2 ? hsv2rgb(h, s * 0.3, v * 0.42) : hsv2rgb(h, s * 0.1, 0.62 + v * 0.38);
    data[i] = (r + (n[0] - r) * w) * 255; data[i + 1] = (g + (n[1] - g) * w) * 255; data[i + 2] = (b + (n[2] - b) * w) * 255;
  }
}
