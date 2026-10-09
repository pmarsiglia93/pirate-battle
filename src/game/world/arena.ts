import { gameConfig } from '../config/gameConfig';
export interface Tile {
  x: number;
  y: number;
  sprite: number;
}
export const islands = [
  { x: 3, y: 2, width: 5, height: 4 },
  { x: 17, y: 8, width: 5, height: 4 },
];
export const solidCells = new Set<string>();
export const landTiles: Tile[] = [];
for (const island of islands) {
  for (let row = 0; row < island.height; row++)
    for (let col = 0; col < island.width; col++) {
      const x = island.x + col,
        y = island.y + row;
      solidCells.add(`${x},${y}`);
      const top = row === 0,
        bottom = row === island.height - 1,
        left = col === 0,
        right = col === island.width - 1;
      const sprite = top
        ? left
          ? 1
          : right
            ? 3
            : 2
        : bottom
          ? left
            ? 33
            : right
              ? 35
              : 34
          : left
            ? 17
            : right
              ? 19
              : 23;
      landTiles.push({
        x: x * gameConfig.world.tile,
        y: y * gameConfig.world.tile,
        sprite,
      });
    }
}
export function blocked(x: number, y: number, radius: number): boolean {
  const { width, height, tile } = gameConfig.world;
  if (
    x - radius < 0 ||
    y - radius < 0 ||
    x + radius > width ||
    y + radius > height
  )
    return true;
  for (
    let row = Math.floor((y - radius) / tile);
    row <= Math.floor((y + radius) / tile);
    row++
  )
    for (
      let col = Math.floor((x - radius) / tile);
      col <= Math.floor((x + radius) / tile);
      col++
    ) {
      if (!solidCells.has(`${col},${row}`)) continue;
      const nearX = Math.max(col * tile, Math.min(x, (col + 1) * tile));
      const nearY = Math.max(row * tile, Math.min(y, (row + 1) * tile));
      if ((x - nearX) ** 2 + (y - nearY) ** 2 <= radius ** 2) return true;
    }
  return false;
}
