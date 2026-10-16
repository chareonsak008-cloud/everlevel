// v0.37 ตรากิลด์ — ประกอบจาก "ทรงโล่ · สัญลักษณ์ · สีพื้น · สีสัญลักษณ์" รหัสเป็นตัวเลข 4 ช่อง เช่น "2-5-0-9"
// เก็บแค่รหัสในฐานข้อมูล (ตรวจรูปแบบทั้งฝั่งเกมและฝั่งเซิร์ฟเวอร์) · วาดเป็น SVG ในเครื่องผู้เล่นเอง (ไม่รับภาพจากใคร)
export const EMBLEM_SHAPES = [
  { name: 'โล่ทหาร', d: 'M12 1.5 21 4.5v6.8c0 5.6-3.8 9.6-9 11.2-5.2-1.6-9-5.6-9-11.2V4.5z' },
  { name: 'โล่กลม', d: 'M12 1.5a10.5 10.5 0 1 1 0 21 10.5 10.5 0 0 1 0-21z' },
  { name: 'ธงริ้ว', d: 'M3.5 1.5h17v20l-8.5-4.6-8.5 4.6z' },
  { name: 'เพชร', d: 'M12 .8 23.2 12 12 23.2.8 12z' },
  { name: 'หกเหลี่ยม', d: 'M12 1 21.5 6.5v11L12 23 2.5 17.5v-11z' },
  { name: 'โล่หัวเหลี่ยม', d: 'M2.5 2h19v9c0 6-4.2 9.8-9.5 11.5C6.7 20.8 2.5 17 2.5 11z' },
];

// สัญลักษณ์ (viewBox 24 · วาดทับกลางโล่ ย่อ 60%)
export const EMBLEM_ICONS = [
  { name: 'ดาบ', d: 'M12 1.5 14 4v11h3v2h-3.5v4.5h-3V17H7v-2h3V4z' },
  { name: 'ดาว', d: 'm12 1.5 3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.6l-6.4 3.5L7 14l-5.3-5 7.2-.9z' },
  { name: 'มงกุฎ', d: 'M2.5 7.5 7 11.5 12 4l5 7.5 4.5-4-1.8 11.5H4.3z' },
  { name: 'จันทร์เสี้ยว', d: 'M15.5 2.2a10 10 0 1 0 6.3 14.6A8 8 0 0 1 15.5 2.2z' },
  { name: 'เปลวไฟ', d: 'M12 1c1 4.5 6.8 6.8 6.8 13.2A6.8 6.8 0 0 1 12 23a6.8 6.8 0 0 1-6.8-6.8c0-3 1.6-4.7 3-6 .3 2 1.2 3.4 2.6 3.9C10.2 9.8 10.5 4.8 12 1z' },
  { name: 'ใบไม้', d: 'M21.5 2.5C10 2.5 3 8 3 15.5c0 2 .5 3.6 1.3 5L2.5 22.3l1.4 1.2 1.8-1.8c1.4.8 3 1.3 4.8 1.3C18 23 21.5 13 21.5 2.5zM6.5 19.5c3-4.6 6.5-8 10.5-10.5-3.5 3.2-6.4 6.6-8.6 11.7z' },
  { name: 'ปีก', d: 'M2 6c4.5 0 8.5 2 10 6 1.5-4 5.5-6 10-6-1 3-2.6 5-4.7 6.2 1.7.3 2.9 1 3.7 2.3-2 .5-4 .3-5.6-.5-.6 3-1.8 5.4-3.4 7-1.6-1.6-2.8-4-3.4-7-1.6.8-3.6 1-5.6.5.8-1.3 2-2 3.7-2.3C4.6 11 3 9 2 6z' },
  { name: 'หัวใจ', d: 'M12 21.5S2 15.2 2 8.4A5 5 0 0 1 12 6a5 5 0 0 1 10 2.4C22 15.2 12 21.5 12 21.5z' },
  { name: 'สายฟ้า', d: 'M14.5 1 4.5 13.5h6L8.5 23l11-13.5h-6.2z' },
  { name: 'กางเขนอัศวิน', d: 'M9.5 1.5h5v8h8v5h-8v8h-5v-8h-8v-5h8z' },
  { name: 'อัญมณี', d: 'M6.5 3h11l5 6.2L12 22 1.5 9.2zm1 1.6L4.6 8.4h4.6zm9 0-1.7 3.8h4.6zM10.8 4.6 12 7.9l1.2-3.3zM5 10l6 9.2-2.5-9.2zm14 0h-3.5L13 19.2z' },
  { name: 'หอคอย', d: 'M5 2h3v2.5h2.5V2h3v2.5H16V2h3v6l-2 2v10.5h2.5V23h-15v-2.5H7V10L5 8zm5.5 13v5.5h3V15a1.5 1.5 0 0 0-3 0z' },
];

export const EMBLEM_COLORS = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#16a085', '#2e86de', '#3b3b98', '#8e44ad', '#d63384', '#f5f0e6', '#7f8c8d', '#1e1b24'];

const RE = /^(\d{1,2})-(\d{1,2})-(\d{1,2})-(\d{1,2})$/;
export function parseEmblem(code) {
  const m = RE.exec(String(code || ''));
  if (!m) return null;
  const [s, i, b, f] = m.slice(1).map(Number);
  if (s >= EMBLEM_SHAPES.length || i >= EMBLEM_ICONS.length || b >= EMBLEM_COLORS.length || f >= EMBLEM_COLORS.length) return null;
  return { s, i, b, f };
}
export const emblemCode = (e) => `${e.s}-${e.i}-${e.b}-${e.f}`;
export const randomEmblem = () => {
  const r = (n) => Math.floor(Math.random() * n);
  const b = r(EMBLEM_COLORS.length); let f = r(EMBLEM_COLORS.length); if (f === b) f = (f + 9) % EMBLEM_COLORS.length;
  return emblemCode({ s: r(EMBLEM_SHAPES.length), i: r(EMBLEM_ICONS.length), b, f });
};

// SVG ของตรา (ขนาดตาม CSS ของ element ที่ใส่)
export function emblemSvg(code) {
  const e = parseEmblem(code) || { s: 0, i: 0, b: 0, f: 9 };
  const S = EMBLEM_SHAPES[e.s], I = EMBLEM_ICONS[e.i], bg = EMBLEM_COLORS[e.b], fg = EMBLEM_COLORS[e.f];
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${S.d}" fill="${bg}" stroke="#14100a" stroke-width="1.6" stroke-linejoin="round"/><path d="${S.d}" fill="none" stroke="rgba(255,236,190,.55)" stroke-width=".7" transform="translate(12 12) scale(.86) translate(-12 -12)"/><path d="${I.d}" fill="${fg}" stroke="#14100a" stroke-width="1.1" stroke-linejoin="round" transform="translate(12 12.2) scale(.58) translate(-12 -12)"/></svg>`;
}
