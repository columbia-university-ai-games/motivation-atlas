// Adapted from Oscar O'Donnell's Autumn Drive: racing/src/render/view.ts.
import * as T from "../../vendor/three.js";
import { GLTFLoader } from "../../vendor/three.js";
import { Sky } from "../../vendor/three.js";
import { Scenery } from "./scenery.js";
import { modelBytes } from "../model.js";
import { AdaptiveQuality } from "./adaptive-quality.js";
class DrivingView {
  constructor(container, sampler, vehicle) {
    this.container = container;
    this.sampler = sampler;
    this.vehicle = vehicle;
    this.cameraDistance = vehicle.camera.distance;
    this.renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "Autumn driving landscape");
    container.append(this.renderer.domElement);
    this.scene.fog = new T.FogExp2("#b5c0b9", 3e-4);
    const sky = new Sky();
    sky.scale.setScalar(7e3);
    sky.material.uniforms.turbidity.value = 4.2;
    sky.material.uniforms.rayleigh.value = 1.35;
    sky.material.uniforms.mieCoefficient.value = 4e-3;
    sky.material.uniforms.mieDirectionalG.value = 0.83;
    sky.material.uniforms.sunPosition.value.copy(this.sunDirection);
    this.scene.add(sky);
    const envScene = new T.Scene();
    envScene.add(sky.clone());
    const pmrem = new T.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(envScene, 0.04, 0.1, 1e4);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.8;
    pmrem.dispose();
    this.scene.add(new T.HemisphereLight("#dde7f1", "#4b573c", 2));
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, near: 10, far: 450 });
    this.sun.shadow.bias = -2e-4;
    this.sun.shadow.normalBias = 0.045;
    this.scene.add(this.sun, this.sun.target, this.car);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d"), gradient = ctx.createRadialGradient(64, 64, 18, 64, 64, 63);
    gradient.addColorStop(0, "rgba(0,0,0,.65)");
    gradient.addColorStop(0.6, "rgba(0,0,0,.42)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    this.contactTexture = new T.CanvasTexture(canvas);
    const contactGeometry = new T.PlaneGeometry(vehicle.config.bodyWidth + 0.4, vehicle.config.length + 0.45, 4, 8);
    contactGeometry.rotateX(-Math.PI / 2);
    this.contactShadow = new T.Mesh(contactGeometry, new T.MeshBasicMaterial({ map: this.contactTexture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false }));
    this.contactShadow.frustumCulled = false;
    this.contactShadow.renderOrder = 1;
    this.scene.add(this.contactShadow);
    this.scenery = new Scenery(sampler, this.sunDirection);
    this.scene.add(this.scenery.group);
    this.resize();
    window.addEventListener("resize", this.resize);
  }
  renderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(58, 1, 0.1, 7500);
  car = new T.Group();
  sunDirection = new T.Vector3(0.78, 0.15, 0.58).normalize();
  sun = new T.DirectionalLight("#ffddb2", 3.4);
  scenery;
  wheels = [];
  spins = [];
  carVariants = [];
  brakeLights = [];
  contactTexture;
  contactShadow;
  look = new T.Vector3();
  ready = false;
  quality = "high";
  graphicsQuality = "high";
  adaptive = new AdaptiveQuality();
  shadowClock = 0;
  shadowBlendClock = 0;
  shadowFrom = new Float32Array(45);
  shadowTo = new Float32Array(45);
  shadowReady = false;
  shadowPosition = new T.Vector3();
  environment;
  elapsed = 0;
  benchmarkResolution = false;
  cameraDistance;
  async loadCar() {
    const models = [await new GLTFLoader().parseAsync(modelBytes(), "")];
    for (const gltf of models) {
      gltf.scene.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) if (m.name === "Brake lights") this.brakeLights.push(m);
        }
      });
      this.car.add(gltf.scene);
      this.carVariants.push(gltf.scene);
      for (const name of ["FL", "FR", "RL", "RR"]) {
        const pivot = gltf.scene.getObjectByName(`wheel_${name}`), spin = gltf.scene.getObjectByName(`wheel_${name}_spin`);
        if (!pivot || !spin) throw new Error(`Missing model wheel: ${name}`);
        this.wheels.push(pivot);
        this.spins.push(spin);
      }
    }
    this.applyQuality();
  }
  resize = () => {
    const w = this.benchmarkResolution ? 1920 : Math.max(1, this.container.clientWidth), h = this.benchmarkResolution ? 1080 : Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, !this.benchmarkResolution);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };
  setBenchmarkResolution() {
    this.benchmarkResolution = true;
    this.renderer.setPixelRatio(1);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.resize();
  }
  setQuality(quality) {
    this.graphicsQuality = quality;
    this.quality = quality === "auto" ? "high" : quality;
    this.adaptive.reset();
    this.applyQuality();
  }
  applyQuality() {
    const automatic = this.adaptive.settings(devicePixelRatio), ratio = this.graphicsQuality === "auto" ? automatic.pixelRatio : Math.min(devicePixelRatio, this.quality === "high" ? 1.25 : this.quality === "medium" ? 1 : 0.8);
    this.renderer.setPixelRatio(this.benchmarkResolution ? 1 : ratio);
    this.renderer.shadowMap.enabled = this.quality !== "low";
    const shadowSize = this.graphicsQuality === "auto" ? automatic.shadowSize : 2048;
    if (this.sun.shadow.mapSize.x !== shadowSize) {
      this.sun.shadow.mapSize.set(shadowSize, shadowSize);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      this.sun.shadow.needsUpdate = true;
    }
    this.resize();
    this.carVariants.forEach((variant, i) => variant.visible = i === 0);
  }
  /** Call with the original frame duration, before the physics dt clamp. */
  recordFrame(frameMs) {
    if (this.graphicsQuality === "auto" && this.adaptive.update(frameMs)) this.applyQuality();
  }
  qualityMetrics() {
    return { mode: this.graphicsQuality, geometry: this.quality, pixelRatio: this.renderer.getPixelRatio(), shadowSize: this.sun.shadow.mapSize.x, adaptiveLevel: this.adaptive.settings().level };
  }
  replaceWorld(sampler) {
    this.scene.remove(this.scenery.group);
    this.scenery.dispose();
    this.sampler = sampler;
    this.scenery = new Scenery(sampler, this.sunDirection);
    this.scene.add(this.scenery.group);
    this.snap();
  }
  snap() {
    this.ready = false;
    this.shadowReady = false;
  }
  draw(state, dt, presented = false) {
    this.elapsed += dt;
    const targetPosition = new T.Vector3(state.position.x, state.position.y, state.position.z), q = new T.Quaternion(state.rotation.x, state.rotation.y, state.rotation.z, state.rotation.w);
    if (presented || !this.ready || this.car.position.distanceTo(targetPosition) > 20) {
      this.car.position.copy(targetPosition);
      this.car.quaternion.copy(q);
    } else {
      this.car.position.lerp(targetPosition, 1 - Math.exp(-dt * 26));
      this.car.quaternion.slerp(q, 1 - Math.exp(-dt * 30));
    }
    const p = this.car.position;
    this.wheels.forEach((wheel, i) => {
      const w = state.wheels[i % 4];
      wheel.position.y = this.vehicle.config.wheelMountHeight - w.suspension;
      wheel.rotation.y = w.steer;
      this.spins[i].rotation.x = w.rotation % (Math.PI * 2);
    });
    this.brakeLights.forEach((m) => m.emissiveIntensity = state.brake > 0.08 ? 3 : 0.35);
    const forward = new T.Vector3(0, 0, 1).applyQuaternion(this.car.quaternion);
    forward.y = 0;
    forward.normalize();
    const contact = this.contactShadow.geometry.attributes.position, heading = Math.atan2(forward.x, forward.z);
    const beneath = this.sampler.roadAt(p.x, p.z, p.y), ground = beneath.distance < (beneath.halfWidth ?? 5.7) && Math.abs(beneath.y - p.y) < 2 ? beneath.y : this.sampler.height(p.x, p.z);
    this.shadowClock += dt;
    this.shadowBlendClock += dt;
    const shadowSnap = !this.shadowReady || this.shadowPosition.distanceToSquared(p) > 9;
    if (shadowSnap || this.shadowClock >= 0.05 - 1e-6) {
      const blend = Math.min(1, this.shadowBlendClock / 0.05);
      for (let i = 0; i < contact.count; i++) {
        const col = i % 5, row = Math.floor(i / 5), x = (col / 4 - 0.5) * (this.vehicle.config.bodyWidth + 0.4), z = (row / 8 - 0.5) * (this.vehicle.config.length + 0.45);
        const wx = p.x + x * Math.cos(heading) + z * Math.sin(heading), wz = p.z - x * Math.sin(heading) + z * Math.cos(heading), road = this.sampler.roadAt(wx, wz, p.y);
        const height = (road.distance < (road.halfWidth ?? 5.7) && Math.abs(road.y - p.y) < 2 ? road.y : this.sampler.height(wx, wz)) - ground;
        this.shadowFrom[i] = shadowSnap ? height : T.MathUtils.lerp(this.shadowFrom[i], this.shadowTo[i], blend);
        this.shadowTo[i] = height;
        contact.setX(i, x);
        contact.setZ(i, z);
      }
      this.shadowClock = 0;
      this.shadowBlendClock = 0;
      this.shadowReady = true;
      this.shadowPosition.copy(p);
    }
    const shadowBlend = Math.min(1, this.shadowBlendClock / 0.05);
    for (let i = 0; i < contact.count; i++) contact.setY(i, ground + T.MathUtils.lerp(this.shadowFrom[i], this.shadowTo[i], shadowBlend) + 0.045 - p.y);
    contact.needsUpdate = true;
    this.contactShadow.material.opacity = T.MathUtils.clamp(1 - Math.max(0, p.y - ground) * 1.5, 0, 1);
    this.contactShadow.position.copy(p);
    this.contactShadow.rotation.y = heading;
    const target = p.clone().addScaledVector(forward, -this.cameraDistance);
    target.y += this.vehicle.camera.height + this.cameraDistance * 0.09;
    target.y = Math.max(target.y, this.sampler.height(target.x, target.z) + 0.9);
    const look = p.clone().addScaledVector(forward, 4);
    look.y += this.vehicle.camera.lookHeight;
    for (let t = 0.12; t < 1; t += 0.1) {
      const sample = look.clone().lerp(target, t);
      if (sample.y < this.sampler.height(sample.x, sample.z) + 0.3) {
        target.lerpVectors(look, target, Math.max(0.18, t - 0.1));
        break;
      }
    }
    if (!this.ready) {
      this.camera.position.copy(target);
      this.look.copy(look);
      this.ready = true;
    } else {
      this.camera.position.lerp(target, 1 - Math.exp(-dt * 6));
      this.look.lerp(look, 1 - Math.exp(-dt * 9));
    }
    this.camera.position.y = Math.max(this.camera.position.y, this.sampler.height(this.camera.position.x, this.camera.position.z) + 0.55);
    this.camera.lookAt(this.look);
    this.sun.position.copy(p).addScaledVector(this.sunDirection, 220);
    this.sun.target.position.copy(p);
    this.scenery.update(this.elapsed, this.camera.position, this.quality);
    this.renderer.render(this.scene, this.camera);
  }
  /** Deterministic viewpoints for reviewing the exported model. */
  inspectCar(state, angle, pose) {
    if (pose) state = { ...state, position: { ...state.position, y: state.position.y + 0.4 }, wheels: state.wheels.map((w, i) => ({ ...w, steer: i < 2 ? pose.steer : 0, suspension: pose.suspension, rotation: pose.rotation })) };
    this.draw(state, 0);
    this.car.position.set(state.position.x, state.position.y, state.position.z);
    this.car.quaternion.set(state.rotation.x, state.rotation.y, state.rotation.z, state.rotation.w);
    const offset = new T.Vector3(Math.sin(angle) * 5.5, 1.8, Math.cos(angle) * 5.5).applyQuaternion(this.car.quaternion);
    this.camera.position.copy(this.car.position).add(offset);
    this.camera.lookAt(this.car.position.clone().add(new T.Vector3(0, 0.75, 0)));
    this.renderer.render(this.scene, this.camera);
    this.ready = false;
  }
  /** Read-only renderer evidence for opt-in browser tests. */
  inspectRig() {
    return { position: this.car.position.toArray(), rotation: this.car.quaternion.toArray(), camera: this.camera.position.toArray(), cameraLook: this.look.toArray(), shadow: this.contactShadow.position.toArray(), wheels: this.wheels.map((w, i) => ({ name: w.name, steer: w.rotation.y, height: w.position.y, spin: this.spins[i].rotation.x, caliperRotation: w.children.find((c) => c.name.endsWith("caliper"))?.rotation.toArray().slice(0, 3) })), brakeIntensity: this.brakeLights[0]?.emissiveIntensity, variants: this.carVariants.map((v) => v.visible) };
  }
  dispose() {
    window.removeEventListener("resize", this.resize);
    this.scenery.dispose();
    this.environment.dispose();
    this.contactTexture.dispose();
    this.contactShadow.geometry.dispose();
    this.contactShadow.material.dispose();
    this.car.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    this.scene.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          for (const v of Object.values(m)) if (v instanceof T.Texture) v.dispose();
          m.dispose();
        }
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
export {
  DrivingView
};
