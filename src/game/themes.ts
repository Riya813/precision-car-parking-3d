import * as THREE from 'three';
import { makeBuilding, makeTree, makePine } from './builders';

/** Original low-poly interpretations of world cities — palettes and props only,
 *  no branded or copyrighted landmarks reproduced. */

type Factory = () => THREE.Object3D;

export interface CityTheme {
  sky: number; fogFar: number;
  ground: number; asphalt: number;
  night?: boolean;
  water?: 'top' | 'bottom';          // ocean/canal strip beyond one curb
  sand?: 'top' | 'bottom';           // beach strip before the water
  street: Factory[];                 // cycled along the approach street
  outskirts: Factory[];              // cycled around the parking lot
  backdrop?: Factory[];              // large silhouettes placed far behind
}

const mat = (color: number, e = 0) =>
  new THREE.MeshLambertMaterial({ color, emissive: e, flatShading: true });

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true;
  return b;
}
function cyl(rt: number, rb: number, h: number, m: THREE.Material, y = 0, seg = 8) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  c.position.y = y; c.castShadow = true;
  return c;
}
function cone(r: number, h: number, m: THREE.Material, y = 0, seg = 4) {
  const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m);
  c.position.y = y; c.castShadow = true;
  return c;
}
function grp(...objs: THREE.Object3D[]) { const g = new THREE.Group(); g.add(...objs); return g; }
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

// ---------- shared props ----------

const cottage = (wall: number, roof: number) => () => {
  const r = cone(74, 46, mat(roof), 81);
  r.rotation.y = Math.PI / 4;
  return grp(
    box(96, 58, 84, mat(wall), 0, 29),
    r,
    box(12, 26, 12, mat(0x5e4430), 30, 71, 20)
  );
};

const rowHouse = (colors: number[]) => () =>
  makeBuilding(88, 130 + Math.random() * 110, 92, pick(colors));

const skyscraper = (colors: number[]) => () =>
  makeBuilding(120, 260 + Math.random() * 200, 110, pick(colors));

const shop = (awning: number) => () => {
  const g = grp(box(110, 78, 90, mat(0xcdbfa4), 0, 39));
  const a = box(104, 6, 34, mat(awning), 0, 66, 58);
  a.rotation.x = 0.35;
  g.add(a);
  return g;
};

const stall = (c1: number, c2: number) => () => {
  const g = new THREE.Group();
  [[-34, -22], [34, -22], [-34, 22], [34, 22]].forEach(([x, z]) =>
    g.add(cyl(2.5, 2.5, 52, mat(0x7a563a), 26, 6).translateX(x).translateZ(z)));
  const top = box(92, 8, 66, mat(c1), 0, 56);
  const top2 = box(92, 8.5, 22, mat(c2), 0, 56.2);
  g.add(top, top2, box(70, 22, 44, mat(0xa5885f), 0, 16));
  return g;
};

const phoneBox = () => grp(
  box(26, 62, 26, mat(0xc22326), 0, 31),
  box(28, 8, 28, mat(0x8f1a1c), 0, 66)
);

const clockTower = () => {
  const g = grp(
    box(54, 250, 54, mat(0xb8a678), 0, 125),
    box(60, 40, 60, mat(0xa08e60), 0, 268),
    cone(44, 52, mat(0x3f6f5e), 314)
  );
  const face = new THREE.Mesh(new THREE.CircleGeometry(18, 16), mat(0xf5efd8, 0x555035));
  face.position.set(0, 272, 31);
  g.add(face);
  return g;
};

const latticeTower = () => grp(
  cone(66, 300, new THREE.MeshLambertMaterial({ color: 0x6e6458, wireframe: true }), 150, 4),
  cone(26, 120, new THREE.MeshLambertMaterial({ color: 0x6e6458, wireframe: true }), 340, 4),
  cyl(3, 3, 60, mat(0x6e6458), 420, 4)
);

const lamp = (glow: boolean) => () => {
  const g = grp(cyl(2.5, 3.5, 86, mat(0x3a4149), 43, 6));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(7, 8, 8),
    mat(0xfff2c8, glow ? 0xd9b45a : 0x111111));
  bulb.position.y = 90;
  g.add(bulb);
  return g;
};

const neonSign = (colors: number[]) => () => {
  const g = grp(box(90, 190 + Math.random() * 120, 90, mat(0x2a2f3a), 0, 100));
  for (let i = 0; i < 4; i++) {
    const c = pick(colors);
    g.add(box(10 + Math.random() * 40, 12, 4, mat(c, c), -20 + Math.random() * 40, 60 + i * 44, 48));
  }
  return g;
};

