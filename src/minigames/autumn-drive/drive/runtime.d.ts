export interface DriveInput { throttle: number; brake: number; steering: number; reverse: boolean }
export interface DriveSample { progress: number; onRoad: boolean; speed: number; gear: number; automaticResets: number }
export interface Drive {
  reset(progress: number): DriveSample;
  advance(dt: number, input: DriveInput): DriveSample;
  markGates(passed: number): void;
  resume(): void; pause(): void; dispose(): void;
}
export function createDrive(container: HTMLElement): Promise<Drive>;
