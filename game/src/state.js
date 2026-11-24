// The game itself: one state object, built from a seed, and the single step
// that advances it. main.js runs this in its loop; shots.js runs it forward
// to stage the screenshots. Every system plugs in here and nowhere else.
import { CAR_COLORS, SAVE_KEY, STEP } from './config.js';
import { createRandom, pick } from './random.js';
import { buildCity } from './world.js';
import { createPlayer, tickPlayerTimers, updatePlayerOnFoot } from './player.js';
import { createCar, tryEnterExitCar, updatePlayerCar } from './vehicles.js';
import { createPedestrian, createTrafficCar, topUpCrowd, updatePedestrian, updateTrafficCar } from './traffic.js';
import { updatePoliceCar, updateWanted } from './police.js';
import { missionObjective, startMission, updateMissions } from './missions.js';
import { tryPunch, updateRivals } from './combat.js';
import { createSilentAudio } from './audio.js';

/** Build a fresh game from a seed. `audio` is the real engine or the silent stand-in. */
export function createGame(seed, audio) {
  const rng = createRandom(seed);
  const city = buildCity(rng);
  const game = {
    seed,
    rng,
    city,
    cityWidth: 3600,
    cityHeight: 2600,
    saveKey: SAVE_KEY,
    audio: audio || createSilentAudio(),
    player: createPlayer(city.places.spawn.x, city.places.spawn.y),
    cars: [],
    peds: [],
    rivals: [],
    wanted: 0,
    crimeTimer: 0,
    cash: 0,
    time: 0,
    mission: null,
    pendingMission: null,
    pendingTimer: 0,
    allMissionsDone: false,
    banner: null,
    busted: false,
    wasted: false,
    objectiveText: '',
    particles: [],
    stats: { carsStolen: 0, pedsHit: 0, missionsDone: 0 },
  };
  // The parked cars along the avenues, waiting to be borrowed.
  for (const spot of city.parkedSpots) {
    game.cars.push(createCar(spot.x, spot.y, spot.angle, pick(rng, CAR_COLORS), 'parked'));
  }
  // The first traffic and the first pedestrians, scattered near the spawn.
  for (let i = 0; i < 8; i += 1) game.cars.push(createTrafficCar(game));
  for (let i = 0; i < 14; i += 1) game.peds.push(createPedestrian(game));
  return game;
}

/** Start a new run: a fresh city, the player on Coral Ave, the first job open. */
export function resetGame(game) {
  const fresh = createGame(game.seed, game.audio);
  for (const key of Object.keys(fresh)) game[key] = fresh[key];
  startMission(game, 0);
}

/** Apply a save on top of a fresh game: cash, jobs done and the last position. */
export function applySave(game, save) {
  if (!save) return;
  game.cash = save.cash || 0;
  game.stats.missionsDone = save.missionsDone || 0;
  game.stats.carsStolen = save.carsStolen || 0;
  if (save.player) {
    game.player.x = save.player.x;
    game.player.y = save.player.y;
  }
  const index = save.missionIndex || 0;
  if (index >= 4) game.allMissionsDone = true;
  else startMission(game, index);
}

/** Push overlapping cars apart so traffic never drives through the player. */
function resolveCarBumps(game) {
  const cars = game.cars;
  for (let i = 0; i < cars.length; i += 1) {
    const a = cars[i];
    if (a.wrecked) continue;
    for (let j = i + 1; j < cars.length; j += 1) {
      const b = cars[j];
      if (b.wrecked) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = 56;
      if (d >= min || d === 0) continue;
      const push = (min - d) / 2;
      const nx = dx / d;
      const ny = dy / d;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      if ((a.driver === 'player' || b.driver === 'player') && Math.abs(a.speed - b.speed) > 120) {
        game.audio.thud();
      }
    }
  }
}

/** Drop a burst of sparks or a flash at a point. */
export function burst(game, x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = game.rng() * Math.PI * 2;
    const speed = 60 + game.rng() * 160;
    game.particles.push({
      x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 0.5, max: 0.5, color, size: 4 + game.rng() * 5, kind: 'spark',
    });
  }
}

/**
 * One fixed step of the whole game. `controls` is the per-step input object
 * from input.js (or one the screenshot staging builds by hand); its edge
 * flags are cleared as they are consumed.
 */
export function stepGame(game, controls, dt) {
  game.time += dt;
  if (game.banner && game.banner.timer > 0) game.banner.timer -= dt;

  // Entering and leaving cars, and punches, are one-shot actions.
  if (controls.enter) {
    controls.enter = false;
    tryEnterExitCar(game);
  }
  if (controls.punch) {
    controls.punch = false;
    tryPunch(game);
  }

  if (game.player.car) updatePlayerCar(game, controls, dt);
  else updatePlayerOnFoot(game, controls, dt);
  tickPlayerTimers(game.player, dt);

  for (const car of game.cars) {
    if (car.driver === 'traffic') updateTrafficCar(game, car, dt);
    else if (car.driver === 'police') updatePoliceCar(game, car, dt);
    if (car.wrecked) car.wreckTimer -= dt;
  }
  resolveCarBumps(game);
  for (const ped of game.peds) updatePedestrian(game, ped, dt);
  updateRivals(game, dt);
  updateMissions(game, dt);
  updateWanted(game, dt);
  topUpCrowd(game);

  // Particles drift and fade.
  for (const p of game.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2 * dt;
    p.vy *= 1 - 2 * dt;
    p.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);

  // The objective line the HUD shows.
  game.objectiveText = missionObjective(game);

  // The engine hum and the siren follow the game, when sound is on.
  const car = game.player.car;
  game.audio.engine(car ? Math.abs(car.speed) / 640 : 0, Boolean(car));
  game.audio.update(game.time);

  // A bust or a wasted run ends the game; the loop shows the over screen.
  if ((game.busted || game.wasted) && !game.over) {
    game.over = true;
    if (game.busted) {
      game.cash = Math.floor(game.cash * 0.8);
      game.wanted = 0;
    }
  }
}

export { STEP };