const lanternPole = () => {
  const g = grp(cyl(2.5, 2.5, 78, mat(0x5e2a20), 39, 6));
  const l = new THREE.Mesh(new THREE.SphereGeometry(9, 8, 8), mat(0xd0342c, 0x8f1f18));
  l.position.y = 84;
  g.add(l, cone(6, 8, mat(0xd8a730), 95, 6));
  return g;
};

const domeHouse = (wall: number, dome: number) => () => {
  const g = grp(box(96, 66, 92, mat(wall), 0, 33));
  const d = new THREE.Mesh(
    new THREE.SphereGeometry(42, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(dome));
  d.position.y = 66; d.castShadow = true;
  g.add(d);
  return g;
};

const minaret = () => grp(
  cyl(9, 12, 210, mat(0xe8ddc8), 105, 8),
  box(30, 10, 30, mat(0xd8ccb2), 0, 214),
  cone(12, 44, mat(0x3f6f5e), 240, 8)
);

const chalet = () => {
  const g = grp(box(112, 54, 92, mat(0xefe6d8), 0, 27),
    box(104, 24, 84, mat(0x8a5f3a), 0, 64));
  const roof = cone(92, 48, mat(0x6e452a), 96); roof.rotation.y = Math.PI / 4;
  const snow = cone(60, 20, mat(0xf2f6fb), 122); snow.rotation.y = Math.PI / 4;
  g.add(roof, snow);
  return g;
};

const cubeHouse = (walls: number[]) => () => grp(
  box(84, 70 + Math.random() * 40, 82, mat(pick(walls)), 0, 40),
  box(20, 34, 4, mat(0x2b62c4), 0, 17, 42)
);

const boat = (hull: number) => () => grp(
  box(76, 14, 26, mat(hull), 0, 8),
  box(30, 18, 18, mat(0xefe6d8), -6, 24),
  cyl(1.8, 1.8, 40, mat(0x7a563a), 30, 5).translateX(22)
);

const acacia = () => {
  const g = grp(cyl(3.5, 5, 46, mat(0x7a563a), 23, 6));
  const canopy = cyl(38, 26, 14, new THREE.MeshLambertMaterial({ color: 0x5d8f47, flatShading: true }), 54, 7);
  canopy.castShadow = true;
  g.add(canopy);
  return g;
};

const cactus = () => grp(
  cyl(6, 7, 52, mat(0x4e9e4a), 26, 7),
  cyl(4, 4, 24, mat(0x4e9e4a), 44, 6).translateX(11),
  cyl(4, 4, 18, mat(0x4e9e4a), 38, 6).translateX(-10)
);

const palmTree = () => {
  const g = grp(cyl(3.5, 5, 72, mat(0x8a6b40), 36, 6));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const frond = box(40, 3, 12, new THREE.MeshLambertMaterial({ color: 0x3f8f3c, flatShading: true }));
    frond.position.set(Math.cos(a) * 20, 74, Math.sin(a) * 20);
    frond.rotation.set(0, -a, 0.32);
    frond.castShadow = true;
    g.add(frond);
  }
  return g;
};

const blossom = () => {
  const t = makeTree(1);
  t.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.material) {
      const mm = m.material as THREE.MeshLambertMaterial;
      if (mm.color && mm.color.g > mm.color.r) mm.color.setHex(pick([0xe8a0bf, 0xf2c0d4]));
    }
  });
  return t;
};

const snowPine = () => {
  const p = makePine(1 + Math.random() * 0.3);
  const cap = cone(11, 16, mat(0xf2f6fb), 62, 7);
  p.add(cap);
  return p;
};

const doubleDecker = () => {
  const g = grp(box(150, 84, 44, mat(0xc22326), 0, 46));
  for (let f = 0; f < 2; f++) for (let i = 0; i < 4; i++) {
    g.add(box(22, 18, 2, mat(0x9fd3e8, 0x2a3f4a), -54 + i * 36, 32 + f * 40, 23.5));
  }
  [[-48, 12], [48, 12]].forEach(([x]) => {
    const w = cyl(10, 10, 8, mat(0x14181d), 10, 10);
    w.rotation.x = Math.PI / 2; w.position.x = x;
    g.add(w);
  });
  return g;
};

const rickshaw = () => grp(
  box(44, 30, 30, mat(0xf0b429), 0, 22),
  box(46, 14, 32, mat(0x2e7d4f), 0, 40),
  cyl(7, 7, 5, mat(0x14181d), 7, 8).rotateX(Math.PI / 2).translateX(14),
  cyl(7, 7, 5, mat(0x14181d), 7, 8).rotateX(Math.PI / 2).translateX(-14)
);

