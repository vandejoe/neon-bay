// A small seeded random number generator (mulberry32) plus the helpers the city
// generator and the traffic spawners use: the same seed gives the same city,
// which is what makes the screenshot scenes repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** An integer in [min, max]. */
export function int(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** One entry of an array, picked uniformly. */
export function pick(random, array) {
  return array[Math.floor(random() * array.length)];
}

/** True with the given probability. */
export function chance(random, probability) {
  return random() < probability;
}
