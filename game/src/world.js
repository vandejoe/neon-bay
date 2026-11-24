// The city itself: Neon Bay is built once from the seed — avenues and streets,
// the blocks between them with their buildings, a park, the beach and the water,
// trees, and the named places the story points at. Nothing here moves; the
// other modules read the city and ask it where things are.
import { AVENUES, BEACH_Y, PLACES, ROOF_COLORS, STREETS, WATER_Y, WORLD } from './config.js';
import { chance, int, pick, range } from './random.js';

/** Landmark names painted on the roofs of the biggest buildings. */
const LANDMARK_NAMES = [
  'Bay Tower', 'Hotel Marina', 'Neon Arcade', 'Coral Plaza', 'Pier 9 Diner',
  'Voss Garage', 'Sunset Mall', 'Harbor Bank', 'Wave Hotel', 'Palm Court',
];

/** The block between avenues 1920-2420 and streets 1280-1740 is the city park. */
const PARK = { x0: 1920, y0: 1280, x1: 2420, y1: 1740 };

function blockBounds() {
  const xs = [0, ...AVENUES, WORLD.width];
  const ys = [0, ...STREETS, BEACH_Y, WORLD.height];
  const blocks = [];
  for (let i = 0; i < xs.length - 1; i += 1) {
    for (let j = 0; j < ys.length - 1; j += 1) {
      blocks.push({ x0: xs[i], y0: ys[j], x1: xs[i + 1], y1: ys[j + 1] });
    }
  }
  return blocks;
}

function buildBuildings(random) {
  const buildings = [];
  let landmark = 0;
  for (const block of blockBounds()) {
    // The park, the beach strip and the water hold no buildings.
    if (block.x0 >= PARK.x0 && block.x1 <= PARK.x1 && block.y0 >= PARK.y0 && block.y1 <= PARK.y1) continue;
    if (block.y0 >= BEACH_Y) continue;
    const inset = 72;
    const inner = {
      x0: block.x0 + inset, y0: block.y0 + inset,
      x1: block.x1 - inset, y1: block.y1 - inset,
    };
    const width = inner.x1 - inner.x0;
    const height = inner.y1 - inner.y0;
    if (width < 130 || height < 130) continue;
    const count = width > 320 && height > 300 && chance(random, 0.6) ? 2 : 1;
    if (count === 1) {
      const w = Math.min(width, range(random, 150, 280));
      const h = Math.min(height, range(random, 130, 250));
      buildings.push({
        x: inner.x0 + (width - w) / 2, y: inner.y0 + (height - h) / 2,
        w, h, color: pick(random, ROOF_COLORS),
        name: landmark < LANDMARK_NAMES.length && w * h > 42000 ? LANDMARK_NAMES[landmark++] : '',
      });
    } else {
      const split = inner.x0 + width * range(random, 0.42, 0.58);
      const left = { x: inner.x0, y: inner.y0, w: split - inner.x0 - 26, h: height };
      const right = { x: split + 26, y: inner.y0, w: inner.x1 - split - 26, h: height };
      for (const part of [left, right]) {
        const w = Math.min(part.w, range(random, 120, 220));
        const h = Math.min(part.h, range(random, 120, 220));
        buildings.push({
          x: part.x + (part.w - w) / 2, y: part.y + (part.h - h) / 2,
          w, h, color: pick(random, ROOF_COLORS),
          name: landmark < LANDMARK_NAMES.length && w * h > 30000 ? LANDMARK_NAMES[landmark++] : '',
        });
      }
    }
  }
  return buildings;
}

function buildTrees(random, buildings) {
  const trees = [];
  for (let i = 0; i < 130; i += 1) {
    const x = range(random, 40, WORLD.width - 40);
    const y = range(random, 40, BEACH_Y - 30);
    // Trees grow on sidewalks, in the park and on the beach edge, never inside a building.
    let inside = false;
    for (const b of buildings) {
      if (x > b.x - 14 && x < b.x + b.w + 14 && y > b.y - 14 && y < b.y + b.h + 14) { inside = true; break; }
    }
    if (inside) continue;
    const inPark = x > PARK.x0 && x < PARK.x1 && y > PARK.y0 && y < PARK.y1;
    const nearRoad = AVENUES.some((a) => Math.abs(x - a) < 78) || STREETS.some((s) => Math.abs(y - s) < 78);
    if (inPark || nearRoad || chance(random, 0.25)) {
      trees.push({ x, y, r: range(random, 9, 15), park: inPark });
    }
  }
  // The park is dense with trees.
  for (let i = 0; i < 26; i += 1) {
    trees.push({
      x: range(random, PARK.x0 + 30, PARK.x1 - 30),
      y: range(random, PARK.y0 + 30, PARK.y1 - 30),
      r: range(random, 10, 17), park: true,
    });
  }
  return trees;
}

/** Build the whole city from the seed. */
export function buildCity(random) {
  const buildings = buildBuildings(random);
  const trees = buildTrees(random, buildings);
  return {
    avenues: AVENUES,
    streets: STREETS,
    buildings,
    trees,
    park: PARK,
    beachY: BEACH_Y,
    waterY: WATER_Y,
    places: { ...PLACES },
    /** Parked cars the player can steal, placed along the avenues. */
    parkedSpots: [
      { x: 1420, y: 1010, angle: Math.PI / 2 }, { x: 1420, y: 1560, angle: -Math.PI / 2 },
      { x: 920, y: 640, angle: Math.PI / 2 }, { x: 1920, y: 1010, angle: -Math.PI / 2 },
      { x: 2420, y: 1560, angle: Math.PI / 2 }, { x: 420, y: 1010, angle: Math.PI / 2 },
      { x: 2920, y: 640, angle: -Math.PI / 2 }, { x: 920, y: 1900, angle: Math.PI / 2 },
      { x: 1920, y: 1900, angle: -Math.PI / 2 }, { x: 2420, y: 640, angle: Math.PI / 2 },
      { x: 420, y: 1560, angle: -Math.PI / 2 }, { x: 2920, y: 1900, angle: Math.PI / 2 },
    ],
  };
}

/** True when the point is in the water (cars and walkers never go there). */
export function inWater(x, y) {
  return y >= WATER_Y;
}

/** True when the point is on the sand. */
export function onBeach(x, y) {
  return y >= BEACH_Y && y < WATER_Y;
}

/** A random road intersection, for spawning traffic and police. */
export function randomIntersection(random) {
  return { x: pick(random, AVENUES), y: pick(random, STREETS) };
}

/** A random point on a road near (x, y), at least `minAway` from it. */
export function roadPointNear(random, x, y, minAway) {
  for (let tries = 0; tries < 24; tries += 1) {
    const p = randomIntersection(random);
    const dx = p.x - x;
    const dy = p.y - y;
    if (Math.hypot(dx, dy) >= minAway) return p;
  }
  return { x: pick(random, AVENUES), y: pick(random, STREETS) };
}

export function landmarkCount() {
  return LANDMARK_NAMES.length;
}

export { int };
