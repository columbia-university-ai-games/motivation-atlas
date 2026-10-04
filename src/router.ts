export type Route =
  | { page: "overview" }
  | { page: "game"; slug: string }
  | { page: "motivator"; slug: string }
  | { page: "note" }
  | { page: "about" }
  | { page: "notfound"; path: string };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, "") || "/";
  if (path === "/") return { page: "overview" };
  if (path === "/note") return { page: "note" };
  if (path === "/about") return { page: "about" };
  const game = /^\/g\/([a-z0-9-]+)$/.exec(path);
  if (game) return { page: "game", slug: game[1] };
  const motivator = /^\/m\/([a-z0-9-]+)$/.exec(path);
  if (motivator) return { page: "motivator", slug: motivator[1] };
  return { page: "notfound", path };
}
