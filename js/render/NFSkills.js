// v0.60 สกิลชุดใหม่ (ภาพจาก Night Forge VFX ทั้งหมด) — ตัวจัดจังหวะดาเมจกลาง
// ภาพวาดโดย PixelVfx (SKILL_VFX) · ไฟล์นี้แค่ "ตีตามเวลา" ตามสเปก sk.nf ที่ประกาศในข้อมูลสกิล
// sk.nf = {
//   at: 'self' | 'target' (จุดศูนย์กลางของวงดาเมจ), magic,
//   anim: 'melee' | 'cast' | 'spin' | 'jump' | 'castHold', animDur,
//   hits: [{ t: วินาที, r: รัศมี (ช่อง · 0 = เฉพาะเป้าหลัก), m: ตัวคูณของฮิตนี้, at: 'self'|'target',
//            line: { len, w } (โดนทุกตัวในแนวหน้าผู้เล่น), knock, stun, slow, freeze (วิ · โอกาสตาม sk.freeze), shake }],
//   heals: [วินาที, ...]   (เรียก c.heal ตามเวลา)
//   pull: { from, to, r, step }  (ดูดศัตรูในรัศมี r เข้าหาจุดกลาง ความเร็ว step ช่อง/วิ ระหว่างเวลา from→to)
//   sky: { t, dark, dur }  (ฟ้ามืดลง) · lift: { t, h, dur, hold } (ตัวลอย)
// }
export function installNFSkills(proto) {
  proto.fx_nf = function (c) {
    const S = c.spec || {};
    if (S.anim) c.anim(S.anim, S.animDur || 0.45);
    const mainPos = () => { const t = c.targets[c.main]; return t ? t.pos.clone() : (c.center ? c.center.clone() : c.caster.pos.clone().setY(0)); };
    const center = (at) => ((at || S.at) === 'self' ? c.caster.pos.clone().setY(0) : mainPos().setY(0));
    const hits = S.hits || [];
    hits.forEach((h, hi) => this.after(h.t || 0, () => {
      let list;
      if (h.line) {
        const from = c.caster.pos.clone().setY(0), tp = mainPos().setY(0);
        const dir = tp.clone().sub(from); if (dir.lengthSq() < 1e-4) dir.copy(c.caster.facing); dir.setY(0).normalize();
        list = c.targets.map((t, i) => [t, i]).filter(([t]) => {
          const d = t.pos.clone().setY(0).sub(from), along = d.dot(dir);
          return along >= -0.3 && along <= (h.line.len || 5) && Math.abs(d.x * dir.z - d.z * dir.x) <= (h.line.w || 1);
        });
      } else {
        const cen = center(h.at);
        list = h.r ? this.inRadius(c, cen, h.r) : (c.targets[c.main] ? [[c.targets[c.main], c.main]] : []);
      }
      for (const [t, i] of list) {
        const r = c.hit(i, { mult: h.m ?? 1, knock: h.knock || 0, stun: h.stun || 0, slow: h.slow || null, freeze: h.freeze || 0, magic: !!S.magic, hitIndex: hi, total: hits.length });
        if (h.freeze && (!r || r.freeze)) this.iceBlock(t, Math.min(3, (r && r.freeze) || h.freeze));
        if (h.stun && r && r.stun && i === c.main) this.stunStars(t, r.stun);
      }
      if (h.shake) c.shake(h.shake);
    }));
    for (const t of S.heals || []) this.after(t, () => c.heal());
    if (S.pull && c.pull) {
      const P = S.pull, cen = center(P.at);
      this.after(P.from || 0, () => this.anim((P.to || 1) - (P.from || 0), (k, dt) => { c.pull(cen, P.r || 3, (P.step || 4) * dt); }));
    }
    if (S.sky && c.sky) this.after(S.sky.t || 0, () => c.sky(S.sky.dark ?? 0.6, S.sky.dur || 2));
    if (S.lift && c.lift) this.after(S.lift.t || 0, () => c.lift(S.lift.h || 1, S.lift.dur || 0.5, S.lift.hold || 0));
    const end = Math.max(0.6, ...hits.map((h) => h.t || 0), ...(S.heals || [0]), S.pull ? S.pull.to || 0 : 0);
    return end + 0.4;
  };
}
