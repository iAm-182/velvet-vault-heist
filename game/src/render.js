// The Velvet Vault — everything the player sees: the museum floor, the guards
// and their cones, the cameras and their sweeps, the loot, the thief, and the
// HUD with the alarm meter. Drawn on one canvas, no images, no network.
import { GUARD, CAMERA, PALETTE, VIEW, HUD_HEIGHT, clamp } from './config.js';
import { ROOMS } from './level.js';

export const SCREEN = {
  TITLE: 'title',
  PLAY: 'play',
  WIN: 'win',
  LOSE: 'lose',
  LOCKDOWN: 'lockdown',
};

/** Draw a vision cone: a wedge from (x,y) along `angle`, range and half-angle. */
function drawCone(ctx, x, y, angle, range, halfAngle, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - halfAngle) * range, y + Math.sin(angle - halfAngle) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + halfAngle) * range, y + Math.sin(angle + halfAngle) * range);
  ctx.stroke();
}

function drawFloor(ctx, level, time) {
  const { floor } = level;
  // Checkerboard stone floor.
  const tile = 46;
  for (let ty = floor.y; ty < floor.y + floor.height; ty += tile) {
    for (let tx = floor.x; tx < floor.x + floor.width; tx += tile) {
      const odd = (Math.floor(tx / tile) + Math.floor(ty / tile)) % 2 === 0;
      ctx.fillStyle = odd ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(tx, ty, tile, tile);
    }
  }
  // Warm carpet runner down the gallery.
  ctx.fillStyle = PALETTE.carpet;
  ctx.fillRect(340, 300, 400, 60);
  ctx.strokeStyle = 'rgba(201,162,39,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(340, 300, 400, 60);
  // Vent crawlspace: darker duct along the top.
  ctx.fillStyle = PALETTE.ventFloor;
  ctx.fillRect(floor.x, floor.y, floor.width, 50);
  ctx.strokeStyle = '#2a2f3a';
  ctx.lineWidth = 1;
  for (let x = floor.x + 20; x < floor.x + floor.width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, floor.y + 8);
    ctx.lineTo(x, floor.y + 42);
    ctx.stroke();
  }
  // Room names, faint on the floor.
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(232,228,216,0.16)';
  ctx.textAlign = 'left';
  for (const room of ROOMS) ctx.fillText(room.name, room.x, room.y);
  // Dust motes drifting in the light.
  ctx.fillStyle = 'rgba(255, 220, 140, 0.25)';
  for (let i = 0; i < 26; i += 1) {
    const mx = ((i * 173 + time * 12) % 1200) + floor.x;
    const my = ((i * 97 + time * 7) % 620) + floor.y;
    ctx.fillRect(mx, my, 2, 2);
  }
}

