// The Velvet Vault — the rules: alarm, loot, lockpicking, being spotted,
// being busted, and the getaway. Pure simulation, no DOM: the same step runs
// the live game and the staged screenshot scenes.
import { ALARM, CAMERA, GUARD, TOOLS, clamp } from './config.js';
import { buildLevel, solidRects } from './level.js';
import { Guard, GUARD_STATE } from './guards.js';
import { Camera } from './cameras.js';
import { Thief } from './player.js';
import { Toolbelt } from './tools.js';
import { SCREEN } from './render.js';

export function rankFor(time, peakAlarm) {
  if (time < 180 && peakAlarm < 50) return 'S';
  if (time < 240 && peakAlarm < 70) return 'A';
  if (time < 360) return 'B';
  return 'C';
}

export function createWorld() {
  const level = buildLevel();
  const world = {
    level,
    solids: solidRects(level),
    guards: level.guards.map((def) => new Guard(def)),
    cameras: level.cameras.map((def) => new Camera(def)),
    thief: new Thief(level.spawn),
    toolbelt: new Toolbelt(),
    screen: SCREEN.TITLE,
    paused: false,
    frozen: false,
    time: 0,
    alarm: 0,
    peakAlarm: 0,
    lives: 3,
    score: 0,
    timesSpotted: 0,
    banner: null,
    prompt: null,
    allLootTaken: false,
    rank: null,
    best: 0,
    stepTimer: 0,
  };
  try {
    world.best = Number(window.localStorage.getItem('velvet-vault-best') || 0);
  } catch { world.best = 0; }
  return world;
}

export function resetWorld(world) {
  const fresh = createWorld();
  // Keep the best score across runs.
  const best = world.best;
  Object.assign(world, fresh);
  world.best = best;
}

function showBanner(world, text, sub, color) {
  world.banner = { text, sub, color, ttl: 2.6 };
}

function lootTakenCount(world) {
  return world.level.loot.filter((item) => item.taken).length;
}

/**
 * One simulation step. `keys` is the plain object from player.readKeys plus
 * optional one-shot flags {smoke, emp, decoyX, decoyY}. Returns the events
 * that happened, so the shell can play sounds: spotted, tripped, pickup,
 * busted, win, lose, lockdown, door, lockTick, step.
 */
