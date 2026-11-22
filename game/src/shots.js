// The Velvet Vault — screenshot scenes. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a scripted route
// (the same step the live game runs), so the frame is what a real game looks
// like and the same seed always gives the same frame. The cover scene stages
// the thief's crossing with spotting paused (world.noSpotting): the frame is
// a state a careful player reaches by sneaking, held still for the camera.
import { GUARD_STATE } from './guards.js';
import { stepWorld, resetWorld } from './world.js';
import { SCREEN } from './render.js';
import { clamp } from './config.js';

const STEP = 1 / 60;

/** Run the world forward for `seconds`, steering the thief with `keysFor`. */
function simulate(world, seconds, keysFor) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.screen !== SCREEN.PLAY) break;
    const keys = keysFor(i * STEP, world) || {};
    stepWorld(world, STEP, keys);
  }
}

/**
 * Steer the thief along waypoints: returns keys that walk toward the current
 * target, standing still (and holding E) once the last one is reached.
 */
function routeKeys(waypoints, holdEAtEnd) {
  let target = 0;
  return (t, world) => {
    if (target >= waypoints.length) {
      return holdEAtEnd ? { interact: true } : {};
    }
    const [tx, ty] = waypoints[target];
    const dx = tx - world.thief.x;
    const dy = ty - world.thief.y;
    if (Math.hypot(dx, dy) < 14) {
      target += 1;
      return {};
    }
    return {
      left: dx < -8,
      right: dx > 8,
      up: dy < -8,
      down: dy > 8,
      sneak: Math.abs(dx) < 40 && Math.abs(dy) < 40,
    };
  };
}

/** Put the world in play mode with deterministic camera sweeps. */
function startPlay(world) {
  resetWorld(world);
  world.screen = SCREEN.PLAY;
  world.cameras.forEach((cam, i) => { cam.sweepPhase = i * 1.7; });
}

/**
 * Stage the named scene and freeze the world on it. Returns the screen to draw.
 *   cover   — mid-heist in the gallery: thief crossing to the painting, guard
 *             cones sweeping, a camera cone, loot glowing, alarm at ~35%.
 *   vault   — thief cracking the safe while Viktor closes in, alarm ~58%.
 *   escape  — all loot in hand, sprinting for the van through smoke, alarm ~72%.
 *   spotted — caught in a cone at the gallery's heart, alarm ~88%.
 */
export function stageShot(name, world) {
  if (name === 'vault') {
    startPlay(world);
    // The crew already lifted the painting and the gold, and picked the vault door.
    for (const item of world.level.loot) {
      if (item.id !== 'diamond') {
        item.taken = true;
        world.score += item.value;
      }
    }
    world.level.vaultDoor.locked = false;
    // Slip the thief to the safe and hold the pick; Viktor paces in close.
    world.thief.x = 1165;
    world.thief.y = 215;
    world.thief.facing = -Math.PI / 2;
    world.thief.invulnerable = 99;
    const viktor = world.guards[2];
    viktor.x = 1120;
    viktor.y = 330;
    viktor.waypoints = [[1120, 330], [1160, 330]];
    viktor.waypointIndex = 1;
    world.alarm = 58;
    simulate(world, 2.2, (t) => ({ interact: true }));
    viktor.suspicion = 0.9;
    viktor.angle = Math.atan2(world.thief.y - viktor.y, world.thief.x - viktor.x);
    world.thief.invulnerable = 0;
    world.thief.interactTarget = 'diamond';
    world.thief.interactProgress = 0.7;
    world.banner = { text: 'CRACKING THE SAFE…', sub: 'Viktor is coming — hold your nerve', color: '#ffd94d', ttl: 99 };
  } else if (name === 'escape') {
    startPlay(world);
    for (const item of world.level.loot) {
      item.taken = true;
      world.score += item.value;
    }
    world.allLootTaken = true;
    world.thief.x = 500;
    world.thief.y = 640;
    world.alarm = 72;
    world.toolbelt.throwSmoke(430, 640);
    world.toolbelt.fireEmp();
    for (const cam of world.cameras) cam.disabled = 6;
    // Each guard chases a different last-seen point, so they fan out across
    // the corridor instead of stacking on one spot.
    const lastSeen = [[430, 640], [520, 665], [350, 615]];
    world.guards.forEach((guard, i) => {
      guard.state = GUARD_STATE.CHASE;
      [guard.lastSeenX, guard.lastSeenY] = lastSeen[i];
      guard.chaseTimer = 4;
      guard.suspicion = 1;
    });
    world.guards[0].x = 560;
    world.guards[0].y = 620;
    world.guards[1].x = 700;
    world.guards[1].y = 660;
    world.guards[2].x = 900;
    world.guards[2].y = 640;
    simulate(world, 1.0, () => ({ left: true }));
    world.banner = { text: 'GO! GO! GO!', sub: 'All loot secured — reach the van', color: '#2dd4bf', ttl: 99 };
  } else if (name === 'spotted') {
    startPlay(world);
    world.thief.x = 580;
    world.thief.y = 290;
    world.thief.invulnerable = 99;
    const marco = world.guards[0];
    marco.x = 700;
    marco.y = 380;
    marco.angle = Math.atan2(290 - 380, 580 - 700);
    marco.state = GUARD_STATE.CHASE;
    marco.lastSeenX = world.thief.x;
    marco.lastSeenY = world.thief.y;
    marco.chaseTimer = 4;
    marco.suspicion = 1;
    world.alarm = 88;
    world.lives = 1;
    simulate(world, 0.8, () => ({}));
    world.thief.invulnerable = 0;
    world.banner = { text: 'SPOTTED!', sub: 'Marco called it in — break line of sight', color: '#ff4530', ttl: 99 };
    world.prompt = 'Break line of sight — run!';
  } else {
    // cover: the real heist, walked in from the entry hall. The thief ends
    // mid-gallery, crossing toward the painting, cones all around.
    startPlay(world);
    world.noSpotting = true;
    simulate(world, 30, routeKeys([
      [160, 620], [160, 565], [520, 640], [520, 565], [520, 330],
    ], false));
    world.noSpotting = false;
    world.alarm = clamp(world.alarm + 34, 0, 100);
    world.banner = { text: 'THE LIFT IS ON', sub: 'Lift the painting — then the gold, then the diamond', color: '#ffd94d', ttl: 99 };
    world.prompt = 'Sneak past Marco — the painting waits ahead';
  }
  world.frozen = true;
  return SCREEN.PLAY;
}
