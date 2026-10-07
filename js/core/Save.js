// ระบบเซฟ: ใช้ "อะแดปเตอร์" เพื่อสลับไปเซฟบนคลาวด์ได้ภายหลัง
// อะแดปเตอร์ใดก็ได้ที่มี load(key) / save(key, data) แบบ async ใช้แทนกันได้
import { SAVE_KEY, SAVE_SCHEMA, VERSION } from '../config.js';

export class LocalStorageAdapter {
  async load(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  async save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch { return false; }
  }
}

// v0.11: เซฟบนคลาวด์อยู่ใน net/Online.js (ฐานข้อมูลของหน้าเกมบน claude.ai)

export class SaveManager {
  // key: ช่องเก็บในเครื่อง (v0.11: ตัวละครออนไลน์มีเซฟสำรองแยกช่องของตัวเอง)
  constructor(adapter = new LocalStorageAdapter(), key = SAVE_KEY) { this.adapter = adapter; this.key = key; }

  async load() {
    const data = await this.adapter.load(this.key);
    if (!data || data.schema !== SAVE_SCHEMA) return null;
    return data;
  }

  async save(state) {
    return this.adapter.save(this.key, {
      schema: SAVE_SCHEMA, version: VERSION, savedAt: new Date().toISOString(), ...state,
    });
  }
}
