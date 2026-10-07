// ตั้งค่าเซิร์ฟเวอร์ออนไลน์ (v0.12) — ใส่ค่าจาก Supabase → Project Settings → API
// · SUPABASE_URL      = Project URL เช่น 'https://abcdefghijk.supabase.co'
// · SUPABASE_ANON_KEY = anon public key (คีย์สาธารณะ ใส่ในหน้าเว็บได้ เพราะฐานข้อมูลเปิด Row Level Security ไว้แล้ว)
// ห้ามใส่ service_role key หรือรหัสผ่านฐานข้อมูลในไฟล์นี้เด็ดขาด
// เว้นว่างไว้ = ไม่ใช้เซิร์ฟเวอร์ (เปิดผ่าน claude.ai จะใช้บัญชี Claude · เปิดที่อื่นจะเป็นโหมดออฟไลน์)
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
