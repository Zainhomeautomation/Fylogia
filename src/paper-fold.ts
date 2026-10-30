export type Point = { x: number; y: number };
export type Fold = { nx: number; ny: number; mid: number; radius: number };
export function crease(
  width: number,
  height: number,
  distance: number,
  vertical = 0,
  corner = 1,
): Fold {
  const progress = Math.max(0.00001, Math.min(0.99999, distance / 2));
  const dx = width * progress * 2;
  const dy =
    (corner ? 1 : -1) * height * 0.14 * Math.sin(Math.PI * progress) -
    vertical * height;
  const length = Math.hypot(dx, dy);
  const nx = dx / length,
    ny = dy / length;
  return {
    nx,
    ny,
    mid: nx * (width - dx / 2) + ny * (corner * height - dy / 2),
    radius: Math.max(0.005, width * 0.085 * Math.sin(Math.PI * progress)),
  };
}
export function clipBand(
  width: number,
  height: number,
  fold: Fold,
  low: number,
  high: number,
): Point[] {
  let points: Point[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  for (const [limit, sign] of [
    [low, 1],
    [high, -1],
  ]) {
    if (!Number.isFinite(limit)) continue;
    const input = points;
    points = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i],
        b = input[(i + 1) % input.length];
      const da = (fold.nx * a.x + fold.ny * a.y - fold.mid - limit) * sign;
      const db = (fold.nx * b.x + fold.ny * b.y - fold.mid - limit) * sign;
      if (da >= 0) points.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        points.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
      }
    }
  }
  return points;
}
// Tangent planes approximate a continuous cylindrical crease, rather than
// rotating the entire sheet. The two flat regions are joined by twelve bands.
export function foldPlane(
  fold: Fold,
  u: number,
  kind: "front" | "bend" | "back",
) {
  const { nx, ny, radius: r } = fold,
    a = (Math.PI * r) / 2;
  const angle = kind === "front" ? 0 : kind === "back" ? Math.PI : (u + a) / r;
  const v =
    kind === "front" ? u : kind === "back" ? -u : -a + r * Math.sin(angle);
  const z =
    kind === "front" ? 0 : kind === "back" ? 2 * r : r * (1 - Math.cos(angle));
  const c = Math.cos(angle),
    s = Math.sin(angle),
    offset = v - c * u - (c - 1) * fold.mid;
  return {
    xx: 1 + (c - 1) * nx * nx,
    xy: (c - 1) * nx * ny,
    yx: (c - 1) * nx * ny,
    yy: 1 + (c - 1) * ny * ny,
    tx: nx * offset,
    ty: ny * offset,
    zx: s * nx,
    zy: s * ny,
    tz: z - s * (fold.mid + u),
    angle,
  };
}
export function planeMatrix(
  plane: ReturnType<typeof foldPlane>,
  hinge: number,
  top: number,
  forward: boolean,
  width: number,
  height: number,
) {
  const sign = forward ? 1 : -1,
    depth = 2400,
    cx = width / 2,
    cy = height / 2;
  const d = 1 - plane.tz / depth;
  const a = (sign * plane.xx - (cx * plane.zx) / depth) / d,
    b = (plane.yx - (cy * plane.zx) / depth) / d;
  const c = (sign * plane.xy - (cx * plane.zy) / depth) / d,
    e = (hinge + sign * plane.tx - (cx * plane.tz) / depth) / d;
  const f = (top + plane.ty - (cy * plane.tz) / depth) / d,
    dy = (plane.yy - (cy * plane.zy) / depth) / d;
  return `matrix3d(${a},${b},0,${-plane.zx / depth / d},${c},${dy},0,${-plane.zy / depth / d},0,0,1,0,${e},${f},0,1)`;
}
