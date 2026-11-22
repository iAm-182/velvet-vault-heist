// The Velvet Vault — the museum floor: walls, rooms, cover, loot, cameras,
// guard patrols, the vent crawlspace and the getaway van. One fixed layout so
// the whole heist reads in a single frame.
import { FLOOR, LOOT_VALUES } from './config.js';

// Room labels painted faintly on the floor, so the judge can read the layout.
export const ROOMS = [
  { name: 'ENTRY HALL', x: 60, y: 200 },
  { name: 'GALLERY', x: 470, y: 90 },
  { name: 'ANTECHAMBER', x: 830, y: 90 },
  { name: 'THE VAULT', x: 1060, y: 90 },
  { name: 'SERVICE CORRIDOR', x: 560, y: 668 },
];

/**
 * Build the level. Walls and cover are rectangles {x, y, width, height} that
 * block movement and line of sight. Doors are the gaps left between segments.
 * Layout (1280x720, HUD on top, floor y 74..702):
 *   - top strip y 74..124 is the vent crawlspace, entered through grates;
 *   - three divider walls split Entry / Gallery / Antechamber / Vault;
 *   - a service corridor along the bottom links every room.
 */
export function buildLevel() {
  const walls = [
    // Outer shell.
    { x: 30, y: 64, width: 1220, height: 10 },
    { x: 30, y: 702, width: 1220, height: 10 },
    { x: 30, y: 64, width: 10, height: 648 },
    { x: 1240, y: 64, width: 10, height: 648 },
    // Vent floor: gaps at the two grates (x 60..100 and 930..970).
    { x: 40, y: 124, width: 20, height: 10 },
    { x: 100, y: 124, width: 830, height: 10 },
    { x: 970, y: 124, width: 260, height: 10 },
    // Entry | Gallery divider, door gap y 284..360.
    { x: 300, y: 64, width: 10, height: 220 },
    { x: 300, y: 360, width: 10, height: 200 },
    // Gallery | Antechamber divider, door gap y 244..320.
    { x: 770, y: 64, width: 10, height: 180 },
    { x: 770, y: 320, width: 10, height: 240 },
    // Antechamber | Vault divider, vault door gap y 324..400 (locked gate).
    { x: 1010, y: 64, width: 10, height: 260 },
    { x: 1010, y: 400, width: 10, height: 160 },
    // Corridor ceiling, door gaps into each room.
    { x: 40, y: 560, width: 100, height: 10 },
    { x: 180, y: 560, width: 320, height: 10 },
    { x: 540, y: 560, width: 320, height: 10 },
    { x: 900, y: 560, width: 200, height: 10 },
    { x: 1140, y: 560, width: 90, height: 10 },
  ];

  // Display cases, statues and planters: cover that blocks sight and movement.
  const cover = [
    { x: 420, y: 220, width: 90, height: 50, kind: 'case' },
    { x: 580, y: 220, width: 90, height: 50, kind: 'case' },
    { x: 420, y: 420, width: 90, height: 50, kind: 'case' },
    { x: 580, y: 420, width: 90, height: 50, kind: 'case' },
    { x: 350, y: 150, width: 30, height: 30, kind: 'statue' },
    { x: 700, y: 150, width: 30, height: 30, kind: 'statue' },
    { x: 350, y: 500, width: 44, height: 30, kind: 'planter' },
    { x: 700, y: 500, width: 44, height: 30, kind: 'planter' },
    { x: 860, y: 300, width: 90, height: 44, kind: 'case' },
    { x: 820, y: 470, width: 40, height: 28, kind: 'planter' },
    { x: 1060, y: 470, width: 40, height: 28, kind: 'planter' },
    { x: 1180, y: 470, width: 40, height: 28, kind: 'planter' },
  ];

  // The three loot targets. The painting hangs on the gallery wall, the gold
  // sits in an open case, the diamond waits inside the vault safe.
  const loot = [
    {
      id: 'painting', name: 'Sunset Portrait', value: LOOT_VALUES.painting,
      x: 520, y: 152, radius: 26, holdSeconds: 1.5, taken: false, progress: 0,
      hint: 'Hold E to lift the painting',
    },
    {
      id: 'gold', name: 'Gold Bars', value: LOOT_VALUES.gold,
      x: 905, y: 322, radius: 24, holdSeconds: 0, taken: false, progress: 0,
      hint: 'Walk over the gold to pocket it',
    },
    {
      id: 'diamond', name: 'The Velvet Diamond', value: LOOT_VALUES.diamond,
      x: 1165, y: 178, radius: 26, holdSeconds: 3, taken: false, progress: 0,
      hint: 'Hold E to crack the safe',
    },
  ];

  // The vault safe the diamond sits in (drawn, and the lockpick target).
  const safe = { x: 1120, y: 148, width: 90, height: 62 };

  // The locked vault door: hold E beside it to pick it open, once.
  const vaultDoor = {
    x: 1010, y: 324, width: 10, height: 76,
    locked: true, progress: 0, pickSeconds: 2,
  };

  // Wall cameras: a mount point, a facing, and a sweep.
  const cameras = [
    { id: 'cam1', x: 762, y: 82, baseAngle: Math.PI, label: 'CAM 1' },
    { id: 'cam2', x: 1002, y: 82, baseAngle: Math.PI, label: 'CAM 2' },
    { id: 'cam3', x: 1232, y: 300, baseAngle: Math.PI, label: 'CAM 3' },
  ];

  // Guard patrols: named guards, each looping their waypoints.
  const guards = [
    {
      id: 'marco', name: 'Marco', x: 360, y: 200,
      waypoints: [[360, 200], [700, 200], [700, 480], [360, 480]],
    },
    {
      id: 'rosa', name: 'Rosa', x: 820, y: 200,
      waypoints: [[820, 200], [980, 200], [980, 480], [860, 640], [820, 480]],
    },
    {
      id: 'viktor', name: 'Viktor', x: 1050, y: 250,
      waypoints: [[1050, 250], [1200, 250], [1200, 480], [1050, 480]],
    },
  ];

  // Vent grates: the crawlspace entries. Standing in the vent, no guard or
  // camera can see the thief.
  const grates = [
    { x: 60, y: 100, width: 40, height: 24 },
    { x: 930, y: 100, width: 40, height: 24 },
  ];

  return {
    walls,
    cover,
    loot,
    safe,
    vaultDoor,
    cameras,
    guards,
    grates,
    // Thief start, bottom-left of the entry hall.
    spawn: { x: 80, y: 620 },
    // Getaway van, outside the entry door at the bottom-left wall.
    exit: { x: 44, y: 636, width: 76, height: 56 },
    ventBand: { yMin: FLOOR.y, yMax: 124 },
    floor: FLOOR,
  };
}

/** Every solid rectangle: walls plus cover, for collision and line of sight. */
export function solidRects(level) {
  return level.walls.concat(level.cover);
}
