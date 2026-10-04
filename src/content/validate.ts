import type { GamesFile, Motivator, Proposal, Video } from "./types.ts";

export interface ContentInput {
  motivators: Motivator[];
  gamesFile: GamesFile;
  proposals: Proposal[];
  videos: Video[];
}

const KINDS = ["video game", "tabletop", "activity"];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const GITHUB = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

const filled = (value: unknown): boolean => typeof value === "string" && value.trim() !== "";

/** The part of a citation up to and including its first year, which must appear in the note. */
export function citeKey(cite: string): string {
  const match = /^(.*?\d{4}[a-z]?)/.exec(cite);
  return (match ? match[1] : cite).trim();
}

export function validateContent(input: ContentInput): string[] {
  const errors: string[] = [];
  const motivators = new Map(input.motivators.map((m) => [m.slug, m]));
  const gameSlugs = new Set<string>();

  input.gamesFile.games.forEach((g, i) => {
    const where = `content/games.json games[${i}] (${g.slug})`;
    if (typeof g.slug !== "string" || !SLUG.test(g.slug)) errors.push(`${where}: slug must be lowercase words joined by hyphens`);
    else if (gameSlugs.has(g.slug)) errors.push(`${where}: slug is used twice`);
    else gameSlugs.add(g.slug);
    if (!filled(g.title)) errors.push(`${where}: title is empty`);
    if (!KINDS.includes(g.kind)) errors.push(`${where}: kind must be one of ${KINDS.join(", ")}`);
  });

  const linked = new Set<string>();
  const sourcedPairs = new Set<string>();
  const motivatorsWithGames = new Set<string>();

  input.gamesFile.ties.forEach((t, i) => {
    const where = `content/games.json ties[${i}] (${t.game} to ${t.motivator})`;
    if (!gameSlugs.has(t.game)) errors.push(`${where}: no game with slug "${t.game}"`);
    const m = motivators.get(t.motivator);
    if (!m) {
      errors.push(`${where}: no motivator "${t.motivator}"`);
      return;
    }
    if (!filled(t.asNamed) || !m.exampleLine.includes(t.asNamed)) {
      errors.push(`${where}: "${t.asNamed}" does not appear in the ${m.shortName} example games line of the note`);
    }
    const key = citeKey(t.cite ?? "");
    if (!key || !m.exampleLine.includes(key)) {
      errors.push(`${where}: citation "${t.cite}" does not appear in the ${m.shortName} example games line of the note`);
    }
    linked.add(t.game);
    sourcedPairs.add(`${t.game}|${t.motivator}`);
    motivatorsWithGames.add(t.motivator);
  });

  const proposalKeys = new Set<string>();
  input.proposals.forEach((p, i) => {
    const where = `content/proposals.json [${i}] (${p.game} to ${p.motivator})`;
    if (!gameSlugs.has(p.game)) errors.push(`${where}: no game with slug "${p.game}"; add it to content/games.json first`);
    if (!motivators.has(p.motivator)) errors.push(`${where}: no motivator "${p.motivator}"; use one of ${[...motivators.keys()].join(", ")}`);
    if (!filled(p.mechanic)) errors.push(`${where}: name the mechanic`);
    if (!filled(p.dynamic)) errors.push(`${where}: name the dynamic`);
    if (typeof p.github !== "string" || !GITHUB.test(p.github)) errors.push(`${where}: github must be your GitHub username`);
    if (sourcedPairs.has(`${p.game}|${p.motivator}`)) errors.push(`${where}: the note already ties this game to this motivator`);
    const key = `${p.game}|${p.motivator}|${p.github}`;
    if (proposalKeys.has(key)) errors.push(`${where}: you already proposed this tie`);
    proposalKeys.add(key);
    linked.add(p.game);
  });

  for (const slug of gameSlugs) if (!linked.has(slug)) errors.push(`content/games.json: game "${slug}" has no tie and no proposal`);
  for (const m of input.motivators) if (!motivatorsWithGames.has(m.slug)) errors.push(`content/games.json: motivator "${m.slug}" has no sourced games`);

  const videoKeys = new Set<string>();
  input.videos.forEach((v, i) => {
    const where = `content/videos.csv row ${i + 2} (${v.game})`;
    if (!gameSlugs.has(v.game)) errors.push(`${where}: no game with slug "${v.game}"`);
    if (typeof v.youtubeId !== "string" || !YOUTUBE_ID.test(v.youtubeId)) errors.push(`${where}: youtubeId "${v.youtubeId}" is not an 11-character YouTube id`);
    if (!filled(v.title)) errors.push(`${where}: title is empty`);
    if (!filled(v.channel)) errors.push(`${where}: channel is empty`);
    if (v.start !== undefined && !(Number.isInteger(v.start) && v.start >= 0)) errors.push(`${where}: start must be a whole number of seconds`);
    const key = `${v.game}|${v.youtubeId}`;
    if (videoKeys.has(key)) errors.push(`${where}: this video is already listed for this game`);
    videoKeys.add(key);
  });

  return errors;
}
