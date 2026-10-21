import {THREE} from './three.js?v=0.79.0';
import {toon,bake} from './Toon.js?v=0.79.0';
// Shared geometry for inventory portraits, fitting room, and equipped characters.
// v0.25: อาวุธ 12 ประเภท แต่ละชิ้นมีทรง (shape) และสีของตัวเอง · ชุดใช้สีของชิ้นนั้น
export function makeEquipmentModel(d){
 const g=new THREE.Group(),{rank:r,band:b,variant:v,theme:t,type,form,shape:sh}=d;
 g.userData.equipmentId=d.id;
 const gemHex=r>=6?'#ff4a68':r>=5?'#ffd84a':(d.glow||t.gem);
 const mainHex=d.c1||t.metal;
 const metal=r>=5?toon(r>=6?'#ffd0d8':'#fff0c0',{emissive:gemHex,emissiveIntensity:r>=6?.35:.2}):toon(mainHex),dark=toon(d.c2||t.dark),cloth=toon(d.slot==='weapon'?t.cloth:mainHex),gold=toon(r>=4?'#ffd56a':r>=2?'#e2b85a':'#b9a27a'),gem=toon(gemHex,{emissive:gemHex,emissiveIntensity:.15+r*.1});
 const wood=toon('#8a5a32'),glowM=toon(d.glow||gemHex,{emissive:d.glow||gemHex,emissiveIntensity:.6});
 const add=(geo,mat,x=0,y=0,z=0,parent=g)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const box=(x,y,z,m,px=0,py=0,pz=0)=>add(new THREE.BoxGeometry(x,y,z),m,px,py,pz);
 const stone=(size,x,y,z)=>add(new THREE.OctahedronGeometry(size),gem,x,y,z);
 const ring=(rad,tube,x,y,z,m=gold,arc=Math.PI*2)=>add(new THREE.TorusGeometry(rad,tube,4,12,arc),m,x,y,z);
 const strip=(points,depth,mat)=>{const s2=new THREE.Shape();points.forEach(([x,y],i)=>i?s2.lineTo(x,y):s2.moveTo(x,y));s2.closePath();return add(new THREE.ExtrudeGeometry(s2,{depth,bevelEnabled:false}),mat);};
 const mirror=pts=>[...pts,...pts.slice().reverse().map(([x,y])=>[-x,y])];
 const cyl=(r1,r2,h,m,x,y,z,seg=6)=>add(new THREE.CylinderGeometry(r1,r2,h,seg),m,x,y,z);
 // ด้ามตามแกน Z (ทิศเดียวกับดาบเดิม — ท่าโจมตีไม่เพี้ยน)
 const shaftZ=(len,rad,m,z0)=>{const c=cyl(rad,rad*1.1,len,m,0,0,z0+len/2);c.rotation.x=Math.PI/2;return c;};
 const wings=(y,z,size)=>{for(const s of [-1,1]){const w=strip([[0,0],[s*size*.5,size*.3],[s*size,size],[s*size*.35,size*.65]],.015,gold);w.rotation.x=Math.PI/2;w.position.set(s*.03,y,z);}};
 if(d.slot==='weapon'){
  const f=form||'sword_1h';
  if(f==='sword_1h'||f==='sword_2h'||f==='knife'){
   const two=f==='sword_2h',kn=f==='knife';
   const len=(kn?.30:two?.86:.62)+b*.016+r*.012,w=(two?.05:.03)+r*.005;
   const at=k=>len*k;
   const P={saber:[[w*.4,len],[w*1.3,at(.75)],[w*1.2,at(.4)],[w,0],[-w,0],[-w*.8,at(.45)],[-w*.1,at(.85)]],rapier:mirror([[0,len*1.06],[w*.5,at(.9)],[w*.5,0]]),broad:mirror([[0,len],[w*1.5,at(.86)],[w*1.5,0]]),
    cleaver:[[-w,0],[-w,at(.88)],[w*2.3,len],[w*2.3,at(.38)],[w,0]],jagged:mirror([[0,len],[w,at(.84)],[w*1.7,at(.74)],[w*.9,at(.62)],[w*1.8,at(.48)],[w,at(.34)],[w*1.6,at(.18)],[w,0]]),
    flame:mirror([[0,len],[w*1.35,at(.82)],[w*.7,at(.66)],[w*1.5,at(.48)],[w*.8,at(.32)],[w*1.4,at(.14)],[w,0]]),crescent:mirror([[0,len],[w*1.7,at(.88)],[w*1.9,at(.5)],[w*1.3,0]]),
    dagger:mirror([[0,len],[w,at(.7)],[w*.9,0]]),kris:mirror([[0,len],[w*1.2,at(.8)],[w*.5,at(.58)],[w*1.2,at(.36)],[w*.8,0]]),tanto:[[-w,at(.9)],[w*.4,len],[w,at(.8)],[w,0],[-w,0]],fang:[[w*1.5,len],[w*1.4,at(.6)],[w,0],[-w,0],[-w*.2,at(.6)]]}[sh]||mirror([[0,len],[w*1.3,at(.7)],[w*1.1,at(.25)],[w*.8,0]]);
   const bm=sh==='crescent'?toon('#2a1a26',{emissive:d.glow||'#ff3a5a',emissiveIntensity:.15}):sh==='flame'?toon(mainHex,{emissive:d.glow||'#ff7a2a',emissiveIntensity:.35}):sh==='jagged'?toon(mainHex,{emissive:d.glow||'#7fe0ff',emissiveIntensity:.25}):metal;
   const blade=strip(P,.024,bm);blade.rotation.x=Math.PI/2;blade.position.set(0,.012,.09);
   if(sh==='crescent'){const c=ring(w*1.1,.008,0,.03,.09+len*.55,glowM);c.rotation.x=Math.PI/2;}
   const gw=(kn?.10:two?.2:.13)+r*.02;
   if(sh==='rapier'){const rg2=ring(.06,.01,0,0,.06);rg2.rotation.y=Math.PI/2;}
   else if(sh==='flame'||sh==='cleaver'){const gr=cyl(.06,.06,.03,dark,0,0,.07,8);gr.rotation.x=Math.PI/2;}
   const guard=box(gw,.03,.035,gold,0,0,.07);guard.rotation.y=(v-1)*.1;
   if(r>=4||d.guard==='wing')wings(0,.05,.12+r*.01);
   const grip=shaftZ(two?.28:.14,.02,dark,two?-.25:-.09);
   stone(.025+r*.003,0,0,two?-.27:-.105);
   if(r>=2)stone(.03+r*.003,0,.026,.075);
  }else if(f==='spear'){
   shaftZ(1.2,.018,sh==='pike'?toon('#c8c070'):dark,-.45);
   const hz=.75,hm=metal;
   if(sh==='halberd'){const sp=strip(mirror([[0,.3],[.03,.2],[.02,0]]),.02,hm);sp.rotation.x=Math.PI/2;sp.position.z=hz;const ax=strip([[0,.02],[.16,.0],[.18,.12],[.16,.24],[0,.2]],.02,hm);ax.rotation.x=Math.PI/2;ax.position.set(.01,.01,hz+.02);}
   else if(sh==='glaive'){const bl=strip([[-.02,0],[-.01,.3],[.07,.26],[.11,.14],[.08,.04],[.02,0]],.02,hm);bl.rotation.x=Math.PI/2;bl.position.z=hz;}
   else if(sh==='fang'){for(const s of [-1,1]){const fg=strip([[0,0],[s*.08,.12],[s*.01,.26],[s*.02,.12]],.02,toon('#efe6d0'));fg.rotation.x=Math.PI/2;fg.position.z=hz;}}
   else{const hd=strip(mirror([[0,.26],[.045+r*.003,.12],[.02,0]]),.02,hm);hd.rotation.x=Math.PI/2;hd.position.z=hz;}
   const tas=add(new THREE.ConeGeometry(.04,.14,5),sh==='pike'?toon('#d8433a'):glowM,0,0,hz-.06);tas.rotation.x=-Math.PI/2;
   if(r>=2)stone(.028,0,.02,hz);
   if(r>=4)wings(0,hz-.02,.12);
  }else if(f==='staff'||f==='rod'){
   const rod=f==='rod',H=rod?.55:1.14+b*.02;
   cyl(.018,.026,H+.18,sh==='twig'||sh==='crook'?wood:dark,0,H/2-.15,0);
   const cy=H;
   if(sh==='crook'){const c=ring(.07,.018,-.07,cy,0,wood,Math.PI);c.rotation.z=0;}
   else if(sh==='roots'){for(let i=0;i<4;i++){const a=i/4*Math.PI*2,c=add(new THREE.ConeGeometry(.02,.22,4),wood,Math.cos(a)*.05,cy-.02,Math.sin(a)*.05);c.rotation.z=Math.cos(a)*.4;}stone(.065+r*.006,0,cy+.06,0);}
   else if(sh==='maw'){const sk=add(new THREE.SphereGeometry(.07,6,4),toon('#e8dcc8'),0,cy,0);sk.scale.set(1,.8,1.2);add(new THREE.SphereGeometry(.045,8,6),glowM,0,cy+.02,.06);}
   else if(sh==='crescent'){const c=ring(.1,.022,0,cy+.06,0,toon(mainHex,{emissive:d.glow||'#ff3a5a',emissiveIntensity:.4}),Math.PI*1.4);c.rotation.z=Math.PI*.8;}
   else if(sh==='mushroom'){const cap=add(new THREE.SphereGeometry(.08,8,5,0,Math.PI*2,0,Math.PI/2),toon(mainHex,{emissive:mainHex,emissiveIntensity:.4}),0,cy,0);cap.scale.y=.8;}
   else if(sh==='icicle'){for(const x of [-.03,0,.03]){const c=add(new THREE.ConeGeometry(.02,.2,4),toon('#dff6ff',{emissive:'#7fe0ff',emissiveIntensity:.3}),x,cy+.1,0);c.rotation.z=-x*4;}}
   else if(sh==='star'){const st=add(new THREE.OctahedronGeometry(.07),glowM,0,cy+.06,0);st.scale.set(1,1,.4);}
   else if(sh==='twig'){for(const s of [-1,1]){const l=add(new THREE.SphereGeometry(.035,5,3),toon('#6ac04a'),s*.04,cy+.04,0);l.scale.set(1.6,.5,.8);}}
   else {ring(.07+r*.008,.016,0,cy,0);stone(.055+r*.007,0,cy,0);}
   if(r>=3&&!rod){ring(.12+r*.012,.012,0,cy,0);}
   if(r>=4)for(const sx of [-1,1]){const w=strip([[0,0],[sx*.12,.06],[sx*.18,.24],[sx*.05,.17]],.02,gold);w.position.set(sx*.05,cy-.04,0);}
  }else if(f==='orb'){
   const R=.13+r*.006,o=new THREE.Group();g.add(o);o.position.set(0,.4,.12);
   add(new THREE.SphereGeometry(R,10,8),toon(sh==='galaxy'?'#2a1a5a':sh==='sandstorm'?'#e8c88a':mainHex,{emissive:d.glow||gemHex,emissiveIntensity:.45}),0,0,0,o);
   const rr=add(new THREE.TorusGeometry(R*1.5,.008,4,16),gold,0,0,0,o);rr.rotation.x=1.2;
   if(sh==='wisp')for(let i=0;i<3;i++){const a=i/3*Math.PI*2;add(new THREE.SphereGeometry(.025,5,4),glowM,Math.cos(a)*R*1.6,Math.sin(a)*.04,Math.sin(a)*R*1.6,o);}
   cyl(.03,.05,.06,dark,0,.08,.08,6);
  }else if(f==='mace'||f==='scepter'){
   const sc=f==='scepter';
   const shaft=shaftZ(sc?.34:.40,.022,sc?gold:sh==='cudgel'?wood:dark,-.06);
   const top=new THREE.Group();g.add(top);top.position.z=sc?.30:.40;
   const M=(geo,m,x=0,y=0,z=0)=>add(geo,m,x,y,z,top);
   if(sh==='cudgel'){const h=M(new THREE.SphereGeometry(.07,7,5),wood);h.scale.set(1,1,1.5);for(const z of [-.03,.04]){const bd=M(new THREE.TorusGeometry(.068,.01,4,10),gold,0,0,z);}}
   else if(sh==='bell'){const bl=M(new THREE.CylinderGeometry(.03,.08,.12,10,1,true),metal,0,0,.02);bl.rotation.x=-Math.PI/2;bl.material.side=THREE.DoubleSide;}
   else if(sh==='maul'){M(new THREE.BoxGeometry(.2,.1,.1),metal);M(new THREE.BoxGeometry(.05,.05,.05),gold,0,.05,0);}
   else if(sh==='morningstar'){const ball=M(new THREE.SphereGeometry(.07,8,6),gold,0,0,.06);for(let i=0;i<8;i++){const a=i/8*Math.PI*2,c=M(new THREE.ConeGeometry(.015,.06,4),toon('#fff4c0'),Math.cos(a)*.08,Math.sin(a)*.08,.06);c.rotation.z=a-Math.PI/2;}}
   else if(sh==='candle'){M(new THREE.CylinderGeometry(.06,.03,.03,8),gold).rotation.x=Math.PI/2;const cd=M(new THREE.CylinderGeometry(.02,.02,.1,6),toon('#f4ead2'),0,0,.06);cd.rotation.x=Math.PI/2;M(new THREE.SphereGeometry(.022,5,4),toon('#ffd27a',{emissive:'#ffb03a',emissiveIntensity:.9}),0,0,.13);}
   else if(sh==='lotus'){for(let i=0;i<6;i++){const a=i/6*Math.PI*2,p=M(new THREE.ConeGeometry(.025,.1,4),toon(mainHex,{emissive:d.glow||mainHex,emissiveIntensity:.3}),Math.cos(a)*.03,Math.sin(a)*.03,.04);p.rotation.x=Math.PI/2;p.rotation.z=a;p.rotation.y=.4;}}
   else if(sh==='plume'){for(const a of [-.4,0,.4]){const p=M(new THREE.ConeGeometry(.02,.2,4),toon('#ff8a3a',{emissive:'#ff6a2a',emissiveIntensity:.4}),a*.15,0,.09);p.rotation.x=Math.PI/2;p.rotation.y=a;}}
   else if(sh==='seraph'){for(const s of [-1,1])for(let k=0;k<3;k++){const w=strip([[0,0],[s*.08,.03],[s*.14-k*.02*s,.11],[s*.04,.07]],.012,toon('#ffffff'));w.rotation.x=Math.PI/2;w.position.set(0,0,top.position.z-.02+k*.03);}M(new THREE.OctahedronGeometry(.045),gem,0,0,.05).scale.set(1,1,1.5);}
   else {M(new THREE.DodecahedronGeometry(.075+b*.006+r*.005),metal);const count=3+Math.min(5,b+r);for(let i=0;i<count;i++){const a=i/count*Math.PI*2,rad=.075+r*.008;const p=M(new THREE.ConeGeometry(.016,.10+b*.012,4),gold,Math.cos(a)*rad,Math.sin(a)*rad,0);p.rotation.z=a-Math.PI/2;}}
   if(r>=2&&sh!=='seraph')M(new THREE.OctahedronGeometry(.04),gem,0,0,sc?.0:.07);
  }else if(f==='book'){
   const bk=box(.16,.2,.05,toon(sh==='codex'?'#4a6a3a':sh==='tome'?'#2a3a6a':sh==='grimoire'?'#e8c060':(d.c2||'#6a3a2a')),0,.1,.06);
   box(.15,.19,.04,toon('#f4ead2'),.008,.1,.06);
   box(.03,.2,.052,gold,-.07,.1,.06);
   add(new THREE.OctahedronGeometry(.03),gem,0,.1,.09);
   if(sh==='grimoire'||r>=4)wings(.12,.06,.1);
  }else if(f==='shortbow'||f==='longbow'||f==='crossbow'){
   const xb=f==='crossbow',long=f==='longbow';
   const radius=(xb?.2:long?.44:.32)+r*.008;
   const limbM=sh==='crescent'||sh==='eclipse'?toon('#2a1a30'):sh==='antler'?toon('#e8f6ff',{emissive:'#9ae8ff',emissiveIntensity:.2}):toon(mainHex);
   const bow=add(new THREE.TorusGeometry(radius,xb?.02:.02+r*.002,4,18,Math.PI*(xb?.9:4/3)),limbM);
   if(xb){bow.geometry.dispose();bow.geometry=new THREE.TorusGeometry(.3,.022,4,12,Math.PI*.55);bow.rotation.set(Math.PI/2,0,Math.PI/2-Math.PI*.275);bow.position.set(0,.05,0);const ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.22,.05,.2),new THREE.Vector3(0,.05,.06),new THREE.Vector3(.22,.05,.2)]),new THREE.LineBasicMaterial({color:'#f4e4bd'}));g.add(ln);const st=box(.05,.06,.5,toon(sh==='plank'?'#a8794a':(d.c2||'#4a3a2a')),0,0,.0);if(sh==='cog')for(const z of [-.05,.08])ring(.035,.012,.035,0,z,toon('#c8a860')).rotation.y=Math.PI/2;}
   else{bow.rotation.z=-Math.PI*2/3;
    const chord=-radius*.5;
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(chord,-radius*.866,0),new THREE.Vector3(chord,radius*.866,0)]),new THREE.LineBasicMaterial({color:r>=5||sh==='eclipse'?(d.glow||'#ff3a5a'):'#f4e4bd'}));g.add(line);
    box(.048,.16,.045,dark,radius,0,0);
    if(sh==='eclipse'){const e=ring(.07,.014,radius+.01,0,0,glowM);e.rotation.y=Math.PI/2;}
    for(const s of [-1,1]){
     if(sh==='wing'||sh==='hawk'||sh==='feather'){const fin=strip([[0,0],[.1,.04],[.16,.16],[.04,.1]],.015,sh==='wing'?toon('#e8f4ff'):toon(sh==='feather'?'#ff8a3a':'#ffffff'));fin.position.set(radius*.35,s*radius*.75,0);fin.scale.y=s;}
     else if(sh==='antler'){const c=add(new THREE.ConeGeometry(.014,.14,4),limbM,radius*.3,s*radius*.9,0);c.rotation.z=s*.9;}
     if(r>=2)stone(.026+r*.003,radius*.72,s*radius*.48,.025);
    }
   }
   if(r>=4)wings(0,0,.14);
  }
  }else if(form==='quiver'){
  // v0.25.2: ซองลูกธนูสะพายหลัง (แกน y = ตามแนวซอง)
  const leather=toon(sh==='blood'?(d.c2||'#2a1424'):mainHex);
  cyl(.065,.055,.4,leather,0,0,0,8);
  for(const y of [.17,-.05])add(new THREE.TorusGeometry(.066,.01,4,10),r>=2?gold:dark,0,y,0).rotation.x=Math.PI/2;
  const fm=toon(d.glow||'#ffffff');
  for(let i=0;i<4+Math.min(2,r);i++){const a=i/5*Math.PI*2,x=Math.cos(a)*.03,z=Math.sin(a)*.03;cyl(.006,.006,.22,toon('#c8a878'),x,.3,z,4);const f=box(.04,.06,.004,fm,x,.39,z);f.rotation.y=a;}
  if(r>=1)stone(.025+r*.003,0,.05,.065);
  if(sh==='ember'||sh==='blood'||sh==='moon'||sh==='rune')add(new THREE.TorusGeometry(.03,.006,4,10),glowM,0,-.05,.064);
  }else if(form==='tome'){
  const cover=toon(sh==='codex'?'#4a6a3a':sh==='tome'?'#2a3a6a':sh==='grimoire'?(r>=6?'#5a1424':'#e8c060'):(d.c1||'#8a5a32'));
  box(.17,.22,.055,cover,0,0,0);box(.155,.205,.045,toon('#f4ead2'),.012,0,0);box(.03,.22,.058,gold,-.075,0,0);
  add(new THREE.OctahedronGeometry(.032),gem,0,0,.032);
  if(r>=3)for(const s2 of [-1,1])box(.02,.02,.06,gold,.07,s2*.095,0);
  if(r>=4||sh==='grimoire')wings(0,-.01,.1);
  }else if(form==='orbOff'){
  add(new THREE.SphereGeometry(.09+r*.005,10,8),toon(sh==='galaxy'?'#2a1a5a':sh==='sandstorm'?'#e8c88a':mainHex,{emissive:d.glow||gemHex,emissiveIntensity:.55}),0,0,0);
  const rr=add(new THREE.TorusGeometry(.14,.007,4,18),gold,0,0,0);rr.rotation.x=1.2;
  if(r>=3){const r2=add(new THREE.TorusGeometry(.17,.006,4,18),glowM,0,0,0);r2.rotation.set(.4,.9,0);}
  if(sh==='wisp')for(let i=0;i<3;i++){const a=i/3*Math.PI*2;add(new THREE.SphereGeometry(.022,5,4),glowM,Math.cos(a)*.16,Math.sin(a)*.03,Math.sin(a)*.16);}
  }else if(type==='body'){
  const torso=add(new THREE.CylinderGeometry(.19,.215,.43,6+v*2),b<2?cloth:metal,0,.16,0);torso.scale.z=.84;
  box(.31,.10,.035,dark,0,.07,.168);
  const plate=strip([[-.115,0],[-.145,.14],[0,.20],[.145,.14],[.115,0],[0,-.07]],.03,gold);plate.position.set(0,.17,.155);
  if(r>=2)stone(.035+r*.004,0,.27,.201);
  for(const s of [-1,1]){const shoulder=add(new THREE.BoxGeometry(.13+b*.008,.08+r*.007,.21),metal,s*.21,.35,0);shoulder.rotation.z=s*.22;
   for(let i=0;i<Math.min(3,r);i++)add(new THREE.ConeGeometry(.023,.06+b*.008,4),gold,s*(.20+i*.025),.42,0);
  }
  for(let i=0;i<r;i++)box(.02,.025,.018,gem,(i-(r-1)/2)*.034,.11,.197);
  if(r>=5)for(const sx of [-1,1]){const w=strip([[0,0],[sx*.16,.08],[sx*.30,.30],[sx*.12,.22],[sx*.20,.12]],.02,gold);w.position.set(sx*.06,.24,-.17);w.rotation.y=sx*.5;}
  if(r>=6){const h=ring(.11,.012,0,.62,-.05);h.rotation.x=Math.PI/2;}
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
   // v0.25.1: ท่าถือตามประเภทอาวุธ — โมเดลอยู่ในกลุ่ม M ที่ท่าทาง (Characters.update) หมุนได้ต่อเฟรม
   const f=d.form||({sword:'sword_1h',knife:'knife',staff:'staff',mace:'mace',bow:'shortbow'})[d.type]||'sword_1h';
   const grip={sword_2h:'two',spear:'spear',staff:'staff',rod:'staff',orb:'orb',book:'book',shortbow:'bow',longbow:'bow',crossbow:'xbow'}[f]||'one';
   const M=new THREE.Group();M.add(g);
   if(grip==='bow'){
    view.hands[1].add(M);view.arms[1].userData.holding=true;
    // แกนโมเดลธนู: กิ่งตาม y · ท้องคันตาม +x → ในมือซ้าย: กิ่งชี้ขึ้น (z ของมือเมื่อเหยียดแขน) ท้องคันชี้ไปหน้า (−y ของมือ)
    const B=new THREE.Group();M.remove(g);M.add(B);B.add(g);view.wInner=B;
    view.bowQ=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(-1,0,0)));
    const radius=(f==='longbow'?.44:.32)+(d.rank||0)*.008;g.position.set(-radius,0,0);
    // ลูกศรในมือขวา (ชี้ตามแนวแขน)
    const A=new THREE.Group(),sm=toon('#c8a878'),hm=toon('#e8edf2'),fm=toon(d.glow||'#ffffff');
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.62,5),sm);shaft.position.y=-.2;A.add(shaft);
    const head=new THREE.Mesh(new THREE.ConeGeometry(.022,.07,4),hm);head.position.y=-.54;head.rotation.x=Math.PI;A.add(head);
    for(const r2 of [0,Math.PI/2]){const fl=new THREE.Mesh(new THREE.BoxGeometry(.04,.08,.004),fm);fl.position.y=.07;fl.rotation.y=r2;A.add(fl);}
    view.hands[0].add(A);view.arrow=A;
   }else if(grip==='xbow'){view.hands[0].add(M);view.arms[1].userData.holding=true;g.position.set(0,.02,-.06);g.scale.setScalar(1.3);}
   else{view.hands[0].add(M);
    if(grip==='two'){g.position.z=-.12;view.arms[1].userData.holding=true;}
    if(grip==='book'||grip==='spear')view.arms[1].userData.holding=true;
    if(grip==='book'){g.rotation.set(0,0,0);g.position.set(0,-.06,.02);}
   }
   view.wMount=M;view.grip=grip;
  }else if(slot==='shield'&&d.form==='quiver'){view.torso.add(g);g.position.set(.1,.24,-.2);g.rotation.set(.25,0,-.55);}
  else if(slot==='shield'&&(d.form==='tome'||d.form==='orbOff')){
   // v0.25.2: สมุดเวท/ลูกแก้วเวทลอยข้างไหล่ซ้าย ขยับขึ้นลงช้า ๆ (อนิเมชันใน Characters.update)
   view.torso.add(g);const base=d.form==='tome'?[.36,.42,.06]:[.34,.28,.14];g.position.set(...base);
   (view.floaters||(view.floaters=[])).push({g,base,spin:d.form==='orbOff'?1.2:.35,ph:Math.random()*6});
  }
  else if(slot==='shield'){view.armInner[1].add(g);g.position.set(.07,-.25,.03);g.rotation.y=Math.PI/2-.25;}
  else if(slot==='head')view.head.add(g);
  else if(slot==='shoes'){view.legInner[0].add(g);const other=makeEquipmentModel(d);view.legInner[1].add(other);models.push(other);}
  else if(slot==='garment'){view.torso.add(g);g.position.set(0,.38,-.06);view.cape=g;}
  else view.torso.add(g);
 }
 view.equipmentModels=models;
}
