// Geometry helpers for Neon Bay: distances, angles, circle-vs-building
// tests and sliding movement. Every moving thing in the city (the player on
// foot, cars, pedestrians, rivals) moves through moveCircle so walls behave
// the same everywhere, and nothing ever ends up in the water.
import { AVENUES, ROAD_WIDTH, STREETS, WATER_Y, WORLD } from './config.js';

/** Keep a number inside [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Straight-line distance between two points. */
export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/** The heading from (x1, y1) toward (x2, y2), in radians. */
export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/** The smallest signed turn from one heading to another, in (-PI, PI]. */
export function angleDiff(from, to) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff <= -Math.PI) diff += Math.PI * 2;
  return diff;
}

/** True when a circle touches or overlaps an axis-aligned rectangle. */
export function circleHitsRect(x, y, radius, rect) {
  const closestX = clamp(x, rect.x, rect.x + rect.w);
  const closestY = clamp(y, rect.y, rect.y + rect.h);
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

/** The first rectangle a circle overlaps, or null when it touches none. */
export function firstBuildingHit(x, y, radius, rects) {
  for (const rect of rects) {
    if (circleHitsRect(x, y, radius, rect)) return rect;
  }
  return null;
}

/**
 * Move a circle by (dx, dy), sliding along walls: each axis is tried on its
 * own, so a walker pushed into a building corner slides along the wall
 * instead of sticking. The water south of the beach is solid too. Returns
 * the displacement that actually happened.
 */
export function moveCircle(entity, dx, dy, rects) {
  const radius = entity.radius || 12;
  let movedX = 0;
  let movedY = 0;
  const targetX = clamp(entity.x + dx, radius, WORLD.width - radius);
  if (!firstBuildingHit(targetX, entity.y, radius, rects)) {
    movedX = targetX - entity.x;
    entity.x = targetX;
  }
  const targetY = clamp(entity.y + dy, radius, WATER_Y - radius - 2);
  if (!firstBuildingHit(entity.x, targetY, radius, rects)) {
    movedY = targetY - entity.y;
    entity.y = targetY;
  }
  return { x: movedX, y: movedY };
}

/**
 * Steering input in [-1, 1] that turns a heading toward a point: positive
 * turns left, negative turns right, scaled by how far off course we are.
 */
export function steerToPoint(x, y, angle, tx, ty) {
  const want = angleTo(x, y, tx, ty);
  const diff = angleDiff(angle, want);
  return clamp(diff * 2.2, -1, 1);
}

/** True when the point is on a road (avenue or street, kerb included). */
export function onRoad(x, y) {
  const half = ROAD_WIDTH / 2 + 14;
  for (const avenue of AVENUES) {
    if (Math.abs(x - avenue) <= half) return true;
  }
  for (const street of STREETS) {
    if (Math.abs(y - street) <= half) return true;
  }
  return false;
}

/**
 * The nearest point on the road network: snap to the closest avenue when
 * the point is nearer one sideways, else to the closest street.
 */
export function nearestRoadPoint(x, y) {
  let bestAvenue = AVENUES[0];
  let bestAvenueGap = Math.abs(x - bestAvenue);
  for (const avenue of AVENUES) {
    const gap = Math.abs(x - avenue);
    if (gap < bestAvenueGap) {
      bestAvenue = avenue;
      bestAvenueGap = gap;
    }
  }
  let bestStreet = STREETS[0];
  let bestStreetGap = Math.abs(y - bestStreet);
  for (const street of STREETS) {
    const gap = Math.abs(y - street);
    if (gap < bestStreetGap) {
      bestStreet = street;
      bestStreetGap = gap;
    }
  }
  if (bestAvenueGap <= bestStreetGap) return { x: bestAvenue, y };
  return { x, y: bestStreet };
}
