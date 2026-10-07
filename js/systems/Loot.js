// สุ่มของดรอปจากตารางของมอนสเตอร์
export function rollDrops(table = [], rnd = Math.random) {
  const out = [];
  for (const [id, chance] of table) if (rnd() < chance) out.push(id);
  return out;
}
