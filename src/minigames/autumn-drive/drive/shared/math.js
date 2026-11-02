// Adapted from Oscar O'Donnell's Autumn Drive: racing/src/shared/math.ts.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mul = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const length = (a) => Math.hypot(a.x, a.y, a.z);
const norm = (a) => mul(a, 1 / (length(a) || 1));
function rotate(v, q) {
  const t = mul(cross(q, v), 2);
  return add(v, add(mul(t, q.w), cross(q, t)));
}
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 1831565813;
    let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function noise(x, z, seed) {
  const hash = (a, b) => {
    let n = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ seed;
    n = Math.imul(n ^ n >>> 13, 1274126177);
    return ((n ^ n >>> 16) >>> 0) / 4294967295;
  };
  const ix = Math.floor(x), iz = Math.floor(z), u = smooth(x - ix), v = smooth(z - iz);
  return lerp(lerp(hash(ix, iz), hash(ix + 1, iz), u), lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), u), v);
}
export {
  add,
  clamp,
  cross,
  dot,
  length,
  lerp,
  mul,
  noise,
  norm,
  rng,
  rotate,
  smooth,
  sub
};
