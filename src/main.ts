import "./styles.css";
import { parseRoute } from "./router";

const app = document.getElementById("app")!;
function render(): void {
  app.textContent = `Route: ${parseRoute(location.hash).page}`;
}
addEventListener("hashchange", render);
render();
