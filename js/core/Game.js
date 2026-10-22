// ตัวควบคุมหลักของเกม: ลูป, แผนที่/วาร์ป, การเดิน, การต่อสู้ → ส่งต่อให้ Renderer3D วาด
import { SKILL_VFX } from '../render/PixelVfx.js?v=0.90.0';
import { BETA } from '../data/beta.js?v=0.90.0';
import { EventService } from '../systems/EventService.js?v=0.90.0';
import { EventWindow } from '../ui/EventWindow.js?v=0.90.0';
import { MvpService } from '../systems/MvpService.js?v=0.90.0';   // v0.53 MVP ร่วม
import { GemExchange } from '../ui/GemExchange.js?v=0.90.0';   // v0.50 ตลาดแลกเพชร
import { WikiWindow } from '../ui/WikiWindow.js?v=0.90.0';   // v0.49 วิกิ
import { BossWindow } from '../ui/BossWindow.js?v=0.90.0';   // v0.47 เช็กบอสโลก/MVP
import { PartyDungeon } from '../systems/PartyDungeon.js?v=0.90.0';   // v0.75 ดันเจี้ยนปาร์ตี้
import { Arena } from '../systems/Arena.js?v=0.90.0';   // v0.78 สนามประลอง PvP
import { ArenaWindow } from '../ui/ArenaWindow.js?v=0.90.0';
import { Festival } from '../systems/Festival.js?v=0.90.0';   // v0.79 อีเวนต์เทศกาล
import { FestivalWindow } from '../ui/FestivalWindow.js?v=0.90.0';
import { DailyBoard } from '../systems/DailyBoard.js?v=0.90.0';   // v0.74 ภารกิจรายวัน
import { titlesOf, setSeasonHolders } from '../data/seasonTitles.js?v=0.90.0';   // v0.76
import { EternalWindow } from '../ui/EternalWindow.js?v=0.90.0';   // v0.77 หลอมอุปกรณ์นิรันดร์กาล
import { doForge } from '../systems/EternalForge.js?v=0.90.0';
import { eternalId } from '../data/eternal.js?v=0.90.0';
import { SeasonWindow } from '../ui/SeasonWindow.js?v=0.90.0';   // v0.76 อันดับประจำฤดูกาล
import { DailyWindow } from '../ui/DailyWindow.js?v=0.90.0';
import { TILE, AUTOSAVE_SECONDS, SAVE_KEY, SAVE_SCHEMA, VERSION } from '../config.js?v=0.90.0';
import { GameMap } from '../world/GameMap.js?v=0.90.0';
import { MAPS, START_MAP } from '../data/maps/index.js?v=0.90.0';
import { Player } from '../entities/Player.js?v=0.90.0';
import { NPC } from '../entities/NPC.js?v=0.90.0';
import { Input, isTyping } from './Input.js?v=0.90.0';
import { SaveManager } from './Save.js?v=0.90.0';
import { findPath, smoothPath, nearestWalkable } from './Pathfinder.js?v=0.90.0';
import { HUD } from '../ui/HUD.js?v=0.90.0';
import { Minimap } from '../ui/Minimap.js?v=0.90.0';
import { MapWindow, regionInfo } from '../ui/MapWindow.js?v=0.90.0';
import { CardModal } from '../ui/CardView.js?v=0.90.0';
import { Renderer3D } from '../render/Renderer3D.js?v=0.90.0';
import { MonsterManager } from '../systems/MonsterAI.js?v=0.90.0';
import { rollAttack, rollSkill } from '../systems/Combat.js?v=0.90.0';
import * as WeaponFx from '../systems/WeaponFx.js?v=0.90.0';   // v0.25: ธาตุ/เผ่า/ขนาด + พาสซีฟอาวุธ
import { skillElement, mobTraits } from '../data/affixes.js?v=0.90.0';
import { StatusWindow } from '../ui/StatusWindow.js?v=0.90.0';
import { InventoryWindow } from '../ui/InventoryWindow.js?v=0.90.0';
import { Hotbar } from '../ui/Hotbar.js?v=0.90.0';
import { ITEMS, RARITY } from '../data/items.js?v=0.90.0';
import { rollDrops } from '../systems/Loot.js?v=0.90.0';
import { iconURL } from '../render/ItemIcons.js?v=0.90.0';
import { Inventory } from '../systems/Inventory.js?v=0.90.0';
import { NpcDialog } from '../ui/Dialog.js?v=0.90.0';
import { ShopWindow } from '../ui/ShopWindow.js?v=0.90.0';
import { StorageWindow } from '../ui/StorageWindow.js?v=0.90.0';
import { SHOPS, WARP_ROUTES, STORAGE_CAPACITY, buyPrice, sellPrice, fmtZ, MAX_ZENY } from '../data/shops.js?v=0.90.0';
import { SKILLS, skillSp, skillCast, sval } from '../data/skills.js?v=0.90.0';
import { JOBS, FIRST_JOBS, jobTier } from '../data/progression.js?v=0.90.0';
import { JOB3_SFX, JOB3_IMPACT_SFX } from '../data/job3Skills.js?v=0.90.0';   // v0.85
import { JOB2_QUEST, JOB3_QUEST } from '../data/quests.js?v=0.90.0';
import { SkillWindow } from '../ui/SkillWindow.js?v=0.90.0';
import { isSkillKey } from '../entities/Player.js?v=0.90.0';
import { clamp } from './util.js?v=0.90.0';
import { Social } from '../systems/Social.js?v=0.90.0';
const DROP_GATE = 0.4;   // v0.38: โอกาสที่มอนธรรมดาจะดรอปของ (ก่อนลุ้นทีละชิ้น)
import { PartyFrame } from '../ui/PartyFrame.js?v=0.90.0';
import { PlayerMenu } from '../ui/PlayerMenu.js?v=0.90.0';
import { TradeWindow, MarketWindow } from '../ui/TradeMarket.js?v=0.90.0';   // v0.42
import { CashShopWindow } from '../ui/CashShop.js?v=0.90.0';   // v0.43 ร้านเพชร
import { QuestNav } from '../systems/QuestNav.js?v=0.90.0';
import { MONSTERS } from '../data/monsters.js?v=0.90.0';
import { THREE } from '../render/three.js?v=0.90.0';
import { WardrobeWindow } from '../ui/WardrobeWindow.js?v=0.90.0';
import { BoxOpenWindow } from '../ui/BoxOpenWindow.js?v=0.90.0';
import { rollBox, DUP_ZENY, FASHION_RARITY, TIER_RANK } from '../data/fashionBoxes.js?v=0.90.0';
import { COSTUME_BY_ID } from '../data/costumes.js?v=0.90.0';
import { FASHION_SLOTS, FASHION_WEAPON_FIT } from '../entities/Player.js?v=0.90.0';
import { QUESTS } from '../data/quests.js?v=0.90.0';
import { QuestLog, rewardText, npcWhere, goalText } from '../systems/Quests.js?v=0.90.0';
import { QuestWindow } from '../ui/QuestWindow.js?v=0.90.0';
import { RefineWindow } from '../ui/RefineWindow.js?v=0.90.0';
import { doRefine, doSocket, doUnsocket } from '../systems/Forge.js?v=0.90.0';
import { duraOf, repairCost, DURA_MAX } from '../data/durability.js?v=0.90.0';   // v0.89
import { SmithWindow } from '../ui/SmithWindow.js?v=0.90.0';   // v0.89 ซ่อม/ถอดการ์ด
import { EquipWindow } from '../ui/EquipWindow.js?v=0.90.0';   // v0.89 หน้าดูตัวละคร
import { stoneDrops } from '../data/refine.js?v=0.90.0';
import { cardDrops, CARDS } from '../data/cards.js?v=0.90.0';
import { statResetCost } from '../data/progression.js?v=0.90.0';
// v0.11: เสียง · ตั้งค่า · ออนไลน์ · แชต · เมนูมือถือ
import { AudioEngine } from '../audio/AudioEngine.js?v=0.90.0';
import { loadSettings, saveSettings } from '../systems/Settings.js?v=0.90.0';
import { SettingsWindow } from '../ui/SettingsWindow.js?v=0.90.0';
import { RemotePlayers } from '../net/RemotePlayers.js?v=0.90.0';
import { OnlineWindow } from '../ui/OnlineWindow.js?v=0.90.0';
import { ChatBox } from '../ui/ChatBox.js?v=0.90.0';
import { MenuPanel } from '../ui/MenuPanel.js?v=0.90.0';
// v0.13: สัตว์เลี้ยงช่วยเก็บของ · ไอเทมใช้งานชุดใหม่
import { PetSystem } from '../systems/PetSystem.js?v=0.90.0';
import { useConsumable, STORAGE_UP } from '../systems/ItemUse.js?v=0.90.0';
import { CONSUMABLES, consumableDrops } from '../data/consumables.js?v=0.90.0';
import { PETS, PET_RARITY, hatchEgg as rollHatch } from '../data/pets.js?v=0.90.0';
import { PetWindow } from '../ui/PetWindow.js?v=0.90.0';
import { HatchWindow } from '../ui/HatchWindow.js?v=0.90.0';
import { pickOfTier, FASHION_TIERS } from '../data/fashionBoxes.js?v=0.90.0';
// v0.14: ตีมอนออโต้
import { AutoHunt } from '../systems/AutoHunt.js?v=0.90.0';
import { AutoWindow } from '../ui/AutoWindow.js?v=0.90.0';
// v0.15: จดหมาย + ของขวัญต้อนรับ
import { Mailbox } from '../systems/Mailbox.js?v=0.90.0';
import { MailWindow } from '../ui/MailWindow.js?v=0.90.0';
import { Collection } from '../systems/Collection.js?v=0.90.0';          // v0.18: ระบบสะสม
import { CollectionWindow } from '../ui/CollectionWindow.js?v=0.90.0';
import { Dungeons } from '../systems/Dungeons.js?v=0.90.0';              // v0.32: ดันเจี้ยนถ้ำ + หอคอย

// เสียงตอนใช้สกิล (เริ่ม) และตอนกระแทก (จังหวะกล้องสั่น)
const SKILL_SFX = {
  frost_shards: 'cast', glacier_spike: 'iceBlast', blizzard_vortex: 'iceBlast', frost_armor: 'skill', absolute_zero: 'cast',
  twin_shadow: 'shoot', moon_hawk: 'shoot', shadow_snare: 'shoot', phantom_step: 'skill', eclipse_barrage: 'cast', life_seed: 'cast', thorn_bloom: 'cast', healing_rain: 'heal', lotus_sanctuary: 'skill', tree_of_life: 'cast',
  first_aid: 'heal', triple_slash: 'swing', flame_wave: 'swing', blazing_dash: 'swing', inferno_whirl: 'swing', crimson_judgement: 'cast',
  thunder_cut: 'swing', sword_qi_barrage: 'swing', flash_step: 'swing', thousand_blades: 'cast', heaven_splitter: 'cast',
  arcane_bolt: 'cast', rune_burst: 'cast', thunder_pillar: 'cast', mana_shield: 'skill', arcane_cataclysm: 'cast',
  star_shot: 'shoot', comet_pierce: 'shoot', starburst_volley: 'shoot', starfall_rain: 'shoot', constellation_mark: 'skill',
  holy_light: 'cast', healing_pillar: 'heal', judgement_rays: 'cast', light_blessing: 'heal', divine_descent: 'cast',
};
const IMPACT_SFX = {
  glacier_spike: 'iceBlast', blizzard_vortex: 'iceBlast', absolute_zero: 'iceBlast', moon_hawk: 'slam', shadow_snare: 'slam', eclipse_barrage: 'explosion', twin_shadow: 'slam', divine_descent: 'explosion', tree_of_life: 'explosion', judgement_rays: 'thunder', thorn_bloom: 'slam', holy_light: 'thunder', life_seed: 'slam',
  arcane_cataclysm: 'explosion', arcane_bolt: 'slam', rune_burst: 'explosion', thunder_pillar: 'thunder', comet_pierce: 'slam', starfall_rain: 'explosion', starburst_volley: 'slam', star_shot: 'slam',
  triple_slash: 'slam', flame_wave: 'slam', blazing_dash: 'explosion', inferno_whirl: 'slam', crimson_judgement: 'explosion', thunder_cut: 'thunder', sword_qi_barrage: 'slam', flash_step: 'thunder', thousand_blades: 'slam', heaven_splitter: 'thunder',
};

const DAY_CYCLE_MS = 2 * 60 * 60 * 1000;   // v0.86 หนึ่งวันในเกม = 2 ชั่วโมงจริง
Object.assign(SKILL_SFX, JOB3_SFX); Object.assign(IMPACT_SFX, JOB3_IMPACT_SFX);   // v0.85 สกิลคลาส 3

