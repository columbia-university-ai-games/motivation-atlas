import "./styles.css";
import { renderRoute } from "./app";

const app = document.getElementById("app")!;
let cleanup: () => void = () => {};

function render(): void {
  cleanup();
  cleanup = renderRoute(app, location.hash);
  window.scrollTo(0, 0);
}

addEventListener("hashchange", render);
render();
