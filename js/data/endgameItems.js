// v0.20: endgame equipment; no mutation of legacy item IDs.
export const ENDGAME_ITEMS = {
  "relic_sword": {
    "name": "ดาบซากโบราณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "sword",
    "jobs": [
      "swordsman"
    ],
    "icon": [
      "sword",
      "#e8e1d2"
    ],
    "visual": {
      "weapon": "sword",
      "bladeGlow": "#e8e1d2"
    },
    "bonus": {
      "atk": 180,
      "str": 5,
      "hit": 5
    },
    "reqLevel": 60,
    "price": 70000,
    "rarity": "common",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.60+ จาก Ancient Ruins / Haunted Forest"
  },
  "relic_staff": {
    "name": "ไม้เท้าซากโบราณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "staff",
    "jobs": [
      "mage",
      "acolyte"
    ],
    "icon": [
      "staff",
      "#e8e1d2"
    ],
    "visual": {
      "weapon": "staff",
      "gem": "#e8e1d2"
    },
    "bonus": {
      "atk": 45,
      "matk": 202,
      "int": 4,
      "maxSp": 150
    },
    "reqLevel": 60,
    "price": 70000,
    "rarity": "common",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.60+ จาก Ancient Ruins / Haunted Forest"
  },
  "relic_bow": {
    "name": "ธนูซากโบราณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "bow",
    "jobs": [
      "archer"
    ],
    "icon": [
      "bow",
      "#e8e1d2"
    ],
    "visual": {
      "weapon": "bow",
      "bowColor": "#e8e1d2"
    },
    "bonus": {
      "atk": 171,
      "dex": 5,
      "hit": 10
    },
    "reqLevel": 60,
    "price": 70000,
    "rarity": "common",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.60+ จาก Ancient Ruins / Haunted Forest"
  },
  "relic_mace": {
    "name": "คทาซากโบราณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "mace",
    "jobs": [
      "acolyte",
      "swordsman"
    ],
    "icon": [
      "mace",
      "#e8e1d2"
    ],
    "visual": {
      "weapon": "mace"
    },
    "bonus": {
      "atk": 153,
      "matk": 99,
      "vit": 4
    },
    "reqLevel": 60,
    "price": 70000,
    "rarity": "common",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.60+ จาก Ancient Ruins / Haunted Forest"
  },
  "relic_knife": {
    "name": "มีดซากโบราณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "knife",
    "jobs": [
      "novice",
      "swordsman",
      "mage",
      "archer"
    ],
    "icon": [
      "knife",
      "#e8e1d2"
    ],
    "visual": {
      "weapon": "knife"
    },
    "bonus": {
      "atk": 131,
      "agi": 5,
      "crit": 0.05
    },
    "reqLevel": 60,
    "price": 70000,
    "rarity": "common",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.60+ จาก Ancient Ruins / Haunted Forest"
  },
  "runic_sword": {
    "name": "ดาบอักขระ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "sword",
    "jobs": [
      "swordsman"
    ],
    "icon": [
      "sword",
      "#8fe08a"
    ],
    "visual": {
      "weapon": "sword",
      "bladeGlow": "#8fe08a"
    },
    "bonus": {
      "atk": 198,
      "str": 5,
      "hit": 5
    },
    "reqLevel": 64,
    "price": 84700,
    "rarity": "uncommon",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.64+ จาก Ancient Ruins / Haunted Forest"
  },
  "runic_staff": {
    "name": "ไม้เท้าอักขระ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "staff",
    "jobs": [
      "mage",
      "acolyte"
    ],
    "icon": [
      "staff",
      "#8fe08a"
    ],
    "visual": {
      "weapon": "staff",
      "gem": "#8fe08a"
    },
    "bonus": {
      "atk": 50,
      "matk": 222,
      "int": 5,
      "maxSp": 154
    },
    "reqLevel": 64,
    "price": 84700,
    "rarity": "uncommon",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.64+ จาก Ancient Ruins / Haunted Forest"
  },
  "runic_bow": {
    "name": "ธนูอักขระ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "bow",
    "jobs": [
      "archer"
    ],
    "icon": [
      "bow",
      "#8fe08a"
    ],
    "visual": {
      "weapon": "bow",
      "bowColor": "#8fe08a"
    },
    "bonus": {
      "atk": 188,
      "dex": 5,
      "hit": 10
    },
    "reqLevel": 64,
    "price": 84700,
    "rarity": "uncommon",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.64+ จาก Ancient Ruins / Haunted Forest"
  },
  "runic_mace": {
    "name": "คทาอักขระ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "mace",
    "jobs": [
      "acolyte",
      "swordsman"
    ],
    "icon": [
      "mace",
      "#8fe08a"
    ],
    "visual": {
      "weapon": "mace"
    },
    "bonus": {
      "atk": 168,
      "matk": 109,
      "vit": 4
    },
    "reqLevel": 64,
    "price": 84700,
    "rarity": "uncommon",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.64+ จาก Ancient Ruins / Haunted Forest"
  },
  "runic_knife": {
    "name": "มีดอักขระ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "knife",
    "jobs": [
      "novice",
      "swordsman",
      "mage",
      "archer"
    ],
    "icon": [
      "knife",
      "#8fe08a"
    ],
    "visual": {
      "weapon": "knife"
    },
    "bonus": {
      "atk": 145,
      "agi": 5,
      "crit": 0.05
    },
    "reqLevel": 64,
    "price": 84700,
    "rarity": "uncommon",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.64+ จาก Ancient Ruins / Haunted Forest"
  },
  "astral_sword": {
    "name": "ดาบดาราโบราณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "sword",
    "jobs": [
      "swordsman"
    ],
    "icon": [
      "sword",
      "#7fc4ff"
    ],
    "visual": {
      "weapon": "sword",
      "bladeGlow": "#7fc4ff"
    },
    "bonus": {
      "atk": 220,
      "str": 5,
      "hit": 5
    },
    "reqLevel": 68,
    "price": 104568,
    "rarity": "rare",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.68+ จาก Ancient Ruins / Haunted Forest"
  },
  "astral_staff": {
    "name": "ไม้เท้าดาราโบราณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "staff",
    "jobs": [
      "mage",
      "acolyte"
    ],
    "icon": [
      "staff",
      "#7fc4ff"
    ],
    "visual": {
      "weapon": "staff",
      "gem": "#7fc4ff"
    },
    "bonus": {
      "atk": 55,
      "matk": 246,
      "int": 6,
      "maxSp": 158
    },
    "reqLevel": 68,
    "price": 104568,
    "rarity": "rare",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.68+ จาก Ancient Ruins / Haunted Forest"
  },
  "astral_bow": {
    "name": "ธนูดาราโบราณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "bow",
    "jobs": [
      "archer"
    ],
    "icon": [
      "bow",
      "#7fc4ff"
    ],
    "visual": {
      "weapon": "bow",
      "bowColor": "#7fc4ff"
    },
    "bonus": {
      "atk": 209,
      "dex": 5,
      "hit": 10
    },
    "reqLevel": 68,
    "price": 104568,
    "rarity": "rare",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.68+ จาก Ancient Ruins / Haunted Forest"
  },
  "astral_mace": {
    "name": "คทาดาราโบราณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "mace",
    "jobs": [
      "acolyte",
      "swordsman"
    ],
    "icon": [
      "mace",
      "#7fc4ff"
    ],
    "visual": {
      "weapon": "mace"
    },
    "bonus": {
      "atk": 187,
      "matk": 121,
      "vit": 4
    },
    "reqLevel": 68,
    "price": 104568,
    "rarity": "rare",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.68+ จาก Ancient Ruins / Haunted Forest"
  },
  "astral_knife": {
    "name": "มีดดาราโบราณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "knife",
    "jobs": [
      "novice",
      "swordsman",
      "mage",
      "archer"
    ],
    "icon": [
      "knife",
      "#7fc4ff"
    ],
    "visual": {
      "weapon": "knife"
    },
    "bonus": {
      "atk": 161,
      "agi": 5,
      "crit": 0.05
    },
    "reqLevel": 68,
    "price": 104568,
    "rarity": "rare",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.68+ จาก Ancient Ruins / Haunted Forest"
  },
  "guardian_sword": {
    "name": "ดาบผู้พิทักษ์",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "sword",
    "jobs": [
      "swordsman"
    ],
    "icon": [
      "sword",
      "#d49bff"
    ],
    "visual": {
      "weapon": "sword",
      "bladeGlow": "#d49bff"
    },
    "bonus": {
      "atk": 246,
      "str": 5,
      "hit": 5
    },
    "reqLevel": 72,
    "price": 130744,
    "rarity": "epic",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.72+ จาก Ancient Ruins / Haunted Forest"
  },
  "guardian_staff": {
    "name": "ไม้เท้าผู้พิทักษ์",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "staff",
    "jobs": [
      "mage",
      "acolyte"
    ],
    "icon": [
      "staff",
      "#d49bff"
    ],
    "visual": {
      "weapon": "staff",
      "gem": "#d49bff"
    },
    "bonus": {
      "atk": 62,
      "matk": 276,
      "int": 7,
      "maxSp": 162
    },
    "reqLevel": 72,
    "price": 130744,
    "rarity": "epic",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.72+ จาก Ancient Ruins / Haunted Forest"
  },
  "guardian_bow": {
    "name": "ธนูผู้พิทักษ์",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "bow",
    "jobs": [
      "archer"
    ],
    "icon": [
      "bow",
      "#d49bff"
    ],
    "visual": {
      "weapon": "bow",
      "bowColor": "#d49bff"
    },
    "bonus": {
      "atk": 234,
      "dex": 5,
      "hit": 10
    },
    "reqLevel": 72,
    "price": 130744,
    "rarity": "epic",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.72+ จาก Ancient Ruins / Haunted Forest"
  },
  "guardian_mace": {
    "name": "คทาผู้พิทักษ์",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "mace",
    "jobs": [
      "acolyte",
      "swordsman"
    ],
    "icon": [
      "mace",
      "#d49bff"
    ],
    "visual": {
      "weapon": "mace"
    },
    "bonus": {
      "atk": 209,
      "matk": 135,
      "vit": 4
    },
    "reqLevel": 72,
    "price": 130744,
    "rarity": "epic",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.72+ จาก Ancient Ruins / Haunted Forest"
  },
  "guardian_knife": {
    "name": "มีดผู้พิทักษ์",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "knife",
    "jobs": [
      "novice",
      "swordsman",
      "mage",
      "archer"
    ],
    "icon": [
      "knife",
      "#d49bff"
    ],
    "visual": {
      "weapon": "knife"
    },
    "bonus": {
      "atk": 180,
      "agi": 5,
      "crit": 0.05
    },
    "reqLevel": 72,
    "price": 130744,
    "rarity": "epic",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.72+ จาก Ancient Ruins / Haunted Forest"
  },
  "spectral_sword": {
    "name": "ดาบวิญญาณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "sword",
    "jobs": [
      "swordsman"
    ],
    "icon": [
      "sword",
      "#ffb347"
    ],
    "visual": {
      "weapon": "sword",
      "bladeGlow": "#ffb347"
    },
    "bonus": {
      "atk": 284,
      "str": 5,
      "hit": 5
    },
    "reqLevel": 80,
    "price": 174257,
    "rarity": "legend",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.80+ จาก Ancient Ruins / Haunted Forest"
  },
  "spectral_staff": {
    "name": "ไม้เท้าวิญญาณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "staff",
    "jobs": [
      "mage",
      "acolyte"
    ],
    "icon": [
      "staff",
      "#ffb347"
    ],
    "visual": {
      "weapon": "staff",
      "gem": "#ffb347"
    },
    "bonus": {
      "atk": 71,
      "matk": 318,
      "int": 8,
      "maxSp": 170
    },
    "reqLevel": 80,
    "price": 174257,
    "rarity": "legend",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.80+ จาก Ancient Ruins / Haunted Forest"
  },
  "spectral_bow": {
    "name": "ธนูวิญญาณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "bow",
    "jobs": [
      "archer"
    ],
    "icon": [
      "bow",
      "#ffb347"
    ],
    "visual": {
      "weapon": "bow",
      "bowColor": "#ffb347"
    },
    "bonus": {
      "atk": 270,
      "dex": 5,
      "hit": 10
    },
    "reqLevel": 80,
    "price": 174257,
    "rarity": "legend",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.80+ จาก Ancient Ruins / Haunted Forest"
  },
  "spectral_mace": {
    "name": "คทาวิญญาณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "mace",
    "jobs": [
      "acolyte",
      "swordsman"
    ],
    "icon": [
      "mace",
      "#ffb347"
    ],
    "visual": {
      "weapon": "mace"
    },
    "bonus": {
      "atk": 241,
      "matk": 156,
      "vit": 4
    },
    "reqLevel": 80,
    "price": 174257,
    "rarity": "legend",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.80+ จาก Ancient Ruins / Haunted Forest"
  },
  "spectral_knife": {
    "name": "มีดวิญญาณ",
    "type": "equip",
    "slot": "weapon",
    "slots": 1,
    "wtype": "knife",
    "jobs": [
      "novice",
      "swordsman",
      "mage",
      "archer"
    ],
    "icon": [
      "knife",
      "#ffb347"
    ],
    "visual": {
      "weapon": "knife"
    },
    "bonus": {
      "atk": 207,
      "agi": 5,
      "crit": 0.05
    },
    "reqLevel": 80,
    "price": 174257,
    "rarity": "legend",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.80+ จาก Ancient Ruins / Haunted Forest"
  },
  "moonveil_sword": {
    "name": "ดาบจันทร์นิรันดร์",
    "type": "equip",
    "slot": "weapon",
    "slots": 2,
    "wtype": "sword",
    "jobs": [
      "swordsman"
    ],
    "icon": [
      "sword",
      "#ffd85e"
    ],
    "visual": {
      "weapon": "sword",
      "bladeGlow": "#ffd85e"
    },
    "bonus": {
      "atk": 324,
      "str": 5,
      "hit": 5
    },
    "reqLevel": 90,
    "price": 226800,
    "rarity": "mythic",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.90+ จาก Ancient Ruins / Haunted Forest"
  },
  "moonveil_staff": {
    "name": "ไม้เท้าจันทร์นิรันดร์",
    "type": "equip",
    "slot": "weapon",
    "slots": 2,
    "wtype": "staff",
    "jobs": [
      "mage",
      "acolyte"
    ],
    "icon": [
      "staff",
      "#ffd85e"
    ],
    "visual": {
      "weapon": "staff",
      "gem": "#ffd85e"
    },
    "bonus": {
      "atk": 81,
      "matk": 363,
      "int": 9,
      "maxSp": 180
    },
    "reqLevel": 90,
    "price": 226800,
    "rarity": "mythic",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.90+ จาก Ancient Ruins / Haunted Forest"
  },
  "moonveil_bow": {
    "name": "ธนูจันทร์นิรันดร์",
    "type": "equip",
    "slot": "weapon",
    "slots": 2,
    "wtype": "bow",
    "jobs": [
      "archer"
    ],
    "icon": [
      "bow",
      "#ffd85e"
    ],
    "visual": {
      "weapon": "bow",
      "bowColor": "#ffd85e"
    },
    "bonus": {
      "atk": 308,
      "dex": 5,
      "hit": 10
    },
    "reqLevel": 90,
    "price": 226800,
    "rarity": "mythic",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.90+ จาก Ancient Ruins / Haunted Forest"
  },
  "moonveil_mace": {
    "name": "คทาจันทร์นิรันดร์",
    "type": "equip",
    "slot": "weapon",
    "slots": 2,
    "wtype": "mace",
    "jobs": [
      "acolyte",
      "swordsman"
    ],
    "icon": [
      "mace",
      "#ffd85e"
    ],
    "visual": {
      "weapon": "mace"
    },
    "bonus": {
      "atk": 275,
      "matk": 178,
      "vit": 4
    },
    "reqLevel": 90,
    "price": 226800,
    "rarity": "mythic",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.90+ จาก Ancient Ruins / Haunted Forest"
  },
  "moonveil_knife": {
    "name": "มีดจันทร์นิรันดร์",
    "type": "equip",
    "slot": "weapon",
    "slots": 2,
    "wtype": "knife",
    "jobs": [
      "novice",
      "swordsman",
      "mage",
      "archer"
    ],
    "icon": [
      "knife",
      "#ffd85e"
    ],
    "visual": {
      "weapon": "knife"
    },
    "bonus": {
      "atk": 237,
      "agi": 5,
      "crit": 0.05
    },
    "reqLevel": 90,
    "price": 226800,
    "rarity": "mythic",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.90+ จาก Ancient Ruins / Haunted Forest"
  },
  "bloodmoon_sword": {
    "name": "ดาบจันทร์โลหิต",
    "type": "equip",
    "slot": "weapon",
    "slots": 2,
    "wtype": "sword",
    "jobs": [
      "swordsman"
    ],
    "icon": [
      "sword",
      "#ff5266"
    ],
    "visual": {
      "weapon": "sword",
      "bladeGlow": "#ff5266"
    },
    "bonus": {
      "atk": 368,
      "str": 5,
      "hit": 5
    },
    "reqLevel": 95,
    "price": 292583,
    "rarity": "celestial",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.95+ จาก Ancient Ruins / Haunted Forest"
  },
  "bloodmoon_staff": {
    "name": "ไม้เท้าจันทร์โลหิต",
    "type": "equip",
    "slot": "weapon",
    "slots": 2,
    "wtype": "staff",
    "jobs": [
      "mage",
      "acolyte"
    ],
    "icon": [
      "staff",
      "#ff5266"
    ],
    "visual": {
      "weapon": "staff",
      "gem": "#ff5266"
    },
    "bonus": {
      "atk": 92,
      "matk": 412,
      "int": 10,
      "maxSp": 185
    },
    "reqLevel": 95,
    "price": 292583,
    "rarity": "celestial",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.95+ จาก Ancient Ruins / Haunted Forest"
  },
  "bloodmoon_bow": {
    "name": "ธนูจันทร์โลหิต",
    "type": "equip",
    "slot": "weapon",
    "slots": 2,
    "wtype": "bow",
    "jobs": [
      "archer"
    ],
    "icon": [
      "bow",
      "#ff5266"
    ],
    "visual": {
      "weapon": "bow",
      "bowColor": "#ff5266"
    },
    "bonus": {
      "atk": 350,
      "dex": 5,
      "hit": 10
    },
    "reqLevel": 95,
    "price": 292583,
    "rarity": "celestial",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.95+ จาก Ancient Ruins / Haunted Forest"
  },
  "bloodmoon_mace": {
    "name": "คทาจันทร์โลหิต",
    "type": "equip",
    "slot": "weapon",
    "slots": 2,
    "wtype": "mace",
    "jobs": [
      "acolyte",
      "swordsman"
    ],
    "icon": [
      "mace",
      "#ff5266"
    ],
    "visual": {
      "weapon": "mace"
    },
    "bonus": {
      "atk": 313,
      "matk": 202,
      "vit": 4
    },
    "reqLevel": 95,
    "price": 292583,
    "rarity": "celestial",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.95+ จาก Ancient Ruins / Haunted Forest"
  },
  "bloodmoon_knife": {
    "name": "มีดจันทร์โลหิต",
    "type": "equip",
    "slot": "weapon",
    "slots": 2,
    "wtype": "knife",
    "jobs": [
      "novice",
      "swordsman",
      "mage",
      "archer"
    ],
    "icon": [
      "knife",
      "#ff5266"
    ],
    "visual": {
      "weapon": "knife"
    },
    "bonus": {
      "atk": 269,
      "agi": 5,
      "crit": 0.05
    },
    "reqLevel": 95,
    "price": 292583,
    "rarity": "celestial",
    "desc": "อาวุธสำหรับนักผจญภัย Lv.95+ จาก Ancient Ruins / Haunted Forest"
  },
  "astral_body": {
    "name": "เกราะดาราโบราณ",
    "type": "equip",
    "slot": "body",
    "slots": 1,
    "icon": [
      "shirt",
      "#7fc4ff"
    ],
    "visual": {
      "tunic": "#7fc4ff"
    },
    "bonus": {
      "def": 33,
      "mdef": 12,
      "maxHp": 816,
      "vit": 5
    },
    "reqLevel": 68,
    "price": 88000,
    "rarity": "rare",
    "desc": "อุปกรณ์ขั้นสูง Lv.68+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "astral_shield": {
    "name": "โล่ดาราโบราณ",
    "type": "equip",
    "slot": "shield",
    "slots": 1,
    "icon": [
      "shield",
      "#7fc4ff"
    ],
    "visual": {
      "shield": "#7fc4ff"
    },
    "bonus": {
      "def": 18,
      "mdef": 12,
      "maxHp": 272
    },
    "reqLevel": 68,
    "price": 88000,
    "rarity": "rare",
    "desc": "อุปกรณ์ขั้นสูง Lv.68+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "astral_head": {
    "name": "มงกุฎดาราโบราณ",
    "type": "equip",
    "slot": "head",
    "slots": 1,
    "icon": [
      "crown",
      "#7fc4ff"
    ],
    "visual": {
      "headgear": "crown",
      "headColor": "#7fc4ff"
    },
    "bonus": {
      "def": 12,
      "int": 5,
      "dex": 4,
      "maxSp": 68
    },
    "reqLevel": 68,
    "price": 88000,
    "rarity": "rare",
    "desc": "อุปกรณ์ขั้นสูง Lv.68+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "astral_garment": {
    "name": "ผ้าคลุมดาราโบราณ",
    "type": "equip",
    "slot": "garment",
    "slots": 1,
    "icon": [
      "cape",
      "#7fc4ff"
    ],
    "visual": {
      "cape": "#7fc4ff"
    },
    "bonus": {
      "def": 12,
      "mdef": 10,
      "flee": 12,
      "maxHp": 340
    },
    "reqLevel": 68,
    "price": 88000,
    "rarity": "rare",
    "desc": "อุปกรณ์ขั้นสูง Lv.68+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "astral_shoes": {
    "name": "รองเท้าดาราโบราณ",
    "type": "equip",
    "slot": "shoes",
    "slots": 1,
    "icon": [
      "boots",
      "#7fc4ff"
    ],
    "visual": {},
    "bonus": {
      "def": 10,
      "agi": 6,
      "flee": 10
    },
    "reqLevel": 68,
    "price": 88000,
    "rarity": "rare",
    "desc": "อุปกรณ์ขั้นสูง Lv.68+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "astral_accessory": {
    "name": "แหวนดาราโบราณ",
    "type": "equip",
    "slot": "accessory",
    "slots": 1,
    "icon": [
      "ring",
      "#7fc4ff"
    ],
    "visual": {},
    "bonus": {
      "atk": 13,
      "matk": 13,
      "maxHpPct": 5
    },
    "reqLevel": 68,
    "price": 88000,
    "rarity": "rare",
    "desc": "อุปกรณ์ขั้นสูง Lv.68+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "spectral_body": {
    "name": "เกราะวิญญาณ",
    "type": "equip",
    "slot": "body",
    "slots": 1,
    "icon": [
      "shirt",
      "#ffb347"
    ],
    "visual": {
      "tunic": "#ffb347"
    },
    "bonus": {
      "def": 43,
      "mdef": 12,
      "maxHp": 960,
      "vit": 5
    },
    "reqLevel": 80,
    "price": 113600,
    "rarity": "legend",
    "desc": "อุปกรณ์ขั้นสูง Lv.80+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "spectral_shield": {
    "name": "โล่วิญญาณ",
    "type": "equip",
    "slot": "shield",
    "slots": 1,
    "icon": [
      "shield",
      "#ffb347"
    ],
    "visual": {
      "shield": "#ffb347"
    },
    "bonus": {
      "def": 23,
      "mdef": 12,
      "maxHp": 320
    },
    "reqLevel": 80,
    "price": 113600,
    "rarity": "legend",
    "desc": "อุปกรณ์ขั้นสูง Lv.80+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "spectral_head": {
    "name": "มงกุฎวิญญาณ",
    "type": "equip",
    "slot": "head",
    "slots": 1,
    "icon": [
      "crown",
      "#ffb347"
    ],
    "visual": {
      "headgear": "crown",
      "headColor": "#ffb347"
    },
    "bonus": {
      "def": 12,
      "int": 5,
      "dex": 4,
      "maxSp": 80
    },
    "reqLevel": 80,
    "price": 113600,
    "rarity": "legend",
    "desc": "อุปกรณ์ขั้นสูง Lv.80+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "spectral_garment": {
    "name": "ผ้าคลุมวิญญาณ",
    "type": "equip",
    "slot": "garment",
    "slots": 1,
    "icon": [
      "cape",
      "#ffb347"
    ],
    "visual": {
      "cape": "#ffb347"
    },
    "bonus": {
      "def": 12,
      "mdef": 10,
      "flee": 12,
      "maxHp": 400
    },
    "reqLevel": 80,
    "price": 113600,
    "rarity": "legend",
    "desc": "อุปกรณ์ขั้นสูง Lv.80+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "spectral_shoes": {
    "name": "รองเท้าวิญญาณ",
    "type": "equip",
    "slot": "shoes",
    "slots": 1,
    "icon": [
      "boots",
      "#ffb347"
    ],
    "visual": {},
    "bonus": {
      "def": 10,
      "agi": 6,
      "flee": 10
    },
    "reqLevel": 80,
    "price": 113600,
    "rarity": "legend",
    "desc": "อุปกรณ์ขั้นสูง Lv.80+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "spectral_accessory": {
    "name": "แหวนวิญญาณ",
    "type": "equip",
    "slot": "accessory",
    "slots": 1,
    "icon": [
      "ring",
      "#ffb347"
    ],
    "visual": {},
    "bonus": {
      "atk": 17,
      "matk": 17,
      "maxHpPct": 5
    },
    "reqLevel": 80,
    "price": 113600,
    "rarity": "legend",
    "desc": "อุปกรณ์ขั้นสูง Lv.80+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "bloodmoon_body": {
    "name": "เกราะจันทร์โลหิต",
    "type": "equip",
    "slot": "body",
    "slots": 1,
    "icon": [
      "shirt",
      "#ff5266"
    ],
    "visual": {
      "tunic": "#ff5266"
    },
    "bonus": {
      "def": 55,
      "mdef": 12,
      "maxHp": 1140,
      "vit": 5
    },
    "reqLevel": 95,
    "price": 147200,
    "rarity": "celestial",
    "desc": "อุปกรณ์ขั้นสูง Lv.95+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "bloodmoon_shield": {
    "name": "โล่จันทร์โลหิต",
    "type": "equip",
    "slot": "shield",
    "slots": 1,
    "icon": [
      "shield",
      "#ff5266"
    ],
    "visual": {
      "shield": "#ff5266"
    },
    "bonus": {
      "def": 29,
      "mdef": 12,
      "maxHp": 380
    },
    "reqLevel": 95,
    "price": 147200,
    "rarity": "celestial",
    "desc": "อุปกรณ์ขั้นสูง Lv.95+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "bloodmoon_head": {
    "name": "มงกุฎจันทร์โลหิต",
    "type": "equip",
    "slot": "head",
    "slots": 1,
    "icon": [
      "crown",
      "#ff5266"
    ],
    "visual": {
      "headgear": "crown",
      "headColor": "#ff5266"
    },
    "bonus": {
      "def": 12,
      "int": 5,
      "dex": 4,
      "maxSp": 95
    },
    "reqLevel": 95,
    "price": 147200,
    "rarity": "celestial",
    "desc": "อุปกรณ์ขั้นสูง Lv.95+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "bloodmoon_garment": {
    "name": "ผ้าคลุมจันทร์โลหิต",
    "type": "equip",
    "slot": "garment",
    "slots": 1,
    "icon": [
      "cape",
      "#ff5266"
    ],
    "visual": {
      "cape": "#ff5266"
    },
    "bonus": {
      "def": 12,
      "mdef": 10,
      "flee": 12,
      "maxHp": 475
    },
    "reqLevel": 95,
    "price": 147200,
    "rarity": "celestial",
    "desc": "อุปกรณ์ขั้นสูง Lv.95+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "bloodmoon_shoes": {
    "name": "รองเท้าจันทร์โลหิต",
    "type": "equip",
    "slot": "shoes",
    "slots": 1,
    "icon": [
      "boots",
      "#ff5266"
    ],
    "visual": {},
    "bonus": {
      "def": 10,
      "agi": 6,
      "flee": 10
    },
    "reqLevel": 95,
    "price": 147200,
    "rarity": "celestial",
    "desc": "อุปกรณ์ขั้นสูง Lv.95+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "bloodmoon_accessory": {
    "name": "แหวนจันทร์โลหิต",
    "type": "equip",
    "slot": "accessory",
    "slots": 1,
    "icon": [
      "ring",
      "#ff5266"
    ],
    "visual": {},
    "bonus": {
      "atk": 22,
      "matk": 22,
      "maxHpPct": 5
    },
    "reqLevel": 95,
    "price": 147200,
    "rarity": "celestial",
    "desc": "อุปกรณ์ขั้นสูง Lv.95+ มีช่องใส่การ์ดมอนสเตอร์"
  },
  "ruin_fragment": {
    "name": "เศษศิลาอักขระ",
    "type": "etc",
    "icon": [
      "crystal",
      "#98d6c8"
    ],
    "rarity": "uncommon",
    "price": 1600,
    "desc": "วัตถุดิบและสมบัติจากดินแดนระดับสูง"
  },
  "spirit_thread": {
    "name": "เส้นใยวิญญาณ",
    "type": "etc",
    "icon": [
      "spore",
      "#98d6c8"
    ],
    "rarity": "rare",
    "price": 2200,
    "desc": "วัตถุดิบและสมบัติจากดินแดนระดับสูง"
  },
  "guardian_core": {
    "name": "แกนราชันผู้พิทักษ์",
    "type": "etc",
    "icon": [
      "crystal",
      "#98d6c8"
    ],
    "rarity": "legend",
    "price": 36000,
    "desc": "วัตถุดิบและสมบัติจากดินแดนระดับสูง"
  },
  "dread_crown": {
    "name": "เศษมงกุฎจอมภูต",
    "type": "etc",
    "icon": [
      "crown",
      "#98d6c8"
    ],
    "rarity": "celestial",
    "price": 60000,
    "desc": "วัตถุดิบและสมบัติจากดินแดนระดับสูง"
  }
};
