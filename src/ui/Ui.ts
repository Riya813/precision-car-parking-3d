import { LEVELS } from '../config/levels';
import { Save } from '../systems/SaveManager';
import { Sfx } from '../systems/AudioSynth';
import { LevelResult } from '../game/Game3D';

export interface UiHandlers {
  onStart(levelId: number, retries: number): void;
  onResume(): void;
  onQuit(): void; // back to level select (disposes game)
  onReset(): void;
}

const $ = (html: string) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};

export class Ui {
  private root = document.getElementById('ui')!;
  private hud!: HTMLElement;
  private timeEl!: HTMLElement;
  private pipsEl!: HTMLElement;
  private comboEl!: HTMLElement;
  private hintEl!: HTMLElement;
  private ringEl!: HTMLElement;
  private screens = new Map<string, HTMLElement>();
  private currentLevel = 1;
  private currentRetries = 0;

  constructor(private h: UiHandlers) {
    this.buildHud();
    this.buildScreens();
  }

  // ---------- HUD ----------

  private buildHud() {
    this.hud = $(`<div id="hud">
      <div class="top">
        <div class="left">
          <div class="card lvl">LEVEL<b id="lvlnum">01</b></div>
          <div class="card pips" id="tries" style="font-size:14px;font-weight:bold">TRY <b style="color:var(--gold)">1</b></div>
        </div>
        <div class="card obj">
          <div class="chip">P</div>
          <div class="task">PARK THE CAR IN<br><span>THE DESIGNATED AREA</span></div>
        </div>
        <div class="card timer" id="timer">🕐 00:00</div>
        <div class="card btn" id="b-cam" title="camera view">📷</div>
        <div class="card btn" id="b-pause">❚❚</div>
        <div class="card btn" id="b-reset">⟲</div>
        <div class="card btn" id="b-mute">${Sfx.muted ? '✕' : '♪'}</div>
      </div>
      <div id="combo"></div>
      <div id="hint"></div>
      <div id="ring" style="position:absolute;width:56px;height:56px;border-radius:50%;display:none"></div>
    </div>`);
    this.root.appendChild(this.hud);
    this.timeEl = this.hud.querySelector('#timer')!;
    this.pipsEl = this.hud.querySelector('#tries')!;
    this.comboEl = this.hud.querySelector('#combo')!;
    this.hintEl = this.hud.querySelector('#hint')!;
    this.ringEl = this.hud.querySelector('#ring')!;
    this.hud.querySelector('#b-cam')!.addEventListener('click', () => { Sfx.uiTick(); this.cameraRequested?.(); });
    this.hud.querySelector('#b-pause')!.addEventListener('click', () => { Sfx.uiSelect(); this.showPause(); });
    this.hud.querySelector('#b-reset')!.addEventListener('click', () => { Sfx.uiSelect(); this.h.onReset(); });
    this.hud.querySelector('#b-mute')!.addEventListener('click', e => {
      const m = Sfx.toggleMute();
      (e.currentTarget as HTMLElement).textContent = m ? '✕' : '♪';
    });
  }

  setLevel(id: number, retries: number, hint?: string, combo = 0) {
    this.currentLevel = id;
    this.currentRetries = retries;
    (this.hud.querySelector('#lvlnum') as HTMLElement).textContent = String(id).padStart(2, '0');
    this.pipsEl.innerHTML = `TRY <b style="color:var(--gold)">${retries + 1}</b>`;
    this.comboEl.textContent = combo > 1 ? `CLEAN STREAK ×${combo}` : '';
    this.hintEl.style.opacity = '1';
    this.hintEl.textContent = hint ?? '';
    this.hintEl.style.display = hint ? 'block' : 'none';
    setTimeout(() => { this.hintEl.style.opacity = '0'; }, 5500);
  }

  setTime(text: string, danger: boolean) {
    this.timeEl.textContent = `🕐 ${text}`;
    this.timeEl.classList.toggle('danger', danger);
  }