function drawWallsAndCover(ctx, level) {
  for (const w of level.walls) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(w.x, w.y, w.width, w.height);
    ctx.fillStyle = PALETTE.wallTop;
    if (w.height <= 10) ctx.fillRect(w.x, w.y, w.width, 3);
    else ctx.fillRect(w.x, w.y, 3, w.height);
  }
  for (const c of level.cover) {
    if (c.kind === 'case') {
      ctx.fillStyle = '#2c3444';
      ctx.fillRect(c.x, c.y, c.width, c.height);
      ctx.fillStyle = 'rgba(127,179,200,0.35)';
      ctx.fillRect(c.x + 4, c.y + 4, c.width - 8, c.height - 8);
      ctx.strokeStyle = PALETTE.goldTrim;
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x, c.y, c.width, c.height);
    } else if (c.kind === 'statue') {
      ctx.fillStyle = '#8b8f9a';
      ctx.beginPath();
      ctx.arc(c.x + c.width / 2, c.y + c.height / 2, c.width / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5c6068';
      ctx.fillRect(c.x + 2, c.y + c.height - 8, c.width - 4, 6);
    } else {
      ctx.fillStyle = '#2f4a2e';
      ctx.fillRect(c.x, c.y, c.width, c.height);
      ctx.fillStyle = '#3f6b3a';
      ctx.beginPath();
      ctx.arc(c.x + c.width / 2, c.y + c.height / 2, c.width / 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Vent grates.
  for (const g of level.grates) {
    ctx.fillStyle = '#0c0e12';
    ctx.fillRect(g.x, g.y, g.width, g.height);
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(g.x + 6 + i * 9, g.y + 3);
      ctx.lineTo(g.x + 6 + i * 9, g.y + g.height - 3);
      ctx.stroke();
    }
  }
}

function drawLoot(ctx, level, time) {
  for (const item of level.loot) {
    if (item.taken) continue;
    const pulse = 0.5 + Math.sin(time * 3 + item.x) * 0.2;
    const glow = ctx.createRadialGradient(item.x, item.y, 4, item.x, item.y, 52);
    glow.addColorStop(0, `rgba(255, 217, 77, ${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 217, 77, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(item.x, item.y, 52, 0, Math.PI * 2);
    ctx.fill();
    if (item.id === 'painting') {
      ctx.fillStyle = '#7a5a2e';
      ctx.fillRect(item.x - 22, item.y - 30, 44, 60);
      ctx.fillStyle = '#e8862e';
      ctx.beginPath();
      ctx.arc(item.x, item.y - 6, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a6ea5';
      ctx.fillRect(item.x - 18, item.y + 8, 36, 16);
      ctx.strokeStyle = PALETTE.goldTrim;
      ctx.lineWidth = 3;
      ctx.strokeRect(item.x - 22, item.y - 30, 44, 60);
    } else if (item.id === 'gold') {
      ctx.fillStyle = PALETTE.lootGlow;
      for (const [ox, oy] of [[-12, 6], [0, -2], [12, 6]]) {
        ctx.beginPath();
        ctx.moveTo(item.x + ox - 9, item.y + oy + 6);
        ctx.lineTo(item.x + ox - 5, item.y + oy - 6);
        ctx.lineTo(item.x + ox + 5, item.y + oy - 6);
        ctx.lineTo(item.x + ox + 9, item.y + oy + 6);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // The diamond, inside the open safe.
      ctx.fillStyle = '#bfe9ff';
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(Math.PI / 4 + Math.sin(time * 2) * 0.15);
      ctx.fillRect(-11, -11, 22, 22);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(item.x - 5, item.y - 5);
      ctx.lineTo(item.x + 2, item.y - 2);
      ctx.lineTo(item.x - 2, item.y + 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.lootGlow;
    ctx.fillText(`$${item.value}K`, item.x, item.y + item.radius + 16);
  }
  // The vault safe.
  const safe = level.safe;
  ctx.fillStyle = '#39415a';
  ctx.fillRect(safe.x, safe.y, safe.width, safe.height);
  ctx.strokeStyle = PALETTE.goldTrim;
  ctx.lineWidth = 3;
  ctx.strokeRect(safe.x, safe.y, safe.width, safe.height);
  ctx.fillStyle = '#232a3d';
  ctx.beginPath();
  ctx.arc(safe.x + safe.width / 2, safe.y + safe.height / 2, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8b93a7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(safe.x + safe.width / 2, safe.y + safe.height / 2, 12, 0, Math.PI * 2);
  ctx.stroke();
  // The locked vault door.
  const door = level.vaultDoor;
  ctx.fillStyle = door.locked ? '#8a6d1f' : '#3f6b3a';
  ctx.fillRect(door.x - 2, door.y, door.width + 4, door.height);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  if (door.locked) ctx.fillText('LOCKED', door.x + 5, door.y - 8);
}

function drawExit(ctx, level, allLootTaken, time) {
  const exit = level.exit;
  const pulse = allLootTaken ? 0.6 + Math.sin(time * 5) * 0.3 : 0.25;
  ctx.fillStyle = `rgba(45, 212, 191, ${pulse})`;
  ctx.fillRect(exit.x, exit.y, exit.width, exit.height);
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x, exit.y, exit.width, exit.height);
  ctx.fillStyle = '#0b2e2a';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VAN', exit.x + exit.width / 2, exit.y + 22);
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.fillText(allLootTaken ? 'GO! GO! GO!' : 'GETAWAY', exit.x + exit.width / 2, exit.y + 38);
}

function drawGuards(ctx, guards, time) {
  for (const guard of guards) {
    const alerted = guard.state === 'chase';
    const coneFill = alerted ? PALETTE.guardAlertCone : PALETTE.guardCone;
    const coneEdge = alerted ? 'rgba(255,64,32,0.7)' : PALETTE.guardConeEdge;
    drawCone(ctx, guard.x, guard.y, guard.angle, GUARD.coneRange, GUARD.coneHalfAngle, coneFill, coneEdge);
  }
  for (const guard of guards) {
    // Body: navy uniform, gold trim, a little cap.
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.guardTrim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#1b2547';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 4, 7, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * 18, guard.y + Math.sin(guard.angle) * 18);
    ctx.stroke();
    // Suspicion ring: fills as the guard gets sure of what they saw.
    if (guard.suspicion > 0.05) {
      ctx.strokeStyle = guard.suspicion > 0.7 ? '#ff4530' : PALETTE.lootGlow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD.radius + 6, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
      ctx.stroke();
    }
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232,228,216,0.85)';
    ctx.fillText(guard.name.toUpperCase(), guard.x, guard.y - GUARD.radius - 8);
    if (guard.state === 'chase') {
      ctx.fillStyle = '#ff4530';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('!', guard.x, guard.y - GUARD.radius - 20);
    }
    void time;
  }
}

function drawCameras(ctx, cameras) {
  for (const cam of cameras) {
    if (cam.disabled > 0) continue;
    const fill = cam.lock > 0.4 ? 'rgba(255,58,58,0.35)' : PALETTE.cameraCone;
    const edge = cam.lock > 0.4 ? 'rgba(255,58,58,0.85)' : PALETTE.cameraConeEdge;
    drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.coneRange, CAMERA.coneHalfAngle, fill, edge);
  }
  for (const cam of cameras) {
    ctx.fillStyle = cam.disabled > 0 ? '#3a3f4a' : '#1c1f26';
    ctx.fillRect(cam.x - 9, cam.y - 9, 18, 18);
    ctx.strokeStyle = cam.disabled > 0 ? '#555b66' : '#ff3a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(cam.x - 9, cam.y - 9, 18, 18);
    // Lens dot: blinks red while live, dark while EMP'd.
    ctx.fillStyle = cam.disabled > 0 ? '#222' : (cam.trippedFlash > 0 ? '#fff' : '#ff3a3a');
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 5, cam.y + Math.sin(cam.angle) * 5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (cam.lock > 0.05 && cam.disabled <= 0) {
      ctx.strokeStyle = '#ff3a3a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, 15, -Math.PI / 2, -Math.PI / 2 + cam.lock * Math.PI * 2);
      ctx.stroke();
    }
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232,228,216,0.7)';
    ctx.fillText(cam.disabled > 0 ? 'EMP\'D' : cam.label, cam.x, cam.y - 14);
  }
}

function drawThief(ctx, thief, time) {
  const bob = thief.moving ? Math.sin(time * 14) * 2 : 0;
  ctx.save();
  ctx.translate(thief.x, thief.y + bob);
  if (thief.inVent) ctx.globalAlpha = 0.75;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 12 - bob, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: black-clad thief, teal trim, little mask.
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.thiefTrim;
  ctx.fillRect(-8, -3, 16, 5); // mask band
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-4, -1, 2, 0, Math.PI * 2);
  ctx.arc(4, -1, 2, 0, Math.PI * 2);
  ctx.fill();
  // Sneak indicator: a small crouch ring.
  if (thief.sneaking) {
    ctx.strokeStyle = 'rgba(45,212,191,0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
  // Interaction progress ring.
  if (thief.interactTarget) {
    ctx.strokeStyle = PALETTE.lootGlow;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, 22, -Math.PI / 2, -Math.PI / 2 + thief.interactProgress * Math.PI * 2);
    ctx.stroke();
  }
}

function drawTools(ctx, toolbelt) {
  for (const cloud of toolbelt.smokes) {
    const alpha = clamp(cloud.timeLeft / 2, 0, 1);
    ctx.fillStyle = `rgba(200, 205, 215, ${0.5 * alpha})`;
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(220, 225, 235, ${0.4 * alpha})`;
    ctx.beginPath();
    ctx.arc(cloud.x - 30, cloud.y - 18, cloud.radius * 0.55, 0, Math.PI * 2);
    ctx.arc(cloud.x + 34, cloud.y + 20, cloud.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const coin of toolbelt.decoys) {
    ctx.fillStyle = PALETTE.lootGlow;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,217,77,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 10 + Math.sin(coin.timeLeft * 8) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function alarmColor(alarm) {
  if (alarm < 35) return PALETTE.alarmLow;
  if (alarm < 70) return PALETTE.alarmMid;
  return PALETTE.alarmHigh;
}

function drawHud(ctx, world) {
  ctx.fillStyle = '#0d0f14';
  ctx.fillRect(0, 0, VIEW.width, HUD_HEIGHT);
  ctx.strokeStyle = '#2a2f3a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HUD_HEIGHT);
  ctx.lineTo(VIEW.width, HUD_HEIGHT);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('THE VELVET VAULT', 16, 24);
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('midnight lift · museum of fine art', 16, 42);

  // Alarm meter: the big one, centre-top, always visible.
  const meterX = 330;
  const meterW = 380;
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillStyle = world.alarm > 70 ? PALETTE.alarmHigh : PALETTE.text;
  ctx.fillText('ALARM', meterX, 22);
  ctx.fillStyle = '#1c2029';
  ctx.fillRect(meterX, 28, meterW, 16);
  ctx.fillStyle = alarmColor(world.alarm);
  ctx.fillRect(meterX, 28, meterW * clamp(world.alarm / 100, 0, 1), 16);
  ctx.strokeStyle = '#3a4152';
  ctx.lineWidth = 1;
  ctx.strokeRect(meterX, 28, meterW, 16);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText(`${Math.round(world.alarm)}%`, meterX + meterW + 10, 41);

  // Loot taken.
  let lx = 780;
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('LOOT', lx, 22);
  for (const item of world.level.loot) {
    lx += 8;
    ctx.fillStyle = item.taken ? PALETTE.lootGlow : '#3a4152';
    ctx.beginPath();
    ctx.arc(lx + 14, 36, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = item.taken ? '#1c2029' : '#9aa3b2';
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.id === 'painting' ? 'P' : item.id === 'gold' ? 'G' : 'D', lx + 14, 39);
    ctx.textAlign = 'left';
    lx += 34;
  }
  ctx.fillStyle = PALETTE.lootGlow;
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.fillText(`$${world.score}K`, lx + 6, 41);

  // Tools.
  let tx = 1010;
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  const tools = [
    ['1 SMOKE', world.toolbelt.smoke],
    ['2 EMP', world.toolbelt.emp],
    ['3 COIN', world.toolbelt.decoy],
  ];
  for (const [label, count] of tools) {
    ctx.fillStyle = count > 0 ? PALETTE.text : '#555b66';
    ctx.fillText(`${label} ×${count}`, tx, 26);
    tx += 78;
  }
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('SHIFT sneak · E interact', 1010, 44);

  // Timer and lives, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 16px system-ui, sans-serif';
  const minutes = Math.floor(world.time / 60);
  const seconds = Math.floor(world.time % 60);
  ctx.fillText(`${minutes}:${String(seconds).padStart(2, '0')}`, 1264, 24);
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillStyle = world.lives > 1 ? PALETTE.text : PALETTE.alarmHigh;
  ctx.fillText(`♥`.repeat(world.lives) + `♡`.repeat(Math.max(0, 3 - world.lives)), 1264, 44);
  ctx.textAlign = 'left';
}

function drawBanner(ctx, world) {
  if (!world.banner) return;
  // Along the bottom, above the prompt: the middle of the floor stays clear
  // for the thief, the cones and the loot.
  const y = VIEW.height - 96;
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = world.banner.color;
  ctx.fillText(world.banner.text, VIEW.width / 2, y);
  if (world.banner.sub) {
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(world.banner.sub, VIEW.width / 2, y + 26);
  }
  ctx.textAlign = 'left';
}

function drawPrompt(ctx, world) {
  if (!world.prompt) return;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const width = ctx.measureText(world.prompt).width + 28;
  ctx.fillStyle = 'rgba(13,15,20,0.85)';
  ctx.fillRect(VIEW.width / 2 - width / 2, VIEW.height - 52, width, 32);
  ctx.strokeStyle = PALETTE.goldTrim;
  ctx.lineWidth = 1;
  ctx.strokeRect(VIEW.width / 2 - width / 2, VIEW.height - 52, width, 32);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(world.prompt, VIEW.width / 2, VIEW.height - 31);
  ctx.textAlign = 'left';
}

function drawTitle(ctx, world) {
  ctx.fillStyle = '#0d0f14';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.lootGlow;
  ctx.font = '800 64px system-ui, sans-serif';
  ctx.fillText('THE VELVET VAULT', VIEW.width / 2, 170);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText('A midnight lift at the Museum of Fine Art', VIEW.width / 2, 212);
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Lift the painting, the gold and the Velvet Diamond — then get to the van.', VIEW.width / 2, 250);
  ctx.fillText('Guards watch cones of light. Cameras sweep the halls. The alarm only goes up.', VIEW.width / 2, 278);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.fillText('WASD / arrows — move      SHIFT — sneak      E — pick / lift      1 smoke · 2 EMP · 3 coin', VIEW.width / 2, 350);
  ctx.fillText('Click — throw a decoy coin      P — pause      M — mute', VIEW.width / 2, 382);
  ctx.fillStyle = '#2dd4bf';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText('Three ways in: the front doors, the service corridor, the vent along the top.', VIEW.width / 2, 430);
  ctx.fillStyle = PALETTE.lootGlow;
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillText(world.best > 0 ? `Best take: $${world.best}K — press ENTER to play` : 'Press ENTER or click to play', VIEW.width / 2, 500);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, world, won) {
  ctx.fillStyle = 'rgba(10, 11, 16, 0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? PALETTE.lootGlow : PALETTE.alarmHigh;
  ctx.font = '800 56px system-ui, sans-serif';
  ctx.fillText(won ? 'CLEAN GETAWAY!' : world.screen === SCREEN.LOCKDOWN ? 'LOCKDOWN!' : 'BUSTED!', VIEW.width / 2, 220);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '600 20px system-ui, sans-serif';
  if (won) {
    ctx.fillText(`You lifted $${world.score}K in ${Math.floor(world.time / 60)}:${String(Math.floor(world.time % 60)).padStart(2, '0')} — rank ${world.rank}`, VIEW.width / 2, 270);
    ctx.fillText(`Peak alarm ${Math.round(world.peakAlarm)}% · spotted ${world.timesSpotted} times`, VIEW.width / 2, 304);
  } else if (world.screen === SCREEN.LOCKDOWN) {
    ctx.fillText('The alarm hit 100%. The museum sealed itself with you inside.', VIEW.width / 2, 270);
    ctx.fillText(`You kept $${world.score}K of loot.`, VIEW.width / 2, 304);
  } else {
    ctx.fillText('The guards caught you three times. The crew left without you.', VIEW.width / 2, 270);
    ctx.fillText(`You kept $${world.score}K of loot.`, VIEW.width / 2, 304);
  }
  ctx.fillStyle = PALETTE.lootGlow;
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillText('Press R to run it again', VIEW.width / 2, 380);
  ctx.textAlign = 'left';
}

/** Draw the whole game for this frame. */
export function render(ctx, world) {
  const time = world.time;
  if (world.screen === SCREEN.TITLE) {
    drawTitle(ctx, world);
    return;
  }
  drawFloor(ctx, world.level, time);
  drawWallsAndCover(ctx, world.level);
  drawLoot(ctx, world.level, time);
  drawExit(ctx, world.level, world.allLootTaken, time);
  drawGuards(ctx, world.guards, time);
  drawCameras(ctx, world.cameras);
  drawTools(ctx, world.toolbelt);
  drawThief(ctx, world.thief, time);
  drawHud(ctx, world);
  drawBanner(ctx, world);
  drawPrompt(ctx, world);
  if (world.screen === SCREEN.WIN || world.screen === SCREEN.LOSE || world.screen === SCREEN.LOCKDOWN) {
    drawEnd(ctx, world, world.screen === SCREEN.WIN);
  }
  if (world.paused) {
    ctx.fillStyle = 'rgba(10, 11, 16, 0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '800 40px system-ui, sans-serif';
    ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2);
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText('P to resume · R to restart · M to mute', VIEW.width / 2, VIEW.height / 2 + 34);
    ctx.textAlign = 'left';
  }
}
