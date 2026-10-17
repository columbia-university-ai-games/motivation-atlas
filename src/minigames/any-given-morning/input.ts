import type { Input, Screen } from "./game";

export interface Controls { read(): Input; clear(): void; dispose(): void }
export function bindInput(root: HTMLElement, touch: HTMLElement, screen: () => Screen, action: (kind: "menu" | "respawn") => void): Controls {
  const keys = new Set<string>(), pointers = new Map<number, string>();
  const removers: (() => void)[] = [];
  let interact = false;
  const listen = (target: EventTarget, name: string, handler: EventListener) => {
    target.addEventListener(name, handler); removers.push(() => target.removeEventListener(name, handler));
  };
  const moves = ["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"];
  const clear = () => { keys.clear(); pointers.clear(); interact = false; };
  listen(root, "keydown", ((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase(), state = screen();
    const editable = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
    if (key === "escape" && state !== "MENU") { event.preventDefault(); clear(); action("menu"); return; }
    if (editable) return;
    // Native menu buttons retain Enter/Space behavior.
    if (state === "DEAD" && (key === "r" || (key === "enter" && !(event.target instanceof HTMLButtonElement)))) {
      event.preventDefault(); if (!event.repeat) action("respawn"); return;
    }
    if (state !== "PLAY") return;
    if (moves.includes(key)) { event.preventDefault(); keys.add(key); }
    if (["e", " ", "enter"].includes(key) && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault(); if (!event.repeat) interact = true;
    }
  }) as EventListener);
  listen(window, "keyup", ((event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()); }) as EventListener);
  listen(window, "blur", clear);
  listen(document, "visibilitychange", clear);
  const labels: Record<string, string> = { up: "Move up", left: "Move left", down: "Move down", right: "Move right", interact: "Interact" };
  for (const [direction, label] of Object.entries(labels)) {
    const button = document.createElement("button"); button.type = "button";
    button.dataset.direction = direction; button.setAttribute("aria-label", label);
    button.textContent = { up: "▲", left: "◀", down: "▼", right: "▶", interact: "A" }[direction]!;
    button.className = `agm-touch-${direction}`; touch.append(button);
    listen(button, "pointerdown", ((event: PointerEvent) => {
      if (screen() !== "PLAY") return;
      event.preventDefault(); button.setPointerCapture?.(event.pointerId);
      pointers.set(event.pointerId, direction);
    }) as EventListener);
    const release = ((event: PointerEvent) => {
      const pressed = pointers.get(event.pointerId);
      pointers.delete(event.pointerId);
      if (pressed === "interact" && event.type === "pointerup" && screen() === "PLAY") interact = true;
    }) as EventListener;
    listen(button, "pointerup", release); listen(button, "pointercancel", release); listen(button, "lostpointercapture", release);
    listen(button, "click", ((event: MouseEvent) => { if (event.detail === 0 && direction === "interact") interact = true; }) as EventListener);
  }
  return {
    read() {
      const active = (key: string, arrow: string, dir: string) => Number(keys.has(key) || keys.has(arrow) || [...pointers.values()].includes(dir));
      const x = active("d", "arrowright", "right") - active("a", "arrowleft", "left");
      const y = active("s", "arrowdown", "down") - active("w", "arrowup", "up");
      const result = { x, y, interact }; interact = false; return result;
    }, clear,
    dispose() { clear(); removers.forEach((remove) => remove()); touch.replaceChildren(); },
  };
}
