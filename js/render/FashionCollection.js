import { THREE } from './three.js?v=0.67.0';
import { toon } from './Toon.js?v=0.67.0';

// Low-poly shapes attached to the live rig, never cropped concept-board images.
function group(parent,x=0,y=0,z=0) { const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g; }
function part(parent,geo,color,x=0,y=0,z=0,glow=false) {
  const m=new THREE.Mesh(geo,toon(color,{side:THREE.DoubleSide,...(glow?{emissive:color,emissiveIntensity:.45}:{})}));
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
const box=(x,y,z)=>new THREE.BoxGeometry(x,y,z);
const gem=()=>new THREE.OctahedronGeometry(.045,0);
function plate(parent,points,color) {const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return part(parent,new THREE.ExtrudeGeometry(s,{depth:.018,bevelEnabled:false}),color);}
function cloth(rig,p,rt) {
  for(const side of [-1,1]) {
    let anchor=group(rig.torso,side*.09,.11,-.19);
    for(let i=0;i<3;i++) {
      const joint=group(anchor,0,i?-.14:0,0);
      part(joint,box(.16+i*.025,.16,.018),i===2?p.trim:p.color,0,-.08,0);
      rt.on(({t,walk})=>{joint.rotation.x=.08+walk*.28+Math.sin(t*2.4-i*.6+side*.3)*(.035+walk*.065);joint.rotation.z=side*.035+Math.sin(t*1.7-i*.4)*.018;});
      anchor=joint;
    }
  }
}
function outfit(rig,p,rt,L={}) {
  part(rig.torso,new THREE.CylinderGeometry(.071,.083,.1,8),L.skin||'#f6d6b8',0,.42,0);
  part(rig.torso,new THREE.TorusGeometry(.12,.02,4,12),p.trim,0,.375,0).rotation.x=Math.PI/2;
  const shell=part(rig.torso,new THREE.CylinderGeometry(.17,.207,.27,8,1,true),p.color,0,.23,0);
  shell.userData.fashion24=true;
  part(rig.torso,box(.15,.025,.025),p.trim,0,.32,.181);
  part(rig.torso,gem(),p.glow,0,.24,.207,true);
  part(rig.torso,box(.085,.04,.025),p.trim,0,.07,.219);
  rig.arms.forEach((arm,i)=>{
    part(arm,box(.13,.065,.15),p.trim,(i?1:-1)*.022,0,0);
    part(arm,new THREE.CylinderGeometry(.059,.055,.1,6),p.color,(i?1:-1)*.033,-.19,0);
    if(p.key==='dragon')part(arm,new THREE.ConeGeometry(.035,.13,4),p.glow,(i?1:-1)*.06,.08,0,true);
  });
  rig.legs.forEach(leg=>part(leg,new THREE.CylinderGeometry(.077,.074,.12,6),p.trim,0,-.19,.007));
  cloth(rig,p,rt);
}
function head(rig,p,rt) {
  const crown=group(rig.head,0,.13,0);
  part(crown,new THREE.TorusGeometry(.18,.014,4,16),p.trim,0,.05,0).rotation.x=Math.PI/2;
  if(p.key==='dragon')for(const s of [-1,1]) {
    const horn=part(crown,new THREE.ConeGeometry(.047,.22,5),p.color,s*.16,.13,0);horn.rotation.z=-s*.45;
    part(crown,gem(),p.glow,s*.115,.047,.13,true);
  }
  else if(p.key==='raven') {
    // Open face: solid hood panels stop behind the eyes instead of covering them.
    part(crown,box(.38,.045,.32),p.color,0,.075,-.035);
    for(const s of [-1,1])part(crown,box(.035,.22,.25),p.color,s*.19,-.04,-.07);
    part(crown,gem(),p.glow,0,.03,.19,true);
  } else if(p.key==='lunar') {
    const crescent=part(crown,new THREE.TorusGeometry(.086,.017,4,16,Math.PI*1.5),p.trim,0,.13,.17);crescent.rotation.z=-Math.PI/4;
    const star=part(crown,gem(),p.glow,.075,.13,.17,true);rt.on(({t})=>{star.rotation.y=t*.6;});
  } else {
    for(let i=-2;i<=2;i++)part(crown,new THREE.ConeGeometry(.025,.085+(2-Math.abs(i))*.023,4),p.trim,i*.065,.11,.13);
    part(crown,gem(),p.glow,0,.095,.18,true);
  }
}
function wings(rig,p,rt) {
  // v0.25.1: ปีกเต็มขนาด (เดิมขนสั้นจนดูเหมือนปีกขาดครึ่ง) — กระดูกปีก + ขนคลุม + ขนปลายยาว
  for(const s of [-1,1]) {
    const hinge=group(rig.torso,s*.1,.33,-.17);hinge.scale.x=s;
    if(p.key==='dragon') {
      const W=group(hinge);W.scale.setScalar(1.45);
      plate(W,[[0,0],[.2,.4],[.51,.3],[.69,-.06],[.43,.02],[.27,-.23],[.16,-.12]],p.trim);
      for(const [x,y] of [[.2,.4],[.51,.3],[.69,-.06]]) {
        const rib=part(W,box(.027,Math.hypot(x,y),.028),p.color,x/2,y/2,-.01);rib.rotation.z=-Math.atan2(x,y);
      }
      part(W,new THREE.ConeGeometry(.03,.1,4),p.glow,.2,.45,0,true).rotation.z=-.3;
    }else {
      const arm=part(hinge,box(.74,.04,.03),p.trim,.37,.24,.008);arm.rotation.z=.2;
      for(let i=0;i<8;i++) {   // ขนคลุม (สั้น ซ้อนบน)
        const f=plate(hinge,[[0,0],[.05,.05],[.09,-.07],[.04,-.2],[.005,-.09]],i%2?p.trim:p.color);
        f.position.set(.05+i*.082,.17+i*.016,.012);f.rotation.z=-.1-i*.03;f.scale.x=1.3;
      }
      for(let i=0;i<11;i++) {   // ขนปลาย (ยาวขึ้นไปทางปลายปีก)
        const L=.9+i*.07;
        const f=plate(hinge,[[0,0],[.055,.06],[.1,-.12],[.045,-.46*L],[.004,-.2]],i%4===3?p.trim:p.color);
        f.position.set(.04+i*.066,.12+i*.022-(i>7?(i-7)*.02:0),-.004*i);f.rotation.z=.05-i*.055;f.scale.x=1.35;
      }
    }
    rt.on(({t,walk})=>{hinge.rotation.y=s*(.32+Math.sin(t*(2+walk))*(.1+walk*.06));hinge.rotation.z=Math.sin(t*2)*.035;});
  }
}
function back(rig,p,rt) {
  if(p.key==='dragon'||p.key==='celestial')return wings(rig,p,rt);
  const orbit=group(rig.torso,0,.27,-.3);
  if(p.key==='lunar') {
    part(orbit,new THREE.TorusGeometry(.29,.013,4,24),p.trim,0,0,0,true);
    for(let i=0;i<5;i++) {
      const crystal=part(orbit,gem(),p.glow,0,0,0,true);crystal.scale.set(1,1.9,1);
      rt.on(({t})=>{const a=t*.55+i*Math.PI*2/5;crystal.position.set(Math.cos(a)*.35,Math.sin(a)*.35,-.015);crystal.rotation.y=t+i;});
    }
  }else {
    const bird=group(orbit,0,.26,-.01);
    part(bird,new THREE.OctahedronGeometry(.1,0),p.color);
    part(bird,new THREE.ConeGeometry(.026,.09,4),p.trim,0,0,.13).rotation.x=Math.PI/2;
    for(const s of [-1,1]) {
      const hinge=group(bird,s*.055,.02,0);hinge.scale.x=s;
      plate(hinge,[[0,0],[.17,.06],[.25,-.08],[.12,-.05],[.07,-.1]],p.color);
      rt.on(({t,walk})=>{hinge.rotation.z=s*(.15+Math.sin(t*5)*(.12+walk*.1));});
    }
    for(const s of [-1,1])part(bird,new THREE.OctahedronGeometry(.012,0),p.glow,s*.035,.035,.072,true);
    rt.on(({t})=>{bird.position.y=.26+Math.sin(t*2.2)*.025;});
  }
}
export const FASHION_BUILDERS={outfit,head,back};