const graffitiWall = () => {
  const g = grp(box(210, 62, 14, mat(0x8f9aa8), 0, 31));
  for (let i = 0; i < 5; i++) {
    g.add(box(20 + Math.random() * 34, 14 + Math.random() * 20, 2,
      mat(pick([0xe05aa0, 0x35c04a, 0x2ec4b6, 0xf0b429, 0xc22f2a])),
      -80 + Math.random() * 160, 18 + Math.random() * 28, 8));
  }
  return g;
};

const pyramidBg = () => cone(260, 220, mat(0xcfae72), 110, 4);

const glassTower = () => makeBuilding(110, 320 + Math.random() * 240, 100, pick([0x5b87ab, 0x6e9ec4, 0x88b6d8]));

const hedgeWall = () => box(180, 34, 26, new THREE.MeshLambertMaterial({ color: 0x3f7d3c, flatShading: true }), 0, 17);

/** Pitched-roof house with randomized size, wall + roof colors from a theme palette. */
const villageHouse = (walls: number[], roofs: number[]) => () => {
  const w = 80 + Math.random() * 40, h = 46 + Math.random() * 34, d = 70 + Math.random() * 30;
  const roof = cone(w * 0.78, 34 + Math.random() * 22, mat(pick(roofs)), h + (34 + Math.random() * 22) / 2);
  roof.rotation.y = Math.PI / 4;
  const g = grp(
    box(w, h, d, mat(pick(walls)), 0, h / 2),
    roof,
    box(16, 26, 4, mat(0x5e4430), 0, 13, d / 2 + 1),           // door
    box(14, 12, 3, mat(0xffd977, 0x4a4020), -w / 4, h * 0.6, d / 2 + 1) // lit window
  );
  return g;
};

// ---------- 20 themes ----------

