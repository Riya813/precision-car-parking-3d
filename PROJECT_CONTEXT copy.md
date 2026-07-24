# PROJECT_CONTEXT.md — Precision Car Parking 3D

> **Purpose:** this file records how this game was specified and evolved, request by
> request, so that any future enhancement (by an AI assistant or a developer) starts
> with full context instead of guessing. **Read this before changing gameplay rules,
> art direction, or controls.** Update it whenever a new requirement lands.

Owner: Rishabh Kumar Singh · built iteratively via prompts to Claude (July 2026).
Deployment plan: GitHub repo + GitHub Pages (`vite.config.ts` already uses `base: './'`).

---

## 1. Request history (chronological)

Each entry: what was asked → what was decided/built.

**R1 — Initial build.** Full playable browser game: TypeScript + Vite + Phaser 3,
scene flow Boot→Menu→LevelSelect→Game→Pause→GameOver→Victory, 10 levels with stars
(3★ beat par / 2★ complete / 1★ with retries), localStorage saves, procedural
art + Web Audio synth SFX, juice (tweens, shake, particles, combo popups),
tutorial on level 1, quick restart. Game: top-down "Precision Car Parking" —
arcade steering, damage meter (3 hits = fail), score = time + precision,
inch-perfect bonus, clean-park combo.

**R2 — Play in chat.** Produced a single-file HTML bundle (vite-plugin-singlefile)
so the game runs anywhere without a server. Kept as a build target:
`npx vite build --config vite.config.singlefile.ts` → `dist-single/index.html`.

**R3 — Graphics v2 + control simplification.** Wanted more realistic look and a
Mario-like scrolling world. Decisions: realistic asphalt/markings, gradient car
sprites; camera-follow approach street before each lot; **controls locked to
arrow keys + Space (footbrake)** with **separate on-screen pause / reset / sound
buttons** — no WASD, no keyboard shortcuts for meta actions. Asked for a Noddy
cartoon background → **declined (copyrighted IP)**, built an original toy-town
style instead.

**R4 — PUBG-style backgrounds.** Asked for PUBG map backgrounds → **declined the
actual maps (Krafton IP)**, built original battle-royale-style biomes
(grassland/desert/snow/jungle) instead.

**R5 — Match a reference screenshot.** Provided a mobile parking-game screenshot;
asked to match graphics exactly, "do not add extra things". Built: dark asphalt
lot, hedge/curb borders with hazard stripes, hatched yellow P bay with corner
dots, yellow player car + white/blue/black/red/silver traffic, floating dark
rounded HUD cards (LEVEL / objective banner with P chip / clock timer M:SS /
button cards). Deliberately did NOT add the reference's steering wheel, pedals,
gear slider, camera button (mobile touch controls = "extra things" at the time).

**R6 — Go 3D.** Provided two references: a 3D chase-camera parking game and a
low-poly island road. Approved a full engine port: **Phaser → Three.js**
(TypeScript + Vite kept). All game logic reused (levels, physics, scoring,
saves, audio are engine-agnostic). Result: low-poly flat-shaded world, chase
camera, sun with real shadows, fog, clouds, green painted "P" bay decals
(reference showed green bays), DOM-based HUD/screens replacing Phaser scenes.

**R7 — Cameras, cities, 20 levels.** Added: 📷 button cycling 4 camera views
(chase / high chase / top-down / hood); expanded to **20 levels, each themed as a
world city** (see table in README); difficulty ramp with a new obstacle type —
**moving traffic cars** (from level 11). City themes are original low-poly
interpretations, no branded landmarks.

**R8 — Current ruleset (latest).** Added: player headlight beams + brake-light
glow (Space); more moving obstacles incl. a new **pushcart** mover, reaching
down to level 5; **one-touch crash rules** — ANY contact (obstacle, pedestrian,
traffic, cart, or lot boundary) instantly resets the level (~0.8s), replacing
the 3-hit damage meter; HUD shows a TRY counter; stars reworked (3★ = beat par
first try, 2★ = ≤1.75× par within 2 resets, 1★ = finish); **360° camera orbit**
of the parked car before the results screen; background variety pass —
randomized colored houses per city palette, size/rotation jitter, filler props.

---

## 2. Standing constraints (do not violate without an explicit new request)

1. **Controls:** arrow keys + Space only on the keyboard. Pause/reset/sound/camera
   are on-screen buttons. Touch hooks exist in `Keyboard.ts` but no visible
   mobile controls were requested.
2. **No copyrighted IP** in art: no Noddy, PUBG maps, or branded landmarks.
   City themes must stay original interpretations.
3. **"No extra things":** the owner prefers exactly what was asked — don't add
   unrequested features/controls; suggest them in conversation instead.
4. **Zero external assets:** all meshes are code-built primitives, all audio is
   Web Audio synthesis. Keep it that way unless asked.
5. **Crash = reset** is the current core rule (R8). The old damage-meter code is
   gone; don't resurrect it silently.
6. **Saves must survive:** localStorage schema is versioned in
   `SaveManager.ts` (`precision-parking-save-v1`). Bump the key if the schema
   changes incompatibly.

## 3. Where things live

| Concern | File |
|---|---|
| Level data (all 20, incl. movers/zones/bays) | `src/config/levels.ts` |
| City themes: palettes, night, prop factories | `src/game/themes.ts` |
| Low-poly mesh builders (cars, trees, cart, bay decal) | `src/game/builders.ts` |
| Physics, collisions, parking, crash, cameras, orbit, FX | `src/game/Game3D.ts` |
| Input (arrows + Space, touch hooks) | `src/systems/Keyboard.ts` |
| SFX + engine hum (Web Audio) | `src/systems/AudioSynth.ts` |
| Saves (unlocks, stars, bests, mute) | `src/systems/SaveManager.ts` |
| OBB SAT / distance math (2D, runs on XZ plane) | `src/systems/Collision.ts` |
| HUD cards + all screens (DOM) | `src/ui/Ui.ts`, `src/style.css` |
| Flow wiring (level start/crash/complete) | `src/main.ts` |

Key tunables: car physics constants in `Game3D.drive()`; camera offsets in
`updateCamera()`; orbit length in `updateOrbit()` (`DUR`); park hold in
`PARK_HOLD`; crash reset delay in `crash()` (750ms); star thresholds in
`succeed()`.

## 4. Known open questions / candidate enhancements (discussed, not built)

- **Soft-touch threshold:** one-touch crash may be too punishing at crawl speeds;
  a "crash only above walking speed" rule was offered and is pending playtest.
- **Minimap** for judging bays in chase view (top-down camera partly covers this).
- **Mobile on-screen controls** (joystick) — architecture ready via
  `Keyboard.setTouchAxis/setTouchThrottle`, UI not built.
- Balance pass on levels 11–20 (traffic timing) after real playtesting.

## 5. How to keep this file useful

When a new enhancement is requested: append it as **R9, R10…** with
"asked → decided", update §2 if a constraint changes, and update §3 if files
move. Keep entries short — this is context, not a changelog of commits.
