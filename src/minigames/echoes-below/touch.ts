import type { Point } from "./game";

/** A captured finger belongs to one stick until it lifts, even outside the pad. */
export function bindTouchStick(pad: HTMLButtonElement, thumb: HTMLElement, options: {
  enabled: () => boolean;
  start: () => void;
  move: (vector: Point) => void;
  end: () => void;
}) {
  let pointer: number | null = null;
  let center = { x: 0, y: 0 }, radius = 1;
  function update(event: PointerEvent): void {
    const dx = event.clientX - center.x, dy = event.clientY - center.y;
    const length = Math.hypot(dx, dy), scale = Math.min(1, length / radius);
    const x = length ? dx / length : 0, y = length ? dy / length : 0;
    const strength = Math.max(0, (scale - .14) / .86);
    thumb.style.transform = `translate(${x * scale * radius}px, ${y * scale * radius}px)`;
    options.move({ x: x * strength, y: y * strength });
  }
  function down(event: PointerEvent): void {
    if (pointer !== null || !options.enabled()) return;
    event.preventDefault();
    const bounds = pad.getBoundingClientRect();
    center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    radius = Math.max(1, bounds.width * .3);
    pointer = event.pointerId;
    pad.classList.add("is-active");
    options.start();
    try { pad.setPointerCapture(pointer); } catch { /* Capture is unavailable for synthetic events. */ }
    update(event);
  }
  function move(event: PointerEvent): void {
    if (event.pointerId !== pointer) return;
    event.preventDefault();
    update(event);
  }
  function reset(): void {
    const previous = pointer;
    pointer = null;
    pad.classList.remove("is-active");
    thumb.style.transform = "translate(0px, 0px)";
    if (previous !== null) {
      options.end();
      try { pad.releasePointerCapture(previous); } catch { /* The browser may already have released it. */ }
    }
  }
  function release(event: PointerEvent): void { if (event.pointerId === pointer) reset(); }
  pad.addEventListener("pointerdown", down);
  pad.addEventListener("pointermove", move);
  pad.addEventListener("lostpointercapture", release);
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  return {
    reset,
    dispose(): void {
      reset();
      pad.removeEventListener("pointerdown", down);
      pad.removeEventListener("pointermove", move);
      pad.removeEventListener("lostpointercapture", release);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    },
  };
}
