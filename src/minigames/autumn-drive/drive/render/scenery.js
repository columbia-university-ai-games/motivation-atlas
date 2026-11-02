// Adapted from Oscar O'Donnell's Autumn Drive: racing/src/render/scenery.ts.
import * as T from "../../vendor/three.js";
import { mergeGeometries } from "../../vendor/three.js";
import { noise, rng, clamp } from "../shared/math.js";
import { streamAt } from "../world/generator.js";
import { generateTrees } from "../world/props.js";
import { roadSections, roadVertexHeight } from "../world/network.js";
function forestDetail(distance, quality, previous = -2) {
  const limits = [quality === "high" ? 370 : quality === "medium" ? 270 : 0, quality === "low" ? 550 : 900, 1700];
  if (previous === -2) return limits.findIndex((limit) => distance < limit);
  let level = previous === -1 ? 3 : previous;
  while (level < 3 && distance >= limits[level] + 20) level++;
  while (level > 0 && distance < limits[level - 1] - 20) level--;
  return level === 3 ? -1 : level;
}
const palette = ["#b34c28", "#d77b31", "#c9a043", "#9c452e", "#728047", "#b6a05f"];
function asphaltTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d"), r = rng(551), data = ctx.createImageData(256, 256);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 61 + r() * 21;
    data.data[i] = v;
    data.data[i + 1] = v + 2;
    data.data[i + 2] = v + 2;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  const t = new T.CanvasTexture(canvas);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function ribbon(s, left, right, height, material, points = s.world.road, closed = true, edgeId) {
  const positions = [], uv = [], indices = [];
  for (let i = 0; i < (closed ? points.length + 1 : points.length); i++) {
    const p = points[i % points.length], prev = points[closed ? (i - 1 + points.length) % points.length : Math.max(0, i - 1)], next = points[closed ? (i + 1) % points.length : Math.min(points.length - 1, i + 1)], len = Math.hypot(next.x - prev.x, next.z - prev.z), nx = (next.z - prev.z) / len, nz = -(next.x - prev.x) / len;
    for (const offset of [left, right]) {
      positions.push(p.x + nx * offset, roadVertexHeight(s.world, edgeId, p, p.x + nx * offset, p.z + nz * offset) + height, p.z + nz * offset);
      uv.push(offset / 4, (i === points.length ? s.world.length : p.distance) / 4);
    }
    if (i < (closed ? points.length : points.length - 1)) indices.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  const m = new T.Mesh(g, material);
  m.receiveShadow = true;
  return m;
}
function leafTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d"), r = rng(533);
  for (let i = 0; i < 25; i++) {
    const x = 15 + r() * 98, y = 15 + r() * 98;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r() * 6.28);
    const shade = 175 + Math.floor(r() * 80);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.bezierCurveTo(12, -5, 9, 7, 0, 13);
    ctx.bezierCurveTo(-9, 7, -12, -5, 0, -12);
    ctx.fill();
    ctx.strokeStyle = "rgba(55,50,35,.28)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 11);
    ctx.stroke();
    ctx.restore();
  }
  const texture = new T.CanvasTexture(c);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}
