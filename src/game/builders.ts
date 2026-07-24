import * as THREE from 'three';

/** Low-poly builders in the style of the reference shots.
 *  1 unit = 1 gameplay pixel; car is ~88 long. All cars face +X. */

const mat = (color: number, opts: Partial<THREE.MeshLambertMaterialParameters> = {}) =>
  new THREE.MeshLambertMaterial({ color, ...opts });

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  b.castShadow = true;
  b.receiveShadow = true;
  return b;
}

export interface CarMeshes { group: THREE.Group; bodyMats: THREE.MeshLambertMaterial[]; tailMat: THREE.MeshLambertMaterial; blinkL: THREE.Mesh; blinkR: THREE.Mesh }

export function makeCar(color: number): CarMeshes {
  const g = new THREE.Group();
  const bodyM = mat(color);
  const roofM = mat(color).clone() as THREE.MeshLambertMaterial;
  roofM.color.offsetHSL(0, 0, 0.06);
  const glassM = mat(0x223649);
  const tireM = mat(0x14181d);

  g.add(box(84, 16, 40, bodyM, 0, 14, 0));                 // chassis
  const nose = box(20, 10, 36, bodyM, 36, 11, 0); g.add(nose); // sloped hood block
  g.add(box(42, 13, 32, glassM, 2, 27, 0));                // glasshouse
  g.add(box(28, 4, 28, roofM, 0, 35, 0));                  // roof panel
  // wheels
  const wheelGeo = new THREE.CylinderGeometry(9, 9, 8, 12);
  [[26, 21], [26, -21], [-26, 21], [-26, -21]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelGeo, tireM);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 9, z);
    w.castShadow = true;
    g.add(w);
  });
  // lights
  const head = mat(0xfff2c8, { emissive: 0x8a7a40 });
  const tail = mat(0xc62f2f, { emissive: 0x5a1010 });
  g.add(box(3, 6, 9, head, 43, 15, 13)); g.add(box(3, 6, 9, head, 43, 15, -13));
  g.add(box(3, 6, 9, tail, -43, 15, 13)); g.add(box(3, 6, 9, tail, -43, 15, -13));
  // blinkers (toggled by the game)
  const blinkM = () => mat(0xffc64b, { emissive: 0xcc8f13 });
  const blinkL = box(4, 4, 5, blinkM(), 40, 20, -18);
  const blinkR = box(4, 4, 5, blinkM(), 40, 20, 18);
  blinkL.visible = false; blinkR.visible = false;
  g.add(blinkL, blinkR);
  return { group: g, bodyMats: [bodyM, roofM], tailMat: tail, blinkL, blinkR };
}

export function makeCart(): THREE.Group {
  const g = new THREE.Group();
  const bed = box(56, 12, 34, mat(0xa5793f), 0, 22);
  const load = box(40, 16, 24, mat(0xc9814f), 0, 36);
  const pole1 = box(30, 3, 3, mat(0x7a563a), 40, 20, 10);
  const pole2 = box(30, 3, 3, mat(0x7a563a), 40, 20, -10);
  const wheelGeo = new THREE.CylinderGeometry(10, 10, 5, 10);
  const tireM = mat(0x3a2f22);
  [[0, 19], [0, -19]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelGeo, tireM);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 10, z);
    w.castShadow = true;
    g.add(w);
  });
  g.add(bed, load, pole1, pole2);
  return g;
}

export function makeBuilding(w: number, h: number, d: number, color: number): THREE.Group {
  const g = new THREE.Group();
  const body = box(w, h, d, mat(color), 0, h / 2, 0);
  g.add(body);
  // simple window grid on the road-facing side (emissive plane strips)
  const winM = mat(0x9fd3e8, { emissive: 0x3a5c6e });
  const rows = Math.max(2, Math.floor(h / 46)), cols = Math.max(2, Math.floor(w / 52));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 3 === 2) continue; // some dark windows
      const win = new THREE.Mesh(new THREE.PlaneGeometry(22, 20), winM);
      win.position.set(-w / 2 + (c + 0.5) * (w / cols), 34 + r * 46, d / 2 + 0.5);
      g.add(win);
    }
  }
  const roof = box(w * 0.94, 8, d * 0.94, mat(0x3a4149), 0, h + 4, 0);
  g.add(roof);
  return g;
}

export function makeTree(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 26, 6), mat(0x7a563a));
  trunk.position.y = 13; trunk.castShadow = true;
  const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(24, 0),
    new THREE.MeshLambertMaterial({ color: 0x4e9e4a, flatShading: true }));
  blob.position.y = 44; blob.castShadow = true;
  const blob2 = new THREE.Mesh(new THREE.IcosahedronGeometry(15, 0),
    new THREE.MeshLambertMaterial({ color: 0x63b358, flatShading: true }));
  blob2.position.set(10, 58, 6); blob2.castShadow = true;
  g.add(trunk, blob, blob2);
  g.scale.setScalar(scale);
  g.rotation.y = Math.random() * Math.PI * 2;
  return g;
}

export function makePine(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 20, 6), mat(0x6e4c30));
  trunk.position.y = 10; trunk.castShadow = true;
  g.add(trunk);
  [[26, 22, 0x2c5f2e], [20, 40, 0x357036], [13, 56, 0x3f7f3e]].forEach(([r, y, c]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 30, 7),
      new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
    cone.position.y = y; cone.castShadow = true;
    g.add(cone);
  });
  g.scale.setScalar(scale);
  return g;
}

export function makeCone(): THREE.Group {
  const g = new THREE.Group();
  const base = box(16, 3, 16, mat(0xc65a1e), 0, 1.5, 0);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 20, 10), mat(0xe0631f));
  cone.position.y = 13; cone.castShadow = true;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.8, 4, 10), mat(0xffffff));
  band.position.y = 12;
  g.add(base, cone, band);
  return g;
}

export function makePed(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(5, 6.5, 18, 8), mat(0x2f5f96));
  body.position.y = 12; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 8), mat(0xe8b98a));
  head.position.y = 26; head.castShadow = true;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(5.3, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd0453b));
  cap.position.y = 27;
  g.add(body, head, cap);
  return g;
}

export function makeCloud(): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  [[0, 0, 0, 26], [24, 4, 6, 18], [-24, 2, -4, 17], [6, 8, -10, 15]].forEach(([x, y, z, r]) => {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m);
    b.position.set(x, y, z);
    g.add(b);
  });
  return g;
}

/** Painted bay decal: green fill, white border + big P (reference style). */
export function makeBayDecal(w: number, h: number, target: boolean): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 256; c.height = Math.round(256 * (h / w));
  const ctx = c.getContext('2d')!;
  if (target) {
    ctx.fillStyle = 'rgba(53,192,74,0.92)';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#eafff0'; ctx.lineWidth = 14;
    ctx.strokeRect(9, 9, c.width - 18, c.height - 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(c.height * 0.42)}px 'Trebuchet MS', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('P', c.width / 2, c.height / 2 + 4);
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 10;
    ctx.strokeRect(7, 7, c.width - 14, c.height - 14);
  }
  const tex = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshLambertMaterial({ map: tex, transparent: true })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

/** Flat colored ground patch (ice / reverse zones, road paint). */
export function makePatch(w: number, h: number, color: number, opacity: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity })
  );
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}
