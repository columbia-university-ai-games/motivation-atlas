// Adapted from Oscar O'Donnell's Autumn Drive: racing/src/physics/steering.ts.
import { clamp, lerp, smooth } from "../shared/math.js";
function steeringCommand(input, localVelocity, config) {
  const request = Number.isFinite(input) ? clamp(input, -1, 1) : 0;
  const speed = Math.hypot(localVelocity.x, localVelocity.z);
  const base = config.maxSteer / (1 + (speed / config.steeringSpeedReference) ** config.steeringSpeedExponent);
  const sideslip = Math.atan2(localVelocity.x, Math.max(Math.abs(localVelocity.z), 0.01));
  const countersteering = localVelocity.z > config.recoveryMinSpeed && -request * sideslip > 0;
  const recovery = countersteering ? smooth((Math.abs(sideslip) - config.recoverySlipStart) / (config.recoverySlipFull - config.recoverySlipStart)) : 0;
  const recoveryLimit = Math.min(config.maxSteer, Math.max(base, Math.abs(sideslip) + config.recoveryAngleMargin));
  const limit = lerp(base, recoveryLimit, recovery);
  const rate = request === 0 ? config.steeringReturnRate : lerp(config.steeringRate, config.countersteeringRate, recovery);
  return { target: -request * limit, limit, rate, sideslip, recovery };
}
function advanceSteering(current, input, localVelocity, config, dt) {
  const command = steeringCommand(input, localVelocity, config);
  return current + clamp(command.target - current, -command.rate * dt, command.rate * dt);
}
function inputForWheelAngle(angle, localVelocity, config) {
  const { limit } = steeringCommand(-Math.sign(angle), localVelocity, config);
  return clamp(-angle / limit, -1, 1);
}
export {
  advanceSteering,
  inputForWheelAngle,
  steeringCommand
};
