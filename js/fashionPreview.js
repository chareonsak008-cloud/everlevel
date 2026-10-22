import { THREE } from './render/three.js?v=0.93.0';
import { CharacterView } from './render/Characters.js?v=0.93.0';
import { costumeLook, wearCostume } from './render/Costumes.js?v=0.93.0';
import { FASHION_SETS } from './data/fashionCollection.js?v=0.93.0';
import { COSTUME_BY_ID } from './data/costumes.js?v=0.93.0';

const stage=document.getElementById('stage');
try {
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false});renderer.setPixelRatio(1);renderer.outputEncoding=THREE.sRGBEncoding;stage.prepend(renderer.domElement);
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#faf1ff','#5a4966',1.3));const light=new THREE.DirectionalLight('#fff4df',1.2);light.position.set(-3,6,5);scene.add(light);
 const camera=new THREE.OrthographicCamera(-1.6,1.6,2,-1,.1,50);camera.position.set(3,2.5,6);camera.lookAt(0,.65,0);
 const ground=new THREE.Mesh(new THREE.CircleGeometry(.85,32),new THREE.MeshBasicMaterial({color:'#514257',transparent:true,opacity:.6}));ground.rotation.x=-Math.PI/2;ground.position.y=-.02;scene.add(ground);
 let view,rt,selected=FASHION_SETS[0],action='idle',rotate=false,paused=false,last=0,attackClock=0;
 const entity={x:0,y:0,angle:-.3,moving:false,speedFactor:1,dead:false,castPose:false};
 function choose(set){if(rt)rt.dispose();if(view){scene.remove(view.root);const geos=new Set();view.root.traverse(o=>{if(o.geometry)geos.add(o.geometry);});for(const g of geos)g.dispose();}selected=set;
   const items=Object.fromEntries(set.items.map(id=>{const i=COSTUME_BY_ID[id];return[i.slot,i];}));const look=costumeLook({weapon:'none',hair:'#392b40'},items);
   view=new CharacterView(look);view.phase=0;view.time=0;entity.angle=-.3;view.root.rotation.y=entity.angle;scene.add(view.root);rt=wearCostume(view,items,{world:scene,look});
   document.getElementById('label').textContent=set.name+' · '+set.en;document.querySelectorAll('#sets button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===set.id)));}
 for(const set of FASHION_SETS){const b=document.createElement('button');b.textContent=set.name;b.dataset.id=set.id;b.onclick=()=>choose(set);document.getElementById('sets').append(b);}
 for(const [id,label]of [['idle','ยืน'],['walk','เดิน'],['run','วิ่ง'],['attack','โจมตี'],['cast','ร่ายเวท']]){const b=document.createElement('button');b.textContent=label;b.dataset.id=id;b.setAttribute('aria-pressed',String(id===action));b.onclick=()=>{action=id;attackClock=0;document.querySelectorAll('#actions button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};document.getElementById('actions').append(b);}
 for(const id of ['rotate','pause'])document.getElementById(id).onclick=e=>{if(id==='rotate')rotate=!rotate;else paused=!paused;e.currentTarget.setAttribute('aria-pressed',String(id==='rotate'?rotate:paused));};
 function resize(){const a=stage.clientWidth/stage.clientHeight;camera.left=-1.45*a;camera.right=1.45*a;camera.top=2.1;camera.bottom=-.8;camera.updateProjectionMatrix();renderer.setSize(Math.max(1,Math.round(stage.clientWidth*.55)),Math.max(1,Math.round(stage.clientHeight*.55)),false);}
 new ResizeObserver(resize).observe(stage);choose(selected);resize();
 function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,last?(now-last)/1000:0);last=now;if(!paused&&!document.hidden){entity.moving=action==='walk'||action==='run';entity.speedFactor=action==='run'?1.8:1;entity.castPose=action==='cast';attackClock-=dt;if(action==='attack'&&attackClock<=0){view.attack('melee');attackClock=.65;}view.update(dt,entity);rt.update(dt,view);if(rotate)entity.angle+=dt*.45;}renderer.render(scene,camera);}
 requestAnimationFrame(frame);
}catch(e){const box=document.getElementById('error');box.style.display='block';box.textContent='เปิดตัวอย่างไม่ได้: '+e.message;}