  popup(sx: number, sy: number, text: string, color: string, px: number) {
    const el = $(`<div class="pop" style="left:${sx}px;top:${sy}px;color:${color};font-size:${px}px">${text}</div>`);
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 1150);
  }

  parkProgress(sx: number, sy: number, p: number | null) {
    if (p === null) { this.ringEl.style.display = 'none'; return; }
    this.ringEl.style.display = 'block';
    this.ringEl.style.left = `${sx - 28}px`;
    this.ringEl.style.top = `${sy - 28}px`;
    this.ringEl.style.background =
      `conic-gradient(var(--gold) ${p * 360}deg, rgba(255,255,255,0.18) 0deg)`;
    this.ringEl.style.mask = 'radial-gradient(circle, transparent 55%, black 56%)';
    (this.ringEl.style as CSSStyleDeclaration & { webkitMask: string }).webkitMask =
      'radial-gradient(circle, transparent 55%, black 56%)';
  }

  // ---------- screens ----------

  private screen(id: string, inner: string): HTMLElement {
    const el = $(`<div class="screen" id="${id}">${inner}</div>`);
    this.root.appendChild(el);
    this.screens.set(id, el);
    return el;
  }

  private open(id: string | null) {
    this.screens.forEach((el, key) => el.classList.toggle('open', key === id));
    this.hud.style.display = id === null ? 'block' : (id === 'pause' || id === 'tut' ? 'block' : 'none');
  }

  private buildScreens() {
    // MENU
    const menu = this.screen('menu', `
      <h1>PRECISION<br><span class="gold">CAR PARKING 3D</span></h1>
      <p id="menustars"></p>
      <button class="bigbtn" id="m-play">PLAY</button>
      <p>Arrow keys drive · Space brakes · pause / reset / sound buttons in-game</p>`);
    menu.querySelector('#m-play')!.addEventListener('click', () => { Sfx.start(); this.showSelect(); });

    // LEVEL SELECT
    this.screen('select', `
      <h2>SELECT LEVEL</h2>
      <div id="grid"></div>
      <div class="row">
        <button class="bigbtn alt" id="s-back">← MENU</button>
        <button class="bigbtn alt" id="s-reset" style="font-size:16px">reset progress</button>
      </div>`);
    this.screens.get('select')!.querySelector('#s-back')!
      .addEventListener('click', () => this.showMenu());
    let armed = false;
    const resetBtn = this.screens.get('select')!.querySelector('#s-reset') as HTMLElement;
    resetBtn.addEventListener('click', () => {
      if (!armed) { armed = true; resetBtn.textContent = 'click again to confirm'; return; }
      Save.reset(); armed = false; resetBtn.textContent = 'reset progress';
      this.showSelect();
    });

    // TUTORIAL
    const tut = this.screen('tut', `
      <h2>HOW TO PARK</h2>
      <table id="tuttable">
        <tr><td>↑ / ↓</td><td>accelerate · brake into reverse</td></tr>
        <tr><td>← / →</td><td>steer (watch the blinkers)</td></tr>
        <tr><td>SPACE</td><td>footbrake — smooth, controlled stops</td></tr>
        <tr><td>BUTTONS</td><td>📷 camera view · ❚❚ pause · ⟲ reset · ♪ sound</td></tr>
        <tr><td>GOAL</td><td>drive up the street, stop fully in the green P bay</td></tr>
        <tr><td>CRASH</td><td>touching anything — even the boundary — resets the level</td></tr>
        <tr><td>SCORE</td><td>faster + closer to dead centre = more points</td></tr>
      </table>
      <p class="blink">click anywhere to start</p>`);
    tut.addEventListener('click', () => { this.open(null); Sfx.start(); this.tutorialDone?.(); });

    // PAUSE
    const pause = this.screen('pause', `
      <h2>PAUSED</h2>
      <button class="bigbtn" id="p-resume">RESUME</button>
      <button class="bigbtn alt" id="p-restart">RESTART LEVEL</button>
      <button class="bigbtn alt" id="p-levels">LEVEL SELECT</button>`);
    pause.querySelector('#p-resume')!.addEventListener('click', () => { this.open(null); this.h.onResume(); });
    pause.querySelector('#p-restart')!.addEventListener('click', () => { this.open(null); this.h.onReset(); });
    pause.querySelector('#p-levels')!.addEventListener('click', () => { this.h.onQuit(); this.showSelect(); });

    // LEVEL COMPLETE
    this.screen('complete', `
      <h2>PARKED!</h2>
      <p id="c-sub"></p>
      <div class="stars" id="c-stars"></div>
      <div class="breakdown" id="c-break"></div>
      <div class="score" id="c-score"></div>
      <p class="tag" id="c-best"></p>
      <div class="row">
        <button class="bigbtn alt" id="c-retry">RETRY</button>
        <button class="bigbtn" id="c-next">NEXT LEVEL →</button>
        <button class="bigbtn alt" id="c-levels">LEVELS</button>
      </div>`);

    // GAME OVER
    this.screen('over', `
      <h2 style="color:var(--bad)" id="o-title">WRECKED</h2>
      <p id="o-sub"></p>
      <button class="bigbtn" id="o-retry">TRY AGAIN</button>
      <button class="bigbtn alt" id="o-levels">LEVEL SELECT</button>
      <small class="note">the ⟲ button restarts instantly any time</small>`);
    this.screens.get('over')!.querySelector('#o-retry')!
      .addEventListener('click', () => this.h.onStart(this.currentLevel, this.currentRetries + 1));
    this.screens.get('over')!.querySelector('#o-levels')!
      .addEventListener('click', () => { this.h.onQuit(); this.showSelect(); });

    // VICTORY
    const vic = this.screen('victory', `
      <h1>CITY PARKING <span class="gold">LEGEND</span></h1>
      <p>All 10 bays conquered. Not a scratch too many.</p>
      <div class="stars" id="v-stars"></div>
      <button class="bigbtn" id="v-levels">LEVEL SELECT</button>
      <button class="bigbtn alt" id="v-menu">MAIN MENU</button>`);
    vic.querySelector('#v-levels')!.addEventListener('click', () => this.showSelect());
    vic.querySelector('#v-menu')!.addEventListener('click', () => this.showMenu());
  }

  private tutorialDone: (() => void) | null = null;

  showMenu() {
    (this.screens.get('menu')!.querySelector('#menustars') as HTMLElement).textContent =
      `★ ${Save.totalStars(LEVELS.length)} / ${LEVELS.length * 3}`;
    this.open('menu');
  }

  showSelect() {
    const grid = this.screens.get('select')!.querySelector('#grid')!;
    grid.innerHTML = '';
    for (const lvl of LEVELS) {
      const unlocked = lvl.id <= Save.unlocked;
      const rec = Save.record(lvl.id);
      const stars = '★'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars);
      const best = rec.bestTime === Infinity ? '' :
        `${rec.bestTime.toFixed(1)}s · ${rec.bestScore.toLocaleString()}`;
      const cell = $(`<div class="cell ${unlocked ? '' : 'locked'}">
        <div class="n">${unlocked ? lvl.id : '🔒'}</div>
        <div class="nm">${unlocked ? lvl.name : `finish level ${lvl.id - 1}`}</div>
        <div class="st">${unlocked ? stars : ''}</div>
        <div class="bt">${unlocked ? (best || 'not yet parked') : ''}</div>
      </div>`);
      if (unlocked) cell.addEventListener('click', () => { Sfx.uiSelect(); this.h.onStart(lvl.id, 0); });
      grid.appendChild(cell);
    }
    this.open('select');
  }

  showTutorial(done: () => void) {
    this.tutorialDone = done;
    this.open('tut');
  }

  showPause() { this.open('pause'); this.pauseRequested?.(); }
  pauseRequested: (() => void) | null = null;
  cameraRequested: (() => void) | null = null;

  showGame() { this.open(null); }

  showComplete(r: LevelResult) {
    const s = this.screens.get('complete')!;
    const lvl = LEVELS.find(l => l.id === r.levelId)!;
    const isLast = r.levelId === LEVELS.length;
    Sfx.levelComplete();
    (s.querySelector('#c-sub') as HTMLElement).textContent =
      `${lvl.name} · ${r.time.toFixed(1)}s (par ${lvl.par}s)`;
    const starsEl = s.querySelector('#c-stars') as HTMLElement;
    starsEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const on = i < r.stars;
      const el = $(`<span class="${on ? '' : 'off'}" style="opacity:0">★</span>`);
      starsEl.appendChild(el);
      setTimeout(() => {
        el.style.transition = 'opacity 0.25s, transform 0.25s';
        el.style.opacity = '1';
        if (on) Sfx.star(i);
      }, 350 + i * 260);
    }
    const b = r.breakdown;
    const rows: [string, number][] = [
      ['time bonus', b.timeBonus], ['precision', b.precisionBonus], ['alignment', b.alignBonus]];
    if (b.perfectBonus) rows.push(['inch perfect', b.perfectBonus]);
    if (b.damagePenalty) rows.push(['bodywork', -b.damagePenalty]);
    (s.querySelector('#c-break') as HTMLElement).innerHTML = rows
      .map(([l, v]) => `${l}<b class="${v < 0 ? 'neg' : ''}">${v >= 0 ? '+' : ''}${v.toLocaleString()}</b>`)
      .join('<br>') +
      (b.comboMult > 1 ? `<br>clean streak ×${r.combo} → score ×${b.comboMult.toFixed(1)}` : '');
    // score tick-up
    const scoreEl = s.querySelector('#c-score') as HTMLElement;
    const t0 = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / 900);
      scoreEl.textContent = Math.round(r.score * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    };
    tick();
    (s.querySelector('#c-best') as HTMLElement).textContent = r.improved ? 'NEW BEST!' : '';
    const next = s.querySelector('#c-next') as HTMLElement;
    next.textContent = isLast ? 'FINISH →' : 'NEXT LEVEL →';
    next.onclick = () => {
      if (isLast) this.showVictory();
      else this.h.onStart(r.levelId + 1, 0);
    };
    (s.querySelector('#c-retry') as HTMLElement).onclick = () => this.h.onStart(r.levelId, 0);
    (s.querySelector('#c-levels') as HTMLElement).onclick = () => { this.h.onQuit(); this.showSelect(); };
    this.open('complete');
  }

  showFail(title: string, subtitle: string) {
    const s = this.screens.get('over')!;
    (s.querySelector('#o-title') as HTMLElement).textContent = title;
    (s.querySelector('#o-sub') as HTMLElement).textContent = subtitle;
    this.open('over');
  }

  showVictory() {
    this.h.onQuit();
    Sfx.victory();
    (this.screens.get('victory')!.querySelector('#v-stars') as HTMLElement).textContent =
      `★ ${Save.totalStars(LEVELS.length)} / ${LEVELS.length * 3}`;
    this.open('victory');
  }
}
