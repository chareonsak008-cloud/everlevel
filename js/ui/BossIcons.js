// v0.93 fix8 สัญลักษณ์บอสบนแผนที่ (แทนจุดแดง)
// · MVP = เหรียญทองรูปหัวกะโหลกสวมมงกุฎ · บอสโลก = ตราแดงเพลิง หัวปีศาจมีเขา + เปลวไฟรอบ
// วาดครั้งเดียวที่ 96px แล้วย่อลงตามขนาดแผนที่ (คมทุกขนาด)

const cache = {};
const TAU = Math.PI * 2;

function skull(g, C, s, horn) {
  // หัวกะโหลก
  g.fillStyle = '#fff6e0';
  g.beginPath(); g.arc(C, C - s * 0.08, s * 0.42, Math.PI * 0.92, Math.PI * 0.08); g.lineTo(C + s * 0.3, C + s * 0.3); g.lineTo(C - s * 0.3, C + s * 0.3); g.closePath(); g.fill();
  g.fillRect(C - s * 0.22, C + s * 0.26, s * 0.44, s * 0.16);
  // เบ้าตา + จมูก + ฟัน
  g.fillStyle = horn ? '#ff3a1a' : '#3a1606';
  g.beginPath(); g.ellipse(C - s * 0.17, C - s * 0.02, s * 0.12, s * 0.14, 0.2, 0, TAU); g.ellipse(C + s * 0.17, C - s * 0.02, s * 0.12, s * 0.14, -0.2, 0, TAU); g.fill();
  g.fillStyle = '#3a1606';
  g.beginPath(); g.moveTo(C, C + s * 0.1); g.lineTo(C - s * 0.06, C + s * 0.2); g.lineTo(C + s * 0.06, C + s * 0.2); g.closePath(); g.fill();
  for (let i = -1; i <= 1; i++) g.fillRect(C + i * s * 0.12 - s * 0.015, C + s * 0.28, s * 0.03, s * 0.14);
  if (horn) {   // เขาปีศาจโค้ง
    g.fillStyle = '#ffd9a0';
    for (const d of [-1, 1]) {
      g.beginPath(); g.moveTo(C + d * s * 0.28, C - s * 0.3); g.quadraticCurveTo(C + d * s * 0.62, C - s * 0.42, C + d * s * 0.56, C - s * 0.82);
      g.quadraticCurveTo(C + d * s * 0.46, C - s * 0.5, C + d * s * 0.12, C - s * 0.42); g.closePath(); g.fill();
    }
  }
}

function crown(g, C, y, w) {
  g.fillStyle = '#ffd34a'; g.strokeStyle = '#7a4a08'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(C - w, y); g.lineTo(C - w, y - w * 0.7); g.lineTo(C - w * 0.5, y - w * 0.3); g.lineTo(C, y - w * 0.95); g.lineTo(C + w * 0.5, y - w * 0.3); g.lineTo(C + w, y - w * 0.7); g.lineTo(C + w, y); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ff4a6a'; for (const x of [-w, 0, w]) { g.beginPath(); g.arc(C + x, y - (x ? w * 0.72 : w * 0.97), w * 0.14, 0, TAU); g.fill(); }
}

