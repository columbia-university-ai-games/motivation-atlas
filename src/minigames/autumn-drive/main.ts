import { h } from '../../lib/dom';
import type { Minigame } from '../types';
import type { Drive, DriveInput } from './drive/runtime.js';
import { advanceRun, CHECKPOINTS, DEADLINE, newRun, recover, recoveryProgress, runSummary, stopRun, type Run } from './game';
import './style.css';

function mount(el: HTMLElement): () => void {
  let drive: Drive | undefined;
  let run = newRun(true);
  let running = false, disposed = false, loading = false;
  let frame = 0, previous = 0, lastHud = 0, automaticResets = 0;
  const keys = new Set<string>();
  let pointer: number | null = null;
  let pointerInput = { throttle: 0, brake: 0, steering: 0 };
  const records: Run[] = [];
  const deadline = h('input', { type: 'checkbox', checked: true, 'data-mechanic': 'deadline' });
  const mode = h('span', { class: 'ad-mode' }, 'DEADLINE ON');
  const time = h('output', { 'aria-label': 'Time remaining' }, '1:30');
  const progress = h('output', { 'aria-label': 'Route progress' }, '0 / 3');
  const speed = h('output', { 'aria-label': 'Speed' }, '0');
  const next = h('span', {}, 'Follow the road through three golden gates.');
  const status = h('p', { class: 'ad-status', role: 'status' }, 'Your Autumn Drive, on a short stretch of the Amberwater route.');
  const stage = h('div', { class: 'ad-stage', tabindex: 0, 'aria-label': 'Autumn Drive. WASD or arrow keys to drive. R recovers. Escape pauses.' });
  const view = h('div', { class: 'ad-view' });
  const start = h('button', { type: 'button', class: 'ad-button ad-primary' }, 'Load and start drive');
  const pause = h('button', { type: 'button', class: 'ad-button', disabled: true }, 'Pause');
  const reset = h('button', { type: 'button', class: 'ad-button', disabled: true }, 'Recover to road');
  const stop = h('button', { type: 'button', class: 'ad-button', disabled: true }, 'End this run');
  const pad = h('button', { type: 'button', class: 'ad-pad', 'aria-label': 'Driving pad. Hold near the top to accelerate, slide left or right to steer, bottom to brake.' },
    h('span', { class: 'ad-pad-top' }, 'GAS'), h('span', { class: 'ad-pad-middle' }, '←  HOLD + SLIDE  →'), h('span', { class: 'ad-pad-bottom' }, 'BRAKE'));
  const dot = h('span', { class: 'ad-pad-dot', 'aria-hidden': true }); pad.append(dot);
  const reflect = h('section', { class: 'ad-reflect', hidden: true }, h('h4', {}, 'Before the next drive'),
    h('p', {}, 'What were you trying to do? How did the drive feel? After trying the other setting, what changed?'));
  const results = h('ol', { class: 'ad-results' });
  const history = h('details', { class: 'ad-history' }, h('summary', {}, 'Run notes for your playtest'),
    h('p', {}, 'These numbers describe driving, not feelings. Ask the player for their account. Notes disappear when you leave this page.'), results);
  stage.append(view, h('div', { class: 'ad-scene-title' }, 'AUTUMN DRIVE', h('small', {}, 'THE AMBERWATER ROUTE')),
    h('div', { class: 'ad-hud' }, h('div', {}, h('small', {}, 'TIME'), time), h('div', {}, h('small', {}, 'GATES'), progress), h('div', {}, speed, h('small', {}, 'KM/H'))));
  const pending = h('span', { class: 'ad-setting-note' }, 'Applied when you start a drive.');
  const root = h('div', { class: 'ad-game' },
    h('div', { class: 'ad-heading' }, h('p', {}, 'Take the long way.', h('small', {}, 'Same car. Same road. A different pace.')), mode),
    stage, h('div', { class: 'ad-route' }, next),
    h('fieldset', { class: 'ad-setting' }, h('legend', {}, 'The mechanic'), h('label', {}, deadline, ' 90-second deadline'), pending),
    h('div', { class: 'ad-actions' }, start, pause, reset, stop), status,
    h('div', { class: 'ad-controls' }, pad, h('p', {}, h('strong', {}, 'Find your rhythm.'), h('br'), 'WASD / arrows: drive and brake.', h('br'), 'R: recover · Esc: pause', h('br'), 'Mouse or touch: hold the pad and slide.', h('br'), 'Release the pad to coast.')),
    reflect, history,
    h('p', { class: 'ad-credit' }, 'Adapted from Oscar’s Autumn Drive. BMW model: ', h('a', { href: 'https://sketchfab.com/3d-models/free-bmw-m3-e30-ac3c7013434e403e8faff87948caf422', target: '_blank', rel: 'noopener' }, 'Martin Trafas'), ' · ', h('a', { href: 'https://creativecommons.org/licenses/by/4.0/', target: '_blank', rel: 'noopener' }, 'CC BY 4.0'), ' · proportions, materials and wheel rig modified.'));
  el.append(root);

  function clearInput() { keys.clear(); pointer = null; pointerInput = { throttle: 0, brake: 0, steering: 0 }; pad.classList.remove('active'); }
  function halt() { running = false; cancelAnimationFrame(frame); frame = 0; clearInput(); drive?.pause(); }
  function hud(currentSpeed = 0) {
    mode.textContent = run.deadline ? 'DEADLINE ON' : 'DEADLINE OFF'; mode.classList.toggle('ad-free', !run.deadline);
    const seconds = Math.max(0, Math.ceil(DEADLINE - run.elapsed));
    time.textContent = run.deadline ? Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') : 'No limit';
    time.setAttribute('aria-label', run.deadline ? 'Time remaining' : 'No deadline');
    progress.textContent = run.nextGate + ' / 3'; speed.textContent = String(Math.round(currentSpeed));
    next.textContent = run.outcome === 'arrived' ? 'Destination reached.' : 'Next gate: ' + Math.max(0, Math.ceil((CHECKPOINTS[run.nextGate] ?? CHECKPOINTS[2]) - run.lastProgress)) + ' m along the road';
    pad.setAttribute('aria-disabled', String(!running));
    const active = !!drive && run.outcome === 'driving'; pause.disabled = !active; reset.disabled = !active; stop.disabled = !active;
    pause.textContent = running ? 'Pause' : 'Resume';
  }
  function finish() {
    halt(); records.push({ ...run }); reflect.hidden = false;
    results.replaceChildren(...records.slice(-6).map(value => h('li', {}, runSummary(value))));
    status.textContent = runSummary(run) + '. Try the other deadline setting next.'; hud();
  }
  function animate(now: number) {
    if (!running || !drive || disposed) return;
    const dt = Math.min(.1, Math.max(0, (now - previous) / 1000)); previous = now;
    const input: DriveInput = {
      throttle: Math.max(pointerInput.throttle, Number(keys.has('KeyW') || keys.has('ArrowUp'))),
      brake: Math.max(pointerInput.brake, Number(keys.has('KeyS') || keys.has('ArrowDown') || keys.has('Space'))),
      steering: pointer !== null ? pointerInput.steering : Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')),
      reverse: false,
    };
    const sample = drive.advance(dt, input);
    if (sample.automaticResets !== automaticResets) {
      automaticResets = sample.automaticResets;
      run = recover(advanceRun(run, dt, {progress: run.lastProgress, onRoad: false}));
      drive.reset(recoveryProgress(run));
      status.textContent = 'Recovered to the last passed gate. The clock keeps its elapsed time.';
    } else {
      const was = run.nextGate; run = advanceRun(run, dt, sample);
      if (run.nextGate !== was) { drive.markGates(run.nextGate); status.textContent = 'Gate ' + run.nextGate + ' of 3 passed.'; }
    }
    if (run.outcome !== 'driving') { finish(); return; }
    if (now - lastHud > 100) { hud(sample.speed); lastHud = now; }
    frame = requestAnimationFrame(animate);
  }
  function resume() { if (!drive || run.outcome !== 'driving' || disposed) return; clearInput(); running = true; previous = performance.now(); drive.resume(); frame = requestAnimationFrame(animate); status.textContent = 'Follow the road through three golden gates. Recover if you leave the road.'; hud(); stage.focus({ preventScroll: true }); }
  function togglePause() { if (!drive || run.outcome !== 'driving') return; if (running) { halt(); hud(); status.textContent = 'Paused. The clock is paused too.'; } else resume(); }
  function recoverToRoad() { if (!drive || run.outcome !== 'driving') return; clearInput(); run = recover(run); drive.reset(recoveryProgress(run)); hud(); status.textContent = 'Back at the last passed gate. Elapsed time is preserved.'; }
  start.addEventListener('click', async () => {
    if (loading || disposed) return;
    halt(); loading = true; start.disabled = true; status.textContent = 'Preparing your original car, physics and autumn landscape…';
    try {
      if (!drive) {
        const { createDrive } = await import('./drive/runtime.js');
        if (disposed) return;
        const ready = await createDrive(view);
        if (disposed) { ready.dispose(); return; }
        drive = ready;
      }
      if (run.elapsed > 0 && run.outcome === 'driving') { run = stopRun(run); finish(); }
      run = newRun(deadline.checked); automaticResets = drive.reset(0).automaticResets; drive.markGates(0);
      reflect.hidden = true; pending.textContent = 'Applied when you start a drive.'; start.textContent = 'Restart drive'; resume();
    } catch (error) { status.textContent = 'The 3D drive could not start. Try a browser with WebGL 2 enabled, then press Start again.'; console.error(error); }
    finally { loading = false; start.disabled = false; }
  });
  deadline.addEventListener('change', () => { pending.textContent = 'Next drive: deadline ' + (deadline.checked ? 'on.' : 'off.'); });
  pause.addEventListener('click', togglePause); reset.addEventListener('click', recoverToRoad);
  stop.addEventListener('click', () => { if (drive && run.outcome === 'driving') { run = stopRun(run); finish(); } });
  const drivingKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
  root.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.code === 'Escape' && !event.repeat) { event.preventDefault(); togglePause(); }
    if (!running) return;
    if (event.code === 'KeyR' && !event.repeat) { event.preventDefault(); recoverToRoad(); }
    if (drivingKeys.includes(event.code) && (event.code !== 'Space' || event.target === stage || event.target === pad)) { event.preventDefault(); keys.add(event.code); }
  });
  const keyup = (event: KeyboardEvent) => keys.delete(event.code);
  const blur = () => { if (running) togglePause(); };
  const visibility = () => { if (document.hidden) blur(); };
  window.addEventListener('keyup', keyup); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
  function point(event: PointerEvent) {
    const rect = pad.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2));
    pointerInput = { throttle: Math.max(0, -y), brake: Math.max(0, y), steering: x };
    dot.style.left = ((x + 1) * 50) + '%'; dot.style.top = ((y + 1) * 50) + '%';
  }
  pad.addEventListener('pointerdown', event => { if (!running) return; event.preventDefault(); pointer = event.pointerId; pad.setPointerCapture(pointer); pad.classList.add('active'); point(event); });
  pad.addEventListener('pointermove', event => { if (event.pointerId === pointer) point(event); });
  const release = () => { pointer = null; pointerInput = { throttle: 0, brake: 0, steering: 0 }; pad.classList.remove('active'); };
  pad.addEventListener('pointerup', release); pad.addEventListener('pointercancel', release); pad.addEventListener('lostpointercapture', release);
  hud();
  return () => { disposed = true; halt(); drive?.dispose(); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); root.remove(); };
}
export const autumnDrive: Minigame = { slug: 'autumn-drive', title: 'Autumn Drive: a different pace', motivators: ['submission'], author: 'oscarodonnell1', mount };
