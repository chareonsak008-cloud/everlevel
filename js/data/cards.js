// การ์ดมอนสเตอร์ (v0.10) — ใส่ในช่องการ์ดของอุปกรณ์ เพิ่มค่าสถานะถาวร (ใส่แล้วถอดไม่ได้)
// on = ช่องอุปกรณ์ที่ใส่ได้ · drop = โอกาสดรอปต่อการกำจัด 1 ตัว (หายากมาก)

import { CARD_CATALOG, CARD_MAPS, toBonus } from './cardCatalog.js?v=0.84.0';

// v0.29: การ์ดทั้งหมดมาจาก cardCatalog.js (Normal / Elite / MVP) · รหัสการ์ดเดิมใช้ต่อได้
// legacyOn = ช่องเดิมก่อน v0.29 — อุปกรณ์ที่เคยเสียบไว้แล้วยังใช้ได้ (เสียบใหม่ต้องใช้ช่องใหม่)
const LEGACY = {"card_ruin_scarab":["shoes","#b6a26d"],"card_sand_basilisk":["garment","#bba16a"],"card_rune_sentinel":["shield","#9bb7ad"],"card_astral_wisp":["accessory","#83d4ff"],"card_relic_knight":["weapon","#cca85c"],"card_haunt_spider":["shoes","#816691"],"card_hollow_wolf":["weapon","#606a88"],"card_mourning_shade":["head","#a99fe2"],"card_cursed_stag":["body","#7ea7a0"],"card_eclipse_reaper":["garment","#816490"],"card_bloodmoon_knight":["shield","#963e58"],"card_aurex":["body","#cfba72"],"card_nocthar":["weapon","#b04c78"],"card_bloblet":["shoes","#6fd8c8"],"card_capling":["head","#4a8fd8"],"card_stinglet":["weapon","#f2b632"],"card_thornback":["shield","#b8a46a"],"card_wisp":["accessory","#9affc8"],"card_barkwolf":["weapon","#8a6a4a"],"card_gnarlroot":["body","#7ac85a"],"card_frostfox":["shoes","#e8f4ff"],"card_frostbat":["garment","#9ad8ff"],"card_yeti":["body","#dfe8f4"],"card_icegolem":["shield","#7fe0ff"],"card_glacia":["head","#bff4ff"],"card_magmaslime":["body","#ff7a2a"],"card_emberimp":["weapon","#ff5a3a"],"card_salamander":["garment","#ff9a3a"],"card_obsidiangolem":["shield","#4a3a5a"],"card_ignarok":["weapon","#ff4a1a"]};
const RARITY = { normal: 'rare', elite: 'legend', mvp: 'mythic' };
const PRICE = { normal: 5000, elite: 25000, mvp: 120000 };
export const CARDS = Object.fromEntries(CARD_CATALOG.map((c) => {
  const old = LEGACY[c.id];
  return [c.id, {
    mob: c.monster.id, name: c.name_th, on: c.slot, legacyOn: old && old[0] !== c.slot ? old[0] : null,
    color: (old && old[1]) || CARD_MAPS[c.monster.map].tone[0], bonus: toBonus(c.effects), drop: c.drop_rate * 0.5, desc: c.flavor,
    rarity: RARITY[c.rank], rank: c.rank, maxStack: c.stackable ? c.max_stack : 1, price: PRICE[c.rank], combo: c.combo_id, catalog: c,
  }];
}));
// ใส่การ์ดนี้ในช่องอุปกรณ์นี้ได้ไหม (ช่องใหม่ หรือช่องเดิมสำหรับของที่เสียบไว้ก่อน v0.29)
export const cardFits = (cardId, slot, legacy = false) => { const c = CARDS[cardId]; return !!c && (c.on === slot || (legacy && c.legacyOn === slot)); };

const SLOT_THAI = { weapon: 'อาวุธ', head: 'หมวก', body: 'ชุด', shield: 'โล่', garment: 'ผ้าคลุม', shoes: 'รองเท้า', accessory: 'เครื่องประดับ' };
export const cardSlotName = (on) => SLOT_THAI[on] || on;

// ไอเทมการ์ด (รวมเข้า ITEMS ใน data/items.js)
export const CARD_ITEMS = Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [id, {
  name: c.name, type: 'card', monster: c.mob, icon: ['card', c.color], price: c.price, rarity: c.rarity, rank: c.rank, maxStack: c.maxStack,
  on: c.on, bonus: c.bonus, desc: `${c.desc} · ใส่ได้กับ${SLOT_THAI[c.on]}ที่มีช่องการ์ดว่าง · ${c.maxStack > 1 ? 'เสียบซ้ำได้สูงสุด ' + c.maxStack + ' ใบต่อชิ้น' : 'ไม่ซ้อน (1 ใบต่อชิ้น)'}`,
}]));

// ตารางดรอปการ์ดของมอนสเตอร์แต่ละชนิด
const BY_MOB = Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [c.mob, [id, c.drop]]));
export const cardDrops = (mobType) => (BY_MOB[mobType] ? [BY_MOB[mobType]] : []);
