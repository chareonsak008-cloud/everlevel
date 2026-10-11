import assert from 'node:assert/strict';import {root,MONSTERS}from './bootstrap.mjs';
const{Game}=await import(root+'/js/core/Game.js');const{Player}=await import(root+'/js/entities/Player.js');const{Monster}=await import(root+'/js/entities/Monster.js');
const p=new Player();p.jobId='swordsman';p.baseLevel=50;p.recalc();let exp=[],drops=[];
const g={events:{rate:()=>40},player:p,time:20,mobs:{kill:m=>m.dead=true},gfx:{playDeath(){},floatText(){}},hud:{log(){}},pets:{dropMul:()=>1,cardMul:()=>1,meteorChance:()=>0},sfx(){},clearTarget(){},reward:Game.prototype.reward,applyExp:(...e)=>exp=e,questLog:{onKill:()=>[]},questEvents(){},collection:{onKill(){}},schedule:(_t,fn)=>fn(),spawnDrop:id=>drops.push(id)};
const m=new Monster('bloblet',0,0,{});const old=Math.random;Math.random=()=>.5;try{Game.prototype.killMonster.call(g,m);}finally{Math.random=old;}
assert.deepEqual(exp,[MONSTERS.bloblet.baseExp*40,MONSTERS.bloblet.jobExp*40]);assert(drops.includes('knife'));assert(drops.includes('oak_staff'));assert(m.dead);
console.log('PASS actual Game.killMonster applies server EXP×40 and drop×40; ordinary loot flow preserved');
