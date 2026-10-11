import {THREE} from '../render/three.js';
import {CharacterView} from '../render/Characters.js';
import {BASE_ITEMS,RARITY} from '../data/items.js';
import {equipmentDesign,DESIGN_THEMES,DESIGN_GRADES} from '../data/equipmentDesigns.js';
import {PLAYER_LOOK,JOB_LOOK} from '../entities/Player.js';
const $=id=>document.getElementById(id),levels=[1,15,30,50,70,85,95],weapons={swordsman:'sword',mage:'staff',archer:'bow',acolyte:'mace'};
levels.forEach((lv,i)=>$('level').add(new Option('Lv.'+lv+' · '+DESIGN_THEMES[i].name,String(lv))));
DESIGN_GRADES.forEach((gr,i)=>$('grade').add(new Option(['ขาว','เขียว','ฟ้า','ม่วง','ส้ม','ทอง','แดง'][i]+' · '+RARITY[gr].name,gr)));
$('level').value='95';$('grade').value='celestial';
let view,renderer,angle=.45,last=performance.now(),time=0,attackAt=0;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.6,1.6,2.2,-.3,.1,50);
camera.position.set(0,2.2,7);camera.lookAt(0,1.25,0);
scene.add(new THREE.HemisphereLight('#d9e9ff','#65506f',1));const sun=new THREE.DirectionalLight('#ffe4b3',1);sun.position.set(-3,5,4);scene.add(sun);
const floor=new THREE.Mesh(new THREE.CylinderGeometry(.87,.95,.10,32),new THREE.MeshToonMaterial({color:'#56576b'}));floor.position.y=-.055;scene.add(floor);
try{renderer=new THREE.WebGLRenderer({canvas:$('stage'),alpha:true,antialias:false});renderer.setPixelRatio(1);renderer.outputEncoding=THREE.sRGBEncoding;}
catch(e){$('warning').hidden=false;$('warning').textContent='อุปกรณ์นี้เปิดตัวอย่าง 3 มิติไม่ได้ ยังดูไอคอนด้านล่างได้';}
function dispose(){if(!view)return;scene.remove(view.root);view.root.traverse(o=>{o.geometry?.dispose();});}
function show(equipment){
 dispose();const job=$('job').value;
 const L={...PLAYER_LOOK,...JOB_LOOK[job],weapon:equipment.weapon?.type||'none',equipment,hideJobHat:!!equipment.head};
 view=new CharacterView(L);view.phase=0;view.time=0;view.root.rotation.y=angle;scene.add(view.root);
 $('setName').textContent=DESIGN_THEMES[equipment.weapon?.band??0].name+' · '+RARITY[DESIGN_GRADES[equipment.weapon?.rank??0]].name;
 $('play').href='preview.html?job='+job+'&level='+$('level').value+'&zone='+(Number($('level').value)>=80?'haunted_forest':'ancient_ruins');
}
function build(){const equipment={};for(const slot of ['weapon','body','head','shield','garment','shoes','accessory']){const it={slot,wtype:slot==='weapon'?weapons[$('job').value]:undefined,reqLevel:Number($('level').value),rarity:$('grade').value};const d=equipmentDesign('room_'+slot,it);d.variant=Number($('variant').value);equipment[slot]=d;}show(equipment);}
for(const id of ['job','level','grade','variant'])$(id).onchange=build;
const entries=Object.entries(BASE_ITEMS).filter(([,it])=>it.type==='equip');let chosen={};
function list(){const filter=$('filter').value;$('catalogue').replaceChildren();for(const [id,it] of entries.filter(([,it])=>filter==='all'||it.slot===filter)){
 const b=document.createElement('button');b.className='item';b.style.setProperty('--grade',RARITY[it.rarity||'common'].color);
 const img=document.createElement('img');img.src='assets/equipment/'+id+'.png';img.alt=it.name;img.loading='lazy';
 const title=document.createElement('strong');title.textContent=it.name;const info=document.createElement('small');info.textContent='Lv.'+(it.reqLevel||1)+' · '+RARITY[it.rarity||'common'].name;
 b.append(img,title,info);b.onclick=()=>{if(it.wtype){$('job').value=it.wtype==='bow'?'archer':it.wtype==='staff'?'mage':it.wtype==='mace'?'acolyte':'swordsman';}chosen[it.slot]=equipmentDesign(id,it);show(chosen);$('setName').textContent=it.name;};$('catalogue').append(b);
}}
$('filter').onchange=list;list();build();
let dragging=false,px=0;$('stage').onpointerdown=e=>{dragging=true;px=e.clientX;$('stage').setPointerCapture(e.pointerId);};$('stage').onpointermove=e=>{if(dragging){angle+=(e.clientX-px)*.012;px=e.clientX;view.root.rotation.y=angle;}};$('stage').onpointerup=$('stage').onpointercancel=()=>dragging=false;
function frame(now){requestAnimationFrame(frame);if(document.hidden||!renderer)return;const dt=Math.min(.04,(now-last)/1000);last=now;time+=dt;
 const walk=$('pose').value==='walk',attack=$('pose').value==='attack';
 view.update(dt,{x:0,y:0,angle,vx:walk?1:0,vy:0,moving:walk,dead:false,castPose:attack && ['mage','acolyte'].includes($('job').value)});if(attack&&time>attackAt){view.attack($('job').value==='mage'||$('job').value==='acolyte'?'cast':$('job').value==='archer'?'shoot':'melee');attackAt=time+.9;}
 const rect=$('stage').parentElement.getBoundingClientRect(),w=Math.max(1,Math.floor(rect.width*.65)),h=Math.max(1,Math.floor(rect.height*.65));
 if(renderer.domElement.width!==w||renderer.domElement.height!==h){renderer.setSize(w,h,false);const span=2.75;camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=1.25+span/2;camera.bottom=1.25-span/2;camera.updateProjectionMatrix();}
 renderer.render(scene,camera);
}
requestAnimationFrame(frame);
