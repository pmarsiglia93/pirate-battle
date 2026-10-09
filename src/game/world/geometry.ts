export const distance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): number => Math.hypot(a.x - b.x, a.y - b.y);
export const angleDelta = (from: number, to: number): number =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));
export function turnToward(from: number, to: number, max: number): number {
  const delta = angleDelta(from, to);
  return from + Math.max(-max, Math.min(max, delta));
}
export function segmentCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  r: number,
): number | null {
  const dx = bx - ax,
    dy = by - ay,
    fx = ax - cx,
    fy = ay - cy,
    a = dx * dx + dy * dy,
    c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 0;
  if (a === 0) return null;
  const b = 2 * (fx * dx + fy * dy),
    disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
