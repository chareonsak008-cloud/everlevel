// v0.25.0: อาวุธ 48 ชิ้น (12 ประเภท × 4) ตามสเปกดีไซน์ Everlevel — แก้ตัวเลขในไฟล์นี้ได้โดยตรง
// schema: id, name_th, name_en, type, class, req_level, tier(สี), rarity(เกรดในเกม), base{atk,matk,element,weight},
// fixed_stats, random_stats[{stat,min,max}], random_count[min,max], slots, passive, set, drop[{map,monster,rate}], refine_per_level, look, description
// สร้างจากสูตร: ATK พื้นฐาน = (12 + 2.8×เลเวล) × ตัวคูณประเภท × (1 + (ตัวคูณเกรด−1)×0.3) · ช่วงค่าสุ่มคูณตัวคูณเกรดเต็ม
export const WEAPON_FORMS = {
 "sword_1h": {
  "job": "swordsman",
  "wtype": "sword",
  "twoHand": false,
  "reach": 0,
  "fixed": {}
 },
 "sword_2h": {
  "job": "swordsman",
  "wtype": "sword",
  "twoHand": true,
  "reach": 0,
  "fixed": {
   "ASPD%": -10
  }
 },
 "spear": {
  "job": "swordsman",
  "wtype": "sword",
  "twoHand": false,
  "reach": 0.6,
  "fixed": {
   "ASPD%": -5
  }
 },
 "rod": {
  "job": "mage",
  "wtype": "staff",
  "twoHand": false,
  "reach": 0,
  "fixed": {
   "Cast Time -%": 10
  }
 },
 "staff": {
  "job": "mage",
  "wtype": "staff",
  "twoHand": false,
  "reach": 0,
  "fixed": {
   "Cast Time -%": -8
  }
 },
 "orb": {
  "job": "mage",
  "wtype": "staff",
  "twoHand": false,
  "reach": 0,
  "fixed": {
   "MaxSP%": 5
  }
 },
 "mace": {
  "job": "acolyte",
  "wtype": "mace",
  "twoHand": false,
  "reach": 0,
  "fixed": {}
 },
 "scepter": {
  "job": "acolyte",
  "wtype": "mace",
  "twoHand": false,
  "reach": 0,
  "fixed": {
   "Heal Power%": 8
  }
 },
 "book": {
  "job": "acolyte",
  "wtype": "mace",
  "twoHand": false,
  "reach": 0,
  "fixed": {
   "After-cast Delay -%": 8
  }
 },
 "shortbow": {
  "job": "archer",
  "wtype": "bow",
  "twoHand": false,
  "reach": 0,
  "fixed": {
   "ASPD%": 8,
   "Range": -1
  }
 },
 "longbow": {
  "job": "archer",
  "wtype": "bow",
  "twoHand": false,
  "reach": 0,
  "fixed": {
   "ASPD%": -6,
   "Range": 1
  }
 },
 "crossbow": {
  "job": "archer",
  "wtype": "bow",
  "twoHand": false,
  "reach": 0,
  "fixed": {
   "ASPD%": -15,
   "HIT": 10
  }
 }
};
export const WEAPON_DEFS = [
 {
  "id": "wpn_sword_001",
  "name_th": "ดาบกิ่งรุ่งอรุณ",
  "name_en": "Dawnbranch Blade",
  "type": "sword_1h",
  "class": [
   "swordsman"
  ],
  "req_level": 1,
  "tier": "white",
  "rarity": "common",
  "base": {
   "atk": 15,
   "matk": 0,
   "element": "neutral",
   "weight": 80
  },
  "fixed_stats": {
   "STR": 1
  },
  "random_stats": [
   {
    "stat": "STR",
    "min": 1,
    "max": 2
   },
   {
    "stat": "VIT",
    "min": 1,
    "max": 2
   },
   {
    "stat": "ATK",
    "min": 1,
    "max": 1
   },
   {
    "stat": "HIT",
    "min": 2,
    "max": 5
   }
  ],
  "random_count": [
   0,
   1
  ],
  "slots": 0,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "สมดุล ใส่โล่ได้",
  "tradeoff": "ไม่มีจุดเด่นเฉพาะ",
  "drop": [
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "bloblet",
    "rate": 0.02
   },
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "capling",
    "rate": 0.02
   }
  ],
  "refine_per_level": {
   "atk": 3
  },
  "look": {
   "form": "sword_1h",
   "shape": "leaf",
   "c1": "#d9dde4",
   "c2": "#8a6a3e",
   "glow": "#ffe9a8"
  },
  "description": "ใบดาบทรงใบไม้ ด้ามไม้มะฮอกกานีพันเชือก ดาบแรกของนักผจญภัยในทุ่งรุ่งอรุณ"
 },
 {
  "id": "wpn_sword_002",
  "name_th": "ดาบโค้งหนามธอร์น",
  "name_en": "Thornbite Saber",
  "type": "sword_1h",
  "class": [
   "swordsman"
  ],
  "req_level": 18,
  "tier": "blue",
  "rarity": "rare",
  "base": {
   "atk": 69,
   "matk": 0,
   "element": "earth",
   "weight": 87
  },
  "fixed_stats": {
   "STR": 2,
   "FLEE": -4
  },
  "random_stats": [
   {
    "stat": "STR",
    "min": 1,
    "max": 4
   },
   {
    "stat": "ATK",
    "min": 3,
    "max": 5
   },
   {
    "stat": "CRIT",
    "min": 1,
    "max": 4
   },
   {
    "stat": "ดูดเลือด%",
    "min": 1,
    "max": 1
   },
   {
    "stat": "DMG vs beast",
    "min": 4,
    "max": 11
   }
  ],
  "random_count": [
   2,
   3
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "คริ + ดูดเลือด",
  "tradeoff": "FLEE -4",
  "drop": [
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "wisp",
    "rate": 0.005
   },
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "frostfox",
    "rate": 0.005
   }
  ],
  "refine_per_level": {
   "atk": 5
  },
  "look": {
   "form": "sword_1h",
   "shape": "saber",
   "c1": "#b8d48a",
   "c2": "#4e6a2a",
   "glow": "#9cff6a"
  },
  "description": "ดาบโค้งที่สันมีหนามเรียงเป็นฟันเลื่อย ขอบใบเขียวเหมือนเปลือกธอร์นแบ็ก"
 },
 {
  "id": "wpn_sword_003",
  "name_th": "เรเปียร์ลมกระจก",
  "name_en": "Glasswind Rapier",
  "type": "sword_1h",
  "class": [
   "swordsman"
  ],
  "req_level": 45,
  "tier": "purple",
  "rarity": "epic",
  "base": {
   "atk": 163,
   "matk": 0,
   "element": "wind",
   "weight": 98
  },
  "fixed_stats": {
   "STR": 5,
   "VIT": 3,
   "MaxHP%": -5
  },
  "random_stats": [
   {
    "stat": "STR",
    "min": 3,
    "max": 8
   },
   {
    "stat": "AGI",
    "min": 3,
    "max": 8
   },
   {
    "stat": "ASPD%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "HIT",
    "min": 6,
    "max": 14
   },
   {
    "stat": "Melee DMG%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "CRIT",
    "min": 2,
    "max": 5
   }
  ],
  "random_count": [
   3,
   4
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": [
   "AGI"
  ],
  "style": "ตีรัวเร็ว (ไฮบริด STR+AGI)",
  "tradeoff": "MaxHP -5%",
  "drop": [
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "icegolem",
    "rate": 0.0025
   },
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "magmaslime",
    "rate": 0.0025
   }
  ],
  "refine_per_level": {
   "atk": 7
  },
  "look": {
   "form": "sword_1h",
   "shape": "rapier",
   "c1": "#e6fbff",
   "c2": "#5ab4c8",
   "glow": "#8af0ff",
   "guard": "ring"
  },
  "description": "ใบเรเปียร์ใสดั่งแก้ว การ์ดเป็นวงแหวนเกลียวลม เบาจนแทบไม่รู้สึกน้ำหนัก"
 },
 {
  "id": "wpn_sword_004",
  "name_th": "ดาบสาบานผู้พิทักษ์",
  "name_en": "Oathwarden Blade",
  "type": "sword_1h",
  "class": [
   "swordsman"
  ],
  "req_level": 80,
  "tier": "gold",
  "rarity": "mythic",
  "base": {
   "atk": 307,
   "matk": 0,
   "element": "holy",
   "weight": 112
  },
  "fixed_stats": {
   "STR": 9,
   "VIT": 5,
   "ASPD%": -6
  },
  "random_stats": [
   {
    "stat": "STR",
    "min": 6,
    "max": 14
   },
   {
    "stat": "VIT",
    "min": 6,
    "max": 14
   },
   {
    "stat": "MaxHP%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "ลดดาเมจรับ%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "ATK%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "DMG vs undead",
    "min": 6,
    "max": 16
   }
  ],
  "random_count": [
   4,
   5
  ],
  "slots": 2,
  "passive": {
   "kind": "guard",
   "hp": 40,
   "value": 15,
   "text": "เมื่อ HP ต่ำกว่า 40% ลดดาเมจที่ได้รับเพิ่ม 15%"
  },
  "set": null,
  "hybrid": null,
  "style": "แทงค์ป้องกัน",
  "tradeoff": "ASPD -6%",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "ignarok",
    "rate": 0.009
   },
   {
    "map": "Ancient Ruins",
    "map_id": "ancient_ruins",
    "monster": "relic_knight",
    "rate": 0.0003
   }
  ],
  "refine_per_level": {
   "atk": 11
  },
  "look": {
   "form": "sword_1h",
   "shape": "broad",
   "c1": "#fff3cf",
   "c2": "#c8a24a",
   "glow": "#ffe08a",
   "guard": "wing"
  },
  "description": "ดาบกว้างสลักคำสาบาน การ์ดเป็นปีกทองคู่ กลางด้ามมีจานสุริยะ"
 },
 {
  "id": "wpn_gsword_001",
  "name_th": "ดาบใหญ่คนตัดไม้",
  "name_en": "Woodcutter Greatblade",
  "type": "sword_2h",
  "class": [
   "swordsman"
  ],
  "req_level": 8,
  "tier": "green",
  "rarity": "uncommon",
  "base": {
   "atk": 49,
   "matk": 0,
   "element": "neutral",
   "weight": 163
  },
  "fixed_stats": {
   "STR": 1,
   "ASPD%": -10
  },
  "random_stats": [
   {
    "stat": "STR",
    "min": 1,
    "max": 2
   },
   {
    "stat": "ATK",
    "min": 1,
    "max": 2
   },
   {
    "stat": "MaxHP",
    "min": 25,
    "max": 56
   },
   {
    "stat": "DMG vs plant",
    "min": 3,
    "max": 9
   }
  ],
  "random_count": [
   1,
   2
  ],
  "slots": 0,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ดาเมจหนัก ช้า",
  "tradeoff": "ใส่โล่ไม่ได้ · ASPD -10%",
  "drop": [
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "thornback",
    "rate": 0.01
   },
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "stinglet",
    "rate": 0.01
   }
  ],
  "refine_per_level": {
   "atk": 3
  },
  "look": {
   "form": "sword_2h",
   "shape": "cleaver",
   "c1": "#c9ccd2",
   "c2": "#6a4426",
   "glow": "#ffd27a"
  },
  "description": "ใบกว้างปลายตัดเหมือนขวานผ่าฟืน ด้ามยาวพันหนังวัว"
 },
 {
  "id": "wpn_gsword_002",
  "name_th": "ดาบใหญ่ธารน้ำแข็งแตก",
  "name_en": "Glacierbreak Claymore",
  "type": "sword_2h",
  "class": [
   "swordsman"
  ],
  "req_level": 32,
  "tier": "purple",
  "rarity": "epic",
  "base": {
   "atk": 162,
   "matk": 0,
   "element": "water",
   "weight": 173
  },
  "fixed_stats": {
   "STR": 4,
   "VIT": 2,
   "ASPD%": -10,
   "FLEE": -6
  },
  "random_stats": [
   {
    "stat": "STR",
    "min": 3,
    "max": 6
   },
   {
    "stat": "VIT",
    "min": 3,
    "max": 6
   },
   {
    "stat": "ATK%",
    "min": 2,
    "max": 5
   },
   {
    "stat": "Melee DMG%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "DMG vs fire",
    "min": 5,
    "max": 13
   },
   {
    "stat": "MaxHP",
    "min": 93,
    "max": 194
   }
  ],
  "random_count": [
   3,
   4
  ],
  "slots": 2,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "หนัก + สู้ธาตุไฟ",
  "tradeoff": "ใส่โล่ไม่ได้ · FLEE -6",
  "drop": [
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "icegolem",
    "rate": 0.0025
   },
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "frostbat",
    "rate": 0.0025
   }
  ],
  "refine_per_level": {
   "atk": 7
  },
  "look": {
   "form": "sword_2h",
   "shape": "jagged",
   "c1": "#dff6ff",
   "c2": "#3a6a9a",
   "glow": "#7fe0ff"
  },
  "description": "ใบดาบเป็นผลึกน้ำแข็งแตกเป็นฟันซี่ใหญ่ ไอเย็นลอยออกตลอดเวลา"
 },
 {
  "id": "wpn_gsword_003",
  "name_th": "ดาบใหญ่คำรามเตาหลอม",
  "name_en": "Forgeroar Zweihander",
  "type": "sword_2h",
  "class": [
   "swordsman"
  ],
  "req_level": 58,
  "tier": "orange",
  "rarity": "legend",
  "base": {
   "atk": 292,
   "matk": 0,
   "element": "fire",
   "weight": 183
  },
  "fixed_stats": {
   "STR": 6,
   "VIT": 3,
   "ASPD%": -10,
   "ลดดาเมจรับ%": -5
  },
  "random_stats": [
   {
    "stat": "STR",
    "min": 4,
    "max": 9
   },
   {
    "stat": "ATK",
    "min": 9,
    "max": 22
   },
   {
    "stat": "ATK%",
    "min": 2,
    "max": 5
   },
   {
    "stat": "Melee DMG%",
    "min": 2,
    "max": 7
   },
   {
    "stat": "CRIT DMG%",
    "min": 5,
    "max": 14
   },
   {
    "stat": "DMG vs large",
    "min": 5,
    "max": 14
   }
  ],
  "random_count": [
   4,
   4
  ],
  "slots": 2,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ระเบิดดาเมจใส่ตัวใหญ่",
  "tradeoff": "ใส่โล่ไม่ได้ · ลดดาเมจรับ -5%",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "salamander",
    "rate": 0.0012
   },
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "emberimp",
    "rate": 0.0012
   }
  ],
  "refine_per_level": {
   "atk": 9
  },
  "look": {
   "form": "sword_2h",
   "shape": "flame",
   "c1": "#ffb36a",
   "c2": "#4a2a2a",
   "glow": "#ff7a2a",
   "guard": "gear"
  },
  "description": "ใบดาบมีรอยแตกเรืองลาวา การ์ดเป็นเฟืองเหล็กหล่อ ตีลงพื้นแล้วสะเก็ดไฟกระจาย"
 },
 {
  "id": "wpn_gsword_004",
  "name_th": "ดาบใหญ่สุริยคราสโลหิต",
  "name_en": "Bloodeclipse Greatsword",
  "type": "sword_2h",
  "class": [
   "swordsman"
  ],
  "req_level": 95,
  "tier": "red",
  "rarity": "celestial",
  "base": {
   "atk": 544,
   "matk": 0,
   "element": "shadow",
   "weight": 198
  },
  "fixed_stats": {
   "STR": 12,
   "VIT": 6,
   "ASPD%": -10,
   "MaxHP%": -8
  },
  "random_stats": [
   {
    "stat": "STR",
    "min": 10,
    "max": 20
   },
   {
    "stat": "VIT",
    "min": 10,
    "max": 20
   },
   {
    "stat": "ATK%",
    "min": 3,
    "max": 8
   },
   {
    "stat": "Melee DMG%",
    "min": 3,
    "max": 10
   },
   {
    "stat": "ดูดเลือด%",
    "min": 2,
    "max": 2
   },
   {
    "stat": "CRIT DMG%",
    "min": 8,
    "max": 20
   },
   {
    "stat": "DMG vs medium",
    "min": 8,
    "max": 20
   }
  ],
  "random_count": [
   5,
   6
  ],
  "slots": 3,
  "passive": {
   "kind": "execute",
   "hp": 30,
   "value": 25,
   "text": "ดาเมจ +25% ต่อศัตรูที่ HP ต่ำกว่า 30%"
  },
  "set": {
   "id": "bloodmoon",
   "name": "จันทร์โลหิต",
   "pieces": [
    "bloodmoon_body",
    "bloodmoon_head",
    "bloodmoon_shield",
    "bloodmoon_garment",
    "bloodmoon_shoes",
    "bloodmoon_accessory"
   ],
   "bonus": {
    "2": {
     "ATK%": 5
    },
    "4": {
     "ดูดเลือด%": 2,
     "Melee DMG%": 6
    }
   }
  },
  "hybrid": null,
  "style": "ปิดฉากศัตรู",
  "tradeoff": "ใส่โล่ไม่ได้ · MaxHP -8%",
  "drop": [
   {
    "map": "Haunted Forest",
    "map_id": "haunted_forest",
    "monster": "nocthar",
    "rate": 0.001
   },
   {
    "map": "Ancient Ruins",
    "map_id": "ancient_ruins",
    "monster": "aurex",
    "rate": 0.0005
   }
  ],
  "refine_per_level": {
   "atk": 13
  },
  "look": {
   "form": "sword_2h",
   "shape": "crescent",
   "c1": "#ff8a9a",
   "c2": "#2a1424",
   "glow": "#ff3a5a",
   "guard": "wing"
  },
  "description": "ใบดาบดำสนิทเว้าเป็นรูปจันทร์เสี้ยวกลางใบ ขอบเรืองแสงแดงเหมือนสุริยคราส"
 },
 {
  "id": "wpn_spear_001",
  "name_th": "หอกไผ่ทุ่งหญ้า",
  "name_en": "Meadow Pike",
  "type": "spear",
  "class": [
   "swordsman"
  ],
  "req_level": 5,
  "tier": "white",
  "rarity": "common",
  "base": {
   "atk": 30,
   "matk": 0,
   "element": "neutral",
   "weight": 132
  },
  "fixed_stats": {
   "STR": 1,
   "ASPD%": -5
  },
  "random_stats": [
   {
    "stat": "STR",
    "min": 1,
    "max": 2
   },
   {
    "stat": "HIT",
    "min": 2,
    "max": 5
   },
   {
    "stat": "ATK",
    "min": 1,
    "max": 2
   }
  ],
  "random_count": [
   0,
   1
  ],
  "slots": 0,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ระยะเอื้อมไกล",
  "tradeoff": "ASPD -5%",
  "drop": [
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "stinglet",
    "rate": 0.02
   },
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "capling",
    "rate": 0.02
   }
  ],
  "refine_per_level": {
   "atk": 3
  },
  "look": {
   "form": "spear",
   "shape": "pike",
   "c1": "#d9dde4",
   "c2": "#a8a05a",
   "glow": "#ffe9a8"
  },
  "description": "ด้ามไผ่ปล้องยาว หัวหอกเหล็กทรงใบไผ่ ผูกริบบิ้นแดง"
 },
 {
  "id": "wpn_spear_002",
  "name_th": "หอกเขี้ยวหมาป่า",
  "name_en": "Fangline Lance",
  "type": "spear",
  "class": [
   "swordsman"
  ],
  "req_level": 22,
  "tier": "blue",
  "rarity": "rare",
  "base": {
   "atk": 94,
   "matk": 0,
   "element": "earth",
   "weight": 139
  },
  "fixed_stats": {
   "STR": 3,
   "VIT": 2,
   "ASPD%": -5,
   "DEF": -3
  },
  "random_stats": [
   {
    "stat": "STR",
    "min": 1,
    "max": 4
   },
   {
    "stat": "VIT",
    "min": 1,
    "max": 4
   },
   {
    "stat": "CRIT",
    "min": 1,
    "max": 4
   },
   {
    "stat": "HIT",
    "min": 4,
    "max": 9
   },
   {
    "stat": "DMG vs beast",
    "min": 4,
    "max": 11
   }
  ],
  "random_count": [
   2,
   3
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "คริ + ล่าสัตว์",
  "tradeoff": "DEF -3",
  "drop": [
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "frostfox",
    "rate": 0.005
   },
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "frostbat",
    "rate": 0.005
   }
  ],
  "refine_per_level": {
   "atk": 5
  },
  "look": {
   "form": "spear",
   "shape": "fang",
   "c1": "#efe6d0",
   "c2": "#5e3f27",
   "glow": "#ffd27a"
  },
  "description": "หัวหอกทำจากเขี้ยวบาร์กวูล์ฟสองซี่ไขว้กัน พู่ขนหมาป่าห้อยใต้หัว"
 },
 {
  "id": "wpn_spear_003",
  "name_th": "ง้าวเกล็ดซาลาแมนเดอร์",
  "name_en": "Salamander Glaive",
  "type": "spear",
  "class": [
   "swordsman"
  ],
  "req_level": 52,
  "tier": "purple",
  "rarity": "epic",
  "base": {
   "atk": 214,
   "matk": 0,
   "element": "fire",
   "weight": 151
  },
  "fixed_stats": {
   "STR": 5,
   "VIT": 3,
   "ASPD%": -5,
   "FLEE": -5
  },
  "random_stats": [
   {
    "stat": "STR",
    "min": 3,
    "max": 8
   },
   {
    "stat": "ATK",
    "min": 8,
    "max": 18
   },
   {
    "stat": "ATK%",
    "min": 2,
    "max": 5
   },
   {
    "stat": "Melee DMG%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "DMG vs earth",
    "min": 5,
    "max": 13
   },
   {
    "stat": "HIT",
    "min": 6,
    "max": 16
   }
  ],
  "random_count": [
   3,
   4
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "กวาดหนัก",
  "tradeoff": "FLEE -5",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "emberimp",
    "rate": 0.0025
   },
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "salamander",
    "rate": 0.0025
   }
  ],
  "refine_per_level": {
   "atk": 7
  },
  "look": {
   "form": "spear",
   "shape": "glaive",
   "c1": "#ffcf8a",
   "c2": "#8a2a1a",
   "glow": "#ff8a3a"
  },
  "description": "ใบง้าวโค้งกว้างหุ้มเกล็ดซาลาแมนเดอร์ซ้อนกัน ปลายใบลุกเป็นประกายไฟ"
 },
 {
  "id": "wpn_spear_004",
  "name_th": "ทวนราชันย์พายุ",
  "name_en": "Stormking Halberd",
  "type": "spear",
  "class": [
   "swordsman"
  ],
  "req_level": 85,
  "tier": "gold",
  "rarity": "mythic",
  "base": {
   "atk": 374,
   "matk": 0,
   "element": "wind",
   "weight": 164
  },
  "fixed_stats": {
   "STR": 9,
   "VIT": 5,
   "ASPD%": -5,
   "MaxSP%": -10
  },
  "random_stats": [
   {
    "stat": "STR",
    "min": 6,
    "max": 14
   },
   {
    "stat": "INT",
    "min": 6,
    "max": 14
   },
   {
    "stat": "ATK%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "Melee DMG%",
    "min": 2,
    "max": 8
   },
   {
    "stat": "CRIT",
    "min": 2,
    "max": 6
   },
   {
    "stat": "DMG vs water",
    "min": 6,
    "max": 16
   }
  ],
  "random_count": [
   4,
   5
  ],
  "slots": 2,
  "passive": {
   "kind": "bolt",
   "chance": 6,
   "mult": 1.6,
   "element": "wind",
   "text": "โอกาส 6% เรียกสายฟ้าเมื่อโจมตีกายภาพ (ดาเมจ 160% ATK ธาตุลม)"
  },
  "set": null,
  "hybrid": [
   "INT"
  ],
  "style": "สายฟ้า (ไฮบริด STR+INT)",
  "tradeoff": "MaxSP -10%",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "ignarok",
    "rate": 0.009
   },
   {
    "map": "Haunted Forest",
    "map_id": "haunted_forest",
    "monster": "mourning_shade",
    "rate": 0.0003
   }
  ],
  "refine_per_level": {
   "atk": 11
  },
  "look": {
   "form": "spear",
   "shape": "halberd",
   "c1": "#e8f4ff",
   "c2": "#3a4a7a",
   "glow": "#9ad8ff"
  },
  "description": "ทวนหัวขวานรูปพระจันทร์ครึ่งซีก มีสายฟ้าวิ่งตามร่องใบตลอดเวลา"
 },
 {
  "id": "wpn_rod_001",
  "name_th": "คทาก้านหลิว",
  "name_en": "Willow Wand",
  "type": "rod",
  "class": [
   "mage"
  ],
  "req_level": 1,
  "tier": "white",
  "rarity": "common",
  "base": {
   "atk": 3,
   "matk": 14,
   "element": "neutral",
   "weight": 30
  },
  "fixed_stats": {
   "INT": 1,
   "Cast Time -%": 10
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 1,
    "max": 2
   },
   {
    "stat": "MATK",
    "min": 1,
    "max": 1
   },
   {
    "stat": "MaxSP",
    "min": 6,
    "max": 13
   }
  ],
  "random_count": [
   0,
   1
  ],
  "slots": 0,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ร่ายไว",
  "tradeoff": "MATK ต่ำกว่าไม้เท้า",
  "drop": [
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "bloblet",
    "rate": 0.02
   },
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "capling",
    "rate": 0.02
   }
  ],
  "refine_per_level": {
   "matk": 3,
   "atk": 1
  },
  "look": {
   "form": "rod",
   "shape": "twig",
   "c1": "#b8865a",
   "c2": "#6ac04a",
   "glow": "#c8ffb0"
  },
  "description": "กิ่งหลิวเหลาเรียบ ปลายแตกใบอ่อนสองใบ"
 },
 {
  "id": "wpn_rod_002",
  "name_th": "คทาเห็ดเรืองแสง",
  "name_en": "Glowcap Wand",
  "type": "rod",
  "class": [
   "mage"
  ],
  "req_level": 14,
  "tier": "green",
  "rarity": "uncommon",
  "base": {
   "atk": 11,
   "matk": 51,
   "element": "water",
   "weight": 36
  },
  "fixed_stats": {
   "INT": 2,
   "Cast Time -%": 10,
   "MaxHP%": -3
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 1,
    "max": 2
   },
   {
    "stat": "DEX",
    "min": 1,
    "max": 2
   },
   {
    "stat": "MATK",
    "min": 2,
    "max": 5
   },
   {
    "stat": "SP Regen%",
    "min": 6,
    "max": 14
   }
  ],
  "random_count": [
   1,
   2
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ร่ายไว + ฟื้น SP",
  "tradeoff": "MaxHP -3%",
  "drop": [
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "barkwolf",
    "rate": 0.01
   },
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "wisp",
    "rate": 0.01
   }
  ],
  "refine_per_level": {
   "matk": 3,
   "atk": 1
  },
  "look": {
   "form": "rod",
   "shape": "mushroom",
   "c1": "#4ad8ff",
   "c2": "#e8e2d0",
   "glow": "#7ff0ff"
  },
  "description": "ปลายคทาเป็นเห็ดเรืองแสงสีฟ้า มีสปอร์เล็ก ๆ ลอยรอบ"
 },
 {
  "id": "wpn_rod_003",
  "name_th": "คทาน้ำค้างแข็ง",
  "name_en": "Rimefrost Rod",
  "type": "rod",
  "class": [
   "mage"
  ],
  "req_level": 40,
  "tier": "blue",
  "rarity": "rare",
  "base": {
   "atk": 27,
   "matk": 130,
   "element": "water",
   "weight": 46
  },
  "fixed_stats": {
   "INT": 4,
   "DEX": 2,
   "Cast Time -%": 10,
   "After-cast Delay -%": -4
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 3,
    "max": 5
   },
   {
    "stat": "DEX",
    "min": 3,
    "max": 5
   },
   {
    "stat": "MATK%",
    "min": 1,
    "max": 4
   },
   {
    "stat": "Cast Time -%",
    "min": 3,
    "max": 7
   },
   {
    "stat": "DMG vs fire",
    "min": 4,
    "max": 11
   }
  ],
  "random_count": [
   2,
   3
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ร่ายเร็วมาก",
  "tradeoff": "After-cast Delay +4%",
  "drop": [
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "icegolem",
    "rate": 0.005
   },
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "magmaslime",
    "rate": 0.005
   }
  ],
  "refine_per_level": {
   "matk": 5,
   "atk": 2
  },
  "look": {
   "form": "rod",
   "shape": "icicle",
   "c1": "#dff6ff",
   "c2": "#3a5a8a",
   "glow": "#9ae8ff"
  },
  "description": "คทาเหล็กดำ ปลายเป็นแท่งน้ำแข็งย้อยสามแท่งรวบด้วยห่วงเงิน"
 },
 {
  "id": "wpn_rod_004",
  "name_th": "คทาดาวตก",
  "name_en": "Starfall Rod",
  "type": "rod",
  "class": [
   "mage"
  ],
  "req_level": 78,
  "tier": "gold",
  "rarity": "mythic",
  "base": {
   "atk": 60,
   "matk": 285,
   "element": "holy",
   "weight": 61
  },
  "fixed_stats": {
   "INT": 9,
   "DEX": 5,
   "Cast Time -%": 10,
   "MaxHP%": -6
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 6,
    "max": 14
   },
   {
    "stat": "DEX",
    "min": 6,
    "max": 14
   },
   {
    "stat": "MATK%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "Cast Time -%",
    "min": 4,
    "max": 10
   },
   {
    "stat": "After-cast Delay -%",
    "min": 4,
    "max": 10
   },
   {
    "stat": "MaxSP%",
    "min": 2,
    "max": 6
   }
  ],
  "random_count": [
   4,
   5
  ],
  "slots": 2,
  "passive": {
   "kind": "echo",
   "chance": 10,
   "text": "โอกาส 10% รีเซ็ตดีเลย์หลังร่ายทันทีเมื่อใช้สกิล"
  },
  "set": null,
  "hybrid": null,
  "style": "ร่ายต่อเนื่อง",
  "tradeoff": "MaxHP -6%",
  "drop": [
   {
    "map": "Ancient Ruins",
    "map_id": "ancient_ruins",
    "monster": "aurex",
    "rate": 0.009
   },
   {
    "map": "Ancient Ruins",
    "map_id": "ancient_ruins",
    "monster": "relic_knight",
    "rate": 0.0003
   }
  ],
  "refine_per_level": {
   "matk": 11,
   "atk": 4
  },
  "look": {
   "form": "rod",
   "shape": "star",
   "c1": "#fff6cc",
   "c2": "#3a3a7a",
   "glow": "#ffe08a"
  },
  "description": "ปลายคทาเป็นดาวห้าแฉกลอยหมุน มีหางดาวตกลากตามเวลาโบก"
 },
 {
  "id": "wpn_staff_001",
  "name_th": "ไม้เท้าคนเลี้ยงแกะ",
  "name_en": "Shepherd's Crook",
  "type": "staff",
  "class": [
   "mage"
  ],
  "req_level": 6,
  "tier": "white",
  "rarity": "common",
  "base": {
   "atk": 9,
   "matk": 37,
   "element": "neutral",
   "weight": 92
  },
  "fixed_stats": {
   "INT": 1,
   "Cast Time -%": -8
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 1,
    "max": 2
   },
   {
    "stat": "MaxSP",
    "min": 8,
    "max": 18
   },
   {
    "stat": "MATK",
    "min": 1,
    "max": 2
   }
  ],
  "random_count": [
   0,
   1
  ],
  "slots": 0,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "MATK สูง ร่ายช้า",
  "tradeoff": "Cast Time +8%",
  "drop": [
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "stinglet",
    "rate": 0.02
   },
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "capling",
    "rate": 0.02
   }
  ],
  "refine_per_level": {
   "matk": 3,
   "atk": 1
  },
  "look": {
   "form": "staff",
   "shape": "crook",
   "c1": "#a8794a",
   "c2": "#e8d8b0",
   "glow": "#ffe9a8"
  },
  "description": "ไม้เท้ายาวปลายงอเป็นตะขอ แขวนกระดิ่งทองเหลืองใบเล็ก"
 },
 {
  "id": "wpn_staff_002",
  "name_th": "ไม้เท้ารากพันปี",
  "name_en": "Thousand-Root Staff",
  "type": "staff",
  "class": [
   "mage"
  ],
  "req_level": 26,
  "tier": "purple",
  "rarity": "epic",
  "base": {
   "atk": 30,
   "matk": 129,
   "element": "earth",
   "weight": 100
  },
  "fixed_stats": {
   "INT": 3,
   "DEX": 2,
   "Cast Time -%": -8,
   "ASPD%": -8
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 2,
    "max": 5
   },
   {
    "stat": "MATK",
    "min": 5,
    "max": 10
   },
   {
    "stat": "MATK%",
    "min": 2,
    "max": 5
   },
   {
    "stat": "MaxSP",
    "min": 29,
    "max": 61
   },
   {
    "stat": "DMG vs wind",
    "min": 5,
    "max": 13
   },
   {
    "stat": "SP Regen%",
    "min": 8,
    "max": 19
   }
  ],
  "random_count": [
   3,
   4
  ],
  "slots": 2,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ดาเมจเวทหนัก",
  "tradeoff": "ASPD -8%",
  "drop": [
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "barkwolf",
    "rate": 0.0025
   },
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "yeti",
    "rate": 0.0025
   }
  ],
  "refine_per_level": {
   "matk": 7,
   "atk": 3
  },
  "look": {
   "form": "staff",
   "shape": "roots",
   "c1": "#8a6a3e",
   "c2": "#4e6a2a",
   "glow": "#8aff6a"
  },
  "description": "รากไม้บิดเกลียวพันกันขึ้นไปกุมหินมรกตไว้ที่ยอด"
 },
 {
  "id": "wpn_staff_003",
  "name_th": "ไม้เท้าปากปล่องภูเขาไฟ",
  "name_en": "Caldera Maw Staff",
  "type": "staff",
  "class": [
   "mage"
  ],
  "req_level": 60,
  "tier": "orange",
  "rarity": "legend",
  "base": {
   "atk": 67,
   "matk": 287,
   "element": "fire",
   "weight": 114
  },
  "fixed_stats": {
   "INT": 6,
   "DEX": 3,
   "Cast Time -%": -8,
   "MaxSP%": -6
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 5,
    "max": 11
   },
   {
    "stat": "DEX",
    "min": 5,
    "max": 11
   },
   {
    "stat": "MATK",
    "min": 9,
    "max": 23
   },
   {
    "stat": "MATK%",
    "min": 2,
    "max": 5
   },
   {
    "stat": "DMG vs earth",
    "min": 5,
    "max": 14
   },
   {
    "stat": "DMG vs large",
    "min": 5,
    "max": 14
   }
  ],
  "random_count": [
   4,
   4
  ],
  "slots": 2,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ถล่มตัวใหญ่",
  "tradeoff": "MaxSP -6%",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "salamander",
    "rate": 0.0012
   },
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "obsidiangolem",
    "rate": 0.0012
   }
  ],
  "refine_per_level": {
   "matk": 9,
   "atk": 3
  },
  "look": {
   "form": "staff",
   "shape": "maw",
   "c1": "#3a2a2a",
   "c2": "#ff8a3a",
   "glow": "#ff6a2a"
  },
  "description": "ยอดไม้เท้าเป็นกะโหลกมังกรอ้าปาก คาบลูกไฟที่ไม่มีวันดับ"
 },
 {
  "id": "wpn_staff_004",
  "name_th": "ไม้เท้าจันทร์แหว่งโลหิต",
  "name_en": "Crimson Waning Staff",
  "type": "staff",
  "class": [
   "mage"
  ],
  "req_level": 95,
  "tier": "red",
  "rarity": "celestial",
  "base": {
   "atk": 121,
   "matk": 519,
   "element": "shadow",
   "weight": 128
  },
  "fixed_stats": {
   "INT": 12,
   "DEX": 6,
   "Cast Time -%": -8,
   "MaxHP%": -8
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 10,
    "max": 20
   },
   {
    "stat": "DEX",
    "min": 10,
    "max": 20
   },
   {
    "stat": "MATK%",
    "min": 3,
    "max": 8
   },
   {
    "stat": "Cast Time -%",
    "min": 5,
    "max": 13
   },
   {
    "stat": "MaxSP%",
    "min": 3,
    "max": 8
   },
   {
    "stat": "DMG vs holy",
    "min": 8,
    "max": 20
   },
   {
    "stat": "ดูด SP%",
    "min": 2,
    "max": 2
   }
  ],
  "random_count": [
   5,
   6
  ],
  "slots": 3,
  "passive": {
   "kind": "nova",
   "chance": 12,
   "mult": 1.2,
   "radius": 72,
   "element": "shadow",
   "text": "โอกาส 12% เมื่อสกิลเวทโดนเป้า ปล่อยคลื่นจันทร์โลหิตรอบเป้า (120% MATK ธาตุมืด)"
  },
  "set": {
   "id": "bloodmoon",
   "name": "จันทร์โลหิต",
   "pieces": [
    "bloodmoon_body",
    "bloodmoon_head",
    "bloodmoon_shield",
    "bloodmoon_garment",
    "bloodmoon_shoes",
    "bloodmoon_accessory"
   ],
   "bonus": {
    "2": {
     "MATK%": 5
    },
    "4": {
     "Cast Time -%": 10,
     "MaxSP%": 8
    }
   }
  },
  "hybrid": null,
  "style": "AoE ระเบิดซ้อน",
  "tradeoff": "Cast Time +8% · MaxHP -8%",
  "drop": [
   {
    "map": "Haunted Forest",
    "map_id": "haunted_forest",
    "monster": "nocthar",
    "rate": 0.001
   },
   {
    "map": "Ancient Ruins",
    "map_id": "ancient_ruins",
    "monster": "aurex",
    "rate": 0.0005
   }
  ],
  "refine_per_level": {
   "matk": 13,
   "atk": 5
  },
  "look": {
   "form": "staff",
   "shape": "crescent",
   "c1": "#ffb0bc",
   "c2": "#2a1424",
   "glow": "#ff3a5a"
  },
  "description": "จันทร์เสี้ยวสีเลือดลอยอยู่เหนือด้ามดำ มีผลึกแดงหยดลงเหมือนหยาดฝน"
 },
 {
  "id": "wpn_orb_001",
  "name_th": "ลูกแก้วฟองสบู่",
  "name_en": "Bubble Orb",
  "type": "orb",
  "class": [
   "mage"
  ],
  "req_level": 10,
  "tier": "green",
  "rarity": "uncommon",
  "base": {
   "atk": 4,
   "matk": 47,
   "element": "water",
   "weight": 54
  },
  "fixed_stats": {
   "INT": 2,
   "MaxSP%": 5
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 1,
    "max": 2
   },
   {
    "stat": "MaxSP",
    "min": 12,
    "max": 25
   },
   {
    "stat": "SP Regen%",
    "min": 6,
    "max": 14
   },
   {
    "stat": "MATK",
    "min": 1,
    "max": 3
   }
  ],
  "random_count": [
   1,
   2
  ],
  "slots": 0,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ฟื้น SP อึด",
  "tradeoff": "ATK ต่ำมาก",
  "drop": [
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "thornback",
    "rate": 0.01
   },
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "wisp",
    "rate": 0.01
   }
  ],
  "refine_per_level": {
   "matk": 3,
   "atk": 1
  },
  "look": {
   "form": "orb",
   "shape": "bubble",
   "c1": "#bff0ff",
   "c2": "#8a6a3e",
   "glow": "#9ae8ff"
  },
  "description": "ฟองน้ำใสลอยวนเหนือแท่นไม้เล็ก ๆ ข้างในมีปลาตัวจิ๋วว่าย"
 },
 {
  "id": "wpn_orb_002",
  "name_th": "ลูกแก้ววิสป์สายลม",
  "name_en": "Wisplight Orb",
  "type": "orb",
  "class": [
   "mage"
  ],
  "req_level": 28,
  "tier": "blue",
  "rarity": "rare",
  "base": {
   "atk": 10,
   "matk": 112,
   "element": "wind",
   "weight": 61
  },
  "fixed_stats": {
   "INT": 3,
   "DEX": 2,
   "MaxSP%": 5,
   "MATK%": -3
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 1,
    "max": 4
   },
   {
    "stat": "DEX",
    "min": 1,
    "max": 4
   },
   {
    "stat": "MaxSP%",
    "min": 1,
    "max": 4
   },
   {
    "stat": "SP Regen%",
    "min": 7,
    "max": 16
   },
   {
    "stat": "DMG vs water",
    "min": 4,
    "max": 11
   }
  ],
  "random_count": [
   2,
   3
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "SP มาก",
  "tradeoff": "MATK% -3",
  "drop": [
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "yeti",
    "rate": 0.005
   },
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "frostfox",
    "rate": 0.005
   }
  ],
  "refine_per_level": {
   "matk": 5,
   "atk": 2
  },
  "look": {
   "form": "orb",
   "shape": "wisp",
   "c1": "#d8fff0",
   "c2": "#4a7a6a",
   "glow": "#9affc8"
  },
  "description": "วิสป์สามดวงหมุนรอบแก้วกลางใส เกลียวลมสีเขียวอ่อนรัดอยู่"
 },
 {
  "id": "wpn_orb_003",
  "name_th": "ลูกแก้วพายุทราย",
  "name_en": "Duststorm Orb",
  "type": "orb",
  "class": [
   "mage"
  ],
  "req_level": 55,
  "tier": "purple",
  "rarity": "epic",
  "base": {
   "atk": 20,
   "matk": 219,
   "element": "earth",
   "weight": 72
  },
  "fixed_stats": {
   "INT": 5,
   "DEX": 3,
   "MaxSP%": 5,
   "FLEE": -5
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 3,
    "max": 8
   },
   {
    "stat": "MATK",
    "min": 8,
    "max": 19
   },
   {
    "stat": "MaxSP",
    "min": 53,
    "max": 107
   },
   {
    "stat": "DMG vs wind",
    "min": 5,
    "max": 13
   },
   {
    "stat": "DMG vs insect",
    "min": 5,
    "max": 13
   },
   {
    "stat": "After-cast Delay -%",
    "min": 3,
    "max": 8
   }
  ],
  "random_count": [
   3,
   4
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "คุมธาตุ",
  "tradeoff": "FLEE -5",
  "drop": [
   {
    "map": "Ancient Ruins",
    "map_id": "ancient_ruins",
    "monster": "ruin_scarab",
    "rate": 0.0025
   },
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "salamander",
    "rate": 0.0025
   }
  ],
  "refine_per_level": {
   "matk": 7,
   "atk": 3
  },
  "look": {
   "form": "orb",
   "shape": "sandstorm",
   "c1": "#e8c88a",
   "c2": "#6a4a2a",
   "glow": "#ffd27a"
  },
  "description": "ทรายสีทองหมุนเป็นพายุอยู่ในทรงกลมแก้ว ฐานเป็นหินแกะสลักจากซากโบราณ"
 },
 {
  "id": "wpn_orb_004",
  "name_th": "ลูกแก้วกาแล็กซีหมุนวน",
  "name_en": "Galaxy Spiral Orb",
  "type": "orb",
  "class": [
   "mage"
  ],
  "req_level": 88,
  "tier": "gold",
  "rarity": "mythic",
  "base": {
   "atk": 34,
   "matk": 376,
   "element": "neutral",
   "weight": 85
  },
  "fixed_stats": {
   "INT": 9,
   "DEX": 5,
   "MaxSP%": 5,
   "DEF": -6
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 6,
    "max": 14
   },
   {
    "stat": "DEX",
    "min": 6,
    "max": 14
   },
   {
    "stat": "MATK%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "MaxSP%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "SP Regen%",
    "min": 10,
    "max": 24
   },
   {
    "stat": "ดูด SP%",
    "min": 2,
    "max": 2
   }
  ],
  "random_count": [
   4,
   5
  ],
  "slots": 2,
  "passive": {
   "kind": "sp_on_kill",
   "value": 4,
   "text": "กำจัดศัตรูได้ ฟื้น SP 4% ของ MaxSP"
  },
  "set": null,
  "hybrid": null,
  "style": "ร่ายไม่หยุด",
  "tradeoff": "DEF -6",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "ignarok",
    "rate": 0.009
   },
   {
    "map": "Haunted Forest",
    "map_id": "haunted_forest",
    "monster": "cursed_stag",
    "rate": 0.0003
   }
  ],
  "refine_per_level": {
   "matk": 11,
   "atk": 4
  },
  "look": {
   "form": "orb",
   "shape": "galaxy",
   "c1": "#c8b8ff",
   "c2": "#1a1a4a",
   "glow": "#b48cff"
  },
  "description": "ทางช้างเผือกเกลียวหมุนอยู่ในลูกแก้ว ดาวเล็ก ๆ หลุดออกมาโคจรรอบ"
 },
 {
  "id": "wpn_mace_001",
  "name_th": "กระบองโอ๊กศักดิ์สิทธิ์",
  "name_en": "Blessed Oak Cudgel",
  "type": "mace",
  "class": [
   "acolyte"
  ],
  "req_level": 1,
  "tier": "white",
  "rarity": "common",
  "base": {
   "atk": 16,
   "matk": 6,
   "element": "neutral",
   "weight": 100
  },
  "fixed_stats": {
   "INT": 1
  },
  "random_stats": [
   {
    "stat": "VIT",
    "min": 1,
    "max": 2
   },
   {
    "stat": "INT",
    "min": 1,
    "max": 2
   },
   {
    "stat": "ATK",
    "min": 1,
    "max": 1
   }
  ],
  "random_count": [
   0,
   1
  ],
  "slots": 0,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "นักบวชสายตี",
  "tradeoff": "MATK ต่ำ",
  "drop": [
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "bloblet",
    "rate": 0.02
   },
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "capling",
    "rate": 0.02
   }
  ],
  "refine_per_level": {
   "atk": 3
  },
  "look": {
   "form": "mace",
   "shape": "cudgel",
   "c1": "#a8794a",
   "c2": "#e8c050",
   "glow": "#ffe9a8"
  },
  "description": "กระบองไม้โอ๊กหัวโต รัดด้วยแถบทองเหลืองสลักบทสวด"
 },
 {
  "id": "wpn_mace_002",
  "name_th": "กระบองระฆังโบสถ์",
  "name_en": "Chapelbell Mace",
  "type": "mace",
  "class": [
   "acolyte"
  ],
  "req_level": 20,
  "tier": "blue",
  "rarity": "rare",
  "base": {
   "atk": 79,
   "matk": 29,
   "element": "holy",
   "weight": 108
  },
  "fixed_stats": {
   "INT": 2,
   "VIT": 1,
   "Cast Time -%": -4
  },
  "random_stats": [
   {
    "stat": "VIT",
    "min": 1,
    "max": 4
   },
   {
    "stat": "INT",
    "min": 1,
    "max": 4
   },
   {
    "stat": "ATK",
    "min": 3,
    "max": 7
   },
   {
    "stat": "MaxHP",
    "min": 54,
    "max": 115
   },
   {
    "stat": "DMG vs undead",
    "min": 4,
    "max": 11
   }
  ],
  "random_count": [
   2,
   3
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ปราบอันเดด",
  "tradeoff": "Cast Time +4%",
  "drop": [
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "barkwolf",
    "rate": 0.005
   },
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "frostbat",
    "rate": 0.005
   }
  ],
  "refine_per_level": {
   "atk": 5
  },
  "look": {
   "form": "mace",
   "shape": "bell",
   "c1": "#ffe08a",
   "c2": "#8a5a32",
   "glow": "#fff3c0"
  },
  "description": "หัวกระบองเป็นระฆังทองเหลือง ตีโดนแล้วมีเสียงกังวาน"
 },
 {
  "id": "wpn_mace_003",
  "name_th": "ค้อนหีบพระธาตุ",
  "name_en": "Reliquary Maul",
  "type": "mace",
  "class": [
   "acolyte"
  ],
  "req_level": 50,
  "tier": "purple",
  "rarity": "epic",
  "base": {
   "atk": 188,
   "matk": 70,
   "element": "earth",
   "weight": 120
  },
  "fixed_stats": {
   "INT": 5,
   "VIT": 3,
   "ASPD%": -8
  },
  "random_stats": [
   {
    "stat": "STR",
    "min": 3,
    "max": 8
   },
   {
    "stat": "VIT",
    "min": 3,
    "max": 8
   },
   {
    "stat": "INT",
    "min": 3,
    "max": 8
   },
   {
    "stat": "ATK%",
    "min": 2,
    "max": 5
   },
   {
    "stat": "MaxHP%",
    "min": 2,
    "max": 5
   },
   {
    "stat": "ลดดาเมจรับ%",
    "min": 2,
    "max": 5
   }
  ],
  "random_count": [
   3,
   4
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": [
   "STR"
  ],
  "style": "นักบวชสายแทงค์ (ไฮบริด STR+INT)",
  "tradeoff": "ASPD -8%",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "emberimp",
    "rate": 0.0025
   },
   {
    "map": "Ancient Ruins",
    "map_id": "ancient_ruins",
    "monster": "ruin_scarab",
    "rate": 0.0025
   }
  ],
  "refine_per_level": {
   "atk": 7
  },
  "look": {
   "form": "mace",
   "shape": "maul",
   "c1": "#c8c0b0",
   "c2": "#5a4a6a",
   "glow": "#ffd27a"
  },
  "description": "ค้อนหินขนาดใหญ่ ฝังหีบพระธาตุเล็ก ๆ ไว้กลางหัวค้อน"
 },
 {
  "id": "wpn_mace_004",
  "name_th": "กระบองดาวอรุณพิพากษา",
  "name_en": "Dawnjudge Morningstar",
  "type": "mace",
  "class": [
   "acolyte"
  ],
  "req_level": 82,
  "tier": "gold",
  "rarity": "mythic",
  "base": {
   "atk": 330,
   "matk": 123,
   "element": "holy",
   "weight": 133
  },
  "fixed_stats": {
   "INT": 9,
   "VIT": 5,
   "MATK%": -4
  },
  "random_stats": [
   {
    "stat": "VIT",
    "min": 6,
    "max": 14
   },
   {
    "stat": "INT",
    "min": 6,
    "max": 14
   },
   {
    "stat": "ATK",
    "min": 14,
    "max": 34
   },
   {
    "stat": "Heal Power%",
    "min": 4,
    "max": 12
   },
   {
    "stat": "MaxHP%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "DMG vs shadow",
    "min": 6,
    "max": 16
   }
  ],
  "random_count": [
   4,
   5
  ],
  "slots": 2,
  "passive": {
   "kind": "heal_on_hit",
   "chance": 8,
   "value": 3,
   "text": "โอกาส 8% ฟื้น HP 3% เมื่อโจมตีโดน"
  },
  "set": null,
  "hybrid": null,
  "style": "ตีแล้วฟื้น",
  "tradeoff": "MATK% -4",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "ignarok",
    "rate": 0.009
   },
   {
    "map": "Ancient Ruins",
    "map_id": "ancient_ruins",
    "monster": "relic_knight",
    "rate": 0.0003
   }
  ],
  "refine_per_level": {
   "atk": 11
  },
  "look": {
   "form": "mace",
   "shape": "morningstar",
   "c1": "#fff3cf",
   "c2": "#c8a24a",
   "glow": "#ffe08a"
  },
  "description": "ลูกตุ้มหนามรูปดวงอาทิตย์ ห้อยด้วยโซ่ทองจากด้ามสั้น"
 },
 {
  "id": "wpn_scepter_001",
  "name_th": "คทาแสงเทียน",
  "name_en": "Candlelight Scepter",
  "type": "scepter",
  "class": [
   "acolyte"
  ],
  "req_level": 4,
  "tier": "white",
  "rarity": "common",
  "base": {
   "atk": 9,
   "matk": 23,
   "element": "holy",
   "weight": 62
  },
  "fixed_stats": {
   "INT": 1,
   "Heal Power%": 8
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 1,
    "max": 2
   },
   {
    "stat": "Heal Power%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "MaxSP",
    "min": 7,
    "max": 16
   }
  ],
  "random_count": [
   0,
   1
  ],
  "slots": 0,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ฮีลแรง",
  "tradeoff": "ATK ต่ำ",
  "drop": [
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "capling",
    "rate": 0.02
   },
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "stinglet",
    "rate": 0.02
   }
  ],
  "refine_per_level": {
   "matk": 3,
   "Heal Power%": 1
  },
  "look": {
   "form": "scepter",
   "shape": "candle",
   "c1": "#f4ead2",
   "c2": "#c8a24a",
   "glow": "#ffd27a"
  },
  "description": "คทาสั้นปลายเป็นเชิงเทียนทอง เปลวเทียนไม่ดับแม้ลมแรง"
 },
 {
  "id": "wpn_scepter_002",
  "name_th": "คทาบัวน้ำแข็ง",
  "name_en": "Frostlotus Scepter",
  "type": "scepter",
  "class": [
   "acolyte"
  ],
  "req_level": 30,
  "tier": "blue",
  "rarity": "rare",
  "base": {
   "atk": 42,
   "matk": 107,
   "element": "water",
   "weight": 72
  },
  "fixed_stats": {
   "INT": 3,
   "VIT": 2,
   "Heal Power%": 8,
   "FLEE": -4
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 3,
    "max": 5
   },
   {
    "stat": "VIT",
    "min": 3,
    "max": 5
   },
   {
    "stat": "Heal Power%",
    "min": 3,
    "max": 8
   },
   {
    "stat": "SP Regen%",
    "min": 7,
    "max": 16
   },
   {
    "stat": "MaxSP",
    "min": 27,
    "max": 57
   }
  ],
  "random_count": [
   2,
   3
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ฮีล + SP ยาว",
  "tradeoff": "FLEE -4",
  "drop": [
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "frostbat",
    "rate": 0.005
   },
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "icegolem",
    "rate": 0.005
   }
  ],
  "refine_per_level": {
   "matk": 5,
   "Heal Power%": 1
  },
  "look": {
   "form": "scepter",
   "shape": "lotus",
   "c1": "#dff6ff",
   "c2": "#6a8ab8",
   "glow": "#9ae8ff"
  },
  "description": "ดอกบัวผลึกน้ำแข็งบานบนยอดคทาเงิน กลีบเปล่งแสงเย็น"
 },
 {
  "id": "wpn_scepter_003",
  "name_th": "คทาขนนกฟีนิกซ์",
  "name_en": "Phoenixplume Scepter",
  "type": "scepter",
  "class": [
   "acolyte"
  ],
  "req_level": 56,
  "tier": "orange",
  "rarity": "legend",
  "base": {
   "atk": 84,
   "matk": 211,
   "element": "fire",
   "weight": 82
  },
  "fixed_stats": {
   "INT": 6,
   "VIT": 3,
   "Heal Power%": 8,
   "MaxSP%": -6
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 4,
    "max": 9
   },
   {
    "stat": "VIT",
    "min": 4,
    "max": 9
   },
   {
    "stat": "Heal Power%",
    "min": 4,
    "max": 11
   },
   {
    "stat": "MATK",
    "min": 9,
    "max": 22
   },
   {
    "stat": "MaxHP",
    "min": 169,
    "max": 347
   },
   {
    "stat": "After-cast Delay -%",
    "min": 4,
    "max": 9
   }
  ],
  "random_count": [
   4,
   4
  ],
  "slots": 2,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ฮีล + เวทไฟ",
  "tradeoff": "MaxSP -6%",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "salamander",
    "rate": 0.0012
   },
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "emberimp",
    "rate": 0.0012
   }
  ],
  "refine_per_level": {
   "matk": 9,
   "Heal Power%": 1
  },
  "look": {
   "form": "scepter",
   "shape": "plume",
   "c1": "#ffcf8a",
   "c2": "#c84a2a",
   "glow": "#ff8a3a"
  },
  "description": "ขนนกฟีนิกซ์สามเส้นแผ่ออกจากหัวคทา ปลายขนลุกเป็นไฟอ่อน ๆ"
 },
 {
  "id": "wpn_scepter_004",
  "name_th": "คทาเทวาจันทร์โลหิต",
  "name_en": "Bloodmoon Seraph Scepter",
  "type": "scepter",
  "class": [
   "acolyte"
  ],
  "req_level": 95,
  "tier": "red",
  "rarity": "celestial",
  "base": {
   "atk": 161,
   "matk": 406,
   "element": "holy",
   "weight": 98
  },
  "fixed_stats": {
   "INT": 12,
   "VIT": 6,
   "Heal Power%": 8,
   "ATK%": -10
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 10,
    "max": 20
   },
   {
    "stat": "VIT",
    "min": 10,
    "max": 20
   },
   {
    "stat": "Heal Power%",
    "min": 5,
    "max": 15
   },
   {
    "stat": "After-cast Delay -%",
    "min": 5,
    "max": 13
   },
   {
    "stat": "SP Regen%",
    "min": 13,
    "max": 30
   },
   {
    "stat": "MaxSP%",
    "min": 3,
    "max": 8
   },
   {
    "stat": "ลดดาเมจรับ%",
    "min": 3,
    "max": 8
   }
  ],
  "random_count": [
   5,
   6
  ],
  "slots": 3,
  "passive": {
   "kind": "aura",
   "value": 15,
   "dur": 6,
   "text": "เมื่อใช้สกิลฮีล ได้รับ MATK +15% และ ASPD +5% นาน 6 วินาที"
  },
  "set": {
   "id": "bloodmoon",
   "name": "จันทร์โลหิต",
   "pieces": [
    "bloodmoon_body",
    "bloodmoon_head",
    "bloodmoon_shield",
    "bloodmoon_garment",
    "bloodmoon_shoes",
    "bloodmoon_accessory"
   ],
   "bonus": {
    "2": {
     "Heal Power%": 10
    },
    "4": {
     "ลดดาเมจรับ%": 6,
     "SP Regen%": 20
    }
   }
  },
  "hybrid": null,
  "style": "ซัพพอร์ตสูงสุด",
  "tradeoff": "ATK -10%",
  "drop": [
   {
    "map": "Haunted Forest",
    "map_id": "haunted_forest",
    "monster": "nocthar",
    "rate": 0.001
   },
   {
    "map": "Ancient Ruins",
    "map_id": "ancient_ruins",
    "monster": "aurex",
    "rate": 0.0005
   }
  ],
  "refine_per_level": {
   "matk": 13,
   "Heal Power%": 1
  },
  "look": {
   "form": "scepter",
   "shape": "seraph",
   "c1": "#fff0f2",
   "c2": "#a8122c",
   "glow": "#ff6a80"
  },
  "description": "ปีกเทวาหกปีกโอบอัญมณีแดงทรงหยดน้ำ ด้ามขาวพันริบบิ้นแดง"
 },
 {
  "id": "wpn_book_001",
  "name_th": "สมุดบทสวดผู้ฝึกหัด",
  "name_en": "Novice Hymnal",
  "type": "book",
  "class": [
   "acolyte"
  ],
  "req_level": 8,
  "tier": "green",
  "rarity": "uncommon",
  "base": {
   "atk": 9,
   "matk": 30,
   "element": "holy",
   "weight": 43
  },
  "fixed_stats": {
   "INT": 1,
   "After-cast Delay -%": 8
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 1,
    "max": 2
   },
   {
    "stat": "SP Regen%",
    "min": 6,
    "max": 14
   },
   {
    "stat": "MaxSP",
    "min": 10,
    "max": 23
   },
   {
    "stat": "After-cast Delay -%",
    "min": 2,
    "max": 6
   }
  ],
  "random_count": [
   1,
   2
  ],
  "slots": 0,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "สกิลถี่",
  "tradeoff": "MATK ต่ำกว่าคทา",
  "drop": [
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "thornback",
    "rate": 0.01
   },
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "stinglet",
    "rate": 0.01
   }
  ],
  "refine_per_level": {
   "matk": 3,
   "atk": 1
  },
  "look": {
   "form": "book",
   "shape": "hymnal",
   "c1": "#e8dcc0",
   "c2": "#6a3a2a",
   "glow": "#ffe9a8"
  },
  "description": "สมุดปกหนังสีน้ำตาล มุมหุ้มทองเหลือง มีริบบิ้นคั่นหน้า"
 },
 {
  "id": "wpn_book_002",
  "name_th": "คัมภีร์ใบไม้เขียว",
  "name_en": "Verdant Codex",
  "type": "book",
  "class": [
   "acolyte"
  ],
  "req_level": 24,
  "tier": "blue",
  "rarity": "rare",
  "base": {
   "atk": 22,
   "matk": 74,
   "element": "earth",
   "weight": 50
  },
  "fixed_stats": {
   "INT": 3,
   "VIT": 2,
   "After-cast Delay -%": 8,
   "ATK%": -5
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 1,
    "max": 4
   },
   {
    "stat": "VIT",
    "min": 1,
    "max": 4
   },
   {
    "stat": "HP Regen%",
    "min": 7,
    "max": 16
   },
   {
    "stat": "SP Regen%",
    "min": 7,
    "max": 16
   },
   {
    "stat": "MaxHP",
    "min": 62,
    "max": 131
   }
  ],
  "random_count": [
   2,
   3
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ฟื้นฟูอึด",
  "tradeoff": "ATK -5%",
  "drop": [
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "barkwolf",
    "rate": 0.005
   },
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "frostfox",
    "rate": 0.005
   }
  ],
  "refine_per_level": {
   "matk": 5,
   "atk": 2
  },
  "look": {
   "form": "book",
   "shape": "codex",
   "c1": "#cfe8a8",
   "c2": "#3a5a2a",
   "glow": "#8aff6a"
  },
  "description": "ปกไม้มีเถาวัลย์งอกออกมาพันรอบ หน้ากระดาษเป็นใบไม้แห้งเรียงกัน"
 },
 {
  "id": "wpn_book_003",
  "name_th": "ตำราดาราลม",
  "name_en": "Galestar Tome",
  "type": "book",
  "class": [
   "acolyte"
  ],
  "req_level": 48,
  "tier": "purple",
  "rarity": "epic",
  "base": {
   "atk": 43,
   "matk": 145,
   "element": "wind",
   "weight": 59
  },
  "fixed_stats": {
   "INT": 5,
   "VIT": 3,
   "After-cast Delay -%": 8,
   "MaxHP%": -5
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 3,
    "max": 8
   },
   {
    "stat": "SP Regen%",
    "min": 8,
    "max": 19
   },
   {
    "stat": "After-cast Delay -%",
    "min": 3,
    "max": 8
   },
   {
    "stat": "Cast Time -%",
    "min": 3,
    "max": 8
   },
   {
    "stat": "MATK",
    "min": 6,
    "max": 16
   },
   {
    "stat": "MaxSP%",
    "min": 2,
    "max": 5
   }
  ],
  "random_count": [
   3,
   4
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ร่ายต่อเนื่อง",
  "tradeoff": "MaxHP -5%",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "emberimp",
    "rate": 0.0025
   },
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "icegolem",
    "rate": 0.0025
   }
  ],
  "refine_per_level": {
   "matk": 7,
   "atk": 3
  },
  "look": {
   "form": "book",
   "shape": "tome",
   "c1": "#cfe0ff",
   "c2": "#2a3a6a",
   "glow": "#9ad8ff"
  },
  "description": "ตำราปกน้ำเงินเข้มลายกลุ่มดาว หน้ากระดาษพลิกเองตามลม"
 },
 {
  "id": "wpn_book_004",
  "name_th": "คัมภีร์รุ่งอรุณนิรันดร์",
  "name_en": "Eternal Dawn Grimoire",
  "type": "book",
  "class": [
   "acolyte"
  ],
  "req_level": 90,
  "tier": "gold",
  "rarity": "mythic",
  "base": {
   "atk": 86,
   "matk": 288,
   "element": "holy",
   "weight": 76
  },
  "fixed_stats": {
   "INT": 10,
   "VIT": 5,
   "After-cast Delay -%": 8,
   "ATK%": -8
  },
  "random_stats": [
   {
    "stat": "INT",
    "min": 8,
    "max": 16
   },
   {
    "stat": "VIT",
    "min": 8,
    "max": 16
   },
   {
    "stat": "After-cast Delay -%",
    "min": 4,
    "max": 10
   },
   {
    "stat": "Heal Power%",
    "min": 4,
    "max": 12
   },
   {
    "stat": "SP Regen%",
    "min": 10,
    "max": 24
   },
   {
    "stat": "MaxSP%",
    "min": 2,
    "max": 6
   }
  ],
  "random_count": [
   4,
   5
  ],
  "slots": 2,
  "passive": {
   "kind": "echo",
   "chance": 12,
   "text": "โอกาส 12% รีเซ็ตดีเลย์หลังร่ายทันทีเมื่อใช้สกิล"
  },
  "set": null,
  "hybrid": null,
  "style": "ซัพพอร์ตไม่หยุด",
  "tradeoff": "ATK -8%",
  "drop": [
   {
    "map": "Haunted Forest",
    "map_id": "haunted_forest",
    "monster": "nocthar",
    "rate": 0.009
   },
   {
    "map": "Haunted Forest",
    "map_id": "haunted_forest",
    "monster": "cursed_stag",
    "rate": 0.0003
   }
  ],
  "refine_per_level": {
   "matk": 11,
   "atk": 4
  },
  "look": {
   "form": "book",
   "shape": "grimoire",
   "c1": "#fff6dc",
   "c2": "#c8a24a",
   "glow": "#ffe08a"
  },
  "description": "คัมภีร์ปกทองมีปีกเล็กสองข้าง จานสุริยะกลางปกหมุนช้า ๆ"
 },
 {
  "id": "wpn_sbow_001",
  "name_th": "ธนูสั้นกิ่งหลิว",
  "name_en": "Willow Shortbow",
  "type": "shortbow",
  "class": [
   "archer"
  ],
  "req_level": 1,
  "tier": "white",
  "rarity": "common",
  "base": {
   "atk": 13,
   "matk": 0,
   "element": "neutral",
   "weight": 50
  },
  "fixed_stats": {
   "DEX": 1,
   "ASPD%": 8,
   "Range": -1
  },
  "random_stats": [
   {
    "stat": "DEX",
    "min": 1,
    "max": 2
   },
   {
    "stat": "AGI",
    "min": 1,
    "max": 2
   },
   {
    "stat": "HIT",
    "min": 2,
    "max": 5
   }
  ],
  "random_count": [
   0,
   1
  ],
  "slots": 0,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ยิงรัว",
  "tradeoff": "ระยะ -1 ช่อง",
  "drop": [
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "bloblet",
    "rate": 0.02
   },
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "capling",
    "rate": 0.02
   }
  ],
  "refine_per_level": {
   "atk": 3
  },
  "look": {
   "form": "shortbow",
   "shape": "simple",
   "c1": "#b8865a",
   "c2": "#6ac04a",
   "glow": "#c8ffb0"
  },
  "description": "ธนูสั้นจากกิ่งหลิวดัด ผูกใบไม้ที่ปลายคัน"
 },
 {
  "id": "wpn_sbow_002",
  "name_th": "ธนูปีกผึ้ง",
  "name_en": "Stingwing Bow",
  "type": "shortbow",
  "class": [
   "archer"
  ],
  "req_level": 12,
  "tier": "green",
  "rarity": "uncommon",
  "base": {
   "atk": 43,
   "matk": 0,
   "element": "wind",
   "weight": 55
  },
  "fixed_stats": {
   "DEX": 2,
   "ASPD%": 8,
   "Range": -1,
   "ATK%": -4
  },
  "random_stats": [
   {
    "stat": "DEX",
    "min": 1,
    "max": 2
   },
   {
    "stat": "AGI",
    "min": 1,
    "max": 2
   },
   {
    "stat": "ASPD%",
    "min": 1,
    "max": 5
   },
   {
    "stat": "DMG vs insect",
    "min": 3,
    "max": 9
   }
  ],
  "random_count": [
   1,
   2
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "รัวเร็ว",
  "tradeoff": "ATK -4%",
  "drop": [
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "thornback",
    "rate": 0.01
   },
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "barkwolf",
    "rate": 0.01
   }
  ],
  "refine_per_level": {
   "atk": 3
  },
  "look": {
   "form": "shortbow",
   "shape": "wing",
   "c1": "#f2d27a",
   "c2": "#3a2a1a",
   "glow": "#fff3a0"
  },
  "description": "ปลายคันทั้งสองข้างเป็นปีกผึ้งใสลายเส้นดำ เหล็กไนติดที่ด้ามจับ"
 },
 {
  "id": "wpn_sbow_003",
  "name_th": "ธนูเงาจันทร์เสี้ยว",
  "name_en": "Crescent Shade Bow",
  "type": "shortbow",
  "class": [
   "archer"
  ],
  "req_level": 44,
  "tier": "purple",
  "rarity": "epic",
  "base": {
   "atk": 144,
   "matk": 0,
   "element": "shadow",
   "weight": 68
  },
  "fixed_stats": {
   "DEX": 5,
   "AGI": 3,
   "ASPD%": 8,
   "Range": -1,
   "HIT": -6
  },
  "random_stats": [
   {
    "stat": "DEX",
    "min": 3,
    "max": 6
   },
   {
    "stat": "LUK",
    "min": 3,
    "max": 6
   },
   {
    "stat": "CRIT",
    "min": 2,
    "max": 5
   },
   {
    "stat": "CRIT DMG%",
    "min": 5,
    "max": 13
   },
   {
    "stat": "Ranged DMG%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "ASPD%",
    "min": 2,
    "max": 6
   }
  ],
  "random_count": [
   3,
   4
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "สายคริ",
  "tradeoff": "HIT -6",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "magmaslime",
    "rate": 0.0025
   },
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "emberimp",
    "rate": 0.0025
   }
  ],
  "refine_per_level": {
   "atk": 7
  },
  "look": {
   "form": "shortbow",
   "shape": "crescent",
   "c1": "#8a8ab8",
   "c2": "#1a1a2a",
   "glow": "#b48cff"
  },
  "description": "คันธนูทรงจันทร์เสี้ยวสีดำม่วง ลูกศรออกจากเงาของคันเอง"
 },
 {
  "id": "wpn_sbow_004",
  "name_th": "ธนูเหยี่ยวพายุ",
  "name_en": "Galehawk Recurve",
  "type": "shortbow",
  "class": [
   "archer"
  ],
  "req_level": 80,
  "tier": "gold",
  "rarity": "mythic",
  "base": {
   "atk": 276,
   "matk": 0,
   "element": "wind",
   "weight": 82
  },
  "fixed_stats": {
   "DEX": 9,
   "AGI": 5,
   "ASPD%": 8,
   "Range": -1,
   "DEF": -6
  },
  "random_stats": [
   {
    "stat": "DEX",
    "min": 6,
    "max": 14
   },
   {
    "stat": "AGI",
    "min": 6,
    "max": 14
   },
   {
    "stat": "LUK",
    "min": 6,
    "max": 14
   },
   {
    "stat": "ASPD%",
    "min": 2,
    "max": 8
   },
   {
    "stat": "CRIT",
    "min": 2,
    "max": 6
   },
   {
    "stat": "Ranged DMG%",
    "min": 2,
    "max": 8
   }
  ],
  "random_count": [
   4,
   5
  ],
  "slots": 2,
  "passive": {
   "kind": "crit_rush",
   "value": 12,
   "dur": 3,
   "text": "เมื่อคริติคอล ได้ ASPD +12% นาน 3 วินาที"
  },
  "set": null,
  "hybrid": null,
  "style": "คริแล้วยิงเร็วขึ้น",
  "tradeoff": "DEF -6",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "ignarok",
    "rate": 0.009
   },
   {
    "map": "Haunted Forest",
    "map_id": "haunted_forest",
    "monster": "hollow_wolf",
    "rate": 0.0003
   }
  ],
  "refine_per_level": {
   "atk": 11
  },
  "look": {
   "form": "shortbow",
   "shape": "hawk",
   "c1": "#e8f4ff",
   "c2": "#5a6a8a",
   "glow": "#9ad8ff"
  },
  "description": "คันโค้งกลับเป็นปีกเหยี่ยวกางเต็มที่ ขนนกปลายปีกสั่นตามลม"
 },
 {
  "id": "wpn_lbow_001",
  "name_th": "ธนูยาวพรานป่า",
  "name_en": "Ranger Longbow",
  "type": "longbow",
  "class": [
   "archer"
  ],
  "req_level": 10,
  "tier": "white",
  "rarity": "common",
  "base": {
   "atk": 44,
   "matk": 0,
   "element": "neutral",
   "weight": 94
  },
  "fixed_stats": {
   "DEX": 1,
   "ASPD%": -6,
   "Range": 1
  },
  "random_stats": [
   {
    "stat": "DEX",
    "min": 1,
    "max": 2
   },
   {
    "stat": "HIT",
    "min": 2,
    "max": 6
   },
   {
    "stat": "ATK",
    "min": 1,
    "max": 3
   }
  ],
  "random_count": [
   0,
   1
  ],
  "slots": 0,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ยิงไกล",
  "tradeoff": "ASPD -6%",
  "drop": [
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "thornback",
    "rate": 0.02
   },
   {
    "map": "Whisperwood Forest",
    "map_id": "whisper_forest",
    "monster": "wisp",
    "rate": 0.02
   }
  ],
  "refine_per_level": {
   "atk": 3
  },
  "look": {
   "form": "longbow",
   "shape": "ranger",
   "c1": "#9a6a3e",
   "c2": "#4a6a3a",
   "glow": "#ffe9a8"
  },
  "description": "ธนูยาวไม้ยูพันด้ามหนังสีเขียว สูงเกือบเท่าตัวคน"
 },
 {
  "id": "wpn_lbow_002",
  "name_th": "ธนูยาวเขากวางแก้ว",
  "name_en": "Glassantler Longbow",
  "type": "longbow",
  "class": [
   "archer"
  ],
  "req_level": 34,
  "tier": "blue",
  "rarity": "rare",
  "base": {
   "atk": 130,
   "matk": 0,
   "element": "water",
   "weight": 104
  },
  "fixed_stats": {
   "DEX": 3,
   "AGI": 2,
   "ASPD%": -6,
   "Range": 1,
   "FLEE": -5
  },
  "random_stats": [
   {
    "stat": "DEX",
    "min": 3,
    "max": 5
   },
   {
    "stat": "LUK",
    "min": 3,
    "max": 5
   },
   {
    "stat": "Ranged DMG%",
    "min": 1,
    "max": 5
   },
   {
    "stat": "HIT",
    "min": 4,
    "max": 11
   },
   {
    "stat": "DMG vs fire",
    "min": 4,
    "max": 11
   }
  ],
  "random_count": [
   2,
   3
  ],
  "slots": 1,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ดาเมจไกล",
  "tradeoff": "FLEE -5",
  "drop": [
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "icegolem",
    "rate": 0.005
   },
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "frostbat",
    "rate": 0.005
   }
  ],
  "refine_per_level": {
   "atk": 5
  },
  "look": {
   "form": "longbow",
   "shape": "antler",
   "c1": "#dff6ff",
   "c2": "#5a7a9a",
   "glow": "#9ae8ff"
  },
  "description": "ปลายคันแตกกิ่งเป็นเขากวางแก้วใส เรืองแสงจาง ๆ ในที่มืด"
 },
 {
  "id": "wpn_lbow_003",
  "name_th": "ธนูยาวขนนกเพลิง",
  "name_en": "Cinderfeather Longbow",
  "type": "longbow",
  "class": [
   "archer"
  ],
  "req_level": 60,
  "tier": "orange",
  "rarity": "legend",
  "base": {
   "atk": 246,
   "matk": 0,
   "element": "fire",
   "weight": 114
  },
  "fixed_stats": {
   "DEX": 6,
   "AGI": 3,
   "ASPD%": -6,
   "Range": 1,
   "MaxHP%": -4
  },
  "random_stats": [
   {
    "stat": "DEX",
    "min": 5,
    "max": 11
   },
   {
    "stat": "STR",
    "min": 5,
    "max": 11
   },
   {
    "stat": "ATK%",
    "min": 2,
    "max": 5
   },
   {
    "stat": "Ranged DMG%",
    "min": 2,
    "max": 7
   },
   {
    "stat": "CRIT DMG%",
    "min": 5,
    "max": 14
   },
   {
    "stat": "DMG vs earth",
    "min": 5,
    "max": 14
   }
  ],
  "random_count": [
   4,
   4
  ],
  "slots": 2,
  "passive": null,
  "set": null,
  "hybrid": [
   "STR"
  ],
  "style": "ดาเมจหนักต่อดอก (ไฮบริด DEX+STR)",
  "tradeoff": "ASPD -6% · MaxHP -4%",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "salamander",
    "rate": 0.0012
   },
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "obsidiangolem",
    "rate": 0.0012
   }
  ],
  "refine_per_level": {
   "atk": 9
  },
  "look": {
   "form": "longbow",
   "shape": "feather",
   "c1": "#ffcf8a",
   "c2": "#6a2a1a",
   "glow": "#ff8a3a"
  },
  "description": "คันธนูประดับขนนกเพลิงเรียงตลอดแนว ลูกศรทิ้งเถ้าถ่านกลางอากาศ"
 },
 {
  "id": "wpn_lbow_004",
  "name_th": "ธนูยาวสุริยคราส",
  "name_en": "Eclipse Warbow",
  "type": "longbow",
  "class": [
   "archer"
  ],
  "req_level": 95,
  "tier": "red",
  "rarity": "celestial",
  "base": {
   "atk": 443,
   "matk": 0,
   "element": "shadow",
   "weight": 128
  },
  "fixed_stats": {
   "DEX": 12,
   "AGI": 6,
   "ASPD%": -6,
   "Range": 1,
   "MaxHP%": -8
  },
  "random_stats": [
   {
    "stat": "DEX",
    "min": 10,
    "max": 20
   },
   {
    "stat": "AGI",
    "min": 10,
    "max": 20
   },
   {
    "stat": "LUK",
    "min": 10,
    "max": 20
   },
   {
    "stat": "Ranged DMG%",
    "min": 3,
    "max": 10
   },
   {
    "stat": "CRIT DMG%",
    "min": 8,
    "max": 20
   },
   {
    "stat": "ASPD%",
    "min": 3,
    "max": 10
   },
   {
    "stat": "DMG vs holy",
    "min": 8,
    "max": 20
   }
  ],
  "random_count": [
   5,
   6
  ],
  "slots": 3,
  "passive": {
   "kind": "multishot",
   "chance": 15,
   "mult": 0.7,
   "text": "โอกาส 15% ลูกศรแยกไปโดนศัตรูใกล้เคียงอีก 1 ตัว (70% ดาเมจ)"
  },
  "set": {
   "id": "bloodmoon",
   "name": "จันทร์โลหิต",
   "pieces": [
    "bloodmoon_body",
    "bloodmoon_head",
    "bloodmoon_shield",
    "bloodmoon_garment",
    "bloodmoon_shoes",
    "bloodmoon_accessory"
   ],
   "bonus": {
    "2": {
     "Ranged DMG%": 5
    },
    "4": {
     "CRIT DMG%": 15,
     "ASPD%": 5
    }
   }
  },
  "hybrid": null,
  "style": "ยิงทะลุหลายเป้า",
  "tradeoff": "MaxHP -8%",
  "drop": [
   {
    "map": "Haunted Forest",
    "map_id": "haunted_forest",
    "monster": "nocthar",
    "rate": 0.001
   },
   {
    "map": "Ancient Ruins",
    "map_id": "ancient_ruins",
    "monster": "aurex",
    "rate": 0.0005
   }
  ],
  "refine_per_level": {
   "atk": 13
  },
  "look": {
   "form": "longbow",
   "shape": "eclipse",
   "c1": "#ffb0bc",
   "c2": "#1a0a14",
   "glow": "#ff3a5a"
  },
  "description": "คันธนูยาวสีดำมีวงสุริยคราสแดงอยู่กลางด้าม สายธนูเป็นแสงแดง"
 },
 {
  "id": "wpn_xbow_001",
  "name_th": "หน้าไม้ช่างไม้",
  "name_en": "Carpenter's Crossbow",
  "type": "crossbow",
  "class": [
   "archer"
  ],
  "req_level": 6,
  "tier": "white",
  "rarity": "common",
  "base": {
   "atk": 37,
   "matk": 0,
   "element": "neutral",
   "weight": 142
  },
  "fixed_stats": {
   "DEX": 1,
   "ASPD%": -15,
   "HIT": 10
  },
  "random_stats": [
   {
    "stat": "DEX",
    "min": 1,
    "max": 2
   },
   {
    "stat": "HIT",
    "min": 2,
    "max": 5
   },
   {
    "stat": "ATK",
    "min": 1,
    "max": 2
   }
  ],
  "random_count": [
   0,
   1
  ],
  "slots": 0,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "ดอกหนัก แม่น",
  "tradeoff": "ASPD -15%",
  "drop": [
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "stinglet",
    "rate": 0.02
   },
   {
    "map": "Beginner Field",
    "map_id": "beginner_field",
    "monster": "capling",
    "rate": 0.02
   }
  ],
  "refine_per_level": {
   "atk": 3
  },
  "look": {
   "form": "crossbow",
   "shape": "plank",
   "c1": "#a8794a",
   "c2": "#8a8f9a",
   "glow": "#ffe9a8"
  },
  "description": "หน้าไม้ไม้สนตอกหมุดเหล็ก ด้ามมีรอยขีดนับเป้าที่ยิงโดน"
 },
 {
  "id": "wpn_xbow_002",
  "name_th": "หน้าไม้เขี้ยวเยติ",
  "name_en": "Yetifang Arbalest",
  "type": "crossbow",
  "class": [
   "archer"
  ],
  "req_level": 30,
  "tier": "purple",
  "rarity": "epic",
  "base": {
   "atk": 147,
   "matk": 0,
   "element": "water",
   "weight": 152
  },
  "fixed_stats": {
   "DEX": 3,
   "AGI": 2,
   "ASPD%": -15,
   "HIT": 10,
   "FLEE": -6
  },
  "random_stats": [
   {
    "stat": "DEX",
    "min": 3,
    "max": 6
   },
   {
    "stat": "STR",
    "min": 3,
    "max": 6
   },
   {
    "stat": "ATK",
    "min": 5,
    "max": 11
   },
   {
    "stat": "Ranged DMG%",
    "min": 2,
    "max": 6
   },
   {
    "stat": "DMG vs large",
    "min": 5,
    "max": 13
   },
   {
    "stat": "HIT",
    "min": 5,
    "max": 13
   }
  ],
  "random_count": [
   3,
   4
  ],
  "slots": 2,
  "passive": null,
  "set": null,
  "hybrid": [
   "STR"
  ],
  "style": "ล่าตัวใหญ่ (ไฮบริด DEX+STR)",
  "tradeoff": "FLEE -6",
  "drop": [
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "frostbat",
    "rate": 0.0025
   },
   {
    "map": "Frostveil Peaks",
    "map_id": "frostveil",
    "monster": "icegolem",
    "rate": 0.0025
   }
  ],
  "refine_per_level": {
   "atk": 7
  },
  "look": {
   "form": "crossbow",
   "shape": "fang",
   "c1": "#e8eef8",
   "c2": "#3a5a7a",
   "glow": "#9ae8ff"
  },
  "description": "แขนหน้าไม้ทำจากเขี้ยวเยติโค้งคู่ หุ้มขนขาวที่ด้าม"
 },
 {
  "id": "wpn_xbow_003",
  "name_th": "หน้าไม้ฟันเฟืองโบราณ",
  "name_en": "Ancient Cog Arbalest",
  "type": "crossbow",
  "class": [
   "archer"
  ],
  "req_level": 64,
  "tier": "orange",
  "rarity": "legend",
  "base": {
   "atk": 308,
   "matk": 0,
   "element": "neutral",
   "weight": 166
  },
  "fixed_stats": {
   "DEX": 7,
   "AGI": -3,
   "ASPD%": -15,
   "HIT": 10
  },
  "random_stats": [
   {
    "stat": "DEX",
    "min": 5,
    "max": 11
   },
   {
    "stat": "LUK",
    "min": 5,
    "max": 11
   },
   {
    "stat": "ATK%",
    "min": 2,
    "max": 5
   },
   {
    "stat": "Ranged DMG%",
    "min": 2,
    "max": 7
   },
   {
    "stat": "HIT",
    "min": 9,
    "max": 20
   },
   {
    "stat": "CRIT DMG%",
    "min": 5,
    "max": 14
   }
  ],
  "random_count": [
   4,
   4
  ],
  "slots": 2,
  "passive": null,
  "set": null,
  "hybrid": null,
  "style": "แม่นยำสูง",
  "tradeoff": "ASPD -15% · AGI -3",
  "drop": [
   {
    "map": "Ancient Ruins",
    "map_id": "ancient_ruins",
    "monster": "sand_basilisk",
    "rate": 0.0012
   },
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "obsidiangolem",
    "rate": 0.0012
   }
  ],
  "refine_per_level": {
   "atk": 9
  },
  "look": {
   "form": "crossbow",
   "shape": "cog",
   "c1": "#e8d8a8",
   "c2": "#5a4a3a",
   "glow": "#ffd27a"
  },
  "description": "กลไกเฟืองทองเหลืองจากซากโบราณ หมุนขึ้นสายเองทุกครั้งที่ยิง"
 },
 {
  "id": "wpn_xbow_004",
  "name_th": "หน้าไม้ดาวเหนือ",
  "name_en": "Polaris Repeater",
  "type": "crossbow",
  "class": [
   "archer"
  ],
  "req_level": 86,
  "tier": "gold",
  "rarity": "mythic",
  "base": {
   "atk": 427,
   "matk": 0,
   "element": "holy",
   "weight": 174
  },
  "fixed_stats": {
   "DEX": 9,
   "AGI": 5,
   "ASPD%": -15,
   "HIT": 10,
   "MaxHP%": -6
  },
  "random_stats": [
   {
    "stat": "DEX",
    "min": 6,
    "max": 14
   },
   {
    "stat": "LUK",
    "min": 6,
    "max": 14
   },
   {
    "stat": "Ranged DMG%",
    "min": 2,
    "max": 8
   },
   {
    "stat": "CRIT",
    "min": 2,
    "max": 6
   },
   {
    "stat": "DMG vs shadow",
    "min": 6,
    "max": 16
   },
   {
    "stat": "ATK%",
    "min": 2,
    "max": 6
   }
  ],
  "random_count": [
   4,
   5
  ],
  "slots": 2,
  "passive": {
   "kind": "execute",
   "hp": 35,
   "value": 20,
   "text": "ดาเมจ +20% ต่อศัตรูที่ HP ต่ำกว่า 35%"
  },
  "set": null,
  "hybrid": null,
  "style": "ปิดฉากเป้าใกล้ตาย",
  "tradeoff": "MaxHP -6%",
  "drop": [
   {
    "map": "Ember Caldera",
    "map_id": "ember_caldera",
    "monster": "ignarok",
    "rate": 0.009
   },
   {
    "map": "Haunted Forest",
    "map_id": "haunted_forest",
    "monster": "mourning_shade",
    "rate": 0.0003
   }
  ],
  "refine_per_level": {
   "atk": 11
  },
  "look": {
   "form": "crossbow",
   "shape": "star",
   "c1": "#fff6cc",
   "c2": "#2a3a6a",
   "glow": "#ffe08a"
  },
  "description": "หน้าไม้รีพีทเตอร์มีดาวเหนือแปดแฉกอยู่หน้าราง ลูกดอกเป็นแสงดาว"
 }
];

// v0.31: อาวุธเฉพาะอาชีพขั้นที่ 2
import { JOB2_WEAPON_DEFS } from './job2Weapons.js?v=0.40.3';
WEAPON_DEFS.push(...JOB2_WEAPON_DEFS);
