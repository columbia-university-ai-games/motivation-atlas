import { echoesBelow } from "./index";
const host = document.getElementById("preview");
if (host) {
  const unmount = echoesBelow.mount(host);
  host.querySelector<HTMLElement>("[data-board]")?.focus({ preventScroll: true });
  if (import.meta.hot) import.meta.hot.dispose(unmount);
}
