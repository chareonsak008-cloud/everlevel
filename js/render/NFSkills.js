// v0.60 สกิลชุดใหม่ (ภาพจาก Night Forge VFX ทั้งหมด) — ตัวจัดจังหวะดาเมจกลาง
// ภาพวาดโดย PixelVfx (SKILL_VFX) · ไฟล์นี้แค่ "ตีตามเวลา" ตามสเปก sk.nf ที่ประกาศในข้อมูลสกิล
// sk.nf = {
//   at: 'self' | 'target' (จุดศูนย์กลางของวงดาเมจ), magic,
//   anim: 'melee' | 'cast' | 'spin' | 'jump' | 'castHold', animDur,
//   hits: [{ t: วินาที, r: รัศมี (ช่อง · 0 = เฉพาะเป้าหลัก), m: ตัวคูณของฮิตนี้, at: 'self'|'target',
//            line: { len, w } (โดนทุกตัวในแนวหน้าผู้เล่น), knock, stun, slow, freeze (วิ · โอกาสตาม sk.freeze), shake, stop (hitstop วิ) }],
//   heals: [วินาที, ...]   (เรียก c.heal ตามเวลา)
//   pull: { from, to, r, step }  (ดูดศัตรูในรัศมี r เข้าหาจุดกลาง ความเร็ว step ช่อง/วิ ระหว่างเวลา from→to)
//   sky: { t, dark, dur }  (ฟ้ามืดลง) · lift: { t, h, dur, hold } (ตัวลอย)
//   dash: { t, dist, dur, back }  (พุ่งตัว dist หน่วยโลก · back = ถอยหนีเป้า/ถอยหลัง)
//   flashes: [{ t, a, color }]  (แฟลชเต็มจอ) · texts: [{ t, text }] (ข้อความลอยเหนือหัว เช่น SHIELD)
//   speed: เร่งจังหวะทั้งสกิล (เช่น 1.6 = เร็วขึ้น 60%)
//   arrows: [{ t, n, gap, all, arc }]  (ยิงลูกธนูจริงไปหาเป้าหลัก n ดอก ห่างกัน gap วิ · all = ยิงใส่ทุกเป้าในรัศมี r แทน)
// }
export function installNFSkills(proto) {
  proto.fx_nf = function (c) {
    const S = c.spec || {};
    const k = 1 / (S.speed || 1), after = (t, fn) => this.after((t || 0) * k, fn);   // v0.65.1 speed = เร่งทั้งสกิล (ภาพเร่งด้วย SKILL_VFX.speed ค่าเดียวกัน)
    if (S.anim) c.anim(S.anim, S.animDur || 0.45);
    const mainPos = () => { const t = c.targets[c.main]; return t ? t.pos.clone() : (c.center ? c.center.clone() : c.caster.pos.clone().setY(0)); };
    const center = (at) => ((at || S.at) === 'self' ? c.caster.pos.clone().setY(0) : mainPos().setY(0));
    const hits = S.hits || [];
    hits.forEach((h, hi) => after(h.t || 0, () => {
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
      if (h.stop && c.hitstop && list.length) c.hitstop(h.stop);
    }));
    for (const t of S.heals || []) after(t, () => c.heal());
    if (S.pull && c.pull) {
      const P = S.pull, cen = center(P.at);
      after(P.from || 0, () => this.anim(((P.to || 1) - (P.from || 0)) * k, (k, dt) => { c.pull(cen, P.r || 3, (P.step || 4) * dt); }));
    }
    if (S.arrows && c.shoot) for (const A of S.arrows) after(A.t || 0, () => {
      if (A.all) { for (const [, i] of this.inRadius(c, center(A.at), A.r || 3)) c.shoot(i, A); return; }
      for (let n = 0; n < (A.n || 1); n++) after(n * (A.gap || 0.12), () => { if (c.targets[c.main]) c.shoot(c.main, A); });
    });
    if (S.dash && c.move) after(S.dash.t || 0, () => {
      const from = c.caster.pos.clone().setY(0), t = c.targets[c.main];
      const dir = t ? from.clone().sub(t.pos.clone().setY(0)) : c.caster.facing.clone().negate();
      if (dir.lengthSq() < 1e-4) dir.copy(c.caster.facing).negate();
      dir.setY(0).normalize(); if (!S.dash.back) dir.negate();
      c.move(from.addScaledVector(dir, S.dash.dist || 3), S.dash.dur || 0.25);
    });
    if (S.flashes && c.flash) for (const F of S.flashes) after(F.t || 0, () => c.flash(F.color || '#cfe9ff', F.a ?? 0.3));
    if (S.texts && c.buff) for (const X of S.texts) after(X.t || 0, () => c.buff(X.text));
    if (S.sky && c.sky) after(S.sky.t || 0, () => c.sky(S.sky.dark ?? 0.6, (S.sky.dur || 2) * k));
    if (S.lift && c.lift) after(S.lift.t || 0, () => c.lift(S.lift.h || 1, (S.lift.dur || 0.5) * k, (S.lift.hold || 0) * k));
    const end = Math.max(0.6, ...hits.map((h) => h.t || 0), ...(S.heals || [0]), S.pull ? S.pull.to || 0 : 0);
    return end * k + 0.4;
  };
}
