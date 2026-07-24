export interface RectDef { x: number; y: number; w: number; h: number; angle?: number }
export interface PedDef { path: { x: number; y: number }[]; speed: number }
export interface TrafficDef { path: { x: number; y: number }[]; speed: number; kind?: 'car' | 'cart' }

export interface LevelDef {
  id: number;
  name: string;           // city the level is set in
  theme: string;          // key into THEMES
  par: number;            // seconds — beat this (clean) for 3 stars
  timeLimit?: number;     // seconds — exceed = fail
  maxSpeed: number;       // px/s
  start: { x: number; y: number; angle: number };
  bay: RectDef;           // target bay
  ghostBays?: RectDef[];
  walls?: RectDef[];      // static obstacles
  cones?: { x: number; y: number }[];
  peds?: PedDef[];
  traffic?: TrafficDef[]; // moving cars — 1 damage on contact
  iceZones?: RectDef[];   // slippery (ice / oil / mud depending on city)
  reverseZones?: RectDef[];
  hint?: string;
}

// Playfield: 1280x720 lot coords, drivable z 138..646 inside the curb ring.
// The approach street (x < 0 offset) is prepended by the engine.
export const LEVELS: LevelDef[] = [
  {
    id: 1, name: 'English Village', theme: 'english-village', par: 16, maxSpeed: 240,
    start: { x: 160, y: 400, angle: 0 },
    bay: { x: 1040, y: 400, w: 150, h: 220 },
    hint: 'Arrow keys drive. Cruise through the village, stop fully inside the green P bay.'
  },
  {
    id: 2, name: 'London', theme: 'london', par: 20, maxSpeed: 250,
    start: { x: 150, y: 620, angle: 0 },
    bay: { x: 1080, y: 240, w: 130, h: 200 },
    cones: [
      { x: 480, y: 620 }, { x: 480, y: 500 }, { x: 700, y: 380 },
      { x: 700, y: 260 }, { x: 880, y: 500 }
    ],
    hint: 'One touch of a cone — or the boundary — resets the level. Drive clean.'
  },
  {
    id: 3, name: 'Paris', theme: 'paris', par: 22, maxSpeed: 250,
    start: { x: 170, y: 200, angle: 0 },
    bay: { x: 760, y: 560, w: 190, h: 96 },
    walls: [
      { x: 540, y: 560, w: 180, h: 90 }, { x: 990, y: 560, w: 180, h: 90 },
      { x: 640, y: 180, w: 700, h: 60 }
    ],
    hint: 'Parallel park on the boulevard: swing wide, then tuck in.'
  },
  {
    id: 4, name: 'Amsterdam', theme: 'amsterdam', par: 24, maxSpeed: 255,
    start: { x: 200, y: 250, angle: 0 },
    bay: { x: 1060, y: 540, w: 120, h: 190 },
    reverseZones: [{ x: 1040, y: 500, w: 440, h: 440 }],
    walls: [{ x: 860, y: 560, w: 120, h: 190 }, { x: 640, y: 300, w: 60, h: 260 }],
    cones: [{ x: 900, y: 250 }],
    hint: 'Purple zone = reverse only (↓ backs up). Back it in like a pro.'
  },
  {
    id: 5, name: 'New York', theme: 'new-york', par: 26, timeLimit: 72, maxSpeed: 260,
    start: { x: 150, y: 620, angle: 0 },
    bay: { x: 795, y: 210, w: 108, h: 175 },
    ghostBays: [
      { x: 555, y: 210, w: 108, h: 175 }, { x: 675, y: 210, w: 108, h: 175 },
      { x: 915, y: 210, w: 108, h: 175 }, { x: 1035, y: 210, w: 108, h: 175 }
    ],
    walls: [
      { x: 555, y: 200, w: 92, h: 160 }, { x: 1035, y: 200, w: 92, h: 160 },
      { x: 420, y: 430, w: 260, h: 70 }
    ],
    cones: [{ x: 900, y: 470 }],
    traffic: [{ path: [{ x: 700, y: 420 }, { x: 700, y: 640 }], speed: 60, kind: 'cart' }],
    hint: 'Only the glowing bay counts — and mind the delivery cart. The clock is running.'
  },
  {
    id: 6, name: 'Alpine Village', theme: 'alpine', par: 28, timeLimit: 67, maxSpeed: 265,
    start: { x: 150, y: 200, angle: 0 },
    bay: { x: 1080, y: 570, w: 118, h: 185 },
    iceZones: [{ x: 620, y: 400, w: 560, h: 320 }, { x: 980, y: 180, w: 300, h: 160 }],
    walls: [{ x: 620, y: 620, w: 200, h: 80 }, { x: 500, y: 380, w: 70, h: 240 }],
    cones: [{ x: 850, y: 300 }, { x: 1150, y: 350 }],
    hint: 'Blue patches are ice. Feather the throttle — or slide on purpose.'
  },
  {
    id: 7, name: 'Tokyo', theme: 'tokyo', par: 30, timeLimit: 67, maxSpeed: 265,
    start: { x: 150, y: 620, angle: 0 },
    bay: { x: 1100, y: 200, w: 116, h: 180 },
    walls: [{ x: 620, y: 200, w: 240, h: 90 }, { x: 400, y: 420, w: 90, h: 90 }],
    peds: [
      { path: [{ x: 640, y: 150 }, { x: 640, y: 640 }], speed: 70 },
      { path: [{ x: 900, y: 640 }, { x: 900, y: 150 }], speed: 85 }
    ],
    cones: [{ x: 1150, y: 450 }],
    traffic: [{ path: [{ x: 1150, y: 320 }, { x: 1150, y: 600 }], speed: 70, kind: 'cart' }],
    hint: 'Pedestrians have right of way — any bump resets the level.'
  },
  {
    id: 8, name: 'Amalfi Coast', theme: 'amalfi', par: 32, timeLimit: 62, maxSpeed: 270,
    start: { x: 640, y: 620, angle: -90 },
    bay: { x: 640, y: 220, w: 100, h: 165 },
    ghostBays: [{ x: 520, y: 220, w: 100, h: 165 }, { x: 760, y: 220, w: 100, h: 165 }],
    walls: [
      { x: 520, y: 215, w: 88, h: 150 }, { x: 760, y: 215, w: 88, h: 150 },
      { x: 300, y: 440, w: 200, h: 76 }, { x: 980, y: 440, w: 200, h: 76 },
      { x: 640, y: 450, w: 150, h: 60 }
    ],
    cones: [{ x: 430, y: 590 }, { x: 850, y: 590 }],
    traffic: [{ path: [{ x: 300, y: 340 }, { x: 980, y: 340 }], speed: 75, kind: 'cart' }],
    hint: 'A hand-width of clearance each side — and a cart crossing your line.'
  },
  {
    id: 9, name: 'Moscow Winter', theme: 'moscow', par: 36, timeLimit: 62, maxSpeed: 275,
    start: { x: 160, y: 200, angle: 0 },
    bay: { x: 1090, y: 560, w: 108, h: 172 },
    reverseZones: [{ x: 1020, y: 520, w: 520, h: 400 }],
    iceZones: [{ x: 560, y: 300, w: 460, h: 420 }],
    walls: [
      { x: 900, y: 560, w: 96, h: 160 }, { x: 1245, y: 560, w: 60, h: 160 },
      { x: 560, y: 180, w: 300, h: 64 }
    ],
    peds: [{ path: [{ x: 760, y: 640 }, { x: 1180, y: 640 }], speed: 75 }],
    cones: [{ x: 460, y: 560 }],
    hint: 'Ice into a reverse-only pocket. Line up early.'
  },
  {
    id: 10, name: 'Indian Bazaar', theme: 'indian-bazaar', par: 40, timeLimit: 57, maxSpeed: 280,
    start: { x: 130, y: 640, angle: 0 },
    bay: { x: 858, y: 190, w: 96, h: 160 },
    ghostBays: [
      { x: 428, y: 190, w: 96, h: 160 }, { x: 535, y: 190, w: 96, h: 160 },
      { x: 642, y: 190, w: 96, h: 160 }, { x: 749, y: 190, w: 96, h: 160 },
      { x: 965, y: 190, w: 96, h: 160 }, { x: 1072, y: 190, w: 96, h: 160 }
    ],
    walls: [
      { x: 428, y: 185, w: 84, h: 148 }, { x: 642, y: 185, w: 84, h: 148 },
      { x: 965, y: 185, w: 84, h: 148 }, { x: 1072, y: 185, w: 84, h: 148 },
      { x: 350, y: 440, w: 220, h: 70 }, { x: 1120, y: 470, w: 180, h: 70 }
    ],
    peds: [
      { path: [{ x: 470, y: 150 }, { x: 470, y: 640 }], speed: 95 },
      { path: [{ x: 1010, y: 640 }, { x: 1010, y: 150 }], speed: 105 },
      { path: [{ x: 250, y: 380 }, { x: 1180, y: 380 }], speed: 120 }
    ],
    iceZones: [{ x: 700, y: 560, w: 360, h: 240 }],
    cones: [{ x: 640, y: 500 }, { x: 900, y: 620 }],
    hint: 'Market rush. Three pedestrians and a spilled-oil slick.'
  },
  {
    id: 11, name: 'San Francisco', theme: 'san-francisco', par: 36, timeLimit: 56, maxSpeed: 280,
    start: { x: 150, y: 620, angle: 0 },
    bay: { x: 760, y: 560, w: 176, h: 92 },
    walls: [{ x: 545, y: 560, w: 180, h: 88 }, { x: 985, y: 560, w: 180, h: 88 }],
    cones: [{ x: 450, y: 420 }, { x: 1050, y: 420 }],
    traffic: [{ path: [{ x: 280, y: 240 }, { x: 1160, y: 240 }], speed: 130 }],
    hint: 'NEW: moving traffic. That car will not stop for you.'
  },
  {
    id: 12, name: 'Venice', theme: 'venice', par: 37, timeLimit: 54, maxSpeed: 282,
    start: { x: 160, y: 400, angle: 0 },
    bay: { x: 1080, y: 240, w: 110, h: 170 },
    walls: [{ x: 620, y: 240, w: 220, h: 80 }, { x: 860, y: 470, w: 90, h: 200 }],
    reverseZones: [{ x: 1060, y: 300, w: 440, h: 360 }],
    peds: [{ path: [{ x: 720, y: 150 }, { x: 720, y: 640 }], speed: 85 }],
    traffic: [{ path: [{ x: 500, y: 620 }, { x: 1000, y: 620 }], speed: 70, kind: 'cart' }],
    cones: [{ x: 480, y: 560 }],
    hint: 'Reverse into the canal-side bay. Mind the tourists and the gondolier cart.'
  },
  {
    id: 13, name: 'Berlin', theme: 'berlin', par: 38, timeLimit: 53, maxSpeed: 284,
    start: { x: 150, y: 200, angle: 0 },
    bay: { x: 1100, y: 540, w: 104, h: 165 },
    walls: [{ x: 500, y: 200, w: 240, h: 70 }, { x: 900, y: 620, w: 240, h: 70 }],
    iceZones: [{ x: 700, y: 450, w: 500, h: 300 }],
    cones: [{ x: 420, y: 420 }, { x: 560, y: 560 }, { x: 700, y: 250 }, { x: 840, y: 380 }],
    traffic: [{ path: [{ x: 1180, y: 180 }, { x: 1180, y: 640 }], speed: 110 }],
    hint: 'Oil slick outside the depot, patrol van on the far lane.'
  },
  {
    id: 14, name: 'Chinatown', theme: 'china-town', par: 39, timeLimit: 52, maxSpeed: 286,
    start: { x: 130, y: 620, angle: 0 },
    bay: { x: 642, y: 190, w: 96, h: 158 },
    ghostBays: [
      { x: 428, y: 190, w: 96, h: 158 }, { x: 535, y: 190, w: 96, h: 158 },
      { x: 749, y: 190, w: 96, h: 158 }, { x: 856, y: 190, w: 96, h: 158 }
    ],
    walls: [
      { x: 428, y: 185, w: 84, h: 146 }, { x: 856, y: 185, w: 84, h: 146 },
      { x: 1080, y: 400, w: 160, h: 70 }
    ],
    peds: [
      { path: [{ x: 560, y: 150 }, { x: 560, y: 640 }], speed: 90 },
      { path: [{ x: 980, y: 640 }, { x: 980, y: 150 }], speed: 100 }
    ],
    cones: [{ x: 750, y: 480 }, { x: 500, y: 400 }],
    traffic: [{ path: [{ x: 1180, y: 150 }, { x: 1180, y: 640 }], speed: 80, kind: 'cart' }],
    hint: 'Lantern lane. Two walkers and a noodle cart between you and the bay.'
  },
  {
    id: 15, name: 'Cairo', theme: 'cairo', par: 40, timeLimit: 50, maxSpeed: 288,
    start: { x: 150, y: 400, angle: 0 },
    bay: { x: 1060, y: 560, w: 100, h: 160 },
    walls: [
      { x: 860, y: 560, w: 100, h: 160 }, { x: 1240, y: 560, w: 60, h: 160 },
      { x: 620, y: 200, w: 300, h: 70 }
    ],
    reverseZones: [{ x: 1040, y: 520, w: 480, h: 400 }],
    iceZones: [{ x: 620, y: 420, w: 340, h: 220 }],
    traffic: [{ path: [{ x: 380, y: 300 }, { x: 1160, y: 300 }], speed: 125 }],
    cones: [{ x: 500, y: 560 }],
    hint: 'Sand-slick approach, reverse-only pocket, and through-traffic.'
  },
  {
    id: 16, name: 'Rio Beachfront', theme: 'rio', par: 41, timeLimit: 49, maxSpeed: 290,
    start: { x: 640, y: 620, angle: -90 },
    bay: { x: 640, y: 170, w: 94, h: 155 },
    ghostBays: [{ x: 525, y: 170, w: 94, h: 155 }, { x: 755, y: 170, w: 94, h: 155 }],
    walls: [
      { x: 525, y: 165, w: 84, h: 145 }, { x: 755, y: 165, w: 84, h: 145 },
      { x: 320, y: 430, w: 190, h: 70 }, { x: 960, y: 430, w: 190, h: 70 }
    ],
    iceZones: [{ x: 640, y: 470, w: 380, h: 200 }],
    peds: [
      { path: [{ x: 420, y: 150 }, { x: 420, y: 640 }], speed: 95 },
      { path: [{ x: 880, y: 640 }, { x: 880, y: 150 }], speed: 100 }
    ],
    traffic: [{ path: [{ x: 400, y: 560 }, { x: 880, y: 560 }], speed: 85, kind: 'cart' }],
    hint: 'Sandy slick before a squeeze that fits with fingers to spare.'
  },
  {
    id: 17, name: 'Dubai Marina', theme: 'dubai', par: 42, timeLimit: 48, maxSpeed: 292,
    start: { x: 150, y: 200, angle: 0 },
    bay: { x: 1090, y: 560, w: 100, h: 158 },
    walls: [
      { x: 890, y: 560, w: 96, h: 155 }, { x: 1250, y: 560, w: 50, h: 155 },
      { x: 560, y: 620, w: 220, h: 70 }
    ],
    reverseZones: [{ x: 1030, y: 500, w: 500, h: 440 }],
    iceZones: [{ x: 560, y: 320, w: 420, h: 260 }],
    traffic: [{ path: [{ x: 520, y: 180 }, { x: 520, y: 540 }], speed: 150 }],
    cones: [{ x: 780, y: 250 }],
    hint: 'Fast valet traffic on the marina lane. Time your gap.'
  },
  {
    id: 18, name: 'Savanna Lodge', theme: 'savanna', par: 42, timeLimit: 47, maxSpeed: 294,
    start: { x: 150, y: 620, angle: 0 },
    bay: { x: 1080, y: 220, w: 100, h: 158 },
    walls: [{ x: 860, y: 220, w: 96, h: 150 }, { x: 620, y: 620, w: 220, h: 70 }],
    iceZones: [{ x: 520, y: 400, w: 420, h: 280 }],
    cones: [
      { x: 420, y: 500 }, { x: 560, y: 380 }, { x: 700, y: 500 },
      { x: 840, y: 380 }, { x: 980, y: 500 }, { x: 700, y: 250 }
    ],
    peds: [{ path: [{ x: 950, y: 640 }, { x: 950, y: 150 }], speed: 90 }],
    traffic: [{ path: [{ x: 300, y: 340 }, { x: 1000, y: 340 }], speed: 120 }],
    hint: 'Mud slick, a cone slalom, and a safari jeep on patrol.'
  },
  {
    id: 19, name: 'Las Vegas', theme: 'vegas', par: 43, timeLimit: 46, maxSpeed: 296,
    start: { x: 130, y: 620, angle: 0 },
    bay: { x: 749, y: 190, w: 94, h: 155 },
    ghostBays: [
      { x: 428, y: 190, w: 94, h: 155 }, { x: 535, y: 190, w: 94, h: 155 },
      { x: 642, y: 190, w: 94, h: 155 }, { x: 856, y: 190, w: 94, h: 155 },
      { x: 963, y: 190, w: 94, h: 155 }, { x: 1070, y: 190, w: 94, h: 155 }
    ],
    walls: [
      { x: 428, y: 185, w: 84, h: 144 }, { x: 642, y: 185, w: 84, h: 144 },
      { x: 963, y: 185, w: 84, h: 144 }, { x: 1070, y: 185, w: 84, h: 144 }
    ],
    iceZones: [{ x: 640, y: 540, w: 340, h: 200 }],
    peds: [{ path: [{ x: 540, y: 150 }, { x: 540, y: 640 }], speed: 105 }],
    traffic: [
      { path: [{ x: 280, y: 380 }, { x: 1170, y: 380 }], speed: 140 },
      { path: [{ x: 1180, y: 640 }, { x: 1180, y: 160 }], speed: 115 }
    ],
    hint: 'Night shift. Two cruisers working the strip between you and the bay.'
  },
  {
    id: 20, name: 'Istanbul', theme: 'istanbul', par: 44, timeLimit: 45, maxSpeed: 300,
    start: { x: 130, y: 620, angle: 0 },
    bay: { x: 858, y: 190, w: 90, h: 150 },
    ghostBays: [
      { x: 428, y: 190, w: 90, h: 150 }, { x: 535, y: 190, w: 90, h: 150 },
      { x: 642, y: 190, w: 90, h: 150 }, { x: 749, y: 190, w: 90, h: 150 },
      { x: 965, y: 190, w: 90, h: 150 }, { x: 1072, y: 190, w: 90, h: 150 }
    ],
    walls: [
      { x: 428, y: 185, w: 82, h: 140 }, { x: 642, y: 185, w: 82, h: 140 },
      { x: 965, y: 185, w: 82, h: 140 }, { x: 1072, y: 185, w: 82, h: 140 },
      { x: 380, y: 450, w: 200, h: 66 }
    ],
    iceZones: [{ x: 700, y: 560, w: 360, h: 220 }],
    reverseZones: [{ x: 850, y: 330, w: 420, h: 260 }],
    peds: [
      { path: [{ x: 470, y: 150 }, { x: 470, y: 640 }], speed: 100 },
      { path: [{ x: 1010, y: 640 }, { x: 1010, y: 150 }], speed: 110 },
      { path: [{ x: 260, y: 380 }, { x: 1180, y: 380 }], speed: 125 }
    ],
    traffic: [
      { path: [{ x: 250, y: 260 }, { x: 250, y: 640 }], speed: 120 },
      { path: [{ x: 1180, y: 620 }, { x: 640, y: 620 }], speed: 135 }
    ],
    cones: [{ x: 640, y: 470 }, { x: 900, y: 620 }],
    hint: 'Grand finale: bazaar crowds, two taxis, a slick, and a reverse-only bay. 45 seconds.'
  }
];