function make(kind) {
  const N = 96, C = N / 2, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  if (kind === 'gold' || kind === 'champ') {   // v0.93 fix17 มอนทองคำ = เหรียญทองดาวประกาย · แชมเปี้ยน = ดาวม่วงห้าแฉก
    const gold = kind === 'gold';
    g.fillStyle = gold ? '#7a4a08' : '#2a0e3a'; g.beginPath(); g.arc(C, C, N * 0.44, 0, TAU); g.fill();
    const gd = g.createRadialGradient(C - 8, C - 10, 4, C, C, N * 0.4); gd.addColorStop(0, gold ? '#fff6c0' : '#f0d8ff'); gd.addColorStop(0.5, gold ? '#ffcf3a' : '#b46aff'); gd.addColorStop(1, gold ? '#c07a0e' : '#5a1aa0');
    g.fillStyle = gd; g.beginPath(); g.arc(C, C, N * 0.38, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.strokeStyle = gold ? '#8a5208' : '#3a0a5a'; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * TAU, r = i % 2 ? N * 0.12 : N * 0.28; g[i ? 'lineTo' : 'moveTo'](C + Math.cos(a) * r, C + Math.sin(a) * r); }
    g.closePath(); g.fill(); g.stroke();
    return c;
  }
  if (kind === 'world') {
    // เปลวไฟ 12 แฉกรอบตรา
    const fl = g.createRadialGradient(C, C, N * 0.2, C, C, N * 0.5); fl.addColorStop(0, '#ffde6a'); fl.addColorStop(0.55, '#ff5a1a'); fl.addColorStop(1, 'rgba(160,10,30,0)');
    g.fillStyle = fl; g.beginPath();
    for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU - Math.PI / 2, r = i % 2 ? N * 0.33 : N * 0.49; const x = C + Math.cos(a) * r, y = C + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath(); g.fill();
    // ตราแดงเข้ม ขอบทอง
    const bg = g.createRadialGradient(C, C - 6, 2, C, C, N * 0.34); bg.addColorStop(0, '#a01830'); bg.addColorStop(1, '#3a0414');
    g.fillStyle = bg; g.beginPath(); g.arc(C, C, N * 0.33, 0, TAU); g.fill();
    g.lineWidth = 4; g.strokeStyle = '#ffcf5a'; g.stroke(); g.lineWidth = 1.5; g.strokeStyle = '#5a1a08'; g.beginPath(); g.arc(C, C, N * 0.3, 0, TAU); g.stroke();
    skull(g, C, N * 0.5, true);
  } else {
    // เหรียญทอง ขอบหยัก 16 แฉก
    g.fillStyle = '#7a4a08'; g.beginPath();
    for (let i = 0; i <= 32; i++) { const a = i / 32 * TAU, r = i % 2 ? N * 0.42 : N * 0.47; const x = C + Math.cos(a) * r, y = C + 4 + Math.sin(a) * r * 0.98; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath(); g.fill();
    const gd = g.createLinearGradient(0, N * 0.15, 0, N * 0.9); gd.addColorStop(0, '#fff2a8'); gd.addColorStop(0.45, '#ffc23a'); gd.addColorStop(1, '#c0700e');
    g.fillStyle = gd; g.beginPath(); g.arc(C, C + 4, N * 0.38, 0, TAU); g.fill();
    const in2 = g.createRadialGradient(C, C, 2, C, C + 4, N * 0.3); in2.addColorStop(0, '#5a2a8a'); in2.addColorStop(1, '#22083a');
    g.fillStyle = in2; g.beginPath(); g.arc(C, C + 4, N * 0.3, 0, TAU); g.fill();
    g.save(); g.translate(0, 8); skull(g, C, N * 0.44, false); g.restore();
    crown(g, C, N * 0.24, N * 0.2);
  }
  return c;
}

export function bossIcon(kind) { return cache[kind] || (cache[kind] = make(kind)); }
export function bossKind(m) { const d = m.data || m; return m.golden ? 'gold' : m.champ ? 'champ' : d.worldBoss || m.worldRun ? 'world' : 'mvp'; }

// วาดสัญลักษณ์ + วงแสงกะพริบ ที่ (x, y) ขนาด size พิกเซล
export function drawBossIcon(g, x, y, size, kind, t = performance.now() / 1000) {
  const world = kind === 'world', col = world ? '255,70,40' : kind === 'champ' ? '190,110,255' : '255,200,60';
  const k = (t * (world ? 1.2 : 0.9)) % 1;
  g.save();
  // วงคลื่นแผ่ออก 2 ระลอก
  for (const off of [0, 0.5]) { const q = (k + off) % 1; g.strokeStyle = `rgba(${col},${(1 - q) * 0.9})`; g.lineWidth = Math.max(1, size * 0.08); g.beginPath(); g.arc(x, y, size * (0.45 + q * 0.75), 0, TAU); g.stroke(); }
  // แสงเรืองหลังตรา
  const gl = g.createRadialGradient(x, y, 0, x, y, size * 0.8); gl.addColorStop(0, `rgba(${col},0.55)`); gl.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gl; g.beginPath(); g.arc(x, y, size * 0.8, 0, TAU); g.fill();
  const s = size * (1 + Math.sin(t * 5) * 0.06);
  g.drawImage(bossIcon(kind), x - s / 2, y - s / 2, s, s);
  g.restore();
}
