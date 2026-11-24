// The player on foot: Rook, new in Neon Bay. Walks the sidewalks, runs with
// Shift held (the loop passes run as part of the up key), turns toward the
// direction of travel and slides along building walls. Driving lives in
// vehicles.js; this file only knows the walker.
import { PLAYER } from './config.js';
import { moveCircle } from './collide.js';

export function createPlayer(x, y) {
  return {
    x, y,
    radius: PLAYER.radius,
    angle: -Math.PI / 2,
    health: PLAYER.health,
    moving: false,
    running: false,
    /** Seconds until the next punch may land. */
    punchCooldown: 0,
    /** Seconds the punch swing is drawn. */
    punchTimer: 0,
    /** Seconds of flashing after taking a hit. */
    hurtTimer: 0,
    /** The car the player is driving, or null when on foot. */
    car: null,
  };
}

/** Walk the player with the held keys; returns true when the player moved. */
export function updatePlayerOnFoot(game, controls, dt) {
  const player = game.player;
  if (player.car) return false;
  let dx = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
  let dy = (controls.down ? 1 : 0) - (controls.up ? 1 : 0);
  const moving = dx !== 0 || dy !== 0;
  player.moving = moving;
  player.running = moving && (controls.run || false);
  if (!moving) return false;
  const length = Math.hypot(dx, dy);
  dx /= length;
  dy /= length;
  const speed = player.running ? PLAYER.runSpeed : PLAYER.walkSpeed;
  player.angle = Math.atan2(dy, dx);
  const moved = moveCircle(player, dx * speed * dt, dy * speed * dt, game.city.buildings);
  return moved.x !== 0 || moved.y !== 0;
}

/** Tick the player's timers down by one step. */
export function tickPlayerTimers(player, dt) {
  if (player.punchCooldown > 0) player.punchCooldown -= dt;
  if (player.punchTimer > 0) player.punchTimer -= dt;
  if (player.hurtTimer > 0) player.hurtTimer -= dt;
}

/** Hurt the player; returns true when the hit leaves the player down. */
export function hurtPlayer(game, damage) {
  const player = game.player;
  if (player.hurtTimer > 0 || player.health <= 0) return false;
  player.health -= damage;
  player.hurtTimer = 0.5;
  game.audio.punch();
  if (player.health <= 0) {
    player.health = 0;
    game.wasted = true;
    game.audio.jingle(false);
  }
  return player.health <= 0;
}
