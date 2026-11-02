// Adapted from Oscar O'Donnell's Autumn Drive: racing/src/physics/vehicle.ts.
import RAPIER from "../../vendor/rapier.js";
import { add, clamp, cross, dot, length, mul, norm, rotate, sub } from "../shared/math.js";
import { createRoadSample, WorldSampler } from "../world/generator.js";
import { generateTrees } from "../world/props.js";
import { roadVertexHeight } from "../world/network.js";
import { E30, engineTorque, STEP, SURFACE_GRIP } from "./config.js";
import { advanceSteering } from "./steering.js";
let initialized;
const initPhysics = () => initialized ??= RAPIER.init();
const EMPTY_INPUT = { throttle: 0, brake: 0, steering: 0, reverse: false };
function tireForces(slip, angle, load, mu, dt, radius, inertia, referenceSpeed) {
  const stiffness = load * 11;
  const effectiveSlip = slip / (1 + stiffness / referenceSpeed * dt * radius * radius / inertia);
  let longitudinal = stiffness * effectiveSlip;
  let lateral = -load * 7.5 * angle;
  const available = load * mu, demand = Math.hypot(longitudinal, lateral);
  if (demand > available && demand > 0) {
    const slipMagnitude = Math.hypot(effectiveSlip, angle * 2);
    const sliding = 1 - 0.12 * clamp((slipMagnitude - 0.16) / 0.8, 0, 1);
    const scale = available * sliding / demand;
    longitudinal *= scale;
    lateral *= scale;
  }
  return { longitudinal, lateral };
}
class VehicleSimulation {
  constructor(definition, config = E30, flat = false, shared) {
    this.config = config;
    this.flat = flat;
    this.shared = shared;
    this.sampler = shared?.sampler ?? new WorldSampler(definition);
    this.world = shared?.world ?? new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.roadColliders = shared?.roadColliders ?? /* @__PURE__ */ new Map();
    this.vehicleBodies = shared?.vehicleBodies ?? /* @__PURE__ */ new Set();
    this.world.timestep = STEP;
    this.world.numSolverIterations = 8;
    if (!shared) {
      if (flat) this.world.createCollider(RAPIER.ColliderDesc.cuboid(4e3, 0.1, 4e3).setTranslation(0, -0.1, 0));
      else this.buildColliders();
    }
    const c = config;
    this.body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCanSleep(false).setCcdEnabled(true).setAdditionalSolverIterations(4));
    this.vehicleBodies.add(this.body.handle);
    for (const { halfExtents: h, center: p } of c.colliders) this.world.createCollider(RAPIER.ColliderDesc.cuboid(h.x, h.y, h.z).setTranslation(p.x, p.y, p.z).setDensity(0).setFriction(0.45).setRestitution(0.08).setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(500), this.body);
    this.body.setAdditionalMassProperties(c.mass, { x: 0, y: c.comHeight, z: c.centerOfMassZ }, c.inertia, { x: 0, y: 0, z: 0, w: 1 }, true);
    this.mounts = [{ x: c.frontTrack / 2, y: c.wheelMountHeight, z: c.wheelbase / 2 + c.axleOffset }, { x: -c.frontTrack / 2, y: c.wheelMountHeight, z: c.wheelbase / 2 + c.axleOffset }, { x: c.rearTrack / 2, y: c.wheelMountHeight, z: -c.wheelbase / 2 + c.axleOffset }, { x: -c.rearTrack / 2, y: c.wheelMountHeight, z: -c.wheelbase / 2 + c.axleOffset }];
    this.wheels = this.mounts.map(() => ({ suspension: 0.25, rotation: 0, steer: 0, angularSpeed: 0, slip: 0, lateralSlip: 0, load: 0, grounded: false, driveTorque: 0 }));
    this.reset(flat ? 0 : definition.network ? definition.network.startDistance : definition.length * 0.83, false);
    if (!shared) this.world.step();
  }
  world;
  body;
  sampler;
  wheels;
  mounts;
  roadColliders;
  vehicleBodies;
  grip = [1.14, 1.14, 1.14, 1.14];
  offRoad = false;
  steer = 0;
  throttle = 0;
  brake = 0;
  gear = 1;
  rpm = 800;
  shiftTimer = 0;
  accumulator = 0;
  travelled = 0;
  resets = 0;
  roadIndex = 0;
  lastPosition = { x: 0, y: 0, z: 0 };
  resetCooldown = 1;
  contactRoad = createRoadSample();
  view;
  buildColliders() {
    const { world: d } = this.sampler;
    const sections = d.network ? d.network.edges.map((e) => ({ points: e.points, halfWidth: e.halfWidth, edgeId: e.id, closed: false })) : [{ points: d.road, halfWidth: 6, edgeId: void 0, closed: true }];
    for (const section of sections) {
      const road = section.points, verts = [], indices = [];
      for (let i = 0; i < road.length; i++) {
        const p = road[i], q = road[i + 1] ?? (section.closed ? road[0] : road[i - 1]), sign = i === road.length - 1 && !section.closed ? -1 : 1, len = Math.hypot(q.x - p.x, q.z - p.z), nx = (q.z - p.z) / len * sign, nz = -(q.x - p.x) / len * sign;
        for (const side of [-1, 1]) {
          const x = p.x + nx * side * (section.halfWidth + (d.network ? 0.5 : 0)), z = p.z + nz * side * (section.halfWidth + (d.network ? 0.5 : 0));
          verts.push(x, roadVertexHeight(d, section.edgeId, p, x, z), z);
        }
        const a = i * 2, b = (i + 1) % road.length * 2;
        if (i < road.length - 1 || section.closed) indices.push(a, b, a + 1, a + 1, b, b + 1);
        if (p.bridge && i % 3 === 0) for (const side of [-1, 1]) {
          const heading = Math.atan2(q.x - p.x, q.z - p.z);
          this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.16, 0.5, 5.2).setTranslation(p.x + nx * side * 4.5, p.y + 0.5, p.z + nz * side * 4.5).setRotation({ x: 0, y: Math.sin(heading / 2), z: 0, w: Math.cos(heading / 2) }));
        }
      }
      const collider = this.world.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array(verts), new Uint32Array(indices)).setFriction(0.9));
      this.roadColliders.set(collider.handle, { edgeId: section.edgeId, halfWidth: section.halfWidth });
    }
    for (const barrier of d.network?.barriers ?? []) {
      const h = barrier.halfExtents, p = barrier.center, desc = RAPIER.ColliderDesc.cuboid(h.x, h.y, h.z).setTranslation(p.x, p.y, p.z).setFriction(0.5);
      if (barrier.rotation) desc.setRotation(barrier.rotation);
      this.world.createCollider(desc);
    }
    const size = 256, n = 24, half = d.extent;
    for (let x = -half; x < half; x += size) for (let z = -half; z < half; z += size) {
      const heights = new Float32Array((n + 1) * (n + 1));
      for (let col = 0; col <= n; col++) for (let row = 0; row <= n; row++) heights[col * (n + 1) + row] = this.sampler.height(x + col / n * size, z + row / n * size);
      this.world.createCollider(RAPIER.ColliderDesc.heightfield(n, n, heights, { x: size, y: 1, z: size }).setTranslation(x + size / 2, 0, z + size / 2).setFriction(0.8));
    }
    for (const tree of generateTrees(this.sampler)) {
      this.world.createCollider(RAPIER.ColliderDesc.cylinder(2 * tree.size, 0.18 * tree.size).setTranslation(tree.x, tree.y + 2 * tree.size, tree.z).setFriction(0.5));
    }
  }
  reset(distance, count = true) {
    const road = this.sampler.world.road;
    const p = this.flat ? { x: 0, y: 0, z: 0, tx: 0, tz: 1, index: 0 } : this.sampler.pointAtDistance(distance ?? road[this.roadIndex].distance);
    const heading = Math.atan2(p.tx, p.tz);
    this.body.setTranslation({ x: p.x - (this.flat ? 0 : p.tz * 1.65), y: p.y + 0.09, z: p.z + (this.flat ? 0 : p.tx * 1.65) }, true);
    this.body.setRotation({ x: 0, y: Math.sin(heading / 2), z: 0, w: Math.cos(heading / 2) }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.resetForces(true);
    this.body.resetTorques(true);
    for (const w of this.wheels) {
      w.angularSpeed = 0;
      w.rotation = 0;
      w.suspension = 0.25;
      w.slip = 0;
      w.lateralSlip = 0;
      w.load = 0;
      w.driveTorque = 0;
    }
    this.accumulator = 0;
    this.throttle = 0;
    this.brake = 0;
    this.steer = 0;
    this.gear = 1;
    this.rpm = this.config.idleRpm;
    this.shiftTimer = 0;
    this.resetCooldown = 1;
    this.roadIndex = p.index;
    this.lastPosition = { ...this.body.translation() };
    if (count) this.resets++;
  }
  /** Future ropes apply force at attachment points without owning the vehicle state. */
  applyExternalForce(force, localPoint) {
    this.body.applyImpulseAtPoint(mul(force, STEP), add(this.body.translation(), rotate(localPoint, this.body.rotation())), true);
  }
  clearAccumulator() {
    this.accumulator = 0;
  }
  advance(frameSeconds, input) {
    this.accumulator += clamp(frameSeconds, 0, 0.1);
    while (this.accumulator + 1e-10 >= STEP) {
      this.step(input);
      this.accumulator -= STEP;
    }
    return this.state();
  }
  step(input) {
    this.prepareStep(input);
    this.world.step();
    this.afterStep(true);
  }
  /** Shared simulations call this for EVERY car before advancing Rapier once. */
  prepareStep(input, modifiers = {}) {
    const c = this.config, dt = STEP, pos = this.body.translation(), q = this.body.rotation(), velocity = this.body.linvel(), up = rotate({ x: 0, y: 1, z: 0 }, q), forward = rotate({ x: 0, y: 0, z: 1 }, q);
    const speed = dot(velocity, forward), absSpeed = Math.abs(speed);
    const clean = (v) => Number.isFinite(v) ? clamp(v, 0, 1) : 0;
    this.throttle += (clean(input.throttle) - this.throttle) * Math.min(1, dt * 5);
    this.brake += (clean(input.brake) - this.brake) * Math.min(1, dt * 12);
    const localVelocity = rotate(velocity, { x: -q.x, y: -q.y, z: -q.z, w: q.w });
    this.steer = advanceSteering(this.steer, input.steering, localVelocity, c, dt);
    if (absSpeed < 0.7 && input.reverse) this.gear = -1;
    if (absSpeed < 0.7 && !input.reverse && this.gear < 0) this.gear = 1;
    const rearOmega = (Math.abs(this.wheels[2].angularSpeed) + Math.abs(this.wheels[3].angularSpeed)) * 0.5;
    let ratio = (this.gear < 0 ? c.reverseRatio : c.gears[this.gear - 1]) * c.finalDrive;
    const clutchRpm = c.idleRpm + this.throttle * (c.launchRpm - c.idleRpm);
    this.rpm += (clamp(Math.max(clutchRpm, rearOmega * ratio * 60 / (2 * Math.PI)), c.idleRpm, c.redlineRpm + 100) - this.rpm) * Math.min(1, dt * 12);
    this.shiftTimer = Math.max(0, this.shiftTimer - dt);
    if (this.gear > 0 && this.shiftTimer === 0) {
      if (this.rpm > c.upshiftRpm && this.gear < c.gears.length) {
        this.gear++;
        this.shiftTimer = c.shiftDuration;
      } else if (this.rpm < c.downshiftRpm && this.gear > 1) {
        this.gear--;
        this.shiftTimer = c.shiftDuration;
      }
    }
    ratio = (this.gear < 0 ? c.reverseRatio : c.gears[this.gear - 1]) * c.finalDrive;
    const drive = engineTorque(this.rpm, c) * ratio * c.drivetrainEfficiency * this.throttle * (this.shiftTimer > 0 ? 0.15 : 1) * (this.gear < 0 ? -1 : 1) * (modifiers.torqueMultiplier ?? 1);
    const wheelDifference = this.wheels[2].angularSpeed - this.wheels[3].angularSpeed;
    const diffTransfer = clamp(wheelDifference * 22, -Math.abs(drive) * 0.5 * (c.differentialBias - 1) / (c.differentialBias + 1), Math.abs(drive) * 0.5 * (c.differentialBias - 1) / (c.differentialBias + 1));
    const contacts = [];
    this.offRoad = false;
    for (let i = 0; i < 4; i++) {
      const w = this.wheels[i], mount = add(pos, rotate(this.mounts[i], q)), radius = c.wheelRadii[i];
      const ray = new RAPIER.Ray(mount, mul(up, -1));
      const hit = this.world.castRayAndGetNormal(ray, c.suspensionRest + c.suspensionTravel + radius, true, void 0, void 0, void 0, this.body, (col) => !col.parent() || !this.vehicleBodies.has(col.parent().handle));
      w.steer = i < 2 ? this.steer : 0;
      w.driveTorque = i < 2 ? 0 : drive * 0.5 + (i === 2 ? -diffTransfer : diffTransfer);
      if (hit && dot(hit.normal, up) > 0.2) {
        const point = ray.pointAt(hit.timeOfImpact), suspension = clamp(hit.timeOfImpact - radius, c.suspensionMin, c.suspensionRest + c.suspensionTravel);
        const normal = hit.normal, normalVelocity = dot(this.body.velocityAtPoint(point), normal);
        w.suspension = suspension;
        w.grounded = true;
        let load = (c.suspensionRest - suspension) * c.spring - normalVelocity * c.damper;
        if (suspension < c.bumpStopStart) load += (c.bumpStopStart - suspension) * c.bumpStopRate;
        load = clamp(load, 0, c.maxWheelLoad);
        w.load = load;
        contacts.push({ point, normal, load, road: this.roadColliders.has(hit.collider.handle) });
        this.body.applyImpulseAtPoint(mul(normal, load * dt), point, true);
      } else {
        w.grounded = false;
        w.load = 0;
        w.suspension = c.suspensionRest + c.suspensionTravel;
        contacts.push(null);
      }
    }
    for (let axle = 0; axle < 2; axle++) {
      const a = axle * 2, b = a + 1;
      if (contacts[a] && contacts[b]) {
        const antiroll = (this.wheels[b].suspension - this.wheels[a].suspension) * c.antiRoll;
        this.body.applyImpulseAtPoint(mul(up, antiroll * dt), contacts[a].point, true);
        this.body.applyImpulseAtPoint(mul(up, -antiroll * dt), contacts[b].point, true);
      }
    }
    for (let i = 0; i < 4; i++) {
      const w = this.wheels[i], contact = contacts[i], r = c.wheelRadii[i], inertia = c.wheelInertia[i];
      w.angularSpeed += w.driveTorque * dt / inertia;
      if (contact && contact.load > 0) {
        const { point, normal, load } = contact, localDirection = { x: Math.sin(w.steer), y: 0, z: Math.cos(w.steer) };
        const direction = rotate(localDirection, q), long = norm(sub(direction, mul(normal, dot(direction, normal)))), right = norm(cross(long, normal));
        const v = this.body.velocityAtPoint(point), vx = dot(v, long), vy = dot(v, right), reference = Math.max(Math.abs(vx), 3);
        const road = this.flat ? null : this.sampler.roadAt(point.x, point.z, point.y, this.contactRoad);
        let surface = this.flat ? "asphalt" : this.sampler.surfaceAt(point.x, point.z, point.y, road);
        let mu = SURFACE_GRIP[surface];
        if (modifiers.gripProfile) {
          if (!this.flat && !contact.road && surface === "asphalt") surface = "gravel";
          const pavementDistance = road ? road.pavementDistance ?? road.distance - (road.halfWidth ?? this.sampler.world.halfWidth) : 0;
          const asphalt = this.flat ? 1 : contact.road ? 1 - clamp(pavementDistance / 0.5, 0, 1) : 0;
          const off = surface === "asphalt" ? "gravel" : surface;
          const target = (modifiers.gripProfile.asphalt * asphalt + modifiers.gripProfile[off] * (1 - asphalt)) * (modifiers.gripMultiplier ?? 1);
          this.grip[i] += (target - this.grip[i]) * (1 - Math.exp(-dt / 0.15));
          mu = this.grip[i];
          if (asphalt < 0.5) this.offRoad = true;
        }
        const brakeTorque = this.brake * c.brakeTorque[i];
        let braking = Math.min(Math.abs(w.angularSpeed), brakeTorque * dt / inertia);
        if (c.abs && Math.abs(vx) > 2) {
          const compliance = 1 + load * 11 / reference * dt * r * r / inertia;
          const targetSlip = c.absSlipTarget[i] * mu / SURFACE_GRIP.asphalt * compliance;
          const minimumOmega = Math.max(0, Math.abs(vx) / r * (1 - targetSlip));
          braking = Math.min(braking, Math.max(0, Math.sign(vx) * w.angularSpeed - minimumOmega));
        }
        w.angularSpeed -= Math.sign(w.angularSpeed || vx) * braking;
        const slip = (w.angularSpeed * r - vx) / reference, angle = Math.atan2(vy, Math.max(Math.abs(vx), 2));
        const forces = tireForces(slip, angle, load, mu, dt, r, inertia, reference);
        const rolling = Math.sign(vx) * Math.min(Math.abs(vx) * c.mass / (4 * dt), load * c.rollingResistance);
        this.body.applyImpulseAtPoint(mul(add(mul(long, forces.longitudinal - rolling), mul(right, forces.lateral)), dt), point, true);
        w.angularSpeed -= forces.longitudinal * r * dt / inertia;
        const actualSlip = (w.angularSpeed * r - vx) / reference;
        w.slip += (actualSlip - w.slip) * Math.min(1, dt * 14);
        w.lateralSlip = angle;
      } else {
        w.angularSpeed *= 0.998;
        w.slip *= 0.98;
        w.lateralSlip = 0;
      }
      w.angularSpeed = clamp(w.angularSpeed, -450, 450);
      w.rotation += w.angularSpeed * dt;
    }
    const drag = mul(velocity, -0.5 * 1.225 * c.dragCoefficient * c.frontalArea * length(velocity) * dt);
    this.body.applyImpulse(drag, true);
  }
  afterStep(autoReset = false) {
    const dt = STEP;
    const current = this.body.translation();
    this.travelled += Math.hypot(current.x - this.lastPosition.x, current.z - this.lastPosition.z);
    this.lastPosition = { ...current };
    this.resetCooldown -= dt;
    if (!this.flat && autoReset) {
      const nearest = this.sampler.roadAt(current.x, current.z, current.y);
      if (nearest.distance < 5) this.roadIndex = nearest.index;
      const water = this.sampler.waterAt(current.x, current.z);
      if (this.resetCooldown <= 0 && (water !== null && current.y < water + 0.15 || Math.abs(current.x) > 1950 || Math.abs(current.z) > 1950 || current.y < -30)) this.reset();
    }
  }
  state() {
    const s = this.readState();
    return { ...s, position: { ...s.position }, rotation: { ...s.rotation }, velocity: { ...s.velocity }, angularVelocity: { ...s.angularVelocity }, wheels: s.wheels.map((w) => ({ ...w })) };
  }
  /** Borrowed view for simulation/render reads. Never mutate or retain as a snapshot. */
  readState() {
    const position = this.body.translation(), rotation = this.body.rotation(), velocity = this.body.linvel(), angularVelocity = this.body.angvel();
    const speed = dot(velocity, rotate({ x: 0, y: 0, z: 1 }, rotation));
    if (!this.view) this.view = { position, rotation, velocity, angularVelocity, speed, rpm: this.rpm, gear: this.gear, throttle: this.throttle, brake: this.brake, wheels: this.wheels, distance: this.travelled, resetCount: this.resets };
    else {
      const s = this.view;
      s.position = position;
      s.rotation = rotation;
      s.velocity = velocity;
      s.angularVelocity = angularVelocity;
      s.speed = speed;
      s.rpm = this.rpm;
      s.gear = this.gear;
      s.throttle = this.throttle;
      s.brake = this.brake;
      s.distance = this.travelled;
      s.resetCount = this.resets;
    }
    return this.view;
  }
  snapshot() {
    return { state: this.state(), steer: this.steer, shiftTimer: this.shiftTimer, roadIndex: this.roadIndex, resetCooldown: this.resetCooldown, grip: [...this.grip], offRoad: this.offRoad };
  }
  restore(snapshot) {
    const s = snapshot.state;
    this.body.setTranslation(s.position, true);
    this.body.setRotation(s.rotation, true);
    this.body.setLinvel(s.velocity, true);
    this.body.setAngvel(s.angularVelocity, true);
    this.body.resetForces(true);
    this.body.resetTorques(true);
    this.steer = snapshot.steer;
    this.shiftTimer = snapshot.shiftTimer;
    this.roadIndex = snapshot.roadIndex;
    this.resetCooldown = snapshot.resetCooldown;
    this.throttle = s.throttle;
    this.brake = s.brake;
    this.gear = s.gear;
    this.rpm = s.rpm;
    this.travelled = s.distance;
    this.resets = s.resetCount;
    this.accumulator = 0;
    this.lastPosition = { ...s.position };
    this.offRoad = snapshot.offRoad;
    s.wheels.forEach((w, i) => Object.assign(this.wheels[i], w));
    snapshot.grip.forEach((v, i) => this.grip[i] = v);
  }
  dispose() {
    if (!this.shared) this.world.free();
  }
}
export {
  EMPTY_INPUT,
  VehicleSimulation,
  initPhysics,
  tireForces
};
