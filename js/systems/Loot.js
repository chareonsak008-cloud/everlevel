// สุ่มของดรอปจากตารางของมอนสเตอร์
export function rollDrops(table = [], rnd = Math.random) {
  const out = [];
  for (const [id, chance] of table) if (rnd() < Math.max(0, Math.min(1, chance))) out.push(id);
  return out;
}
