# v0.39.0 — ชุดอัปโหลดแก้ "does not provide an export named 'LEGACY_JOB2'"

สาเหตุ: zip อัปโหลดรอบก่อนมี Player.js ใหม่ (ที่ import LEGACY_JOB2) แต่ไม่มี skills.js / job2Skills.js ใหม่ที่ export ให้ repo เลยมีไฟล์ไม่ครบชุด

อัปทับทุกไฟล์ใน zip นี้ (รวม 7 ไฟล์ที่เพิ่มเข้ามา: js/data/skills.js · js/data/job2Skills.js · js/render/Job2FX.js · js/core/Game.js · js/systems/Combat.js · js/systems/MonsterAI.js · js/ui/JobTrial.js) แล้วกด Ctrl+Shift+R
