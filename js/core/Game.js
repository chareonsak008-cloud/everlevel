// ตัวควบคุมหลักของเกม: ลูป, แผนที่/วาร์ป, การเดิน, การต่อสู้ → ส่งต่อให้ Renderer3D วาด
import { EventService } from '../systems/EventService.js';
import { EventWindow } from '../ui/EventWindow.js';
import { TILE, AUTOSAVE_SECONDS, SAVE_KEY, SAVE_SCHEMA, VERSION } from '../config.js';
import { GameMap } from '../world/GameMap.js';
import { MAPS, START_MAP } from '../data/maps/index.js';
import { Player } from '../entities/Player.js';
import { NPC } from '../entities/NPC.js';
import { Input, isTyping } from './Input.js';
import { SaveManager } from './Save.js';
import { findPath, smoothPath, nearestWalkable } from './Pathfinder.js';
import { HUD } from '../ui/HUD.js';
import { Minimap } from '../ui/Minimap.js';
import { Renderer3D } from '../render/Renderer3D.js';
import { MonsterManager } from '../systems/MonsterAI.js';
import { rollAttack, rollSkill } from '../systems/Combat.js';
import { StatusWindow } from '../ui/StatusWindow.js';
import { InventoryWindow } from '../ui/InventoryWindow.js';
import { Hotbar } from '../ui/Hotbar.js';
import { ITEMS, RARITY } from '../data/items.js';
import { rollDrops } from '../systems/Loot.js';
import { iconURL } from '../render/ItemIcons.js';
import { Inventory } from '../systems/Inventory.js';
import { NpcDialog } from '../ui/Dialog.js';
import { ShopWindow } from '../ui/ShopWindow.js';
import { StorageWindow } from '../ui/StorageWindow.js';
import { SHOPS, WARP_ROUTES, STORAGE_CAPACITY, buyPrice, sellPrice, fmtZ } from '../data/shops.js';
import { SKILLS, skillSp, skillCast, sval } from '../data/skills.js';
import { JOBS, FIRST_JOBS } from '../data/progression.js';
import { SkillWindow } from '../ui/SkillWindow.js';
import { isSkillKey } from '../entities/Player.js';
import { clamp } from './util.js';
import { MONSTERS } from '../data/monsters.js';
import { THREE } from '../render/three.js';
import { WardrobeWindow } from '../ui/WardrobeWindow.js';
import { BoxOpenWindow } from '../ui/BoxOpenWindow.js';
import { rollBox, boxDrops, DUP_ZENY, FASHION_RARITY, TIER_RANK } from '../data/fashionBoxes.js';
import { COSTUME_BY_ID } from '../data/costumes.js';
import { FASHION_SLOTS, FASHION_WEAPON_FIT } from '../entities/Player.js';
import { QUESTS } from '../data/quests.js';
import { QuestLog, rewardText, npcWhere, goalText } from '../systems/Quests.js';
import { QuestWindow } from '../ui/QuestWindow.js';
import { RefineWindow } from '../ui/RefineWindow.js';
import { doRefine, doSocket } from '../systems/Forge.js';
import { cardDrops, CARDS } from '../data/cards.js';
import { statResetCost } from '../data/progression.js';
// v0.11: เสียง · ตั้งค่า · ออนไลน์ · แชต · เมนูมือถือ
import { AudioEngine } from '../audio/AudioEngine.js';
import { loadSettings, saveSettings } from '../systems/Settings.js';
import { SettingsWindow } from '../ui/SettingsWindow.js';
import { RemotePlayers } from '../net/RemotePlayers.js';
import { OnlineWindow } from '../ui/OnlineWindow.js';
import { ChatBox } from '../ui/ChatBox.js';
import { MenuPanel } from '../ui/MenuPanel.js';
// v0.13: สัตว์เลี้ยงช่วยเก็บของ · ไอเทมใช้งานชุดใหม่
import { PetSystem } from '../systems/PetSystem.js';
import { useConsumable, STORAGE_UP } from '../systems/ItemUse.js';
import { CONSUMABLES, consumableDrops } from '../data/consumables.js';
import { PETS, PET_RARITY, hatchEgg as rollHatch } from '../data/pets.js';
import { PetWindow } from '../ui/PetWindow.js';
import { HatchWindow } from '../ui/HatchWindow.js';
import { pickOfTier, FASHION_TIERS } from '../data/fashionBoxes.js';
// v0.14: ตีมอนออโต้
import { AutoHunt } from '../systems/AutoHunt.js';
import { AutoWindow } from '../ui/AutoWindow.js';
// v0.15: จดหมาย + ของขวัญต้อนรับ
import { Mailbox } from '../systems/Mailbox.js';
import { MailWindow } from '../ui/MailWindow.js';
import { Collection } from '../systems/Collection.js';          // v0.18: ระบบสะสม
import { CollectionWindow } from '../ui/CollectionWindow.js';

