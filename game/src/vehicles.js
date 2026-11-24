// Cars: the one driving model every driver in Neon Bay shares. A car has a
// heading, a speed along it, and health; throttle pushes it forward or back,
// steering turns it harder the faster it goes (and the other way in
// reverse), and buildings stop it with a bounce and a dent. The player, the
// traffic and the police all drive through driveCar.
import { CAR, WANTED, WATER_Y, WORLD } from './config.js';
import { circleHitsRect } from './collide.js';
import { addCrime } from './police.js';
import { createPedestrian } from './traffic.js';

/** Clamp a coordinate to the world; the car keeps the clamped value. */
function clampEdge(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** A fresh car. `driver` is 'parked', 'traffic', 'police' or 'player'. */
export function createCar(x, y, angle, color, driver) {
  return {
    x, y, angle, color, driver,
    speed: 0,
    health: CAR.health,
    wrecked: false,
    wreckTimer: 0,
    /** Blinking light-bar phase; the renderer reads it for police cars. */
    lightTimer: 0,
  };
}

/**
 * Drive a car one step. `throttle` is -1 (full reverse) to 1 (full gas),
 * `steer` is -1 (right) to 1 (left), `brake` stops the car fast. Buildings
 * are felt as a circle at the car's nose and tail so a long car cannot
 * clip a corner: a hard hit bounces the car back and dents it.
 */
export function driveCar(car, throttle, steer, brake, buildings, dt) {
  if (car.wrecked) {
    car.speed = 0;
    return;
  }
  car.lightTimer += dt;
  if (brake) {
    const stop = CAR.brake * dt;
    if (Math.abs(car.speed) <= stop) car.speed = 0;
    else car.speed -= Math.sign(car.speed) * stop;
  } else if (throttle !== 0) {
    const push = throttle > 0 ? CAR.accel : CAR.reverseAccel;
    car.speed += throttle * push * dt;
  }
  // Rolling drag, strongest when coasting.
  car.speed -= car.speed * CAR.drag * dt;
  const top = car.speed >= 0 ? CAR.maxSpeed : CAR.maxReverse;
  if (Math.abs(car.speed) > top) car.speed = Math.sign(car.speed) * top;

  // Steering bites with speed, and flips in reverse so the wheel feels right.
  const grip = Math.min(Math.abs(car.speed) / 150, 1);
  car.angle += steer * CAR.turnRate * grip * Math.sign(car.speed || 1) * dt;

  let nx = car.x + Math.cos(car.angle) * car.speed * dt;
  let ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // The world has edges: a car that reaches one scrubs its speed off there
  // instead of driving out of the map (and never into the water).
  const edgeX = clampEdge(nx, 24, WORLD.width - 24);
  const edgeY = clampEdge(ny, 24, WATER_Y - 24);
  if (edgeX !== nx || edgeY !== ny) {
    nx = edgeX;
    ny = edgeY;
    car.speed *= 0.4;
  }
  const noseX = nx + Math.cos(car.angle) * 26;
  const noseY = ny + Math.sin(car.angle) * 26;
  const tailX = nx - Math.cos(car.angle) * 26;
  const tailY = ny - Math.sin(car.angle) * 26;
  let blocked = false;
  for (const b of buildings) {
    if (circleHitsRect(noseX, noseY, 16, b) || circleHitsRect(tailX, tailY, 16, b)) {
      blocked = true;
      break;
    }
  }
  if (blocked) {
    // A hard shunt dents the car; a gentle nudge just stops it.
    const impact = Math.abs(car.speed);
    if (impact > 240) car.health -= Math.round((impact - 240) / 18);
    car.speed *= -0.28;
    if (car.health <= 0) {
      car.health = 0;
      car.wrecked = true;
      car.wreckTimer = CAR.wreckTime;
      car.speed = 0;
    }
    return;
  }
  car.x = nx;
  car.y = ny;
}

/** The closest drivable car to the player within `maxDistance`, or null. */
export function nearestCar(game, maxDistance) {
  const player = game.player;
  let best = null;
  let bestDistance = maxDistance;
  for (const car of game.cars) {
    if (car.wrecked || car.driver === 'police') continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestDistance) {
      best = car;
      bestDistance = d;
    }
  }
  return best;
}

/**
 * E to get in or out. Getting out drops the player beside the car. Getting
 * into a parked car steals it (one wanted star); pulling a driver out of a
 * moving car does the same, and the driver walks off as a pedestrian.
 */
export function tryEnterExitCar(game) {
  const player = game.player;
  if (player.car) {
    const car = player.car;
    car.driver = 'parked';
    player.car = null;
    player.x = car.x - Math.cos(car.angle + Math.PI / 2) * 44;
    player.y = car.y - Math.sin(car.angle + Math.PI / 2) * 44;
    player.angle = car.angle;
    return true;
  }
  const car = nearestCar(game, 78);
  if (!car) return false;
  if (car.driver === 'traffic') {
    game.peds.push(createPedestrian(game, car.x, car.y));
    addCrime(game, WANTED.steal);
  } else if (car.driver === 'parked') {
    addCrime(game, WANTED.steal);
  }
  car.driver = 'player';
  car.speed = 0;
  player.car = car;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  game.stats.carsStolen += 1;
  game.audio.steal();
  return true;
}

/** Drive the player's car from the held keys: up is gas, down brakes then reverses. */
export function updatePlayerCar(game, controls, dt) {
  const car = game.player.car;
  if (!car) return;
  if (car.wrecked) {
    // The wreck throws the driver out onto the road.
    car.driver = 'parked';
    game.player.car = null;
    game.player.x = car.x + 46;
    game.player.y = car.y + 30;
    game.audio.crash();
    return;
  }
  let throttle = 0;
  let brake = false;
  if (controls.up) throttle = 1;
  if (controls.down) {
    if (car.speed > 40) brake = true;
    else throttle = -1;
  }
  const steer = (controls.left ? 1 : 0) - (controls.right ? 1 : 0);
  driveCar(car, throttle, steer, brake, game.city.buildings, dt);
  game.player.x = car.x;
  game.player.y = car.y;
  game.player.angle = car.angle;
}