export function stepWorld(world, dt, keys) {
  const events = [];
  if (world.screen !== SCREEN.PLAY || world.paused || world.frozen) return events;
  world.time += dt;

  const thief = world.thief;
  const inSmoke = world.toolbelt.thiefInSmoke(thief.x, thief.y);
  const moved = thief.step(dt, keys, world.solids, world.level.ventBand);
  if (moved) {
    world.stepTimer -= dt;
    if (world.stepTimer <= 0) {
      world.stepTimer = thief.sneaking ? 0.5 : 0.32;
      events.push('step');
    }
  }
  world.toolbelt.step(dt);

  // One-shot tools, from keys or a click.
  if (keys.smoke) {
    const cloud = world.toolbelt.throwSmoke(thief.x, thief.y);
    if (cloud) events.push('smoke');
  }
  if (keys.emp) {
    const seconds = world.toolbelt.fireEmp();
    if (seconds > 0) {
      world.alarm = clamp(world.alarm + ALARM.empNoise, 0, ALARM.max);
      for (const cam of world.cameras) cam.disabled = Math.max(cam.disabled, seconds);
      events.push('emp');
    }
  }
  if (typeof keys.decoyX === 'number') {
    const coin = world.toolbelt.throwDecoy(keys.decoyX, keys.decoyY);
    if (coin) {
      coin.lured = false;
      events.push('decoy');
    }
  }

  // Decoy coins pull nearby guards over to look.
  for (const coin of world.toolbelt.decoys) {
    if (coin.lured) continue;
    coin.lured = true;
    for (const guard of world.guards) {
      if (Math.hypot(guard.x - coin.x, guard.y - coin.y) < TOOLS.decoy.lureRadius) {
        guard.investigate(coin.x, coin.y);
      }
    }
  }

  // Interactions: the vault door, then the loot.
  thief.interactTarget = null;
  thief.interactProgress = 0;
  const door = world.level.vaultDoor;
  const doorCx = door.x + door.width / 2;
  const doorCy = door.y + door.height / 2;
  if (door.locked && thief.distanceTo(doorCx, doorCy) < 54) {
    if (keys.interact) {
      door.progress += dt / door.pickSeconds;
      thief.interactTarget = 'vaultDoor';
      thief.interactProgress = clamp(door.progress, 0, 1);
      if (Math.random() < dt * 6) events.push('lockTick');
      if (door.progress >= 1) {
        door.locked = false;
        events.push('door');
        showBanner(world, 'VAULT OPEN', 'The diamond is yours to take', '#ffd94d');
      }
    } else {
      door.progress = Math.max(0, door.progress - dt * 0.5);
    }
  }
  for (const item of world.level.loot) {
    if (item.taken) continue;
    const near = thief.distanceTo(item.x, item.y) < item.radius + 24;
    if (item.id === 'diamond' && door.locked) continue; // safe is behind the door
    if (!near) {
      item.progress = Math.max(0, item.progress - dt * 0.5);
      continue;
    }
    if (item.holdSeconds === 0) {
      takeLoot(world, item, events);
      continue;
    }
    if (keys.interact) {
      item.progress += dt / item.holdSeconds;
      thief.interactTarget = item.id;
      thief.interactProgress = clamp(item.progress, 0, 1);
      if (Math.random() < dt * 6) events.push('lockTick');
      if (item.progress >= 1) takeLoot(world, item, events);
    } else {
      item.progress = Math.max(0, item.progress - dt * 0.5);
    }
  }

  // Guards: patrol, watch, chase, catch.
  for (const guard of world.guards) {
    const result = guard.step(dt, thief, world.solids, inSmoke, thief.inVent, world.noSpotting);
    if (result === 'spotted') {
      world.alarm = clamp(world.alarm + ALARM.guardSpotted, 0, ALARM.max);
      world.timesSpotted += 1;
      events.push('spotted');
      showBanner(world, 'SPOTTED!', `${guard.name} called it in — break line of sight`, '#ff4530');
    }
    if (guard.state === GUARD_STATE.CHASE && thief.invulnerable <= 0
      && Math.hypot(guard.x - thief.x, guard.y - thief.y) < GUARD.catchDistance) {
      world.lives -= 1;
      world.alarm = clamp(world.alarm + ALARM.busted, 0, ALARM.max);
      events.push('busted');
      if (world.lives <= 0) {
        world.screen = SCREEN.LOSE;
        events.push('lose');
        return events;
      }
      showBanner(world, 'BUSTED!', 'You slipped away — but the alarm jumped', '#ff4530');
      thief.resetToSpawn();
      for (const g of world.guards) {
        g.state = GUARD_STATE.PATROL;
        g.suspicion = 0.4;
        g.investigateTarget = null;
      }
    }
  }

  // Cameras: sweep, lock on, trip.
  for (const cam of world.cameras) {
    if (world.toolbelt.empTimeLeft > 0) cam.disabled = Math.max(cam.disabled, world.toolbelt.empTimeLeft);
    const result = cam.step(dt, thief, world.solids, inSmoke, thief.inVent, world.noSpotting);
    if (result === 'tripped') {
      world.alarm = clamp(world.alarm + CAMERA.tripAlarm, 0, ALARM.max);
      world.timesSpotted += 1;
      events.push('tripped');
      showBanner(world, 'CAMERA TRIP!', 'A camera locked onto you', '#ff4530');
    }
  }

  // The alarm always decays when nobody is watching — slowly.
  world.alarm = clamp(world.alarm - ALARM.decayPerSecond * dt, 0, ALARM.max);
  world.peakAlarm = Math.max(world.peakAlarm, world.alarm);
  if (world.alarm >= ALARM.max) {
    world.screen = SCREEN.LOCKDOWN;
    events.push('lockdown');
    return events;
  }

  // The getaway: all three pieces of loot, then reach the van.
  world.allLootTaken = lootTakenCount(world) === world.level.loot.length;
  const exit = world.level.exit;
  if (world.allLootTaken
    && thief.x > exit.x && thief.x < exit.x + exit.width
    && thief.y > exit.y && thief.y < exit.y + exit.height) {
    world.screen = SCREEN.WIN;
    world.rank = rankFor(world.time, world.peakAlarm);
    if (world.score > world.best) {
      world.best = world.score;
      try { window.localStorage.setItem('velvet-vault-best', String(world.best)); } catch { /* no storage */ }
    }
    events.push('win');
    return events;
  }

  // The contextual prompt along the bottom of the screen.
  world.prompt = promptFor(world);

  if (world.banner) {
    world.banner.ttl -= dt;
    if (world.banner.ttl <= 0) world.banner = null;
  }
  return events;
}

function takeLoot(world, item, events) {
  item.taken = true;
  world.score += item.value;
  events.push('pickup');
  if (lootTakenCount(world) === world.level.loot.length) {
    showBanner(world, 'ALL LOOT SECURED', 'Get to the van — now!', '#2dd4bf');
  } else {
    showBanner(world, `${item.name.toUpperCase()} — $${item.value}K`, 'One less thing to carry', '#ffd94d');
  }
}

function promptFor(world) {
  const thief = world.thief;
  const door = world.level.vaultDoor;
  if (door.locked && thief.distanceTo(door.x + 5, door.y + 38) < 54) {
    return 'Vault door locked — hold E to pick it';
  }
  for (const item of world.level.loot) {
    if (item.taken || item.holdSeconds === 0) continue;
    if (item.id === 'diamond' && door.locked) continue;
    if (thief.distanceTo(item.x, item.y) < item.radius + 24) return `${item.hint}  (hold E)`;
  }
  if (world.allLootTaken) return 'All loot secured — get to the VAN, bottom left!';
  if (thief.inVent) return 'In the vent — guards and cameras cannot see you';
  return null;
}