// เสียงตอนใช้สกิล (เริ่ม) และตอนกระแทก (จังหวะกล้องสั่น)
const SKILL_SFX = {
  first_aid: 'heal', power_slash: 'swing', ground_burst: 'skill', blade_cyclone: 'swing', sky_cleave: 'swing', battle_cry: 'skill', iron_will: 'skill',
  flame_bolt: 'cast', frost_lance: 'iceBlast', fire_ball: 'cast', meteor_storm: 'cast', frost_storm: 'cast', thunder_storm: 'cast', arcane_shield: 'cast',
  twin_shot: 'shoot', arrow_rain: 'shoot', gale_arrow: 'shoot', phoenix_shot: 'shoot', frost_trap: 'iceBlast', eagle_focus: 'skill',
  holy_heal: 'heal', blessing: 'heal', swift_wind: 'skill', holy_smite: 'cast', sanctuary: 'heal', divine_judgment: 'cast',
};
const IMPACT_SFX = {
  meteor_storm: 'explosion', fire_ball: 'explosion', phoenix_shot: 'explosion', divine_judgment: 'explosion', thunder_storm: 'thunder',
  frost_storm: 'iceBlast', frost_lance: 'iceBlast', frost_trap: 'iceBlast', sky_cleave: 'slam', ground_burst: 'slam', blade_cyclone: 'slam', power_slash: 'slam',
};

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
    this.resize();

    root.querySelector('#btnSave').addEventListener('click', () => this.saveNow(true));
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
    this.refineWin = new RefineWindow(root, this.player, { refine: (ref, guard) => this.refineItem(ref, guard), onClose: () => this.endService(), sound: (n) => this.sfx(n) });
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
    this.onWin = new OnlineWindow(root, this);
    this.remote = new RemotePlayers(this);
    this.netTimer = 0; this.lastPres = {}; this.netSay = null; this.netRefresh = 0;
    this.chat = new ChatBox(root, { onSend: (t) => this.sendChat(t) });
    this.menu = new MenuPanel(root, (act) => this.menuAction(act));
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
      hatch: (egg) => this.hatchEgg(egg),
      filter: (f) => { this.player.pets.filter = f; this.hud.log(`สัตว์เลี้ยงจะ${{ all: 'เก็บของทุกอย่าง', skipCommon: 'ข้ามของธรรมดา', rare: 'เก็บเฉพาะของหายากขึ้นไป' }[f]}`, 'info'); this.dirty = true; },
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
    this.events = new EventService(this);
    this.eventWin = new EventWindow(root, this);
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
      if (e.code === 'KeyH') { e.preventDefault(); this.autoWin.toggle(); }
      if (e.code === 'KeyZ') { e.preventDefault(); this.auto.toggle(); }
      if (e.code === 'KeyM') { e.preventDefault(); this.mailWin.toggle(); }
      if (e.code === 'KeyB') { e.preventDefault(); this.toggleCollection(); }   // v0.18
      if (e.code === 'Escape') {
        if (this.dialog.open || this.shop.open || this.storWin.open || this.refineWin.open) { this.closeServices(); return; }
        if (this.setWin.open || this.onWin.open || this.menu.open) { this.setWin.toggle(false); this.onWin.toggle(false); this.menu.toggle(false); return; }
        this.status.toggle(false); this.inv.toggle(false); this.skillWin.toggle(false); this.ward.toggle(false); this.questWin.toggle(false); this.petWin.toggle(false); this.autoWin.toggle(false); this.mailWin.toggle(false); this.colWin.toggle(false); this.eventWin?.toggle(false);
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
    const def = MAPS[id] || MAPS[START_MAP];
    const t0 = performance.now();
    if (this.remote) this.remote.clear();   // ผู้เล่นคนอื่นของแผนที่เก่า
    if (this.pets) this.pets.clearRemote();
    this.map = new GameMap(def);
    this.gfx.buildWorld(this.map);

    this.npcs = (def.npcs || []).map((n) => new NPC(n));
    for (const n of this.npcs) { this.map.setSolid(n.tx, n.ty); this.gfx.addCharacter(n, { npc: true }); }

    const pl = this.player;
    const a = arrive || def.spawn;
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

    this.mobs = def.safe ? null : new MonsterManager(this.map, def.spawns || [], { x: pl.x, y: pl.y });
    if (this.mobs) for (const m of this.mobs.list) this.gfx.addMonster(m);

    // กันวาร์ปซ้ำทันทีถ้าเกิดในประตูมิติ
    for (const p of this.map.portals) p.inside = this.inRect(pl, p.rect);

    this.minimap = new Minimap(this.root.querySelector('#minimap'), this.map, this.npcs);
    pl.visited.add(def.id || id);           // v0.13: ใบวาร์ปเลือกแผนที่จำแผนที่ที่เคยไป
    this.friendSeek = null;
    if (this.pets) this.pets.onMapLoaded();
    if (this.auto) { this.auto.onMapLoaded(); this.autoWin.sync(); if (this.autoWin.open) this.autoWin.render(); }
    this.questEvents(this.questLog.onMap(def.id || id));
    this.hud.setMap(this.map);
    this.gfx.snapCamera(pl);
    if (this.started) this.gfx.warpIn(pl, def.safe ? '#ffe08a' : '#8fd8ff');
    this.audio.music(def.music || 'field');
    this.bossMusic = false;
    if (this.started) { this.sfx('warp'); this.syncRemote(); this.netTimer = 0; }
    this.dirty = true;
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
    let data = opts.save || null;
    if (this.cloud && data && this.backup) {
      // เซฟสำรองในเครื่องใหม่กว่าบนคลาวด์ (เช่น ปิดเกมระหว่างบันทึก) → ใช้อันที่ใหม่กว่า
      const b = await this.backup.load();
      const tb = b && Date.parse(b.savedAt), tc = +data.savedAt || Date.parse(data.savedAt) || 0;
      if (b && b.player && data.player && b.player.name === data.player.name && tb > tc + 5000) { data = { ...b, storage: data.storage }; this.restoredBackup = true; }
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
      arrive = { x: p.x / TILE, y: p.y / TILE, angle: typeof p.angle === 'number' ? p.angle : undefined };
      this.player.fromSave(p);
      this.questLog.sanitize();
      if (Array.isArray(data.storage)) this.loadStorage(data.storage);
      if (data.camera) {
        this.gfx.rig.targetYaw = data.camera.yaw || 0;
        // v0.17.1: เซฟเก่า (ก่อนกล้องแบบ RO) ใช้ระยะเริ่มต้นใหม่ · เซฟใหม่ใช้ระยะที่ผู้เล่นซูมไว้ (ปัดให้ตรงขั้นพิกเซล)
        if (data.camera.v === 2 && data.camera.dist > 0) { this.gfx.wantDist = data.camera.dist; this.gfx.zoomCamera(1); }
      }
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
    if (document.body.classList.contains('touch')) this.hud.log('แตะพื้นเพื่อเดิน · แตะมอนสเตอร์หรือปุ่ม ⚔ เพื่อโจมตี · ใช้สองนิ้วหมุน/ซูมกล้อง', 'info');
    else this.hud.log('คลิกพื้นเพื่อเดิน · คลิกมอนสเตอร์เพื่อโจมตี · Space โจมตีตัวที่ใกล้ที่สุด · Q/E หมุนกล้อง', 'info');

    this.started = true;
    this.autoWin.sync();
    this.collection.start();   // v0.18: ปลดล็อกความสำเร็จที่ทำครบแล้ว · บันทึกการ์ดที่มี · เช็กอินวันนี้
    // v0.15: จดหมาย — ตัวละครใหม่เปิดกล่องจดหมายให้เลือกของขวัญต้อนรับ
    this.mailbox.refresh().then(() => { if (opts.create && !this.player.mail.welcome) setTimeout(() => this.mailWin.openMail('welcome'), 1200); });
    this.root.classList.toggle('online', this.mode === 'online');
    this.gfx.refreshLook(this.player);
    this.hud.setPlayer(this.player);
    this.gfx.warpIn(this.player, '#ffe08a');
    this.startNet();
    if (opts.create || opts.migrated || this.restoredBackup) this.saveNow(false, true);
    let last = performance.now(), first = true;
    const frame = (now) => {
      const real = Math.max(0, (now - last) / 1000); last = now;   // เวลา rAF อาจย้อนเล็กน้อยในเฟรมแรก
      const dt = Math.min(0.05, real);
      // หยุดภาพชั่วขณะ (hit-stop): โลกนิ่ง แต่กล้องยังสั่นและคลื่นกระแทกบนจอยังขยาย
      let simDt = dt;
      if (this.hitstop > 0) { this.hitstop -= dt; simDt = 0; }
      this.update(simDt);
      this.updateNet(dt);
      this.gfx.render(dt, this.player, simDt);
      // v0.16: แผนที่ย่อวาดใหม่ 10 ครั้ง/วินาที (เดิมทุกเฟรม)
      if ((this.mmT = (this.mmT || 0) - real) <= 0) { this.mmT = 0.1; this.minimap.draw(this.player, this.gfx.yaw, this.mobs ? this.mobs.list.filter((m) => m.data.mvp && !m.dead) : []); }
      if (first) { first = false; this.root.classList.add('ready'); }
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
    this.gfx.resize(this.root.clientWidth, this.root.clientHeight);
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

  hitMonster(m, r) { this.damageMonster(m, r); }

  damageMonster(m, r, { magic = false } = {}) {
    if (m.dead) return;
    if (m.worldRun && !r.miss) { this.events.hit(m, r, magic); return; }
    if (r.miss) { this.gfx.floatText(m, 'Miss', 'miss'); this.sfx('miss'); return; }
    m.hp -= r.amount;
    this.sfx(r.crit ? 'crit' : 'hit');
    this.gfx.floatText(m, r.crit ? `${r.amount}!` : `${r.amount}`, r.crit ? 'crit' : magic ? 'hit magic' : 'hit');
    this.gfx.playHurt(m);
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

  killMonster(m) {
    this.mobs.kill(m, this.time);
    this.gfx.playDeath(m);
    this.sfx('monsterDie');
    if (this.player.target === m) this.clearTarget();
    this.reward(m);
    // v0.13: ใบคูณดรอป/การ์ด + สัตว์เลี้ยง (อบิส/โนวา/เทียนหยุน) · ไอเทมใช้งานและไข่สัตว์เลี้ยงดรอปจากมอนทุกตัว
    const pl = this.player, dm = pl.itemBuffMul('drop') * this.pets.dropMul() * (this.events?.rate('drop') || 1), cm = pl.itemBuffMul('card') * this.pets.cardMul() * (this.events?.rate('drop') || 1);
    const scale = (list, k) => (k === 1 ? list : list.map(([id, c]) => [id, Math.min(1,c * k)]));
    const items = rollDrops([...scale(m.data.drops, dm), ...scale(boxDrops(m.data), dm), ...scale(cardDrops(m.type), cm), ...scale(consumableDrops(m.data), dm)]);   // v0.9 กล่องแฟชั่น · v0.10 การ์ด
    if (this.pets.meteorChance() && Math.random() < this.pets.meteorChance() && m.data.drops.length) {
      const extra = m.data.drops[Math.floor(Math.random() * m.data.drops.length)][0];
      this.gfx.meteorFall(m.x, m.y);
      this.schedule(0.55, () => { this.spawnDrop(extra, m.x, m.y); this.gfx.floatText({ x: m.x, y: m.y }, 'ดาวตก!', 'loot r-rare', { h: 1.6, life: 1.6, rise: 0.6, drift: false }); });
    }
    this.questEvents(this.questLog.onKill(m.type));
    this.collection.onKill(m.type);   // v0.18: สมุดมอนสเตอร์ · ความสำเร็จ
    items.forEach((id, i) => this.schedule(0.2 + i * 0.12, () => this.spawnDrop(id, m.x, m.y)));
    if (m.summoned) this.schedule(1.0, () => { if (this.mobs) this.mobs.remove(m); this.gfx.removeActor(m); });
    if (m.data.mvp) this.mvpKill(m);
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
    this.sfx(it.type === 'card' || it.type === 'box' ? 'coin' : 'pickup');
    this.drops = this.drops.filter((d) => d !== drop);
    this.gfx.removeDrop(drop);
    this.gfx.floatText(pl, `+ ${it.name}`, 'loot r-' + (it.rarity || 'common'), { h: 2.0, life: 1.4, rise: 0.6, drift: false });
    this.hud.log(`ได้รับ ${it.name} x1`, 'r-' + (it.rarity || 'common'));
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
    const pl = this.player;
    const err = pl.equipItem(id);
    if (err) { this.hud.log(err, 'sys'); return; }
    this.hud.log(`สวมใส่ ${ITEMS[id].name}`, 'info');
    this.afterEquip();
  }

  unequipSlot(slot) {
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
    if (npc.service) opts.push({ label: npc.service.type === 'shop' ? 'ซื้อขาย / บริการ' : npc.service.type === 'storage' ? 'คลังเก็บของ' : npc.service.type === 'warp' ? 'วาร์ป' : npc.service.type === 'job' ? 'เปลี่ยนอาชีพ' : 'บริการ', onSelect: () => this.openService(npc) });
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

  refineItem(ref, guard) {
    const pl = this.player;
    const res = doRefine(pl, ref, guard);
    if (res.error) { this.hud.log(res.error, 'sys'); return res; }
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

  /* ---------- รีเซ็ตสเตตัส (v0.10) ---------- */
  resetStats() {
    const pl = this.player, cost = statResetCost(pl.baseLevel);
    if (!pl.statRefund()) { this.hud.log('ยังไม่ได้อัปสเตตัสเลย ไม่ต้องรีเซ็ต', 'info'); return; }
    if (cost && !pl.spendZeny(cost)) { this.hud.log(`Zeny ไม่พอสำหรับรีเซ็ตสเตตัส (ต้องใช้ ${fmtZ(cost)})`, 'sys'); return; }
    const n = pl.resetStats();
    this.hud.log(`รีเซ็ตสเตตัสแล้ว ได้แต้มคืน ${n} แต้ม${cost ? ` · จ่าย ${fmtZ(cost)}` : ' (ฟรี)'}`, 'lv');
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

  refreshItemsUI() { this.inv.render(); this.hotbar.render(); this.shop.sync(); this.storWin.render(); if (this.refineWin) this.refineWin.render(); if (this.questLog) this.refreshQuestUI(); if (this.autoWin) this.autoWin.refresh(); }

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
          { label: 'การตีบวกคืออะไร?', keepOpen: true, onSelect: () => this.dialog.show(npc, 'ตีบวกอาวุธเพิ่ม ATK ตีบวกชุดเกราะ/หมวก/โล่/ผ้าคลุม/รองเท้าเพิ่ม DEF ยิ่งสูงยิ่งแรง\n\n+1 ถึง +4 สำเร็จแน่นอน\n+5 75% · +6 60% · +7 50% — ล้มเหลวระดับลด 1\n+8 35% · +9 25% · +10 15% — ล้มเหลวอุปกรณ์แตก! (ใช้คริสตัลพิทักษ์กันแตกได้)\n\nอาวุธใช้ผลึกตีบวกอาวุธ ชุดเกราะใช้ผลึกตีบวกเกราะ ซื้อได้ที่ร้านข้า', [
            { label: 'ตีบวกอุปกรณ์', onSelect: () => this.openRefine() }, bye]) },
        ] : []),
        bye,
      ]);
    } else if (sv.type === 'storage') {
      this.storageMenu(npc, greet);
    } else if (sv.type === 'job') {
      this.jobMenu(npc, greet);
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
    const total = skillCast(sk, ps.lv) * Math.max(0.3, 1 - pl.derived.total.dex / 150);
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
            this.gfx.projectile(pl, t, { kind: id === 'frost_lance' ? 'ice' : 'orb', color, dur, size: id === 'holy_smite' ? 0.2 : 0.14 });
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
        const amt = Math.min(pl.maxHp - pl.hp, sval(sk.heal, lv, pl) || 0);
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
    this.dirty = true;
  }

  // v0.8: เล่นเอฟเฟกต์สกิลชุดใหม่ — ดาเมจ/สถานะเข้าตามจังหวะภาพ (SkillFX เรียก ctx.hit ตอนลูกไฟตก ดาบฟาด ฯลฯ)
  playSkillFx(id, lv, t) {
    const pl = this.player, sk = SKILLS[id], S = 1 / TILE, fx = this.gfx.fx;
    if (t) pl.faceToward(t);
    const facing = new THREE.Vector3(Math.sin(pl.angle), 0, Math.cos(pl.angle));
    const casterPos = new THREE.Vector3(pl.x * S, 0, pl.y * S);
    // เป้าหมายที่เอฟเฟกต์รู้จัก: มอนที่ยังไม่ตายรอบจุดใช้สกิล (ตำแหน่งอ่านสด ๆ ทุกครั้ง เพราะมอนเดินได้)
    const focus = t || pl;
    const reach = (id === 'gale_arrow' ? 15 : 8) * TILE;
    const mobs = this.mobs ? this.mobs.list.filter((m) => !m.dead && (m === t || Math.hypot(m.x - focus.x, m.y - focus.y) <= reach)) : [];
    const list = mobs.map((m) => ({ m, get pos() { return new THREE.Vector3(m.x * S, 0, m.y * S); }, height: m.data.height }));
    const main = t ? mobs.indexOf(t) : -1;
    const center = sk.target === 'self' ? casterPos.clone() : t ? new THREE.Vector3(t.x * S, 0, t.y * S) : null;
    const origin = sk.target === 'self' || !t || id === 'gale_arrow' ? { x: pl.x, y: pl.y } : { x: t.x, y: t.y };   // จุดที่ผลักศัตรูออก
    const ctx = {
      caster: { pos: casterPos, facing, height: 1.8 },
      targets: list, main, center, count: sval(sk.count, lv, pl) || 0,
      hit: (i, info = {}) => this.skillHit(sk, lv, list[i] && list[i].m, info, origin),
      heal: () => {
        if (pl.dead) return;
        const amt = Math.max(0, Math.min(pl.maxHp - pl.hp, Math.round(sval(sk.heal, lv, pl) || 0)));
        pl.hp += amt;
        if (amt > 0) this.gfx.floatText(pl, `+${amt}`, 'heal', { h: 1.6, drift: false });
        this.hud.setPlayer(pl); this.status.render();
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
    };
    fx.play(sk.vfx, ctx);
    // บัฟเข้าทันที (เอฟเฟกต์เป็นแค่ภาพ)
    if (sk.bonus) {
      pl.addBuff(id, lv, sk.bonus(lv), sk.duration(lv));
      this.hud.log(`${sk.name} Lv.${lv} (${sk.duration(lv)} วินาที)`, 'lv');
      this.hud.setPlayer(pl); this.hud.setBuffs(pl.buffs); this.status.render();
    }
    pl.lockUntil = this.time + (sk.lock || 0);
    pl.skillDelayUntil = this.time + (sk.delay ?? 0.35);
    pl.attackCd = Math.max(pl.attackCd, (sk.lock || 0) + 0.2);
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
    const r = rollSkill(pl.stats, m.stats, { mult, magic, hitBonus: sval(sk.hitBonus, lv) || 0 });
    this.damageMonster(m, r, { magic });
    const out = { stun: 0, freeze: 0 };
    if (r.miss || m.dead) return out;
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
    if (!st.novice) {
      this.dialog.show(npc, `${pl.job} ${pl.name}! เส้นทางของเจ้ายังอีกยาวไกล ฝึก Job Lv. ให้สูงขึ้นเพื่อปลดล็อกสกิลใหม่ ๆ นะ`, [info, bye]);
      return;
    }
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
  reward(m) {
    const pl = this.player;
    const bm = pl.itemBuffMul('exp') * (this.events?.rate('exp') || 1), jm = pl.itemBuffMul('jexp') * (this.events?.rate('exp') || 1);   // v0.13: ใบคูณ EXP / Job
    const b = Math.round((m.data.baseExp || 0) * bm), j = pl.jobNext === Infinity ? 0 : Math.round((m.data.jobExp || 0) * jm);
    this.hud.log(`กำจัด ${m.name} · ได้รับ Base EXP ${b}${bm > 1 ? ` (×${bm})` : ''} · Job EXP ${j}${jm > 1 && j ? ` (×${jm})` : ''}`, 'exp');
    this.gfx.floatText(pl, `+${b} EXP`, 'exp', { h: 2.1, life: 1.3, rise: 0.7 });
    this.applyExp(b, j);
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
    if (red) amount = Math.max(1, Math.round(amount * (1 - red / 100)));
    // v0.13: ยาต้านหนาว/ร้อน ลดดาเมจในแผนที่หิมะ/ภูเขาไฟ
    const biome = this.map.id === 'frostveil' ? pl.itemBuffSum('dmgCutSnow') : this.map.id === 'ember_caldera' ? pl.itemBuffSum('dmgCutLava') : 0;
    if (biome) amount = Math.max(1, Math.round(amount * (1 - biome / 100)));
    if (pl.cast && pl.cast.item) { this.hud.log(`ถูกโจมตี! ยกเลิกการร่าย ${pl.cast.name}`, 'sys'); pl.cast = null; }
    pl.hp = Math.max(0, pl.hp - amount);
    pl.lastHitAt = this.time;
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
    const reward = (m.data.mvpReward || {})[pl.jobId];
    this.gfx.mvpFx(pl);
    this.gfx.floatText(pl, 'MVP!', 'mvp', { h: 2.6, life: 2.6, rise: 0.7, drift: false });
    this.hud.levelBanner('MVP!', `ปราบ ${m.name} สำเร็จ`);
    this.sfx('mvp', { gap: 0 });
    this.hud.log(`★ MVP! คุณปราบ ${m.name} ได้สำเร็จ`, 'r-epic');
    if (reward) {
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
    this.closeServices();
    pl.cast = null; pl.pendingSkill = null;
    pl.lockUntil = 0; pl.castPose = false; pl.lift = 0; this.heroAnims = [];
    pl.dead = true; pl.hp = 0; pl.path = []; pl.moving = false; pl.pendingPickup = null; pl.pendingTalk = null;
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
      for (const bf of gone) this.hud.log(`${SKILLS[bf.id].name} หมดเวลา`, 'info');
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
      this.mobs.update(dt, this.time, pl, {
        onAttack: (m, t) => this.monsterAttacks(m, t),
        onRespawn: (m) => {
          this.gfx.playRespawn(m);
          if (m.data.mvp) { this.hud.log(`⚠ ${m.name} ตื่นขึ้นแล้ว!`, 'r-epic'); this.gfx.shake(0.25); this.sfx('bossWindup'); }
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

    // ประตูมิติ
    if (!pl.dead) {
      for (const p of this.map.portals) {
        const inside = this.inRect(pl, p.rect);
        if (inside && !p.inside) {
          if (p.locked || !p.to) this.hud.log(p.message || 'ประตูมิตินี้ยังใช้ไม่ได้', 'sys');
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

  saveState() {
    return {
      player: { ...this.player.toSave(), angle: +this.player.angle.toFixed(3), map: this.map.id },
      camera: { yaw: +this.gfx.rig.targetYaw.toFixed(3), dist: +this.gfx.rig.targetDist.toFixed(2), v: 2 },   // v: 2 = ระยะกล้องแบบ RO (v0.17.1)
      storage: [...this.storage.toSave(), ...(this.storageUps ? [['_cap', this.storageUps]] : [])],   // คลังของบัญชี (ใช้ร่วมทุกตัวละคร) + v0.13 จำนวนครั้งที่ขยาย
    };
  }

  async saveNow(announce, force = false) {
    if (!this.started) return;
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
    return { mode: 'offline', label: `ออฟไลน์ · ${this.player.name}`, detail: `เซฟในเบราว์เซอร์เครื่องนี้ทุก ${AUTOSAVE_SECONDS} วินาที · ส่งออกไฟล์เซฟไว้ย้ายเครื่องได้` };
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
      status: () => this.toggleStatus(true), inv: () => this.inv.toggle(true), skill: () => this.toggleSkills(true),
      ward: () => this.toggleWardrobe(true), quest: () => this.toggleQuests(true), online: () => this.toggleOnline(true),
      settings: () => this.toggleSettings(true), save: () => this.saveNow(true), pet: () => this.togglePets(true),
      auto: () => this.autoWin.toggle(true), mail: () => this.mailWin.toggle(true), book: () => this.toggleCollection(true),
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
    else this.hud.log('เชื่อมต่อออนไลน์แล้ว · ผู้เล่นในแผนที่เดียวกันจะเห็นกันและคุยแชตได้ (กด Enter เพื่อพิมพ์)', 'net');
    this.netTimer = 0;
  }

  syncRemote() { if (this.mode === 'online') this.remote.sync(this.online.peers()); }

  // v0.16.1: แชต/โทรโข่งที่มาถึงโดยตรง (ไม่ต้องรอรายชื่อผู้เล่นซิงก์ก่อน — ข้อความไม่หายอีก)
  onNetSay({ peer, name, text }) {
    if (!this.remote.visible) return;
    const who = String(name || 'นักผจญภัย').slice(0, 16), msg = String(text || '').slice(0, 120);
    if (!msg) return;
    this.hud.log(msg, 'pc', who);
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
    this.netTimer -= dt;
    if (this.netTimer > 0) return;
    this.netTimer = 0.12;
    const pl = this.player, L = this.lastPres;
    const lk = {};
    for (const [k, v] of Object.entries(pl.look)) if (typeof v === 'string' || v === null) lk[k] = v;
    const fw = Object.values(pl.fashionItems()).map((it) => it.id).sort();
    const P = {
      n: pl.name, j: pl.jobId, lv: pl.baseLevel, m: this.map.id,
      x: Math.round(pl.x), y: Math.round(pl.y), a: +pl.angle.toFixed(2), mv: !!pl.moving,
      h: +(pl.hp / pl.maxHp).toFixed(2), dead: !!pl.dead, at: this.atkSeq, ak: this.atkKind,
      pt: pl.pets.active || '', ps: pl.pets.active ? pl.pets.owned[pl.pets.active] || 0 : 0,   // v0.13: สัตว์เลี้ยง
      tt: pl.col.title || '',                                                                  // v0.18: ฉายา
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
    pl.bubble = { text, t: 5 };
    this.hud.log(text, 'pc me', pl.name);
    this.sfx('chat');
    if (this.mode === 'online') {
      this.netSay = { t: Date.now(), m: text };
      this.netTimer = 0;
      if (!this.remote.count() && !this.toldAlone) { this.toldAlone = true; this.hud.log('ยังไม่มีผู้เล่นคนอื่นในแผนที่นี้ — ข้อความจะแสดงให้คนที่อยู่แผนที่เดียวกันเห็น', 'sys'); }
    } else if (!this.toldOffline) { this.toldOffline = true; this.hud.log('โหมดออฟไลน์: ข้อความแสดงเฉพาะในเครื่องนี้', 'sys'); }
  }
}
