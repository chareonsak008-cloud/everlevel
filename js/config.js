// เธเนเธฒเธเธเธ—เธตเนเธเธญเธเน€เธเธก โ€” เธเธฃเธฑเธเธชเธกเธ”เธธเธฅเน€เธเธกเธเธฒเธเนเธเธฅเนเธเธตเนเนเธ”เน
export const VERSION = '0.93.0';
export const PATCH = 1;   // ครั้งที่แก้ไขในเวอร์ชันนี้ (ไม่เปลี่ยนเลขเวอร์ชัน · ประกาศเป็น "แก้ไข" ในเกม)
export const ALLOW_OFFLINE = false;   // v0.17.1: เน€เธฅเนเธเนเธ”เนเนเธเธเธญเธญเธเนเธฅเธเนเน€เธ—เนเธฒเธเธฑเนเธ (เน€เธเธดเธ” true เน€เธเธเธฒเธฐเธซเธเนเธฒเธ—เธ”เธชเธญเธ/เธเธฃเธตเธงเธดเธง)
export const ZENY_INCOME = 1 / 5;   // v0.86: ตัวคูณ Zeny จากรางวัล (เควสต์/ดันเจี้ยน/เช็กอิน) · v0.50 = 1/3 · ทำให้ Zeny หายากขึ้น
export const TILE = 16;            // เธเธเธฒเธ”เธเนเธญเธเนเธเธเธ—เธตเน (เธเธดเธเน€เธเธฅเธญเธฒเธฃเนเธ•)
export const PLAYER_SPEED = 80;    // เธเธดเธเน€เธเธฅเธ•เนเธญเธงเธดเธเธฒเธ—เธต
export const SAVE_KEY = typeof window !== 'undefined' && window.__contentPreview ? 'everlevel.content-preview.v020' : 'asteria.save';
export const SAVE_SCHEMA = 1;
export const AUTOSAVE_SECONDS = 10;
