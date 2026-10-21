// Everlevel v0.80 — Edge Function "topup-verify": ตรวจสลิปเติมเพชรอัตโนมัติด้วย EasySlip
// คีย์ทั้งหมดอ่านจาก Secrets ของ Edge Function (ห้ามใส่ในโค้ด/ไฟล์เกม):
//   EASYSLIP_API_KEY       = คีย์ API ของ EasySlip
//   TOPUP_RECEIVER_HINTS   = คำที่ต้องเจอในข้อมูลผู้รับบนสลิป คั่นด้วยจุลภาค เช่น เลขบัญชี/พร้อมเพย์ 4 ตัวท้าย และชื่อผู้รับ (ภาษาไทยหรืออังกฤษ)
//   (SUPABASE_URL · SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY มีให้อัตโนมัติในระบบ Edge Function)
// ผ่านครบ = อนุมัติทันที · สลิปซ้ำ = ปฏิเสธ · ไม่ชัวร์ = ค้างให้แอดมินตรวจ (ไม่มีทางอนุมัติผิดเพราะระบบล่ม)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const H72 = 72 * 3600 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const key = Deno.env.get('EASYSLIP_API_KEY') || '';
  const hints = (Deno.env.get('TOPUP_RECEIVER_HINTS') || '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.length >= 3);

  // ผู้เรียกต้องล็อกอิน (ใช้ JWT ของผู้เล่นเอง)
  const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'not_signed_in' }, 401);

  let id = 0;
  try { id = Number((await req.json()).id); } catch { /* */ }
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'bad_id' }, 400);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: row, error: e1 } = await admin.rpc('topup_auto_claim', { p_id: id, p_user: user.id });
  if (e1 || !row) return json({ status: 'pending', reason: 'claim_failed' });
  if (!row.ok) return json({ status: row.status, reason: row.reason });

  const decide = async (result: 'approve' | 'reject' | 'manual', note: string, trans: string | null = null, amount: number | null = null) => {
    const { data } = await admin.rpc('topup_auto_decide', { p_id: id, p_result: result, p_trans: trans, p_amount: amount, p_note: note });
    return json({ status: (data && data.status) || 'pending', reason: (data && data.reason) || note, gems: data && data.gems });
  };

  if (!key || !hints.length) return decide('manual', 'ยังไม่ได้ตั้งค่าตรวจสลิปอัตโนมัติ');

  // อ่านรูปสลิปจาก Storage (bucket ส่วนตัว)
  const { data: file, error: e2 } = await admin.storage.from('slips').download(row.slip_path);
  if (e2 || !file) return decide('manual', 'อ่านไฟล์สลิปไม่ได้');
  const b64 = encodeBase64(new Uint8Array(await file.arrayBuffer()));

  let j: any = null;
  try {
    const res = await fetch('https://api.easyslip.com/v2/verify/bank', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: `data:image/jpeg;base64,${b64}`, checkDuplicate: true, remark: `everlevel-topup-${id}` }),
    });
    j = await res.json();
  } catch { j = null; }
  if (!j || !j.success) return decide('manual', `ตรวจสลิปไม่ผ่าน (${(j && j.error && j.error.code) || 'service_error'})`);

  const d = j.data || {}, s = d.rawSlip || {};
  const trans = String(s.transRef || '').trim(), amount = Number(s.amount && s.amount.amount);
  if (!trans) return decide('manual', 'ไม่พบเลขอ้างอิงในสลิป');
  if (d.isDuplicate) return decide('reject', 'สลิปนี้เคยถูกใช้แล้ว', null, amount);
  if (!Number.isFinite(amount) || Math.abs(amount - Number(row.thb)) > 0.001) return decide('manual', `ยอดในสลิป ${amount} บาท ไม่ตรงกับแพ็ก ${row.thb} บาท`);

  // บัญชีผู้รับต้องตรงกับที่ตั้งไว้ (เลขท้าย/ชื่อ)
  const acc = (s.receiver && s.receiver.account) || {};
  const recv = [acc.name && acc.name.th, acc.name && acc.name.en, acc.bank && acc.bank.account, acc.proxy && acc.proxy.account].filter(Boolean).join(' ').toLowerCase();
  const recvDigits = recv.replace(/[^0-9]/g, '');
  const match = hints.some((h) => recv.includes(h) || (/^\d+$/.test(h) && recvDigits.includes(h)));
  if (!match) return decide('manual', 'บัญชีผู้รับในสลิปไม่ตรงกับบัญชีของเกม');

  // วันที่โอน: ไม่เก่ากว่า 72 ชม. ก่อนส่งคำขอ และไม่ใช่อนาคต
  const t = Date.parse(s.date), made = Date.parse(row.created_at);
  if (!Number.isFinite(t) || t < made - H72 || t > Date.now() + 10 * 60 * 1000) return decide('manual', 'วันที่ในสลิปไม่อยู่ในช่วงที่รับได้');

  return decide('approve', 'ตรวจสลิปอัตโนมัติ ✓', trans, amount);
});
