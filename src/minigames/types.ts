export interface Minigame {
  /** Folder name under src/minigames/. */
  slug: string;
  title: string;
  /** Motivator slugs this minigame demonstrates, such as "chance". */
  motivators: string[];
  /** Your GitHub username. */
  author?: string;
  /** Render into el. Return a function that removes everything you added, including timers and listeners. */
  mount(el: HTMLElement): () => void;
}
