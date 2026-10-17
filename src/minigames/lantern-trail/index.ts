import { h } from '../../lib/dom';
import type { Minigame } from '../types';
import { move, RELICS, SIZE, start, visible, type Direction } from './game';
import './lantern-trail.css';

function mount(el: HTMLElement): () => void {
  let state = start(), playing = false, deadline = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  const fog = h('input', { type: 'checkbox', checked: true, 'data-mechanic': 'fog-of-war' });
  const status = h('p', { role: 'status', 'aria-live': 'polite' }, 'Choose fog on or off, then start exploring.');
  const clock = h('p');
  const board = h('div', { class: 'lantern-board', role: 'img', 'aria-label': 'Island map' });
  const cells = Array.from({ length: SIZE * SIZE }, () => h('span', { 'aria-hidden': 'true' }));
  board.append(...cells);
  const newRound = h('button', { type: 'button' }, 'Start round');
  const controls = h('div', { class: 'lantern-controls', 'aria-label': 'Movement controls' });
  const buttons: HTMLButtonElement[] = [];
  const root = h('div', { class: 'lantern-trail' },
    h('label', { class: 'lantern-toggle' }, fog, ' Fog of war (hide unvisited tiles)'),
    h('p', {}, 'Find all three relics. @ = you · ◆ = relic · ◆✓ = collected relic · ? = unexplored · · = empty'),
    newRound, clock, board, status, controls,
    h('p', {}, 'Tab to the direction buttons and press Enter or Space, or use arrow keys while focused inside the game.'),
    h('aside', { class: 'lantern-reflect' }, h('strong', {}, 'Then check it against your own play'),
      h('p', {}, 'What did you feel? Did hiding the map change where you went or why? Try fog on, then off. Was replay easier because the map was visible, because you remembered it, or both?')));
  function stop() { playing = false; clearInterval(timer); timer = undefined; }
  function secondsLeft() { return Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); }
  function render() {
    cells.forEach((cell, tile) => {
      const shown = visible(state, tile, fog.checked);
      const collected = state.collected.includes(tile);
      const relic = shown && RELICS.includes(tile) ? (collected ? '◆✓' : '◆') : '';
      cell.textContent = tile === state.position ? `@${relic}` : !shown ? '?' : relic || '·';
      cell.className = `${tile === state.position ? 'lantern-player' : shown ? 'lantern-seen' : ''}${collected ? ' lantern-collected' : ''}`;
    });
    board.setAttribute('aria-label', `Island map. You are at row ${Math.floor(state.position / SIZE) + 1}, column ${state.position % SIZE + 1}. ${fog.checked ? 'Unvisited tiles are hidden.' : 'All tiles are visible.'}`);
    clock.textContent = `Round: ${deadline ? secondsLeft() : 90} seconds. Relics: ${state.collected.length} / 3.`;
    buttons.forEach(button => button.setAttribute('aria-disabled', String(!playing)));
  }
  function expire() {
    if (playing && secondsLeft() === 0) {
      stop(); status.textContent = `Time to stop. You found ${state.collected.length} of 3 relics. What did you feel? Try the other fog setting next.`;
    }
  }
  function step(direction: Direction) {
    expire();
    if (!playing) { render(); return; }
    const before = state;
    state = move(state, direction);
    status.textContent = state === before ? 'The island ends here. Try another direction.'
      : `Row ${Math.floor(state.position / SIZE) + 1}, column ${state.position % SIZE + 1}. ${state.collected.length > before.collected.length ? 'You found a relic!' : state.collected.includes(state.position) ? 'You already collected this relic.' : 'Empty ground.'}`;
    if (state.collected.length === RELICS.length) {
      stop(); status.textContent = 'All three relics found! What did you feel? Try the other fog setting next.';
    }
    render();
  }
  for (const [direction, label] of [['up', '↑ Up'], ['left', '← Left'], ['down', '↓ Down'], ['right', '→ Right']] as const) {
    const button = h('button', { type: 'button', 'data-direction': direction }, label);
    button.addEventListener('click', () => step(direction)); buttons.push(button); controls.append(button);
  }
  const keys: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  root.addEventListener('keydown', event => {
    const direction = keys[event.key];
    if (direction && !(event.target instanceof HTMLInputElement)) { event.preventDefault(); step(direction); }
  });
  fog.addEventListener('change', render);
  newRound.addEventListener('click', () => {
    stop(); state = start(); deadline = Date.now() + 90000; playing = true;
    newRound.textContent = 'Restart round (same island)';
    status.textContent = 'Explore! You begin at row 1, column 1. The relics stay in the same places each round.';
    timer = setInterval(() => { expire(); render(); }, 250); render();
  });
  render(); el.append(root);
  return () => { stop(); root.remove(); };
}
export const lanternTrail: Minigame = {
  slug: 'lantern-trail', title: 'Lantern Trail', motivators: ['discovery'], author: 'Rezhao', mount,
};
