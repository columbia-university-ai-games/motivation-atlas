// Adapted from Oscar O'Donnell's Autumn Drive: racing/src/world/network.ts.
function roadSections(world) {
  return world.network ? world.network.edges.map((e) => ({ points: e.points, halfWidth: e.halfWidth, closed: false, edgeId: e.id })) : [{ points: world.road, halfWidth: world.halfWidth, closed: true, edgeId: "amberwater" }];
}
function roadVertexHeight(world, edgeId, point, x, _z) {
  if (!world.network || !edgeId) return point.y;
  const edge = world.network.edges.find((e) => e.id === edgeId);
  if (!edge) return point.y;
  const progress = edge.startProgress + (edge.endProgress - edge.startProgress) * point.distance / edge.length;
  const surface = world.network.junctionSurfaces?.find((s) => s.edgeIds.includes(edgeId) && progress >= s.startProgress - 1e-3 && progress <= s.endProgress + 1e-3);
  if (!surface) return point.y;
  return profileHeight(surface.profile, x);
}
function profileHeight(profile, x) {
  let lo = 0, hi = profile.length - 2;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (profile[mid].x <= x) lo = mid;
    else hi = mid - 1;
  }
  const a = profile[lo], b = profile[lo + 1], t = Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x)));
  return a.y + (b.y - a.y) * t;
}
export {
  profileHeight,
  roadSections,
  roadVertexHeight
};
