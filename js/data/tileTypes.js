// ชนิดของพื้นแผนที่
export const T = { GRASS: 0, PATH: 1, PLAZA: 2, WATER: 3, WALL: 4, DIRT: 5, FLOWERS: 6, BRIDGE: 7 };

export const TILE_INFO = {
  [T.GRASS]:   { key: 'grass',   solid: false, mini: '#5aa84a' },
  [T.PATH]:    { key: 'path',    solid: false, mini: '#c6b089' },
  [T.PLAZA]:   { key: 'plaza',   solid: false, mini: '#cfcabc' },
  [T.WATER]:   { key: 'water',   solid: true,  mini: '#3b7cc2' },
  [T.WALL]:    { key: 'wall',    solid: true,  mini: '#6f6878' },
  [T.DIRT]:    { key: 'dirt',    solid: false, mini: '#a07d53' },
  [T.FLOWERS]: { key: 'flowers', solid: false, mini: '#7cbc5a' },
  [T.BRIDGE]:  { key: 'bridge',  solid: false, mini: '#9b6b3e' }, // สะพานข้ามน้ำ (เดินได้)
};
