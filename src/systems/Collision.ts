export interface OBB { x: number; y: number; w: number; h: number; angle: number } // angle radians
export type Vec = { x: number; y: number };

export function corners(o: OBB): Vec[] {
  const c = Math.cos(o.angle), s = Math.sin(o.angle);
  const hx = o.w / 2, hy = o.h / 2;
  return [
    { x: o.x + c * hx - s * hy, y: o.y + s * hx + c * hy },
    { x: o.x - c * hx - s * hy, y: o.y - s * hx + c * hy },
    { x: o.x - c * hx + s * hy, y: o.y - s * hx - c * hy },
    { x: o.x + c * hx + s * hy, y: o.y + s * hx - c * hy }
  ];
}

/** Separating Axis Theorem for two oriented boxes (4 candidate axes). */
export function obbOverlap(a: OBB, b: OBB): boolean {
  const ca = corners(a), cb = corners(b);
  const axes: Vec[] = [
    { x: Math.cos(a.angle), y: Math.sin(a.angle) },
    { x: -Math.sin(a.angle), y: Math.cos(a.angle) },
    { x: Math.cos(b.angle), y: Math.sin(b.angle) },
    { x: -Math.sin(b.angle), y: Math.cos(b.angle) }
  ];
  for (const ax of axes) {
    let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
    for (const p of ca) { const d = p.x * ax.x + p.y * ax.y; minA = Math.min(minA, d); maxA = Math.max(maxA, d); }
    for (const p of cb) { const d = p.x * ax.x + p.y * ax.y; minB = Math.min(minB, d); maxB = Math.max(maxB, d); }
    if (maxA < minB || maxB < minA) return false;
  }
  return true;
}

export function pointInOBB(p: Vec, o: OBB): boolean {
  const c = Math.cos(-o.angle), s = Math.sin(-o.angle);
  const dx = p.x - o.x, dy = p.y - o.y;
  const lx = c * dx - s * dy, ly = s * dx + c * dy;
  return Math.abs(lx) <= o.w / 2 && Math.abs(ly) <= o.h / 2;
}

/** True when every corner of `inner` lies inside `outer`. */
export function obbInside(inner: OBB, outer: OBB): boolean {
  return corners(inner).every(p => pointInOBB(p, outer));
}

export function circleOBBOverlap(cx: number, cy: number, r: number, o: OBB): boolean {
  const c = Math.cos(-o.angle), s = Math.sin(-o.angle);
  const dx = cx - o.x, dy = cy - o.y;
  const lx = c * dx - s * dy, ly = s * dx + c * dy;
  const qx = Math.max(0, Math.abs(lx) - o.w / 2);
  const qy = Math.max(0, Math.abs(ly) - o.h / 2);
  return qx * qx + qy * qy <= r * r;
}

/** Shortest distance from a point to the OBB (0 when inside). */
export function distToOBB(px: number, py: number, o: OBB): number {
  const c = Math.cos(-o.angle), s = Math.sin(-o.angle);
  const dx = px - o.x, dy = py - o.y;
  const lx = c * dx - s * dy, ly = s * dx + c * dy;
  const qx = Math.max(0, Math.abs(lx) - o.w / 2);
  const qy = Math.max(0, Math.abs(ly) - o.h / 2);
  return Math.hypot(qx, qy);
}
