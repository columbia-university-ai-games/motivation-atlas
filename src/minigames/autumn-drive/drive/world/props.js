// Adapted from Oscar O'Donnell's Autumn Drive: racing/src/world/props.ts.
import { noise, rng } from "../shared/math.js";
function generateTrees(sampler) {
  const random = rng(sampler.world.seed + 739), trees = [];
  for (let i = 0; i < 18e3; i++) {
    const x = (random() - 0.5) * 3400, z = (random() - 0.5) * 3400, r = Math.hypot(x, z);
    if (r > 1800 || sampler.waterAt(x, z) !== null) continue;
    const road = sampler.roadAt(x, z);
    if (road.distance < 10 || road.distance > 130 && noise(x / 210, z / 210, sampler.world.seed + 53) < 0.35) continue;
    const y = sampler.height(x, z), slope = Math.hypot(sampler.height(x + 3, z) - y, sampler.height(x, z + 3) - y) / 3;
    if (slope > 0.8 || y < sampler.world.lake.level + 1) continue;
    if (!sampler.world.network && r < 690 && noise(x / 180, z / 180, 73) > 0.35) continue;
    if (sampler.world.network && road.distance > 650 && noise(x / 200, z / 200, 91) > 0.5) continue;
    trees.push({ x, y, z, size: 0.7 + random() * 0.8, species: random() < 0.12 ? 2 : Math.floor(random() * 2), color: Math.floor(random() * 6), rotation: random() * Math.PI * 2 });
  }
  if (sampler.world.network) for (let i = 0; i < 700; i++) {
    const p = sampler.pointAtDistance(random() * sampler.world.length), side = random() < 0.5 ? -1 : 1, offset = 12 + random() * 48;
    const x = p.x + p.tz * offset * side, z = p.z - p.tx * offset * side;
    if (sampler.roadAt(x, z).distance < 10 || sampler.waterAt(x, z) !== null) continue;
    const y = sampler.height(x, z), slope = Math.hypot(sampler.height(x + 3, z) - y, sampler.height(x, z + 3) - y) / 3;
    if (slope > 1.05 || y < sampler.world.lake.level + 1) continue;
    trees.push({ x, y, z, size: 0.8 + random() * 0.65, species: random() < 0.3 ? 2 : Math.floor(random() * 2), color: Math.floor(random() * 6), rotation: random() * Math.PI * 2 });
  }
  return trees;
}
export {
  generateTrees
};
