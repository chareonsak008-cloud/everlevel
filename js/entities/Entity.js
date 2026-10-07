// ฐานของสิ่งมีชีวิตทุกตัว (ผู้เล่น, NPC, มอนสเตอร์ในอนาคต) — ตรรกะล้วน ไม่มีการวาด
// ตำแหน่ง x, y เป็นพิกัดโลก (16 หน่วย = 1 ช่อง) ส่วน 3 มิติแปลงเองใน Renderer
export class Entity {
  constructor({ name, x, y, look = {}, dir = 'down' }) {
    this.name = name;
    this.x = x; this.y = y;          // ตำแหน่งเท้า
    this.look = look;                // สีผม/เสื้อ/อุปกรณ์ สำหรับโมเดล
    this.dir = dir;
    this.angle = Entity.dirToAngle(dir); // มุมที่หันหน้า (เรเดียน) 0 = หันลงใต้
    this.moving = false;
    this.speedFactor = 0;            // 0..1 ใช้ปรับความเร็วท่าเดิน
  }

  static dirToAngle(dir) {
    return { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 }[dir] ?? 0;
  }

  get sortY() { return this.y; }

  box(x = this.x, y = this.y) { return [x - 4, y - 3, x + 4, y + 1]; }

  moveBy(dx, dy, map) {
    let moved = false;
    if (dx) { const nx = this.x + dx; if (!map.boxBlocked(...this.box(nx, this.y))) { this.x = nx; moved = true; } }
    if (dy) { const ny = this.y + dy; if (!map.boxBlocked(...this.box(this.x, ny))) { this.y = ny; moved = true; } }
    return moved;
  }

  // หันหน้าตามทิศการเคลื่อนที่ (หมุนได้รอบทิศอย่างนุ่มนวล)
  face(dx, dy) {
    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) return;
    this.angle = Math.atan2(dx, dy);
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  faceToward(other) { this.face(other.x - this.x, other.y - this.y); }
}
