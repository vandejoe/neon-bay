// The city's background life: traffic cars that cruise the avenues and
// streets and turn at intersections, and pedestrians strolling the
// sidewalks. Both keep the streets feeling full without ever needing the
// player's attention, and both get out of the way of a wreck.
import { AVENUES, CAR_COLORS, ROAD_WIDTH, STREETS, TRAFFIC } from './config.js';
import { createCar, driveCar } from './vehicles.js';
import { moveCircle, nearestRoadPoint, onRoad, steerToPoint } from './collide.js';
import { chance, int, pick, range } from './random.js';
import { randomIntersection, roadPointNear } from './world.js';

/** Shirt colours for the people on foot. */
const PED_COLORS = ['#e8e8e8', '#f4845f', '#5b8dd9', '#7fb069', '#c77dff', '#e0a458', '#ff8fa3', '#4cc9f0'];

/** A traffic car somewhere on the roads, heading along one of them. */
export function createTrafficCar(game, x, y) {
  const rng = game.rng;
  let spot = { x, y };
  if (spot.x === undefined || spot.y === undefined) {
    spot = randomIntersection(rng);
    // Park it on one side of the road, facing along it.
    if (chance(rng, 0.5)) spot = { x: spot.x + 30, y: spot.y };
    else spot = { x: spot.x, y: spot.y + 30 };
  }
  const alongAvenue = chance(rng, 0.5);
  const car = createCar(
    spot.x, spot.y,
    alongAvenue ? (chance(rng, 0.5) ? Math.PI / 2 : -Math.PI / 2) : (chance(rng, 0.5) ? 0 : Math.PI),
    pick(rng, CAR_COLORS), 'traffic',
  );
  // Each car keeps its own cruising speed and the lane it follows.
  car.cruise = TRAFFIC.carSpeed * range(rng, 0.75, 1.1);
  car.laneAxis = alongAvenue ? 'v' : 'h';
  car.laneDir = chance(rng, 0.5) ? 1 : -1;
  return car;
}

/** A pedestrian on a sidewalk near the roads, with somewhere to walk to. */
export function createPedestrian(game, x, y) {
  const rng = game.rng;
  let spot = { x, y };
  if (spot.x === undefined || spot.y === undefined) {
    const road = nearestRoadPoint(range(rng, 200, 3400), range(rng, 200, 2300));
    spot = { x: road.x + range(rng, -70, 70), y: road.y + range(rng, -70, 70) };
  }
  const ped = {
    x: spot.x, y: spot.y,
    angle: rng() * Math.PI * 2,
    color: pick(rng, PED_COLORS),
    speed: TRAFFIC.pedSpeed * range(rng, 0.7, 1.3),
    target: null,
    down: false,
    downTimer: 0,
    pause: 0,
  };
  ped.target = pickStrollTarget(game, ped);
  return ped;
}

/** A new strolling destination a couple of blocks away, on a sidewalk. */
function pickStrollTarget(game, ped) {
  const rng = game.rng;
  for (let tries = 0; tries < 8; tries += 1) {
    const road = nearestRoadPoint(
      ped.x + range(rng, -700, 700),
      ped.y + range(rng, -700, 700),
    );
    const side = chance(rng, 0.5) ? 1 : -1;
    const point = { x: road.x + side * (ROAD_WIDTH / 2 + 22), y: road.y };
    if (onRoad(point.x, point.y) || point.y > 2360) continue;
    return point;
  }
  return { x: ped.x + 120, y: ped.y };
}

/** One traffic car cruising: hold its lane, brake for the car ahead, turn at crossroads. */
export function updateTrafficCar(game, car, dt) {
  if (car.wrecked) return;
  const player = game.player;
  // A car that drifted far from the action reappears on a road near the player.
  if (Math.hypot(car.x - player.x, car.y - player.y) > 1700) {
    const spot = roadPointNear(game.rng, player.x, player.y, 500);
    car.x = spot.x;
    car.y = spot.y;
    car.speed = 0;
  }
  // Stay centred in the lane: steer toward the road's middle line.
  let guideX = car.x;
  let guideY = car.y;
  if (car.laneAxis === 'v') {
    const avenue = AVENUES.reduce((a, b) => (Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a), AVENUES[0]);
    guideX = avenue + 30 * car.laneDir;
    guideY = car.y + 120 * car.laneDir;
  } else {
    const street = STREETS.reduce((a, b) => (Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a), STREETS[0]);
    guideY = street + 30 * car.laneDir;
    guideX = car.x + 120 * car.laneDir;
  }
  // At an intersection, sometimes turn onto the crossing road.
  const nearCrossing =
    AVENUES.some((a) => Math.abs(car.x - a) < 46) && STREETS.some((s) => Math.abs(car.y - s) < 46);
  if (nearCrossing && chance(game.rng, dt * 0.5)) {
    if (car.laneAxis === 'v') {
      car.laneAxis = 'h';
      car.laneDir = chance(game.rng, 0.5) ? 1 : -1;
    } else {
      car.laneAxis = 'v';
      car.laneDir = chance(game.rng, 0.5) ? 1 : -1;
    }
  }
  // Brake for the car directly ahead so traffic queues instead of piling up.
  let ahead = false;
  for (const other of game.cars) {
    if (other === car || other.wrecked) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (along > 0 && along < 95 && side < 34) { ahead = true; break; }
  }
  const steer = steerToPoint(car.x, car.y, car.angle, guideX, guideY);
  const want = ahead ? 0 : car.cruise;
  const throttle = car.speed < want ? 0.7 : 0;
  driveCar(car, throttle, steer, ahead && car.speed > 30, game.city.buildings, dt);
  // A traffic car never speeds: clamp anything the chase physics gave it.
  if (car.speed > car.cruise + 40) car.speed = car.cruise + 40;
}

/** One pedestrian strolling: walk to the target, pause, pick another. */
export function updatePedestrian(game, ped, dt) {
  if (ped.down) {
    ped.downTimer -= dt;
    if (ped.downTimer <= 0) ped.down = false;
    return;
  }
  if (ped.pause > 0) {
    ped.pause -= dt;
    return;
  }
  const target = ped.target || pickStrollTarget(game, ped);
  ped.target = target;
  const dx = target.x - ped.x;
  const dy = target.y - ped.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 24) {
    ped.target = pickStrollTarget(game, ped);
    ped.pause = range(game.rng, 0.5, 2.5);
    return;
  }
  ped.angle = Math.atan2(dy, dx);
  moveCircle(ped, (dx / dist) * ped.speed * dt, (dy / dist) * ped.speed * dt, game.city.buildings);
}

/** Keep the streets full: tow expired wrecks, top traffic and walkers back up. */
export function topUpCrowd(game) {
  game.cars = game.cars.filter((car) => !(car.wrecked && car.wreckTimer <= 0));
  let traffic = 0;
  for (const car of game.cars) if (car.driver === 'traffic') traffic += 1;
  while (traffic < TRAFFIC.cars) {
    game.cars.push(createTrafficCar(game));
    traffic += 1;
  }
  while (game.peds.length < TRAFFIC.peds) {
    game.peds.push(createPedestrian(game));
  }
  // A crowd that grew too big (after a hijack spilled drivers out) thins out.
  while (game.peds.length > TRAFFIC.peds + 8) game.peds.pop();
}

export { int };
