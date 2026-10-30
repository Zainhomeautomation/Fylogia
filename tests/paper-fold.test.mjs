import test from "node:test";
import assert from "node:assert/strict";
import { crease, clipBand, foldPlane, planeMatrix } from "../src/paper-fold.ts";
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
      .match(/matrix3d\((.*)\)/)[1]
      .split(",")
      .map(Number);
  const a = values(true),
    b = values(false);
  assert.equal(a[12], 400);
  assert.equal(b[12], 400);
  assert.equal(a[0], 1);
  assert.equal(b[0], -1);
  assert.equal(a[13], 20);
  assert.equal(b[13], 20);
  const end = crease(400, 600, 1.99999, 0),
    back = foldPlane(end, (Math.PI * end.radius) / 2, "back");
  assert.ok(back.xx < -0.999);
  assert.ok(Math.abs(back.xy) < 0.001);
});
