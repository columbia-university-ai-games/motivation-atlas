import { renderRoute } from "../app";
import { parseRoute } from "../router";

type Section = "play" | "examples" | "sources" | "contribute";
const routeKey = (hash: string) => JSON.stringify(parseRoute(hash));
function allowedSection(hash: string): string | null {
  const route = parseRoute(hash);
  const section = new URLSearchParams(hash.split("?")[1]).get("section");
  return section && ((route.page === "motivator" && ["play", "examples", "sources"].includes(section))
    || (route.page === "about" && section === "contribute")) ? section : null;
}

export function navigateSection(section: Section): void {
  const hash = `${location.hash.split("?")[0]}?section=${section}`;
  if (allowedSection(hash)) document.dispatchEvent(new CustomEvent("atlas:navigate", { detail: hash }));
}

/** Own route lifetimes; section navigation keeps the current minigame alive. */
export function startNavigation(root: HTMLElement): () => void {
  const previousRestoration = history.scrollRestoration;
  history.scrollRestoration = "manual";
  let cleanup = () => {};
  let currentKey = "";
  let lastHash = "";
  let restoring = false;
  function save(): void {
    if (restoring || routeKey(location.hash) !== currentKey) return;
    const active = document.activeElement;
    const focusId = active && root.contains(active) && active.id ? active.id : undefined;
    history.replaceState({ ...history.state, atlas: { scrollY: window.scrollY, ...(focusId ? { focusId } : {}) } }, "");
  }
  function show(restore: boolean): void {
    const hash = location.hash;
    const key = routeKey(hash);
    const sameSectionPage = key === currentKey && ["motivator", "about"].includes(parseRoute(hash).page);
    const saved = restore ? history.state?.atlas : undefined;
    restoring = true;
    if (!sameSectionPage) { cleanup(); cleanup = renderRoute(root, hash); }
    currentKey = key; lastHash = hash;
    const section = allowedSection(hash);
    const savedTarget = typeof saved?.focusId === "string" ? document.getElementById(saved.focusId) : null;
    const target = savedTarget && root.contains(savedTarget) ? savedTarget
      : section ? root.querySelector<HTMLElement>(`#${section}`) : root.querySelector<HTMLElement>("h1");
    if (target) {
      if (!target.hasAttribute("tabindex") && /^H[1-6]$/.test(target.tagName)) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
    if (saved && Number.isFinite(saved.scrollY)) window.scrollTo(0, saved.scrollY);
    else if (section && target) target.scrollIntoView?.({ block: "start" });
    else window.scrollTo(0, 0);
    restoring = false;
  }
  function go(hash: string): void {
    save();
    if (hash !== location.hash) history.pushState(null, "", hash);
    show(false);
  }
  function click(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const link = (event.target as Element).closest("a");
    const href = link?.getAttribute("href");
    if (!href?.startsWith("#/") || link?.hasAttribute("download") || link?.getAttribute("target")) return;
    event.preventDefault(); go(href);
  }
  const keyboard = () => save();
  const pop = () => { show(true); };
  const hash = () => { if (location.hash !== lastHash) show(true); };
  const section = (event: Event) => go((event as CustomEvent<string>).detail);
  document.addEventListener("click", click);
  document.addEventListener("keydown", keyboard, true);
  document.addEventListener("focusin", save);
  document.addEventListener("atlas:navigate", section);
  window.addEventListener("scroll", save, { passive: true });
  window.addEventListener("popstate", pop);
  window.addEventListener("hashchange", hash);
  show(true);
  return () => {
    document.removeEventListener("click", click);
    document.removeEventListener("keydown", keyboard, true);
    document.removeEventListener("focusin", save);
    document.removeEventListener("atlas:navigate", section);
    window.removeEventListener("scroll", save);
    window.removeEventListener("popstate", pop);
    window.removeEventListener("hashchange", hash);
    cleanup(); history.scrollRestoration = previousRestoration;
  };
}
