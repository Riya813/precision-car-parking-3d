import * as THREE from 'three';
import { LEVELS, LevelDef, RectDef, TrafficDef } from '../config/levels';
import { OBB, obbOverlap, obbInside, distToOBB, circleOBBOverlap, pointInOBB } from '../systems/Collision';
import { Keyboard } from '../systems/Keyboard';
import { Sfx } from '../systems/AudioSynth';
import { Save } from '../systems/SaveManager';
import {
  makeCar, makeCart, makeCone, makePed,
  makeCloud, makeBayDecal, makePatch, CarMeshes
} from './builders';
import { THEMES, CityTheme } from './themes';

// 2D gameplay coords (x, y) map to 3D (x, z). Level data is unchanged from the 2D game.
const APPROACH = 1050;
const WORLD_W = APPROACH + 1280;
const TOP = 64, BOT = 720;           // playfield z range (legacy 2D layout)
const CURB = 74;
const PARK_HOLD = 0.7;

export interface LevelResult {
  levelId: number; stars: number; score: number; time: number;
  inchPerfect: boolean; combo: number; improved: boolean;
  breakdown: { timeBonus: number; precisionBonus: number; alignBonus: number;
               perfectBonus: number; damagePenalty: number; comboMult: number };
}

export interface GameEvents {
  onTime(text: string, danger: boolean): void;
  onCrash(): void;   // any contact — auto level reset
  onPopup(sx: number, sy: number, text: string, color: string, px: number): void;
  onParkProgress(sx: number, sy: number, p: number | null): void;
  onComplete(res: LevelResult): void;
  onFail(title: string, subtitle: string): void;
}

let sharedRenderer: THREE.WebGLRenderer | null = null;
function renderer(): THREE.WebGLRenderer {
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({ antialias: true });
    sharedRenderer.shadowMap.enabled = true;
    sharedRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sharedRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    document.getElementById('app')!.appendChild(sharedRenderer.domElement);
    addEventListener('resize', () => sharedRenderer!.setSize(innerWidth, innerHeight));
    sharedRenderer.setSize(innerWidth, innerHeight);
  }
  return sharedRenderer;
}

export class Game3D {
  static combo = 0; // clean-park streak, survives across levels

