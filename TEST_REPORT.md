# v0.21.0 Validation

PASS: 539 equipment geometry combinations (11 types × 7 level bands × 7 grades); finite vertices and at least 14 distinct geometry signatures per type.
PASS: 96 real equipment portraits exist; refinement/socket keys retain base appearance.
PASS: original v0.20 item data is byte-equivalent after importing (all combat values, IDs and drop tables preserved).
PASS: four jobs each mount seven slots, including two animated boots and exactly one selected weapon; 480 animation frames have finite world transforms.
PASS: outfit/head/weapon/back/dual-weapon fashion suppresses overlapping base equipment.
PASS: 114 JS files parse; local imports and HTML links resolve.
PASS: v0.20 regression suite: seven maps, connected portals/spawns, thirty monster models, all reward/drop/card references, legacy save/refinement keys and 200,000 loot rolls.
PASS: Game.killMonster integration → EXP99 / scheduled drops / collection / MVP inventory reward, with graphics mocked.

Equipment decorative meshes merge by material (at most 5 opaque meshes per standalone design in tested combinations; bow also has a string line). Portraits are static 128×128 PNGs, so inventory does not create a WebGL renderer per icon.

Images in docs are deterministic CPU projections of the actual game geometry. They are not browser screenshots. Browser UI, real GPU clipping and mobile/PC FPS have not been tested in this environment. No FPS improvement is claimed.
