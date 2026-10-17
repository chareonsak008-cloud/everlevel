# Everlevel v0.35 — เฉพาะสกิล Wizard ชุดใหม่ (อาชีพอื่นยังเป็นชุด v0.31)

ไฟล์ที่ต้องอัปโหลดทับใน repo (ผ่าน GitHub web UI) — 7 ไฟล์:

| ไฟล์ | เปลี่ยนอะไร |
| --- | --- |
| js/data/job2Skills.js | สกิล Wizard 7 ช่องใหม่ (ญาณแห่งดวงดาว · บ่อน้ำมานา · ดาบเวทโคจร · หลุมแรงโน้มถ่วง · รอยแยกกาลเวลา · ร่างดารา · มหานวดารา) · Knight/Hunter/Priest เหมือนเดิม · มี LEGACY_JOB2 คืนแต้มสกิล Wizard ชุดเก่า |
| js/render/Job2FX.js | เอฟเฟกต์ Wizard ใหม่ 5 ท่า + ชิ้นส่วน lance2/aim · เอฟเฟกต์อาชีพอื่นเหมือนเดิม |
| js/core/Game.js | กลไกที่ Wizard ใช้: ดูดศัตรู (ctx.pull) · หยุดเวลา (ctx.freeze) · ช้า (slow) · ลอยตัว (hover/heroLift) · ตำแหน่งผู้เล่นแบบสด (caster.pos) และกลไกอื่นที่ยังไม่มีสกิลใช้ (โล่/ฟื้นคืนชีพ/สะท้อน/วาร์ป) |
| js/systems/Combat.js | rollSkill รองรับ crit: true (ยังไม่มีสกิล Wizard ใช้ แต่ไม่กระทบของเดิม) |
| js/systems/MonsterAI.js | สถานะช้า (slowUntil) และถูกดูด (pulledUntil) |
| js/entities/Player.js | โหลดเซฟที่มีสกิล Wizard ชุด v0.31 → คืนแต้มสกิลอัตโนมัติ |
| js/data/skills.js | export LEGACY_JOB2 |

ไม่ต้องอัปโหลด: js/render/Renderer3D.js (มี afterimage() เพิ่ม แต่ Wizard ไม่ใช้ — ถ้าอยากได้ไว้ก่อนก็อัปได้ ไม่กระทบอะไร), PixelVfx.js, affixes.js, Job2Kit.js (เหมือนเดิม)
