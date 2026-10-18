export const DEADLINE = 90;
export const CHECKPOINTS = [300, 600, 900] as const;
export type Outcome = 'driving' | 'arrived' | 'time-up' | 'stopped';
export interface Run {
  deadline: boolean; elapsed: number; nextGate: number; lastProgress: number;
  furthest: number; offRoad: number; resets: number; outcome: Outcome;
}
export interface Observation { progress: number; onRoad: boolean }
export function newRun(deadline: boolean): Run {
  return { deadline, elapsed: 0, nextGate: 0, lastProgress: 0, furthest: 0, offRoad: 0, resets: 0, outcome: 'driving' };
}
/** The deadline is the only difference between conditions. Only ordered,
 * forward gate crossings on the road count; resets cannot skip gates. */
export function advanceRun(run: Run, dt: number, observation: Observation): Run {
  if (run.outcome !== 'driving') return run;
  if (!Number.isFinite(dt) || dt < 0 || dt > 1 || !Number.isFinite(observation.progress)) throw new RangeError('Invalid driving observation');
  const elapsed = run.elapsed + dt, gate = CHECKPOINTS[run.nextGate];
  const crossed = observation.onRoad && run.lastProgress < gate && observation.progress >= gate && observation.progress - run.lastProgress <= 25;
  const nextGate = run.nextGate + Number(crossed);
  const inTime = !run.deadline || elapsed <= DEADLINE + 1e-8;
  const outcome: Outcome = nextGate === CHECKPOINTS.length && inTime ? 'arrived' : run.deadline && elapsed >= DEADLINE ? 'time-up' : 'driving';
  return { ...run, elapsed, nextGate, lastProgress: observation.progress,
    furthest: Math.max(run.furthest, Math.min(CHECKPOINTS[2], observation.progress)),
    offRoad: run.offRoad + (observation.onRoad ? 0 : dt), outcome };
}
export function recoveryProgress(run: Run): number { return run.nextGate === 0 ? 0 : CHECKPOINTS[run.nextGate - 1] + 4; }
export function recover(run: Run): Run { return run.outcome === 'driving' ? { ...run, resets: run.resets + 1, lastProgress: recoveryProgress(run) } : run; }
export function stopRun(run: Run): Run { return run.outcome === 'driving' ? { ...run, outcome: 'stopped' } : run; }
export function runSummary(run: Run): string {
  const label = run.outcome === 'arrived' ? 'Arrived' : run.outcome === 'time-up' ? 'Time expired' : 'Stopped';
  return (run.deadline ? 'Deadline ON' : 'Deadline OFF') + ' · ' + label + ' · ' + run.elapsed.toFixed(1) + 's · ' + run.nextGate + '/3 gates · ' + run.resets + ' resets · ' + run.offRoad.toFixed(1) + 's off road';
}
