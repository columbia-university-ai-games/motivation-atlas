// Adapted from Oscar O'Donnell's Autumn Drive: racing/src/world/generator.ts.
import { clamp, lerp, noise, rng, smooth } from "../shared/math.js";
import { roadVertexHeight } from "./network.js";
const DEFAULT_SEED = 1842;
const N = 1536;
const GENERATOR_VERSION = 3;
const createRoadSample = () => ({ x: 0, y: 0, z: 0, distance: 0, index: 0, lateral: 0, bridge: false, tx: 0, tz: 1 });
function streamAt(x, z) {
  if (x > 330) return { distance: Math.abs(z - (-225 + 45 * Math.sin((x - 330) / 200))), level: 7 + Math.max(0, x - 430) * 0.012, width: 9 };
  if (x < -270) return { distance: Math.abs(z - (35 + 60 * Math.sin((x + 270) / 200))), level: 7 + Math.max(0, -x - 320) * 0.015, width: 7 };
  return { distance: Infinity, level: 7, width: 7 };
}
function generateWorld(seed = DEFAULT_SEED) {
  seed = Number.isFinite(seed) ? seed >>> 0 : DEFAULT_SEED;
  const random = rng(seed), phase = random() * Math.PI * 2, stretch = 0.96 + random() * 0.08;
  const road = [];
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, radius = 745 + 55 * Math.sin(3 * a + phase) + 55 * Math.sin(7 * a - phase) + 20 * Math.sin(11 * a + phase * 0.5);
    const x = Math.cos(a) * radius * stretch, z = Math.sin(a) * radius / stretch;
    const y = 53 + 28 * Math.sin(a + 0.45) + 11 * Math.sin(2 * a + phase) + 4 * Math.sin(4 * a + phase);
    const stream = streamAt(x, z);
    road.push({ x, y, z, distance: 0, bridge: stream.distance < 34 });
  }
  let total = 0;
  for (let i = 1; i <= N; i++) {
    const a = road[i - 1], b = road[i % N];
    total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    if (i < N) b.distance = total;
  }
  const world = { seed, generatorVersion: GENERATOR_VERSION, name: seed === DEFAULT_SEED ? "Amberwater Valley" : `Amberwater \xB7 ${seed}`, road, length: total, halfWidth: 3.7, extent: 2048, lake: { x: 40, z: -130, rx: 520, rz: 430, level: 7 } };
  const issues = validateWorld(world);
  if (issues.length && seed !== DEFAULT_SEED) return generateWorld(DEFAULT_SEED);
  if (issues.length) throw new Error(`Invalid default route: ${issues.join(", ")}`);
  return world;
}
function validateWorld(world) {
  const issues = [];
  if (world.network) {
    if (world.length < 2300 || world.length > 2600) issues.push("route length");
    for (const edge of world.network.edges) for (let i = 0; i < edge.points.length - 1; i++) {
      const a = edge.points[i], b = edge.points[i + 1], distance = Math.hypot(b.x - a.x, b.z - a.z);
      if (!Number.isFinite(a.y) || distance < 1e-6 || Math.abs(b.y - a.y) / distance > 0.120001) {
        issues.push(`${edge.id}: grade`);
        break;
      }
      const c = edge.points[i + 2];
      if (!c) continue;
      const next = Math.hypot(c.x - b.x, c.z - b.z), turn = Math.acos(clamp(((b.x - a.x) * (c.x - b.x) + (b.z - a.z) * (c.z - b.z)) / distance / next, -1, 1));
      if (turn / ((distance + next) / 2) > 1 / 22) {
        issues.push(`${edge.id}: curvature`);
        break;
      }
    }
    return issues;
  }
  if (world.length < 4e3 || world.length > 6e3) issues.push("route length");
  for (let i = 0; i < world.road.length; i++) {
    const a = world.road[i], b = world.road[(i + 1) % world.road.length], c = world.road[(i + 2) % world.road.length];
    const distance = Math.hypot(b.x - a.x, b.z - a.z);
    if (!Number.isFinite(a.y) || Math.abs(b.y - a.y) / distance > 0.105) {
      issues.push("grade");
      break;
    }
    const ux = (b.x - a.x) / distance, uz = (b.z - a.z) / distance, dl = Math.hypot(c.x - b.x, c.z - b.z);
    if (Math.acos(clamp(ux * (c.x - b.x) / dl + uz * (c.z - b.z) / dl, -1, 1)) / distance > 1 / 60) {
      issues.push("curvature");
      break;
    }
    if (a.bridge && a.y < streamAt(a.x, a.z).level + 3) {
      issues.push("bridge clearance");
      break;
    }
  }
  let last = -Infinity;
  for (const p of world.road) {
    const a = (Math.atan2(p.z, p.x) + Math.PI * 2) % (Math.PI * 2);
    if (a + 1e-9 < last) {
      issues.push("intersection");
      break;
    }
    last = a;
  }
  return issues;
}
class WorldSampler {
  constructor(world) {
    this.world = world;
    this.phase = rng(world.seed)() * Math.PI * 2;
    const radii = world.road.map((p) => Math.hypot(p.x, p.z));
    this.terrainMinRadius = Math.min(...radii) - 110;
    this.terrainMaxRadius = Math.max(...radii) + 110;
    if (world.network) for (const edge of world.network.edges) for (let index = 0; index < edge.points.length - 1; index++) {
      const a = edge.points[index], b = edge.points[index + 1], dx = b.x - a.x, dz = b.z - a.z, squaredLength = dx * dx + dz * dz;
      const segment = { edge, index, dx, dz, squaredLength, length: Math.sqrt(squaredLength) };
      this.networkSegments.push(segment);
      for (let x = Math.floor(Math.min(a.x, b.x) / this.networkCell); x <= Math.floor(Math.max(a.x, b.x) / this.networkCell); x++)
        for (let z = Math.floor(Math.min(a.z, b.z) / this.networkCell); z <= Math.floor(Math.max(a.z, b.z) / this.networkCell); z++) {
          const key = `${x},${z}`, list = this.segmentGrid.get(key) ?? [];
          list.push(segment);
          this.segmentGrid.set(key, list);
        }
    }
  }
  phase;
  terrainMinRadius;
  terrainMaxRadius;
  segmentGrid = /* @__PURE__ */ new Map();
  nearbySegments = /* @__PURE__ */ new Map();
  networkSegments = [];
  networkCell = 64;
  /** An optional caller-owned result avoids allocations in wheel contact queries. */
  roadAt(x, z, y, result = createRoadSample()) {
    if (this.world.network) return this.networkRoadAt(x, z, y, result);
    const road = this.world.road, n = road.length;
    const a = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2), guess = Math.round(a / (Math.PI * 2) * n);
    let best = Infinity;
    result.edgeId = void 0;
    result.progress = void 0;
    result.halfWidth = void 0;
    result.pavementDistance = void 0;
    for (let k = -72; k <= 72; k++) {
      const i = (guess + k + n) % n, p = road[i], q = road[(i + 1) % n], dx = q.x - p.x, dz = q.z - p.z, ls = dx * dx + dz * dz;
      const t = clamp(((x - p.x) * dx + (z - p.z) * dz) / ls, 0, 1), px = lerp(p.x, q.x, t), pz = lerp(p.z, q.z, t), d = (x - px) ** 2 + (z - pz) ** 2;
      if (d < best) {
        best = d;
        const len = Math.sqrt(ls);
        result.x = px;
        result.y = lerp(p.y, q.y, t);
        result.z = pz;
        result.distance = Math.sqrt(d);
        result.index = i;
        result.lateral = ((x - px) * dz - (z - pz) * dx) / len;
        result.bridge = p.bridge || q.bridge;
        result.tx = dx / len;
        result.tz = dz / len;
      }
    }
    return result;
  }
  networkRoadAt(x, z, y, result) {
    const cx = Math.floor(x / this.networkCell), cz = Math.floor(z / this.networkCell), key = `${cx},${cz}`;
    let candidates = this.nearbySegments.get(key);
    if (!candidates) {
      const unique = /* @__PURE__ */ new Set();
      for (let dx2 = -1; dx2 <= 1; dx2++) for (let dz2 = -1; dz2 <= 1; dz2++) for (const segment of this.segmentGrid.get(`${cx + dx2},${cz + dz2}`) ?? []) unique.add(segment);
      candidates = unique.size ? [...unique] : this.networkSegments;
      this.nearbySegments.set(key, candidates);
    }
    let best = Infinity, pavementDistance = Infinity, bestSegment, bestT = 0, bestX = 0, bestY = 0, bestZ = 0, bestHorizontal = 0;
    for (const segment of candidates) {
      const { edge: edge2, index: index2, dx: dx2, dz: dz2, squaredLength: ls } = segment, p2 = edge2.points[index2], q2 = edge2.points[index2 + 1];
      if (ls < 1e-10) continue;
      const t = clamp(((x - p2.x) * dx2 + (z - p2.z) * dz2) / ls, 0, 1), px = lerp(p2.x, q2.x, t), pz = lerp(p2.z, q2.z, t), py = lerp(p2.y, q2.y, t), horizontal = (x - px) ** 2 + (z - pz) ** 2;
      const score = horizontal + (y === void 0 ? 0 : (py - y) ** 2 * 4);
      if (y === void 0 || Math.abs(py - y) < 1) {
        const threshold = pavementDistance + edge2.halfWidth;
        if (threshold > 0 && horizontal < threshold * threshold) pavementDistance = Math.sqrt(horizontal) - edge2.halfWidth;
      }
      if (score < best) {
        best = score;
        bestSegment = segment;
        bestT = t;
        bestX = px;
        bestY = py;
        bestZ = pz;
        bestHorizontal = horizontal;
      }
    }
    const { edge, index, dx, dz, length: len } = bestSegment, p = edge.points[index], q = edge.points[index + 1], progress = lerp(edge.startProgress, edge.endProgress, lerp(p.distance, q.distance, bestT) / edge.length);
    let lo = 0, hi = this.world.road.length - 2;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (this.world.road[mid].distance <= progress) lo = mid;
      else hi = mid - 1;
    }
    result.x = bestX;
    result.y = bestY;
    result.z = bestZ;
    result.distance = Math.sqrt(bestHorizontal);
    result.index = lo;
    result.lateral = ((x - bestX) * dz - (z - bestZ) * dx) / len;
    result.bridge = p.bridge || q.bridge;
    result.tx = dx / len;
    result.tz = dz / len;
    result.edgeId = edge.id;
    result.progress = progress;
    result.halfWidth = edge.halfWidth;
    result.pavementDistance = pavementDistance;
    return result;
  }
  waterAt(x, z) {
    const l = this.world.lake, ellipse = ((x - l.x) / l.rx) ** 2 + ((z - l.z) / l.rz) ** 2;
    if (ellipse < 1) return l.level;
    if (this.world.network) return null;
    const s = streamAt(x, z);
    return s.distance < s.width ? s.level : null;
  }
  height(x, z) {
    if (this.world.network) {
      const seed2 = this.world.seed, nearRoad = x > -250 && x < 250 && z > -300 && z < 210, road = nearRoad ? this.roadAt(x, z) : null;
      const mountain = 240 * Math.exp(-(((x + 470) / 650) ** 2) - ((z - 200) / 780) ** 2) + 175 * Math.exp(-(((x - 540) / 470) ** 2) - ((z - 400) / 580) ** 2);
      let h2 = 16 + mountain + noise(x / 220, z / 220, seed2) * 55 + noise(x / 55, z / 55, seed2 + 12) * 13;
      const shelf = 42 + (z + 210) * 0.42 + Math.max(0, -x - 180) * 0.35;
      const shelfWeight = (1 - smooth((Math.abs(x) - 230) / 230)) * (1 - smooth((Math.abs(z + 70) - 190) / 230));
      h2 = lerp(h2, shelf + noise(x / 90, z / 90, seed2 + 12) * 8, shelfWeight);
      if (road && road.distance < 48) {
        const edge = this.world.network.edges.find((e) => e.id === road.edgeId);
        const distance = ((road.progress ?? edge.startProgress) - edge.startProgress) / (edge.endProgress - edge.startProgress) * edge.length;
        const bed = roadVertexHeight(this.world, road.edgeId, { x: road.x, y: road.y, z: road.z, distance, bridge: road.bridge }, x, z) - 0.13;
        h2 = lerp(bed, h2, smooth((road.distance - 18) / 30));
      }
      const l2 = this.world.lake, ellipse2 = Math.sqrt(((x - l2.x) / l2.rx) ** 2 + ((z - l2.z) / l2.rz) ** 2);
      if (ellipse2 < 1.16) h2 = lerp(l2.level - 4 + ellipse2 * 2, h2, smooth((ellipse2 - 0.94) / 0.22));
      return h2;
    }
    const { seed, lake: l } = this.world;
    const r = Math.hypot(x, z), ellipse = Math.sqrt(((x - l.x) / l.rx) ** 2 + ((z - l.z) / l.rz) ** 2);
    let h = 15 + noise(x / 430, z / 430, seed) * 37 + noise(x / 120, z / 120, seed + 31) * 12 + noise(x / 35, z / 35, seed + 12) * 2.5;
    const angle = Math.atan2(z, x), ridge = 16 + 18 * Math.sin(angle + 0.45) + 7 * Math.sin(2 * angle + this.phase);
    h += ridge * smooth((r - 520) / 140) * (1 - smooth((r - 1100) / 400));
    h += Math.max(0, r - 1e3) * 0.12 * (0.35 + noise(x / 520, z / 520, seed + 71));
    if (ellipse < 1.15) h = lerp(l.level - 5 + ellipse * 3, h, smooth((ellipse - 0.95) / 0.2));
    const stream = streamAt(x, z);
    if (stream.distance < 45) h = lerp(stream.level - 2, h, smooth((stream.distance - stream.width) / 30));
    if (r > this.terrainMinRadius && r < this.terrainMaxRadius) {
      const road = this.roadAt(x, z);
      if (road.distance < 110) {
        const bed = road.bridge ? Math.min(h, road.y - 1) : road.y - 0.13;
        h = lerp(bed, h, smooth((road.distance - 12) / 98));
      }
    }
    return h;
  }
  surfaceAt(x, z, y, road = this.roadAt(x, z, y)) {
    const width = road.halfWidth ?? this.world.halfWidth;
    const atRoadHeight = y === void 0 || Math.abs(road.y - y) < 1;
    if (this.world.network && road.pavementDistance !== void 0 && road.pavementDistance <= 0 || atRoadHeight && road.distance <= width) return "asphalt";
    if (atRoadHeight && road.distance < width + 2.5) return "gravel";
    if (this.world.network) {
      const h = this.height(x, z), slope = Math.hypot(this.height(x + 2, z) - h, this.height(x, z + 2) - h) / 2;
      if (slope > 0.5) return "rock";
    }
    return "grass";
  }
  pointAtDistance(distance) {
    const road = this.world.road, d = this.world.network ? clamp(distance, 0, this.world.length) : (distance % this.world.length + this.world.length) % this.world.length;
    let lo = 0, hi = road.length - (this.world.network ? 2 : 1);
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (road[mid].distance <= d) lo = mid;
      else hi = mid - 1;
    }
    const p = road[lo], q = road[(lo + 1) % road.length], span = (lo === road.length - 1 ? this.world.length : q.distance) - p.distance, t = (d - p.distance) / span;
    const dx = q.x - p.x, dz = q.z - p.z, len = Math.hypot(dx, dz);
    return { x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t), z: lerp(p.z, q.z, t), tx: dx / len, tz: dz / len, index: lo };
  }
}
export {
  DEFAULT_SEED,
  GENERATOR_VERSION,
  WorldSampler,
  createRoadSample,
  generateWorld,
  streamAt,
  validateWorld
};
