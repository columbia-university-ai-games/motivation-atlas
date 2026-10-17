// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { move, start, visible } from '../src/minigames/lantern-trail/game';
import { lanternTrail } from '../src/minigames/lantern-trail';
afterEach(() => vi.useRealTimers());
it('fog hides unvisited tiles, moving reveals them, and fog off reveals the island', () => {
  const initial = start();
  expect(visible(initial, 1, true)).toBe(false);
  expect(visible(initial, 1, false)).toBe(true);
  const explored = move(initial, 'right');
  expect(visible(explored, 1, true)).toBe(true);
  expect(visible(explored, 0, true)).toBe(true);
  expect(visible(explored, 2, true)).toBe(false);
  expect(initial.visited).toEqual([0]);
});
it('stops at island edges and collects each relic only once', () => {
  let state = start();
  expect(move(state, 'left')).toBe(state);
  expect(move(state, 'up')).toBe(state);
  for (let n = 0; n < 5; n++) state = move(state, 'right');
  expect(state.collected).toEqual([5]);
  expect(move(state, 'right')).toBe(state);
  state = move(move(state, 'left'), 'right');
  expect(state.collected).toEqual([5]);
});
it('plays with the toggle, expires at 90 seconds, and removes its active timer on unmount', () => {
  vi.useFakeTimers();
  const host = document.createElement('div');
  document.body.append(host);
  const unmount = lanternTrail.mount(host);
  expect(host.querySelector('.lantern-board')!.textContent).not.toContain('◆');
  host.querySelector('input')!.click();
  expect(host.querySelector('.lantern-board')!.textContent).toContain('◆');
  host.querySelector('button')!.click();
  host.querySelector<HTMLButtonElement>('[data-direction="right"]')!.click();
  expect(host.querySelector('[role="status"]')!.textContent).toContain('column 2');
  // Collected relics remain visible under fog, both under the player and after leaving.
  host.querySelector('input')!.click();
  for (let n = 0; n < 4; n++) host.querySelector<HTMLButtonElement>('[data-direction="right"]')!.click();
  const relic = host.querySelectorAll('.lantern-board span')[5]!;
  expect(relic.textContent).toBe('@◆✓');
  host.querySelector<HTMLButtonElement>('[data-direction="left"]')!.click();
  expect(relic.textContent).toBe('◆✓');
  expect(host.querySelector('.lantern-board')!.textContent).toContain('?');
  vi.advanceTimersByTime(90000);
  expect(host.querySelector('[role="status"]')!.textContent).toContain('Time to stop');
  host.querySelector<HTMLButtonElement>('[data-direction="right"]')!.click();
  expect(host.querySelector('[role="status"]')!.textContent).toContain('Time to stop');
  host.querySelector('button')!.click();
  expect(vi.getTimerCount()).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(host.childNodes).toHaveLength(0);
  host.remove();
});
