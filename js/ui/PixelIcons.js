// v0.91 ไอคอนพิกเซล 16×16 (แทนอีโมจิบนปุ่ม) — สไตล์เดียวกับไอคอนแถบเมนูด้านบน · วาดเป็น SVG คมทุกขนาด
// ตัวอักษร = สีในพาเลต · '.' = โปร่งใส · แถวสั้นกว่า 16 จะเติมโปร่งใสด้านขวา
const PAL = {
  k: '#2a1d2c', w: '#ffffff', l: '#ffe9b5', y: '#ffd257', Y: '#e0a82e', o: '#ff9a3a', r: '#e8384f', R: '#a8243a',
  g: '#5fd07a', G: '#2f9a4a', b: '#5aa8ff', B: '#2f6ad8', c: '#9ae6ff', p: '#b07aff', P: '#7a4ad8',
  n: '#b07a48', N: '#6e4422', s: '#d4dbe6', S: '#8a96a8', t: '#f2d4a8', m: '#ff8fb8', d: '#3a3248',
};
const ART = {
  bag: [
    '................', '.....kkkkkk.....', '....kNNNNNNk....', '....kN....Nk....', '..kkkkkkkkkkkk..', '.knnnnnnnnnnnnk.',
    '.knnnnyyyynnnnk.', '.knnnnykkynnnnk.', '.knnnnyyyynnnnk.', '.knnnnnnnnnnnnk.', '.kNnnnnnnnnnnNk.', '.kNnnnnnnnnnnNk.',
    '.kNNNNNNNNNNNNk.', '..kkkkkkkkkkkk..'],
  status: [
    '................', '.kkkkkkkkkkkkkk.', '.kllllllllllllk.', '.kllllllllkkkllk', '.kllllllllkgkllk', '.kllllkkkkkgkllk',
    '.kllllkbkllgkllk', '.kllkkkbkllgkllk', '.kllkrkbkllgkllk', '.kllkrkbkllgkllk', '.kllkrkbkllgkllk', '.kllkkkkkkkkkllk',
    '.kllllllllllllk.', '.kkkkkkkkkkkkkk.'],
  skill: [
    '.......kk.......', '......kyyk......', '......kyyk......', '.....kyyyyk.....', 'kkkkkkyyyykkkkkk', 'kyyyyyywwyyyyyyk',
    '.kyyyyywwyyyyyk.', '..kkyyyyyyyykk..', '....kyyyyyyk....', '...kyyyyyyyyk...', '...kyyykkyyyk...', '..kyyykk.kyyyk..',
    '..kyyk.....kyyk.', '..kkk.......kkk.'],
  equip: [
    '................', '..kkkkkkkkkkkk..', '..kssssssssssk..', '..ksyyysssyyysk.', '..ksyyysssyyysk.', '..ksssssssssssk.',
    '..kSsssyyyssSk..', '..kSsssyyyssSk..', '...kSssyyysSk...', '...kSSsssssSk...', '....kSSsssSk....', '.....kSSSSk.....',
    '......kSSk......', '.......kk.......'],
  wardrobe: [
    '................', '....kkk..kkk....', '..kkpppkkpppkk..', '.kppppppppppppk.', '.kpppPppppPpppk.', '.kkkpPppppPpkkk.',
    '...kpPppppPpk...', '...kpppyyyppk...', '...kpppyyyppk...', '...kpppppppppk..', '...kPpppppppPk..', '...kPPPPPPPPPk..',
    '...kkkkkkkkkkk..'],
  map: [
    '................', '.kkkkk.kkkkk.kk.', '.kllllkllllkllk.', '.kllllkllrlkllk.', '.kllgglklrrlkllk', '.klggggklllklbbk',
    '.klggglkkllklbbk', '.kllggkllyllkbbk', '.kllllklyyylklbk', '.kllllklllllklk.', '.kllllklllllklk.', '.kkkkk.kkkkk.kk.'],
  world: [
    '................', '.....kkkkkk.....', '...kkbbbbbbkk...', '..kbbggbbbbbbk..', '.kbggggbbbbggbk.', '.kbbgggbbbgggbk.',
    '.kbbbggbbbgggbk.', '.kbbbbbbbbbggbk.', '.kbbbbbggbbbbbk.', '.kbbbbggggbbbbk.', '..kbbbgggbbbbk..', '...kkbbbbbbkk...',
    '.....kkkkkk.....'],
  events: [
    '...k............', '...kkkkkkkkk....', '...krrrrrrrrk...', '...krrrryrrrrk..', '...krrryyyrrrk..', '...krrrryrrrrk..',
    '...krrrrrrrrk...', '...kkkkkkkkk....', '...k............', '...k.....y......', '...k....yyy.....', '...k.....y......',
    '..kkk...........', '.kkkkk..........'],
  quest: [
    '................', '..kkkkkkkkkkk...', '.kllllllllllllk.', '.kkllllllllllkk.', '..klkkkkkkkklk..', '..kllllllllllk..',
    '..klkkkkkkkklk..', '..kllllllllllk..', '..klkkkkkllllk..', '..kllllllllllk..', '.kkllllllllllkk.', '.kllllllllllllk.',
    '..kkkkkkkkkkkk..'],
  pet: [
    '................', '...kk......kk...', '..knnk....knnk..', '..knnk....knnk..', '...kk.kkkk.kk...', '.kk..knnnnk..kk.',
    'knnk.knnnnk.knnk', 'knnk.knnnnk.knnk', '.kk.knnnnnnk.kk.', '...knnnnnnnnk...', '...knnnnnnnnk...', '....kkkkkkkk....'],
  auto: [
    'kk............kk', 'ksk..........ksk', '.ksk........ksk.', '..ksk......ksk..', '...ksk....ksk...', '....ksk..ksk....',
    '.....kskksk.....', '......kssk......', '.....kskksk.....', '..kkkskk.kskkk..', '..knkk....kkNk..', '.knk........kNk.',
    'knk..........kNk', 'kk............kk'],
  book: [
    '................', '.kkkkkkkkkkkkk..', '.kbbbbbbbbbbbbk.', '.kbbbyyyyyybbbk.', '.kbbbykkkkybbbk.', '.kbbbyyyyyybbbk.',
    '.kbbbbbbbbbbbbk.', '.kbbbbbbbbbbbbk.', '.kBbbbbbbbbbbbk.', '.kBbbbbbbbbbbbk.', '.kBkkkkkkkkkkkk.', '.kBllllllllllk..',
    '.kkkkkkkkkkkkk..'],
  mail: [
    '................', '................', '.kkkkkkkkkkkkkk.', '.kkllllllllllkk.', '.klkllllllllklk.', '.kllkllllllkllk.',
    '.klllkllllkl lk.', '.kllllkrrkllllk.', '.klllllrrlllllk.', '.kllllllllllllk.', '.kllllllllllllk.', '.kkkkkkkkkkkkkk.'],
  online: [
    '................', '....kkk.........', '...kttttk..kkk..', '...kttttk.kttttk', '...kttttk.kttttk', '....kkkk..kttttk',
    '..kkbbbbkk.kkkk.', '.kbbbbbbbbkggggk', '.kbbbbbbbbkgggggk', '.kbbbbbbbbkgggggk', '.kkkkkkkkkkkkkkk.'],
  settings: [
    '................', '......kkkk......', '..kk.kssssk.kk..', '..ksksssssskskk.', '...ksssssssssk..', '..kssskkkksssk..',
    '.kssskk..kksssk.', '.ksssk....ksssk.', '.ksssk....ksssk.', '.kssskk..kksssk.', '..kssskkkksssk..', '...ksssssssssk..',
    '..ksksssssskskk.', '..kk.kssssk.kk..', '......kkkk......'],
  repair: [
    '................', '..........kkk...', '.........kssk.k.', '.........kssskk.', '........kssssk..', '.......kssskk...',
    '......kssk......', '.....kssk.......', '....kssk........', '...knnk.........', '..knnk..........', '.knnk...........',
    '.kNk............', '.kk.............'],
  card: [
    '................', '...kkkkkkkkkk...', '..kppppppppppk..', '..kpllllllllpk..', '..kplllyyllllpk.', '..kpllyyyylllpk.',
    '..kplllyyllllpk.', '..kpllllllllpk..', '..kpkkkkkkkkpk..', '..kpllllllllpk..', '..kpkkkkkkllpk..', '..kppppppppppk..',
    '...kkkkkkkkkk...'],
  refine: [
    '................', '..kkkkkkkk......', '.kssssssssk.....', '.kssssssssk.....', '..kkkksskk......', '.....kssk.......',
    '.....knnk.......', '.....knnk....k..', '.....knnk...kyk.', '.....knnk..kyyyk', '.....knnk...kyk.', '.....kNNk....k..',
    '......kk........'],
  market: [
    '................', '.kkkkkkkkkkkkkk.', 'krrwwrrwwrrwwrrk', 'krrwwrrwwrrwwrrk', '.kkkkkkkkkkkkkk.', '.kn..........nk.',
    '.kn..kkk.kk..nk.', '.kn.kyyykggk.nk.', '.kkkkkkkkkkkkkk.', '.knnnnnnnnnnnnk.', '.kNNNNNNNNNNNNk.', '.kk..........kk.'],
  reset: [
    '................', '.....kkkkk......', '...kkgggggkk.k..', '..kggkkkkkggkgk.', '..kgk.....kggggk', '.kgk.......kgggk',
    '.kgk......kggggk', '.kgk.......kkkk.', '.kkkk.......kgk.', '.kgggk......kgk.', 'kggggk.....kgk..', '.kgkggkkkkkggk..',
    '..k.kkgggggkk...', '......kkkkk.....'],
  storage: [
    '................', '...kkkkkkkkkk...', '..knnnnnnnnnnk..', '.knnnnnnnnnnnnk.', '.kkkkkkkkkkkkkk.', '.kyNNNNyyNNNNyk.',
    '.kyNNNkyykNNNyk.', '.kyNNNkkkkNNNyk.', '.knnnnnnnnnnnnk.', '.knnnnnnnnnnnnk.', '.kyNNNNNNNNNNyk.', '.kkkkkkkkkkkkkk.'],
  shop: [
    '................', '......kkkk......', '......kssk......', '.......kk.......', '......kccK......', '.....kccccK.....',
    '....kccccccK....', '...kgggggggggk..', '...kggwgggggggk.', '...kgwggggggggk.', '...kggggggggggk.', '....kGGGGGGGk...',
    '.....kkkkkkk....'],
  sell: [
    '................', '.....kkkkkk.....', '...kkyyyyyykk...', '..kyyyllllyyyk..', '.kyyylkkkklyyyk.', '.kyyylkyyyyyyyk.',
    '.kyyyyykkkyyyyk.', '.kyyyyyyyklyyyk.', '.kyyylkkkklyyyk.', '..kyyyllllyyyk..', '...kkYYYYYYkk...', '.....kkkkkk.....'],
  daily: [
    '................', '....kk....kk....', '...krrk..krrk...', '....krrkkrrk....', '.kkkkkkkkkkkkkk.', '.kmmmmmrrmmmmmk.',
    '.kkkkkkkkkkkkkk.', '..kmmmmrrmmmmk..', '..kmmmmrrmmmmk..', '..kmmmmrrmmmmk..', '..kmmmmrrmmmmk..', '..kkkkkkkkkkkk..'],
  news: [
    '.......kk.......', '......kyyk......', '.....kyyyyk.....', '....kyyyyyyk....', '....kyyyyyyk....', '...kyyyyyyyyk...',
    '...kyyyyyyyyk...', '...kyyyyyyyyk...', '..kyyyyyyyyyyk..', '.kyyyyyyyyyyyyk.', '.kkkkkkkkkkkkkk.', '......kyyk......',
    '.......kk.......'],
  hd: [
    '.........k......', '........kyk.....', '........kyk.....', '......kkyyykk...', '.....kyyywyyyk..', '......kkyyykk...',
    '..k.....kyk.....', '.kyk....kyk.....', 'kyyyk....k......', '.kyk.......k....', '..k.......kck...', '.........kcwck..',
    '..........kck...', '...........k....'],
  party: [
    '................', '...kkk....kkk...', '..ktttk..ktttk..', '..ktttk..ktttk..', '...kkk....kkk...', '..kbbbk..kgggk..',
    '.kbbbbbkkgggggk.', '.kbbkttkkttkggk.', '.kbbktttttttkgk.', '.kbbbkkkkkkkggk.', '.kkkkk....kkkkk.'],
  trade: [
    '................', '.........k......', '.........kk.....', '.kkkkkkkkkgk....', '.kgggggggggggk..', '.kkkkkkkkkgk....',
    '.........kk.....', '.....k...k......', '....kk..........', '...kbkkkkkkkkkk.', '..kbbbbbbbbbbbk.', '...kbkkkkkkkkkk.',
    '....kk..........', '.....k..........'],
  whisper: [
    '................', '..kkkkkkkkkkkk..', '.kllllllllllllk.', '.kllkllkllkllk.', '.kllllllllllllk.', '.kllllllllllllk.',
    '..kkkkllkkkkkk..', '.....kllk.......', '......klk.......', '.......kk.......'],
  heart: [
    '................', '..kkk....kkk....', '.krrrk..krrrk...', 'krrwrrkkrrrrrk..', 'krwrrrrrrrrrrk..', 'krrrrrrrrrrrrk..',
    '.krrrrrrrrrrk...', '..krrrrrrrrk....', '...krrrrrrk.....', '....krrrrk......', '.....krrk.......', '......kk........'],
  guild: [
    '................', '..kkkkkkkkkkk...', '..kbbbbbbbbbbk..', '..kbbbyyybbbbk..', '..kbbyyyyybbbk..', '..kbbbyyybbbbk..',
    '..kbbbbybbbbbk..', '..kbbbbbbbbbbk..', '..kbbkbbbkbbbk..', '..kbk.kbk.kbk...', '..kk...k...kk...', '..k.............',
    '..k.............', '.kkk............'],
  leave: [
    '................', '..kkkkkkkk......', '..knnnnnnk......', '..knnnnnnk......', '..knnnnnyk..k...', '..knnnnnnk..kk..',
    '..knnnnnnkkkkrk.', '..knnnnnnkrrrrrk', '..knnnnnnkkkkrk.', '..knnnnnnk..kk..', '..knnnnnnk..k...', '..kkkkkkkk......'],
  close: [
    '................', '..kk........kk..', '.krrk......krrk.', '.krrrk....krrrk.', '..krrrk..krrrk..', '...krrrkkrrrk...',
    '....krrrrrrk....', '....krrrrrrk....', '...krrrkkrrrk...', '..krrrk..krrrk..', '.krrrk....krrrk.', '.krrk......krrk.',
    '..kk........kk..'],
  weapon: [
    '................', '.............kk.', '............kssk', '...........ksssk', '..........ksssk.', '.........ksssk..',
    '........ksssk...', '..kk...ksssk....', '..kyk.ksssk.....', '...kykssk.......', '....kyyk........', '...knkkyk.......',
    '..knk..kyk......', '.knk....kk......', '.kk.............'],
  helm: [
    '................', '......kkkk......', '....kkssssk.....', '...kssssssssk...', '..ksssssssssskk.', '..kssskkkkksssk.',
    '..kssk.....ksk..', '..kssk.....ksk..', '..ksssk...ksssk.', '...kssk...kssk..', '....kk.....kk...'],
  cape: [
    '................', '....kkkkkkkk....', '...kpppppppppk...', '...kppkkkkkppk..', '..kppk....kppk..', '..kppk....kpppk.',
    '.kpppk....kpppk.', '.kpppk....kppppk', '.kppPk....kPpppk', 'kpppPk....kPppppk', 'kkkkkk....kkkkkk'],
  ring: [
    '................', '.......kk.......', '......kcck......', '.....kcwcck.....', '......kcck......', '.....kkyykk.....',
    '....kyk..kyk....', '...kyk....kyk...', '...kyk....kyk...', '...kyk....kyk...', '....kyk..kyk....', '.....kkyykk.....',
    '.......kk.......'],
  boots: [
    '................', '....kkkkk.......', '....knnnk.......', '....knnnk.......', '....knnnk.......', '....knnnk.......',
    '....knnnkkkkk...', '...knnnnnnnnnk..', '...knnnnnnnnnnk.', '...kNNNNNNNNNNk.', '...kkkkkkkkkkkk.'],
  shirt: [
    '................', '....kkk..kkk....', '..kkbbbkkbbbkk..', '.kbbbbbbbbbbbbk.', '.kbbbbbbbbbbbbk.', '.kkkbbbbbbbbkkk.',
    '...kbbbbbbbbk...', '...kbbbbbbbbk...', '...kbbbbbbbbk...', '...kBbbbbbbBk...', '...kBBBBBBBBk...', '...kkkkkkkkkk...'],
  offhand: [
    '................', '......kkkk......', '....kkbbbbkk....', '...kbbbccbbbk...', '..kbbbcwwcbbbk..', '..kbbcwwwwcbbk..',
    '..kbbbcwwcbbbk..', '...kbbbccbbbk...', '....kkbbbbkk....', '......kkkk......'],
  trophy: [
    '................', '..kkkkkkkkkkkk..', '.kykyyyyyyyykyk.', 'kyk.kyyyyyyk.kyk', 'kyk.kyywyyyk.kyk', '.kykkyywyyykkyk.',
    '..kkkyyyyyykkk..', '.....kyyyyk.....', '......kYYk......', '.......kk.......', '......kYYk......', '....kkkkkkkk....',
    '....kYYYYYYk....', '....kkkkkkkk....'],
  medal: [
    '..kkk....kkk....', '..kbbk..kbbk....', '...kbbkkbbk.....', '....kbbbbk......', '.....kkkk.......', '....kyyyyk......',
    '...kyywwyyk.....', '...kywyyyyk.....', '...kyyyyyYk.....', '....kyyyYk......', '.....kkkk.......'],
  chat: [
    '................', '..kkkkkkkkkkkk..', '.kwwwwwwwwwwwwk.', '.kwkkwwkkwwkkwk.', '.kwkkwwkkwwkkwk.', '.kwwwwwwwwwwwwk.',
    '..kkkwwkkkkkkk..', '....kwk.........', '....kk..........'],
  trash: [
    '................', '......kkkk......', '..kkkkkkkkkkkk..', '..kssssssssssk..', '..kkkkkkkkkkkk..', '...kSsSsSsSsk...',
    '...kSsSsSsSsk...', '...kSsSsSsSsk...', '...kSsSsSsSsk...', '...kSsSsSsSsk...', '...kSSSSSSSSk...', '....kkkkkkkk....'],
  gem: [
    '................', '....kkkkkkkk....', '...kccwcccbck...', '..kcwcccccbbbk..', '.kkkkkkkkkkkkkk.', '.kbcccbbbbccbBk.',
    '..kbccbbbbcbBk..', '...kbcbbbbcBk...', '....kbcbbcBk....', '.....kbcbBk.....', '......kbBk......', '.......kk.......'],
  bolt: [
    '.........kkk....', '........kyyk....', '.......kyyk.....', '......kyyk......', '.....kyyykkkk...', '....kyyyyyyyk...',
    '...kkkkyyyyk....', '......kyyyk.....', '.....kyyk.......', '....kyyk........', '....kyk.........', '....kk..........'],
  hall: [
    '.......kk.......', '.....kkyykk.....', '...kkyyyyyykk...', '.kkkkkkkkkkkkkk.', '.kllllllllllllk.', '..kk.kk..kk.kk..',
    '..kl.kl..kl.kl..', '..kl.kl..kl.kl..', '..kl.kl..kl.kl..', '..kl.kl..kl.kl..', '.kkkkkkkkkkkkkk.', 'kllllllllllllllk', 'kkkkkkkkkkkkkkkk'],
  bug: [
    '...k......k.....', '....k....k......', '.....kkkk.......', '....kddddk......', '..kkrrkkrrkk....', '.k.krrrkrrrk.k..',
    '...krkrkrkrk....', '.kkkrrrkrrrkkk..', '...krkrkrkrk....', '.k.krrrkrrrk.k..', '....kkrkrkk.....', '......kkk.......'],
  letter: [
    '................', '.kkkkkkkkkkkkkk.', '.kwkwwwwwwwwkwk.', '.kwwkwwwwwwkwwk.', '.kwwwkwwwwkwwwk.', '.kwwwwkrrkwwwwk.',
    '.kwwwwwrrwwwwwk.', '.kwwwwwwwwwwwwk.', '.kkkkkkkkkkkkkk.'],
};
const svgCache = new Map();
// คืนสตริง SVG (ใส่ใน innerHTML) · cls = คลาสเพิ่มเติม
export function pxIcon(name, size = 20, cls = '') {
  const k = name + '|' + size + '|' + cls;
  if (svgCache.has(k)) return svgCache.get(k);
  const rows = ART[name]; if (!rows) return '';
  const h = rows.length, off = Math.floor((16 - h) / 2);
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < 16) {
      const ch = row[x] || '.';
      if (ch === '.' || ch === ' ' || !PAL[ch]) { x++; continue; }
      let e = x + 1; while (e < 16 && row[e] === ch) e++;
      rects += `<rect x="${x}" y="${y + off}" width="${e - x}" height="1" fill="${PAL[ch]}"/>`;
      x = e;
    }
  });
  const s = `<svg class="px-ic ${cls}" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
  svgCache.set(k, s);
  return s;
}
export const PX_ICON_NAMES = Object.keys(ART);

// v0.91 แทนอีโมจินำหน้าข้อความบนปุ่ม/แท็บ ด้วยไอคอนพิกเซล (ไล่ทั้งหน้าจอ + ปุ่มที่สร้างใหม่ภายหลัง)
const EMOJI_ICON = { '📜': 'quest', '🏆': 'trophy', '🎖': 'medal', '⚔': 'weapon', '🗑': 'trash', '✉': 'letter', '🏛': 'hall', '💎': 'gem', '⚡': 'bolt', '💬': 'chat', '📖': 'book', '👥': 'online', '⚙': 'settings', '🛒': 'shop', '🔨': 'refine', '🏪': 'market' };
const EMO_RE = new RegExp('^\\s*(' + Object.keys(EMOJI_ICON).join('|') + ')\\uFE0F?\\s*');
function pxifyButton(b) {
  const n = b.firstChild; if (!n || n.nodeType !== 3) return;
  const m = n.nodeValue.match(EMO_RE); if (!m) return;
  const only = !n.nodeValue.slice(m[0].length).trim() && b.childNodes.length === 1;
  n.nodeValue = n.nodeValue.slice(m[0].length);
  const sz = only ? Math.max(16, Math.min(28, Math.round(parseFloat(getComputedStyle(b).fontSize) * 1.25) || 20)) : 16;
  b.insertAdjacentHTML('afterbegin', pxIcon(EMOJI_ICON[m[1]], sz, only ? 'px-solo' : ''));
}
export function pxifyButtons(root) {
  const run = (el) => { if (el.matches && el.matches('button, [role=tab]')) pxifyButton(el); if (el.querySelectorAll) el.querySelectorAll('button, [role=tab]').forEach(pxifyButton); };
  run(root);
  let q = [], raf = 0;
  new MutationObserver((list) => { for (const r of list) for (const n of r.addedNodes) { if (n.nodeType === 1) q.push(n); else if (n.nodeType === 3 && n.parentElement && n.parentElement.matches('button, [role=tab]')) q.push(n.parentElement); } if (!raf) raf = requestAnimationFrame(() => { raf = 0; const a = q; q = []; a.forEach(run); }); }).observe(root, { childList: true, subtree: true });
}
