// Atlas adapter around the existing Autumn Drive physics, scenery and BMW rig.
import * as T from '../vendor/three.js';
import { generateWorld, DEFAULT_SEED } from './world/generator.js';
import { initPhysics, VehicleSimulation } from './physics/vehicle.js';
import { E30 } from './physics/config.js';
import { DrivingView } from './render/view.js';
import { DrivingAudio } from './audio.js';
import { CHECKPOINTS } from '../game.ts';
const vehicle = { config: E30, camera: { distance: 6.3, height: 2.35, lookHeight: .95 } };
const still = { throttle: 0, brake: 0, steering: 0, reverse: false };
export async function createDrive(container) {
  await initPhysics();
  const world = generateWorld(DEFAULT_SEED), start = world.length * .83;
  const simulation = new VehicleSimulation(world, E30);
  let view, observer, disposed = false;
  const audio = new DrivingAudio(E30); audio.volume = .16;
  const gates = [];
  try {
    view = new DrivingView(container, simulation.sampler, vehicle);
    view.setQuality('low');
    await view.loadCar();
    for (const [index, distance] of CHECKPOINTS.entries()) {
      const point = simulation.sampler.pointAtDistance(start + distance), gate = new T.Group();
      const material = new T.MeshStandardMaterial({color: '#edbd66', emissive: '#81591e', emissiveIntensity: .3});
      for (const side of [-1, 1]) {
        const post = new T.Mesh(new T.BoxGeometry(.2, 4.8, .2), material);
        post.position.set(side * 4.8, 2.4, 0); gate.add(post);
      }
      const bar = new T.Mesh(new T.BoxGeometry(9.8, .25, .25), material); bar.position.y = 4.8; gate.add(bar);
      const sign = document.createElement('canvas'); sign.width = 512; sign.height = 128;
      const ctx = sign.getContext('2d'); ctx.fillStyle = '#23392d'; ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = '#fff5db'; ctx.font = 'bold 52px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(index === 2 ? 'DESTINATION' : 'MARKER ' + (index + 1), 256, 82);
      const texture = new T.CanvasTexture(sign);
      const label = new T.Mesh(new T.PlaneGeometry(4.6, 1.15), new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }));
      label.position.y = 4.05; gate.add(label);
      gate.position.set(point.x, point.y, point.z); gate.rotation.y = Math.atan2(point.tx, point.tz);
      view.scene.add(gate); gates.push(gate);
    }
    observer = new ResizeObserver(() => { if (!disposed) { view.resize(); view.draw(simulation.state(), 0); } });
    observer.observe(container); reset(0);
  } catch (error) { disposed = true; observer?.disconnect(); view?.dispose(); simulation.dispose(); audio.dispose(); throw error; }
  function sample() {
    const state = simulation.state();
    const road = simulation.sampler.roadAt(state.position.x, state.position.z, state.position.y), point = world.road[road.index];
    const along = point.distance + Math.hypot(road.x - point.x, road.z - point.z);
    let progress = (along - start + world.length) % world.length;
    if (progress > world.length / 2) progress -= world.length;
    return { progress, onRoad: road.distance <= world.halfWidth + .5 && Math.abs(state.position.y - road.y) < 2,
      speed: Math.abs(state.speed) * 3.6, gear: state.gear, automaticResets: state.resetCount };
  }
  function reset(progress) {
    simulation.reset(start + progress, false);
    for (let i = 0; i < 120; i++) simulation.step(still);
    simulation.clearAccumulator(); view.snap(); view.draw(simulation.state(), 0); return sample();
  }
  return {
    reset,
    advance(dt, input) { if (disposed) throw new Error('Drive disposed'); const state = simulation.advance(dt, input); view.draw(state, dt); audio.update(state, false); return sample(); },
    markGates(passed) { gates.forEach((gate, index) => { gate.visible = index >= passed; }); },
    resume() { simulation.clearAccumulator(); void audio.start().catch(() => {}); },
    pause() { simulation.clearAccumulator(); audio.pause(); },
    dispose() { if (disposed) return; disposed = true; observer?.disconnect(); audio.dispose(); view.dispose(); simulation.dispose(); },
  };
}
