import type { Maze } from "./game";

const ROCKS = [
  { x: 8, y: 7, width: 3, height: 15, gap: 14 },
  { x: 18, y: 5, width: 3, height: 15, gap: 11 },
  { x: 13, y: 13, width: 2, height: 3, gap: -1 },
];

export const SHORTCUTS = ROCKS.filter((rock) => rock.gap >= 0).map((rock) => ({
  x: rock.x, y: rock.gap, length: rock.width,
}));

export const BURROW: Maze = {
  rows: Array.from({ length: 29 }, (_, y) => Array.from({ length: 29 }, (_, x) => {
    const rock = ROCKS.some((rock) => x >= rock.x && x < rock.x + rock.width
      && y >= rock.y && y < rock.y + rock.height && y !== rock.gap);
    return x === 0 || x === 28 || y === 0 || y === 28 || rock ? "#" : ".";
  }).join("")),
  start: [{ x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 }],
  direction: "right",
  eggs: [
    { x: 14, y: 24 }, { x: 24, y: 8 }, { x: 4, y: 22 },
    { x: 24, y: 24 }, { x: 10, y: 3 }, { x: 6, y: 3 },
  ],
  exit: { x: 4, y: 4 },
};
