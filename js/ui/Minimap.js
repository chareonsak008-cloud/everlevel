// มินิแมพมุมขวาบน (ทิศเหนืออยู่ด้านบนเสมอ, กรวยแสดงทิศที่กล้องมอง)
import { TILE } from '../config.js';
import { TILE_INFO } from '../data/tileTypes.js';

const S = 2; // พิกเซลต่อช่อง
const OBJ_COLORS = { tent: '#c8643a', icecrystal: '#7fe0ff', obsidian: '#1c1420', house: '#9a5f3e', tree: '#2f6b35', pine: '#2a5e3a', fountain: '#7fb3e6', stall: '#d0904a', well: '#9a958a', tower: '#7a7482' };

export class Minimap {
  constructor(canvas, map, npcs) {
    this.canvas = canvas; this.map = map; this.npcs = npcs;
    canvas.width = map.w * S; canvas.height = map.h * S;
    this.ctx = canvas.getContext('2d');
    const base = document.createElement('canvas'); base.width = canvas.width; base.height = canvas.height;
    const b = base.getContext('2d');
    const mini = (map.def.theme || {}).mini || {};   // v0.11: สีตามธีมแผนที่ (หิมะ/ลาวา)
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const ti = TILE_INFO[map.ground[map.idx(x, y)]];
      b.fillStyle = mini[ti.key] || ti.mini; b.fillRect(x * S, y * S, S, S);
    }
    for (const o of map.objects) {
      const c = OBJ_COLORS[o.kind]; if (!c) continue;
      b.fillStyle = c; b.fillRect(o.def.x * S, o.def.y * S, o.fw * S, o.fh * S);
    }
    for (const p of map.portals) { b.fillStyle = '#c86bff'; b.fillRect(p.x * S, p.y * S, p.w * S, p.h * S); }
    this.base = base;
  }

  draw(player, yaw = 0, bosses = []) {
    const ctx = this.ctx;
    ctx.drawImage(this.base, 0, 0);
    // NPC: เหลือง = ทั่วไป · ส้ม = ร้านค้า · เขียว = คลัง · ฟ้า = วาร์ป · ม่วง = เปลี่ยนอาชีพ
    for (const n of this.npcs) {
      const t = n.service && n.service.type;
      ctx.fillStyle = t === 'shop' ? '#ff9a3a' : t === 'storage' ? '#5ae0a8' : t === 'warp' ? '#7fe0ff' : t === 'job' ? '#d49bff' : '#ffd34d';
      const big = t ? 1 : 0;
      ctx.fillRect(Math.floor(n.x / TILE) * S - big, Math.floor(n.y / TILE) * S - big, S + big * 2, S + big * 2);
    }
    // ตำแหน่งบอส MVP: จุดแดงกะพริบ + วงแหวน
    for (const b of bosses) {
      const bx = (b.x / TILE) * S, by = (b.y / TILE) * S, k = (performance.now() / 600) % 1;
      ctx.strokeStyle = `rgba(255,70,70,${1 - k})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(bx, by, 3 + k * 7, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ff4646'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(bx, by, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    const px = (player.x / TILE) * S, py = (player.y / TILE) * S;
    // กรวยมุมกล้อง: กล้องมองไปทาง (-sin yaw, -cos yaw)
    const a = Math.atan2(-Math.cos(yaw), -Math.sin(yaw));
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 26, a - 0.5, a + 0.5); ctx.closePath(); ctx.fill();
    // ลูกศรผู้เล่น
    ctx.save(); ctx.translate(px, py); ctx.rotate(-player.angle);
    ctx.fillStyle = '#e8384f'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(3.5, -3.5); ctx.lineTo(0, -1.5); ctx.lineTo(-3.5, -3.5); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
}
