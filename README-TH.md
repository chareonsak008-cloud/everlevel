# อัปเดต Everlevel v0.18.1 บน GitHub

1. ดาวน์โหลด index.html ที่ส่งแยก หรือแตก ZIP แล้วใช้ GitHub-Single-File/index.html
2. เข้า repository เดิมบน GitHub ไปที่โฟลเดอร์หลักที่มี index.html
3. กด Add file → Upload files แล้วเลือก index.html ฉบับใหม่เพียงไฟล์เดียว
4. กด Commit changes แล้วรอ GitHub Pages สร้างเว็บเวอร์ชันใหม่
5. เปิดเว็บ/รีเฟรช ตรวจว่าแสดง v0.18.1 ถ้ายังเห็นเวอร์ชันเดิม ให้ปิดแท็บแล้วเปิดใหม่หรือรีเฟรชแบบข้ามแคช

ไฟล์รวมนี้มี HTML/CSS/JavaScript/Three.js อยู่ด้วยกัน ประมาณ 2.08 MiB เหมาะสำหรับอัปโหลดจากมือถือหรือ PC
ไฟล์การตั้งค่าออนไลน์อ่านจาก js/net/server-config.js ใน repository เดิม และใช้ชื่อเซฟเดิม

GitHub จำกัดการอัปโหลดผ่านเว็บครั้งละ 100 ไฟล์ และไฟล์ละ 25 MiB ชุด v0.18 เดิมมี 107 ไฟล์ จึงเกินจำนวนต่อรอบ ชุดนี้อัปเดตด้วย index.html ไฟล์เดียว
อ้างอิง: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository

## การแก้ไขเกมต่อในอนาคต

โฟลเดอร์ everlevel ใน ZIP เป็นซอร์สแยกไฟล์ที่แก้ไขแล้ว หน้า index.html ในซอร์สนี้ใช้ js/main.js และ vendor/three.min.js
หากแก้ซอร์ส แล้วต้องการสร้างชุด GitHub ไฟล์เดียวใหม่: ใช้ Node.js → npm install → npm run build:github
ผลลัพธ์จะอยู่ที่ dist/single-file/index.html
รายละเอียดการตรวจอยู่ใน TEST_REPORT.md
