import type { Minigame } from "../types";
import { mountSnakePit } from "./ui";
import "./snake-pit.css";

export const snakePit: Minigame = {
  slug: "snake-pit",
  title: "Snake Pit: Escape the Burrow",
  motivators: ["challenge"],
  author: "jianyangg",
  mount: mountSnakePit,
};
