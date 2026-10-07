// ขนาดพื้นที่ชน (footprint) ของวัตถุแต่ละชนิด หน่วยเป็นช่อง
// ส่วนหน้าตา 3 มิติอยู่ที่ js/render/Models.js
export const OBJECT_SPECS = {
  house:    { fw: (o) => o.w || 5, fh: 3, solid: true },
  tree:     { fw: 1, fh: 1, solid: true },
  pine:     { fw: 1, fh: 1, solid: true },
  fountain: { fw: 4, fh: 3, solid: true },
  lamp:     { fw: 1, fh: 1, solid: true },
  stall:    { fw: 3, fh: 1, solid: true },
  well:     { fw: 2, fh: 1, solid: true },
  crate:    { fw: 1, fh: 1, solid: true },
  barrel:   { fw: 1, fh: 1, solid: true },
  bench:    { fw: 2, fh: 1, solid: true },
  sign:     { fw: 1, fh: 1, solid: true },
  tower:    { fw: 2, fh: 2, solid: true },
  boulder:  { fw: (o) => o.w || 1, fh: (o) => o.h || o.w || 1, solid: true },
  bush:     { fw: 1, fh: 1, solid: true },
  fence:    { fw: (o) => o.w || 3, fh: 1, solid: true },
  stump:    { fw: 1, fh: 1, solid: true },
  pillar:   { fw: 1, fh: 1, solid: true },
  campfire: { fw: 1, fh: 1, solid: true },
  warpstone: { fw: 1, fh: 1, solid: true },
  chest:    { fw: 1, fh: 1, solid: true },
  bigshroom: { fw: 1, fh: 1, solid: true },
  // v0.11
  icecrystal: { fw: 1, fh: 1, solid: true },
  snowman:  { fw: 1, fh: 1, solid: true },
  tent:     { fw: 2, fh: 2, solid: true },
  obsidian: { fw: 1, fh: 1, solid: true },
  vent:     { fw: 1, fh: 1, solid: true },
  bones:    { fw: 2, fh: 3, solid: true },
};

export function footprint(o) {
  const spec = OBJECT_SPECS[o.kind];
  if (!spec) throw new Error('Unknown object kind: ' + o.kind);
  const val = (v) => (typeof v === 'function' ? v(o) : v);
  return { fw: val(spec.fw), fh: val(spec.fh), solid: spec.solid };
}
