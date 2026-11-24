// The law in Neon Bay: a wanted level from 0 to 5 stars, police cars that
// spawn on the roads and hunt the player down, and a bust when they sit on
// the player long enough. Lay low and the heat fades, one star at a time.
import { POLICE, WANTED } from './config.js';
import { createCar, driveCar } from './vehicles.js';
import { distance, steerToPoint } from './collide.js';
import { roadPointNear } from './world.js';

/** How many police cars a wanted level puts on the road. */
export function wantedPoliceCount(wanted) {
  const level = Math.max(0, Math.min(WANTED.max, wanted));
  return POLICE.carsPerStar[level] || 0;
}

/** A police car on a road a good distance from the player, lights ready. */
export function spawnPoliceCar(game) {
  const spot = roadPointNear(game.rng, game.player.x, game.player.y, POLICE.spawnDistance);
  const car = createCar(spot.x, spot.y, game.rng() * Math.PI * 2, '#2f6df6', 'police');
  car.bustTimer = 0;
  car.ramCooldown = 0;
  game.cars.push(car);
  return car;
}

/**
 * One police car chasing: steer at the player, floor it, and ram. Sitting
 * on a player on foot builds the bust timer; ramming a player's car dents
 * it instead. A police car that loses the player for too long gives up the
 * chase and cruises back toward the roads.
 */
export function updatePoliceCar(game, car, dt) {
  if (car.wrecked) return;
  const player = game.player;
  const gap = distance(car.x, car.y, player.x, player.y);
  if (car.ramCooldown > 0) car.ramCooldown -= dt;

  const steer = steerToPoint(car.x, car.y, car.angle, player.x, player.y);
  const throttle = gap > 60 ? 1 : 0.35;
  const top = POLICE.chaseSpeed;
  driveCar(car, throttle, steer, false, game.city.buildings, dt);
  if (car.speed > top) car.speed = top;

  if (player.car) {
    car.bustTimer = 0;
    if (gap < 58 && car.ramCooldown <= 0 && Math.abs(car.speed) > 120) {
      car.ramCooldown = 0.9;
      player.car.health -= POLICE.ramDamage;
      game.audio.thud();
      if (player.car.health <= 0) {
        player.car.health = 0;
        player.car.wrecked = true;
        player.car.wreckTimer = 14;
      }
    }
  } else if (gap < 62) {
    car.bustTimer += dt;
    if (car.bustTimer >= POLICE.bustTime) {
      game.busted = true;
      game.audio.siren(false);
    }
  } else {
    car.bustTimer = Math.max(0, car.bustTimer - dt * 2);
  }
}

/**
 * Keep the number of police cars matched to the wanted level, fade the heat
 * after a long quiet stretch, and run the siren while anyone is chasing.
 */
export function updateWanted(game, dt) {
  const police = game.cars.filter((car) => car.driver === 'police' && !car.wrecked);
  const want = wantedPoliceCount(game.wanted);
  if (police.length < want) {
    spawnPoliceCar(game);
  } else if (police.length > want) {
    // The extra car peels off: the furthest one leaves the chase.
    let furthest = police[0];
    for (const car of police) {
      if (distance(car.x, car.y, game.player.x, game.player.y) >
          distance(furthest.x, furthest.y, game.player.x, game.player.y)) {
        furthest = car;
      }
    }
    game.cars = game.cars.filter((car) => car !== furthest);
  }

  const anyNear = police.some((car) => distance(car.x, car.y, game.player.x, game.player.y) < 700);
  if (game.wanted > 0 && !anyNear) {
    game.crimeTimer += dt;
    if (game.crimeTimer >= WANTED.decaySeconds) {
      game.wanted -= 1;
      game.crimeTimer = 0;
      if (game.wanted === 0) game.banner = { text: 'CLEAN', sub: 'The heat is off. For now.', timer: 2.5 };
    }
  } else {
    game.crimeTimer = 0;
  }
  game.audio.siren(game.wanted > 0 && police.length > 0);
}

/** Raise the heat by `stars`, up to the five-star cap. */
export function addCrime(game, stars) {
  game.wanted = Math.min(WANTED.max, game.wanted + stars);
  game.crimeTimer = 0;
}
