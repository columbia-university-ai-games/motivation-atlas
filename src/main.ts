import "./styles.css";
import { loadAtlas } from "./content/atlas";
import { renderOverview } from "./pages/overview";

const app = document.getElementById("app")!;
renderOverview(app, loadAtlas(), (slug) => console.log("open", slug));
