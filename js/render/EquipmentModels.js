import {THREE} from './three.js';
import {toon,bake} from './Toon.js';
// Shared geometry for inventory portraits, fitting room, and equipped characters.
export function makeEquipmentModel(d){
 const g=new THREE.Group(),{rank:r,band:b,variant:v,theme:t,type}=d;
 g.userData.equipmentId=d.id;
 const metal=toon(t.metal),dark=toon(t.dark),cloth=toon(t.cloth),gold=toon(r>=4?'#f0cf80':t.metal),gem=toon(t.gem,{emissive:t.gem,emissiveIntensity:r>=4?.55:.15});
 const add=(geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
 const box=(x,y,z,m,px=0,py=0,pz=0)=>add(new THREE.BoxGeometry(x,y,z),m,px,py,pz);
 const stone=(size,x,y,z)=>add(new THREE.OctahedronGeometry(size),gem,x,y,z);
 const ring=(rad,tube,x,y,z)=>add(new THREE.TorusGeometry(rad,tube,4,12),gold,x,y,z);
 const strip=(points,depth,mat)=>{const sh=new THREE.Shape();points.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));sh.closePath();return add(new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false}),mat);};
 if(type==='sword'||type==='knife'){
  // Forward Z is the existing hand grip axis, so attack animation stays aligned.
  const len=(type==='knife'?.30:.62)+b*.022+r*.014,w=.028+b*.004+r*.007;
  const blade=strip([[-w,0],[-w,len*.55],[-w*(1.1+v*.2),len*.74],[0,len],[w*(1.1+v*.2),len*.74],[w,len*.55],[w,0]],.025,metal);
  blade.rotation.x=Math.PI/2;blade.position.set(0,.013,.09);
  if(b>=4){const spine=strip([[-w*.65,.16],[-w*1.5,len*.50],[-w*.6,len*.88],[0,len*.72]],.012,gold);spine.rotation.x=Math.PI/2;spine.position.set(0,.025,.09);}
  if(b>=2){for(const s of [-1,1]){const fin=box(.025,.04,.10,gold,s*(w+.01),0,.22+b*.025);fin.rotation.y=s*.35;}}
  const guard=box(.13+r*.027,.03,.035,gold,0,0,.07);guard.rotation.y=(v-1)*.15;
  const grip=add(new THREE.CylinderGeometry(.02,.024,.14,6),dark,0,0,-.02);grip.rotation.x=Math.PI/2;
  stone(.025+r*.003,0,0,-.105);
  if(r>=2)stone(.03+r*.003,0,.026,.075);
  for(let i=0;i<r;i++)box(.012,.012,.025,gem,0,.023,.17+i*.055);
  if(r>=4)for(const s of [-1,1]){const fin=strip([[0,0],[s*.09,.06],[s*.13,.19],[s*.06,.14]],.025,gold);fin.rotation.x=Math.PI/2;fin.position.set(s*.08,.012,.04);}
 }else if(type==='staff'||type==='mace'){
  const mace=type==='mace',height=mace?.42:1.14+b*.026;
  if(mace){const shaft=add(new THREE.CylinderGeometry(.025,.025,.40,6),dark,0,0,.14);shaft.rotation.x=Math.PI/2;}
  else add(new THREE.CylinderGeometry(.021,.028,height+.18,6),dark,0,height/2-.15,0);
  const top=mace?new THREE.Group():g;if(mace){g.add(top);top.position.z=.40;}
  const cy=mace?0:height;
  if(mace){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.075+b*.007+r*.005),metal);top.add(m);}
  else {ring(.07+b*.008+r*.009,.016,0,cy,0);stone(.055+r*.007,0,cy,0);}
  const count=3+Math.min(5,b+r);
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2,rad=.075+r*.008;
   const p=new THREE.Mesh(new THREE.ConeGeometry(.016,.10+b*.012+r*.012,4),gold);
   p.position.set(Math.cos(a)*rad,cy+Math.sin(a)*rad,0);p.rotation.z=a-Math.PI/2;top.add(p);
  }
  if(r>=3&&!mace){ring(.12+r*.014,.013,0,cy,0);for(const sx of [-1,1]){const wing=strip([[0,0],[sx*.12,.06],[sx*.18,.24],[sx*.05,.17]],.02,gold);wing.position.set(sx*.05,cy-.04,0);}for(const s of [-1,1])stone(.025,s*.11,cy-.17,0);}
  if(mace&&r>=2){const s=new THREE.Mesh(new THREE.OctahedronGeometry(.046),gem);s.position.z=.07;top.add(s);}
 }else if(type==='bow'){
  const radius=.34+b*.01+r*.012;
  add(new THREE.TorusGeometry(radius,.022+r*.002,4,18,Math.PI*4/3),b<2?dark:metal).rotation.z=-Math.PI*2/3;
  const chord=-radius*.5;
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(chord,-radius*.866,0),new THREE.Vector3(chord,radius*.866,0)]),new THREE.LineBasicMaterial({color:'#f4e4bd'}));g.add(line);
  box(.048,.16,.045,dark,radius,0,0);
  for(const s of [-1,1]){
   const fin=strip([[0,0],[.07,.04],[.13,.13],[.04,.09]],.022,gold);fin.position.set(radius*.4,s*radius*.7,0);fin.scale.y=s*(.6+b*.1+r*.08);
   if(r>=2)stone(.028+r*.003,radius*.72,s*radius*.48,.025);
  }
  if(r>=4){ring(.07,.012,radius+.01,0,0);for(const s of [-1,1]){const wing=strip([[0,0],[.17,.09],[.25,.23],[.08,.16]],.025,gold);wing.position.set(radius*.6,s*radius*.45,0);wing.scale.y=s;}}
 }else if(type==='body'){
  const torso=add(new THREE.CylinderGeometry(.19,.215,.43,6+v*2),b<2?cloth:metal,0,.16,0);torso.scale.z=.84;
  box(.31,.10,.035,dark,0,.07,.168);
  const plate=strip([[-.115,0],[-.145,.14],[0,.20],[.145,.14],[.115,0],[0,-.07]],.03,gold);plate.position.set(0,.17,.155);
  if(r>=2)stone(.035+r*.004,0,.27,.201);
  for(const s of [-1,1]){const shoulder=add(new THREE.BoxGeometry(.13+b*.008,.08+r*.007,.21),metal,s*.21,.35,0);shoulder.rotation.z=s*.22;
   for(let i=0;i<Math.min(3,r);i++)add(new THREE.ConeGeometry(.023,.06+b*.008,4),gold,s*(.20+i*.025),.42,0);
  }
  for(let i=0;i<r;i++)box(.02,.025,.018,gem,(i-(r-1)/2)*.034,.11,.197);
 }else if(type==='shield'){
  if(b%3===0){add(new THREE.CylinderGeometry(.19,.19,.05,8),b?metal:dark).rotation.x=Math.PI/2;}
  else {const p=strip([[-.17,.18],[.17,.18],[.17,-.04],[0,-.25],[-.17,-.04]],.05,metal);p.position.z=-.025;}
  box(.04,.33,.025,gold,0,0,.043);box(.28,.04,.025,gold,0,.04,.043);stone(.04+r*.006,0,.03,.07);
  for(let i=0;i<r;i++){const a=i/Math.max(1,r)*Math.PI*2;stone(.017,Math.cos(a)*.14,Math.sin(a)*.14,.06);}
 }else if(type==='head' && d.kind==='flower'){
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const p=add(new THREE.SphereGeometry(.043,6,4),cloth,Math.cos(a)*.04-.22,Math.sin(a)*.04+.38,.12);p.scale.z=.5;}stone(.032,-.22,.38,.14);
 }else if(type==='head' && d.kind==='bandana'){
  const band=add(new THREE.CylinderGeometry(.258,.258,.065,12,1,true),cloth,0,.32,0);band.material.side=THREE.DoubleSide;box(.05,.14,.02,cloth,-.25,.28,-.09);
 }else if(type==='head'){
  ring(.255,.025,0,.42,0).rotation.x=Math.PI/2;
  const n=3+b+Math.floor(r/2);
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const sp=add(new THREE.ConeGeometry(.034,.06+b*.012+r*.014,4),gold,Math.sin(a)*.25,.46,Math.cos(a)*.25);sp.rotation.z=-Math.sin(a)*.25;}
  if(r>=1)stone(.04+r*.003,0,.44,.275);
 }else if(type==='garment'){
  const p=strip([[-.16,0],[.16,0],[.29,-.68-r*.015],[.12,-.65],[0,-.75-r*.02],[-.12,-.65],[-.29,-.68-r*.015]],.02,cloth);p.position.set(0,0,-.12);p.scale.set(1+b*.045,1+b*.018,1);
  for(const s of [-1,1]){const trim=box(.018,.66,.022,gold,s*.18,-.32,-.085);trim.rotation.z=-s*.16;}
  if(r>=2){const sigil=ring(.085,.014,0,-.35,-.137);sigil.rotation.y=Math.PI;stone(.045,0,-.35,-.151);}
 }else if(type==='shoes'){
  const boot=add(new THREE.CylinderGeometry(.062+b*.002,.069+b*.002,.18+b*.009,6),b<2?dark:metal,0,-.48,.01);boot.scale.z=1.10;
  box(.13,.08,.19,dark,0,-.58,.05);
  box(.09,.08,.025,gold,0,-.46,.079);
  if(r>=2)stone(.025,0,-.44,.096);
  if(r>=4)for(const s of [-1,1]){const fin=add(new THREE.ConeGeometry(.025,.10,4),gold,s*.075,-.47,-.01);fin.rotation.z=-s*.45;}
 }else if(type==='accessory'){
  ring(.10,.012,0,.35,.08).rotation.x=Math.PI/2;
  const mount=strip([[-.05,0],[0,.07],[.05,0],[0,-.06]],.02,gold);mount.position.set(0,.28,.19);mount.scale.set(1+b*.06,1+b*.04,1);
  mount.scale.set(1+b*.06,1+b*.04,1);stone(.031+r*.006+b*.002,0,.28,.219);
  for(const s of [-1,1])if(r>=3)stone(.02,s*.063,.28,.21);
  if(r>=4)for(let i=0;i<3;i++)box(.008,.07+i*.02,.008,gold,(i-1)*.023,.18,.205);
 }
 // Merge by material: detail adds vertices rather than one draw call per decoration.
 g.traverse(o=>{if(o.isGroup)bake(o,{outline:false});});
 return g;
}
export function mountEquipment(view,designs){
 const models=[];
 for(const [slot,d] of Object.entries(designs||{})){
  const g=makeEquipmentModel(d);models.push(g);
  if(slot==='weapon'){
   const bow=d.type==='bow';view.hands[bow?1:0].add(g);
   if(bow){g.position.set(.02,0,.04);g.rotation.y=-Math.PI/2;view.arms[1].userData.holding=true;}
   else if(d.type==='staff'){g.position.set(-.015,0,.02);g.rotation.set(-.05,0,.25);}
   else if(d.type!=='knife')g.rotation.x=.55;
  }else if(slot==='shield'){view.armInner[1].add(g);g.position.set(.07,-.25,.03);g.rotation.y=Math.PI/2-.25;}
  else if(slot==='head')view.head.add(g);
  else if(slot==='shoes'){view.legInner[0].add(g);const other=makeEquipmentModel(d);view.legInner[1].add(other);models.push(other);}
  else if(slot==='garment'){view.torso.add(g);g.position.set(0,.38,-.06);view.cape=g;}
  else view.torso.add(g);
 }
 view.equipmentModels=models;
}