export const THEMES: Record<string, CityTheme> = {
  'english-village': {
    sky: 0x9fd9f0, fogFar: 3400, ground: 0x6fb257, asphalt: 0x4a4f57,
    street: [villageHouse([0xefe6d8, 0xe4d4b8, 0xf2d9c0, 0xd8ccb2], [0xb0685a, 0x6e452a, 0x8a5f3a]), () => hedgeWall(), cottage(0xe4d4b8, 0x6e452a), villageHouse([0xf5efd8, 0xe8d0b8], [0x6e452a, 0x3f6f5e]), lamp(false)],
    outskirts: [() => makeTree(1 + Math.random() * 0.4), () => hedgeWall(), () => makeTree(0.9)],
    backdrop: [clockTower]
  },
  london: {
    sky: 0xb8c9d4, fogFar: 3000, ground: 0x5f9450, asphalt: 0x3a3f47,
    street: [rowHouse([0x9d7f6a, 0x8f9aa8, 0xb0685a, 0x7a4a3a, 0x5b6470]), phoneBox, villageHouse([0xb0685a, 0x9d7f6a, 0x8a5648], [0x3a4149, 0x5b6470]), rowHouse([0x7c8894, 0xb0685a]), lamp(false), doubleDecker],
    outskirts: [() => makeTree(1), phoneBox, () => makeTree(1.2)],
    backdrop: [clockTower, () => makeBuilding(160, 420, 120, 0x7c8894)]
  },
  paris: {
    sky: 0xaad4ea, fogFar: 3200, ground: 0x74a95c, asphalt: 0x474d56,
    street: [shop(0xc22f2a), rowHouse([0xd8ccb2, 0xcdbfa4, 0xe4d4b8, 0xc9b391]), shop(0x2b62c4), villageHouse([0xe8ddc8, 0xd8ccb2], [0x35404d, 0x5b6470]), lamp(false)],
    outskirts: [blossom, () => makeTree(1), lamp(false)],
    backdrop: [latticeTower]
  },
  amsterdam: {
    sky: 0xa5cfe4, fogFar: 3000, ground: 0x6fb257, asphalt: 0x40454e, water: 'bottom',
    street: [rowHouse([0xb0685a, 0x6e5a8f, 0x3a6ea5, 0x2e7d4f, 0xc9814f, 0x8f4a6e]), lamp(false), villageHouse([0xb0685a, 0x3a6ea5, 0x2e7d4f], [0x2b2f34, 0x3a4149]), rowHouse([0xc9814f, 0x8f9aa8])],
    outskirts: [() => makeTree(1), boat(0x6e5a8f), blossom],
    backdrop: []
  },
  'new-york': {
    sky: 0x9cc4dc, fogFar: 2800, ground: 0x5f8f50, asphalt: 0x33373e,
    street: [skyscraper([0x7c8894, 0x8f9aa8, 0x5b6470]), () => grp(cyl(5, 6, 22, mat(0xc22326), 11, 8)), skyscraper([0x9d7f6a, 0x6e7683])],
    outskirts: [() => makeTree(1), () => grp(cyl(5, 6, 22, mat(0xc22326), 11, 8))],
    backdrop: [() => makeBuilding(150, 520, 130, 0x6e7683), () => makeBuilding(170, 460, 130, 0x8f9aa8)]
  },
  alpine: {
    sky: 0xcfe6f4, fogFar: 2600, ground: 0xe9eef4, asphalt: 0x4a5058,
    street: [chalet, snowPine, villageHouse([0xefe6d8, 0xd8ccb2, 0x8a5f3a], [0x6e452a, 0x4a2f1e]), chalet, lamp(false)],
    outskirts: [snowPine, snowPine, () => grp(box(60, 30, 40, mat(0xefe6d8), 0, 15))],
    backdrop: [() => cone(420, 380, mat(0xc9d4de), 190, 5), () => cone(340, 300, mat(0xdbe4ec), 150, 5)]
  },
  tokyo: {
    sky: 0x101528, fogFar: 2600, ground: 0x2a4030, asphalt: 0x23262e, night: true,
    street: [neonSign([0xe05aa0, 0x2ec4b6, 0xf0b429]), lanternPole, neonSign([0x35c04a, 0x5b87ab, 0xe05aa0]), lamp(true)],
    outskirts: [blossom, lanternPole, blossom],
    backdrop: [() => makeBuilding(150, 480, 120, 0x3a4460)]
  },
  amalfi: {
    sky: 0xa5d8ee, fogFar: 3200, ground: 0x8fae6b, asphalt: 0x4a4f57, water: 'bottom', sand: 'bottom',
    street: [cubeHouse([0xefe6d8, 0xf2d9c0, 0xf8e8e0]), palmTree, cubeHouse([0xe8d0b8, 0xf5efd8]), lamp(false)],
    outskirts: [palmTree, boat(0x2b62c4), () => makeTree(0.9)],
    backdrop: []
  },
  moscow: {
    sky: 0xc4d2de, fogFar: 2600, ground: 0xe9eef4, asphalt: 0x454b54,
    street: [domeHouse(0xd8ccb2, 0xc22f2a), snowPine, domeHouse(0xe4d4b8, 0x2b62c4), lamp(false)],
    outskirts: [snowPine, snowPine],
    backdrop: [() => grp(domeHouse(0xefe6d8, 0xf0b429)(), minaret())]
  },
  'indian-bazaar': {
    sky: 0xf4d8a8, fogFar: 3000, ground: 0xa8975c, asphalt: 0x55503f,
    street: [stall(0xe05aa0, 0xf0b429), rickshaw, villageHouse([0xe05aa0, 0x2ec4b6, 0xf0b429, 0x35c04a], [0xc22f2a, 0x8f5db0]), stall(0x35c04a, 0xc22f2a), stall(0x2ec4b6, 0xf0b429), lamp(false)],
    outskirts: [palmTree, rickshaw, stall(0xf0b429, 0xe05aa0)],
    backdrop: [domeHouse(0xe8ddc8, 0xf0b429)]
  },
  'san-francisco': {
    sky: 0xa8d4e8, fogFar: 2400, ground: 0x74a95c, asphalt: 0x3d424b,
    street: [rowHouse([0xf2d9c0, 0x9fd3e8, 0xe8a0bf, 0xd8ccb2]), lamp(false), rowHouse([0xc9b391, 0xa5cfe4])],
    outskirts: [() => makeTree(1), () => grp(cyl(5, 6, 22, mat(0xc22326), 11, 8))],
    backdrop: [() => grp(box(14, 300, 14, mat(0xc25436), 0, 150), box(240, 10, 8, mat(0xc25436), 0, 210))]
  },
  venice: {
    sky: 0xa5d0e4, fogFar: 2800, ground: 0x8fae6b, asphalt: 0x4a4f57, water: 'top',
    street: [cubeHouse([0xd8b090, 0xc9814f, 0xb0685a]), lamp(false), cubeHouse([0xe4d4b8, 0xcdbfa4])],
    outskirts: [boat(0x2b2f34), () => grp(cyl(4, 4, 60, mat(0x2b62c4), 30, 6)), boat(0xc22f2a)],
    backdrop: [domeHouse(0xe8ddc8, 0x8fae9d)]
  },
  berlin: {
    sky: 0xb0bcc6, fogFar: 2600, ground: 0x5f8f50, asphalt: 0x2f333a,
    street: [graffitiWall, () => box(116, 54, 100, mat(0x3a6ea5), 0, 27), graffitiWall, () => box(116, 54, 100, mat(0x4f7d4a), 0, 27), lamp(false)],
    outskirts: [() => makeTree(1), graffitiWall],
    backdrop: [() => grp(cyl(8, 8, 300, mat(0x8f9aa8), 150, 8), new THREE.Mesh(new THREE.SphereGeometry(34, 10, 8), mat(0xb8c4ce)).translateY(310))]
  },
  'china-town': {
    sky: 0xf0c8a0, fogFar: 2800, ground: 0x74a95c, asphalt: 0x474d56,
    street: [lanternPole, domeHouse(0xc22f2a, 0x2e5628), villageHouse([0xc22f2a, 0xb0342c, 0x8f5db0], [0x2e5628, 0x1e3a1c]), lanternPole, shop(0xf0b429), lanternPole],
    outskirts: [blossom, lanternPole, () => makeTree(0.9)],
    backdrop: []
  },
  cairo: {
    sky: 0xf2d8a8, fogFar: 3200, ground: 0xcfae72, asphalt: 0x5a523d,
    street: [cubeHouse([0xe8ddc8, 0xd8ccb2, 0xcdbfa4]), palmTree, stall(0xc22f2a, 0xf0b429), cubeHouse([0xe4d4b8])],
    outskirts: [palmTree, cactus, () => grp(box(60, 26, 40, mat(0xcdbfa4), 0, 13))],
    backdrop: [pyramidBg, () => cone(190, 160, mat(0xc9a468), 80, 4)]
  },
  rio: {
    sky: 0x8fd0e8, fogFar: 3200, ground: 0x74b257, asphalt: 0x4a4f57, water: 'bottom', sand: 'bottom',
    street: [cubeHouse([0xf0b429, 0x2ec4b6, 0xe05aa0, 0x35c04a]), palmTree, cubeHouse([0x9fd3e8, 0xf2d9c0])],
    outskirts: [palmTree, palmTree, () => makeTree(1)],
    backdrop: [() => cone(200, 300, mat(0x6b8f5a), 150, 6)]
  },
  dubai: {
    sky: 0xa8d8ee, fogFar: 3400, ground: 0xd8c49c, asphalt: 0x3d424b,
    street: [glassTower, palmTree, glassTower, lamp(false)],
    outskirts: [palmTree, palmTree, cactus],
    backdrop: [() => makeBuilding(120, 620, 100, 0x88b6d8), glassTower]
  },
  savanna: {
    sky: 0xf2cfa0, fogFar: 3400, ground: 0xb8a05c, asphalt: 0x5a523d,
    street: [acacia, () => grp(box(100, 48, 80, mat(0xa5885f), 0, 24), cone(78, 30, mat(0xc9b391), 62)), acacia],
    outskirts: [acacia, () => grp(...[0, 1, 2].map(i => box(18, 10 + i * 8, 14, mat(0x8f8a7d), i * 20 - 20, 5 + i * 4))), cactus],
    backdrop: [acacia]
  },
  vegas: {
    sky: 0x0d1024, fogFar: 2600, ground: 0x3a3524, asphalt: 0x23262e, night: true,
    street: [neonSign([0xf0b429, 0xe05aa0, 0x2ec4b6]), lamp(true), neonSign([0xc22f2a, 0x35c04a, 0x5b87ab]), neonSign([0xe05aa0, 0xf0b429])],
    outskirts: [palmTree, lamp(true)],
    backdrop: [() => makeBuilding(170, 520, 130, 0x3a4460), () => cone(120, 380, mat(0x2a2f44), 190, 4)]
  },
  istanbul: {
    sky: 0xf0d0a8, fogFar: 3000, ground: 0x8fae6b, asphalt: 0x4a4f57,
    street: [stall(0xc22f2a, 0xf0b429), domeHouse(0xe8ddc8, 0x3f6f5e), villageHouse([0xe8ddc8, 0xd8b090, 0xc9814f], [0x3f6f5e, 0x8f5db0]), stall(0x2b62c4, 0xe8ddc8), lanternPole],
    outskirts: [() => makeTree(1), stall(0xf0b429, 0x2e7d4f), palmTree],
    backdrop: [() => grp(domeHouse(0xe0d4bc, 0x8fae9d)(), (() => { const m = minaret(); m.position.x = 90; return m; })(), (() => { const m = minaret(); m.position.x = -90; return m; })())]
  }
};
