import './style.css';
import { Game3D } from './game/Game3D';
import { Ui } from './ui/Ui';
import { LEVELS } from './config/levels';

let game: Game3D | null = null;

const ui = new Ui({
  onStart: startLevel,
  onResume: () => game?.setPaused(false),
  onQuit: () => { game?.dispose(); game = null; },
  onReset: () => { if (game) startLevel(currentId, currentRetries + 1); }
});

let currentId = 1;
let currentRetries = 0;

function startLevel(levelId: number, retries: number) {
  game?.dispose();
  currentId = levelId;
  currentRetries = retries;
  const lvl = LEVELS.find(l => l.id === levelId)!;
  game = new Game3D(levelId, retries, {
    onTime: (t, danger) => ui.setTime(t, danger),
    onCrash: () => startLevel(levelId, currentRetries + 1),
    onPopup: (x, y, text, color, px) => ui.popup(x, y, text, color, px),
    onParkProgress: (x, y, p) => ui.parkProgress(x, y, p),
    onComplete: res => ui.showComplete(res),
    onFail: (title, sub) => ui.showFail(title, sub)
  });
  ui.setLevel(levelId, retries, retries === 0 ? lvl.hint : undefined, Game3D.combo);
  ui.showGame();
  if (levelId === 1 && retries === 0) {
    game.freeze();
    ui.showTutorial(() => game?.unfreeze());
  }
}

ui.pauseRequested = () => game?.setPaused(true);
const CAM_NAMES = ['CHASE CAM', 'HIGH CAM', 'TOP-DOWN', 'HOOD CAM'];
ui.cameraRequested = () => {
  if (!game) return;
  const mode = game.cycleCamera();
  ui.popup(innerWidth / 2, innerHeight * 0.22, CAM_NAMES[mode], 'var(--teal)', 26);
};
ui.showMenu();
