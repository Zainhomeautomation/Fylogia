import test from "node:test";
import assert from "node:assert/strict";
import {
  crease,
  bandMask,
  clipBand,
  foldPlane,
  planeMatrix,
  verticalPlaneMatrix,
} from "../src/paper-fold.ts";
test("paper crease preserves a stationary region and changes tangents across a curved fold", () => {
  for (const [w, h] of [
    [320, 600],
    [450, 450],
    [700, 900],
  ])
    for (const distance of [0.01, 0.25, 0.55, 0.9, 1.5, 1.99]) {
      const f = crease(w, h, distance, -0.04),
        a = (Math.PI * f.radius) / 2;
      assert.ok(f.radius > 0);
      assert.ok(Math.abs(Math.hypot(f.nx, f.ny) - 1) < 1e-9);
      const flat = foldPlane(f, -a, "front");
      assert.equal(flat.xx, 1);
      assert.equal(flat.yy, 1);
      assert.equal(flat.tx, 0);
      assert.equal(flat.ty, 0);
      const angles = [];
      for (let i = 0; i < 12; i++) {
        const low = -a + (2 * a * i) / 12,
          high = -a + (2 * a * (i + 1)) / 12,
          p = foldPlane(f, (low + high) / 2, "bend");
        angles.push(p.angle);
        assert.ok(p.angle > 0 && p.angle < Math.PI);
        for (const pt of clipBand(w, h, f, low, high)) {
          assert.ok(
            pt.x >= -1e-7 &&
              pt.x <= w + 1e-7 &&
              pt.y >= -1e-7 &&
              pt.y <= h + 1e-7,
          );
          const u = f.nx * pt.x + f.ny * pt.y - f.mid;
          assert.ok(u >= low - 1e-6 && u <= high + 1e-6);
        }
        for (const forward of [true, false])
          assert.doesNotMatch(
            planeMatrix(p, w, 0, forward, 2 * w, h),
            /NaN|Infinity/,
          );
      }
      assert.equal(new Set(angles).size, 12);
    }
});
test("forward and reverse geometry share the same fixed spine with opposite horizontal orientation", () => {
  const f = crease(400, 600, 0.8),
    front = foldPlane(f, 0, "front");
  const values = (forward) =>
    planeMatrix(front, 400, 20, forward, 800, 600)
      .match(/matrix\((.*)\)/)[1]
      .split(",")
      .map(Number);
  const a = values(true),
    b = values(false);
  assert.equal(a[4], 400);
  assert.equal(b[4], 400);
  assert.equal(a[0], 1);
  assert.equal(b[0], -1);
  assert.equal(a[5], 20);
  assert.equal(b[5], 20);
  const end = crease(400, 600, 1.99999, 0),
    back = foldPlane(end, (Math.PI * end.radius) / 2, "back");
  assert.ok(back.xx < -0.999);
  assert.ok(Math.abs(back.xy) < 0.001);
});

test("vertical paper uses a projected cylinder along the y axis without rotating its text", () => {
  const front = foldPlane(crease(700, 400, 0.1), 0, "front");
  for (const forward of [true, false]) {
    const m = verticalPlaneMatrix(front, 50, 20, forward, 400, 700)
      .slice(7, -1)
      .split(",")
      .map(Number);
    assert.equal(m[4], 20);
    assert.equal(m[5], 50);
    assert.equal(m[0], 1);
    assert.equal(m[3], forward ? 1 : -1);
  }
  const f = crease(700, 400, 0.8),
    a = (Math.PI * f.radius) / 2;
  const matrices = Array.from({ length: 12 }, (_, i) =>
    verticalPlaneMatrix(
      foldPlane(f, -a + ((i + 0.5) * 2 * a) / 12, "bend"),
      0,
      0,
      true,
      400,
      700,
    ),
  );
  assert.equal(new Set(matrices).size, 12);
  for (const m of matrices) assert.doesNotMatch(m, /NaN|Infinity/);
});
test("adjacent affine paper tangents meet without projective gaps", () => {
  for (const size of [320, 700, 1100]) {
    const f = crease(size, 700, 0.8, -0.04),
      a = (Math.PI * f.radius) / 2;
    for (let i = 0; i < 11; i++) {
      const u = -a + ((i + 1) * 2 * a) / 12;
      const point = { x: f.nx * (f.mid + u), y: f.ny * (f.mid + u) };
      const left = foldPlane(f, -a + ((i + 0.5) * 2 * a) / 12, "bend"),
        right = foldPlane(f, -a + ((i + 1.5) * 2 * a) / 12, "bend");
      const project = (p) => ({
        x: p.xx * point.x + p.xy * point.y + p.tx,
        y: p.yx * point.x + p.yy * point.y + p.ty,
      });
      const l = project(left),
        r = project(right);
      assert.ok(
        Math.hypot(l.x - r.x, l.y - r.y) < 0.25,
        "adjacent tangent seams stay subpixel",
      );
      assert.match(planeMatrix(left, 0, 0, true, size, 700), /^matrix\(/);
    }
  }
});

test("rectangular crease masks preserve page coordinates and the original band intersection", () => {
  const matrix = (s) => s.slice(7, -1).split(",").map(Number);
  const apply = (m, p) => ({
    x: m[0] * p.x + m[2] * p.y + m[4],
    y: m[1] * p.x + m[3] * p.y + m[5],
  });
  for (const vertical of [false, true])
    for (const distance of [0.01, 0.3, 0.8, 1.2, 1.9]) {
      const w = 420,
        h = 760,
        f = crease(vertical ? h : w, vertical ? w : h, distance, -0.04),
        a = (Math.PI * f.radius) / 2;
      for (let i = -1; i <= 12; i++) {
        const low = i < 0 ? -Infinity : i === 12 ? a : -a + (i * 2 * a) / 12;
        const high =
          i < 0 ? -a : i === 12 ? Infinity : -a + ((i + 1) * 2 * a) / 12;
        const mask = bandMask(w, h, f, low, high, vertical),
          outer = matrix(mask.transform),
          inner = matrix(mask.inverse);
        assert.doesNotMatch(mask.transform + mask.inverse, /NaN|Infinity/);
        for (const p of [
          { x: 0, y: 0 },
          { x: w, y: h },
          { x: w * 0.4, y: h * 0.7 },
        ]) {
          const restored = apply(outer, apply(inner, p));
          assert.ok(
            Math.hypot(p.x - restored.x, p.y - restored.y) < 1e-8,
            "inverse rotations retain printed text position",
          );
        }
        for (const original of clipBand(
          vertical ? h : w,
          vertical ? w : h,
          f,
          low,
          high,
        )) {
          const p = vertical ? { x: original.y, y: original.x } : original,
            local = apply(inner, p);
          assert.ok(mask.visible);
          assert.ok(
            local.x >= -1e-7 &&
              local.x <= mask.width + 1e-7 &&
              local.y >= -1e-7 &&
              local.y <= mask.height + 1e-7,
            "crease polygon lies inside equivalent rectangular mask",
          );
        }
      }
    }
});
