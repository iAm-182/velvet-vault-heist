// The Velvet Vault — the thief: WASD/arrows to move, Shift to sneak, E to
// interact (pick locks, lift loot), 1/2/3 for tools, mouse click to throw a
// decoy coin. Movement slides along walls; the vent hides the thief.
import { THIEF, resolveCircle } from './config.js';

export class Thief {
  constructor(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.spawnX = spawn.x;
    this.spawnY = spawn.y;
    this.sneaking = false;
    this.moving = false;
    this.facing = -Math.PI / 2;
    this.inVent = false;
    this.invulnerable = 0;
    this.interactTarget = null; // loot id or 'vaultDoor' while holding E
    this.interactProgress = 0;
  }

  /** Move from the held keys; returns true when the thief actually moved. */
  step(dt, keys, solids, ventBand) {
    let dx = 0;
    let dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    this.sneaking = Boolean(keys.sneak);
    this.moving = dx !== 0 || dy !== 0;
    if (this.moving) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
      this.facing = Math.atan2(dy, dx);
    }
    const inVentNow = this.y > ventBand.yMin && this.y < ventBand.yMax;
    this.inVent = inVentNow;
    const speed = inVentNow ? THIEF.ventSpeed : this.sneaking ? THIEF.sneakSpeed : THIEF.walkSpeed;
    const nx = this.x + dx * speed * dt;
    const ny = this.y + dy * speed * dt;
    const placed = resolveCircle(nx, ny, THIEF.radius, solids);
    this.x = placed.x;
    this.y = placed.y;
    if (this.invulnerable > 0) this.invulnerable -= dt;
    return this.moving;
  }

  distanceTo(x, y) {
    return Math.hypot(this.x - x, this.y - y);
  }

  resetToSpawn() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.invulnerable = 2;
    this.interactTarget = null;
    this.interactProgress = 0;
  }
}

/** Read the keyboard into a plain keys object the thief understands. */
export function readKeys(pressed) {
  return {
    left: pressed.has('ArrowLeft') || pressed.has('KeyA'),
    right: pressed.has('ArrowRight') || pressed.has('KeyD'),
    up: pressed.has('ArrowUp') || pressed.has('KeyW'),
    down: pressed.has('ArrowDown') || pressed.has('KeyS'),
    sneak: pressed.has('ShiftLeft') || pressed.has('ShiftRight'),
    interact: pressed.has('KeyE'),
  };
}
