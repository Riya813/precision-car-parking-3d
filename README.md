# Precision Car Parking 3D

Low-poly 3D parking game: 20 levels, each set in a different city of the world. Drive up the street with a chase camera (or top-down, high, and hood views), then stop dead-centre in the green **P** bay without denting the bodywork. Score by speed and precision. Built with **TypeScript + Vite + Three.js**; every mesh is generated in code and every sound is Web Audio synthesis — zero external assets.

> **Enhancing this game?** Read [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) first — it holds the full request history, standing constraints, and a map of where everything lives.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # typecheck + production bundle in dist/
npm run preview   # serve the production build
```

GitHub Pages: `vite.config.ts` uses `base: './'`, so `dist/` works from any subpath.

## Controls

| Action | Input |
|---|---|
| Accelerate / reverse | `↑` / `↓` |
| Steer | `←` / `→` |
| Footbrake | `Space` |
| Camera view | 📷 button — chase / high / top-down / hood |
| Headlights & brake lights | automatic — beams at night, tails glow on `Space` |
| Pause · Reset · Sound | on-screen buttons, top-right (❚❚ · ⟲ · ♪) |

Keyboard is intentionally arrows + space only. Bindings live in `src/systems/Keyboard.ts`; `setTouchAxis` / `setTouchThrottle` are ready hooks for a mobile joystick.

## Levels

| # | City | New pressure | Par | Limit |
|---|---|---|---|---|
| 1 | English Village | wide bay, empty lot, tutorial | 16s | — |
| 2 | London | cone slalom, damage introduced | 20s | — |
| 3 | Paris | parallel park between two cars | 22s | — |
| 4 | Amsterdam | reverse-only zone | 24s | — |
| 5 | New York | multi-bay garage with decoys, timer starts | 26s | 72s |
| 6 | Alpine Village | ice patches | 28s | 67s |
| 7 | Tokyo (night) | moving pedestrians (2 damage) | 30s | 67s |
| 8 | Amalfi Coast | bay barely wider than the car | 32s | 62s |
| 9 | Moscow Winter | ice into a reverse-only pocket | 36s | 62s |
| 10 | Indian Bazaar | 3 pedestrians + oil slick garage | 40s | 57s |
| 11 | San Francisco | **moving traffic cars** (1 damage) | 36s | 56s |
| 12 | Venice | reverse bay + tourists | 37s | 54s |
| 13 | Berlin | oil slick + cone field + patrol van | 38s | 53s |
| 14 | Chinatown | decoy garage + 2 walkers | 39s | 52s |
| 15 | Cairo | sand slick + reverse pocket + traffic | 40s | 50s |
| 16 | Rio Beachfront | tight squeeze + slick + 2 walkers | 41s | 49s |
| 17 | Dubai Marina | fast valet traffic + reverse + slick | 42s | 48s |
| 18 | Savanna Lodge | mud + 6-cone slalom + jeep + walker | 42s | 47s |
| 19 | Las Vegas (night) | 2 traffic cars + decoys + slick | 43s | 46s |
| 20 | Istanbul | everything at once, 45 seconds | 44s | 45s |

## Rules & scoring

- **Crash = reset:** touching anything — obstacle, pedestrian, traffic, cart, or the lot boundary — instantly restarts the level (the TRY counter goes up). Time-out is the only fail screen.
- **Parking:** stop fully inside the bay (nose-in or reversed) and hold still 0.7s while the ring fills.
- **Score** = (time bonus + precision + alignment + inch-perfect) × first-try-streak multiplier (up to ×1.5).
- **Stars:** ★★★ beat par on the first try · ★★ under 1.75× par within 2 resets · ★ any completion.
- **Victory lap:** every successful park ends with a 360° camera orbit of your car before the results.
- **Saved to localStorage:** unlocks, stars, best score/time per level, mute preference.

## Architecture

```
src/
├── main.ts                 wires Ui ↔ Game3D, level flow
├── config/levels.ts        all 20 levels as data (2D coords, reused on the XZ plane)
├── systems/
│   ├── Keyboard.ts         arrows + space, touch-ready axes
│   ├── AudioSynth.ts       Web Audio SFX + engine hum (no files)
│   ├── SaveManager.ts      localStorage progress
│   └── Collision.ts        2D OBB SAT + distance tests (runs on the ground plane)
├── game/
│   ├── builders.ts         low-poly mesh factories: cars, buildings, trees, cones, peds, bay decals
│   ├── themes.ts           20 city themes: palettes, night lighting, landmark/prop factories
│   └── Game3D.ts           scene build, chase camera, ported car physics, collisions, parking, FX
└── ui/Ui.ts + style.css    DOM HUD cards, menu, level select, tutorial, pause, results, victory
```

The 3D port keeps the original 2D arcade physics: the car is simulated on the ground plane (forward/lateral velocity split, lateral damped by grip, so ice slides naturally), and level geometry from the 2D versions maps 1:1 with `y → z`. Rendering is low-poly flat-shaded Three.js with one shadow-casting sun that follows the car, a hemisphere sky, fog, drifting clouds, and themed streets per city — every prop (phone boxes, market stalls, neon signs, minarets, cable-car towers) is an original low-poly interpretation, with night lighting for Tokyo and Las Vegas and water/beach strips for the coastal cities.
