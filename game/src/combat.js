// Fists in Neon Bay: the player swings in an arc in front of them, rivals
// close in and swing back, and a bystander who takes a punch goes down and
// remembers it (so does the law). A rival at zero health stays down.
import { PLAYER, WANTED } from './config.js';
import { angleDiff, angleTo, distance, moveCircle } from './collide.js';
import { hurtPlayer } from './player.js';
import { addCrime } from './police.js';

/** A yellow flash of sparks where a hit lands. */
function sparks(game, x, y, color) {
  for (let i = 0; i < 8; i += 1) {
    const a = game.rng() * Math.PI * 2;
    const speed = 70 + game.rng() * 130;
    game.particles.push({
      x, y,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      life: 0.4, max: 0.4, color, size: 3 + game.rng() * 4, kind: 'spark',
    });
  }
}

/**
 * The player's punch (F or click): a short swing in front of them that
 * lands on every rival inside range and inside the swing's arc, and on any
 * bystander unlucky enough to stand there too.
 */
export function tryPunch(game) {
  const player = game.player;
  if (player.car || player.punchCooldown > 0 || player.health <= 0) return false;
  player.punchCooldown = PLAYER.punchCooldown;
  player.punchTimer = 0.2;
  game.audio.swing();
  // Punch assist: in a brawl the swing turns toward the nearest rival in
  // reach, so a punch thrown while a rival circles behind still connects.
  let closestRival = null;
  let closestDistance = PLAYER.punchRange + 14;
  for (const rival of game.rivals) {
    if (rival.down) continue;
    const d = distance(player.x, player.y, rival.x, rival.y);
    if (d <= closestDistance) {
      closestRival = rival;
      closestDistance = d;
    }
  }
  if (closestRival) {
    player.angle = angleTo(player.x, player.y, closestRival.x, closestRival.y);
  }
  let hitSomething = false;
  for (const rival of game.rivals) {
    if (rival.down) continue;
    const d = distance(player.x, player.y, rival.x, rival.y);
    const facing = Math.abs(angleDiff(player.angle, angleTo(player.x, player.y, rival.x, rival.y)));
    if (d <= PLAYER.punchRange + 14 && facing <= PLAYER.punchArc / 2) {
      hurtRival(game, rival, PLAYER.punchDamage);
      hitSomething = true;
    }
  }
  for (const ped of game.peds) {
    if (ped.down) continue;
    const d = distance(player.x, player.y, ped.x, ped.y);
    const facing = Math.abs(angleDiff(player.angle, angleTo(player.x, player.y, ped.x, ped.y)));
    if (d <= PLAYER.punchRange + 10 && facing <= PLAYER.punchArc / 2) {
      ped.down = true;
      ped.downTimer = 3;
      game.stats.pedsHit += 1;
      addCrime(game, WANTED.hitPed);
      sparks(game, ped.x, ped.y, '#ffd23f');
      game.audio.punch();
      hitSomething = true;
    }
  }
  return hitSomething;
}

/** Damage a rival; at zero health they go down and drop a little cash. */
export function hurtRival(game, rival, damage) {
  if (rival.down) return;
  rival.health -= damage;
  game.audio.punch();
  sparks(game, rival.x, rival.y, '#ff5a4e');
  if (rival.health <= 0) {
    rival.health = 0;
    rival.down = true;
    rival.punchTimer = 0;
    game.cash += 25;
    game.audio.pickup();
  }
}

/** The crew's turn: every standing rival closes in and swings at the player. */
export function updateRivals(game, dt) {
  const player = game.player;
  for (const rival of game.rivals) {
    if (rival.punchTimer > 0) rival.punchTimer -= dt;
    if (rival.punchCooldown > 0) rival.punchCooldown -= dt;
    if (rival.down || player.health <= 0 || player.car) continue;
    const d = distance(rival.x, rival.y, player.x, player.y);
    rival.angle = angleTo(rival.x, rival.y, player.x, player.y);
    if (d > 44) {
      const step = Math.min(rival.speed * dt, d - 40);
      moveCircle(rival, Math.cos(rival.angle) * step, Math.sin(rival.angle) * step, game.city.buildings);
    } else if (rival.punchCooldown <= 0) {
      rival.punchCooldown = 0.95;
      rival.punchTimer = 0.2;
      hurtPlayer(game, rival.damage || 9);
    }
  }
}
