import { ContentError, loadAtlas } from "./content/atlas";
import { h } from "./lib/dom";
import { renderExperiment } from "./pages/experiment";
import { renderExperiments } from "./pages/experiments";
import { renderGame } from "./pages/game";
import { renderAbout } from "./pages/about";
import { renderMotivator } from "./pages/motivator";
import { renderNote } from "./pages/note";
import { renderNotFound } from "./pages/not-found";
import { renderOverview } from "./pages/overview";
import { parseRoute } from "./router";

function renderContentError(root: HTMLElement, err: ContentError): () => void {
  const page = h("section", { class: "content-error" },
    h("h1", {}, "The content files have a problem"),
    h("p", {}, "Fix these, save, and the page reloads. The same list appears when you run npm test."),
    h("ul", {}, ...err.errors.map((e) => h("li", {}, e))),
  );
  root.replaceChildren(page);
  return () => page.remove();
}

export function renderRoute(root: HTMLElement, hash: string): () => void {
  const route = parseRoute(hash);
  if (route.page === "note") return renderNote(root);
  if (route.page === "about") return renderAbout(root);
  if (route.page === "notfound") return renderNotFound(root, `Nothing lives at ${route.path}.`);
  if (route.page === "experiment") return renderExperiment(root, route.slug);
  if (route.page === "experiments") return renderExperiments(root);
  let atlas;
  try {
    atlas = loadAtlas();
  } catch (err) {
    if (err instanceof ContentError) return renderContentError(root, err);
    throw err;
  }
  if (route.page === "game") return renderGame(root, atlas, route.slug);
  if (route.page === "motivator") return renderMotivator(root, atlas, route.slug);
  return renderOverview(root, atlas, hash);
}
