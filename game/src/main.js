// The Velvet Vault — the shell: input, the game loop, sound, and the
// ?shot= scenes. The rules live in world.js; this file only wires them to the
// keyboard, the mouse and the canvas.
import { VIEW, clamp } from './config.js';
import { createWorld, resetWorld, stepWorld } from './world.js';
import { render, SCREEN } from './render.js';
import { readKeys } from './player.js';
import { stageShot } from './shots.js';
import { SoundBank } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const world = createWorld();
const sound = new SoundBank();

const pressed = new Set();
let queuedSmoke = false;
let queuedEmp = false;
let queuedDecoy = null; // {x, y} in canvas coordinates, from a mouse click

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW.width,
    y: ((event.clientY - rect.top) / rect.height) * VIEW.height,
  };
}

function startGame() {
  sound.ensure();
  if (world.screen === SCREEN.TITLE) {
    resetWorld(world);
    world.screen = SCREEN.PLAY;
    sound.click();
  }
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  if (event.repeat) return;
  pressed.add(event.code);
  sound.ensure();
  if (event.code === 'Enter' || event.code === 'Space') startGame();
  if (event.code === 'KeyR' && world.screen !== SCREEN.TITLE) {
    resetWorld(world);
    world.screen = SCREEN.PLAY;
  }
  if (event.code === 'KeyP' && world.screen === SCREEN.PLAY) {
    world.paused = !world.paused;
    sound.click();
  }
  if (event.code === 'KeyM') sound.toggleMute();
  if (event.code === 'Digit1' && world.screen === SCREEN.PLAY) queuedSmoke = true;
  if (event.code === 'Digit2' && world.screen === SCREEN.PLAY) queuedEmp = true;
  if (event.code === 'Digit3' && world.screen === SCREEN.PLAY) {
    const point = { x: world.thief.x + Math.cos(world.thief.facing) * 70, y: world.thief.y + Math.sin(world.thief.facing) * 70 };
    queuedDecoy = point;
  }
});
window.addEventListener('keyup', (event) => pressed.delete(event.code));
window.addEventListener('blur', () => pressed.clear());

canvas.addEventListener('mousedown', (event) => {
  sound.ensure();
  if (world.screen === SCREEN.TITLE) {
    startGame();
    return;
  }
  if (world.screen !== SCREEN.PLAY || world.paused) return;
  // Click throws a decoy coin where the player points.
  queuedDecoy = canvasPoint(event);
});

function playEvents(events) {
  for (const event of events) {
    if (event === 'step') sound.footstep(world.thief.sneaking);
    else if (event === 'pickup') sound.pickup();
    else if (event === 'lockTick') sound.lockpickTick();
    else if (event === 'spotted' || event === 'tripped') sound.alert();
    else if (event === 'busted') sound.busted();
    else if (event === 'win') sound.win();
    else if (event === 'door' || event === 'decoy' || event === 'smoke' || event === 'emp') sound.click();
  }
  sound.alarmPulse(world.alarm);
}

let lastTime = performance.now();

function frame(now) {
  const dt = clamp((now - lastTime) / 1000, 0, 1 / 20);
  lastTime = now;
  if (world.screen === SCREEN.PLAY && !world.paused && !world.frozen) {
    const keys = readKeys(pressed);
    keys.smoke = queuedSmoke;
    keys.emp = queuedEmp;
    if (queuedDecoy) {
      keys.decoyX = queuedDecoy.x;
      keys.decoyY = queuedDecoy.y;
    }
    queuedSmoke = false;
    queuedEmp = false;
    queuedDecoy = null;
    playEvents(stepWorld(world, dt, keys));
  }
  render(ctx, world);
  requestAnimationFrame(frame);
}

// A staged screenshot scene: build it once, freeze it, keep repainting it so a
// headless screenshot always catches the finished frame.
if (shotName) {
  stageShot(shotName, world);
  document.title = `The Velvet Vault — ${shotName}`;
  render(ctx, world);
}
requestAnimationFrame(frame);

// For playtesting and debugging from a console or an automation script.
window.__heist = { world, stageShot, SCREEN };
