import fs from 'node:fs';import vm from 'node:vm';import {fileURLToPath} from 'node:url';
import {createCanvas,Image,loadImage} from '@napi-rs/canvas';
export const root=fileURLToPath(new URL('../../',import.meta.url));
export const THREE={};vm.runInContext(fs.readFileSync(root+'/vendor/three.min.js','utf8'),vm.createContext({exports:THREE,module:{exports:THREE},console}));
globalThis.window={THREE};globalThis.document={createElement:()=>createCanvas(1,1)};globalThis.Image=Image;globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
export{createCanvas,Image,loadImage};
export const {MONSTERS}=await import(root+'/js/data/monsters.js');
export const {MonsterView}=await import(root+'/js/render/Monsters.js');
