/** Arrow keys + Space only, as requested; on-screen buttons handle the rest.
 *  setTouchAxis/setTouchThrottle are the hooks for a future mobile joystick. */
export class Keyboard {
  private down = new Set<string>();
  private touchSteer = 0;
  private touchThrottle = 0;
  private keydown = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
      this.down.add(e.key);
    }
  };
  private keyup = (e: KeyboardEvent) => this.down.delete(e.key);

  constructor() {
    addEventListener('keydown', this.keydown);
    addEventListener('keyup', this.keyup);
    addEventListener('blur', () => this.down.clear());
  }

  steerAxis(): number {
    if (this.touchSteer !== 0) return this.touchSteer;
    return (this.down.has('ArrowRight') ? 1 : 0) - (this.down.has('ArrowLeft') ? 1 : 0);
  }
  throttleAxis(): number {
    if (this.touchThrottle !== 0) return this.touchThrottle;
    return (this.down.has('ArrowUp') ? 1 : 0) - (this.down.has('ArrowDown') ? 1 : 0);
  }
  get brake() { return this.down.has(' '); }

  setTouchAxis(v: number) { this.touchSteer = Math.max(-1, Math.min(1, v)); }
  setTouchThrottle(v: number) { this.touchThrottle = Math.max(-1, Math.min(1, v)); }
}