export class Game {
  // opts: { online: Online, audio: AudioEngine } (v0.11)
  constructor(root, opts = {}) {
    this.root = root;
    this.online = opts.online || null;
    this.mode = 'offline';                  // offline | online (กำหนดตอน start)
    this.audio = opts.audio || new AudioEngine();
    this.settings = loadSettings();
    this.canvas = root.querySelector('#view');
    this.hud = new HUD(root);
    this.input = new Input(this.canvas, root.querySelector('#joystick'));
    this.gfx = new Renderer3D(this.canvas, root.querySelector('#labels'));
    this.saver = new SaveManager();
    if(window.__contentPreview) this.saver.adapter={load:async()=>null,save:async()=>true};
    // นับจังหวะโจมตีของผู้เล่น ส่งให้ผู้เล่นคนอื่นเห็นท่าฟัน/ยิง/ร่าย (v0.11)
    this.atkSeq = 0; this.atkKind = 'melee';
    const playAttack = this.gfx.playAttack.bind(this.gfx);
    this.gfx.playAttack = (e, kind) => {
      if (e === this.player) { this.atkSeq = (this.atkSeq + 1) % 1000; this.atkKind = kind || 'melee'; this.netTimer = Math.min(this.netTimer || 0, 0.03); }
      playAttack(e, kind);
    };
    this.time = 0;
    this.retargetTimer = 0;
    this.saveTimer = 0;
    this.hoverTimer = 0;
    this.regenTimer = 0;
    this.dirty = false;
    this.warping = false;
    this.timeline = [];       // เหตุการณ์ที่ตั้งเวลาไว้ (เช่น จังหวะดาบโดน)
    this.hitstop = 0;         // v0.8: หยุดภาพชั่วขณะตอนโจมตีแรง
    this.heroAnims = [];      // v0.8: ท่ากระโดด/หมุนตัวของสกิล
    this.fpsFrames = 0; this.fpsTime = 0;

    this.player = new Player('Novice', 0, 0);
    this.gfx.addCharacter(this.player);
    this.hud.setPlayer(this.player);

    window.addEventListener('resize', () => this.resize());
    // v0.27.1: หมุนจอ (iOS/Android) — ขนาดจอจริงมาช้ากว่าอีเวนต์ จึงวัดซ้ำหลายจังหวะ + ตามขนาดกล่องเกมจริง
    const settle = () => { window.scrollTo(0, 0); this.resize(); for (const ms of [80, 200, 450, 900]) setTimeout(() => { window.scrollTo(0, 0); this.resize(); }, ms); this.input && this.input.cancelTouches && this.input.cancelTouches(); };
    window.addEventListener('orientationchange', settle);
    if (window.screen && screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', settle);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(root);
    this.resize();

    root.querySelector('#btnSave')?.addEventListener('click', () => this.saveNow(true));
    root.querySelector('#btnSettings').addEventListener('click', () => this.toggleSettings());
    root.querySelector('#btnOnline').addEventListener('click', () => this.toggleOnline());
    root.querySelector('#rotL').addEventListener('click', () => this.gfx.rotateCamera(-Math.PI / 4));
    root.querySelector('#rotR').addEventListener('click', () => this.gfx.rotateCamera(Math.PI / 4));
    root.querySelector('#btnAttack').addEventListener('click', () => this.targetNearest());

    // หน้าต่างสถานะ (C หรือ Alt+A แบบเกมคลาสสิก)
    this.status = new StatusWindow(root, this.player, {
      onChange: () => { this.hud.setPlayer(this.player); this.dirty = true; },
      onReset: () => this.resetStats(),
    });
    root.querySelector('#btnStatus').addEventListener('click', () => this.toggleStatus());
    const crest = root.querySelector('.panel.char .crest');   // v0.89 แตะเหรียญอาชีพ = ดูตัวละคร
    if (crest) { crest.removeAttribute('aria-hidden'); crest.setAttribute('role', 'button'); crest.tabIndex = 0; crest.title = 'ดูตัวละคร / อุปกรณ์ (G)'; crest.addEventListener('click', () => this.equipWin && this.equipWin.toggle()); crest.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.equipWin.toggle(); } }); }

    // กระเป๋า + ปุ่มลัด
    this.drops = [];
    this.dropUid = 1;
    this.useCd = 0;
    this.inv = new InventoryWindow(root, this.player, {
      use: (id) => this.useItem(id),
      equip: (id) => this.equipItem(id),
      unequip: (slot) => this.unequipSlot(slot),
      drop: (id) => this.dropFromBag(id),
      assign: (i, id) => this.assignHotkey(i, id),
      open: (id, n) => this.openBox(id, n),
      socket: (cardId, ref) => this.socketCard(cardId, ref),
      viewCard: (id) => this.cardModal && this.cardModal.show(id),
    });
    this.hotbar = new Hotbar(root, this.player, {
      onUse: (i) => this.useHotkey(i),
      onAssign: (i, id) => this.assignHotkey(i, id),
    });
    root.querySelector('#btnInv').addEventListener('click', () => this.inv.toggle());
    // มือถือ: ปุ่มลัด 1–4 เรียงรอบปุ่มโจมตี (เปิดเมื่อพบจอสัมผัส)
    this.hotbar.layout(document.body.classList.contains('touch'));
    window.addEventListener('touchstart', () => this.hotbar.layout(true), { once: true, passive: true });

    // บริการ NPC (v0.5): กล่องสนทนา ร้านค้า คลังเก็บของ
    this.storage = new Inventory(STORAGE_CAPACITY);
    this.activeNpc = null;
    const end = () => this.endService();
    this.dialog = new NpcDialog(root, { onClose: end });
    this.shop = new ShopWindow(root, this.player, { onBuy: (l) => this.buyItems(l), onSell: (l) => this.sellItems(l), onClose: end });
    this.storWin = new StorageWindow(root, this.player, this.storage, { onMove: (f, id, q) => this.moveStorage(f, id, q), onClose: end });

    // สกิล + อาชีพ (v0.6)
    this.skillWin = new SkillWindow(root, this.player, {
      onLearn: (id) => this.learnSkill(id),
      onAssign: (i, key) => this.assignHotkey(i, key),
      onUse: (id) => this.useSkill(id),
    });
    root.querySelector('#btnSkill').addEventListener('click', () => this.toggleSkills());
    this.uiTimer = 0;

    // แฟชั่น (v0.9): ตู้แฟชั่น + หน้าต่างเปิดกล่องสุ่ม
    this.ward = new WardrobeWindow(root, this.player, {
      wear: (id) => this.wearFashion(id),
      takeOff: (slot) => this.takeOffFashion(slot),
      wearSet: (ids) => this.wearFashionSet(ids),
      toggleHidden: () => this.toggleFashionHidden(),
      takeOffAll: () => this.takeOffAllFashion(),
    });
    root.querySelector('#btnWard').addEventListener('click', () => this.toggleWardrobe());
    this.gacha = new BoxOpenWindow(root, {
      wear: (id) => this.wearFashion(id),
      again: (boxId, n) => this.openBox(boxId, n),
      wardrobe: (id) => { this.status.toggle(false); this.skillWin.toggle(false); this.ward.focus(id); },
      closed: () => this.celebrateFashion(),
      sound: (name, o) => this.sfx(name, o),
    });
    this.fashionBest = null;    // ระดับสูงสุดที่เปิดได้ในรอบนี้ (ฉลองตอนปิดหน้าต่าง)

    // เควส + ตีบวก (v0.10)
    this.questLog = new QuestLog(this.player);
    this.questWin = new QuestWindow(root, this.player, this.questLog, { abandon: (id) => this.abandonQuest(id) });
    root.querySelector('#btnQuest').addEventListener('click', () => this.toggleQuests());
    this.smith = new SmithWindow(root, this);     // v0.89 ช่างตีเหล็ก: ซ่อม · ถอดการ์ด
    this.equipWin = new EquipWindow(root, this);  // v0.89 หน้าดูตัวละคร + อุปกรณ์ที่สวม
    this.refineWin = new RefineWindow(root, this.player, { refine: (ref, guard, luck) => this.refineItem(ref, guard, luck), bonus: () => this.pets.refineUp(), onClose: () => this.endService(), sound: (n) => this.sfx(n) });
    this.readyQuests = new Set();

    // v0.11: ตั้งค่า · ผู้เล่นออนไลน์ · แชต · เมนู ☰ (มือถือ)
    this.setWin = new SettingsWindow(root, this.settings, {
      change: (k, v) => this.changeSetting(k, v),
      account: () => this.accountInfo(),
      save: () => this.saveNow(true),
      switchChar: () => this.switchCharacter(),
      exportSave: () => this.exportSave(),
      importSave: (f) => this.importSave(f),
      logout: () => this.logout(),
    });
    this.social = new Social(this);           // v0.37: ปาร์ตี้ + กิลด์
    this.partyUi = new PartyFrame(root, this);
    this.onWin = new OnlineWindow(root, this);
    this.playerMenu = new PlayerMenu(root, this);   // v0.38
    this.trade = new TradeWindow(root, this);     // v0.42 แลกของ
    this.market = new MarketWindow(root, this);   // v0.42 ตลาดฝากขาย
    this.market.onClose = () => this.endService && this.endService();
    this.cash = new CashShopWindow(root, this);   // v0.43 ร้านเพชร
    this.vip = { until: 0, skew: 0, claimed: false, market: null, was: null };   // v0.45 VIP (วันหมดอายุมาจากเซิร์ฟเวอร์)
    // v0.44.1 กล่องเควสวางใต้แผนที่ย่อเสมอ (แผนที่ย่อสูงไม่เท่ากันแต่ละแผนที่/จอ) — ไม่ซ้อนทับกัน
    { const mini = root.querySelector('.mini'), qt = root.querySelector('#qtrack');
      const place = () => { if (!mini || !qt) return; const hb = (qt.offsetParent || root).getBoundingClientRect(), r = mini.getBoundingClientRect(); if (r.height > 0) qt.style.top = `${Math.round(r.bottom - hb.top + 10)}px`; };
      if (mini && qt && typeof ResizeObserver === 'function') new ResizeObserver(place).observe(mini);
      window.addEventListener('resize', place); setTimeout(place, 500); }
    this.questNav = new QuestNav(root, this);       // v0.38 ลูกศรนำทางเควส
    this.questWin.onNav = (id) => { if (this.settings.questNav === false) { this.settings.questNav = true; saveSettings(this.settings); this.questNav.pick = id; this.questNav.t = 0; this.questWin.renderTracker(); return; } this.questNav.pick = this.questNav.pick === id ? null : id; this.questNav.t = 0; this.questWin.renderTracker(); };
    this.questWin.navId = () => this.questNav.questId();
    this.questWin.navEnabled = () => this.settings.questNav !== false;
    this.questWin.onNavToggle = () => { this.settings.questNav = this.settings.questNav === false; saveSettings(this.settings); this.questNav.t = 0; };
    this.remote = new RemotePlayers(this);
    this.netTimer = 0; this.lastPres = {}; this.netSay = null; this.netRefresh = 0;
    this.chat = new ChatBox(root, { onSend: (t) => this.sendChat(t), onChannel: (c) => { this.chatChannel = c; }, settings: this.settings, onSettings: () => saveSettings(this.settings) });
    this.social.onChange(() => { if (this.social.replyTo) this.chat.setWhisperTo(this.social.replyTo); });
    this.menu = new MenuPanel(root, (act) => this.menuAction(act));
    // v0.27: แผนที่ใหญ่ + แผนที่โลก
    this.mapWin = new MapWindow(root, this);
    this.cardModal = new CardModal(root);   // v0.29: การ์ดใบใหญ่ + หน้าจอได้รับการ์ด
    for (const [id, tab] of [['#btnMapBig', 'local'], ['#minimap', 'local'], ['#btnWorld', 'world']]) {
      const el = root.querySelector(id);
      if (el) { el.addEventListener('click', (e) => { e.stopPropagation(); this.mapWin.toggle(this.mapWin.open && this.mapWin.tab === tab ? false : true, tab); }); el.addEventListener('pointerdown', (e) => e.stopPropagation()); }
    }
    this.netStatus = root.querySelector('#netStatus');
    // เสียง: เบราว์เซอร์เปิดเสียงได้หลังแตะ/กดปุ่มครั้งแรก · ปุ่มทุกปุ่มมีเสียงคลิก
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    root.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('button');
      if (b && !b.disabled && !b.closest('.hk') && !b.closest('.gacha')) this.sfx('click');
    });
    this.hud.onPlayer = (p) => this.menu.badges({ stat: p.statPoints, skill: p.skillPoints, mail: this.mailbox ? this.mailbox.unread() : 0 });
    // v0.13: สัตว์เลี้ยง + บัฟไอเทม + คลังขยาย
    this.hud.itemSrc = () => this.player.itemBuffs;
    this.storageUps = 0;
    this.pets = new PetSystem(this);
    this.petWin = new PetWindow(root, this.player, {
      summon: (id) => this.summonPet(id),
      hatch: (egg) => this.hatchEgg(egg), adopt: (id) => this.adoptPet(id),
      // v0.24.1: ปุ่มลัดตัวกรอง = ตั้งระดับขั้นต่ำในตั้งค่าละเอียดด้วย
      pick: () => { this.dirty = true; },
      seenDrops: () => [...(this.seenDrops || new Map()).keys()].reverse(),
      filter: (f) => { this.player.pets.filter = f; const P = this.player.pets.pick; P.min = f === 'rare' ? 2 : f === 'skipCommon' ? 1 : 0; P.usableAny = f === 'skipCommon'; this.hud.log(`สัตว์เลี้ยงจะ${{ all: 'เก็บของทุกอย่าง', skipCommon: 'ข้ามของธรรมดา', rare: 'เก็บเฉพาะของหายากขึ้นไป' }[f]}`, 'info'); this.dirty = true; },
      stats: (id) => this.pets.stats(id),
      reviveLeft: () => this.pets.reviveLeft(),
    });
    this.hatchWin = new HatchWindow(root, {
      again: (egg) => this.hatchEgg(egg),
      summon: (id) => this.summonPet(id),
      sound: (n) => this.sfx(n, { gap: 0 }),
      closed: () => this.celebratePet(),
    });
    const bp = root.querySelector('#btnPet'); if (bp) bp.addEventListener('click', () => this.togglePets());
    // v0.14: ตีมอนออโต้ (ปุ่ม AUTO ลอยบนจอ · H ตั้งค่า · Z เริ่ม/หยุด)
    this.auto = new AutoHunt(this);
    this.autoWin = new AutoWindow(root, this);
    this.auto.onChange = () => this.autoWin.sync();
    // v0.15: จดหมาย (M / ปุ่ม 📬)
    this.mailbox = new Mailbox(this);
    this.mailWin = new MailWindow(root, this);
    this.collection = new Collection(this);          // v0.18: สมุดมอน · ความสำเร็จ/ฉายา · อัลบั้มการ์ด · เช็กอิน
    this.colWin = new CollectionWindow(root, this);
    const bb = root.querySelector('#btnBook'); if (bb) bb.addEventListener('click', () => this.toggleCollection());
    this.mailbox.onChange = () => { this.mailWin.render(); this.updateMailBadge(); };
    const bm = root.querySelector('#btnMail'); if (bm) bm.addEventListener('click', () => this.mailWin.toggle());
    const bc = root.querySelector('#btnCash'); if (bc) bc.addEventListener('click', () => this.cash.toggle());
    const bBoss = root.querySelector('#btnBoss'); if (bBoss) bBoss.addEventListener('click', () => this.bossWin.toggle());   // v0.47
    const bGx = root.querySelector('#btnGx'); if (bGx) bGx.addEventListener('click', () => this.gxWin.toggle());   // v0.50
    const bWiki = root.querySelector('#btnWiki'); if (bWiki) bWiki.addEventListener('click', () => this.wikiWin.toggle());   // v0.49
    const bv = root.querySelector('#btnVip'); if (bv) bv.addEventListener('click', () => (this.cash.open && this.cash.tab === 'vip' ? this.cash.close() : this.cash.show('vip')));   // v0.45
    this.setupTopbarToggle(root);   // v0.88 ปุ่มพับ/กางแถบไอคอนด้านบน
    const be = root.querySelector('#btnEvents'); if (be) be.addEventListener('click', () => this.eventWin && this.eventWin.toggle());   // v0.44 แถบไอคอนด้านบน
    this.events = new EventService(this);
    this.mvp = new MvpService(this);   // v0.53
    this.dungeon = new Dungeons(this);               // v0.32
    this.pd = new PartyDungeon(this);                // v0.75
    this.arena = new Arena(this);                    // v0.78
    this.festival = new Festival(this);              // v0.79
    this.eventWin = new EventWindow(root, this);
    this.bossWin = new BossWindow(root, this);
    // v0.74 กระดานภารกิจรายวัน
    this.daily = new DailyBoard(this);
    this.dailyWin = new DailyWindow(root, this);
    this.daily.changed = () => { this.dailyDirty = true; };
    this.seasonWin = new SeasonWindow(root, this);   // v0.76
    this.eternalWin = new EternalWindow(root, this);   // v0.77
    this.arenaWin = new ArenaWindow(root, this);   // v0.78
    this.festWin = new FestivalWindow(root, this);   // v0.79
    const bArena = root.querySelector('#btnArena'); if (bArena) bArena.addEventListener('click', () => this.arenaWin.toggle());
    const bRank = root.querySelector('#btnRank'); if (bRank) bRank.addEventListener('click', () => this.seasonWin.toggle());
    const bDaily = root.querySelector('#btnDaily'); if (bDaily) bDaily.addEventListener('click', () => this.dailyWin.toggle());
    this.wikiWin = new WikiWindow(root, this);   // v0.49
    this.gxWin = new GemExchange(root, this);   // v0.50
    this.questLog.now = () => this.events.online && !this.events.fresh ? null : this.events.now();
    this.applySettings();

    window.addEventListener('keydown', (e) => {
      if (this.gacha.open || !this.started) return;   // หน้าต่างเปิดกล่องจัดการปุ่มเอง · ยังอยู่หน้าเลือกตัวละคร
      if (isTyping(e)) return;                        // กำลังพิมพ์แชต/ช่องข้อความ
      if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !this.dialog.open) { e.preventDefault(); this.chat.focus(); return; }
      if (e.code.startsWith('F') && /^F[1-9]$/.test(e.code)) { e.preventDefault(); if (!e.repeat) this.useHotkey(+e.code.slice(1) - 1); return; }
      if (/^Digit[1-9]$/.test(e.code) && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (!e.repeat && !this.dialog.pick(+e.code.slice(5) - 1)) this.useHotkey(+e.code.slice(5) - 1);
        return;
      }
      if (e.repeat) return;
      if (e.code === 'KeyC' || (e.altKey && e.code === 'KeyA')) { e.preventDefault(); this.toggleStatus(); }
      if (e.code === 'KeyI' || (e.altKey && e.code === 'KeyE')) { e.preventDefault(); this.inv.toggle(); }
      if (e.code === 'KeyK' || (e.altKey && e.code === 'KeyS')) { e.preventDefault(); this.toggleSkills(); }
      if (e.code === 'KeyO' || (e.altKey && e.code === 'KeyO')) { e.preventDefault(); this.toggleWardrobe(); }
      if (e.code === 'KeyJ' || (e.altKey && e.code === 'KeyU')) { e.preventDefault(); this.toggleQuests(); }
      if (e.code === 'KeyP') { e.preventDefault(); this.togglePets(); }
      if (e.code === 'KeyG') { e.preventDefault(); this.equipWin.toggle(); }   // v0.89 หน้าดูตัวละคร
      if (e.code === 'KeyH') { e.preventDefault(); this.autoWin.toggle(); }
      if (e.code === 'KeyZ') { e.preventDefault(); this.auto.toggle(); }
      if (e.code === 'KeyM') { e.preventDefault(); this.mailWin.toggle(); }
      if (e.code === 'KeyB') { e.preventDefault(); this.toggleCollection(); }   // v0.18
      if (e.code === 'KeyN') { e.preventDefault(); this.mapWin.toggle(); }   // v0.27
      if (e.code === 'Escape') {
        if (this.dialog.open || this.shop.open || this.storWin.open || this.refineWin.open) { this.closeServices(); return; }
        if (this.setWin.open || this.onWin.open || this.menu.open) { this.setWin.toggle(false); this.onWin.toggle(false); this.menu.toggle(false); return; }
        this.status.toggle(false); this.inv.toggle(false); this.equipWin.toggle(false); if (this.smith.open) this.smith.close(); this.skillWin.toggle(false); this.ward.toggle(false); this.questWin.toggle(false); this.petWin.toggle(false); this.autoWin.toggle(false); this.mailWin.toggle(false); this.colWin.toggle(false); if (this.market.open) this.market.close(); this.cash.close(); this.eventWin?.toggle(false); this.bossWin?.toggle(false); this.dailyWin?.toggle(false); this.seasonWin?.toggle(false); this.eternalWin?.toggle(false); this.arenaWin?.toggle(false); this.festWin?.toggle(false); this.wikiWin?.toggle(false); this.gxWin?.toggle(false); this.mapWin.toggle(false);
        if (this.player.cast) this.cancelCast();
      }
    });
    const flush = () => { if (this.dirty && this.started) this.saveNow(false); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); this.audio.setHidden(document.hidden); });
    window.addEventListener('pagehide', flush);
  }

  /* ---------- แผนที่ ---------- */

  // โหลดแผนที่ แล้ววางผู้เล่นที่ arrive {x, y, angle} (หน่วยช่อง) หรือจุดเกิดของแผนที่
  loadMap(id, arrive) {
    const def = (id && typeof id === 'object' ? id : MAPS[id]) || MAPS[START_MAP];   // v0.32: ดันเจี้ยนส่ง def ของชั้นมาตรง ๆ (ไม่ลงทะเบียนใน MAPS)
    if (typeof id === 'object') id = def.id;
    const t0 = performance.now();
    if (this.remote) this.remote.clear();   // ผู้เล่นคนอื่นของแผนที่เก่า
    if (this.pets) this.pets.clearRemote();
    this.map = new GameMap(def);
    this.gfx.buildWorld(this.map);

    this.npcs = (def.npcs || []).map((n) => new NPC(n));
    for (const n of this.npcs) { this.map.setSolid(n.tx, n.ty); this.gfx.addCharacter(n, { npc: true }); }

    const pl = this.player;
    // v0.41.2: arrive จากประตู/วาร์ป/เควสต์เขียนเป็นพิกัดก่อนขยายแผนที่ → คูณ scaled ของแผนที่ปลายทาง (ตำแหน่งจากเซฟใส่ abs ไว้ ไม่คูณซ้ำ)
    const sc = def.scaled || 1;
    const a = arrive ? (arrive.abs || sc === 1 ? arrive : { ...arrive, x: arrive.x * sc, y: arrive.y * sc }) : def.spawn;
    pl.x = a.x * TILE; pl.y = a.y * TILE;
    if (typeof a.angle === 'number') pl.angle = a.angle;
    pl.path = []; pl.pendingTalk = null; pl.moving = false;
    pl.rootedUntil = 0; pl.cast = null; pl.pendingSkill = null;
    pl.lockUntil = 0; pl.skillDelayUntil = 0; pl.castPose = false; pl.castPoseUntil = 0; pl.lift = 0;
    this.heroAnims = []; this.hitstop = 0;
    this.clearTarget();
    this.hud.setBoss(null);
    this.timeline = [];
    this.drops = [];
    pl.pendingPickup = null;

    const fest = this.festival ? this.festival.extraSpawns(def) : [];   // v0.79 มอน/บอสเทศกาล
    this.mobs = def.safe ? null : new MonsterManager(this.map, (def.spawns || []).concat(fest), { x: pl.x, y: pl.y });
    if (this.mobs && fest.length) this.festival.scale(this.mobs);
    if (this.mobs) for (const m of this.mobs.list) this.gfx.addMonster(m);
    this.mvp?.onMapChange();

    // กันวาร์ปซ้ำทันทีถ้าเกิดในประตูมิติ
    for (const p of this.map.portals) p.inside = this.inRect(pl, p.rect);

    this.minimap = new Minimap(this.root.querySelector('#minimap'), this.map, this.npcs);
    if (!def.instance) pl.visited.add(def.id || id);           // v0.13: ใบวาร์ปเลือกแผนที่จำแผนที่ที่เคยไป (ไม่นับแผนที่ดันเจี้ยน)
    this.friendSeek = null;
    if (this.pets) this.pets.onMapLoaded();
    if (this.auto) { this.auto.onMapLoaded(); this.autoWin.sync(); if (this.autoWin.open) this.autoWin.render(); }
    this.questEvents(this.questLog.onMap(def.id || id));
    this.hud.setMap(this.map);
    { const ri = regionInfo(def.id || id), chip = this.root.querySelector('#mapChip'); if (chip && ri) chip.textContent = def.safe ? 'เมือง' : `Lv.${ri.min}–${ri.max}`; else if (chip && def.instance) chip.textContent = def.instance === 'cave' ? 'ดันเจี้ยน' : def.instance === 'party' ? 'ดันปาร์ตี้' : def.instance === 'arena' ? 'สนามประลอง' : 'หอคอย'; }
    if (this.mapWin && this.mapWin.open) this.mapWin.show(this.mapWin.tab);
    this.gfx.snapCamera(pl);
    if (this.started) this.gfx.warpIn(pl, def.safe ? '#ffe08a' : '#8fd8ff');
    this.audio.music(def.music || 'field');
    this.bossMusic = false;
    if (this.started) { this.sfx('warp'); this.syncRemote(); this.netTimer = 0; }
    this.dirty = true;
    if (this.dungeon) this.dungeon.onMapLoaded(def);
    if (this.pd) this.pd.onMapLoaded(def);
    if (this.arena) this.arena.onMapLoaded(def);   // v0.78
    console.info(`[Everlevel] โหลดแผนที่ ${def.name} ใน ${Math.round(performance.now() - t0)} ms`);
  }

  // วาร์ปพร้อมจอค่อย ๆ มืด
  warp(id, arrive, after) {
    if (this.warping) return;
    this.warping = true;
    this.root.classList.add('fading');
    setTimeout(() => {
      this.loadMap(id, arrive);
      if (after) after();
      setTimeout(() => { this.root.classList.remove('fading'); this.warping = false; }, 120);
    }, 450);
  }

  inRect(e, [x0, y0, x1, y1]) {
    const [bx0, by0, bx1, by1] = e.box();
    return bx1 > x0 && bx0 < x1 && by1 > y0 && by0 < y1;
  }

  // opts (v0.11 จากหน้าเข้าเกม): { mode: 'online'|'offline', slot, save, create: { name, appearance }, storage, migrated }
  async start(opts = null) {
    if (!opts) opts = { mode: 'offline', save: await this.saver.load() };
    this.mode = opts.mode === 'online' && this.online && this.online.online ? 'online' : 'offline';
    this.cloud = this.mode === 'online' && !opts.localOnly && !!opts.slot;   // false = ออนไลน์ (เห็นเพื่อน) แต่เซฟในเครื่อง
    this.slot = opts.slot || 0;
    if(this.mode==='online' && this.online.eventSnapshot){
      try {const s=await this.online.eventSnapshot();this.events.serverAt=Date.parse(s.server_time);this.events.receivedAt=performance.now();this.events.state=s;}catch(e){this.events.error=e.message;}
    }
    if (this.cloud) this.backup = new SaveManager(undefined, `${SAVE_KEY}.cloud${this.slot}`);   // สำรองในเครื่อง เผื่อเน็ตหลุด
    if (this.cloud) {   // v0.42: เซิร์ฟเวอร์แก้เซฟ (แลกของ/ตลาด) → ปรับกระเป๋าในเครื่อง · เซฟซ้ำด้วยสถานะล่าสุด
      this.online.onLedger = (d) => this.applyServerDelta(d);
      this.online.onHalt = (kind, info) => this.serverHalt(kind, info);   // v0.82
      this.online.freshState = () => ({ schema: SAVE_SCHEMA, version: VERSION, savedAt: Date.now(), ...this.saveState() });
    }
    let data = opts.save || null;
    if (this.cloud && data && this.backup) {
      // เซฟสำรองในเครื่องใหม่กว่าบนคลาวด์ (เช่น ปิดเกมระหว่างบันทึก) → ใช้อันที่ใหม่กว่า
      const b = await this.backup.load();
      const tb = b && Date.parse(b.savedAt), tc = +data.savedAt || Date.parse(data.savedAt) || 0;
      const srvNewer = (this.online.rev || 0) > (+b?.srvRev || 0);   // v0.42 เซิร์ฟเวอร์แก้เซฟหลังสำรอง (แลกของ/ตลาด)
      if (b && b.player && data.player && b.player.name === data.player.name && tb > tc + 5000 && !srvNewer) { data = { ...b, storage: data.storage }; this.restoredBackup = true; }
    }
    if (opts.create) {
      data = null;
      this.player.name = opts.create.name;
      this.player.setAppearance(opts.create.appearance);
      if (Array.isArray(opts.storage)) this.loadStorage(opts.storage);
    }
    const p = data && data.player;
    let mapId = START_MAP, arrive = null;
    if (p && MAPS[p.map]) {
      mapId = p.map;
      // v0.41.1 เมืองขยาย · v0.41.2 ทุกแผนที่ขยาย → แปลงตำแหน่งจากเซฟเก่าให้อยู่จุดเดิมบนแผนที่ใหม่
      const sc = MAPS[p.map].scaled || 1;
      const f = p.map === 'asteria_town' ? ((data.townV || 0) < 2 ? sc : 1) : ((data.mapV || 0) < 3 ? sc : 1);
      arrive = { x: p.x / TILE * f, y: p.y / TILE * f, angle: typeof p.angle === 'number' ? p.angle : undefined, abs: true };
      this.player.fromSave(p);
      this.questLog.sanitize();
      if (Array.isArray(data.storage)) this.loadStorage(data.storage);
      if (data.camera) {
        this.gfx.rig.targetYaw = data.camera.yaw || 0;
        // v0.17.1: เซฟเก่า (ก่อนกล้องแบบ RO) ใช้ระยะเริ่มต้นใหม่ · เซฟใหม่ใช้ระยะที่ผู้เล่นซูมไว้ (ปัดให้ตรงขั้นพิกเซล)
        if (data.camera.v === 2 && data.camera.dist > 0) { this.gfx.wantDist = data.camera.dist; this.gfx.zoomCamera(1); }
      }
    } else if (p && p.name) {
      // v0.38: ตัวละครที่จองชื่อแล้วแต่ยังไม่เคยเซฟสำเร็จ — ใช้ชื่อเดิม + คลังของบัญชี (เดิมกลายเป็น "Novice" และเขียนคลังทั้งบัญชีเป็นว่าง)
      this.player.name = p.name;
      const st = Array.isArray(data.storage) ? data.storage : Array.isArray(opts.storage) ? opts.storage : null;
      if (st) this.loadStorage(st);
    }
    this.gfx.refreshLook(this.player);
    this.loadMap(mapId, arrive);
    // ตำแหน่งที่เซฟไว้ใช้ไม่ได้ (เช่น แผนที่เปลี่ยน) → ไปจุดเกิด
    if (this.map.boxBlocked(...this.player.box())) this.loadMap(mapId, null);
    this.hud.setPlayer(this.player);
    this.hotbar.render();
    if (p) this.hud.log(this.cloud ? `เข้าสู่ระบบออนไลน์ · โหลดตัวละคร ${this.player.name} จากคลาวด์แล้ว` : 'โหลดข้อมูลการเล่นล่าสุดแล้ว', 'sys');
    if (this.restoredBackup) this.hud.log('ใช้เซฟสำรองในเครื่องที่ใหม่กว่าบนคลาวด์', 'sys');
    if (opts.create) this.hud.log(`สร้างตัวละคร ${this.player.name} แล้ว! ขอให้สนุกกับการผจญภัย`, 'lv');
    if (opts.migrated) this.hud.log('ย้ายเซฟในเครื่องขึ้นคลาวด์แล้ว', 'sys');
    if (this.player.statPoints > 0) this.hud.log(`คุณมี Status Point ${this.player.statPoints} แต้ม กด C หรือปุ่ม "สถานะ" เพื่ออัปค่าสถานะ`, 'lv');
    this.hud.log('ยินดีต้อนรับสู่ Everlevel', 'sys');
    if (this.player.skillRefund) this.hud.log(`✨ สกิลอาชีพถูกออกแบบใหม่ทั้งชุด — คืน Skill Point ${this.player.skillRefund} แต้มแล้ว กด K เพื่อเรียนสกิลใหม่และตั้งปุ่มลัดอีกครั้ง`, 'r-epic');
    if (document.body.classList.contains('touch')) this.hud.log('แตะพื้นเพื่อเดิน · แตะมอนสเตอร์หรือปุ่ม ⚔ เพื่อโจมตี · ใช้สองนิ้วหมุนกล้อง', 'info');
    else this.hud.log('คลิกพื้นเพื่อเดิน · คลิกมอนสเตอร์เพื่อโจมตี · Space โจมตีตัวที่ใกล้ที่สุด · Q/E หมุนกล้อง', 'info');

    this.started = true;
    this.autoWin.sync();
    this.collection.start();   // v0.18: ปลดล็อกความสำเร็จที่ทำครบแล้ว · บันทึกการ์ดที่มี · เช็กอินวันนี้
    // v0.15: จดหมาย — ตัวละครใหม่เปิดกล่องจดหมายให้เลือกของขวัญต้อนรับ
    this.mailbox.refresh();   // v0.35: ไม่มีจดหมายต้อนรับแล้ว
    this.root.classList.toggle('online', this.mode === 'online');
    this.gfx.refreshLook(this.player);
    this.hud.setPlayer(this.player);
    this.gfx.warpIn(this.player, '#ffe08a');
    this.startNet();
    this.betaNotice();   // v0.83 ประกาศช่วงทดสอบ (ครั้งแรกที่เข้าเกม)
    if (opts.create || opts.migrated || this.restoredBackup) this.saveNow(false, true);
    let last = performance.now(), first = true;
    // v0.87 พับจอ/สลับแท็บ: เบราว์เซอร์หยุด requestAnimationFrame → ให้เกมเดินต่อด้วยนาฬิกาใน Web Worker (ไม่วาดภาพ)
    // ตีมอน ออโต้ เก็บของ สกิล และเซฟทำงานต่อ · กลับมาหน้าเกมแล้ววาดภาพตามปกติ
    this.startBackgroundLoop(() => last, (t) => { last = t; });
    const frame = (now) => {
      const real = Math.max(0, (now - last) / 1000); last = now;   // เวลา rAF อาจย้อนเล็กน้อยในเฟรมแรก
      const dt = Math.min(0.05, real);
      // หยุดภาพชั่วขณะ (hit-stop): โลกนิ่ง แต่กล้องยังสั่นและคลื่นกระแทกบนจอยังขยาย
      let simDt = dt;
      if (this.hitstop > 0) { this.hitstop -= dt; simDt = 0; }
      this.update(simDt);
      this.updateNet(dt);
      this.gfx.render(dt, this.player, simDt);
      this.questNav.update(real);
      // v0.16: แผนที่ย่อวาดใหม่ 10 ครั้ง/วินาที (เดิมทุกเฟรม)
      if ((this.mmT = (this.mmT || 0) - real) <= 0) { this.mmT = 0.1; this.minimap.draw(this.player, this.gfx.yaw, this.mobs ? this.mobs.list.filter((m) => m.data.mvp && !m.dead) : []); if ((this.mwT = (this.mwT || 0) + 1) % 2 === 0) this.mapWin.update(); }
      if (first) { first = false; this.root.classList.add('ready'); }
      if ((this.vipT = (this.vipT || 0) - real) <= 0) { this.vipT = 5; this.vipTick(); }   // v0.45 เช็ก VIP หมดอายุ
      if ((this.dayTk = (this.dayTk || 0) - real) <= 0) { this.dayTk = 1; this.dayTick(); }   // v0.86 กลางวัน/กลางคืน
      this.fpsFrames++; this.fpsTime += real;
      if (this.fpsTime >= 0.5) {
        const fps = Math.round(this.fpsFrames / this.fpsTime);
        this.hud.setFps(fps);
        this.autoQuality(fps);
        this.fpsFrames = 0; this.fpsTime = 0;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // ถ้าเฟรมเรตต่ำต่อเนื่อง ลดความละเอียด/เงาลงทีละขั้น (ไม่ปรับกลับขึ้น เพื่อไม่ให้กระตุกไปมา)
  // v0.16: ปรับคุณภาพอัตโนมัติทั้งลดและเพิ่ม
  // · FPS < 50 ติดกัน 2 วินาที → ลด 1 ระดับ · ลื่น ≥ 58 FPS นาน 15 วินาที → ลองเพิ่มกลับ (ถ้าเพิ่มแล้วกระตุกอีก จะรอนานขึ้นเท่าตัว)
  // · ลดระดับแล้ว FPS ไม่ขยับเลย = เครื่องล็อกเฟรมเรต (เช่นโหมดประหยัดแบต 30 FPS) → คืนระดับเดิม ไม่ลดภาพโดยเปล่าประโยชน์
  autoQuality(fps) {
    if (this.settings.quality !== 'auto') return;
    const A = this.aq || (this.aq = { t: 0, low: 0, high: 0, need: 30, capped: false, check: null, upAt: -99 });
    A.t += 0.5;
    if (A.t < 3 || this.warping || document.hidden) return;
    const q = this.gfx.quality || 0;
    if (A.check != null) {
      A.checkT += 0.5;
      if (A.checkT >= 3) { if (fps < A.check * 1.08 && A.prevQ != null) { this.gfx.setQuality(A.prevQ); A.capped = true; } A.check = null; }
      return;
    }
    A.low = fps < 50 ? A.low + 1 : 0;
    A.high = fps >= 58 ? A.high + 1 : 0;
    if (A.low >= 4 && q < 3 && !A.capped) {
      if (A.t - A.upAt < 12) A.need = Math.min(480, A.need * 2);   // เพิ่งเพิ่มคุณภาพแล้วกระตุก → รอนานขึ้นก่อนลองอีก
      A.prevQ = q; A.check = fps; A.checkT = 0; A.low = A.high = 0;
      this.gfx.setQuality(q + 1);
      if (q + 1 === 3) this.hud.log('ปรับกราฟิกเป็นโหมดประหยัดเพื่อให้เล่นลื่นขึ้น', 'sys');
    } else if (A.high >= A.need && q > 0) {
      A.high = A.low = 0; A.upAt = A.t;
      this.gfx.setQuality(q - 1);
    }
  }

  resize() {
    const w = this.root.clientWidth, h = this.root.clientHeight;
    if (w === this.lastW && h === this.lastH && (window.devicePixelRatio || 1) === this.lastDpr) return;
    this.lastW = w; this.lastH = h; this.lastDpr = window.devicePixelRatio || 1;
    this.gfx.resize(w, h);
    document.body.classList.toggle('land', w > h);   // v0.27.1: แนวนอน/แนวตั้ง (ใช้จัดปุ่ม)
    if (this.chat && this.chat.expanded && this.chat.placeOpen) this.chat.placeOpen();
  }

  /* ---------- การเดิน ---------- */

  moveTo(wx, wy, showMarker = true) {
    const map = this.map, pl = this.player;
    let tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    let target = { x: wx, y: wy };
    if (map.isSolidTile(tx, ty) || map.boxBlocked(...pl.box(wx, wy))) {
      const n = nearestWalkable(map, tx, ty, 4);
      if (!n) return false;
      tx = n.x; ty = n.y; target = { x: n.x * TILE + 8, y: n.y * TILE + 8 };
    }
    const path = findPath(map, Math.floor(pl.x / TILE), Math.floor(pl.y / TILE), tx, ty);
    if (!path) return false;
    const pts = path.slice(1).map((p) => ({ x: p.x * TILE + 8, y: p.y * TILE + 8 }));
    if (pts.length) pts[pts.length - 1] = target; else pts.push(target);
    pl.setPath(smoothPath(map, { x: pl.x, y: pl.y }, pts));
    if (showMarker) this.gfx.showMarker(target.x, target.y);
    return true;
  }

  approachNpc(npc) {
    const pl = this.player;
    this.clearTarget();
    if (Math.hypot(pl.x - npc.x, pl.y - npc.y) < 28) { pl.stop(); this.talkTo(npc); return; }
    let best = null, bestD = Infinity;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = npc.tx + dx, y = npc.ty + dy;
      if (this.map.isSolidTile(x, y)) continue;
      const d = Math.hypot(x * TILE + 8 - pl.x, y * TILE + 8 - pl.y);
      if (d < bestD) { bestD = d; best = { x, y }; }
    }
    if (best && this.moveTo(best.x * TILE + 8, best.y * TILE + 8, false)) pl.pendingTalk = npc;
  }

  talkTo(npc) {
    const q = this.questLog.forNpc(npc.id);
    if (q.ready.length || q.available.length || q.active.length) return this.questMenu(npc);
    if (npc.service) return this.openService(npc);
    const text = npc.talk(this.player);
    this.player.faceToward(npc);
    this.hud.log(text, 'npc', `${npc.name} (${npc.title})`);
  }

  handleTap(p) {
    if (this.player.dead) return;
    const actor = this.gfx.pickActor(p.x, p.y);
    const drop = actor ? null : this.gfx.pickDrop(p.x, p.y);
    this.holdMove = !actor && !drop;
    const pl = this.player;
    if (actor && actor.isMonster) { pl.pendingSkill = null; this.setTarget(actor); this.auto.manualTarget(actor); return; }
    if (actor && actor.isRemote && this.arena && this.arena.inMatch) {   // v0.78 สนามประลอง: แตะศัตรู = เลือกเป้า
      this.holdMove = false;
      const px = this.arena.proxyFor(actor);
      if (px) { pl.pendingSkill = null; this.setTarget(px); }
      return;
    }
    if (actor && actor.isRemote) { this.holdMove = false; this.playerMenu.open(actor, p); return; }   // v0.38
    if (pl.cast) this.cancelCast();
    pl.pendingSkill = null;
    if (actor) { this.auto.manual(); return this.approachNpc(actor); }
    if (drop) { this.auto.manual(); return this.approachDrop(drop); }
    const w = this.gfx.pickGround(p.x, p.y);
    if (w) { this.clearTarget(); this.moveTo(w.x, w.y, true); this.auto.manual(); }
  }

  /* ---------- การต่อสู้ ---------- */

  // engage = เดินเข้าไปตีอัตโนมัติ (สกิลระยะไกลจะเลือกเป้าโดยไม่วิ่งเข้าไปตี)
  setTarget(mob, engage = true) {
    const pl = this.player;
    pl.target = mob; pl.engage = engage; pl.pendingTalk = null; pl.repath = 0;
    this.gfx.setTarget(mob); this.gfx.hideMarker();
    this.hud.setTarget(mob);
  }

  clearTarget() {
    this.player.target = null;
    this.player.engage = false;
    this.gfx.setTarget(null);
    this.hud.setTarget(null);
  }

  // เลือกมอนที่ใกล้ที่สุด (ให้ความสำคัญกับตัวที่กำลังตีเราอยู่)
  targetNearest() {
    if (this.player.dead) return;
    if (!this.mobs) { this.pickupNearest(); return; }
    const best = this.nearestMonster(12 * TILE);
    if (best) this.setTarget(best);
    else if (!this.pickupNearest()) this.hud.log('ไม่มีมอนสเตอร์อยู่ใกล้ ๆ', 'info');
  }

  // มอนที่ใกล้ที่สุดในระยะ (ให้ความสำคัญกับตัวที่กำลังตีเราอยู่)
  nearestMonster(range) {
    if (!this.mobs) return null;
    const pl = this.player;
    let best = null, bestScore = Infinity;
    for (const m of this.mobs.list) {
      if (m.dead) continue;
      const d = Math.hypot(m.x - pl.x, m.y - pl.y);
      if (d > range) continue;
      const score = d - (m.target === pl ? 6 * TILE : 0);
      if (score < bestScore) { bestScore = score; best = m; }
    }
    return best;
  }

  updatePlayerCombat(dt) {
    const pl = this.player;
    pl.attackCd -= dt;
    if (pl.lockUntil > this.time) return;   // กำลังทำท่าสกิลอยู่
    if (pl.cast) { this.updateCast(dt); return; }
    if (pl.pendingSkill) { this.updatePendingSkill(dt); return; }
    const t = pl.target;
    if (!t) return;
    if (t.dead) { this.clearTarget(); return; }
    if (!pl.engage) return;
    const d = Math.hypot(t.x - pl.x, t.y - pl.y);
    if (d > pl.attackRange) {
      pl.repath = (pl.repath || 0) - dt;
      if (pl.repath <= 0 || !pl.path.length) { this.moveTo(t.x, t.y, false); pl.repath = 0.3; }
    } else {
      pl.path = [];
      pl.faceToward(t);
      if (pl.attackCd <= 0) {
        pl.attackCd = pl.aspd;
        this.wearGear('attack');   // v0.89 อาวุธสึก
        const r = rollAttack(pl.stats, t.stats);
        if (pl.weaponType === 'bow') {
          // ธนู: ยิงลูกธนูโค้งไปหาเป้า ดาเมจเข้าตอนลูกธนูถึง
          this.gfx.playAttack(pl, 'shoot');
          this.sfx('shoot');
          const dur = clamp(d / (TILE * 14), 0.12, 0.4);
          this.schedule(0.12, () => { if (!t.dead) this.gfx.projectile(pl, t, { kind: 'arrow', dur, arc: 0.18 }); });
          this.schedule(0.12 + dur, () => this.hitMonster(t, r));
        } else {
          this.gfx.playAttack(pl);
          this.sfx('swing');
          this.schedule(0.15, () => this.hitMonster(t, r));
        }
      }
    }
  }

  hitMonster(m, r) { this.damageMonster(m, r, { basic: true }); }

  damageMonster(m, r, opts = {}) {
    const magic = !!opts.magic;
    if (m.dead) return;
    WeaponFx.outgoing(this, m, r, opts);
    if (m.worldRun && !r.miss) { this.events.hit(m, r, magic); return; }
    if (r.miss) { this.gfx.floatText(m, 'Miss', 'miss'); this.sfx('miss'); return; }
    if (m.arenaProxy) {   // v0.78 สนามประลอง: ศัตรูเป็นผู้เล่นจริง — เลือดอยู่ที่เซิร์ฟเวอร์ (หักในเครื่องไว้ก่อน ไม่ให้ตายเอง)
      if (!this.arena || !this.arena.live) { this.gfx.floatText(m, 'ยังไม่เริ่ม', 'miss'); return; }
      const amt = this.arena.scale(r.amount), rp = this.arena.remoteOf(m.name) || m;
      m.hp = Math.max(1, m.hp - amt);
      this.sfx(r.crit ? 'crit' : 'hit');
      this.gfx.floatText(rp, r.crit ? `${amt}!` : `${amt}`, r.crit ? 'crit' : magic ? 'hit magic' : 'hit');
      this.gfx.playHurt(rp);
      WeaponFx.afterHit(this, m, { ...r, amount: amt }, opts);
      this.arena.hit(m, amt);
      return;
    }
    if (m.pdRun && this.pd) {   // v0.75 ดันเจี้ยนปาร์ตี้: เลือดกลางที่เซิร์ฟเวอร์ (หักในเครื่องไว้ก่อน ไม่ให้ตายเอง)
      m.hp = Math.max(1, m.hp - r.amount);
      this.sfx(r.crit ? 'crit' : 'hit');
      this.gfx.floatText(m, r.crit ? `${r.amount}!` : `${r.amount}`, r.crit ? 'crit' : magic ? 'hit magic' : 'hit');
      this.gfx.playHurt(m);
      WeaponFx.afterHit(this, m, r, opts);
      this.pd.hit(m, r.amount);
      if (!m.target) this.mobs.aggro(m, this.player);
      return;
    }
    if (m.shared && this.mvp && this.mvp.on) {   // v0.53 MVP ร่วม: หักเลือดในเครื่องไว้ก่อน (ไม่ให้ตายเอง) แล้วส่งดาเมจให้เซิร์ฟเวอร์ตัดสิน
      m.hp = Math.max(1, m.hp - r.amount);
      this.sfx(r.crit ? 'crit' : 'hit');
      this.gfx.floatText(m, r.crit ? `${r.amount}!` : `${r.amount}`, r.crit ? 'crit' : magic ? 'hit magic' : 'hit');
      this.gfx.playHurt(m);
      WeaponFx.afterHit(this, m, r, opts);
      this.mvp.hit(m, r.amount);
      const B = m.data.boss;
      if (B) { const frac = m.hp / m.maxHp; while (B.summon && m.summonDone < B.summon.at.length && frac <= B.summon.at[m.summonDone]) { m.summonDone++; this.bossSummon(m); } }
      if (!m.target) this.mobs.aggro(m, this.player);
      return;
    }
    m.hp -= r.amount;
    this.sfx(r.crit ? 'crit' : 'hit');
    this.gfx.floatText(m, r.crit ? `${r.amount}!` : `${r.amount}`, r.crit ? 'crit' : magic ? 'hit magic' : 'hit');
    this.gfx.playHurt(m);
    WeaponFx.afterHit(this, m, r, opts);
    if (m.hp <= 0) return this.killMonster(m);
    const B = m.data.boss;
    if (B) {
      const frac = m.hp / m.maxHp;
      while (B.summon && m.summonDone < B.summon.at.length && frac <= B.summon.at[m.summonDone]) { m.summonDone++; this.bossSummon(m); }
      if (B.enrage && !m.enraged && frac <= B.enrage) {
        m.enraged = true; m.attackDelay = m.data.attackDelay * 0.65;
        this.gfx.emote(m, '💢'); this.gfx.shake(0.3);
        this.hud.log(`${m.name} โกรธจัด! โจมตีเร็วขึ้น`, 'sys');
      }
    }
    if (!m.target) { this.mobs.aggro(m, this.player); this.gfx.emote(m, '!'); } // โดนตีแล้วสู้กลับ
  }

  // opt (v0.53 MVP ร่วม): { shared, expMul, dropMul, mvpTop, noReward }
  killMonster(m, opt = {}) {
    this.mobs.kill(m, this.time);
    if (opt.shared) m.respawnAt = Infinity;   // เซิร์ฟเวอร์เป็นคนสั่งเกิดใหม่
    WeaponFx.onKill(this);
    this.gfx.playDeath(m);
    this.sfx('monsterDie');
    if (this.player.target === m) this.clearTarget();
    if (opt.noReward) return;
    this.reward(m, opt);
    if (this.daily && !m.summoned) {   // v0.74 ภารกิจรายวัน
      if (m.data.mvp) { if (!m.data.worldBoss) this.daily.bump('mvp'); }
      else if (!m.noBook) {
        this.daily.bump('hunt'); this.daily.bump('huntMap', (t) => this.map && t.map === this.map.id); this.daily.bump('killMob', (t) => t.mob === m.type);
        if (this.social && this.social.pid) this.daily.bump('party');
      }
    }
    if (this.player.bonus && this.player.bonus.spKill && !this.player.dead) this.player.sp = Math.min(this.player.maxSp, this.player.sp + this.player.bonus.spKill);   // v0.29 การ์ดแคปปลิง
    // v0.13: ใบคูณดรอป/การ์ด + สัตว์เลี้ยง (อบิส/โนวา/เทียนหยุน) · ไอเทมใช้งานและไข่สัตว์เลี้ยงดรอปจากมอนทุกตัว
    const pl = this.player, dm = pl.itemBuffMul('drop') * this.pets.dropMul() * (this.events?.rate('drop') || 1) * (1 + ((pl.bonus && pl.bonus.dropPct) || 0) / 100) * this.vipMul() * (opt.dropMul ?? 1), cm = pl.itemBuffMul('card') * this.pets.cardMul() * (this.events?.rate('drop') || 1);
    const scale = (list, k) => (k === 1 ? list : list.map(([id, c]) => [id, Math.min(1,c * k)]));
    // v0.38: มอนธรรมดาไม่ได้ดรอปของทุกตัว — ลุ้นก่อนว่าตัวนี้จะดรอปไหม (40% · ใบคูณดรอป/อีเวนต์เพิ่มโอกาส) · บอส/MVP/บอสดันเจี้ยนดรอปเสมอ · การ์ดกับกล่องแฟชั่นลุ้นแยกตามเดิม
    const bossy = !!(m.data.mvp || m.data.boss || m.data.dgBoss || m.data.worldBoss || m.worldRun);
    const lucky = bossy || Math.random() < Math.min(1, DROP_GATE * dm);
    const items = rollDrops([...(lucky ? scale(m.data.drops, dm) : []), ...scale(stoneDrops(m.data), dm), ...(m.noCard || (m.data.mvp && opt.mvpTop === false) ? [] : scale(cardDrops(m.type), m.data.mvp ? Math.min(2, cm) : cm)), ...(lucky ? scale(consumableDrops(m.data), dm) : [])]);   // v0.9 กล่องแฟชั่น · v0.10 การ์ด
    if (this.pets.meteorChance() && Math.random() < this.pets.meteorChance() && m.data.drops.length) {
      const dl = m.data.drops, tot = dl.reduce((a, d) => a + d[1], 0); let rr = Math.random() * tot, extra = dl[0][0]; for (const [id, c] of dl) { rr -= c; if (rr <= 0) { extra = id; break; } }   // v0.72 ดาวตกสุ่มตามโอกาสดรอป (ของหายากยังหายาก)
      this.gfx.meteorFall(m.x, m.y);
      this.schedule(0.55, () => { this.spawnDrop(extra, m.x, m.y); this.gfx.floatText({ x: m.x, y: m.y }, 'ดาวตก!', 'loot r-rare', { h: 1.6, life: 1.6, rise: 0.6, drift: false }); });
    }
    this.questEvents(this.questLog.onKill(m.type));
    if (!m.noBook) this.collection.onKill(m.type);   // v0.18: สมุดมอนสเตอร์ · ความสำเร็จ (บอสดันเจี้ยนไม่นับเป็น MVP)
    this.dungeon.onKill(m);   // v0.32
    items.forEach((id, i) => this.schedule(0.2 + i * 0.12, () => this.spawnDrop(id, m.x, m.y)));
    if (m.summoned) this.schedule(1.0, () => { if (this.mobs) this.mobs.remove(m); this.gfx.removeActor(m); });
    if (m.data.mvp && opt.mvpTop !== false) this.mvpKill(m);
  }

  /* ---------- ไอเทมบนพื้น ---------- */

  spawnDrop(id, x, y) {
    let tx = x, ty = y;
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 12;
      const nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
      if (!this.map.isSolidTile(Math.floor(nx / TILE), Math.floor(ny / TILE))) { tx = nx; ty = ny; break; }
    }
    const drop = { uid: this.dropUid++, id, x: tx, y: ty, expireAt: this.time + 90, blink: false };
    // v0.24.1: ของที่เพิ่งตก (ไว้เลือก "ไม่เก็บ" ในตั้งค่าสัตว์เลี้ยง)
    const sd = this.seenDrops || (this.seenDrops = new Map()), bid = String(id).split('*')[0];
    sd.delete(bid); sd.set(bid, 1); if (sd.size > 30) sd.delete(sd.keys().next().value);
    this.drops.push(drop);
    this.gfx.addDrop(drop, x, y);
    const it = ITEMS[id];
    if (it.type === 'box') {
      // กล่องแฟชั่น: ประกาศในแชต + กล่องทองคำมีแสงพุ่งและจอสั่นเล็กน้อย
      this.hud.log(`🎁 ${it.name} ตกลงบนพื้น!${it.tier >= 3 ? ' ✦✦✦' : it.tier >= 2 ? ' ✦' : ''}`, 'r-' + it.rarity);
      if (it.tier >= 2) this.gfx.bursts.spawn(tx / TILE, 0.6, ty / TILE, it.tier >= 3 ? '#ffd36b' : '#9ad0ff', 16 + it.tier * 8, 1.2, 2.2);
      if (it.tier >= 3) { this.gfx.shake(0.18); this.gfx.floatText({ x: tx, y: ty }, 'GOLD BOX!', 'loot r-epic', { h: 1.4, life: 2.0, rise: 0.8, drift: false }); }
    } else if (it.type === 'card') {
      // การ์ดมอนสเตอร์หายากมาก: ประกาศ + ประกายแสง
      this.hud.log(`🃏 ${it.name} ตกลงบนพื้น!! (หายากมาก)`, 'r-epic');
      this.gfx.bursts.spawn(tx / TILE, 0.6, ty / TILE, '#ffe9a0', 30, 1.4, 2.6);
      this.gfx.floatText({ x: tx, y: ty }, 'CARD!', 'loot r-epic', { h: 1.4, life: 2.2, rise: 0.8, drift: false });
      this.gfx.shake(0.15);
    } else if (it.rarity === 'rare' || it.rarity === 'epic') this.hud.log(`✦ ${it.name} ตกลงบนพื้น!`, 'r-' + it.rarity);
    return drop;
  }

  approachDrop(drop) {
    const pl = this.player;
    this.clearTarget();
    pl.pendingPickup = drop;
    if (Math.hypot(pl.x - drop.x, pl.y - drop.y) < 20) { pl.path = []; return; }
    this.moveTo(drop.x, drop.y, false);
  }

  pickupNearest() {
    const pl = this.player;
    let best = null, bd = 4 * TILE;
    for (const d of this.drops) { const dd = Math.hypot(d.x - pl.x, d.y - pl.y); if (dd < bd) { bd = dd; best = d; } }
    if (best) this.approachDrop(best);
    return !!best;
  }

  pickup(drop) {
    const pl = this.player, it = ITEMS[drop.id];
    if (!pl.inventory.canAdd(drop.id)) { this.hud.log('กระเป๋าเต็ม เก็บไอเทมไม่ได้', 'sys'); return; }
    pl.inventory.add(drop.id, 1);
    this.daily && this.daily.bump('pickup');   // v0.74
    this.sfx(it.type === 'card' || it.type === 'box' ? 'coin' : 'pickup');
    this.drops = this.drops.filter((d) => d !== drop);
    this.gfx.removeDrop(drop);
    this.gfx.floatText(pl, `+ ${it.name}`, 'loot r-' + (it.rarity || 'common'), { h: 2.0, life: 1.4, rise: 0.6, drift: false });
    this.hud.log(`ได้รับ ${it.name} x1`, 'r-' + (it.rarity || 'common'));
    if (it.type === 'card' && this.cardModal) this.cardModal.show(drop.id, { mode: 'reveal' });   // v0.29: เปิดการ์ดใบใหญ่ตอนเก็บได้
    this.refreshItemsUI();
    this.dirty = true;
  }

  dropFromBag(id) {
    const pl = this.player;
    if (pl.inventory.remove(id, 1) <= 0) return;
    this.spawnDrop(id, pl.x, pl.y);
    this.hud.log(`ทิ้ง ${ITEMS[id].name} x1 ลงพื้น`, 'info');
    this.refreshItemsUI();
    this.dirty = true;
  }

  /* ---------- ใช้ไอเทม / สวมใส่ ---------- */

  useItem(id) {
    const pl = this.player, it = ITEMS[id];
    if (!it || (pl.dead && !(it.use && it.use.revive))) return;
    if (this.arena && this.arena.inMatch) { this.hud.log('ในสนามประลองใช้ไอเทมหรือเปลี่ยนอุปกรณ์ไม่ได้', 'sys'); return; }   // v0.78
    if (it.type === 'equip') return this.equipItem(id);
    if (it.type === 'box') return this.openBox(id, 1);
    if (it.type !== 'usable') return;
    if (it.use) return useConsumable(this, id);   // v0.13: ไอเทมใช้งานชุดใหม่
    if (pl.inventory.count(id) <= 0) { this.hud.log(`${it.name} หมดแล้ว`, 'sys'); return; }
    if (this.useCd > 0) return;
    const needHp = it.heal.hp && pl.hp < pl.maxHp, needSp = it.heal.sp && pl.sp < pl.maxSp;
    if (!needHp && !needSp) { this.hud.log(it.heal.hp ? 'HP เต็มอยู่แล้ว' : 'SP เต็มอยู่แล้ว', 'info'); return; }
    const r = pl.useItem(id);
    if (!r) return;
    this.useCd = 0.35;
    this.sfx('heal');
    if (r.hp) this.gfx.floatText(pl, `+${r.hp}`, 'heal', { h: 1.6, drift: false });
    if (r.sp) this.gfx.floatText(pl, `+${r.sp}`, 'heal-sp', { h: 1.35, drift: false });
    this.gfx.bursts.spawn(pl.x / TILE, 0.8, pl.y / TILE, r.hp ? '#7aff8a' : '#7fc4ff', 12, 0.8, 1.6);
    this.hud.setPlayer(pl);
    this.refreshItemsUI();
    this.status.render();
    this.dirty = true;
  }

  equipItem(id) {
    if (this.arena && this.arena.inMatch) { this.hud.log('ในสนามประลองเปลี่ยนอุปกรณ์ไม่ได้', 'sys'); return; }   // v0.78
    const pl = this.player;
    const err = pl.equipItem(id);
    if (err) { this.hud.log(err, 'sys'); return; }
    this.hud.log(`สวมใส่ ${ITEMS[id].name}`, 'info');
    this.afterEquip();
  }

  unequipSlot(slot) {
    if (this.arena && this.arena.inMatch) { this.hud.log('ในสนามประลองเปลี่ยนอุปกรณ์ไม่ได้', 'sys'); return; }   // v0.78
    const pl = this.player, id = pl.equip[slot];
    const err = pl.unequip(slot);
    if (err) { this.hud.log(err, 'sys'); return; }
    this.hud.log(`ถอด ${ITEMS[id].name}`, 'info');
    this.afterEquip();
  }

  afterEquip() {
    this.sfx('equip');
    this.gfx.refreshLook(this.player);
    this.hud.setPlayer(this.player);
    this.status.render();
    this.refreshItemsUI();
    this.ward.render();     // อาวุธแฟชั่นแสดง/ซ่อนตามประเภทอาวุธที่ถือ
    this.dirty = true;
  }

  /* ---------- กล่องแฟชั่น + ตู้แฟชั่น (v0.9) ---------- */

  // เปิดกล่อง n ใบ (สูงสุด 10) → สุ่มชิ้นแฟชั่น · ได้ซ้ำแปลงเป็น Zeny · บันทึกทันทีก่อนเล่นแอนิเมชัน
  openBox(boxId, n = 1) {
    const pl = this.player, box = ITEMS[boxId];
    if (!box || box.type !== 'box') return;
    if (pl.dead) { this.hud.log('เปิดกล่องไม่ได้ขณะหมดสติ', 'sys'); return; }
    n = Math.max(1, Math.min(10, Math.floor(n), pl.inventory.count(boxId)));
    if (pl.inventory.count(boxId) <= 0) { this.hud.log(`${box.name} หมดแล้ว`, 'sys'); return; }
    pl.inventory.remove(boxId, n);
    const results = [];
    let zeny = 0;
    for (let i = 0; i < n; i++) {
      let { tier, item } = rollBox(boxId);
      // v0.13: กิเลนเมฆาสวรรค์ — มีโอกาสได้ของระดับสูงขึ้น 1 ขั้น
      const up = this.pets.boxUpChance(), ti = FASHION_TIERS.indexOf(tier);
      if (up && ti < FASHION_TIERS.length - 1 && Math.random() < up) { const it2 = pickOfTier(FASHION_TIERS[ti + 1]); if (it2) { tier = FASHION_TIERS[ti + 1]; item = it2; this.hud.log(`✨ โชคลาภสวรรค์! กล่องอัปเป็นระดับ ${FASHION_RARITY[tier].name}`, 'f-' + tier); } }
      const isNew = pl.addFashion(item.id);
      const z = isNew ? 0 : DUP_ZENY[tier];
      zeny += z;
      results.push({ item, tier, isNew, zeny: z });
    }
    pl.fashion.opened += n;
    if (zeny) pl.addZeny(zeny);
    for (const r of results) {
      const R = FASHION_RARITY[r.tier];
      this.hud.log(`🎁 เปิด${box.name}: ได้ ${r.item.name} [${R.name}]${r.isNew ? ' — ชิ้นใหม่!' : ` — ซ้ำ แปลงเป็น ${fmtZ(r.zeny)}`}`, 'f-' + r.tier);
    }
    const best = results.reduce((b, r) => (TIER_RANK[r.tier] > TIER_RANK[b.tier] ? r : b), results[0]);
    if (!this.fashionBest || TIER_RANK[best.tier] > TIER_RANK[this.fashionBest.tier]) this.fashionBest = best;
    this.closeServices();
    this.gacha.show(boxId, results, pl.inventory.count(boxId), { weaponFits: (it) => pl.fashionFits(it) });
    this.hud.setPlayer(pl);
    this.refreshItemsUI();
    this.ward.render();
    this.saveNow(false);
  }

  // ปิดหน้าต่างเปิดกล่อง: ได้ระดับตำนานขึ้นไป → ฉลองบนตัวละคร + ประกาศ
  celebrateFashion() {
    const b = this.fashionBest; this.fashionBest = null;
    if (!b || TIER_RANK[b.tier] < 4) return;
    const pl = this.player, R = FASHION_RARITY[b.tier];
    if (TIER_RANK[b.tier] >= 5) {
      this.gfx.mvpFx(pl);
      this.hud.levelBanner(`${R.name}!`, `ได้รับ ${b.item.name}`);
      this.hud.log(`📢 ประกาศ! ${pl.name} เปิดกล่องได้แฟชั่นระดับ ${R.name} — ${b.item.name}!`, 'f-' + b.tier);
    } else {
      this.gfx.bursts.spawn(pl.x / TILE, 1.2, pl.y / TILE, R.color, 26, 1.4, 2.4);
    }
    this.gfx.floatText(pl, R.name + '!', 'loot f-' + b.tier, { h: 2.4, life: 2.2, rise: 0.7, drift: false });
  }

  /* ---------- เควส (v0.10) ---------- */

  toggleQuests(force) {
    this.questWin.toggle(force);
    if (this.questWin.open) { this.status.toggle(false); this.skillWin.toggle(false); }
  }

  // ความคืบหน้าเควสเปลี่ยน → แจ้งในแชต
  questEvents(list) {
    for (const e of list || []) this.hud.log(`📜 ${QUESTS[e.id].name}: ${e.text} ${e.cur}/${e.n}`, 'quest');
    if (list && list.length) this.dirty = true;
    this.refreshQuestUI();
  }

  // อัปเดตเครื่องหมายเหนือหัว NPC + แถบติดตาม + แจ้งเมื่อเควสทำครบ
  refreshQuestUI() {
    const L = this.questLog;
    for (const n of this.npcs || []) n.questMark = L.markFor(n.id);
    const ready = new Set(L.activeIds().filter((id) => L.status(id) === 'ready'));
    for (const id of ready) if (!this.readyQuests.has(id) && this.started) {
      this.hud.log(`✔ เควส "${QUESTS[id].name}" ครบแล้ว! กลับไปส่งที่ ${npcWhere(QUESTS[id].turnIn)}`, 'quest-ok');
      this.gfx.floatText(this.player, 'QUEST CLEAR!', 'loot quest', { h: 2.3, life: 1.8, rise: 0.6, drift: false });
    }
    this.readyQuests = ready;
    this.questWin.render();
  }

  // เมนูคุยกับ NPC ที่มีเควส: ส่งเควส / รับเควสใหม่ / ดูความคืบหน้า / บริการเดิมของ NPC
  questMenu(npc, text) {
    const pl = this.player, L = this.questLog, f = L.forNpc(npc.id);
    this.closeServices();
    this.activeNpc = npc;
    pl.faceToward(npc); npc.faceToward(pl);
    const bye = { label: 'ไว้คราวหลัง', cls: 'ghost', onSelect: () => this.endService() };
    const opts = [
      ...f.ready.map((id) => ({ label: `✔ ส่งเควส: ${QUESTS[id].name}`, sub: L.kindName(id), cls: 'q-opt ready', keepOpen: true, onSelect: () => this.questTurnInDialog(npc, id) })),
      ...f.available.map((id) => ({ label: `❗ เควสใหม่: ${QUESTS[id].name}`, sub: L.kindName(id), cls: 'q-opt new', keepOpen: true, onSelect: () => this.questOffer(npc, id) })),
      ...f.active.map((id) => ({ label: `… ${QUESTS[id].name}`, sub: L.progress(id).map((g) => `${g.text} ${g.cur}/${g.n}`).join(' · '), keepOpen: true, onSelect: () => this.questMenu(npc, `${QUESTS[id].wait || QUESTS[id].intro}`) })),
    ];
    if (npc.service) opts.push({ label: npc.service.type === 'shop' ? 'ซื้อขาย / บริการ' : npc.service.type === 'storage' ? 'คลังเก็บของ' : npc.service.type === 'warp' ? 'วาร์ป' : npc.service.type === 'job' ? 'เปลี่ยน / เลื่อนขั้นอาชีพ' : 'บริการ', onSelect: () => this.openService(npc) });
    else opts.push({ label: 'คุยเล่น', keepOpen: true, onSelect: () => this.questMenu(npc, npc.talk(pl)) });
    opts.push(bye);
    const t = text || (f.ready.length ? 'เจ้ากลับมาแล้ว! เป็นยังไงบ้าง?' : f.available.length ? (npc.greet || npc.lines[0]) : (npc.greet || npc.lines[0]));
    this.dialog.show(npc, t, opts);
  }

  questOffer(npc, id) {
    const q = QUESTS[id];
    const goals = q.goals.map((g) => `• ${goalText(g)}${g.n > 1 ? ` ${g.n} ${g.type === 'collect' ? 'ชิ้น' : g.type === 'kill' ? 'ตัว' : 'ครั้ง'}` : ''}`).join('\n');
    const text = `${q.intro}\n\nเป้าหมาย\n${goals}\n\nรางวัล: ${rewardText(q.rewards).join(' · ')}${q.give ? `\nได้รับทันที: ${q.give.map(([i, n]) => `${ITEMS[i].name} x${n}`).join(', ')}` : ''}${q.turnIn !== q.giver ? `\nส่งเควสที่: ${npcWhere(q.turnIn)}` : ''}`;
    this.dialog.show(npc, text, [
      { label: 'รับเควส', cls: 'q-opt new', onSelect: () => this.acceptQuest(npc, id) },
      { label: 'ไว้ก่อน', cls: 'ghost', keepOpen: true, onSelect: () => this.questMenu(npc) },
    ]);
  }

  acceptQuest(npc, id) {
    const res = this.questLog.accept(id);
    if (res.error) { this.hud.log(res.error, 'sys'); this.endService(); return; }
    const q = QUESTS[id];
    this.hud.log(`📜 รับเควส "${q.name}"`, 'quest-ok');
    this.sfx('questAccept');
    for (const [i, n] of q.give || []) this.hud.log(`ได้รับ ${ITEMS[i].name} x${n}`, 'r-' + (ITEMS[i].rarity || 'common'));
    npc.bubble = { text: 'ฝากด้วยนะ!', t: 2.5 };
    this.endService();
    this.refreshItemsUI();
    this.dirty = true;
  }

  questTurnInDialog(npc, id) {
    const q = QUESTS[id];
    this.dialog.show(npc, `${q.done}\n\nรางวัล: ${rewardText(q.rewards).join(' · ')}`, [
      { label: 'รับรางวัล', cls: 'q-opt ready', onSelect: () => this.turnInQuest(npc, id) },
      { label: 'ไว้ก่อน', cls: 'ghost', keepOpen: true, onSelect: () => this.questMenu(npc) },
    ]);
  }

  turnInQuest(npc, id) {
    const pl = this.player, q = QUESTS[id];
    const res = this.questLog.turnIn(id);
    if (res.error) { this.hud.log(res.error, 'sys'); this.endService(); return; }
    const r = res.rewards;
    this.collection.onQuest();   // v0.18
    this.hud.levelBanner('เควสสำเร็จ!', q.name);
    this.sfx('questDone');
    this.hud.log(`🏆 เควส "${q.name}" สำเร็จ! รางวัล: ${rewardText(r).join(' · ')}`, 'quest-ok');
    this.gfx.bursts.spawn(pl.x / TILE, 1.2, pl.y / TILE, '#ffd36b', 30, 1.4, 2.6);
    if (r.zeny) pl.addZeny(r.zeny);
    for (const [i, n] of r.items || []) {
      const got = pl.inventory.add(i, n);
      if (got < n) { for (let k = 0; k < Math.min(10, n - got); k++) this.spawnDrop(i, pl.x, pl.y); this.hud.log(`กระเป๋าเต็ม — ${ITEMS[i].name} วางไว้ที่พื้นข้างตัว`, 'sys'); }
    }
    if (r.exp && (r.exp[0] || r.exp[1])) this.applyExp(r.exp[0], r.exp[1]);
    npc.bubble = { text: 'ขอบใจมาก!', t: 2.5 };
    this.endService();
    this.hud.setPlayer(pl);
    this.refreshItemsUI();
    this.saveNow(false);
  }

  // v0.74 ภารกิจรายวัน: รับรางวัล (i = ลำดับภารกิจ · -1 = กล่องทำครบ) / เปลี่ยนภารกิจ
  claimDaily(i) {
    const pl = this.player, res = i < 0 ? this.daily.claimBonus() : this.daily.claim(i);
    if (res.error) { this.hud.log(res.error, 'sys'); return; }
    const r = res.rewards;
    if (r.zeny) pl.addZeny(r.zeny);
    for (const [id, n] of r.items || []) {
      const got = pl.inventory.add(id, n);
      if (got < n) { for (let k = 0; k < Math.min(10, n - got); k++) this.spawnDrop(id, pl.x, pl.y); this.hud.log(`กระเป๋าเต็ม — ${ITEMS[id].name} วางไว้ที่พื้นข้างตัว`, 'sys'); }
    }
    if (r.exp && (r.exp[0] || r.exp[1])) this.applyExp(r.exp[0], r.exp[1]);
    this.sfx('questDone');
    this.gfx.bursts.spawn(pl.x / TILE, 1.2, pl.y / TILE, i < 0 ? '#ffb347' : '#ffd36b', i < 0 ? 40 : 20, 1.4, 2.6);
    if (i < 0) this.hud.levelBanner(res.big ? 'กล่องใหญ่!' : 'ภารกิจรายวันครบ!', res.big ? `ทำครบต่อเนื่อง ${pl.daily.streak} วัน` : 'เปิดกล่องรางวัลแล้ว');
    this.hud.log(`📜 รับรางวัลภารกิจรายวัน: ${rewardText(r).join(' · ')}`, 'quest-ok');
    this.hud.setPlayer(pl); this.refreshItemsUI(); this.updateDailyBadge(); this.saveNow(false);
  }
  // v0.77 หลอมอุปกรณ์นิรันดร์กาล (ยืนยันก่อน เพราะล้มเหลวเสียวัตถุดิบ)
  forgeEternal(line, slot, luck) {
    const pl = this.player;
    {
      const out = ITEMS[eternalId(line, slot)];
      this.dialog.show({ name: 'การ์ธ', title: 'ช่างตีเหล็ก' }, `หลอม "${out.name}" ใช่ไหม?\nถ้าล้มเหลว วัตถุดิบและ Zeny ทั้งหมดจะหายไป (อุปกรณ์ฐานยังอยู่)\nถ้าสำเร็จ อุปกรณ์เทพสวรรค์ที่เป็นฐานจะถูกใช้ไป`, [
        { label: 'หลอมเลย', onSelect: () => {
          const r = doForge(pl, line, slot, luck);
          if (r.error) { this.hud.log(r.error, 'sys'); this.eternalWin.render(); return; }
          if (r.ok) {
            this.hud.levelBanner('หลอมสำเร็จ!', out.name);
            this.hud.log(`✦ หลอมสำเร็จ! ได้รับ ${out.name} (โอกาส ${Math.round(r.rate * 100)}%)`, 'r-eternal');
            this.gfx.bursts.spawn(pl.x / TILE, 1.2, pl.y / TILE, '#ffd8ff', 70, 2.2, 3.2); this.gfx.shake(0.35);
            this.gfx.floatText(pl, out.name, 'loot r-eternal', { h: 2.6, life: 3, rise: 0.8, drift: false });
            this.sfx('mvp', { gap: 0 });
            if (this.mode === 'online' && this.social && this.social.sendWorld) this.social.sendWorld(`✦ หลอม ${out.name} สำเร็จ!`);
          } else {
            this.hud.levelBanner('หลอมล้มเหลว...', 'วัตถุดิบสลายไปกับเปลวไฟ');
            this.hud.log(`💥 หลอม ${out.name} ล้มเหลว — เสียวัตถุดิบและ Zeny (อุปกรณ์ฐานยังอยู่)`, 'sys');
            this.gfx.shake(0.3); this.sfx('refineBreak', { gap: 0 });
          }
          this.collection?.evaluate?.();
          this.refreshItemsUI(); this.hud.setPlayer(pl); this.saveNow(false); this.eternalWin.render();
        } },
        { label: 'ยกเลิก', cls: 'ghost', onSelect: () => {} },
      ]);
    }
  }

  // v0.76 ส่งชั้นหอคอยเข้าอันดับฤดูกาล (ส่งเฉพาะชั้นที่สูงกว่าที่เคยส่งในรอบเล่นนี้)
  seasonTower(floor) {
    if (this.mode !== 'online' || !this.online || !this.online.seasonRPC || floor <= (this.seasonTowerSent || 0)) return;
    this.seasonTowerSent = floor;
    this.online.seasonRPC('season_tower', { p_floor: Math.floor(floor) }).catch(() => { this.seasonTowerSent = 0; });
  }
  rerollDaily(i) { const res = this.daily.reroll(i); this.hud.log(res.error || '↻ เปลี่ยนภารกิจแล้ว', res.error ? 'sys' : 'info'); if (res.ok) this.saveNow(false); }
  updateDailyBadge() {
    const b = this.root.querySelector('#dailyBadge'); if (!b || !this.started) return;
    const n = this.daily.claimable(); b.hidden = !n; b.textContent = String(n);
  }

  abandonQuest(id) {
    if (!this.questLog.abandon(id)) return;
    this.hud.log(`ยกเลิกเควส "${QUESTS[id].name}" แล้ว (รับใหม่ได้ที่ ${npcWhere(QUESTS[id].giver)})`, 'sys');
    this.refreshQuestUI();
    this.dirty = true;
  }

  /* ---------- ตีบวก + การ์ด (v0.10) ---------- */

  openRefine() {
    this.status.toggle(false); this.skillWin.toggle(false); this.ward.toggle(false); this.questWin.toggle(false);
    this.refineWin.show();
  }

  refineItem(ref, guard, luck) {
    const pl = this.player;
    const res = doRefine(pl, ref, guard, Math.random, luck, this.pets.refineUp());
    if (res.error) { this.hud.log(res.error, 'sys'); return res; }
    this.daily && this.daily.bump('refine');   // v0.74
    const name = ITEMS[res.newKey || res.oldKey] ? (res.newKey ? ITEMS[res.newKey].name : ITEMS[res.oldKey].name) : '';
    this.sfx(res.result === 'success' ? 'refineOk' : res.result === 'break' ? 'refineBreak' : 'refineFail', { gap: 0 });
    if (res.result === 'success') {
      this.hud.log(`🔨 ตีบวกสำเร็จ! ${name}`, res.to >= 7 ? 'r-epic' : 'r-rare');
      this.gfx.bursts.spawn(pl.x / TILE, 1.0, pl.y / TILE, '#ffd36b', 18 + res.to * 3, 1.2, 2.2);
      this.gfx.floatText(pl, `+${res.to} SUCCESS!`, 'loot refine-ok', { h: 2.2, life: 1.6, rise: 0.6, drift: false });
      this.questEvents(this.questLog.onRefine());
    } else if (res.result === 'break') {
      this.hud.log(`💥 ตีบวกล้มเหลว... ${ITEMS[res.oldKey].name} แตกละเอียด!`, 'sys');
      this.gfx.shake(0.3);
      this.gfx.floatText(pl, 'BROKEN...', 'loot refine-bad', { h: 2.2, life: 1.8, rise: 0.5, drift: false });
    } else {
      this.hud.log(`ตีบวกล้มเหลว... ระดับลดเหลือ +${res.to}${res.guarded ? ' (คริสตัลพิทักษ์กันแตกไว้)' : ''}`, 'sys');
      this.gfx.floatText(pl, `FAIL → +${res.to}`, 'loot refine-bad', { h: 2.2, life: 1.6, rise: 0.5, drift: false });
    }
    if (ref.where === 'equip') this.gfx.refreshLook(pl);
    this.hud.setPlayer(pl);
    this.status.render();
    this.refreshItemsUI();
    this.saveNow(false);
    return res;
  }

  socketCard(cardId, ref) {
    const pl = this.player;
    const res = doSocket(pl, ref, cardId);
    if (res.error) { this.hud.log(res.error, 'sys'); return res; }
    this.hud.log(`🃏 ใส่${ITEMS[cardId].name}ใน${ITEMS[res.newKey].name}แล้ว`, 'r-rare');
    this.sfx('refineOk');
    this.gfx.bursts.spawn(pl.x / TILE, 1.0, pl.y / TILE, CARDS[cardId].color, 20, 1.0, 2.0);
    this.questEvents(this.questLog.onSocket());
    if (ref.where === 'equip') this.gfx.refreshLook(pl);
    this.hud.setPlayer(pl);
    this.status.render();
    this.refreshItemsUI();
    this.inv.select({ from: ref.where === 'equip' ? 'equip' : 'bag', id: res.newKey, slot: ref.slot });
    this.saveNow(false);
    return res;
  }

  /* ---------- v0.89 ความทนทาน · ซ่อม · ถอดการ์ด ---------- */
  wearGear(kind) {
    const pl = this.player;
    if (!pl || (this.arena && this.arena.inMatch)) return;   // สนามประลองไม่สึก
    const r = pl.wearGear(kind);
    for (const sl of r.low) this.hud.log(`⚠ ${ITEMS[pl.equip[sl]].name} ความทนทานเหลือน้อย — ซ่อมที่ช่างตีเหล็กในเมือง`, 'sys');
    if (r.broke.length) {
      for (const sl of r.broke) this.hud.log(`💥 ${ITEMS[pl.equip[sl]].name} พังแล้ว! ไม่ให้ค่าสถานะจนกว่าจะซ่อม (ช่างตีเหล็กในเมือง${this.vipActive ? ' · หรือหน้า VIP' : ''})`, 'r-epic');
      this.sfx('refineFail');
      this.hud.setPlayer(pl); this.status.render(); this.refreshItemsUI();
      this.dirty = true;
    }
    if (kind === 'death' || r.low.length) this.dirty = true;
  }
  repairList() {
    const pl = this.player, out = [];
    for (const [sl, key] of Object.entries(pl.equip)) if (key && duraOf(pl, key) < DURA_MAX) out.push({ where: 'equip', slot: sl, key, dura: duraOf(pl, key), cost: repairCost(key, duraOf(pl, key)) });
    for (const st of pl.inventory.stacks) if (ITEMS[st.id] && ITEMS[st.id].type === 'equip' && duraOf(pl, st.id) < DURA_MAX) out.push({ where: 'bag', key: st.id, dura: duraOf(pl, st.id), cost: repairCost(st.id, duraOf(pl, st.id)) });
    return out;
  }
  repairItems(list) {
    const pl = this.player, total = list.reduce((a, r) => a + r.cost, 0);
    if (!list.length) return { error: 'ไม่มีอุปกรณ์ที่ต้องซ่อม' };
    if (!pl.spendZeny(total)) return { error: `Zeny ไม่พอ (ต้องใช้ ${fmtZ(total)})` };
    for (const r of list) pl.setDura(r.key, DURA_MAX);
    pl.afterEquipChange();
    this.hud.log(`🔧 ซ่อม${list.length > 1 ? `อุปกรณ์ ${list.length} ชิ้น` : ITEMS[list[0].key].name}แล้ว · จ่าย ${fmtZ(total)}`, 'lv');
    this.sfx('refineOk');
    this.hud.setPlayer(pl); this.status.render(); this.refreshItemsUI();
    this.saveNow(false);
    return { ok: true, total };
  }
  unsocketCard(ref, idx) {
    const pl = this.player, res = doUnsocket(pl, ref, idx);
    if (res.error) { this.hud.log(res.error, 'sys'); return res; }
    this.hud.log(`🃏 ถอด${ITEMS[res.cardId].name}ออกจาก${ITEMS[res.newKey].name}แล้ว · จ่าย ${fmtZ(res.cost)}`, 'r-rare');
    this.sfx('refineOk');
    if (ref.where === 'equip') this.gfx.refreshLook(pl);
    this.hud.setPlayer(pl); this.status.render(); this.refreshItemsUI();
    this.saveNow(false);
    return res;
  }

  /* ---------- รีเซ็ตสเตตัส (v0.10) ---------- */
  resetStats() {
    const pl = this.player, cost = this.vipActive ? 0 : statResetCost(pl.baseLevel);   // v0.89 VIP รีเซ็ตฟรี
    if (!pl.statRefund()) { this.hud.log('ยังไม่ได้อัปสเตตัสเลย ไม่ต้องรีเซ็ต', 'info'); return; }
    if (cost && !pl.spendZeny(cost)) { this.hud.log(`Zeny ไม่พอสำหรับรีเซ็ตสเตตัส (ต้องใช้ ${fmtZ(cost)})`, 'sys'); return; }
    const n = pl.resetStats();
    this.hud.log(`รีเซ็ตสเตตัสแล้ว ได้แต้มคืน ${n} แต้ม${cost ? ` · จ่าย ${fmtZ(cost)}` : this.vipActive && statResetCost(pl.baseLevel) ? ' (ฟรี · สิทธิ์ VIP)' : ' (ฟรี)'}`, 'lv');
    this.gfx.levelUp(pl, true);
    this.hud.setPlayer(pl);
    this.status.render();
    this.refreshItemsUI();
    this.saveNow(false);
  }

  toggleWardrobe(force) {
    this.ward.toggle(force);
    if (this.ward.open) { this.status.toggle(false); this.skillWin.toggle(false); }
  }

  // v0.51 ลองใส่แฟชั่นจากร้านเพชร (ไม่บันทึก · ผู้เล่นอื่นไม่เห็น) · id = null เพื่อถอด
  tryFashion(id) {
    const pl = this.player;
    pl.tryOn = id && COSTUME_BY_ID[id] ? id : null;
    this.gfx.refreshLook(pl);
    if (pl.tryOn) this.gfx.bursts.spawn(pl.x / TILE, 1.0, pl.y / TILE, FASHION_RARITY[COSTUME_BY_ID[id].rarity].color, 14, 1.0, 1.8);
  }

  afterFashion() {
    this.sfx('equip');
    this.gfx.refreshLook(this.player);
    this.ward.render();
    this.dirty = true;
  }

  wearFashion(id) {
    const pl = this.player, it = COSTUME_BY_ID[id];
    const err = pl.wearFashion(id);
    if (err) { this.hud.log(err, 'sys'); return; }
    this.hud.log(`สวมแฟชั่น ${it.name}`, 'f-' + it.rarity);
    if (!pl.fashionFits(it)) {
      const TH = { knife: 'มีดสั้น', sword: 'ดาบ', staff: 'ไม้เท้า', mace: 'คทา', bow: 'ธนู', none: 'มือเปล่า' };
      const need = (FASHION_WEAPON_FIT[it.wtype] || []).map((w) => TH[w]).join('/');
      this.hud.log(`อาวุธแฟชั่นนี้จะแสดงเมื่อถือ${need} (ตอนนี้ถือ${TH[pl.weaponType] || pl.weaponType})`, 'sys');
    }
    this.gfx.bursts.spawn(pl.x / TILE, 1.0, pl.y / TILE, FASHION_RARITY[it.rarity].color, 14, 1.0, 1.8);
    this.afterFashion();
  }

  wearFashionSet(ids) {
    const pl = this.player;
    let n = 0;
    for (const id of ids) if (!pl.wearFashion(id)) n++;
    if (!n) return;
    this.hud.log(`สวมแฟชั่น ${n} ชิ้น`, 'info');
    this.afterFashion();
  }

  takeOffFashion(slot) {
    const id = this.player.fashion.worn[slot];
    if (!this.player.takeOffFashion(slot)) return;
    this.hud.log(`ถอดแฟชั่น ${COSTUME_BY_ID[id].name}`, 'info');
    this.afterFashion();
  }

  takeOffAllFashion() {
    const pl = this.player;
    let n = 0;
    for (const slot of FASHION_SLOTS) if (pl.takeOffFashion(slot)) n++;
    if (n) { this.hud.log('ถอดแฟชั่นทั้งหมดแล้ว', 'info'); this.afterFashion(); }
  }

  toggleFashionHidden() {
    const F = this.player.fashion;
    F.hidden = !F.hidden;
    this.hud.log(F.hidden ? 'ซ่อนแฟชั่น (แสดงอุปกรณ์จริง)' : 'แสดงแฟชั่น', 'info');
    this.afterFashion();
  }

  useHotkey(i) {
    const id = this.player.hotbar[i];
    if (!id) return;
    this.hotbar.flash(i);
    if (isSkillKey(id)) return this.useSkill(id.slice(6));
    const it = ITEMS[id];
    if (it.type === 'equip') { if (this.player.equip[it.slot] !== id) this.equipItem(id); return; }
    this.useItem(id);
  }

  assignHotkey(i, id) {
    const hb = this.player.hotbar;
    if (id) for (let k = 0; k < hb.length; k++) if (hb[k] === id) hb[k] = null;   // ไอเทมหนึ่งอยู่ได้ปุ่มเดียว
    hb[i] = id;
    this.hotbar.render();
    this.inv.render();
    this.skillWin.render();
    if (id) this.hud.log(`ตั้ง ${isSkillKey(id) ? SKILLS[id.slice(6)].name : ITEMS[id].name} ไว้ที่ปุ่ม F${i + 1}`, 'info');
    this.dirty = true;
  }

  refreshItemsUI() { this.inv.render(); this.hotbar.render(); this.shop.sync(); this.storWin.render(); if (this.refineWin) this.refineWin.render(); if (this.questLog) this.refreshQuestUI(); if (this.autoWin) this.autoWin.refresh(); if (this.smith && this.smith.open) this.smith.render(); if (this.equipWin && this.equipWin.open) this.equipWin.render(); }

  /* ---------- บริการ NPC: ร้านค้า · คลัง · วาร์ป (v0.5) ---------- */

  openService(npc) {
    const pl = this.player, sv = npc.service;
    this.closeServices();
    this.activeNpc = npc;
    const greet = npc.greetPlayer(pl);
    pl.faceToward(npc);
    this.hud.log(greet, 'npc', `${npc.name} (${npc.title})`);
    const bye = { label: 'ไว้คราวหลัง', cls: 'ghost', onSelect: () => this.endService() };
    if (sv.type === 'shop') {
      this.dialog.show(npc, greet, [
        { label: 'ซื้อของ', sub: SHOPS[sv.shop].name, onSelect: () => this.openShop(sv.shop, 'buy') },
        { label: 'ขายของ', sub: 'รับซื้อทุกอย่างในราคาครึ่งหนึ่ง', onSelect: () => this.openShop(sv.shop, 'sell') },
        ...(sv.refine ? [
          { label: 'ตีบวกอุปกรณ์', sub: '+1 ถึง +10 · ใช้ผลึกตีบวก + Zeny', onSelect: () => this.openRefine() },
          { label: '🔧 ซ่อมอุปกรณ์', sub: 'ความทนทานลดเมื่อสู้ · พังแล้วไม่ให้ค่าสถานะ', onSelect: () => { this.dialog.hide(); this.smith.show('repair'); } },   // v0.89
          { label: '🃏 ถอดการ์ด', sub: 'การ์ดกลับเข้ากระเป๋า · ค่าบริการแพงมาก', onSelect: () => { this.dialog.hide(); this.smith.show('cards'); } },   // v0.89
          { label: '✦ หลอมอุปกรณ์นิรันดร์กาล', sub: 'เกรดสูงสุดของเกม · หลอมจากอุปกรณ์เทพสวรรค์ (Lv.145)', onSelect: () => { this.endService(); this.eternalWin.toggle(true); } },   // v0.77
          { label: 'การตีบวกคืออะไร?', keepOpen: true, onSelect: () => this.dialog.show(npc, 'ตีบวกอาวุธเพิ่ม ATK ตีบวกชุดเกราะ/หมวก/โล่/ผ้าคลุม/รองเท้าเพิ่ม DEF ยิ่งสูงยิ่งแรง\n\n+1 ถึง +4 สำเร็จแน่นอน\n+5 75% · +6 60% · +7 50% — ล้มเหลวระดับลด 1\n+8 35% · +9 25% · +10 15% — ล้มเหลวอุปกรณ์แตก! (ใช้คริสตัลพิทักษ์กันแตกได้)\n\nอาวุธใช้ผลึกตีบวกอาวุธ ชุดเกราะใช้ผลึกตีบวกเกราะ ซื้อได้ที่ร้านข้า', [
            { label: 'ตีบวกอุปกรณ์', onSelect: () => this.openRefine() }, bye]) },
        ] : []),
        bye,
      ]);
    } else if (sv.type === 'storage') {
      this.storageMenu(npc, greet);
    } else if (sv.type === 'market') {   // v0.42 ตลาดฝากขาย
      this.dialog.show(npc, greet, [
        { label: 'เปิดตลาด', sub: 'ซื้อ · ลงขาย · ดูรายการของฉัน', onSelect: () => this.market.show() },
        { label: 'ตลาดทำงานยังไง?', keepOpen: true, onSelect: () => this.dialog.show(npc, 'ฝากของไว้กับข้าได้ 7 วัน ใครซื้อ เงินจะเข้ากระเป๋าเจ้าทันทีแม้ไม่ได้ออนไลน์ หักค่าธรรมเนียม 7% ลงได้ 2 รายการต่อตัวละคร (VIP เหลือค่าธรรมเนียม 3% ลงได้ 5 รายการ) ปิดรายการเมื่อไหร่ก็ได้ของคืน · ส่วนการแลกกับเพื่อนตรง ๆ ให้แตะที่ตัวเขาแล้วเลือก "ขอแลกเปลี่ยน"', [{ label: 'เปิดตลาด', onSelect: () => this.market.show() }, bye]) },
        bye,
      ]);
    } else if (sv.type === 'job') {
      this.jobMenu(npc, greet);
    } else if (sv.type === 'dungeon') {
      this.dungeon.caveMenu(npc, greet);
    } else if (sv.type === 'tower') {
      this.dungeon.towerMenu(npc, greet);
    } else if (sv.type === 'warp') {
      const routes = WARP_ROUTES[sv.routes] || [];
      this.dialog.show(npc, `${greet}  (Zeny ของเจ้า ${fmtZ(pl.zeny)})`, [
        ...routes.map((r) => ({
          label: r.label, sub: r.hint, right: r.cost ? fmtZ(r.cost) : 'ฟรี',
          disabled: pl.zeny < r.cost, onSelect: () => this.warpVia(npc, r),
        })),
        bye,
      ]);
    }
  }

  storageMenu(npc, text) {
    const st = this.storage;
    this.dialog.show(npc, text, [
      { label: 'เปิดคลังเก็บของ', sub: `ใช้ไป ${st.stacks.length}/${st.capacity} ช่อง · ฝาก/ถอนฟรี`, onSelect: () => this.openStorage() },
      { label: 'คลังคืออะไร?', keepOpen: true, onSelect: () => this.storageMenu(npc, `คลังเก็บของใช้ร่วมกันทุกตัวละครในบัญชีเดียวกันค่ะ ฝากได้ ${st.capacity} ช่อง ช่องละสูงสุด 999 ชิ้น ของที่ยังไม่ใช้ฝากไว้ กระเป๋าจะได้ไม่เต็มนะคะ`) },
      { label: 'ไว้คราวหลัง', cls: 'ghost', onSelect: () => this.endService() },
    ]);
  }

  openShop(shopId, tab) {
    this.status.toggle(false); this.skillWin.toggle(false); this.questWin.toggle(false);
    this.shop.show(shopId, tab);
  }

  /* ---------- v0.45 VIP ---------- */
  // รับสถานะจาก cash_state / cash_buy (เวลาเซิร์ฟเวอร์ → ชดเชยนาฬิกาเครื่อง)
  setVip(st) {
    if (!st) return;
    const V = this.vip;
    if (Number.isFinite(+st.now) && +st.now > 0) V.skew = +st.now - Date.now();
    V.until = Number.isFinite(+st.vip_until) ? +st.vip_until : 0;
    if (typeof st.vip_claimed === 'boolean') V.claimed = st.vip_claimed;
    if (st.market) V.market = st.market;
    this.vipTick();
  }
  get vipActive() { return this.vip.until > Date.now() + (this.vip.skew || 0); }
  vipMul() { return this.vipActive ? 1.2 : 1; }   // EXP / ดรอป +20%
  vipTick() {
    const on = this.vipActive, V = this.vip;
    if (this.player) this.player.vip = on;
    if (on && this.collection && this.collection.vipBonus) this.collection.vipBonus();   // เช็กอินคูณ 2
    if (V.was === true && !on) this.hud.log('👑 VIP หมดอายุแล้ว — ต่ออายุได้ที่ร้านเพชร แท็บ VIP', 'sys');
    if (V.was !== on) { V.was = on; this.root.classList.toggle('is-vip', on); if (this.player && this.gfx) this.gfx.setName && this.gfx.setName(this.player, this.player.name); }
  }
  vipOk() { if (this.vipActive) return true; this.hud.log('สิทธิ์นี้สำหรับ VIP — ซื้อบัตร VIP ได้ที่ร้านเพชร', 'sys'); this.cash.show('vip'); return false; }
  vipService(kind) {
    if (!this.vipOk() || this.player.dead) return;
    this.closeServices();
    if (kind === 'storage') this.openStorage();
    else if (kind === 'refine') this.openRefine();            // v0.89 ตีบวกได้ทุกที่
    else if (kind === 'market') this.market.show();           // v0.89 ตลาดกลางได้ทุกที่
    else if (kind === 'repair') this.smith.show('repair', true);   // v0.89 ซ่อมได้ทุกที่
    else if (kind === 'reset') { this.status.toggle(true); this.status.render(); }   // v0.89 รีเซ็ตสเตตัสฟรี
    else this.openShop('tools', kind === 'sell' ? 'sell' : 'buy');
  }
  vipWarp(route) {
    const pl = this.player;
    if (!this.vipOk() || pl.dead || this.warping) return;
    if (this.dungeon && this.dungeon.active) { this.hud.log('วาร์ปออกจากดันเจี้ยนไม่ได้ — ออกจากดันเจี้ยนก่อน', 'sys'); return; }
    this.closeServices();
    this.hud.log(`👑 วาร์ป VIP → ${route.label}`, 'sys');
    this.gfx.warpIn(pl, '#ffd86a');
    this.warp(route.map, route.arrive);
  }

  openStorage() {
    this.status.toggle(false); this.skillWin.toggle(false); this.questWin.toggle(false);
    this.storWin.show();
  }

  // ปิดบริการทั้งหมด (เดินออกห่าง, กด Esc, หมดสติ, วาร์ป)
  closeServices() {
    this.activeNpc = null;
    this.dialog.hide();
    if (this.shop.open) this.shop.close();
    if (this.storWin.open) this.storWin.close();
    if (this.refineWin.open) { this.refineWin.open = false; this.refineWin.el.hidden = true; }
    if (this.smith && this.smith.open && !this.smith.vip) this.smith.close();   // v0.89
    this.activeNpc = null;
  }

  endService() {
    if (!this.dialog.open && !this.shop.open && !this.storWin.open && !this.refineWin.open) this.activeNpc = null;
  }

  itemList(list) { return list.map(([id, q]) => `${ITEMS[id].name} x${q}`).join(', '); }

  buyItems(list) {
    const pl = this.player;
    const total = list.reduce((t, [id, q]) => t + buyPrice(id) * q, 0);
    if (total > pl.zeny) { this.hud.log('Zeny ไม่พอ', 'sys'); return; }
    if (!pl.inventory.fits(list)) { this.hud.log('กระเป๋าไม่มีช่องว่างพอ', 'sys'); return; }
    pl.spendZeny(total);
    for (const [id, q] of list) pl.inventory.add(id, q);
    this.hud.log(`ซื้อ ${this.itemList(list)} · จ่าย ${fmtZ(total)}`, 'zeny');
    this.sfx('coin');
    this.gfx.floatText(pl, `-${fmtZ(total)}`, 'zeny spend', { h: 2.0, life: 1.4, rise: 0.6, drift: false });
    this.afterTrade();
  }

  sellItems(list) {
    const pl = this.player;
    let total = 0; const sold = [];
    for (const [id, q] of list) {
      const n = pl.inventory.remove(id, q);
      if (n > 0) { total += sellPrice(id) * n; sold.push([id, n]); }
    }
    if (!sold.length) return;
    const sb = this.pets.mods.sell || 0;   // v0.13: มังกรออมสิน ขายได้ราคาเพิ่ม
    if (sb) total = Math.floor(total * (1 + sb / 100));
    pl.addZeny(total);
    this.hud.log(`ขาย ${this.itemList(sold)} · ได้รับ ${fmtZ(total)}`, 'zeny');
    this.sfx('coin');
    this.gfx.floatText(pl, `+${fmtZ(total)}`, 'zeny', { h: 2.0, life: 1.5, rise: 0.7, drift: false });
    this.gfx.bursts.spawn(pl.x / TILE, 1.2, pl.y / TILE, '#ffd36b', 14, 1.2, 1.8);
    this.afterTrade();
  }

  afterTrade() {
    this.hud.setPlayer(this.player);
    this.refreshItemsUI();
    this.status.render();
    this.dirty = true;
  }

  // ย้ายไอเทมระหว่างกระเป๋า ↔ คลัง (from = 'bag' | 'stor')
  moveStorage(from, id, qty) {
    const bag = this.player.inventory, st = this.storage;
    const src = from === 'bag' ? bag : st, dst = from === 'bag' ? st : bag;
    const n = Math.min(qty, src.count(id), dst.room(id));
    if (n <= 0) { this.hud.log(from === 'bag' ? 'คลังเต็ม ฝากเพิ่มไม่ได้' : 'กระเป๋าเต็ม ถอนเพิ่มไม่ได้', 'sys'); return 0; }
    src.remove(id, n); dst.add(id, n);
    this.hud.log(`${from === 'bag' ? 'ฝาก' : 'ถอน'} ${ITEMS[id].name} x${n}`, 'info');
    this.refreshItemsUI();
    this.dirty = true;
    return n;
  }

  warpVia(npc, route) {
    const pl = this.player;
    if (pl.dead || this.warping) return;
    if (!pl.spendZeny(route.cost)) { this.hud.log('Zeny ไม่พอสำหรับค่าวาร์ป', 'sys'); return; }
    this.closeServices();
    if (route.cost) this.hud.log(`จ่ายค่าวาร์ป ${fmtZ(route.cost)}`, 'zeny');
    this.hud.log(`${npc.name}: ไปได้! ระวังตัวด้วยนะ`, 'npc');
    npc.bubble = { text: 'ไปได้! ✦', t: 2 };
    this.gfx.warpIn(pl, '#8fd8ff');
    this.refreshItemsUI();
    this.dirty = true;
    this.warp(route.map, route.arrive);
  }

  /* ---------- สกิล (v0.6) ---------- */

  // หน้าต่างสถานะกับหน้าต่างสกิลใช้พื้นที่เดียวกัน → เปิดได้ทีละอัน
  toggleStatus(force) {
    this.status.toggle(force);
    if (this.status.open) { this.skillWin.toggle(false); this.ward.toggle(false); this.questWin.toggle(false); }
  }

  toggleSkills(force) {
    this.skillWin.toggle(force);
    if (this.skillWin.open) { this.status.toggle(false); this.ward.toggle(false); this.questWin.toggle(false); }
  }

  learnSkill(id) {
    const pl = this.player, sk = SKILLS[id];
    const first = pl.skillLv(id) === 0;
    const err = pl.learn(id);
    if (err) { this.hud.log(err, 'sys'); return; }
    this.hud.log(`เรียน ${sk.name} Lv.${pl.skillLv(id)}`, 'lv');
    // สกิลกดใช้ที่เพิ่งเรียนครั้งแรก → วางลงปุ่มลัดช่องว่างให้อัตโนมัติ
    if (first && sk.kind === 'active') {
      const key = 'skill:' + id;
      const i = pl.hotbar.indexOf(null);
      if (i >= 0 && !pl.hotbar.includes(key)) this.assignHotkey(i, key);
    }
    this.afterSkillChange();
  }

  afterSkillChange() {
    this.hud.setPlayer(this.player);
    this.status.render();
    this.skillWin.render();
    this.hotbar.render();
    if (this.autoWin && this.autoWin.open) this.autoWin.render();
    this.dirty = true;
  }

  // ระยะใช้สกิล (พิกเซลโลก)
  skillRange(sk) {
    if (sk.range === 'weapon') return this.player.attackRange + 4;
    if (typeof sk.range === 'number') return sk.range * TILE;
    return 0;
  }

  useSkill(id) {
    const pl = this.player, sk = SKILLS[id];
    if (!sk || pl.dead || this.warping) return;
    const lv = pl.skillLv(id);
    if (!lv) { this.hud.log(`ยังไม่ได้เรียน ${sk.name}`, 'sys'); return; }
    if (sk.kind !== 'active') return;
    if (pl.cast) return;
    if (pl.cooldowns[id] != null && this.time < pl.cooldowns[id]) return;
    if (sk.bow && pl.weaponType !== 'bow') { this.hud.log(`${sk.name} ต้องสวมธนูก่อน`, 'sys'); return; }
    if (pl.sp < skillSp(sk, lv)) { this.hud.log('SP ไม่พอ', 'sys'); this.gfx.floatText(pl, 'SP ไม่พอ', 'miss', { h: 2.1, drift: false }); return; }
    pl.pendingTalk = null; pl.pendingPickup = null;
    if (sk.target === 'enemy') {
      const hov = this.gfx.hover;
      let t = pl.target && !pl.target.dead ? pl.target : null;
      if (!t && hov && hov.isMonster && !hov.dead) t = hov;
      if (!t) t = this.nearestMonster(10 * TILE);
      if (!t) { this.hud.log('ไม่มีเป้าหมายในระยะ', 'sys'); return; }
      if (pl.target !== t) this.setTarget(t, false);
      pl.pendingSkill = { id, lv, target: t };
    } else {
      pl.path = [];
      pl.pendingSkill = { id, lv, target: null };
    }
  }

  // เดินเข้าระยะก่อนเริ่มร่าย
  updatePendingSkill(dt) {
    const pl = this.player, ps = pl.pendingSkill, sk = SKILLS[ps.id];
    const t = ps.target;
    if (t) {
      if (t.dead) { pl.pendingSkill = null; return; }
      const d = Math.hypot(t.x - pl.x, t.y - pl.y);
      if (d > this.skillRange(sk)) {
        pl.repath = (pl.repath || 0) - dt;
        if (pl.repath <= 0 || !pl.path.length) {
          if (!this.moveTo(t.x, t.y, false)) { pl.pendingSkill = null; this.hud.log('เข้าใกล้เป้าหมายไม่ได้', 'sys'); return; }
          pl.repath = 0.3;
        }
        return;
      }
      pl.path = []; pl.faceToward(t);
    }
    if (pl.skillDelayUntil > this.time) return;   // รอหน่วงหลังสกิลก่อนหน้า (after-cast delay)
    pl.pendingSkill = null;
    // DEX ช่วยลดเวลาร่าย (สูงสุด 70%)
    const total = skillCast(sk, ps.lv) * Math.max(0.3, 1 - pl.derived.total.dex / 150) * Math.max(0.4, 1 - ((pl.bonus && pl.bonus.castPct) || 0) / 100);
    if (total <= 0.02) { this.executeSkill(ps.id, ps.lv, t); return; }
    pl.cast = { id: ps.id, lv: ps.lv, target: t, t: 0, total, name: `${sk.name} Lv.${ps.lv}`, color: sk.color || sk.icon[1] };
    this.sfx('cast');
  }

  updateCast(dt) {
    const pl = this.player, cs = pl.cast;
    if (cs.item) { cs.t += dt; if (cs.t >= cs.total) { pl.cast = null; cs.fn(); } return; }   // v0.13: ร่ายใบวาร์ป
    if (cs.target && cs.target.dead) { pl.cast = null; return; }
    cs.t += dt;
    if (cs.target) pl.faceToward(cs.target);
    if (cs.t >= cs.total) { pl.cast = null; this.executeSkill(cs.id, cs.lv, cs.target); }
  }

  cancelCast() {
    const pl = this.player;
    if (!pl.cast) return;
    this.hud.log(`ยกเลิกการร่าย ${pl.cast.item ? pl.cast.name : SKILLS[pl.cast.id].name}`, 'info');
    pl.cast = null;
  }

  // ปล่อยสกิล: หัก SP + คูลดาวน์ แล้วเล่นเอฟเฟกต์/คำนวณดาเมจตามชนิด
  executeSkill(id, lv, t) {
    const pl = this.player, sk = SKILLS[id];
    const sp = skillSp(sk, lv);
    if (pl.dead) return;
    if (pl.sp < sp) { this.hud.log('SP ไม่พอ', 'sys'); return; }
    pl.sp -= sp;
    pl.cooldowns[id] = this.time + (sk.cd || 0);
    pl.attackCd = Math.max(pl.attackCd, 0.35);
    this.hud.setPlayer(pl);
    this.gfx.floatText(pl, `${sk.name}!`, 'skillname', { h: 2.35, life: 1.1, rise: 0.4, drift: false });
    this.sfx(SKILL_SFX[id] || 'skill');
    if (sk.vfx) { this.playSkillFx(id, lv, t); this.dirty = true; return; }
    const mult = sval(sk.mult, lv, pl) || 1;
    const color = sk.color || sk.icon[1];
    const inRadius = (cx, cy, r) => (this.mobs ? this.mobs.list.filter((m) => !m.dead && Math.hypot(m.x - cx, m.y - cy) <= r * TILE + 6) : []);

    switch (sk.fx) {
      case 'strike': {
        this.gfx.playAttack(pl);
        const r = rollSkill(pl.stats, t.stats, { mult, hitBonus: sval(sk.hitBonus, lv) || 0 });
        this.schedule(0.15, () => {
          if (t.dead) return;
          if (!r.miss) this.gfx.strikeFx(t, '#ff9a5a');
          this.damageMonster(t, r);
          const st = sval(sk.stun, lv) || 0;
          if (!r.miss && st && Math.random() < st) this.stunMob(t, 2.5);
        });
        pl.engage = true;   // นักดาบฟันต่อเลย
        break;
      }
      case 'nova': {
        this.gfx.playAttack(pl, 'cast');
        this.schedule(0.12, () => {
          this.gfx.shockwave(pl, color, sk.radius);
          for (const m of inRadius(pl.x, pl.y, sk.radius)) {
            this.damageMonster(m, rollSkill(pl.stats, m.stats, { mult, hitBonus: 20 }));
            this.knockback(m, pl, sk.knock);
          }
        });
        break;
      }
      case 'bolt': {
        this.gfx.playAttack(pl, 'cast');
        const hits = sval(sk.hits, lv) || 1, freeze = sval(sk.freeze, lv) || 0;
        for (let i = 0; i < hits; i++) {
          this.schedule(i * 0.14, () => {
            if (t.dead) return;
            const dur = clamp(Math.hypot(t.x - pl.x, t.y - pl.y) / (TILE * 18), 0.14, 0.5);
            this.gfx.projectile(pl, t, { kind: 'orb', color, dur, size: 0.14 });
            this.schedule(dur, () => {
              if (t.dead) return;
              this.damageMonster(t, rollSkill(pl.stats, t.stats, { mult, magic: !!sk.magic }), { magic: !!sk.magic });
              if (freeze && i === hits - 1 && !t.dead && Math.random() < freeze) this.freezeMob(t, 3);
            });
          });
        }
        break;
      }
      case 'storm': {
        this.gfx.playAttack(pl, 'cast');
        const cx = t.x, cy = t.y, hits = sval(sk.hits, lv) || 1;
        for (let i = 0; i < hits; i++) {
          this.schedule(0.1 + i * 0.32, () => {
            for (let k = 0; k < 3; k++) {
              const a = Math.random() * Math.PI * 2, rr = Math.random() * sk.radius * TILE;
              this.gfx.lightning(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, color);
            }
            for (const m of inRadius(cx, cy, sk.radius)) this.damageMonster(m, rollSkill(pl.stats, m.stats, { mult, magic: true }), { magic: true });
          });
        }
        break;
      }
      case 'arrows': {
        const hits = sval(sk.hits, lv) || 1;
        for (let i = 0; i < hits; i++) {
          this.schedule(i * 0.16, () => {
            if (t.dead) return;
            this.gfx.playAttack(pl, 'shoot');
            const dur = clamp(Math.hypot(t.x - pl.x, t.y - pl.y) / (TILE * 16), 0.1, 0.35);
            this.schedule(0.08, () => { if (!t.dead) this.gfx.projectile(pl, t, { kind: 'arrow', dur, arc: 0.12 }); });
            this.schedule(0.08 + dur, () => { if (!t.dead) this.damageMonster(t, rollSkill(pl.stats, t.stats, { mult, hitBonus: 10 })); });
          });
        }
        break;
      }
      case 'rain': {
        this.gfx.playAttack(pl, 'shoot');
        const cx = t.x, cy = t.y;
        this.gfx.arrowRain(cx, cy, sk.radius);
        this.schedule(0.55, () => {
          const src = { x: cx, y: cy };
          for (const m of inRadius(cx, cy, sk.radius)) {
            this.damageMonster(m, rollSkill(pl.stats, m.stats, { mult, hitBonus: 15 }));
            this.knockback(m, src, sk.knock);
          }
        });
        break;
      }
      case 'heal': {
        this.gfx.playAttack(pl, 'cast');
        const amt = Math.min(pl.maxHp - pl.hp, (sval(sk.heal, lv, pl) || 0) * (1 + ((pl.bonus && pl.bonus.healPct) || 0) / 100));
        pl.hp += amt;
        this.gfx.healFx(pl, color);
        this.gfx.floatText(pl, `+${Math.round(amt)}`, 'heal', { h: 1.6, drift: false });
        this.hud.setPlayer(pl);
        this.status.render();
        break;
      }
      case 'buff': {
        this.gfx.playAttack(pl, 'cast');
        pl.addBuff(id, lv, sk.bonus(lv), sk.duration(lv));
        this.gfx.buffFx(pl, color);
        this.hud.log(`${sk.name} Lv.${lv} (${sk.duration(lv)} วินาที)`, 'lv');
        this.hud.setPlayer(pl);
        this.hud.setBuffs(pl.buffs);
        this.status.render();
        break;
      }
    }
    WeaponFx.onSkill(this, sk, sk.fx === 'heal' ? 'heal' : '');
    this.dirty = true;
  }

  // v0.8: เล่นเอฟเฟกต์สกิลชุดใหม่ — ดาเมจ/สถานะเข้าตามจังหวะภาพ (SkillFX เรียก ctx.hit ตอนลูกไฟตก ดาบฟาด ฯลฯ)
  playSkillFx(id, lv, t, opts = {}) {
    const pl = this.player, sk = SKILLS[id], S = 1 / TILE, fx = this.gfx.fx;
    // v0.65.2 สกิลรอบตัว (target: self) ก็หันหาเป้าที่เลือกอยู่ด้วย → อาวุธ/ท่าฟันชี้ไปทางศัตรู
    const look = t || (pl.target && !pl.target.dead && pl.target.stats ? pl.target : null);
    if (look) pl.faceToward(look);
    // v0.35: วาร์ปไปหลังเป้าก่อนเริ่มท่า (ก้าวเงาสังหาร) — ทิ้งเงาไว้ที่จุดเดิม
    let blinkFrom = null;
    if (sk.blink === 'behind' && t) {
      blinkFrom = new THREE.Vector3(pl.x * S, 0, pl.y * S);
      const dx = t.x - pl.x, dy = t.y - pl.y, d = Math.hypot(dx, dy) || 1, gx = t.x + (dx / d) * TILE * 1.1, gy = t.y + (dy / d) * TILE * 1.1;
      const sx = gx - pl.x, sy = gy - pl.y;
      for (let i = 0; i < 12; i++) if (!pl.moveBy(sx / 12, sy / 12, this.map)) break;
      pl.path = []; pl.faceToward(t);
    }
    const facing = new THREE.Vector3(Math.sin(pl.angle), 0, Math.cos(pl.angle));
    const casterPos = new THREE.Vector3(pl.x * S, 0, pl.y * S);
    // เป้าหมายที่เอฟเฟกต์รู้จัก: มอนที่ยังไม่ตายรอบจุดใช้สกิล (ตำแหน่งอ่านสด ๆ ทุกครั้ง เพราะมอนเดินได้)
    const focus = t || pl;
    const reach = 8 * TILE;
    const mobs = this.mobs ? this.mobs.list.filter((m) => !m.dead && (m === t || Math.hypot(m.x - focus.x, m.y - focus.y) <= reach)) : [];
    const list = mobs.map((m) => ({ m, get pos() { return new THREE.Vector3(m.x * S, 0, m.y * S); }, height: m.data.height }));
    const main = t ? mobs.indexOf(t) : -1;
    const center = sk.target === 'self' ? casterPos.clone() : t ? new THREE.Vector3(t.x * S, 0, t.y * S) : null;
    const origin = sk.target === 'self' || !t ? { x: pl.x, y: pl.y } : { x: t.x, y: t.y };   // จุดที่ผลักศัตรูออก
    const ctx = {
      caster: { get pos() { return new THREE.Vector3(pl.x * S, pl.lift || 0, pl.y * S); }, facing, height: 1.8, start: casterPos },
      targets: list, main, center, count: sval(sk.count, lv, pl) || 0, blinkFrom, spec: sk.nf || null,
      hit: (i, info = {}) => this.skillHit(sk, lv, list[i] && list[i].m, info, origin),
      heal: () => {
        if (pl.dead) return;
        const base = Math.round((sval(sk.heal, lv, pl) || 0) * (1 + ((pl.bonus && pl.bonus.healPct) || 0) / 100));
        const amt = Math.max(0, Math.min(pl.maxHp - pl.hp, base));
        pl.hp += amt;
        if (amt > 0) this.gfx.floatText(pl, `+${amt}`, 'heal', { h: 1.6, drift: false });
        this.hud.setPlayer(pl); this.status.render();
        this.supportParty('hl', id, lv, base);   // v0.65.2 ฮีลเพื่อนในปาร์ตี้ด้วย (เฉพาะสกิลที่มี sk.party)
      },
      buff: (txt) => this.gfx.floatText(pl, txt, 'buff', { h: 2.6, life: 1.6, rise: 0.5, drift: false }),
      anim: (kind, dur) => this.heroAnim(kind, dur),
      shake: (a) => { this.gfx.shake(a); if (a >= 0.12) this.sfx(IMPACT_SFX[id] || 'hit', { gap: 110 }); },
      sky: (dark, dur) => this.gfx.skyFx(dark, dur),
      hitstop: (s) => { this.hitstop = Math.max(this.hitstop, s); },
      shock: (pos, s) => this.gfx.shockAt(pos, s),
      flash: (color, a) => this.gfx.post.flash(color, a),
      aberrate: (a) => this.gfx.post.aberrate(a),
      punch: (a) => this.gfx.punch(a),
      lines: (a, dur) => this.gfx.post.speedLines(a, dur),
      // v0.35: ท่าทางแบบอนิเมะ — เลื่อนตัว / กระโดด-ลอย / เงาตกค้าง / ดูดศัตรู / ยกเลิกท่า
      move: (to, dur = 0.25, ease = 'out') => this.heroMove(to.x / S, to.z / S, dur, ease),
      lift: (h, dur = 0.5, hold = 0) => this.heroLift(h, dur, hold),
      ghost: (opts) => this.gfx.afterimage(pl, opts),
      pull: (c, r, step) => this.pullMobs(c.x / S, c.z / S, r * TILE, step * TILE),
      slow: (i, pct, secs) => { const m = list[i] && list[i].m; if (m && !m.dead && !m.data.mvp) { m.slowUntil = this.time + secs; m.slowMul = 1 - pct; } },
      done: () => { pl.lockUntil = Math.min(pl.lockUntil, this.time); },
      freeze: (i) => { const m = list[i] && list[i].m; if (!m || m.dead) return; const ch = sk.freeze != null ? sval(sk.freeze, lv) : 1; if (Math.random() < ch) this.freezeMob(m, (sval(sk.freezeSecs, lv) || 2) * (m.data.mvp ? 0.4 : 1)); },
      shieldLeft: () => (pl.shield && pl.shield.id === id ? pl.shield.charges : 0),
      // v0.60.1: ยิงลูกธนูจริงจากตัวผู้เล่นไปหาเป้า (สกิลสายธนู) — คืนเวลาที่ลูกธนูถึง
      shoot: (i, o = {}) => { const m = list[i] && list[i].m; if (!m || m.dead) return 0; const dur = Math.min(0.45, Math.max(0.12, Math.hypot(m.x - pl.x, m.y - pl.y) / (TILE * (o.speed || 16)))); this.gfx.projectile(pl, m, { kind: 'arrow', dur, arc: o.arc ?? 0.14 }); return dur; },
    };
    // v0.31: สกิลพุ่งตัว (พุ่งทะยานเหล็กกล้า) — เลื่อนผู้เล่นไปหยุดหน้าเป้าหมาย
    if (sk.dash && t) {
      const sx = pl.x, sy = pl.y, dx = t.x - sx, dy = t.y - sy, d = Math.hypot(dx, dy) || 1;
      const go = Math.max(0, d - TILE * 1.1), ex = sx + (dx / d) * go, ey = sy + (dy / d) * go;
      if (go > 4) {
        this.heroAnims.push({ t: 0, dur: 0.2, fn: (k) => { const e = 1 - (1 - k) * (1 - k); pl.x = sx + (ex - sx) * e; pl.y = sy + (ey - sy) * e; }, end: () => { pl.x = ex; pl.y = ey; } });
        ctx.dashTo = new THREE.Vector3(ex * S, 0, ey * S);
      }
    }
    const pvx = !opts.vfx && SKILL_VFX[id];
    (pvx && pvx.solo ? this.gfx.fxGhost() : fx).play(opts.vfx || sk.vfx, ctx);   // v0.54 สกิลที่มีภาพ Night Forge ใช้ตรรกะเดิมแต่ซ่อนภาพเดิม
    if (opts.vfx) { this.dirty = true; return; }   // v0.35: เอฟเฟกต์เสริม (ขนนกแตก / ปาฏิหาริย์) ไม่ล็อกท่า ไม่ให้บัฟ
    // v0.34: ซ้อนเอฟเฟกต์ภาพพิกเซล (PixelLab) ถ้าสกิลนี้มี
    const pv = SKILL_VFX[id];
    // v0.65.2 ชีตที่มีทิศ (ผู้ร่ายซ้าย → เป้าขวา) หันตามเป้าบนจอทุกทิศ ไม่ใช่แค่กลับซ้าย/ขวา · เป้าเดินหนี ภาพก็หันตาม
    // v0.66 สกิลรอบตัวที่ใช้ชีตมุมข้าง (ผูกกลุ่มดาว) หันหาเป้าที่เลือกไว้ (look) ด้วย
    const tgtPos = look ? () => (look.dead ? null : new THREE.Vector3(look.x * S, 0, look.y * S)) : null;
    const aim = (max) => (look ? { from: casterPos.clone(), to: tgtPos, max } : null);
    for (const v of pv ? [pv, ...(pv.also || [])] : []) {
      if (v.side) {   // v0.64 ชีตมุมข้าง: วางที่เท้าผู้ร่าย ไม่ตามตัว · ย่อ/ขยายให้ระยะศัตรูในภาพใกล้ระยะจริง
        let scale = v.scale || 1;
        if (v.fit && look) {
          // v0.65.2 ใช้ระยะที่เห็นบนระนาบจอ (ตัดส่วนที่พุ่งเข้า/ออกจากกล้อง) → เป้าบน/ล่างจอไม่ทำให้ภาพยาวเกินตัวศัตรู
          const vd = this.gfx.camera.getWorldDirection(new THREE.Vector3());
          const dv = new THREE.Vector3((look.x - pl.x) * S, 0, (look.y - pl.y) * S); dv.addScaledVector(vd, -dv.dot(vd));
          const sd = v.fit * (3.55 / 96) * scale; if (sd > 0) scale *= Math.max(0.6, Math.min(1.5, dv.length() / sd));
        }
        this.gfx.pixelVfx().play(v.name, casterPos.clone(), { ...v, scale, flip: !!(look && look.x < pl.x), aim: aim(v.aimMax ?? 1.1) });
        continue;
      }
      const at = v.at === 'self' || !t ? casterPos : new THREE.Vector3(t.x * S, 0, t.y * S);
      if (v.at === 'self') this.gfx.pixelVfx().play(v.name, at, { ...v, follow: pl, once: true });
      else if (v.flipToCaster && t) this.gfx.pixelVfx().play(v.name, at, { ...v, aim: aim(v.aimMax ?? 1.3) });   // ลูกพลังในชีตพุ่งมาจากฝั่งผู้เล่นทุกทิศ
      else this.gfx.pixelVfx().play(v.name, at, v);
    }   // v0.63 also = เล่นหลายชีตพร้อมกัน (เช่น ปีก + ลำแสง)
    // v0.35: โล่นับจำนวนฮิต (คำสัตย์ขนนก)
    if (sk.shield) { const sh = sk.shield(lv); pl.shield = { id, lv, charges: sh.charges, until: this.time + sh.secs }; pl.addBuff(id, lv, {}, sh.secs); this.hud.setBuffs(pl.buffs); }
    // บัฟเข้าทันที (เอฟเฟกต์เป็นแค่ภาพ)
    if (sk.bonus) {
      pl.addBuff(id, lv, sk.bonus(lv), sk.duration(lv));
      this.hud.log(`${sk.name} Lv.${lv} (${sk.duration(lv)} วินาที)`, 'lv');
      this.hud.setPlayer(pl); this.hud.setBuffs(pl.buffs); this.status.render();
    }
    if (sk.bonus || sk.shield) this.supportParty('bf', id, lv);   // v0.65.2 บัฟ/โล่ถึงเพื่อนในปาร์ตี้ด้วย
    pl.lockUntil = this.time + (sk.lock || 0);
    pl.skillDelayUntil = this.time + (sk.delay ?? 0.35) * Math.max(0.3, 1 - ((pl.bonus && pl.bonus.delayPct) || 0) / 100);
    WeaponFx.onSkill(this, sk, sk.heal ? 'heal' : '');
    pl.attackCd = Math.max(pl.attackCd, (sk.lock || 0) + 0.2);
    if (!sk.passive && !sk.heal && !sk.bonus) this.wearGear('attack');   // v0.89 สกิลโจมตีทำให้อาวุธสึก
    if (sk.lock) pl.path = [];
    if (sk.engage && t) pl.engage = true;
  }

  // ฮิตหนึ่งครั้งจากเอฟเฟกต์ → คืน { stun, freeze } (วินาที) ให้เอฟเฟกต์เลือกแสดงดาว/ก้อนน้ำแข็ง
  skillHit(sk, lv, m, info, origin) {
    const pl = this.player;
    // v0.16: ระหว่างวาร์ป/มอนของแผนที่เก่า → ไม่ทำดาเมจ (เอฟเฟกต์ที่ค้างอยู่จะไม่ฆ่ามอนข้ามแผนที่)
    if (!m || m.dead || pl.dead || this.warping || !this.mobs || !this.mobs.list.includes(m)) return { stun: 0, freeze: 0 };
    const magic = !!(sk.magic || info.magic);
    const mult = ((info.mult ?? 1) / (sk.ref || 1)) * (sval(sk.mult, lv, pl) || 1);
    const r = rollSkill(pl.stats, m.stats, { mult, magic, hitBonus: sval(sk.hitBonus, lv) || 0, crit: !!info.crit });
    this.damageMonster(m, r, { magic, element: sk.element || skillElement(Object.keys(SKILLS).find((k) => SKILLS[k] === sk)) });
    const out = { stun: 0, freeze: 0 };
    if (r.miss || m.dead) return out;
    if (info.slow && !m.data.mvp) { m.slowUntil = this.time + (info.slow.secs || 2); m.slowMul = 1 - Math.min(0.8, info.slow.pct || 0.3); }
    const boss = m.data.mvp ? 0.4 : 1;   // บอส MVP ติดสถานะสั้นลง
    if (info.freeze) {
      const ch = sk.freeze != null ? sval(sk.freeze, lv) : 1;
      if (Math.random() < ch) { out.freeze = (sval(sk.freezeSecs, lv) || info.freeze) * boss; this.freezeMob(m, out.freeze); }
    }
    if (info.stun) {
      const ch = sk.stun != null ? sval(sk.stun, lv) : 1;
      if (Math.random() < ch) { out.stun = (sval(sk.stunSecs, lv) || info.stun) * boss; this.stunMob(m, out.stun); }
    }
    if (info.knock && !m.data.mvp) this.knockback(m, origin, sk.knock ?? Math.min(2.2, info.knock * 1.5));
    return out;
  }

  // ท่าทางของผู้เล่นตามเอฟเฟกต์: ฟัน/ยิง/ร่าย/ร่ายค้าง/หมุนตัว/กระโดด
  heroAnim(kind, dur = 0.4) {
    const pl = this.player;
    if (kind === 'castHold') { pl.castPoseUntil = this.time + 1.6; pl.castPose = true; return; }
    pl.castPoseUntil = 0; pl.castPose = false;
    if (kind === 'melee') this.gfx.playAttack(pl);
    else if (kind === 'shoot' || kind === 'cast') this.gfx.playAttack(pl, kind);
    else if (kind === 'spin') {
      const a0 = pl.angle;
      this.heroAnims.push({ t: 0, dur, fn: (k) => { pl.angle = a0 + k * Math.PI * 4; }, end: () => { pl.angle = a0; } });
      this.gfx.playAttack(pl);
    } else if (kind === 'jump') {
      this.heroAnims.push({ t: 0, dur, fn: (k) => { pl.lift = Math.sin(k * Math.PI) * 1.1; }, end: () => { pl.lift = 0; } });
    }
  }

  // v0.35: เลื่อนผู้เล่นไปยัง (tx, ty) หน่วยพิกเซลโลกภายใน dur วินาที (หยุดถ้าชนกำแพง)
  heroMove(tx, ty, dur = 0.25, ease = 'out') {
    const pl = this.player, sx = pl.x, sy = pl.y;
    let lx = sx, ly = sy;
    const E = ease === 'in' ? (k) => k * k : ease === 'linear' ? (k) => k : (k) => 1 - (1 - k) * (1 - k);
    this.heroAnims.push({ t: 0, dur, fn: (k) => { const e = E(k), nx = sx + (tx - sx) * e, ny = sy + (ty - sy) * e; if (pl.moveBy(nx - lx, ny - ly, this.map)) { lx = nx; ly = ny; } else { lx = pl.x; ly = pl.y; } }, end: () => { pl.path = []; } });
    this.dirty = true;
  }
  // v0.35: กระโดด/ลอยตัว สูง h ช่วง dur (ค้างไว้ hold วินาทีก่อนลง)
  heroLift(h, dur = 0.5, hold = 0) {
    const pl = this.player, up = dur * 0.4, down = dur - up;
    this.heroAnims.push({ t: 0, dur: dur + hold, fn: (k) => { const t = k * (dur + hold); pl.lift = t < up ? h * (1 - Math.pow(1 - t / up, 2)) : t < up + hold ? h : h * (1 - Math.pow((t - up - hold) / down, 2)); }, end: () => { pl.lift = 0; } });
  }
  // v0.35: ดูดมอนในรัศมี r (พิกเซล) เข้าหาจุด (cx, cy) ทีละ step
  pullMobs(cx, cy, r, step) {
    if (!this.mobs) return;
    for (const m of this.mobs.list) {
      if (m.dead || m.data.mvp) continue;
      const dx = cx - m.x, dy = cy - m.y, d = Math.hypot(dx, dy);
      if (d > r || d < TILE * 0.6) continue;
      const s = Math.min(step, d - TILE * 0.5);
      m.moveBy((dx / d) * s, (dy / d) * s, this.map); m.path = []; m.repath = 0.3; m.pulledUntil = this.time + 0.4;
    }
  }

  // ผลักมอนกระเด็นออกจากจุด from (หน่วยช่อง) ชนกำแพงก็หยุด
  knockback(m, from, tiles) {
    if (!tiles || m.dead) return;
    const dx = m.x - from.x, dy = m.y - from.y, d = Math.hypot(dx, dy) || 1;
    const step = (tiles * TILE) / 8;
    for (let i = 0; i < 8; i++) if (!m.moveBy((dx / d) * step, (dy / d) * step, this.map)) break;
    m.path = []; m.repath = 0;
  }

  freezeMob(m, secs) {
    if (m.dead) return;
    m.frozenUntil = this.time + secs; m.frozen = true;
    this.gfx.floatText(m, 'แช่แข็ง!', 'status ice', { life: 1.2, rise: 0.6, drift: false });
    this.gfx.bursts.spawn(m.x / TILE, 0.5, m.y / TILE, '#bfeeff', 16, 1.4, 1.2);
  }

  stunMob(m, secs) {
    if (m.dead) return;
    m.stunUntil = this.time + secs; m.stunned = true;
    this.gfx.floatText(m, 'มึน!', 'status stun', { life: 1.2, rise: 0.6, drift: false });
    this.gfx.emote(m, '✶');
  }

  /* ---------- เปลี่ยนอาชีพ (v0.6) ---------- */

  jobMenu(npc, text) {
    const pl = this.player, st = pl.jobChangeStatus();
    const bye = { label: 'ไว้คราวหลัง', cls: 'ghost', onSelect: () => this.endService() };
    const info = { label: 'อาชีพมีอะไรบ้าง?', keepOpen: true, onSelect: () => this.jobInfo(npc, 0) };
    if (!st.novice) { this.job2Menu(npc); return; }   // v0.31: อาชีพขั้นที่ 2
    if (!st.ok) {
      const mark = (ok) => (ok ? '✓' : '✗');
      this.dialog.show(npc, `${text}\n\nเงื่อนไขเปลี่ยนอาชีพ\n${mark(st.jobLv >= st.needJob)} Job Lv.${st.needJob} (ตอนนี้ ${st.jobLv})\n${mark(st.basic >= st.needBasic)} สกิล ทักษะพื้นฐาน Lv.9 (ตอนนี้ ${st.basic})`, [
        info,
        { label: 'อัปทักษะพื้นฐานยังไง?', keepOpen: true, onSelect: () => this.dialog.show(npc, 'ทุกครั้งที่ Job Lv. เพิ่ม เจ้าจะได้ Skill Point 1 แต้ม กด K หรือปุ่ม "สกิล" แล้วกด + ที่ ทักษะพื้นฐาน จนครบ Lv.9 จากนั้นกลับมาหาข้า', [
          { label: 'เปิดหน้าต่างสกิล', onSelect: () => { this.endService(); this.toggleSkills(true); } }, bye]) },
        bye,
      ]);
      return;
    }
    this.dialog.show(npc, 'เจ้าผ่านการฝึกขั้นพื้นฐานแล้ว! เลือกเส้นทางของเจ้า — เปลี่ยนแล้วจะเปลี่ยนกลับไม่ได้นะ', [
      ...FIRST_JOBS.map((j) => ({ label: `${JOBS[j].name} · ${JOBS[j].thai}`, sub: JOBS[j].role, keepOpen: true, onSelect: () => this.confirmJob(npc, j) })),
      bye,
    ]);
  }

  /* ---------- v0.31: เลื่อนขั้นอาชีพขั้นที่ 2 ---------- */
  job2Menu(npc) {
    const pl = this.player, L = this.questLog, bye = { label: 'ไว้คราวหลัง', cls: 'ghost', onSelect: () => this.endService() };
    if (jobTier(pl.jobId) >= 2) { this.job3Menu(npc); return; }   // v0.85 อาชีพคลาส 3
    const qid = JOB2_QUEST[pl.jobId], st = pl.job2Status(qid && L.isDone(qid));
    if (st.second || !st.next) {
      this.dialog.show(npc, `${pl.job} ${pl.name}! เจ้าเดินมาถึงขั้นสูงของเส้นทางแล้ว ฝึก Job Lv. ให้ถึง ${JOBS[pl.jobId].maxJobLevel || 70} เพื่อปลดล็อกสกิลทั้งหมด`, [bye]);
      return;
    }
    const N = JOBS[st.next], mark = (ok) => (ok ? '✓' : '✗');
    const why = `${mark(st.jobLv >= st.needJob)} Job Lv.${st.needJob} (ตอนนี้ ${st.jobLv})\n${mark(st.quest)} ผ่านเควส "${QUESTS[qid].name}"`;
    const about = { label: `${N.name} คืออะไร?`, keepOpen: true, onSelect: () => this.dialog.show(npc, `${N.name} (${N.thai}) — ${N.role}\n${N.desc}\n\nได้สกิลใหม่ 7 อย่าง อาวุธเฉพาะอาชีพ และ Job Lv. สูงสุด ${N.maxJobLevel}\nโบนัสสเตตัสจาก Job Lv. ของ ${pl.job} ยังอยู่ครบ`, [{ label: 'กลับ', keepOpen: true, onSelect: () => this.job2Menu(npc) }, bye]) };
    if (!st.ok) {
      this.dialog.show(npc, `${pl.job} ${pl.name}! อยากเลื่อนขั้นเป็น ${N.name} (${N.thai}) ใช่ไหม?\n\nเงื่อนไขเลื่อนขั้น\n${why}${st.jobLv >= st.needJob && !st.quest ? '\n\nคุยกับข้าเพื่อรับเควสบททดสอบได้เลย' : ''}`, [about, bye]);
      return;
    }
    this.dialog.show(npc, `เจ้าผ่านบททดสอบแล้ว! พร้อมจะเป็น ${N.name} (${N.thai}) หรือยัง?\nสกิลและแต้มที่มีอยู่จะยังอยู่ครบ — เลื่อนขั้นแล้วย้อนกลับไม่ได้`, [
      { label: `เลื่อนขั้นเป็น ${N.name}`, cls: 'primary', onSelect: () => this.doJobChange2(npc) }, about, bye]);
  }

  /* ---------- v0.85: เลื่อนเป็นอาชีพคลาส 3 ---------- */
  job3Menu(npc) {
    const pl = this.player, L = this.questLog, bye = { label: 'ไว้คราวหลัง', cls: 'ghost', onSelect: () => this.endService() };
    const qid = JOB3_QUEST[pl.jobId], st = pl.job3Status(qid && L.isDone(qid));
    if (st.third || !st.next) {
      this.dialog.show(npc, `${pl.job} ${pl.name}! เจ้าคือผู้อยู่บนยอดสุดของเส้นทางแล้ว ฝึก Job Lv. ให้ถึง ${JOBS[pl.jobId].maxJobLevel || 50} เพื่อปลดล็อกพลังทั้งหมด`, [bye]);
      return;
    }
    const N = JOBS[st.next], mark = (ok) => (ok ? '✓' : '✗');
    const why = `${mark(st.baseLv >= st.needBase)} Base Lv.${st.needBase} (ตอนนี้ ${st.baseLv})\n${mark(st.jobLv >= st.needJob)} Job Lv.${st.needJob} (ตอนนี้ ${st.jobLv})\n${mark(st.quest)} ผ่านเควส "${QUESTS[qid].name}"`;
    const about = { label: `${N.name} คืออะไร?`, keepOpen: true, onSelect: () => this.dialog.show(npc, `${N.name} (${N.thai}) — ${N.role}\n${N.desc}\n\nอาชีพคลาส 3 · ได้สกิลใหม่ 5 อย่าง และ Job Lv. สูงสุด ${N.maxJobLevel}\nสกิลและโบนัสสเตตัสจากอาชีพขั้น 1 และขั้น 2 ยังอยู่ครบ`, [{ label: 'กลับ', keepOpen: true, onSelect: () => this.job3Menu(npc) }, bye]) };
    if (!st.ok) {
      const ready = st.jobLv >= st.needJob && st.baseLv >= st.needBase && !st.quest;
      this.dialog.show(npc, `${pl.job} ${pl.name}! อยากก้าวขึ้นเป็น ${N.name} (${N.thai}) — อาชีพคลาส 3 ใช่ไหม?\n\nเงื่อนไข\n${why}${ready ? '\n\nคุยกับข้าเพื่อรับเควสบททดสอบได้เลย' : ''}`, [about, bye]);
      return;
    }
    this.dialog.show(npc, `เจ้าผ่านบททดสอบสุดท้ายแล้ว! พร้อมจะเป็น ${N.name} (${N.thai}) หรือยัง?\nสกิลและแต้มที่มีอยู่จะยังอยู่ครบ — เลื่อนขั้นแล้วย้อนกลับไม่ได้`, [
      { label: `เลื่อนขั้นเป็น ${N.name}`, cls: 'primary', onSelect: () => this.doJobChange3(npc) }, about, bye]);
  }

  doJobChange3(npc) {
    const pl = this.player, qid = JOB3_QUEST[pl.jobId], from = pl.jobId;
    const res = pl.changeJob3(qid && this.questLog.isDone(qid));
    if (res.error) { this.hud.log(res.error, 'sys'); return; }
    const J = JOBS[res.job];
    this.endService();
    this.gfx.refreshLook(pl);
    this.gfx.jobChangeFx(pl, J.color);
    if (this.gfx.fx && this.gfx.fx.play) this.gfx.fx.play('class_ascend', { ...this.fxCtxSelf(J.color), sigil: from });
    this.hud.levelBanner(`${J.name}!`, `ก้าวขึ้นเป็น${J.thai} — อาชีพคลาส 3`);
    this.hud.log(`ยินดีด้วย! คุณเลื่อนขั้นเป็น ${J.name} (${J.thai}) — อาชีพคลาส 3`, 'lv');
    if (pl.inventory.add('skill_reset', 1, true) > 0) this.hud.log(`ได้รับ ${ITEMS.skill_reset.name} x1 (ของขวัญเลื่อนขั้น)`, 'r-epic');
    this.hud.log('กด K เพื่อดูสกิลใหม่ 5 อย่างในแท็บ ' + J.name, 'info');
    npc.bubble = { text: `ทั้งโลกจะจดจำชื่อ ${J.name}!`, t: 3 };
    this.collection && (this.collection.evalT = 1);
    this.hud.setPlayer(pl); this.hud.setBuffs(pl.buffs); this.refreshItemsUI(); this.status.render(); this.skillWin.render();
    this.dirty = true;
    this.saveNow(false);
  }

  doJobChange2(npc) {
    const pl = this.player, qid = JOB2_QUEST[pl.jobId];
    const res = pl.changeJob2(qid && this.questLog.isDone(qid));
    if (res.error) { this.hud.log(res.error, 'sys'); return; }
    const J = JOBS[res.job];
    this.endService();
    this.gfx.refreshLook(pl);
    this.gfx.jobChangeFx(pl, J.color);
    if (this.gfx.fx && this.gfx.fx.play) this.gfx.fx.play('class_ascend', { ...this.fxCtxSelf(J.color), sigil: res.job });
    this.hud.levelBanner(`${J.name}!`, `เลื่อนขั้นเป็น${J.thai}แล้ว`);
    this.hud.log(`ยินดีด้วย! คุณเลื่อนขั้นเป็น ${J.name} (${J.thai}) — อาชีพขั้นที่ 2`, 'lv');
    if (res.gift) this.hud.log(`ได้รับ ${ITEMS[res.gift].name}${res.equippedGift ? ' และสวมใส่แล้ว' : ' (อยู่ในกระเป๋า)'}`, 'r-epic');
    if (pl.inventory.add('skill_reset', 1, true) > 0) this.hud.log(`ได้รับ ${ITEMS.skill_reset.name} x1 (ของขวัญเลื่อนขั้น)`, 'r-epic');
    this.hud.log('กด K เพื่อดูสกิลใหม่ 7 อย่างในแท็บ ' + J.name, 'info');
    npc.bubble = { text: `ขอให้เกียรติของ ${J.name} อยู่กับเจ้า!`, t: 3 };
    this.collection && (this.collection.evalT = 1);
    this.hud.setPlayer(pl); this.hud.setBuffs(pl.buffs); this.refreshItemsUI(); this.status.render(); this.skillWin.render();
    this.dirty = true;
    this.saveNow(false);
  }

  // ctx ขั้นต่ำสำหรับเอฟเฟกต์ที่เล่นรอบตัวผู้เล่น (ไม่มีศัตรู)
  fxCtxSelf() {
    const pl = this.player, S = 1 / TILE;
    return {
      caster: { pos: new THREE.Vector3(pl.x * S, 0, pl.y * S), facing: new THREE.Vector3(Math.sin(pl.angle), 0, Math.cos(pl.angle)), height: 1.8 },
      targets: [], main: -1, center: new THREE.Vector3(pl.x * S, 0, pl.y * S), count: 0,
      hit: () => ({}), heal: () => {}, buff: () => {}, anim: (k, d) => this.heroAnim(k, d), shake: (a) => this.gfx.shake(a), sky: (d, t) => this.gfx.skyFx(d, t),
      flash: (c, a) => this.gfx.post.flash(c, a), shock: (p, s) => this.gfx.shockAt(p, s),
    };
  }

  // อธิบายอาชีพทีละอาชีพ
  jobInfo(npc, i) {
    const j = FIRST_JOBS[i], J = JOBS[j];
    const opts = [];
    if (i < FIRST_JOBS.length - 1) opts.push({ label: `ถัดไป: ${JOBS[FIRST_JOBS[i + 1]].name}`, keepOpen: true, onSelect: () => this.jobInfo(npc, i + 1) });
    opts.push({ label: 'กลับ', keepOpen: true, onSelect: () => this.jobMenu(npc, npc.greet) });
    opts.push({ label: 'ไว้คราวหลัง', cls: 'ghost', onSelect: () => this.endService() });
    this.dialog.show(npc, `${J.name} (${J.thai}) — ${J.role}\n${J.desc}`, opts);
  }

  confirmJob(npc, j) {
    const J = JOBS[j];
    this.dialog.show(npc, `${J.desc}\n\nจะเป็น ${J.name} จริงหรือ? (ได้รับอาวุธประจำอาชีพฟรี)`, [
      { label: `ยืนยัน เป็น ${J.name}`, cls: 'primary', onSelect: () => this.doJobChange(npc, j) },
      { label: 'กลับไปเลือกใหม่', keepOpen: true, onSelect: () => this.jobMenu(npc, npc.greet) },
      { label: 'ไว้คราวหลัง', cls: 'ghost', onSelect: () => this.endService() },
    ]);
  }

  doJobChange(npc, j) {
    const pl = this.player, J = JOBS[j];
    const res = pl.changeJob(j);
    if (res.error) { this.hud.log(res.error, 'sys'); return; }
    this.endService();
    this.gfx.refreshLook(pl);
    this.gfx.jobChangeFx(pl, J.color);
    this.hud.levelBanner(`${J.name}!`, `เปลี่ยนอาชีพเป็น${J.thai}แล้ว`);
    this.hud.log(`ยินดีด้วย! คุณเปลี่ยนอาชีพเป็น ${J.name} (${J.thai}) แล้ว`, 'lv');
    for (const id of res.removed) this.hud.log(`ถอด ${ITEMS[id].name} เพราะ ${J.name} ใช้ไม่ได้ (เก็บไว้ในกระเป๋า)`, 'sys');
    if (res.gift) this.hud.log(`ได้รับ ${ITEMS[res.gift].name}${res.equippedGift ? ' และสวมใส่แล้ว' : ' (อยู่ในกระเป๋า)'}`, 'r-uncommon');
    // v0.13: ของขวัญเปลี่ยนอาชีพ — ใบรีเซ็ตสถานะ/สกิลฟรีอย่างละ 1 ใบ
    for (const g of ['stat_reset', 'skill_reset']) if (pl.inventory.add(g, 1, true) > 0) this.hud.log(`ได้รับ ${ITEMS[g].name} x1 (ของขวัญเปลี่ยนอาชีพ)`, 'r-epic');
    this.hud.log('กด K เพื่อดูสกิลใหม่ของอาชีพนี้', 'info');
    npc.bubble = { text: 'ขอให้โชคดีในเส้นทางใหม่!', t: 3 };
    this.hud.setPlayer(pl);
    this.hud.setBuffs(pl.buffs);
    this.refreshItemsUI();
    this.status.render();
    this.skillWin.render();
    this.dirty = true;
    this.saveNow(false);
  }

  // ได้รับ EXP จากการกำจัดมอนสเตอร์
  expMul() {
    const pl = this.player;
    const ek = (1 + ((pl.bonus && pl.bonus.expPct) || 0) / 100) * this.vipMul(), bm = +(pl.itemBuffMul('exp') * (this.events?.rate('exp') || 1) * ek).toFixed(2), jm = +(pl.itemBuffMul('jexp') * (this.events?.rate('exp') || 1) * ek).toFixed(2);   // v0.29: EXP% จากคอมโบการ์ด   // v0.13: ใบคูณ EXP / Job
    return { bm, jm };
  }

  reward(m, opt = {}) {
    const pl = this.player, { bm, jm } = this.expMul(), k = opt.expMul ?? 1;
    let rb = Math.round((m.data.baseExp || 0) * k), rj = Math.round((m.data.jobExp || 0) * k);
    const share = this.social && !opt.shared ? this.social.shareKill(rb, rj, m.name) : null;   // MVP ร่วม: ทุกคนได้ส่วนของตัวเองอยู่แล้ว ไม่แบ่งปาร์ตี้ซ้ำ   // v0.37: ปาร์ตี้ในแมพเดียวกันแบ่ง EXP (+20% ต่อคน)
    if (share) { rb = share.b; rj = share.j; }
    const b = Math.round(rb * bm), j = pl.jobNext === Infinity ? 0 : Math.round(rj * jm);
    this.hud.log(`กำจัด ${m.name} · ได้รับ Base EXP ${b}${bm > 1 ? ` (×${bm})` : ''} · Job EXP ${j}${jm > 1 && j ? ` (×${jm})` : ''}${share ? ` · แบ่งปาร์ตี้ ${share.n} คน` : ''}`, 'exp');
    this.gfx.floatText(pl, `+${b} EXP`, 'exp', { h: 2.1, life: 1.3, rise: 0.7 });
    this.applyExp(b, j);
  }

  // v0.37: ส่วนแบ่ง EXP จากเพื่อนในปาร์ตี้ที่กำจัดมอนในแมพเดียวกัน (ค่าดิบ → คูณบัฟ/อีเวนต์ของเราเอง)
  partyExp(rb, rj, from, mob) {
    if (!this.started || this.player.dead) return;
    const pl = this.player, { bm, jm } = this.expMul();
    const b = Math.round(rb * bm), j = pl.jobNext === Infinity ? 0 : Math.round(rj * jm);
    if (!b && !j) return;
    this.hud.log(`[ปาร์ตี้] ${from} กำจัด ${mob || 'มอนสเตอร์'} · ได้รับ Base EXP ${b} · Job EXP ${j}`, 'exp party-exp');
    this.gfx.floatText(pl, `+${b} EXP`, 'exp', { h: 2.1, life: 1.3, rise: 0.7 });
    this.applyExp(b, j);
    this.dirty = true;
  }

  // v0.65.2 ฮีล/บัฟจากสกิลนักบวชถึงเพื่อนในปาร์ตี้ — ฝั่งผู้ร่าย: ส่งผ่านห้องปาร์ตี้ + แสงฮีล/บัฟบนตัวเพื่อนที่อยู่ในรัศมี
  supportParty(kind, id, lv, amount = 0) {
    const sk = SKILLS[id];
    if (!sk || !sk.party || !this.social || this.mode !== 'online') return;
    if (!this.social.sendSupport(kind, { s: id, lv, a: Math.round(amount), r: sk.party })) return;
    const pl = this.player, color = sk.color || sk.icon[1], reach = sk.party * TILE + 6;
    for (const r of this.remote.list.values()) {
      if (r.dead || !r.peer || !this.social.members.has(r.peer.peer) || Math.hypot(r.x - pl.x, r.y - pl.y) > reach) continue;
      if (kind === 'hl') this.gfx.healFx(r, color); else this.gfx.buffFx(r, color);
    }
  }

  // ฝั่งเพื่อนที่ได้รับ (Social.onSupport กรองข้อมูล/ระยะแล้ว) — ใส่ผลกับตัวเราเอง ด้วยค่าที่ผู้ร่ายคำนวณจากสเตตัสของเขา
  onPartySupport(kind, p, from) {
    const sk = SKILLS[p.s], pl = this.player;
    if (!this.started || !sk || !sk.party || pl.dead) return;
    const color = sk.color || sk.icon[1];
    if (kind === 'hl') {
      const amt = Math.max(0, Math.min(pl.maxHp - pl.hp, p.a));
      pl.hp += amt;
      this.gfx.healFx(pl, color);
      if (amt > 0) this.gfx.floatText(pl, `+${amt}`, 'heal', { h: 1.6, drift: false });
      this.hud.setPlayer(pl); this.status.render();
    } else {
      const lv = Math.min(p.lv, sk.maxLv || 10);
      if (sk.shield) { const sh = sk.shield(lv); pl.shield = { id: p.s, lv, charges: sh.charges, until: this.time + sh.secs }; pl.addBuff(p.s, lv, {}, sh.secs); }
      if (sk.bonus) pl.addBuff(p.s, lv, sk.bonus(lv), sk.duration(lv));
      this.gfx.buffFx(pl, color);
      this.hud.log(`[ปาร์ตี้] ${from} ใช้ ${sk.name} Lv.${lv} ให้คุณ`, 'party');
      this.hud.setPlayer(pl); this.hud.setBuffs(pl.buffs); this.status.render();
    }
    this.dirty = true;
  }

  // ให้ EXP + จัดการเลเวลอัป (ใช้ทั้งการกำจัดมอนและรางวัลเควส)
  applyExp(b, j) {
    const pl = this.player;
    if (pl.jobNext === Infinity) j = 0;
    const events = pl.gainExp(b, j);
    let delay = 0.25;
    for (const ev of events) {
      this.schedule(delay, () => {
        this.sfx('levelUp');
        if (ev.kind === 'base') {
          this.gfx.levelUp(pl, false);
          this.hud.log(`เลเวลอัป! Base Lv.${ev.level} · ได้รับ Status Point ${ev.points} แต้ม (HP/SP ฟื้นเต็ม)`, 'lv');
          this.hud.levelBanner(`Base Lv.${ev.level}`, 'เลเวลอัป!');
        } else {
          this.gfx.levelUp(pl, true);
          this.hud.log(`Job Lv.${ev.level} · ได้รับ Skill Point 1 แต้ม (กด K เพื่ออัปสกิล)${pl.jobNext === Infinity ? (pl.jobId === 'novice' ? ' · Job Level สูงสุดแล้ว! อัปทักษะพื้นฐานให้ครบ Lv.9 แล้วไปหาออเรลที่สมาคมนักผจญภัยเพื่อเปลี่ยนอาชีพ' : ' · Job Level สูงสุดแล้ว') : ''}`, 'lv');
        }
      });
      delay += 0.6;
    }
    this.hud.setPlayer(pl);
    this.status.render();
    if (events.length) { this.skillWin.render(); this.refreshQuestUI(); }
    this.dirty = true;
  }

  monsterAttacks(m, target) {
    if (target !== this.player || this.player.dead) return;
    this.gfx.playAttack(m);
    const r = rollAttack(m.stats, this.player.stats);
    this.schedule(0.22, () => {
      const pl = this.player;
      if (pl.dead || m.dead || m.target !== pl) return;
      if (r.miss) { this.gfx.floatText(pl, 'Miss', 'miss'); return; }
      this.damagePlayer(r.amount, m);
    });
  }

  // ผู้เล่นรับดาเมจ (จากมอนหรือท่าพิเศษบอส)
  damagePlayer(amount, src, big = false) {
    const pl = this.player;
    if (pl.dead) return;
    const red = (pl.bonus && pl.bonus.dmgReduce) || 0;   // ม่านพลังเวทย์ลดดาเมจ
    if (red) amount = Math.max(1, Math.round(amount * (1 - Math.min(80, red) / 100)));
    amount = WeaponFx.incoming(this, amount);   // v0.25: พาสซีฟป้องกันของอาวุธ
    // v0.29: การ์ดลดดาเมจจากเผ่า/ธาตุ/ขนาดของมอนที่โจมตี (รวมกันสูงสุด 50%)
    if (src && src.type && pl.bonus) {
      const tr = mobTraits(src.type, src.data || {}), B = pl.bonus;
      const rr = Math.min(50, (B['red_' + tr.race] || 0) + (B['red_' + tr.element] || 0) + (B['red_' + tr.size] || 0));
      if (rr > 0) amount = Math.max(1, Math.round(amount * (1 - rr / 100)));
    }
    // v0.13: ยาต้านหนาว/ร้อน ลดดาเมจในแผนที่หิมะ/ภูเขาไฟ
    const biome = this.map.id === 'frostveil' ? pl.itemBuffSum('dmgCutSnow') : this.map.id === 'ember_caldera' ? pl.itemBuffSum('dmgCutLava') : 0;
    if (biome) amount = Math.max(1, Math.round(amount * (1 - biome / 100)));
    if (pl.cast && pl.cast.item) { this.hud.log(`ถูกโจมตี! ยกเลิกการร่าย ${pl.cast.name}`, 'sys'); pl.cast = null; }
    // v0.35: คำสัตย์ขนนก — ขนนก 1 อันแตกแทน (ดาเมจ 0) ฟื้น HP + ระเบิดแสงใส่ศัตรูข้างตัว
    if (pl.shield && pl.shield.charges > 0 && pl.shield.until > this.time) {
      pl.shield.charges--;
      this.gfx.floatText(pl, 'กัน!', 'buff', { h: 2.2, life: 0.9, rise: 0.4, drift: false });
      this.featherBreak(pl.shield);
      if (pl.shield.charges <= 0) { this.hud.log(`โล่ของ${(SKILLS[pl.shield.id] || {}).name || 'สกิล'}แตกแล้ว`, 'info'); pl.shield = null; }
      return;
    }
    // v0.35: เกราะเกล็ดมังกร — สะท้อนดาเมจส่วนหนึ่งกลับใส่ผู้โจมตี
    const refl = (pl.bonus && pl.bonus.reflectPct) || 0;
    if (refl && src && src.isMonster && !src.dead && this.mobs && this.mobs.list.includes(src)) {
      const back = Math.max(1, Math.round(amount * Math.min(60, refl) / 100));
      this.gfx.bursts.spawn(src.x / TILE, 0.8, src.y / TILE, '#7ab4ff', 10, 1.2, 1.4);
      this.damageMonster(src, { miss: false, crit: false, amount: back }, {});
    }
    pl.hp = Math.max(0, pl.hp - amount);
    pl.lastHitAt = this.time;
    this.wearGear('hit');   // v0.89 ชุดเกราะสึก
    this.sfx('hurt');
    this.gfx.floatText(pl, `${amount}`, big ? 'taken big' : 'taken');
    this.gfx.playHurt(pl);
    this.hud.flashHurt();
    this.hud.setPlayer(pl);
    this.dirty = true;
    // ยืนเฉย ๆ แล้วโดนตี → สู้กลับอัตโนมัติ
    if (src && !src.dead && !pl.target && !pl.path.length && !pl.cast && !pl.pendingSkill && this.auto.allowFightBack(src)) this.setTarget(src);
    if (pl.hp <= 0) this.playerDown();
  }

  knockPlayer(src, tiles) {
    const pl = this.player;
    const dx = pl.x - src.x, dy = pl.y - src.y, d = Math.hypot(dx, dy) || 1;
    const step = (tiles * TILE) / 8;
    for (let i = 0; i < 8; i++) if (!pl.moveBy((dx / d) * step, (dy / d) * step, this.map)) break;
    pl.path = [];
  }

  /* ---------- บอส MVP (v0.7) ---------- */

  updateBosses(dt) {
    if (!this.mobs) return;
    const pl = this.player;
    const rand = ([a, b]) => a + Math.random() * (b - a);
    let show = null;
    for (const m of this.mobs.list) {
      const B = m.data.boss;
      if (!B || m.dead) continue;
      const d = Math.hypot(pl.x - m.x, pl.y - m.y);
      if (m.target === pl || d < 14 * TILE) show = m;
      if (m.target !== pl || pl.dead || m.frozen || m.stunned) continue;
      if (m.busyUntil > this.time) { m.face(pl.x - m.x, pl.y - m.y); continue; }
      if (m.slamCd == null) { m.slamCd = rand(B.slam.cd) * 0.5; m.rootCd = rand(B.roots.cd) * 0.6; }
      m.slamCd -= dt; m.rootCd -= dt;
      if (m.slamCd <= 0 && d < B.slam.radius * TILE * 0.9) { m.slamCd = rand(B.slam.cd); this.bossSlam(m); }
      else if (m.rootCd <= 0 && d < 9 * TILE) { m.rootCd = rand(B.roots.cd); this.bossRoots(m); }
    }
    this.hud.setBoss(show);
    // เพลงบอสเมื่อกำลังสู้กับ MVP
    const fight = !!show && show.target === pl && !pl.dead;
    if (fight !== this.bossMusic) { this.bossMusic = fight; this.audio.music(fight ? 'boss' : (this.map.def.music || 'field')); }
  }

  // ทุบพื้น: วงแดงรอบตัวบอส → ดาเมจแรง + กระเด็น
  bossSlam(m) {
    const B = m.data.boss.slam;
    m.busyUntil = this.time + B.windup + 0.35;
    m.attackCd = Math.max(m.attackCd, B.windup + 0.6);
    this.gfx.telegraph(m.x, m.y, B.radius, B.windup, B.color || '#ff3a3a');
    this.gfx.playSlam(m, B.windup + 0.25);
    this.gfx.emote(m, '!!');
    this.sfx('bossWindup');
    this.schedule(B.windup, () => {
      if (m.dead) return;
      this.gfx.bossSlam(m, B.radius, B.fx);
      this.sfx(B.fx === 'ice' ? 'iceBlast' : B.fx === 'fire' ? 'explosion' : 'slam');
      const pl = this.player;
      if (!pl.dead && Math.hypot(pl.x - m.x, pl.y - m.y) <= B.radius * TILE + 4) {
        const r = rollSkill(m.stats, pl.stats, { mult: B.mult, hitBonus: 60 });
        if (r.miss) { this.gfx.floatText(pl, 'Miss', 'miss'); return; }   // v0.16: หลบได้ = ไม่โดนผลัก
        this.damagePlayer(r.amount, m, true);
        if (!pl.dead) this.knockPlayer(m, B.knock);
      }
    });
  }

  // รากหนาม: วงส้มใต้เท้าผู้เล่น → ดาเมจ + ติดราก (เดินไม่ได้ชั่วครู่)
  bossRoots(m) {
    const B = m.data.boss.roots, pl = this.player;
    const tx = pl.x, ty = pl.y;
    m.busyUntil = this.time + 0.7;
    this.gfx.playAttack(m);
    this.gfx.telegraph(tx, ty, B.radius, B.windup, B.color || '#ff8a2a');
    if (B.fx === 'meteor') this.schedule(Math.max(0, B.windup - 0.35), () => { if (!m.dead) this.gfx.meteorFall(tx, ty); });
    this.schedule(B.windup, () => {
      if (m.dead) return;
      this.gfx.bossStrike(tx, ty, B.radius, B.fx);
      this.sfx(B.fx === 'meteor' ? 'explosion' : B.fx === 'icefall' ? 'iceBlast' : 'slam');
      if (!pl.dead && Math.hypot(pl.x - tx, pl.y - ty) <= B.radius * TILE + 4) {
        const r = rollSkill(m.stats, pl.stats, { mult: B.mult, hitBonus: 60 });
        if (r.miss) { this.gfx.floatText(pl, 'Miss', 'miss'); return; }   // v0.16: หลบได้ = ไม่ติดราก/ไม่ไหม้
        this.damagePlayer(r.amount, m, true);
        if (!pl.dead) {
          if (B.effect === 'burn') {
            // ไหม้: เสีย HP 3% ต่อวินาที ตามจำนวนวินาที
            this.gfx.floatText(pl, 'ไหม้!', 'status root', { h: 2.2, life: 1.2, rise: 0.5, drift: false });
            for (let k = 1; k <= B.secs; k++) this.schedule(k, () => { if (!pl.dead) this.damagePlayer(Math.max(1, Math.round(pl.maxHp * 0.03)), m, false); });
          } else {
            pl.rootedUntil = this.time + B.secs; pl.path = [];
            this.gfx.floatText(pl, B.effect === 'freeze' ? 'แช่แข็ง!' : 'ติดราก!', 'status root', { h: 2.2, life: 1.2, rise: 0.5, drift: false });
          }
        }
      }
    });
  }

  // เรียกวิสป์มาช่วยเมื่อเลือดลดถึงเกณฑ์
  bossSummon(m) {
    const S = m.data.boss.summon;
    this.hud.log(`${m.name} เรียก${MONSTERS[S.mob].name}มาช่วย!`, 'sys');
    for (let i = 0; i < S.count; i++) {
      const a = (i / S.count) * Math.PI * 2 + Math.random();
      let x = m.x + Math.cos(a) * 2.2 * TILE, y = m.y + Math.sin(a) * 2.2 * TILE;
      if (this.map.isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE))) { x = m.x; y = m.y; }
      const w = this.mobs.spawnAt(S.mob, x, y);
      w.summoner = m;   // v0.16: ลูกน้องของบอสตัวนี้ (ปราบบอสแล้วลูกน้องหายเฉพาะของตัวนี้)
      this.gfx.addMonster(w);
      this.gfx.playRespawn(w);
      this.mobs.aggro(w, this.player);
    }
  }

  // ปราบ MVP: ฉลอง + รางวัล MVP เข้ากระเป๋าโดยตรง
  mvpKill(m) {
    const pl = this.player;
    const reward = (m.data.mvpReward || {})[pl.jobId] || (m.data.mvpReward || {})[JOBS[pl.jobId] && JOBS[pl.jobId].parent];   // v0.31: ขั้น 2 ได้ของสายเดิม
    this.gfx.mvpFx(pl);
    this.gfx.floatText(pl, 'MVP!', 'mvp', { h: 2.6, life: 2.6, rise: 0.7, drift: false });
    this.hud.levelBanner('MVP!', `ปราบ ${m.name} สำเร็จ`);
    this.sfx('mvp', { gap: 0 });
    this.hud.log(`★ MVP! คุณปราบ ${m.name} ได้สำเร็จ`, 'r-epic');
    if (reward && Math.random() < 0.25) {   // v0.73 รางวัล MVP ประจำอาชีพ ลุ้น 25% (เดิมได้แน่นอน)
      if (pl.inventory.add(reward, 1) > 0) this.hud.log(`★ รางวัล MVP: ${ITEMS[reward].name} (เข้ากระเป๋าแล้ว)`, 'r-epic');
      else { this.spawnDrop(reward, pl.x, pl.y); this.hud.log(`★ รางวัล MVP: ${ITEMS[reward].name} (กระเป๋าเต็ม จึงตกที่พื้น)`, 'r-epic'); }
    }
    // ลูกน้องที่เรียกมาหายไปพร้อมบอส
    for (const s of this.mobs.list.filter((x) => x.summoner === m && !x.dead)) {
      this.mobs.kill(s, this.time); this.gfx.playDeath(s);
      this.schedule(1.0, () => { this.mobs.remove(s); this.gfx.removeActor(s); });
    }
    this.refreshItemsUI();
    this.dirty = true;
  }

  playerDown() {
    const pl = this.player;
    if (this.tryMiracle()) return;
    this.closeServices();
    pl.cast = null; pl.pendingSkill = null;
    pl.lockUntil = 0; pl.castPose = false; pl.lift = 0; this.heroAnims = [];
    pl.dead = true; pl.hp = 0; pl.path = []; pl.moving = false; pl.pendingPickup = null; pl.pendingTalk = null;
    this.wearGear('death');   // v0.89 ตาย = อุปกรณ์ทุกชิ้นเสียความทนทานเพิ่ม
    this.sfx('refineFail');
    this.clearTarget();
    if (this.mobs) this.mobs.release(pl);
    if (pl.clearCombatBuffs()) this.hud.log('ยาบัฟหมดผลเมื่อหมดสติ (ใบคูณยังอยู่)', 'info');
    this.hud.setPlayer(pl); this.hud.setBuffs(pl.buffs);
    // v0.13: เอมเบอร์ชุบชีวิต · ขนนกคืนชีพ (มีเวลากดก่อนกลับเมือง)
    if (this.pets.tryRevive()) {
      this.hud.log(`🔥 ${this.pets.name} ใช้เปลวไฟคืนชีพ!`, 'f-mythic');
      this.reviveAt = 0;
      this.schedule(1.4, () => { if (pl.dead) this.reviveHere(0.3, 'เปลวไฟคืนชีพ'); });
      return;
    }
    const feathers = pl.inventory.count('phoenix_feather');
    this.hud.log(feathers ? `คุณหมดสติ... ใช้ขนนกคืนชีพเพื่อฟื้นตรงนี้ (มี ${feathers} ชิ้น) หรือรอ 8 วินาทีเพื่อฟื้นที่ Asteria Town` : 'คุณหมดสติ... จะฟื้นขึ้นที่ Asteria Town ใน 3 วินาที', 'sys');
    this.reviveAt = this.time + (feathers ? 8 : 3);
    if (feathers) this.showReviveButton(feathers);
  }

  // v0.35: ปาฏิหาริย์ฟื้นคืน (Priest ติดตัว) — HP หมดแล้วฟื้นทันที มีคูลดาวน์
  tryMiracle() {
    const pl = this.player, sk = SKILLS.miracle, lv = pl.skillLv('miracle');
    if (!sk || !lv || (pl.miracleAt || 0) > this.time) return false;
    const R = sk.revive(lv);
    pl.miracleAt = this.time + R.cd; pl.cooldowns.miracle = pl.miracleAt;
    pl.hp = Math.max(1, Math.round(pl.maxHp * R.hpPct / 100));
    pl.cast = null; pl.pendingSkill = null;
    this.hitstop = Math.max(this.hitstop, 0.4);
    this.gfx.post.flash('#fff6d0', 0.5);
    this.gfx.floatText(pl, 'ปาฏิหาริย์!', 'loot r-legend', { h: 2.4, life: 1.8, rise: 0.7, drift: false });
    this.hud.log(`✨ ปาฏิหาริย์ฟื้นคืน! ฟื้น HP ${R.hpPct}% (คูลดาวน์ ${R.cd / 60} นาที)`, 'f-mythic');
    this.sfx('levelUp', { gap: 0 });
    this.playSkillFx('miracle', lv, null, { vfx: 'miracle' });
    // ผลักศัตรูรอบตัวกระเด็น
    if (this.mobs) for (const m of this.mobs.list) if (!m.dead && !m.data.mvp && Math.hypot(m.x - pl.x, m.y - pl.y) <= 2.5 * TILE) this.knockback(m, pl, 2);
    this.hud.setPlayer(pl); this.hotbar.render(); this.dirty = true;
    return true;
  }
  // v0.35: ขนนกคำสัตย์แตก — ฟื้น HP และระเบิดแสงใส่ศัตรูรอบตัว
  featherBreak(sh) {   // v0.63 โล่นับฮิตแบบทั่วไป (ปราการศักดิ์สิทธิ์ / สระบัวพิทักษ์) · sk.shieldHeal = ฟื้น HP ทุกครั้งที่โล่กันได้
    const pl = this.player, sk = SKILLS[sh.id], lv = sh.lv || 1;
    if (!sk) return;
    const amt = Math.max(0, Math.min(pl.maxHp - pl.hp, Math.round((sval(sk.shieldHeal, lv, pl) || 0) * (1 + ((pl.bonus && pl.bonus.healPct) || 0) / 100))));
    pl.hp += amt;
    if (amt > 0) this.gfx.floatText(pl, `+${amt}`, 'heal', { h: 1.6, drift: false });
    this.gfx.healFx(pl, '#ffe8a0');
    this.hud.setPlayer(pl);
  }

  // ปุ่มกลางจอตอนหมดสติ (มีขนนกคืนชีพ)
  showReviveButton(n) {
    this.hideReviveButton();
    const b = this.reviveBtn = document.createElement('button');
    b.type = 'button'; b.className = 'revive-btn';
    b.innerHTML = `<img alt="" src="${iconURL('phoenix_feather')}"><span>ใช้ขนนกคืนชีพ<small>เหลือ ${n} ชิ้น · ฟื้นตรงนี้ HP 50%</small></span>`;
    b.addEventListener('click', () => this.useItem('phoenix_feather'));
    for (const ev of ['pointerdown', 'touchstart']) b.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    this.root.append(b);
  }
  hideReviveButton() { if (this.reviveBtn) { this.reviveBtn.remove(); this.reviveBtn = null; } }

  // ฟื้นตรงจุดที่ล้ม (ขนนกคืนชีพ / เอมเบอร์)
  reviveHere(frac, source) {
    const pl = this.player;
    if (!pl.dead) return;
    this.reviveAt = 0;
    this.hideReviveButton();
    pl.dead = false;
    pl.hp = Math.max(1, Math.round(pl.maxHp * frac)); pl.sp = Math.max(pl.sp, Math.round(pl.maxSp * frac));
    this.gfx.healFx(pl, '#ffb040');
    this.gfx.bursts.spawn(pl.x / TILE, 0.8, pl.y / TILE, '#ff8a3a', 34, 1.6, 2.6);
    this.gfx.floatText(pl, 'คืนชีพ!', 'loot r-legend', { h: 2.3, life: 1.8, rise: 0.7, drift: false });
    this.sfx('levelUp', { gap: 0 });
    this.hud.log(`ฟื้นคืนชีพตรงจุดเดิมด้วย${source} (HP ${Math.round(frac * 100)}%)`, 'lv');
    this.hud.setPlayer(pl);
    this.dirty = true;
  }

  revive() {
    const pl = this.player;
    this.reviveAt = 0;
    this.hideReviveButton();
    this.warp(START_MAP, null, () => {
      pl.dead = false; pl.hp = pl.maxHp; pl.sp = pl.maxSp;
      this.hud.setPlayer(pl);
      this.hud.log('คุณฟื้นขึ้นที่ลานน้ำพุ', 'sys');
    });
  }

  schedule(delay, fn) { this.timeline.push({ at: this.time + delay, fn }); }

  // ฟื้นพลังตามเวลา (เร็วขึ้นในเมืองหรือข้างกองไฟ)
  regen(dt) {
    const pl = this.player;
    this.regenTimer += dt;
    if (this.regenTimer < 1) return;
    this.regenTimer = 0;
    if (pl.dead || (this.time - pl.lastHitAt < 5 && !pl.itemBuffSum('combatRegen'))) return;
    let rate = 0.012;
    const def = this.map.def;
    if (def.safe) rate = 0.03;
    for (const s of def.restSpots || []) if (Math.hypot(pl.x / TILE - s.x, pl.y / TILE - s.y) < s.r) rate = 0.06;
    rate *= pl.derived.regen;
    if (pl.hp < pl.maxHp || pl.sp < pl.maxSp) {
      pl.hp = Math.min(pl.maxHp, pl.hp + Math.max(1, pl.maxHp * rate));
      pl.sp = Math.min(pl.maxSp, pl.sp + Math.max(1, pl.maxSp * rate * 0.6 * (pl.derived.spRegen || 1)));
      this.hud.setPlayer(pl);
      this.status.render();
    }
  }

  /* ---------- อัปเดตทุกเฟรม ---------- */

  update(dt) {
    this.time += dt;
    this.events?.update(dt);
    this.mvp?.update(dt);
    this.bossWin?.update(dt);
    this.seasonWin?.update(dt);   // v0.76
    this.arenaWin?.update(dt);   // v0.78
    // v0.76 รายชื่อผู้ถือฉายาฤดูกาล (หอเกียรติยศ) — โหลดตอนเริ่มและทุก 10 นาที
    if (this.mode === 'online' && this.online && this.online.seasonRPC && !this.seasonOff) {
      this.holdersT = (this.holdersT ?? 3) - dt;
      if (this.holdersT <= 0) { this.holdersT = 600; this.online.seasonRPC('season_hall').then((h) => { setSeasonHolders(h); this.dirty = true; this.collection?.changed?.(); }).catch((e) => { if (e.missing) this.seasonOff = true; }); }
    }
    if (this.dailyWin) {   // v0.74
      this.dailyWin.update(dt);
      this.dailyT = (this.dailyT || 0) - dt;
      if (this.dailyDirty || this.dailyT <= 0) { this.dailyT = 2; if (this.dailyDirty && this.dailyWin.open) this.dailyWin.render(); this.dailyDirty = false; this.updateDailyBadge(); }
    }
    this.gxWin?.update(dt);
    const pl = this.player, input = this.input;

    const cam = input.consumeCamera();
    if (cam.rotate) this.gfx.rotateCamera(cam.rotate);
    if (cam.tilt) { this.gfx.tiltCamera(cam.tilt); this.dirty = true; }   // v0.17.1
    if (cam.zoom !== 1) { this.gfx.zoomCamera(cam.zoom); this.dirty = true; }

    if (this.warping) { input.consumeTaps(); input.consumePresses(); input.consumeAttack(); return; }

    // ชี้เมาส์บนมอน → แสดงชื่อ + เปลี่ยนเคอร์เซอร์
    this.hoverTimer -= dt;
    if (this.hoverTimer <= 0) {
      this.hoverTimer = 0.08;
      const h = input.hover && !input.pointer.down ? this.gfx.pickActor(input.hover.x, input.hover.y) : null;
      const hd = !h && input.hover && !input.pointer.down ? this.gfx.pickDrop(input.hover.x, input.hover.y) : null;
      this.gfx.setHover(h);
      if (hd !== this.gfx.hoverDrop) this.gfx.setHoverDrop(hd);
      this.canvas.style.cursor = h ? (h.isMonster ? 'crosshair' : 'help') : hd ? 'grab' : 'pointer';
    }

    if (this.gacha.open) { input.consumeTaps(); input.consumePresses(); input.consumeAttack(); }   // หน้าต่างเปิดกล่องบังจออยู่
    // v0.16: นิ้วเริ่มแตะ → ตัดสินทันทีว่ากดค้างแล้วจะเดิน (พื้น) หรือไม่ (มอน/NPC/ของ)
    for (const pr of input.consumePresses()) this.holdMove = !this.player.dead && !this.gfx.pickActor(pr.x, pr.y) && !this.gfx.pickDrop(pr.x, pr.y);
    for (const t of input.consumeTaps()) this.handleTap(t);
    if (input.consumeAttack()) this.targetNearest();
    if (input.pointer.down && this.holdMove && !pl.dead) {
      input.pointer.held += dt;
      this.retargetTimer -= dt;
      if (input.pointer.held > 0.35 && this.retargetTimer <= 0) { // กดค้าง = เดินตามเคอร์เซอร์
        this.retargetTimer = 0.18;
        input.pointer.walked = true;
        const w = this.gfx.pickGround(input.pointer.x, input.pointer.y);
        pl.pendingTalk = null;
        if (w) { this.moveTo(w.x, w.y, true); this.auto.manual(); }
      }
    }

    // ท่าสกิล (กระโดด/หมุน) + ท่าร่ายค้าง
    for (let i = this.heroAnims.length - 1; i >= 0; i--) {
      const a = this.heroAnims[i]; a.t += dt;
      const k = Math.min(1, a.t / a.dur); a.fn(k);
      if (k >= 1) { this.heroAnims.splice(i, 1); if (a.end) a.end(); }
    }
    if (pl.castPose && pl.castPoseUntil <= this.time) pl.castPose = false;
    // v0.35: ร่างดารา — ลอยตัวตลอดบัฟ · สายเลือดมังกร — คำนวณค่าใหม่เมื่อข้ามเส้น HP 30%
    if (!this.heroAnims.length && !pl.dead) {
      if (pl.bonus && pl.bonus.hover) { pl.lift = 0.28 + Math.sin(this.time * 2.4) * 0.08; pl.hovering = true; }
      else if (pl.hovering) { pl.lift = 0; pl.hovering = false; }
    }
    if (pl.skillLv('dragon_vein')) { const low = pl.hp < pl.maxHp * 0.3; if (low !== !!pl.lowHp) { pl.lowHp = low; pl.afterEquipChange(); this.hud.setPlayer(pl); if (low) this.gfx.floatText(pl, 'มังกรตื่น!', 'buff', { h: 2.4, life: 1.4, rise: 0.5, drift: false }); } }
    if (pl.shield && pl.shield.until <= this.time) pl.shield = null;
    const locked = pl.lockUntil > this.time;   // ระหว่างท่าสกิลยืนนิ่ง (เส้นทางที่แตะไว้จะเดินต่อเมื่อท่าจบ)

    // หมุนทิศการเดินตามมุมกล้อง (ปุ่ม "ขึ้น" = เดินเข้าหาจอเสมอ)
    const rooted = pl.rootedUntil > this.time;
    if (rooted) pl.path = [];
    const v = pl.dead || rooted || locked || this.gacha.open ? { x: 0, y: 0 } : input.moveVector();
    let mv = v;
    if (v.x || v.y) {
      const yaw = this.gfx.yaw, c = Math.cos(yaw), s = Math.sin(yaw);
      mv = { x: c * v.x + s * v.y, y: -s * v.x + c * v.y };
      if (pl.target) this.clearTarget();
      pl.pendingPickup = null;
      if (pl.cast) this.cancelCast();
      pl.pendingSkill = null;
      this.auto.manual();   // v0.14: เดินเองระหว่างออโต้ = ย้ายจุดตี
    }

    this.auto.update(dt);   // v0.14: ตีมอนออโต้ + ยาอัตโนมัติ
    this.mailbox.update(dt);   // v0.15: เช็กจดหมายใหม่ทุก 3 นาที (ออนไลน์)
    this.collection.update(dt); this.colWin.update(dt);   // v0.18
    if (!pl.dead) this.updatePlayerCombat(dt);
    const ox = pl.x, oy = pl.y;
    if (rooted) pl.path = [];   // ติดราก: เดินไม่ได้ (แต่ยังโจมตี/ใช้สกิลได้)
    if (!pl.dead && !locked) pl.update(dt, mv, this.map); else { pl.moving = false; pl.speedFactor = 0; }
    if (pl.x !== ox || pl.y !== oy) this.dirty = true;

    this.useCd = Math.max(0, this.useCd - dt);
    if (pl.bubble) { pl.bubble.t -= dt; if (pl.bubble.t <= 0) pl.bubble = null; }   // ข้อความแชตเหนือหัว
    // บัฟหมดเวลา + อัปเดตคูลดาวน์บนปุ่มลัด
    const gone = pl.updateBuffs(dt);
    if (gone.length) {
      for (const bf of gone) if (SKILLS[bf.id]) this.hud.log(`${SKILLS[bf.id].name} หมดเวลา`, 'info');
      this.hud.setPlayer(pl); this.status.render();
    }
    // v0.13: บัฟจากไอเทม (นับเวลาเฉพาะตอนเล่นอยู่) + สัตว์เลี้ยง + หาเพื่อนหลังวาร์ป
    const goneI = pl.updateItemBuffs(dt);
    if (goneI.length) {
      for (const id of goneI) this.hud.log(`${ITEMS[id] ? ITEMS[id].name : id} หมดเวลา`, 'info');
      this.hud.setPlayer(pl); this.status.render(); this.dirty = true;
    }
    this.pets.update(dt);
    if (this.friendSeek) this.seekFriend();
    this.uiTimer -= dt;
    if (this.uiTimer <= 0) { this.uiTimer = 0.1; this.hotbar.tick(this.time); this.hud.setBuffs(pl.buffs); }
    // เก็บของเมื่อเดินไปถึง
    if (pl.pendingPickup) {
      const d = pl.pendingPickup;
      if (!this.drops.includes(d)) pl.pendingPickup = null;
      else if (Math.hypot(pl.x - d.x, pl.y - d.y) < 22) { pl.pendingPickup = null; pl.path = []; this.pickup(d); }
      else if (!pl.path.length) pl.pendingPickup = null;
    }
    // ไอเทมบนพื้นหายไปเมื่อหมดเวลา (กะพริบก่อน 10 วินาที)
    for (const d of this.drops) d.blink = d.expireAt - this.time < 10;
    const expired = this.drops.filter((d) => d.expireAt <= this.time);
    if (expired.length) { for (const d of expired) this.gfx.removeDrop(d); this.drops = this.drops.filter((d) => d.expireAt > this.time); }

    if (pl.pendingTalk && !pl.path.length) {
      const npc = pl.pendingTalk; pl.pendingTalk = null;
      if (Math.hypot(pl.x - npc.x, pl.y - npc.y) < 34) this.talkTo(npc);
    }
    if (pl.arrived || (mv.x || mv.y)) this.gfx.hideMarker();

    for (const n of this.npcs) n.update(dt);
    // เดินออกห่าง NPC เกิน 5 ช่อง → ปิดร้าน/คลัง/กล่องสนทนา
    if (this.activeNpc && (!this.npcs.includes(this.activeNpc) || Math.hypot(pl.x - this.activeNpc.x, pl.y - this.activeNpc.y) > 5 * TILE)) this.closeServices();
    if (this.mobs) {
      // v0.72.1 ให้มอนเกิดใหม่รอบจุดที่ผู้เล่นตีอยู่: เปิดออโต้ = วงออโต้ (ระยะที่ตั้ง + 2 ช่อง) · ไม่ได้เปิด = 12 ช่องรอบตัว
      const au = this.auto;
      this.mobs.focus = au && au.on && au.anchor ? { x: au.anchor.x, y: au.anchor.y, r: Math.max(2, (au.cfg.range || 10) - 0.5), auto: true } : (pl.dead ? null : { x: pl.x, y: pl.y, r: 12 });
      this.mobs.update(dt, this.time, pl, {
        onAttack: (m, t) => this.monsterAttacks(m, t),
        onRespawn: (m) => {
          this.gfx.playRespawn(m);
          if (m.data.mvp) { this.hud.log(`⚠ MVP ${m.name} ปรากฏตัวที่ (${Math.floor(m.x / TILE)}, ${Math.floor(m.y / TILE)}) — ดูตำแหน่งบนแผนที่ย่อ`, 'r-epic'); this.gfx.shake(0.25); this.sfx('bossWindup'); }
        },
        onAggro: (m) => this.gfx.emote(m, '!'),
      });
    }

    // เหตุการณ์ตั้งเวลา
    if (this.timeline.length) {
      const due = this.timeline.filter((e) => e.at <= this.time);
      if (due.length) { this.timeline = this.timeline.filter((e) => e.at > this.time); for (const e of due) e.fn(); }
    }
    this.hud.updateTarget();
    this.updateBosses(dt);
    this.dungeon.update(dt);
    if (this.pd) this.pd.update(dt);
    if (this.arena) this.arena.update(dt);   // v0.78
    if (this.festival) this.festival.update(dt);   // v0.79

    // ประตูมิติ
    if (!pl.dead) {
      for (const p of this.map.portals) {
        const inside = this.inRect(pl, p.rect);
        if (inside && !p.inside) {
          if (p.locked || (!p.to && !p.onEnter)) this.hud.log(p.message || 'ประตูมิตินี้ยังใช้ไม่ได้', 'sys');
          else if (p.onEnter) { p.inside = true; p.onEnter(); return; }   // v0.32: ประตูในดันเจี้ยน (ลงชั้น/ออก)
          else { p.inside = true; this.warp(p.to, p.arrive); return; }
        }
        p.inside = inside;
      }
    }

    if (pl.dead && this.reviveAt && this.time >= this.reviveAt) this.revive();
    if (this.reviveBtn && !pl.dead) this.hideReviveButton();
    this.regen(dt);
    this.hud.setCoords(Math.floor(pl.x / TILE), Math.floor(pl.y / TILE));

    this.saveTimer += dt;
    if (this.saveTimer >= AUTOSAVE_SECONDS) { this.saveTimer = 0; if (this.dirty) this.saveNow(false); }
  }

  /* ---------- บันทึก (v0.11: ออนไลน์ = คลาวด์ + สำรองในเครื่อง · ออฟไลน์ = ในเครื่อง) ---------- */

  // v0.42: ผลการแลก/ตลาดจากเซิร์ฟเวอร์ { inv: [[id, ±qty]], zeny: ±n, note }
  applyServerDelta(d) {
    const pl = this.player;
    for (const e of Array.isArray(d.inv) ? d.inv : []) {
      const id = String(e[0]), q = Math.floor(+e[1]) || 0;
      if (q > 0) pl.inventory.add(id, q, true); else if (q < 0) pl.inventory.remove(id, -q);
    }
    if (d.zeny) pl.zeny = Math.max(0, Math.min(MAX_ZENY, (pl.zeny || 0) + Math.floor(+d.zeny)));
    for (const id of Array.isArray(d.fashion) ? d.fashion : []) if (COSTUME_BY_ID[id]) pl.fashion.owned.add(id);   // v0.43 ชิ้นแฟชั่นจากร้านเพชร
    if (Array.isArray(d.fashion) && this.ward && this.ward.render) this.ward.render();
    if (d.note) this.hud.log(`🛒 ${d.note}${d.zeny > 0 ? ` · +${Math.floor(d.zeny).toLocaleString('en-US')} z` : ''}`, 'sys');
    this.dirty = true;
    this.refreshItemsUI();
    if (this.hud.setPlayer) this.hud.setPlayer(pl);
    if (this.trade) this.trade.render();
  }

  saveState() {
    return {
      player: { ...this.player.toSave(), angle: +this.player.angle.toFixed(3), map: this.map.id, ...(this.map.def.instance ? { map: START_MAP, x: Math.round(MAPS[START_MAP].spawn.x * TILE), y: Math.round(MAPS[START_MAP].spawn.y * TILE) } : {}) },   // v0.32: เซฟในดันเจี้ยน = กลับมาที่เมือง
      townV: 2,   // v0.41.1 ผังเมือง Asteria แบบขยาย
      mapV: 3,    // v0.41.2 ทุกแผนที่ขยาย 1.5 เท่า (พิกัดในเซฟเป็นพิกัดแผนที่ใหม่แล้ว)
      srvRev: this.cloud && this.online ? this.online.rev || 0 : undefined,   // v0.42 เซฟสำรองเก่ากว่าการแลก/ตลาดบนเซิร์ฟเวอร์ = ห้ามใช้ (กันของซ้ำ)
      camera: { yaw: +this.gfx.rig.targetYaw.toFixed(3), dist: +this.gfx.rig.targetDist.toFixed(2), v: 2 },   // v: 2 = ระยะกล้องแบบ RO (v0.17.1)
      storage: [...this.storage.toSave(), ...(this.storageUps ? [['_cap', this.storageUps]] : [])],   // คลังของบัญชี (ใช้ร่วมทุกตัวละคร) + v0.13 จำนวนครั้งที่ขยาย
    };
  }

  // v0.83 หน้าต่างประกาศ Closed Beta — แสดงครั้งเดียวต่อเบราว์เซอร์ (ข้อความอยู่ใน js/data/beta.js)
  betaNotice(force = false) {
    if (!BETA.on) return;
    try { if (!force && localStorage.getItem(BETA.key)) return; } catch (e) { /* ไม่มีที่เก็บข้อมูล → แสดงทุกครั้ง */ }
    if (this.betaEl) this.betaEl.remove();
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const el = this.betaEl = document.createElement('div');
    el.className = 'beta-modal'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<section class="panel beta-card"><h2>${esc(BETA.title)}</h2><p class="beta-intro">${esc(BETA.intro)}</p>
      <ul>${BETA.items.map(([ic, t, d]) => `<li><i>${ic}</i><div><b>${esc(t)}</b><small>${esc(d)}</small></div></li>`).join('')}</ul>
      <p class="beta-links"><a href="terms.html" target="_blank" rel="noopener">ข้อกำหนด</a> · <a href="privacy.html" target="_blank" rel="noopener">ความเป็นส่วนตัว</a></p>
      <button type="button" class="primary beta-ok">${esc(BETA.ok)}</button></section>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart', 'keydown']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    el.querySelector('.beta-ok').addEventListener('click', () => {
      try { localStorage.setItem(BETA.key, String(Date.now())); } catch (e) { /* ไม่เป็นไร */ }
      el.remove(); this.betaEl = null;
    });
    (this.root.querySelector('.hud') || this.root).append(el);
    setTimeout(() => el.querySelector('.beta-ok')?.focus(), 50);
  }

  // v0.87 วนเกมตอนหน้าเกมถูกซ่อน (Worker ส่งจังหวะทุก 100 ms · ตัวจับเวลาใน Worker ไม่ถูกเบราว์เซอร์ชะลอแบบหน้าเว็บ)
  startBackgroundLoop(getLast, setLast) {
    if (this.bgWorker || typeof Worker === 'undefined') return;
    let w;
    try { w = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 100);'], { type: 'text/javascript' }))); } catch (e) { return; }
    this.bgWorker = w;
    w.onmessage = () => {
      if (!document.hidden || !this.started) return;
      const now = performance.now();
      let left = Math.min(5, Math.max(0, (now - getLast()) / 1000));   // ห่างนานเกิน 5 วิ (เครื่องหลับ) ไม่ไล่ย้อน
      setLast(now);
      this.gfx.noDraw = true;
      try {
        while (left > 0.0005) {
          const dt = Math.min(0.05, left); left -= dt;
          let simDt = dt;
          if (this.hitstop > 0) { this.hitstop -= dt; simDt = 0; }
          this.update(simDt);
          this.updateNet(dt);
          this.gfx.render(dt, this.player, simDt);   // อัปเดตเอฟเฟกต์/จังหวะดาเมจของสกิล แต่ไม่วาด
        }
        if ((this.vipT = (this.vipT || 0) - 0.1) <= 0) { this.vipT = 5; this.vipTick(); }
      } catch (e) { console.warn('background tick', e); }
      finally { this.gfx.noDraw = false; }
    };
  }

  // v0.88 แถบไอคอนด้านบน: ปุ่มพับ/กาง (คอมและมือถือ) · จำสถานะไว้ในเครื่อง · พับอยู่แต่มีแจ้งเตือน → จุดแดงที่ปุ่ม
  setupTopbarToggle(root) {
    const bar = root.querySelector('#topBar'); if (!bar || bar.querySelector('.tb-toggle')) return;
    const KEY = 'everlevel.topbar.hidden';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'tb-toggle';
    btn.innerHTML = '<i aria-hidden="true"></i><b class="tb-dot" hidden></b>';
    bar.append(btn);
    const set = (hide, save) => {
      bar.classList.toggle('tb-collapsed', hide);
      btn.setAttribute('aria-expanded', String(!hide));
      btn.title = hide ? 'แสดงเมนูด้านบน' : 'ซ่อนเมนูด้านบน';
      btn.setAttribute('aria-label', btn.title);
      btn.querySelector('i').textContent = hide ? '▼' : '▲';
      if (save) { try { localStorage.setItem(KEY, hide ? '1' : '0'); } catch (e) { /* ไม่มีที่เก็บก็ไม่เป็นไร */ } }
      dot();
    };
    const dot = () => {
      const any = [...bar.querySelectorAll('.tb-badge')].some((b) => !b.hidden && b.textContent.trim() !== '' && b.textContent.trim() !== '0');
      const d = btn.querySelector('.tb-dot'), h = !(bar.classList.contains('tb-collapsed') && any);
      if (d.hidden !== h) d.hidden = h;   // ตั้งเฉพาะตอนเปลี่ยน (กัน MutationObserver วนไม่จบ)
    };
    btn.addEventListener('click', () => set(!bar.classList.contains('tb-collapsed'), true));
    const mo = new MutationObserver((list) => { if (list.some((r) => !btn.contains(r.target))) dot(); });
    for (const b of bar.querySelectorAll('.tb-badge')) mo.observe(b, { attributes: true, attributeFilter: ['hidden'], childList: true, characterData: true, subtree: true });
    let hide = false; try { hide = localStorage.getItem(KEY) === '1'; } catch (e) { /* ใช้ค่าเริ่มต้น */ }
    set(hide, false);
  }

  // v0.86 รอบวันของเกม 2 ชั่วโมงจริง (ทุกคนเห็นช่วงเวลาเดียวกัน · อิงเวลาเซิร์ฟเวอร์) · ตั้งค่าปิดได้ = กลางวันตลอด
  dayTick() {
    if (this.settings.dayCycle === false) { if (this.gfx.dayT !== null) this.gfx.setDayTime(null); this.setDayBadge(null); return; }
    const now = this.events && this.events.now ? this.events.now() : Date.now();
    const f = typeof window.__dayForce === 'number' ? window.__dayForce : (now % DAY_CYCLE_MS) / DAY_CYCLE_MS;   // __dayForce = ทดสอบ
    this.gfx.setDayTime(f);
    const P = this.gfx.dayInfo;
    this.setDayBadge(this.gfx.dayIndoor ? null : P);
    if (P && !this.gfx.dayIndoor && this.started) {
      if (this.dayPhase && this.dayPhase !== P.phase && P.phase !== 'dawn') this.hud.log(`${P.icon} ${P.phase === 'night' ? 'ตกกลางคืนแล้ว — ระวังทางให้ดี' : P.phase === 'evening' ? 'ตะวันกำลังตกดิน — ตอนเย็นแล้ว' : 'เช้าแล้ว! กลางวันกลับมาอีกครั้ง'}`, 'info');
      this.dayPhase = P.phase;
    }
  }
  setDayBadge(P) {
    let el = this.dayBadge;
    if (!el) { el = this.dayBadge = document.createElement('div'); el.className = 'day-badge'; el.setAttribute('aria-live', 'off'); const mm = this.root.querySelector('#minimap'); (mm && mm.parentElement ? mm.parentElement : this.root.querySelector('.hud') || this.root).append(el); }
    el.hidden = !P;
    if (P) { const t = `${P.icon} ${P.name}`; if (el.textContent !== t) el.textContent = t; }
  }

  // v0.82 เซิร์ฟเวอร์ปฏิเสธเซฟ (ค่าตัวละครเป็นไปไม่ได้) หรือ GM ย้อนข้อมูล → ลบสำรองในเครื่อง แล้วโหลดจากเซิร์ฟเวอร์ใหม่
  serverHalt(kind, info) {
    if (this.halted) return;
    this.halted = kind; this.dirty = false;
    try { if (this.backup) localStorage.removeItem(this.backup.key); } catch (e) { /* ไม่มีสิทธิ์เก็บข้อมูล */ }
    const msg = kind === 'rejected'
      ? 'เซิร์ฟเวอร์ไม่รับเซฟนี้: ค่าตัวละครผิดปกติ — กำลังโหลดข้อมูลล่าสุดจากเซิร์ฟเวอร์'
      : 'แอดมินปรับข้อมูลตัวละครของคุณ — กำลังโหลดข้อมูลใหม่';
    try { this.hud.log(msg, 'sys'); this.hud.levelBanner('⚠ โหลดข้อมูลใหม่', msg); } catch (e) { /* ยังไม่มี HUD */ }
    setTimeout(() => location.reload(), 3500);
  }

  async saveNow(announce, force = false) {
    if (!this.started || this.halted) return;
    if (this.player.dead || this.warping) { if (announce) this.hud.log('บันทึกไม่ได้ในตอนนี้', 'sys'); return; }
    this.dirty = false;
    const state = this.saveState();
    if (!this.cloud) {
      const ok = await this.saver.save(state);
      if (announce) { this.hud.log(ok ? 'บันทึกเกมแล้ว (ในเครื่องนี้)' : 'บันทึกไม่สำเร็จ: เบราว์เซอร์นี้ปิดการเก็บข้อมูลไว้', 'sys'); if (ok) this.sfx('coin'); }
      return ok;
    }
    if (this.backup) this.backup.save(state);
    this.setNet('saving');
    const ok = await this.online.save({ schema: SAVE_SCHEMA, version: VERSION, savedAt: Date.now(), ...state }, announce || force);
    this.setNet(ok ? 'online' : 'error');
    if (ok) { this.saveFails = 0; if (announce) { this.hud.log('บันทึกบนคลาวด์แล้ว', 'sys'); this.sfx('coin'); } }
    else {
      this.dirty = true;
      this.saveFails = (this.saveFails || 0) + 1;
      const e = this.online.lastError, code = e && e.code;
      if (announce || this.saveFails === 1) {
        this.hud.log(code === 'PGRST301' || code === 'PGRST303'
          ? 'การเข้าสู่ระบบหมดอายุ — ออกจากระบบแล้วเข้าใหม่ (ความคืบหน้าสำรองไว้ในเครื่องแล้ว)'
          : code === 'not_granted' || code === 'permission_denied' || code === 'invalid_argument' || code === '42501'
          ? 'บัญชีนี้ไม่มีสิทธิ์บันทึกบนคลาวด์ · สำรองไว้ในเครื่องแล้ว'
          : 'บันทึกบนคลาวด์ไม่สำเร็จ จะลองใหม่อัตโนมัติ · สำรองไว้ในเครื่องแล้ว', 'sys');
      }
    }
    return ok;
  }

  /* ---------- v0.13: สัตว์เลี้ยง · ไอเทมใช้งาน ---------- */

  // คลังบัญชี: แถว ['_cap', n] = ขยายคลังไปแล้ว n ครั้ง (ไม่ใช่ไอเทม)
  loadStorage(list) {
    const cap = list.find((e) => Array.isArray(e) && e[0] === '_cap');
    this.storageUps = cap ? Math.max(0, Math.min(5, Math.floor(cap[1]) || 0)) : 0;
    this.storage.capacity = STORAGE_CAPACITY + this.storageUps * STORAGE_UP;
    this.storage.fromSave(list.filter((e) => !(Array.isArray(e) && e[0] === '_cap')));
  }

  togglePets(force) {
    this.petWin.toggle(force);
    if (this.petWin.open) { this.status.toggle(false); this.skillWin.toggle(false); this.ward.toggle(false); this.questWin.toggle(false); }
  }

  summonPet(id) {
    const pl = this.player, before = pl.pets.active;
    const err = this.pets.summon(id);
    if (err) { this.hud.log(err, 'sys'); return; }
    if (id) {
      const d = PETS[id];
      this.hud.log(`เรียก ${d.name} ออกมาแล้ว · ${d.skill.name}`, 'f-' + d.tier);
      this.sfx('warp', { gap: 0 });
      if (d.mods.bag) this.hud.log('กระเป๋า +10 ช่อง ระหว่างที่บ็อกซี่อยู่ด้วย', 'info');
    } else if (before) this.hud.log(`เก็บ ${PETS[before].name} กลับแล้ว`, 'info');
    this.refreshItemsUI();
    this.petWin.render();
    this.netTimer = 0;
    this.dirty = true;
  }

  // ฟักไข่ 1 ใบ → สุ่มสัตว์เลี้ยง → หน้าต่างฟักไข่
  // v0.48: ใช้ตั๋วสัตว์เลี้ยง (ร้านเพชร) → ได้ตัวที่เลือก
  adoptPet(itemId) {
    const pl = this.player, it = ITEMS[itemId];
    if (!it || !it.use || !it.use.pet || pl.inventory.count(itemId) <= 0 || pl.dead) return;
    const id = it.use.pet, P = PETS[id]; if (!P) return;
    pl.inventory.remove(itemId, 1);
    const res = pl.addPet(id), R = PET_RARITY[P.tier];
    this.hud.log(`🐾 ได้สัตว์เลี้ยง ${P.name} [${R.name}]${res.kind === 'new' ? ' — ตัวใหม่!' : res.kind === 'star' ? ` — ดาว +1 (★${res.stars})` : ` — ครบ ★5 รับ ${fmtZ(res.zeny)}`}`, 'f-' + P.tier);
    if (pl.pets.active === id) this.pets.refreshStars();
    if (res.kind === 'new' && !pl.pets.active) this.hud.log('กด P (หรือเมนู → สัตว์เลี้ยง) แล้วกด "เรียกออกมา" ให้ช่วยเก็บของ', 'info');
    this.hud.setPlayer(pl);
    this.refreshItemsUI();
  }

  hatchEgg(eggId) {
    const pl = this.player, it = ITEMS[eggId];
    if (!it || !it.use || !it.use.hatch || pl.inventory.count(eggId) <= 0) return;
    if (pl.dead || this.hatchWin.busy) return;
    pl.inventory.remove(eggId, 1);
    const r = rollHatch(it.use.hatch);
    const res = pl.addPet(r.id);
    const P = PETS[r.id], R = PET_RARITY[r.tier];
    this.hud.log(`🥚 ฟัก${it.name}: ได้ ${P.name} [${R.name}]${res.kind === 'new' ? ' — ตัวใหม่!' : res.kind === 'star' ? ` — ดาว +1 (★${res.stars})` : ` — ครบ ★5 รับ ${fmtZ(res.zeny)}`}`, 'f-' + r.tier);
    if (pl.pets.active === r.id) this.pets.refreshStars();
    this.petBest = !this.petBest || ['common', 'rare', 'epic', 'legend', 'mythic', 'celestial'].indexOf(r.tier) > ['common', 'rare', 'epic', 'legend', 'mythic', 'celestial'].indexOf(this.petBest.tier) ? { ...r } : this.petBest;
    this.inv.toggle(false);
    this.hatchWin.show(eggId, r, res, pl.inventory.count(eggId));
    if (res.kind === 'new' && !pl.pets.active) this.hud.log('กด P (หรือเมนู → สัตว์เลี้ยง) แล้วกด "เรียกออกมา" ให้ช่วยเก็บของ', 'info');
    this.hud.setPlayer(pl);
    this.refreshItemsUI();
    this.petWin.render();
    this.saveNow(false);
  }

  // ปิดหน้าต่างฟักไข่: ได้ระดับ Mythical/Celestial → ฉลอง + ประกาศ
  celebratePet() {
    const b = this.petBest; this.petBest = null;
    if (!b || !['mythic', 'celestial'].includes(b.tier)) return;
    const pl = this.player, R = PET_RARITY[b.tier];
    this.gfx.mvpFx(pl);
    this.hud.levelBanner(`${R.name}!`, `ได้สัตว์เลี้ยง ${PETS[b.id].name}`);
    this.hud.log(`📢 ${pl.name} ฟักได้สัตว์เลี้ยงระดับ ${R.name} — ${PETS[b.id].name}!`, 'f-' + b.tier);
  }

  // สัตว์เลี้ยงนำของมาส่ง: ใส่กระเป๋า (เต็ม → มังกรออมสินขายของ etc ให้ · ไม่งั้นวางไว้ที่พื้นข้างเจ้าของ)
  petDeliver(list, petName, { silent = false, heal = 0, autoSell = false, sell = 0, quiet = false } = {}) {
    const pl = this.player, got = [], sold = [];
    let zeny = 0;
    for (const id of list) {
      const it = ITEMS[id]; if (!it) continue;
      if (pl.inventory.add(id, 1) > 0) { got.push(id); continue; }
      if (autoSell && it.type === 'etc' && !it.keep) { const z = Math.floor(sellPrice(id) * (1 + sell / 100)); zeny += z; sold.push(id); continue; }
      const d = this.spawnDrop(id, pl.x, pl.y); d.noPet = true;
      if (this.time - this.pets.fullWarnAt > 8) { this.pets.fullWarnAt = this.time; this.hud.log(`กระเป๋าเต็ม! ${petName} วางของไว้ข้างตัวคุณ`, 'sys'); }
    }
    if (zeny) { pl.addZeny(zeny); this.hud.log(`${petName} ขาย ${sold.length} ชิ้นให้อัตโนมัติ (กระเป๋าเต็ม) · ได้รับ ${fmtZ(zeny)}`, 'zeny'); }
    if (got.length) {
      if (!silent) {
        const best = got.reduce((a, b) => ((['common', 'uncommon', 'rare', 'epic', 'legend'].indexOf(ITEMS[b].rarity || 'common')) > (['common', 'uncommon', 'rare', 'epic', 'legend'].indexOf(ITEMS[a].rarity || 'common')) ? b : a), got[0]);
        const r = ITEMS[best].rarity || 'common';
        this.gfx.floatText(pl, got.length === 1 ? `+ ${ITEMS[got[0]].name}` : `+ ${ITEMS[best].name} และอีก ${got.length - 1} ชิ้น`, 'loot r-' + r, { h: 2.0, life: 1.4, rise: 0.6, drift: false });
        if (!quiet || r !== 'common') this.hud.log(`🐾 ${petName} เก็บมาให้: ${this.countList(got)}`, 'r-' + r);
        this.sfx(got.some((id) => ITEMS[id].type === 'card' || ITEMS[id].type === 'box') ? 'coin' : 'pickup');
      }
      if (heal && !pl.dead) {
        const k = heal * got.length / 100;
        pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * k); pl.sp = Math.min(pl.maxSp, pl.sp + pl.maxSp * k);
        if (!silent) this.gfx.floatText(pl, `+${Math.round(heal * got.length)}% HP/SP`, 'heal', { h: 1.5, drift: false });
        this.hud.setPlayer(pl);
      }
      this.refreshItemsUI();
    }
    this.dirty = true;
  }

  countList(ids) {
    const m = new Map(); for (const id of ids) m.set(id, (m.get(id) || 0) + 1);
    return [...m].map(([id, n]) => `${ITEMS[id].name}${n > 1 ? ` x${n}` : ''}`).join(', ');
  }

  petNotice(text) { this.hud.log(`🐾 ${text}`, 'f-celestial'); }

  // ใบวาร์ปสุ่ม: ย้ายไปจุดเดินได้แบบสุ่มในแผนที่เดิม (ไม่โหลดแผนที่ใหม่)
  randomTeleport() {
    const pl = this.player, map = this.map;
    for (let k = 0; k < 300; k++) {
      const tx = 1 + Math.floor(Math.random() * (map.w - 2)), ty = 1 + Math.floor(Math.random() * (map.h - 2));
      if (map.isSolidTile(tx, ty)) continue;
      const x = tx * TILE + 8, y = ty * TILE + 8;
      if (map.boxBlocked(...pl.box(x, y))) continue;
      if (Math.hypot(x - pl.x, y - pl.y) < 8 * TILE) continue;
      if (map.portals.some((p) => { const [x0, y0, x1, y1] = p.rect; return x > x0 - 24 && x < x1 + 24 && y > y0 - 24 && y < y1 + 24; })) continue;
      if (this.npcs.some((n) => Math.hypot(n.x - x, n.y - y) < 40)) continue;
      this.gfx.warpIn(pl, '#8fd8ff');
      pl.x = x; pl.y = y; pl.path = []; pl.pendingPickup = null; pl.pendingTalk = null; pl.pendingSkill = null;
      this.clearTarget(); this.closeServices();
      if (this.mobs) this.mobs.release(pl);
      for (const p of map.portals) p.inside = this.inRect(pl, p.rect);
      this.gfx.snapCamera(pl);
      this.gfx.warpIn(pl, '#8fd8ff');
      this.sfx('warp');
      if (this.pets.pet) { this.pets.pet.x = x - 16; this.pets.pet.y = y + 8; this.pets.pet.path = []; }
      this.netTimer = 0; this.dirty = true;
      return true;
    }
    return false;
  }

  // ใบตามหาเพื่อน: วาร์ปไปแผนที่ของเพื่อน แล้วไปโผล่ข้างตัวเมื่อเห็นกัน
  warpToFriend(name, mapId) {
    this.hud.log(`วาร์ปไปหา ${name}…`, 'sys');
    if (mapId === this.map.id) { this.friendSeek = { name, until: this.time + 5 }; this.seekFriend(); return; }
    this.warp(mapId, null, () => { this.friendSeek = { name, until: this.time + 6 }; });
  }

  seekFriend() {
    const f = this.friendSeek;
    if (this.time > f.until) { this.friendSeek = null; this.hud.log(`ไม่เห็น ${f.name} ในแผนที่นี้ (อาจเพิ่งย้ายแผนที่)`, 'sys'); return; }
    for (const r of this.remote.list.values()) {
      if (r.name !== f.name || r.dead) continue;
      this.friendSeek = null;
      const pl = this.player;
      for (const [dx, dy] of [[20, 0], [-20, 0], [0, 20], [0, -20], [16, 16]]) {
        const x = r.x + dx, y = r.y + dy;
        if (!this.map.boxBlocked(...pl.box(x, y))) { pl.x = x; pl.y = y; break; }
      }
      pl.path = []; this.gfx.snapCamera(pl); this.gfx.warpIn(pl, '#ff9ad0'); this.sfx('warp');
      this.hud.log(`มาถึงข้าง ${r.name} แล้ว!`, 'net');
      this.netTimer = 0;
      return;
    }
  }

  // เรียกมอนสเตอร์ด้วยกิ่งไม้ (ไม่เกิดใหม่หลังตาย)
  summonMonster(type, rangeTiles = 1.6) {
    const pl = this.player;
    let x = pl.x, y = pl.y;
    for (let k = 0; k < 12; k++) {
      const a = Math.random() * Math.PI * 2, nx = pl.x + Math.cos(a) * rangeTiles * TILE, ny = pl.y + Math.sin(a) * rangeTiles * TILE;
      if (!this.map.isSolidTile(Math.floor(nx / TILE), Math.floor(ny / TILE))) { x = nx; y = ny; break; }
    }
    const m = this.mobs.spawnAt(type, x, y);
    this.gfx.addMonster(m);
    this.gfx.playRespawn(m);
    this.gfx.bursts.spawn(x / TILE, 0.6, y / TILE, MONSTERS[type].mvp ? '#ff3a4a' : '#b48aff', 26, 1.2, 2.2);
    return m;
  }

  // โทรโข่ง: ส่งข้อความถึงทุกคนทุกแผนที่
  sendShout(text) {
    const pl = this.player;
    this.hud.log(`📢 ${text}`, 'shout', pl.name);
    this.sfx('chat');
    this.netShout = { t: Date.now(), m: text };
    this.netTimer = 0;
  }

  readShouts(peers) {
    this.shoutSeen = this.shoutSeen || new Map();
    for (const p of peers || []) {
      if (p.isMe) continue;
      const P = p.presence || {}, sh = P.sh;
      if (!sh || typeof sh !== 'object' || !Number.isFinite(sh.t)) continue;
      if (this.shoutSeen.get(p.peer) === sh.t) continue;
      this.shoutSeen.set(p.peer, sh.t);
      if (Math.abs(Date.now() - sh.t) > 30000) continue;   // ข้อความเก่าตอนเพิ่งเข้าห้อง
      const name = String(P.n || 'ผู้เล่น').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 16);
      const text = String(sh.m || '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 80);
      if (text) { this.hud.log(`📢 ${text}`, 'shout', name); this.sfx('chat'); }
    }
  }

  /* ---------- เสียง + ตั้งค่า (v0.11) ---------- */

  sfx(name, o) { this.audio.play(name, o); }

  applySettings(changed = null) {
    const s = this.settings, g = this.gfx;
    this.audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
    this.audio.setMuted(s.muted);
    g.bloomPref = s.bloom;
    g.shakeScale = s.shake ? 1 : 0;
    if (!changed || changed === 'quality' || changed === 'bloom') {
      if (s.quality === 'auto') {
        if (changed === 'quality') { this.aq = null; g.setQuality(this.gfx.mobile ? 1 : 0); }
        else g.setQuality(g.quality != null ? g.quality : g.mobile ? 1 : 0);   // v0.16: มือถือเริ่มระดับ 1 (ลื่นก่อน) แล้วค่อยเพิ่มเองถ้าเครื่องไหว
      } else g.setQuality(+s.quality);
    }
    const r = this.root;
    r.classList.toggle('no-dmg', !s.dmgNumbers);
    r.classList.toggle('no-fps', !s.showFps);
    r.classList.toggle('no-help', !s.showHelp);
    r.style.setProperty('--ui', String(s.uiScale));
    if (!changed || changed === 'showOthers') { this.remote.visible = s.showOthers; if (this.started) this.syncRemote(); }
    if (!changed || changed === 'hd') g.setHD(s.hd !== false);   // v0.89 ภาพ HD-2D
    if (!changed) g.setPixelMode(true);   // v0.17.1: ภาพพิกเซลอาร์ตเสมอ (เอาตัวเลือกกลับเป็น 3 มิติออกจากตั้งค่าแล้ว)
  }

  changeSetting(key, value) {
    if (!(key in this.settings)) return;
    this.settings[key] = key === 'quality' ? String(value) : value;
    saveSettings(this.settings);
    this.applySettings(key);
    if (key === 'sfx' || key === 'master') this.sfx('pickup', { gap: 120 });
  }

  accountInfo() {
    if (this.mode === 'online' && !this.cloud) return { mode: 'online', label: `ออนไลน์ · ${this.player.name}`, detail: `เห็นและคุยกับผู้เล่นในแผนที่เดียวกันได้ · เซฟในเบราว์เซอร์เครื่องนี้ (บัญชีนี้บันทึกบนคลาวด์ไม่ได้)` };
    if (this.mode === 'online') {
      const me = this.online.me || {};
      if (this.online.kind === 'supabase') return { mode: 'online', canLogout: true, label: `ออนไลน์ · ${this.player.name}`, detail: `บัญชี ${me.name || ''} · ตัวละครช่องที่ ${this.slot} · เซฟอัตโนมัติบนเซิร์ฟเวอร์ทุก ${AUTOSAVE_SECONDS} วินาที เล่นต่อได้ทุกเครื่อง` };
      return { mode: 'online', label: `ออนไลน์ · ${this.player.name}`, detail: `บัญชี ${me.name || 'Claude'} · ตัวละครช่องที่ ${this.slot} · เซฟอัตโนมัติบนคลาวด์ทุก ${AUTOSAVE_SECONDS} วินาที${this.online.canWrite === false ? ' (บัญชีนี้ดูได้อย่างเดียว เซฟบนคลาวด์ไม่ได้)' : ''}` };
    }
    return { mode: 'offline', label: `ออฟไลน์ · ${this.player.name}`, detail: `เซฟในเบราว์เซอร์เครื่องนี้ทุก ${AUTOSAVE_SECONDS} วินาที` };
  }

  toggleSettings(force) {
    this.setWin.toggle(force);
    if (this.setWin.open) { this.onWin.toggle(false); this.menu.toggle(false); }
  }

  toggleOnline(force) {
    this.onWin.toggle(force);
    if (this.onWin.open) { this.setWin.toggle(false); this.menu.toggle(false); }
  }

  // v0.15: ตัวเลขจดหมายที่ยังไม่ได้รับ (ปุ่ม 📬 + เมนู ☰)
  updateMailBadge() {
    const n = this.mailbox.unread(), b = this.root.querySelector('#mailBadge');
    if (b) { b.hidden = n <= 0; b.textContent = n; }
    this.menu.badges({ stat: this.player.statPoints, skill: this.player.skillPoints, mail: n });
  }

  // v0.18: สมุดสะสม (ปิดหน้าต่างใหญ่บานอื่นที่ทับกัน)
  toggleCollection(force) {
    this.colWin.toggle(force);
    if (this.colWin.open) { this.mailWin.toggle(false); this.autoWin.toggle(false); this.petWin.toggle(false); this.questWin.toggle(false); this.ward.toggle(false); this.skillWin.toggle(false); }
  }

  menuAction(act) {
    const map = {
      events: () => this.eventWin.toggle(),
      status: () => this.toggleStatus(true), inv: () => this.inv.toggle(true), skill: () => this.toggleSkills(true), equip: () => this.equipWin.toggle(true),
      ward: () => this.toggleWardrobe(true), quest: () => this.toggleQuests(true), online: () => this.toggleOnline(true),
      settings: () => this.toggleSettings(true), save: () => this.saveNow(true), pet: () => this.togglePets(true),
      auto: () => this.autoWin.toggle(true), mail: () => this.mailWin.toggle(true), book: () => this.toggleCollection(true),
      map: () => this.mapWin.toggle(true, 'local'), world: () => this.mapWin.toggle(true, 'world'),
    };
    if (map[act]) map[act]();
  }

  // เปลี่ยนตัวละคร: บันทึกก่อนแล้วกลับไปหน้าเลือกตัวละคร
  async switchCharacter() {
    this.auto.stop('', { silent: true });
    this.hud.log('กำลังบันทึกและกลับไปหน้าเลือกตัวละคร...', 'sys');
    await this.saveNow(false, true);
    if (this.cloud) await this.online.flush();
    setTimeout(() => location.reload(), 250);
  }

  // v0.12: ออกจากระบบ (เซิร์ฟเวอร์ของเกม) — บันทึกก่อนแล้วกลับหน้าเข้าเกม
  async logout() {
    this.auto.stop('', { silent: true });
    this.hud.log('กำลังบันทึกและออกจากระบบ...', 'sys');
    await this.saveNow(false, true);
    if (this.cloud) await this.online.flush();
    this.started = false;
    if (this.online.signOut) await this.online.signOut();
    setTimeout(() => location.reload(), 200);
  }

  async exportSave() {
    const data = { schema: SAVE_SCHEMA, version: VERSION, savedAt: new Date().toISOString(), ...this.saveState() };
    const name = `everlevel-${(this.player.name || 'save').replace(/[^\p{L}\p{N}_-]+/gu, '_')}-Lv${this.player.baseLevel}.json`;
    const text = JSON.stringify(data, null, 1);
    try {
      const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
      if (dl) { await dl.save({ filename: name, data: text }); this.hud.log(`ส่งออกไฟล์เซฟ ${name} แล้ว`, 'sys'); return; }
    } catch (e) {
      if (e && e.code === 'declined') { this.hud.log('ยกเลิกการส่งออกไฟล์เซฟ', 'info'); return; }
    }
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      a.download = name; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      this.hud.log(`ส่งออกไฟล์เซฟ ${name} แล้ว`, 'sys');
    } catch (e) { this.hud.log('ส่งออกไฟล์เซฟไม่สำเร็จในหน้านี้', 'sys'); }
  }

  // นำเข้าไฟล์เซฟ: แทนที่ตัวละครปัจจุบัน (ชื่อตัวละครออนไลน์คงเดิม) แล้วโหลดเกมใหม่
  async importSave(file) {
    let data = null;
    try { data = JSON.parse(await file.text()); } catch (e) { data = null; }
    if (!data || data.schema !== SAVE_SCHEMA || !data.player || typeof data.player !== 'object') { this.hud.log('ไฟล์เซฟไม่ถูกต้อง', 'sys'); return; }
    this.started = false;   // หยุดเซฟอัตโนมัติระหว่างนำเข้า
    if (this.cloud) {
      data.player.name = this.player.name;
      data.savedAt = Date.now();
      const ok = (await this.online.save(data, true)) && (await this.online.flush()) && !this.online.lastError;
      if (!ok) { this.started = true; this.hud.log('นำเข้าไม่สำเร็จ: บันทึกบนคลาวด์ไม่ได้', 'sys'); return; }
      if (this.backup) await this.backup.save(data);
    } else if (!(await this.saver.save(data))) { this.started = true; this.hud.log('นำเข้าไม่สำเร็จ: เบราว์เซอร์นี้ปิดการเก็บข้อมูลไว้', 'sys'); return; }
    this.hud.log('นำเข้าไฟล์เซฟแล้ว กำลังโหลดใหม่...', 'sys');
    setTimeout(() => location.reload(), 400);
  }

  /* ---------- ออนไลน์: ผู้เล่นคนอื่น + แชต (v0.11) ---------- */

  setNet(state) {
    const el = this.netStatus; if (!el) return;
    const label = { offline: 'ออฟไลน์', online: 'ออนไลน์', saving: 'กำลังบันทึก', error: 'บันทึกไม่สำเร็จ', connecting: 'กำลังเชื่อมต่อ' }[state] || state;
    el.dataset.s = state;
    el.title = label;
    el.querySelector('span').textContent = this.mode === 'online' && state !== 'offline' ? `${label} · ${this.remote.count() + 1} คน` : label;
    const mo = document.getElementById('mapOnline');   // v0.27: จำนวนคนออนไลน์ใต้มินิแมพ
    if (mo) mo.textContent = this.mode === 'online' && state !== 'offline' ? ` · ออนไลน์ ${this.remote.count() + 1}` : '';
  }

  startNet() {
    if (this.mode !== 'online') { this.setNet('offline'); return; }
    this.setNet('connecting');
    const ok = this.online.connectRoom((ch) => {
      this.remote.sync(ch.peers);
      this.readShouts(ch.peers);
      // ตัวละครเดียวกันเปิดอยู่อีกแท็บ → เซฟอาจทับกัน
      if (!this.toldDupTab && this.cloud && ch.peers.some((q) => q.isMe && !q.sameTab && q.presence && q.presence.n === this.player.name)) {
        this.toldDupTab = true;
        this.hud.log('⚠ ตัวละครนี้เปิดเล่นอยู่อีกแท็บ/อีกเครื่องหนึ่ง — ปิดอันใดอันหนึ่งเพื่อไม่ให้เซฟทับกัน', 'sys');
      }
      if (this.onWin.open) this.onWin.render();
      this.setNet(this.netStatus.dataset.s === 'error' ? 'error' : 'online');
    }, { onSay: (m) => this.onNetSay(m), onShout: (m) => this.onNetShout(m) });
    if (!ok) this.hud.log('เชื่อมต่อห้องผู้เล่นไม่ได้ — ยังเล่นและเซฟออนไลน์ได้ แต่จะไม่เห็นผู้เล่นคนอื่น', 'sys');
    else { this.hud.log('เชื่อมต่อออนไลน์แล้ว · ผู้เล่นในแผนที่เดียวกันจะเห็นกันและคุยแชตได้ (กด Enter เพื่อพิมพ์)', 'net'); this.social.start(); if (!this.tradeHooked && this.online.onLobby) { this.tradeHooked = true; this.online.onLobby('tr', (p) => this.trade.onPing(p)); setTimeout(() => this.cash.checkNews(), 4000); } }
    this.netTimer = 0;
  }

  syncRemote() { if (this.mode === 'online') this.remote.sync(this.online.peers()); }

  // v0.16.1: แชต/โทรโข่งที่มาถึงโดยตรง (ไม่ต้องรอรายชื่อผู้เล่นซิงก์ก่อน — ข้อความไม่หายอีก)
  onNetSay({ peer, name, text }) {
    if (!this.remote.visible) return;
    const who = String(name || 'นักผจญภัย').slice(0, 16), msg = String(text || '').slice(0, 120);
    if (!msg) return;
    const rp = this.remote.list && this.remote.list.get ? this.remote.list.get(peer) : null;
    this.hud.log(msg, 'pc', who, !!(rp && rp.vip));
    if (this.settings.chatSound) this.sfx('chat');
    this.remote.say(peer, msg);
  }

  onNetShout({ name, text }) {
    const who = String(name || 'ผู้เล่น').slice(0, 16), msg = String(text || '').slice(0, 80);
    if (!msg) return;
    this.hud.log(`📢 ${msg}`, 'shout', who);
    this.sfx('chat');
  }

  // ส่งสถานะตัวเอง (ตำแหน่ง ท่าทาง หน้าตา ข้อความแชต) ให้ผู้เล่นคนอื่น ~8 ครั้งต่อวินาที เฉพาะช่องที่เปลี่ยน
  updateNet(dt) {
    if (this.mode !== 'online') return;
    this.remote.update(dt);
    this.social.update(dt);
    this.trade.update();
    this.evBadgeT = (this.evBadgeT || 0) - dt;
    if (this.evBadgeT <= 0) {   // v0.44 ป้าย ! บนไอคอนกิจกรรม = มีบอสโลกกำลังสู้ หรือมีอีเวนต์ EXP/ดรอปอยู่
      this.evBadgeT = 3;
      const st = this.events && this.events.state, b = this.root.querySelector('#eventBadge');
      const on = (!!st && ((st.runs || []).some((r) => r.status === 'active') || (st.events || []).some((e) => e && (e.rate || 1) > 1))) || !!(this.festival && this.festival.active().length);   // v0.79 + เทศกาล
      if (b) b.hidden = !on;
    }
    this.netTimer -= dt;
    if (this.netTimer > 0) return;
    this.netTimer = 0.12;
    const pl = this.player, L = this.lastPres;
    const lk = {};
    for (const [k, v] of Object.entries(pl.look)) if (typeof v === 'string' || v === null) lk[k] = v;
    const fw = Object.values(pl.fashionItems(false)).map((it) => it.id).sort();
    const P = {
      n: pl.name, j: pl.jobId, lv: pl.baseLevel, m: this.map.id,
      x: Math.round(pl.x), y: Math.round(pl.y), a: +pl.angle.toFixed(2), mv: !!pl.moving,
      h: +(pl.hp / pl.maxHp).toFixed(2), dead: !!pl.dead, at: this.atkSeq, ak: this.atkKind,
      pt: pl.pets.active || '', ps: pl.pets.active ? pl.pets.owned[pl.pets.active] || 0 : 0,   // v0.13: สัตว์เลี้ยง
      tt: titlesOf(pl.col).join('|'),   // v0.76 ฉายาสูงสุด 3 อัน                                                                  // v0.18: ฉายา
      gd: this.social.guildId,                                                                 // v0.37: กิลด์
      vp: this.vipActive ? 1 : 0,                                                              // v0.45 ป้าย VIP
      sp: Math.round(pl.speed),                                                                // v0.16.1: ความเร็วเดิน (ไว้บอกคนอื่นให้เดินต่อเองระหว่างแพ็กเก็ต)
    };
    const patch = {};
    for (const [k, v] of Object.entries(P)) if (L[k] !== v) { patch[k] = v; L[k] = v; }
    const lkS = JSON.stringify(lk), fwS = fw.join(',');
    if (L.lk !== lkS) { patch.lk = lk; L.lk = lkS; }
    if (L.fw !== fwS) { patch.fw = fw; L.fw = fwS; }
    if (this.netSay) { patch.say = this.netSay; this.netSay = null; }
    if (this.netShout) { patch.sh = this.netShout; this.netShout = null; }
    if (Object.keys(patch).length) this.online.presence(patch);
    // อัปเดตจำนวนผู้เล่นบนแถบสถานะทุก ~2 วินาที
    this.netRefresh -= 0.12;
    if (this.netRefresh <= 0) {
      this.netRefresh = 2;
      const s = this.netStatus.dataset.s, up = this.online.connected();
      if (s !== 'saving') this.setNet(up ? (s === 'error' ? 'error' : 'online') : 'connecting');
      // v0.16.1: หลุดนานเกิน 12 วินาทีบอกผู้เล่น (ระบบเชื่อมใหม่เอง) · กลับมาแล้วบอกอีกครั้ง
      if (up) { if (this.netWarned) this.hud.log('เชื่อมต่อกับผู้เล่นอื่นกลับมาแล้ว', 'net'); this.netLostAt = 0; this.netWarned = false; }
      else {
        if (!this.netLostAt) this.netLostAt = this.time;
        if (!this.netWarned && this.time - this.netLostAt > 12) { this.netWarned = true; this.hud.log('การเชื่อมต่อกับผู้เล่นอื่นหลุด — กำลังเชื่อมต่อใหม่อัตโนมัติ…', 'sys'); }
      }
    }
  }

  sendChat(text) {
    const pl = this.player;
    // v0.37–0.38: ช่องแชตที่เลือกจากแถบเหนือช่องพิมพ์ · หรือพิมพ์นำหน้า /p ปาร์ตี้ · /g กิลด์ · /o โลก · /w ชื่อ ข้อความ = กระซิบ · /r ข้อความ = ตอบกระซิบล่าสุด
    let ch = this.chatChannel || 's', to = this.chat.whisperTo;
    let m = /^\/(p|g|s|o)\s+(.+)$/i.exec(text);
    if (m) { ch = { p: 'p', g: 'g', s: 's', o: 'w' }[m[1].toLowerCase()]; text = m[2]; }
    else if ((m = /^\/w\s+(\S+)\s+(.+)$/i.exec(text))) { ch = 't'; to = m[1]; text = m[2]; this.chat.setWhisperTo(to, true); }
    else if ((m = /^\/r\s+(.+)$/i.exec(text))) { ch = 't'; to = this.social.replyTo || to; text = m[1]; }
    if (ch === 'p') { this.social.sendPartyChat(text); this.sfx('chat'); return; }
    if (ch === 'g') { this.social.sendGuildChat(text); this.sfx('chat'); return; }
    if (ch === 'w') { if (this.social.sendWorld(text)) this.sfx('chat'); return; }
    if (ch === 't') { if (this.social.whisper(to, text)) this.sfx('chat'); return; }
    pl.bubble = { text, t: 5 };
    this.hud.log(text, 'pc me', pl.name, this.vipActive);
    this.sfx('chat');
    if (this.mode === 'online') {
      this.netSay = { t: Date.now(), m: text };
      this.netTimer = 0;
      if (!this.remote.count() && !this.toldAlone) { this.toldAlone = true; this.hud.log('ยังไม่มีผู้เล่นคนอื่นในแผนที่นี้ — ข้อความจะแสดงให้คนที่อยู่แผนที่เดียวกันเห็น', 'sys'); }
    } else if (!this.toldOffline) { this.toldOffline = true; this.hud.log('โหมดออฟไลน์: ข้อความแสดงเฉพาะในเครื่องนี้', 'sys'); }
  }
}
