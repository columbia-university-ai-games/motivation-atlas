// Adapted from Oscar O'Donnell's Autumn Drive: racing/src/physics/config.ts.
const E30 = {
  length: 4.345,
  bodyWidth: 1.68,
  mirrorWidth: 1.72354,
  height: 1.37,
  wheelbase: 2.562,
  frontTrack: 1.412,
  rearTrack: 1.433,
  axleOffset: 0.113133,
  wheelMountHeight: 0.49,
  mass: 1200,
  comHeight: 0.48,
  wheelRadii: [0.30325, 0.30325, 0.30325, 0.30325],
  wheelWidths: [0.205, 0.205, 0.205, 0.205],
  spring: 28e3,
  damper: 2750,
  suspensionRest: 0.29,
  suspensionTravel: 0.14,
  suspensionMin: 0.14,
  bumpStopStart: 0.155,
  bumpStopRate: 17e4,
  maxWheelLoad: 17e3,
  antiRoll: 4800,
  gears: [3.72, 2.4, 1.77, 1.26, 1],
  finalDrive: 3.25,
  reverseRatio: 4.23,
  differentialBias: 1.8,
  abs: true,
  centerOfMassZ: 0.164373,
  inertia: { x: 1850, y: 2100, z: 390 },
  colliders: [
    { halfExtents: { x: 0.79, y: 0.19, z: 2.1 }, center: { x: 0, y: 0.4, z: 0 } },
    { halfExtents: { x: 0.6, y: 0.28, z: 0.99 }, center: { x: 0, y: 1.01, z: -0.36 } }
  ],
  wheelInertia: [0.95, 0.95, 0.95, 0.95],
  brakeTorque: [1350, 1350, 850, 850],
  absSlipTarget: [0.092, 0.092, 0.074, 0.074],
  // Published peaks: 240 Nm @ 4750 rpm and 147 kW @ 6750 rpm.
  // Intermediate values and clutch/shift behavior are simulation estimates.
  torqueCurve: [[800, 100], [1200, 135], [2e3, 173], [3e3, 208], [4e3, 231], [4750, 240], [5500, 234], [6e3, 227], [6750, 207.96246], [7200, 185], [7350, 0]],
  idleRpm: 850,
  launchRpm: 3100,
  redlineRpm: 7300,
  upshiftRpm: 7e3,
  downshiftRpm: 2600,
  shiftDuration: 0.28,
  drivetrainEfficiency: 0.87,
  dragCoefficient: 0.33,
  frontalArea: 1.92,
  rollingResistance: 0.014,
  // Mildly modified 35-degree steering lock; recovery still requires driver input.
  maxSteer: 35 * Math.PI / 180,
  steeringSpeedReference: 16,
  steeringSpeedExponent: 1.35,
  cylinderCount: 4,
  steeringRate: 1.9,
  countersteeringRate: 2.8,
  steeringReturnRate: 2.4,
  recoveryMinSpeed: 5,
  recoverySlipStart: 5 * Math.PI / 180,
  recoverySlipFull: 15 * Math.PI / 180,
  recoveryAngleMargin: 8 * Math.PI / 180
};
const STEP = 1 / 120;
const SURFACE_GRIP = { asphalt: 1.14, gravel: 0.67, grass: 0.47, rock: 0.6 };
function engineTorque(rpm, config = E30) {
  const points = config.torqueCurve;
  if (rpm >= config.redlineRpm) return 0;
  for (let i = 1; i < points.length; i++) if (rpm <= points[i][0]) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    return y0 + (y1 - y0) * Math.max(0, (rpm - x0) / (x1 - x0));
  }
  return 0;
}
export {
  E30,
  STEP,
  SURFACE_GRIP,
  engineTorque
};
