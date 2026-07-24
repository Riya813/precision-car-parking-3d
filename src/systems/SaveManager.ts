export interface LevelRecord {
  stars: number;      // 0–3
  bestScore: number;
  bestTime: number;   // seconds, Infinity if never completed
}

interface SaveData {
  unlocked: number;               // highest unlocked level id
  records: Record<number, LevelRecord>;
  muted: boolean;
}

const KEY = 'precision-parking-save-v1';

class SaveManagerImpl {
  private data: SaveData = { unlocked: 1, records: {}, muted: false };

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SaveData;
        // Infinity serialises to null in JSON — restore it.
        for (const k of Object.keys(parsed.records)) {
          const r = parsed.records[+k];
          if (r.bestTime === null || r.bestTime === undefined) r.bestTime = Infinity;
        }
        this.data = { ...this.data, ...parsed };
      }
    } catch { /* corrupt save → start fresh */ }
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data, (_k, v) => (v === Infinity ? null : v)));
    } catch { /* storage unavailable (private mode) — play sessionless */ }
  }

  get unlocked() { return this.data.unlocked; }
  get muted() { return this.data.muted; }
  set muted(m: boolean) { this.data.muted = m; this.persist(); }

  record(id: number): LevelRecord {
    return this.data.records[id] ?? { stars: 0, bestScore: 0, bestTime: Infinity };
  }

  /** Returns true if anything improved. */
  submit(id: number, stars: number, score: number, time: number, totalLevels: number): boolean {
    const r = this.record(id);
    const improved = stars > r.stars || score > r.bestScore || time < r.bestTime;
    this.data.records[id] = {
      stars: Math.max(r.stars, stars),
      bestScore: Math.max(r.bestScore, score),
      bestTime: Math.min(r.bestTime, time)
    };
    this.data.unlocked = Math.max(this.data.unlocked, Math.min(id + 1, totalLevels));
    this.persist();
    return improved;
  }

  totalStars(totalLevels: number): number {
    let s = 0;
    for (let i = 1; i <= totalLevels; i++) s += this.record(i).stars;
    return s;
  }

  reset() {
    this.data = { unlocked: 1, records: {}, muted: this.data.muted };
    this.persist();
  }
}

export const Save = new SaveManagerImpl();
