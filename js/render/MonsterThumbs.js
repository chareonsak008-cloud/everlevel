// รูปย่อมอนสเตอร์ (v0.14) — เรนเดอร์โมเดล 3 มิติจริงเป็นภาพเล็ก ใช้ในหน้าต่างตีออโต้ (ติ๊กเลือกมอน)
import { THREE } from './three.js';
import { MonsterView } from './Monsters.js';
import { MONSTERS } from '../data/monsters.js';
import { snapThumb } from './PetThumbs.js';

export function monsterThumb(type, size = 112) {
  const data = MONSTERS[type];
  if (!data) return '';
  return snapThumb('mob:' + type + '@' + size, size, (scene) => {
    const mob = { type, data, x: 0, y: 0, angle: 0, moving: false };
    const v = new MonsterView(mob);
    v.update(0.6, mob);
    v.shadow.visible = false;
    scene.add(v.root);
    v.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(v.body);
    const bounds = box.getBoundingSphere(new THREE.Sphere());
    return { bounds, fill: 0.92, dispose: () => { scene.remove(v.root); v.dispose(); } };
  });
}
