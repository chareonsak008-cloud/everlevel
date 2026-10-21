import assert from 'node:assert/strict';
import { THREE } from './bootstrap.mjs';
import { FASHION_COLLECTION, FASHION_SETS } from '../js/data/fashionCollection.js';
import { COSTUMES, COSTUME_BY_ID, SETS } from '../js/data/costumes.js';
import { poolSize } from '../js/data/fashionBoxes.js';
import { CharacterView } from '../js/render/Characters.js';
import { costumeLook, wearCostume, hasBuilder, CostumeRuntime, makeRig, buildOnRig } from '../js/render/Costumes.js';
import { Player } from '../js/entities/Player.js';
import { PixelSprites } from '../js/render/PixelSprites.js';
assert.equal(new Set(COSTUMES.map(i=>i.id)).size,COSTUMES.length);
assert.equal(FASHION_COLLECTION.length,12);assert.equal(FASHION_SETS.length,4);
const player=new Player('Fashion test',20,20);
const before=JSON.stringify(player.stats);
for(const set of FASHION_SETS){
 assert(SETS.includes(set));assert.equal(set.items.length,3);
 const items=Object.fromEntries(set.items.map(id=>{const it=COSTUME_BY_ID[id];assert(hasBuilder(it));assert(poolSize(it.rarity)>0);player.addFashion(id);assert.equal(player.wearFashion(id),null);return[it.slot,it];}));
 const world=new THREE.Group(),look=costumeLook(player.look,items),view=new CharacterView(look);
 world.add(view.root);const rt=wearCostume(view,items,{world,look});assert(rt.anims.length>=7);
 const objectCount=()=>{let n=0;view.root.traverse(()=>n++);return n;};const n=objectCount();
 const snapshot=()=>{view.root.updateMatrixWorld(true);const values=[];view.root.traverse(o=>values.push(...o.matrixWorld.elements));return values;};
 const initial=snapshot();
 for(let frame=0;frame<240;frame++){const state={x:0,y:0,angle:0,moving:frame>30&&frame<160,speedFactor:frame>90?1.8:1,castPose:frame>180,dead:false};if(frame===170)view.attack('melee');view.update(1/60,state);rt.update(1/60,view);}
 const final=snapshot();assert(final.every(Number.isFinite));assert.notDeepEqual(initial,final);assert.equal(objectCount(),n);assert.equal(rt.systems.size,0);
 // Costume thumbnails use a bare rig, independently of the playable view.
 for(const it of Object.values(items)){const rig=makeRig(),tr=new CostumeRuntime(rig.root);buildOnRig(rig,it,tr,look);tr.update(.1,null);tr.dispose();}
 // Absolute time animation produces the same cloth/wing pose at 30 and 60 fps.
 const poses=[];for(const fps of [30,60]){const r=makeRig(),tr=new CostumeRuntime(r.root);for(const it of Object.values(items))buildOnRig(r,it,tr,look);for(let i=0;i<fps;i++)tr.update(1/fps,{walkBlend:1});const values=[];r.root.traverse(o=>values.push(o.rotation.x,o.rotation.y,o.rotation.z,...o.position.toArray()));poses.push(values);tr.dispose();}
 poses[0].forEach((v,i)=>assert(Math.abs(v-poses[1][i])<1e-8));
 rt.dispose();assert.equal(rt.anims.length,0);
}
assert.equal(JSON.stringify(player.stats),before);
const saved=player.toSave();const restored=new Player('Reload',20,20);restored.fromSave(saved);
assert.deepEqual([...restored.fashion.owned].sort(),FASHION_COLLECTION.map(i=>i.id).sort());
assert.deepEqual(restored.fashion.worn,player.fashion.worn);
assert.equal(Object.keys(restored.fashionItems()).length,Object.keys(player.fashionItems()).length);
console.log('PASS 4 sets / 12 pieces: equip, save/reload, stat-neutral, animation, 30/60fps poses, thumbnail builders, no per-frame object growth, disposal');

// Exercise the real sprite scheduler without a GPU: priority and budget remain bounded.
const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,2,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const focus={id:'hero'},other={id:'mob'},draws=[];
const renderer={getRenderTarget:()=>null,getClearColor:()=>new THREE.Color(),getClearAlpha:()=>1,setClearColor(){},setRenderTarget(){},shadowMap:{autoUpdate:true}};
const scheduler=Object.assign(Object.create(PixelSprites.prototype),{enabled:true,list:new Map(),r:renderer,camera,focus,budget:1,tint:new THREE.Color(),tmpV:new THREE.Vector3(),tmpV2:new THREE.Vector3(),pm:new THREE.Matrix4(),frustum:new THREE.Frustum(),draw:s=>draws.push(s.key)});
for(const key of [other,focus]){const root=new THREE.Group(),board=new THREE.Group();board.material={color:new THREE.Color()};scheduler.list.set(key,{key,root,board,t:0,dirty:false,lastYaw:0,lastDir:0});}
scheduler.update(.04);assert.deepEqual(draws,[focus]);assert.equal(scheduler.list.get(other).interval,1/12);assert.equal(scheduler.list.get(focus).interval,1/30);
draws.length=0;for(const s of scheduler.list.values())s.dirty=true;scheduler.update(.001);assert.deepEqual(draws,[focus]);
console.log('PASS sprite scheduler: 30fps focus, 12fps others, focus priority, original draw budget');
