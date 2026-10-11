// ค่าคงที่ของเกม — ปรับสมดุลเกมจากไฟล์นี้ได้
export const VERSION = '0.23.0';
export const ALLOW_OFFLINE = false;   // v0.17.1: เล่นได้แบบออนไลน์เท่านั้น (เปิด true เฉพาะหน้าทดสอบ/พรีวิว)
export const TILE = 16;            // ขนาดช่องแผนที่ (พิกเซลอาร์ต)
export const PLAYER_SPEED = 80;    // พิกเซลต่อวินาที
export const SAVE_KEY = typeof window !== 'undefined' && window.__contentPreview ? 'everlevel.content-preview.v020' : 'asteria.save';
export const SAVE_SCHEMA = 1;
export const AUTOSAVE_SECONDS = 10;
