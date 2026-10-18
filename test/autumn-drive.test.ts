// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { advanceRun, CHECKPOINTS, DEADLINE, newRun, recover, recoveryProgress, stopRun, type Run } from '../src/minigames/autumn-drive/game';

describe('Autumn Drive deadline experiment', () => {
  it('the same drive remains active at 29 seconds and fails at 30 only with the deadline enabled', () => {
    let timed = newRun(true), free = newRun(false);
    for (let i = 0; i < 29; i++) {
      timed = advanceRun(timed, 1, {progress: 0, onRoad: true});
      free = advanceRun(free, 1, {progress: 0, onRoad: true});
    }
    expect(timed.outcome).toBe('driving'); expect(free.outcome).toBe('driving');
    timed = advanceRun(timed, 1, {progress: 0, onRoad: true});
    free = advanceRun(free, 1, {progress: 0, onRoad: true});
    expect(timed.outcome).toBe('time-up'); expect(free.outcome).toBe('driving');
    expect(timed.elapsed).toBe(30);
    expect(timed.elapsed).toBe(free.elapsed); expect(timed.nextGate).toBe(free.nextGate);
  });
  it.each([true, false])('finishes the identical ordered route with deadline=%s', deadline => {
    let run = newRun(deadline);
    for (let progress = 10; progress <= 900; progress += 10) run = advanceRun(run, .25, {progress, onRoad: true});
    expect(run.outcome).toBe('arrived'); expect(run.nextGate).toBe(CHECKPOINTS.length); expect(run.elapsed).toBe(22.5);
  });
  it('does not award gates for off-road shortcuts, reverse crossings, or teleporting', () => {
    const near = {...newRun(false), lastProgress: 298};
    expect(advanceRun(near, .1, {progress: 301, onRoad: false}).nextGate).toBe(0);
    expect(advanceRun({...near, lastProgress: 302}, .1, {progress: 299, onRoad: true}).nextGate).toBe(0);
    expect(advanceRun(newRun(false), .1, {progress: 900, onRoad: true}).nextGate).toBe(0);
  });
  it('recovery preserves the timer and earned gates', () => {
    const before: Run = {...newRun(true), elapsed: 24, nextGate: 1, lastProgress: 580, offRoad: 5};
    const recovered = recover(before);
    expect(recovered).toMatchObject({elapsed: 24, nextGate: 1, resets: 1, lastProgress: 304, offRoad: 5});
    expect(recoveryProgress(before)).toBe(304); expect(before.resets).toBe(0);
  });
  it('an on-time final crossing wins; a late crossing cannot beat the deadline', () => {
    const near: Run = {...newRun(true), nextGate: 2, lastProgress: 899, elapsed: DEADLINE - .5};
    expect(advanceRun(near, .5, {progress: 901, onRoad: true}).outcome).toBe('arrived');
    expect(advanceRun(near, .6, {progress: 901, onRoad: true}).outcome).toBe('time-up');
  });
  it('terminal runs freeze and invalid observations cannot change state', () => {
    const stopped = stopRun(newRun(false));
    expect(advanceRun(stopped, 1, {progress: 150, onRoad: true})).toBe(stopped);
    expect(recover(stopped)).toBe(stopped);
    expect(() => advanceRun(newRun(false), -.1, {progress: 0, onRoad: true})).toThrow(RangeError);
    expect(() => advanceRun(newRun(false), .1, {progress: NaN, onRoad: true})).toThrow(RangeError);
  });
});

const mock = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('../src/minigames/autumn-drive/drive/runtime.js', () => ({createDrive: mock.create}));
import { autumnDrive } from '../src/minigames/autumn-drive';
afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); vi.clearAllMocks(); });
function setup() {
  vi.useFakeTimers();
  const drive = {reset: vi.fn(() => ({progress:0,onRoad:true,speed:0,gear:1,automaticResets:0})), advance: vi.fn(() => ({progress:0,onRoad:true,speed:20,gear:1,automaticResets:0})), markGates:vi.fn(), resume:vi.fn(), pause:vi.fn(), dispose:vi.fn()};
  mock.create.mockResolvedValue(drive);
  const host = document.createElement('div'); document.body.append(host);
  const unmount = autumnDrive.mount(host);
  const button = (text: string) => [...host.querySelectorAll('button')].find(el => el.textContent === text)!;
  return {host, drive, unmount, button};
}
describe('Autumn Drive controls and lifecycle', () => {
  it('queues a changed deadline for the next drive and records each actual condition', async () => {
    const {host,button,unmount} = setup();
    button('Load and start drive').click(); await vi.dynamicImportSettled();
    await vi.advanceTimersByTimeAsync(1000);
    host.querySelector<HTMLInputElement>('[data-mechanic]')!.click();
    expect(host.querySelector('.ad-mode')!.textContent).toBe('DEADLINE ON');
    button('End this run').click();
    expect(host.querySelector('.ad-results')!.textContent).toContain('Deadline ON');
    button('Restart drive').click(); await Promise.resolve();
    expect(host.querySelector('.ad-mode')!.textContent).toBe('DEADLINE OFF'); unmount();
  });
  it('pauses on blur, keeps focus usable, and cleans the frame and runtime', async () => {
    const {host,button,drive,unmount} = setup();
    button('Load and start drive').click(); await vi.dynamicImportSettled(); await vi.advanceTimersByTimeAsync(50);
    expect(document.activeElement).toBe(host.querySelector('.ad-stage'));
    window.dispatchEvent(new Event('blur')); const count = drive.advance.mock.calls.length;
    await vi.advanceTimersByTimeAsync(500); expect(drive.advance).toHaveBeenCalledTimes(count);
    button('Resume').click(); unmount();
    expect(drive.dispose).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0); expect(host.childNodes).toHaveLength(0);
  });
  it('disposes a runtime that finishes loading after navigation away', async () => {
    const {button,drive,unmount} = setup();
    let resolve!: (value: typeof drive) => void;
    mock.create.mockReturnValue(new Promise(value => {resolve=value;}));
    button('Load and start drive').click(); await vi.dynamicImportSettled(); unmount(); resolve(drive); await Promise.resolve();
    expect(drive.dispose).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
});