  private lvl: LevelDef;
  private theme: CityTheme;
  private cameraMode = 0; // 0 chase · 1 high chase · 2 top-down · 3 hood
  private traffic: { mesh: THREE.Group; path: { x: number; y: number }[]; idx: number; speed: number; heading: number; cart?: boolean }[] = [];
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 1, 6000);
  private sun!: THREE.DirectionalLight;
  private keys = new Keyboard();
  private carMesh: CarMeshes;
  private clouds: THREE.Group[] = [];
  private particles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];

  // car state (2D physics on the XZ plane)
  private cx = 190; private cy = 392; private heading = 0;
  private vx = 0; private vy = 0; private steer = 0;
  private blinkTimer = 0;

  private wallOBBs: OBB[] = [];
  private coneOBBs: OBB[] = [];
  private bayOBB!: OBB;
  private iceOBBs: OBB[] = [];
  private reverseOBBs: OBB[] = [];
  private peds: { mesh: THREE.Group; path: { x: number; y: number }[]; idx: number; speed: number; cd: number; t: number }[] = [];

  private elapsed = 0;
  private nearMissCd = 0;
  private parkTimer = 0;
  private finished = false;
  private paused = false;
  private frozen = false;   // tutorial hold
  private shakeT = 0;
  private orbiting = false;
  private orbitT = 0;
  private pendingResult: LevelResult | null = null;
  private headlights: THREE.SpotLight[] = [];
  private flashT = 0;
  private disposed = false;

  constructor(levelId: number, private retries: number, private ev: GameEvents) {
    this.lvl = LEVELS.find(l => l.id === levelId)!;
    this.theme = THEMES[this.lvl.theme] ?? THEMES['english-village'];
    this.cy = Math.min(Math.max(this.lvl.start.y, TOP + CURB + 60), BOT - CURB - 60);
    this.buildScene();
    this.carMesh = makeCar(0xf0b429);
    this.scene.add(this.carMesh.group);
    // headlights: stronger at night, subtle by day; brake lights glow on Space
    [-13, 13].forEach(z => {
      const beam = new THREE.SpotLight(0xfff2c8, this.theme.night ? 2.6 : 0.5, 620, 0.45, 0.5, 1.2);
      beam.position.set(42, 20, z);
      const target = new THREE.Object3D();
      target.position.set(420, 0, z);
      this.carMesh.group.add(target, beam);
      beam.target = target;
      this.headlights.push(beam);
    });
    this.syncCar();
    this.camera.position.set(this.cx - 220, 150, this.cy);
    renderer().setAnimationLoop(() => this.frame());
    addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  };

  freeze() { this.frozen = true; }
  unfreeze() { this.frozen = false; }
  setPaused(p: boolean) { this.paused = p; if (p) Sfx.stopEngine(); }

  dispose() {
    this.disposed = true;
    Sfx.stopEngine();
    renderer().setAnimationLoop(null);
    removeEventListener('resize', this.onResize);
    this.scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(mm => mm.dispose());
    });
  }

  // ---------- scene ----------

  private off(d: RectDef): OBB {
    return { x: d.x + APPROACH, y: d.y, w: d.w, h: d.h, angle: (d.angle ?? 0) * Math.PI / 180 };
  }

  private buildScene() {
    const th = this.theme;
    this.scene.background = new THREE.Color(th.sky);
    this.scene.fog = new THREE.Fog(th.sky, th.night ? 900 : 1400, th.fogFar);

    this.scene.add(new THREE.HemisphereLight(
      th.night ? 0x3a4a6e : 0xcfeaf7, th.night ? 0x1a2030 : 0x4e7a41, th.night ? 0.55 : 0.85));
    this.sun = new THREE.DirectionalLight(th.night ? 0x9fb4e8 : 0xfff3d6, th.night ? 0.7 : 1.5);
    this.sun.position.set(-300, 600, -260);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0008;
    const sc = this.sun.shadow.camera;
    sc.left = -900; sc.right = 900; sc.top = 900; sc.bottom = -900; sc.far = 2200;
    this.scene.add(this.sun, this.sun.target);

    // grass island + asphalt lot
    const grass = makePatch(7000, 5000, th.ground, 1);
    grass.position.set(WORLD_W / 2, 0, (TOP + BOT) / 2);
    grass.receiveShadow = true;
    this.scene.add(grass);
    const midZ = (TOP + BOT) / 2;
    const asphalt = makePatch(WORLD_W - CURB * 2, BOT - TOP - CURB * 2, th.asphalt, 1);
    asphalt.position.set(WORLD_W / 2, 0.3, midZ);
    this.scene.add(asphalt);

    // curbs (stone ring)
    const curbM = new THREE.MeshLambertMaterial({ color: 0xa9a397 });
    const ring: [number, number, number, number][] = [
      [WORLD_W / 2, TOP + CURB - 7, WORLD_W - CURB * 2 + 28, 14],
      [WORLD_W / 2, BOT - CURB + 7, WORLD_W - CURB * 2 + 28, 14],
      [CURB - 7 + CURB, 0, 0, 0] // placeholder replaced below
    ];
    ring.length = 2;
    ring.forEach(([x, z, w, d]) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(w, 12, d), curbM);
      c.position.set(x, 6, z); c.castShadow = true; c.receiveShadow = true;
      this.scene.add(c);
    });
    [[CURB, midZ], [WORLD_W - CURB, midZ]].forEach(([x, z]) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(14, 12, BOT - TOP - CURB * 2 + 28), curbM);
      c.position.set(x, 6, z); c.castShadow = true; c.receiveShadow = true;
      this.scene.add(c);
    });

    // centre dashes on the approach + crosswalk at the lot entrance
    for (let x = CURB + 60; x < APPROACH + 100; x += 96) {
      const dash = makePatch(46, 6, 0xe8ebef, 0.9);
      dash.position.set(x, 0.5, midZ);
      this.scene.add(dash);
    }
    for (let z = TOP + CURB + 24; z < BOT - CURB - 12; z += 36) {
      const stripe = makePatch(40, 18, 0xe8ebef, 0.75);
      stripe.position.set(APPROACH + 8, 0.5, z);
      this.scene.add(stripe);
    }

    // water / beach strips (Venice, Amsterdam, Amalfi, Rio)
    if (th.water) {
      const wz = th.water === 'top' ? -700 : BOT + 700 + (th.sand ? 160 : 0);
      const water = makePatch(9000, 1400, 0x3fa8c9, 1);
      water.position.set(WORLD_W / 2, -0.5, wz + (th.water === 'top' ? -60 : 60));
      this.scene.add(water);
      if (th.sand) {
        const sand = makePatch(9000, 340, 0xe8d4a0, 1);
        sand.position.set(WORLD_W / 2, 0.1, th.sand === 'top' ? -180 : BOT + 180);
        this.scene.add(sand);
      }
    }

    // themed street props along the approach, outskirts around the lot
    const place = (obj: THREE.Object3D, x: number, z: number, faceRoad: boolean) => {
      obj.position.set(x, 0, z);
      if (faceRoad && z > (TOP + BOT) / 2) obj.rotation.y += Math.PI;
      obj.rotation.y += (Math.random() - 0.5) * 0.16;
      obj.scale.multiplyScalar(0.85 + Math.random() * 0.4);
      this.scene.add(obj);
    };
    let si = 0;
    for (let x = 150; x < APPROACH + 220; x += 235) {
      place(th.street[si % th.street.length](), x, TOP - 44 - Math.random() * 30, true);
      place(th.street[(si + 2) % th.street.length](), x + 115, BOT + 44 + Math.random() * 30, true);
      if (Math.random() < 0.55) {
        place(th.outskirts[si % th.outskirts.length](), x + 60, TOP - 120 - Math.random() * 60, true);
        place(th.outskirts[(si + 1) % th.outskirts.length](), x + 175, BOT + 120 + Math.random() * 60, true);
      }
      si++;
    }
    let oi = 0;
    for (let x = APPROACH + 280; x < WORLD_W + 400; x += 205) {
      place(th.outskirts[oi % th.outskirts.length](), x + Math.random() * 50, TOP - 36 - Math.random() * 110, true);
      place(th.outskirts[(oi + 1) % th.outskirts.length](), x - 30 + Math.random() * 50, BOT + 36 + Math.random() * 110, true);
      oi++;
    }
    (th.backdrop ?? []).forEach((f, i) => {
      const b = f();
      const side = i % 2 === 0 ? -1 : 1;
      b.position.set(400 + i * 700 + Math.random() * 300, 0,
        side < 0 ? -420 - Math.random() * 200 : BOT + 420 + Math.random() * 200);
      if (side > 0) b.rotation.y = Math.PI;
      this.scene.add(b);
    });

    for (let i = 0; i < (th.night ? 0 : 7); i++) {
      const c = makeCloud();
      c.position.set(Math.random() * WORLD_W, 340 + Math.random() * 140, -200 + Math.random() * 1100);
      c.scale.setScalar(1.2 + Math.random() * 1.6);
      this.clouds.push(c);
      this.scene.add(c);
    }

    // zones
    for (const z of this.lvl.iceZones ?? []) {
      const o = this.off(z); this.iceOBBs.push(o);
      const p = makePatch(o.w, o.h, 0xa8dcec, 0.55);
      p.position.set(o.x, 0.5, o.y); p.rotation.z = -o.angle;
      this.scene.add(p);
    }
    for (const z of this.lvl.reverseZones ?? []) {
      const o = this.off(z); this.reverseOBBs.push(o);
      const p = makePatch(o.w, o.h, 0x8a6bd1, 0.35);
      p.position.set(o.x, 0.5, o.y); p.rotation.z = -o.angle;
      this.scene.add(p);
    }

    // bays (green target with P, white ghost outlines)
    for (const g of this.lvl.ghostBays ?? []) {
      const o = this.off(g);
      const d = makeBayDecal(o.w, o.h, false);
      d.position.set(o.x, 0.7, o.y); d.rotation.z = -o.angle;
      this.scene.add(d);
    }
    this.bayOBB = this.off(this.lvl.bay);
    const bay = makeBayDecal(this.bayOBB.w, this.bayOBB.h, true);
    bay.position.set(this.bayOBB.x, 0.8, this.bayOBB.y);
    bay.rotation.z = -this.bayOBB.angle;
    this.scene.add(bay);
    this.bayPulse = bay.material as THREE.MeshLambertMaterial;

    // obstacles: parked cars / planters / cones / pedestrians
    const carCols = [0xe9eaec, 0x2b62c4, 0x2b2f34, 0xc22f2a, 0xb9bec4];
    (this.lvl.walls ?? []).forEach((w, i) => {
      const o = this.off(w); this.wallOBBs.push(o);
      const carSized = (o.w >= 70 && o.w <= 200 && o.h >= 60 && o.h <= 110) ||
                       (o.h >= 70 && o.h <= 200 && o.w >= 60 && o.w <= 110);
      if (carSized) {
        const car = makeCar(carCols[i % carCols.length]).group;
        const vertical = o.h > o.w;
        car.position.set(o.x, 0, o.y);
        car.rotation.y = -(o.angle + (vertical ? Math.PI / 2 : 0));
        const len = Math.max(o.w, o.h);
        car.scale.setScalar(len / 88);
        this.scene.add(car);
      } else {
        const blockM = new THREE.MeshLambertMaterial({ color: 0x8a6f4d });
        const block = new THREE.Mesh(new THREE.BoxGeometry(o.w, 26, o.h), blockM);
        block.position.set(o.x, 13, o.y); block.rotation.y = -o.angle;
        block.castShadow = true; block.receiveShadow = true;
        this.scene.add(block);
        const bushes = new THREE.Group();
        for (let b = 0; b < Math.max(2, Math.floor(o.w * o.h / 8000)); b++) {
          const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(12 + Math.random() * 8, 0),
            new THREE.MeshLambertMaterial({ color: 0x4e9e4a, flatShading: true }));
          bush.position.set(o.x + (Math.random() - 0.5) * o.w * 0.6, 30,
                            o.y + (Math.random() - 0.5) * o.h * 0.6);
          bush.castShadow = true;
          bushes.add(bush);
        }
        this.scene.add(bushes);
      }
    });

    for (const c of this.lvl.cones ?? []) {
      const x = c.x + APPROACH;
      this.coneOBBs.push({ x, y: c.y, w: 22, h: 22, angle: 0 });
      const cone = makeCone();
      cone.position.set(x, 0, c.y);
      this.scene.add(cone);
    }

    const trafficCols = [0xe9eaec, 0x2b62c4, 0xc22f2a, 0x2b2f34];
    (this.lvl.traffic ?? []).forEach((t: TrafficDef, i: number) => {
      const mesh = t.kind === 'cart' ? makeCart() : makeCar(trafficCols[i % trafficCols.length]).group;
      const path = t.path.map(pt => ({ x: pt.x + APPROACH, y: pt.y }));
      mesh.position.set(path[0].x, 0, path[0].y);
      this.scene.add(mesh);
      this.traffic.push({ mesh, path, idx: 1, speed: t.speed, heading: 0, cart: t.kind === 'cart' });
    });

    for (const p of this.lvl.peds ?? []) {
      const mesh = makePed();
      const path = p.path.map(pt => ({ x: pt.x + APPROACH, y: pt.y }));
      mesh.position.set(path[0].x, 0, path[0].y);
      this.scene.add(mesh);
      this.peds.push({ mesh, path, idx: 1, speed: p.speed, cd: 0, t: 0 });
    }

    // flavour parked cars on the approach, opposite the spawn lane
    const topLane = TOP + CURB + 54, botLane = BOT - CURB - 54;
    [[440, topLane], [820, botLane]].forEach(([x, lane], k) => {
      const safe = Math.abs(lane - this.cy) > 150 ? lane : (lane === topLane ? botLane : topLane);
      if (Math.abs(safe - this.cy) <= 150) return;
      this.wallOBBs.push({ x, y: safe, w: 150, h: 78, angle: 0 });
      const car = makeCar(k ? 0xb9bec4 : 0x2b2f34).group;
      car.position.set(x, 0, safe);
      car.scale.setScalar(150 / 88);
      this.scene.add(car);
    });
  }

  private bayPulse!: THREE.MeshLambertMaterial;

  // ---------- loop ----------

  private frame() {
    if (this.disposed) return;
    const dt = Math.min(0.05, this.clockDelta());
    if (!this.paused && !this.frozen && !this.finished) this.update(dt);
    if (this.orbiting) this.updateOrbit(dt);
    else this.updateCamera(dt);
    this.updateEffects(dt);
    renderer().render(this.scene, this.camera);
  }

  private lastT = performance.now();
  private clockDelta(): number {
    const now = performance.now();
    const dt = (now - this.lastT) / 1000;
    this.lastT = now;
    return dt;
  }

  private update(dt: number) {
    this.elapsed += dt;
    this.nearMissCd = Math.max(0, this.nearMissCd - dt);

    this.drive(dt);
    this.clamp();
    this.updatePeds(dt);
    this.updateTraffic(dt);
    this.checkCollisions();
    this.checkNearMiss();
    this.checkParking(dt);
    this.updateTimer();
    Sfx.engine(Math.min(1, this.speed / this.lvl.maxSpeed), true);
  }

  /** Ported unchanged from the 2D game: bicycle model with lateral grip. */
  private drive(dt: number) {
    const ACCEL = 300, REV_ACCEL = 190, DRAG = 0.6, ROLL = 40, BRAKE = 560;
    const MAX_STEER = 0.62, STEER_SPEED = 4.2, WHEELBASE = 58;

    let grip = 0.95, reverseOnly = false;
    for (const z of this.iceOBBs) if (pointInOBB({ x: this.cx, y: this.cy }, z)) grip = 0.18;
    for (const z of this.reverseOBBs) if (pointInOBB({ x: this.cx, y: this.cy }, z)) reverseOnly = true;

    const steerIn = this.keys.steerAxis();
    let throttleIn = this.keys.throttleAxis();
    const brake = this.keys.brake;
    if (reverseOnly && throttleIn > 0) throttleIn = 0;

    const target = steerIn * MAX_STEER;
    const rate = STEER_SPEED * (steerIn === 0 ? 1.6 : 1);
    this.steer += (target - this.steer) * Math.min(1, rate * dt);

    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    let vf = this.vx * c + this.vy * s;
    let vl = -this.vx * s + this.vy * c;

    if (throttleIn > 0 && !brake) vf += ACCEL * throttleIn * dt;
    else if (throttleIn < 0 && !brake) vf += REV_ACCEL * throttleIn * dt;
    if (brake) vf -= Math.sign(vf) * Math.min(Math.abs(vf) / dt, BRAKE * grip + 120) * dt;
    vf -= vf * DRAG * dt;
    vf -= Math.sign(vf) * Math.min(Math.abs(vf), ROLL * dt);
    vf = Math.max(-this.lvl.maxSpeed * 0.55, Math.min(this.lvl.maxSpeed, vf));

    vl *= Math.exp(-grip * 14 * dt);
    if (Math.abs(vl) > 55 && Math.random() < 0.15) Sfx.skid();

    this.heading += (vf / WHEELBASE) * Math.tan(this.steer) * dt;
    const c2 = Math.cos(this.heading), s2 = Math.sin(this.heading);
    this.vx = c2 * vf - s2 * vl;
    this.vy = s2 * vf + c2 * vl;
    this.cx += this.vx * dt;
    this.cy += this.vy * dt;

    this.carMesh.tailMat.emissive.setHex(brake ? 0xb01818 : 0x5a1010);

    // blinkers
    if (steerIn !== 0 && Math.abs(vf) > 5) {
      this.blinkTimer += dt;
      const on = Math.floor(this.blinkTimer / 0.24) % 2 === 0;
      this.carMesh.blinkL.visible = steerIn < 0 && on;
      this.carMesh.blinkR.visible = steerIn > 0 && on;
    } else {
      this.blinkTimer = 0;
      this.carMesh.blinkL.visible = false;
      this.carMesh.blinkR.visible = false;
    }
    this.syncCar();
  }

  private get speed() { return Math.hypot(this.vx, this.vy); }
  private get obb(): OBB { return { x: this.cx, y: this.cy, w: 82, h: 40, angle: this.heading }; }

  private syncCar() {
    this.carMesh.group.position.set(this.cx, 0, this.cy);
    this.carMesh.group.rotation.y = -this.heading;
  }

  private clamp() {
    const m = CURB + 16;
    let bumped = false;
    if (this.cx < m) { this.cx = m; bumped = true; }
    if (this.cx > WORLD_W - m) { this.cx = WORLD_W - m; bumped = true; }
    if (this.cy < TOP + m) { this.cy = TOP + m; bumped = true; }
    if (this.cy > BOT - m) { this.cy = BOT - m; bumped = true; }
    if (bumped) this.crash();
  }

  private updatePeds(dt: number) {
    for (const p of this.peds) {
      p.t += dt;
      p.cd = Math.max(0, p.cd - dt);
      const target = p.path[p.idx];
      const dx = target.x - p.mesh.position.x, dz = target.y - p.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 4) { p.idx = p.idx === p.path.length - 1 ? 0 : p.path.length - 1; continue; }
      p.mesh.position.x += (dx / d) * p.speed * dt;
      p.mesh.position.z += (dz / d) * p.speed * dt;
      p.mesh.rotation.y = -Math.atan2(dz, dx) + Math.PI / 2;
      p.mesh.scale.y = 1 + Math.sin(p.t * 10) * 0.05;
      if (p.cd <= 0 && circleOBBOverlap(p.mesh.position.x, p.mesh.position.z, 12, this.obb)) {
        p.cd = 2;
        Sfx.pedYelp();
        this.crash();
      }
    }
  }

  private updateTraffic(dt: number) {
    for (const t of this.traffic) {
      const target = t.path[t.idx];
      const dx = target.x - t.mesh.position.x, dz = target.y - t.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 6) { t.idx = t.idx === t.path.length - 1 ? 0 : t.path.length - 1; continue; }
      t.mesh.position.x += (dx / d) * t.speed * dt;
      t.mesh.position.z += (dz / d) * t.speed * dt;
      const want = Math.atan2(dz, dx);
      let diff = want - t.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      t.heading += diff * Math.min(1, 6 * dt);
      t.mesh.rotation.y = -t.heading;
      if (obbOverlap(this.obb,
          { x: t.mesh.position.x, y: t.mesh.position.z, w: t.cart ? 62 : 86, h: t.cart ? 40 : 42, angle: t.heading })) {
        this.crash();
        return;
      }
    }
  }

  private checkCollisions() {
    for (const o of [...this.wallOBBs, ...this.coneOBBs]) {
      if (obbOverlap(this.obb, o)) { this.crash(); return; }
    }
  }

  private checkNearMiss() {
    if (this.nearMissCd > 0 || this.speed < 130) return;
    for (const o of [...this.wallOBBs, ...this.coneOBBs]) {
      const d = distToOBB(this.cx, this.cy, o) - 32;
      if (d > 0 && d < 14) {
        this.nearMissCd = 1.2;
        Sfx.nearMiss();
        this.popupAtCar('close!', 'var(--teal)', 20);
        return;
      }
    }
  }

  /** One touch = level reset: obstacle, pedestrian, traffic, or boundary. */
  private crash() {
    if (this.finished) return;
    this.finished = true;
    Game3D.combo = 0;
    Sfx.crash();
    Sfx.fail();
    this.shakeT = 0.35;
    this.flashT = 0.6;
    this.burst(0xff6b5e, 30, 240);
    this.popupAtCar('CRASH!', 'var(--bad)', 40);
    Sfx.stopEngine();
    setTimeout(() => { if (!this.disposed) this.ev.onCrash(); }, 750);
  }

  private checkParking(dt: number) {
    const tolerant: OBB = { ...this.bayOBB, w: this.bayOBB.w + 6, h: this.bayOBB.h + 6 };
    const inside = obbInside(this.obb, tolerant) && this.speed < 9;
    if (inside) {
      this.parkTimer += dt;
      const p = Math.min(1, this.parkTimer / PARK_HOLD);
      const s = this.toScreen(this.cx, 60, this.cy);
      this.ev.onParkProgress(s.x, s.y, p);
      if (p >= 1) this.succeed();
    } else {
      if (this.parkTimer > 0) this.ev.onParkProgress(0, 0, null);
      this.parkTimer = 0;
    }
  }

  private updateTimer() {
    const fmt = (t: number) => {
      const c = Math.max(0, Math.ceil(t));
      return `${String(Math.floor(c / 60)).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`;
    };
    if (this.lvl.timeLimit) {
      const left = this.lvl.timeLimit - this.elapsed;
      this.ev.onTime(fmt(left), left < 10);
      if (left <= 0) this.fail('OUT OF TIME', 'The bay got taken by someone else.');
    } else {
      this.ev.onTime(fmt(Math.floor(this.elapsed)), false);
    }
  }

  // ---------- camera & effects ----------

  cycleCamera(): number {
    this.cameraMode = (this.cameraMode + 1) % 4;
    return this.cameraMode;
  }

  private updateCamera(dt: number) {
    const fx = Math.cos(this.heading), fz = Math.sin(this.heading);
    let want: THREE.Vector3, look: THREE.Vector3;
    switch (this.cameraMode) {
      case 1: // high chase — wider view of the lot
        want = new THREE.Vector3(this.cx - fx * 330, 300, this.cy - fz * 330);
        look = new THREE.Vector3(this.cx + fx * 60, 10, this.cy + fz * 60);
        break;
      case 2: // top-down — precision parking view
        want = new THREE.Vector3(this.cx, 560, this.cy + 40);
        look = new THREE.Vector3(this.cx, 0, this.cy);
        break;
      case 3: // hood cam
        want = new THREE.Vector3(this.cx + fx * 26, 42, this.cy + fz * 26);
        look = new THREE.Vector3(this.cx + fx * 340, 22, this.cy + fz * 340);
        break;
      default: // chase
        want = new THREE.Vector3(this.cx - fx * 210, 130, this.cy - fz * 210);
        look = new THREE.Vector3(this.cx + fx * 70, 26, this.cy + fz * 70);
    }
    const k = 1 - Math.exp(-(this.cameraMode === 3 ? 14 : 5) * dt);
    this.camera.position.lerp(want, k);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      this.camera.position.x += (Math.random() - 0.5) * 10;
      this.camera.position.y += (Math.random() - 0.5) * 8;
    }
    this.camera.lookAt(look);
    // sun + shadow frustum follow the car
    this.sun.position.set(this.cx - 300, 600, this.cy - 260);
    this.sun.target.position.set(this.cx, 0, this.cy);
  }

  private updateEffects(dt: number) {
    // bay glow pulse
    const t = performance.now() / 1000;
    this.bayPulse.opacity = 0.8 + Math.sin(t * 3.2) * 0.18;
    this.bayPulse.transparent = true;
    // damage flash
    if (this.flashT > 0) {
      this.flashT -= dt;
      const on = Math.floor(this.flashT * 10) % 2 === 0;
      this.carMesh.bodyMats.forEach(m => m.emissive.setHex(on ? 0x992222 : 0x000000));
      if (this.flashT <= 0) this.carMesh.bodyMats.forEach(m => m.emissive.setHex(0x000000));
    }
    for (const c of this.clouds) {
      c.position.x += 6 * dt;
      if (c.position.x > WORLD_W + 700) c.position.x = -700;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vel.y -= 320 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 5; p.mesh.rotation.z += dt * 4;
      (p.mesh.material as THREE.MeshLambertMaterial).opacity = Math.max(0, p.life / 0.9);
      if (p.life <= 0) { this.scene.remove(p.mesh); this.particles.splice(i, 1); }
    }
  }

  private burst(color: number, count: number, speed: number) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(6, 6, 6),
        new THREE.MeshLambertMaterial({ color, transparent: true })
      );
      m.position.set(this.cx, 30, this.cy);
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3(Math.cos(a) * speed * (0.4 + Math.random()),
          120 + Math.random() * 160, Math.sin(a) * speed * (0.4 + Math.random())),
        life: 0.9
      });
      this.scene.add(m);
    }
  }

  private toScreen(x: number, y: number, z: number) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }

  private popupAtCar(text: string, color: string, px: number) {
    const s = this.toScreen(this.cx, 70, this.cy);
    this.ev.onPopup(s.x, s.y, text, color, px);
  }

  // ---------- outcomes ----------

  private succeed() {
    this.finished = true;
    Sfx.stopEngine();
    this.vx = 0; this.vy = 0;
    this.ev.onParkProgress(0, 0, null);

    const dx = this.cx - this.bayOBB.x, dy = this.cy - this.bayOBB.y;
    const centerDist = Math.hypot(dx, dy);
    let angErr = Math.abs(((this.heading - this.bayOBB.angle) * 180 / Math.PI + 540) % 360 - 180);
    angErr = Math.min(angErr, Math.abs(180 - angErr));
    const inchPerfect = centerDist < 8 && angErr < 4;

    const firstTry = this.retries === 0;
    Game3D.combo = firstTry ? Game3D.combo + 1 : 0;

    const timeBonus = Math.max(0, Math.round((this.lvl.par * 2 - this.elapsed) * 100));
    const precisionBonus = Math.max(0, Math.round(1500 - centerDist * 30));
    const alignBonus = Math.max(0, Math.round(500 - angErr * 25));
    const perfectBonus = inchPerfect ? 1000 : 0;
    const damagePenalty = 0; // crashes now reset the level instead of costing points
    const comboMult = 1 + Math.min(0.5, Math.max(0, Game3D.combo - 1) * 0.1);
    const score = Math.max(0, Math.round(
      (timeBonus + precisionBonus + alignBonus + perfectBonus - damagePenalty) * comboMult));

    // stars: 3★ beat par first try · 2★ under 1.75× par within 2 resets · 1★ any finish
    let stars = 1;
    if (this.elapsed <= this.lvl.par && firstTry) stars = 3;
    else if (this.retries <= 2 && this.elapsed <= this.lvl.par * 1.75) stars = 2;

    Sfx.parkSuccess();
    if (inchPerfect) { Sfx.perfectPark(); this.popupAtCar('INCH PERFECT! +1000', 'var(--gold)', 34); }
    if (Game3D.combo > 1) { Sfx.combo(Game3D.combo); this.popupAtCar(`CLEAN STREAK ×${Game3D.combo}`, 'var(--teal)', 24); }
    this.burst(0x35c04a, inchPerfect ? 50 : 26, 220);
    this.burst(0xffffff, 14, 140);

    const improved = Save.submit(this.lvl.id, stars, score, this.elapsed, LEVELS.length);
    this.pendingResult = {
      levelId: this.lvl.id, stars, score, time: this.elapsed,
      inchPerfect, combo: Game3D.combo, improved,
      breakdown: { timeBonus, precisionBonus, alignBonus, perfectBonus, damagePenalty, comboMult }
    };
    // victory lap: 360° orbit of the parked car, then the results screen
    this.orbiting = true;
    this.orbitT = 0;
  }

  private updateOrbit(dt: number) {
    this.orbitT += dt;
    const DUR = 3.2;
    const p = Math.min(1, this.orbitT / DUR);
    const ease = p < 0.12 ? p / 0.12 : 1; // ease into the spin
    const a = -this.heading + Math.PI + p * Math.PI * 2 * ease;
    const r = 250 - p * 40, h = 130 + Math.sin(p * Math.PI) * 90;
    this.camera.position.lerp(
      new THREE.Vector3(this.cx + Math.cos(a) * r, h, this.cy + Math.sin(a) * r),
      1 - Math.exp(-8 * dt));
    this.camera.lookAt(this.cx, 22, this.cy);
    if (this.orbitT >= DUR + 0.2 && this.pendingResult) {
      this.orbiting = false;
      const res = this.pendingResult;
      this.pendingResult = null;
      if (!this.disposed) this.ev.onComplete(res);
    }
  }

  private fail(title: string, subtitle: string) {
    if (this.finished) return;
    this.finished = true;
    Game3D.combo = 0;
    Sfx.stopEngine();
    Sfx.fail();
    this.shakeT = 0.4;
    setTimeout(() => { if (!this.disposed) this.ev.onFail(title, subtitle); }, 600);
  }
}
