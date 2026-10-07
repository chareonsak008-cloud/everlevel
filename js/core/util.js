// ฟังก์ชันช่วยทั่วไป

// ตัวสุ่มแบบกำหนด seed ได้ เพื่อให้โลกหน้าตาเหมือนเดิมทุกครั้ง
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// หมุนมุมไปหาเป้าหมายทางที่สั้นที่สุด
export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// ค่าความหน่วงที่ไม่ขึ้นกับเฟรมเรต
export const damp = (speed, dt) => 1 - Math.exp(-speed * dt);

export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return (h ^ (h >>> 16)) / 4294967296;
}