function treeGeometry(species, detail) {
  const random = rng(910 + species * 103 + detail), positions = [], normals = [], uvs = [], colors = [], indices = [];
  const count = detail === 0 ? 190 : detail === 1 ? 46 : 3;
  for (let i = 0; i < count; i++) {
    const az = random() * Math.PI * 2, phi = Math.acos(2 * random() - 1), rr = Math.cbrt(random());
    let x = Math.cos(az) * Math.sin(phi) * rr * (species === 1 ? 2 : 3), z = Math.sin(az) * Math.sin(phi) * rr * (species === 1 ? 2 : 3), y = 5.8 + Math.cos(phi) * rr * (species === 1 ? 3.1 : 2.5);
    let size = detail === 0 ? 0.55 + random() * 0.75 : detail === 1 ? 1.05 + random() : 3.5;
    if (detail === 2) {
      x = 0;
      z = 0;
      y = 5.5;
      size = 3.6;
    }
    const a = detail === 2 ? i * Math.PI / 3 : random() * Math.PI * 2, tilt = detail === 2 ? 0 : (random() - 0.5) * 1.2;
    const right = new T.Vector3(Math.cos(a), 0, Math.sin(a)), up = new T.Vector3(-Math.sin(a) * Math.sin(tilt), Math.cos(tilt), Math.cos(a) * Math.sin(tilt));
    const n = new T.Vector3().crossVectors(right, up), base = positions.length / 3;
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      positions.push(x + right.x * u * size + up.x * v * size, y + up.y * v * size, z + right.z * u * size + up.z * v * size);
      normals.push(n.x, n.y, n.z);
      uvs.push((u + 1) / 2, (v + 1) / 2);
      const col = 0.76 + random() * 0.24;
      colors.push(col, col, col);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeBoundingSphere();
  return g;
}
function trunkGeometry(species, detail) {
  const trunk = new T.CylinderGeometry(0.095, 0.23, species === 1 ? 7 : 5.8, detail === 2 ? 4 : 7);
  trunk.translate(0, (species === 1 ? 7 : 5.8) / 2, 0);
  if (detail === 2) return trunk;
  const parts = [trunk];
  for (let i = 0; i < 6; i++) {
    const angle = i * 2.4, from = new T.Vector3(0, 2.7 + i * 0.46, 0), to = new T.Vector3(Math.cos(angle) * 1.8, 4.5 + i * 0.42, Math.sin(angle) * 1.8), delta = to.clone().sub(from);
    const g = new T.CylinderGeometry(0.024, 0.079, delta.length(), 5);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()));
    g.translate(...from.add(to).multiplyScalar(0.5).toArray());
    parts.push(g);
  }
  const result = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return result;
}
const waterVertex = `varying vec3 vWorld; varying vec3 vNormal; uniform float time;
void main(){vec3 p=position; p.y+=sin(p.x*.15+time*.6)*.045+cos(p.z*.13+time*.5)*.035;vWorld=(modelMatrix*vec4(p,1.)).xyz;vNormal=normalize(vec3(-cos(p.x*.15+time*.6)*.08,1.,sin(p.z*.13+time*.5)*.06));gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;
const waterFragment = `varying vec3 vWorld;varying vec3 vNormal;uniform vec3 sunDirection;uniform float time;
void main(){vec3 view=normalize(cameraPosition-vWorld);float fres=pow(1.-max(dot(view,vNormal),0.),3.);vec3 col=mix(vec3(.11,.25,.25),vec3(.57,.65,.61),fres*.85);float shine=pow(max(dot(reflect(-sunDirection,vNormal),view),0.),120.);col+=vec3(1.,.67,.32)*shine*1.7;float ripple=sin(vWorld.x*1.7+sin(vWorld.z*.8)+time)*sin(vWorld.z*1.9-time*.8);col+=ripple*.012;float fog=1.-exp(-length(cameraPosition-vWorld)*.00030);col=mix(col,vec3(.61,.66,.65),fog);gl_FragColor=vec4(col,.96);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
class Scenery {
  constructor(sampler, sunDirection) {
    this.sampler = sampler;
    this.group.name = sampler.world.network ? "Blackpine" : "Amberwater";
    this.trees = generateTrees(sampler);
    this.waterMaterial = new T.ShaderMaterial({ uniforms: { time: { value: 0 }, sunDirection: { value: sunDirection } }, vertexShader: waterVertex, fragmentShader: waterFragment, transparent: true, side: T.DoubleSide });
    this.makeTerrain();
    this.makeRoad();
    this.makeWater();
    this.makeForest();
    this.makeMountains();
  }
  group = new T.Group();
  forest = [];
  forestUpdate = -Infinity;
  forestQuality;
  leafMaterials = [];
  waterMaterial;
  sharedGeometries = [];
  textures = [];
  trees;
  makeTerrain() {
    const material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    const size = 256, segments = 32, extent = this.sampler.world.extent;
    for (let x = -extent; x < extent; x += size) for (let z = -extent; z < extent; z += size) {
      const g = new T.PlaneGeometry(size, size, segments, segments);
      g.rotateX(-Math.PI / 2);
      g.translate(x + size / 2, 0, z + size / 2);
      const pos = g.attributes.position, colors = [];
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i), pz = pos.getZ(i), h = this.sampler.height(px, pz);
        pos.setY(i, h);
        const n = noise(px / 100, pz / 100, this.sampler.world.seed), fine = noise(px / 13, pz / 13, 17);
        const slope = Math.hypot(this.sampler.height(px + 3, pz) - h, this.sampler.height(px, pz + 3) - h) / 3;
        const color = new T.Color().setRGB(0.19 + n * 0.12 + fine * 0.035, 0.22 + n * 0.1 + fine * 0.025, 0.105 + n * 0.065);
        if (slope > 0.6) color.lerp(new T.Color("#7c8176"), clamp((slope - 0.6) * 1.6, 0, 0.85));
        if (this.sampler.world.network) {
          const strata = Math.sin(h * 0.19 + noise(px / 38, pz / 38, 23) * 2) * 0.065;
          const rock = new T.Color().setRGB(0.29 + strata + fine * 0.09, 0.31 + strata + fine * 0.075, 0.285 + strata + fine * 0.06);
          color.lerp(rock, clamp((slope - 0.22) * 1.8, 0, 0.94));
        }
        if (h < 11) color.lerp(new T.Color("#777b59"), 0.5);
        colors.push(color.r, color.g, color.b);
      }
      g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
      g.computeVertexNormals();
      g.computeBoundingSphere();
      const mesh = new T.Mesh(g, material);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }
  makeRoad() {
    if (this.sampler.world.network) {
      this.makeNetworkRoad();
      return;
    }
    const texture = asphaltTexture();
    this.textures.push(texture);
    const roadMat = new T.MeshStandardMaterial({ map: texture, color: "#a5aca7", roughness: 0.97, side: T.DoubleSide });
    const gravel = new T.MeshStandardMaterial({ color: "#817c66", roughness: 1, side: T.DoubleSide });
    this.group.add(ribbon(this.sampler, -6, 6, 0.013, gravel), ribbon(this.sampler, -3.7, 3.7, 0.025, roadMat));
    const white = new T.MeshStandardMaterial({ color: "#dfd5b5", roughness: 0.9, side: T.DoubleSide });
    this.group.add(ribbon(this.sampler, 3.35, 3.46, 0.036, white), ribbon(this.sampler, -3.46, -3.35, 0.036, white));
    const count = Math.floor(this.sampler.world.length / 14), lines = new T.InstancedMesh(new T.BoxGeometry(0.11, 6e-3, 5), new T.MeshStandardMaterial({ color: "#ead2a1", roughness: 1 }), count);
    const temp = new T.Object3D();
    for (let i = 0; i < count; i++) {
      const p = this.sampler.pointAtDistance(i * 14);
      temp.position.set(p.x, p.y + 0.041, p.z);
      temp.rotation.set(0, Math.atan2(p.tx, p.tz), 0);
      temp.updateMatrix();
      lines.setMatrixAt(i, temp.matrix);
    }
    lines.receiveShadow = true;
    this.group.add(lines);
    const timber = new T.MeshStandardMaterial({ color: "#655849", roughness: 0.89 }), steel = new T.MeshStandardMaterial({ color: "#667272", metalness: 0.55, roughness: 0.47 });
    const stone = new T.MeshStandardMaterial({ color: "#8f8b77", roughness: 1 });
    const points = this.sampler.world.road;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!p.bridge) continue;
      const q = points[(i + 1) % points.length], len = Math.hypot(q.x - p.x, q.z - p.z), nx = (q.z - p.z) / len, nz = -(q.x - p.x) / len, angle = Math.atan2(q.x - p.x, q.z - p.z), pitch = -Math.atan2(q.y - p.y, len), span = Math.hypot(len, q.y - p.y);
      const deck = new T.Mesh(new T.BoxGeometry(9, 0.55, span + 0.2), stone);
      deck.position.set((p.x + q.x) / 2, (p.y + q.y) / 2 - 0.29, (p.z + q.z) / 2);
      deck.rotation.set(pitch, angle, 0, "YXZ");
      deck.receiveShadow = true;
      this.group.add(deck);
      for (const side of [-1, 1]) {
        const rail = new T.Mesh(new T.BoxGeometry(0.14, 0.13, span + 0.25), steel);
        rail.position.set((p.x + q.x) / 2 + nx * side * 4.45, (p.y + q.y) / 2 + 0.76, (p.z + q.z) / 2 + nz * side * 4.45);
        rail.rotation.set(pitch, angle, 0, "YXZ");
        rail.castShadow = true;
        this.group.add(rail);
        if (i % 3 === 0) {
          const post = new T.Mesh(new T.BoxGeometry(0.18, 0.8, 0.18), timber);
          post.position.set(p.x + nx * side * 4.45, p.y + 0.4, p.z + nz * side * 4.45);
          post.castShadow = true;
          this.group.add(post);
        }
      }
      if (i % 6 === 0) {
        const h = Math.max(1, p.y - this.sampler.height(p.x, p.z));
        const pier = new T.Mesh(new T.BoxGeometry(7, h, 1), stone);
        pier.position.set(p.x, p.y - h / 2 - 0.1, p.z);
        pier.rotation.y = angle;
        this.group.add(pier);
      }
    }
    const posts = new T.InstancedMesh(new T.BoxGeometry(0.09, 0.8, 0.12), white, count);
    for (let i = 0; i < count; i++) {
      const p = this.sampler.pointAtDistance(i * 14);
      temp.position.set(p.x + p.tz * 5.5, p.y + 0.4, p.z - p.tx * 5.5);
      temp.rotation.y = Math.atan2(p.tx, p.tz);
      temp.updateMatrix();
      posts.setMatrixAt(i, temp.matrix);
    }
    this.group.add(posts);
  }
  makeNetworkRoad() {
    const texture = asphaltTexture();
    this.textures.push(texture);
    const asphalt = new T.MeshStandardMaterial({ map: texture, color: "#abb0ae", roughness: 0.97, side: T.DoubleSide });
    const gravel = new T.MeshStandardMaterial({ color: "#8b7e66", roughness: 1, side: T.DoubleSide });
    const white = new T.MeshStandardMaterial({ color: "#e5dfc8", roughness: 0.9, side: T.DoubleSide });
    const center = new T.MeshStandardMaterial({ color: "#dbbd71", roughness: 0.95, side: T.DoubleSide });
    for (const section of roadSections(this.sampler.world)) {
      const { points, halfWidth: w } = section;
      this.group.add(ribbon(this.sampler, -w - 2.2, w + 2.2, 0.013, gravel, points, false, section.edgeId), ribbon(this.sampler, -w, w, 0.025, asphalt, points, false, section.edgeId));
      for (const side of [-1, 1]) this.group.add(ribbon(this.sampler, side * (w - 0.33), side * (w - 0.22), 0.036, white, points, false, section.edgeId));
      if (w >= 3.5) this.group.add(ribbon(this.sampler, -0.07, 0.07, 0.038, center, points, false, section.edgeId));
    }
    const barriers = this.sampler.world.network.barriers, steel = new T.MeshStandardMaterial({ color: "#a1aaa6", metalness: 0.55, roughness: 0.48 });
    const stone = new T.MeshStandardMaterial({ color: "#797d75", roughness: 1 });
    const rail = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), steel, barriers.length), posts = new T.InstancedMesh(new T.BoxGeometry(0.15, 1.08, 0.15), steel, barriers.length);
    const walls = [], temp = new T.Object3D();
    barriers.forEach((b, i) => {
      temp.position.set(b.center.x, b.center.y + 0.12, b.center.z);
      temp.scale.set(0.19, 0.3, b.halfExtents.z * 2);
      temp.quaternion.set(b.rotation?.x ?? 0, b.rotation?.y ?? 0, b.rotation?.z ?? 0, b.rotation?.w ?? 1);
      temp.updateMatrix();
      rail.setMatrixAt(i, temp.matrix);
      temp.scale.set(1, 1, 1);
      temp.position.y = b.center.y;
      temp.updateMatrix();
      posts.setMatrixAt(i, temp.matrix);
      const ground = this.sampler.height(b.center.x, b.center.z);
      if (b.center.y - ground > 1.1) walls.push({ position: new T.Vector3(b.center.x, b.center.y - 1.8, b.center.z), scale: new T.Vector3(0.65, 2.4, b.halfExtents.z * 2), rotation: temp.quaternion.clone() });
    });
    rail.castShadow = true;
    rail.receiveShadow = true;
    posts.castShadow = true;
    this.group.add(rail, posts);
    const retaining = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), stone, walls.length);
    walls.forEach((w, i) => {
      temp.position.copy(w.position);
      temp.scale.copy(w.scale);
      temp.quaternion.copy(w.rotation);
      temp.updateMatrix();
      retaining.setMatrixAt(i, temp.matrix);
    });
    retaining.receiveShadow = true;
    this.group.add(retaining);
    this.makePassSigns();
  }
  makePassSigns() {
    const network = this.sampler.world.network, metal = new T.MeshStandardMaterial({ color: "#798582", metalness: 0.5, roughness: 0.55 });
    const sign = (distance, title, subtitle) => {
      const p2 = this.sampler.pointAtDistance(distance), group = new T.Group(), canvas = document.createElement("canvas");
      canvas.width = 768;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#203832";
      ctx.fillRect(0, 0, 768, 256);
      ctx.strokeStyle = "#ebe3c7";
      ctx.lineWidth = 9;
      ctx.strokeRect(12, 12, 744, 232);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f1e8cf";
      ctx.font = "bold 61px sans-serif";
      ctx.fillText(title, 384, 110);
      ctx.font = "31px sans-serif";
      ctx.fillText(subtitle, 384, 175);
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      this.textures.push(texture);
      const panel = new T.Mesh(new T.PlaneGeometry(4.6, 1.53), new T.MeshStandardMaterial({ map: texture, roughness: 0.8, side: T.DoubleSide }));
      panel.position.y = 3.1;
      const pole = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 3, 8), metal);
      pole.position.y = 1.5;
      group.add(panel, pole);
      group.position.set(p2.x - p2.tz * 7.2, p2.y, p2.z + p2.tx * 7.2);
      group.rotation.y = Math.atan2(-p2.tx, -p2.tz);
      this.group.add(group);
    };
    sign(10, "BLACKPINE PASS", "MOUNTAIN PATROL DISTRICT");
    const short = network.edges.find((e) => e.id === "quarry-cut"), ridge = network.edges.find((e) => e.id === "ridge-link");
    sign(short.startProgress - 14, "QUARRY CUT", "NARROW ROAD \u2022 REJOINS PASS");
    sign(ridge.startProgress - 18, "RIDGE LINK", "ALTERNATE ROUTE \u2022 DELIVERY \u2192");
    const p = this.sampler.pointAtDistance(network.finishDistance), delivery = new T.Group();
    for (const side of [-1, 1]) {
      const post = new T.Mesh(new T.BoxGeometry(0.3, 4.8, 0.3), metal);
      post.position.set(side * 5, 2.4, 0);
      delivery.add(post);
    }
    const beam = new T.Mesh(new T.BoxGeometry(10.3, 0.45, 0.4), new T.MeshStandardMaterial({ color: "#d4c695", roughness: 0.7 }));
    beam.position.y = 4.6;
    delivery.add(beam);
    delivery.position.set(p.x, p.y, p.z);
    delivery.rotation.y = Math.atan2(p.tx, p.tz);
    this.group.add(delivery);
    sign(network.finishDistance - 15, "DELIVERY STATION", "BLACKPINE RIDGE \u2022 END OF RUN");
    const cabin = new T.Mesh(new T.BoxGeometry(6, 3.2, 4), new T.MeshStandardMaterial({ color: "#7a6550", roughness: 1 }));
    cabin.position.set(p.x + p.tz * 15, p.y + 1.6, p.z - p.tx * 15);
    cabin.castShadow = true;
    this.group.add(cabin);
    const roof = new T.Mesh(new T.BoxGeometry(7, 0.3, 5), metal);
    roof.position.copy(cabin.position);
    roof.position.y += 1.8;
    this.group.add(roof);
  }
  makeWater() {
    const { lake } = this.sampler.world, points = [lake.x, lake.level, lake.z], indices = [];
    for (let i = 0; i <= 128; i++) {
      const a = i / 128 * Math.PI * 2;
      points.push(lake.x + Math.cos(a) * lake.rx, lake.level, lake.z + Math.sin(a) * lake.rz);
      if (i < 128) indices.push(0, i + 1, i + 2);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(points, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    this.group.add(new T.Mesh(g, this.waterMaterial));
    if (this.sampler.world.network) return;
    for (const side of [-1, 1]) {
      const positions = [], ix = [];
      for (let i = 0; i <= 250; i++) {
        const x = side * (side > 0 ? 350 : 300) + side * i * 7, z = side > 0 ? -225 + 45 * Math.sin((x - 330) / 200) : 35 + 60 * Math.sin((x + 270) / 200), stream = streamAt(x, z);
        positions.push(x, stream.level, z - stream.width, x, stream.level, z + stream.width);
        if (i < 250) ix.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const river = new T.BufferGeometry();
      river.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
      river.setIndex(ix);
      river.computeVertexNormals();
      this.group.add(new T.Mesh(river, this.waterMaterial));
    }
  }
  makeForest() {
    const texture = leafTexture();
    this.textures.push(texture);
    const leaves = new T.MeshStandardMaterial({ map: texture, alphaTest: 0.48, side: T.DoubleSide, roughness: 0.94, vertexColors: true });
    leaves.onBeforeCompile = (shader) => {
      shader.uniforms.windTime = { value: 0 };
      leaves.userData.shader = shader;
      shader.vertexShader = "uniform float windTime;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
 transformed.x+=sin(windTime*.7+position.y*.7+instanceMatrix[3].x*.12)*.07*max(position.y-2.,0.)/5.;`);
    };
    this.leafMaterials.push(leaves);
    const bark = [new T.MeshStandardMaterial({ color: "#655647", roughness: 1 }), new T.MeshStandardMaterial({ color: "#b3af96", roughness: 1 }), new T.MeshStandardMaterial({ color: "#534d42", roughness: 1 })];
    const geometries = Array.from({ length: 3 }, (_, species) => Array.from({ length: 3 }, (_2, detail) => ({ leaf: treeGeometry(species, detail), trunk: trunkGeometry(species, detail) })));
    for (const rows of geometries) for (const g of rows) this.sharedGeometries.push(g.leaf, g.trunk);
    const cells = /* @__PURE__ */ new Map();
    for (const t of this.trees) {
      const key = `${Math.floor(t.x / 240)},${Math.floor(t.z / 240)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(t);
    }
    const transform = new T.Object3D();
    for (const [key, trees] of cells) {
      const [cx, cz] = key.split(",").map(Number), lod = [];
      for (let detail = 0; detail < 3; detail++) {
        const group = new T.Group();
        group.visible = false;
        for (let species = 0; species < 3; species++) {
          const filtered = trees.filter((t) => t.species === species);
          if (!filtered.length) continue;
          const leaf = new T.InstancedMesh(geometries[species][detail].leaf, leaves, filtered.length), trunk = new T.InstancedMesh(geometries[species][detail].trunk, bark[species], filtered.length);
          filtered.forEach((t, i) => {
            transform.position.set(t.x, t.y, t.z);
            transform.scale.setScalar(t.size);
            transform.rotation.y = t.rotation;
            transform.updateMatrix();
            leaf.setMatrixAt(i, transform.matrix);
            trunk.setMatrixAt(i, transform.matrix);
            leaf.setColorAt(i, new T.Color(species === 2 ? "#667456" : palette[t.color]));
          });
          leaf.castShadow = detail === 0;
          leaf.receiveShadow = true;
          trunk.castShadow = detail === 0;
          group.add(leaf, trunk);
        }
        this.group.add(group);
        lod.push(group);
      }
      this.forest.push({ x: (cx + 0.5) * 240, z: (cz + 0.5) * 240, lod, level: -2 });
    }
  }
  makeMountains() {
    for (let layer = 0; layer < 2; layer++) {
      const positions = [], indices = [], colors = [], segments = 256;
      for (let i = 0; i <= segments; i++) {
        const a = i / segments * Math.PI * 2, r = 2700 + layer * 1100, peak = (this.sampler.world.network ? 350 : 130) + layer * 100 + noise(Math.cos(a) * 6, Math.sin(a) * 6, this.sampler.world.seed + layer * 24) * 520 + (this.sampler.world.network ? noise(Math.cos(a) * 19, Math.sin(a) * 19, 31) * 180 : 0);
        const c = new T.Color(layer ? "#819699" : "#617b7c"), shade = 0.72 + noise(Math.cos(a) * 14, Math.sin(a) * 14, 75) * 0.35;
        colors.push(c.r * 0.75, c.g * 0.75, c.b * 0.75, c.r * shade, c.g * shade, c.b * shade);
        positions.push(Math.cos(a) * r, -40, Math.sin(a) * r, Math.cos(a) * r, peak, Math.sin(a) * r);
        if (i < segments) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      if (this.sampler.world.network) g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
      this.group.add(new T.Mesh(g, new T.MeshStandardMaterial({ color: this.sampler.world.network ? "#ffffff" : layer ? "#889a9d" : "#728788", vertexColors: !!this.sampler.world.network, roughness: 1, side: T.DoubleSide })));
    }
  }
  update(time, camera, quality) {
    this.waterMaterial.uniforms.time.value = time;
    for (const m of this.leafMaterials) if (m.userData.shader) m.userData.shader.uniforms.windTime.value = time;
    const changed = quality !== this.forestQuality;
    if (changed || time - this.forestUpdate >= 0.1) {
      this.forestQuality = quality;
      this.forestUpdate = time;
      for (const cell of this.forest) {
        const level = forestDetail(Math.hypot(cell.x - camera.x, cell.z - camera.z), quality, changed ? -2 : cell.level);
        if (level !== cell.level) {
          cell.level = level;
          cell.lod.forEach((g, i) => g.visible = i === level);
        }
      }
    }
  }
  dispose() {
    const geometries = new Set(this.sharedGeometries), materials = /* @__PURE__ */ new Set();
    this.group.traverse((o) => {
      if (o instanceof T.Mesh) {
        geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.group.clear();
  }
}
export {
  Scenery,
  forestDetail
};
