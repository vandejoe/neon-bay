// The story: four jobs for Mara Voss, the garage owner who runs Neon Bay's
// quiet side. Each job has a target on the map and a clear way to finish
// it; the HUD always shows what the current job needs. Progress (cash, jobs
// done, position) saves to the browser so a run survives closing the tab.
import { MISSIONS, PLACES } from './config.js';
import { distance } from './collide.js';
import { addCrime } from './police.js';

/** The four jobs, in order. `timeLimit` is seconds where a job is timed. */
export const MISSION_DEFS = [
  {
    title: 'Borrowed Wheels',
    brief: 'Mara needs a car, and yours is due for an upgrade. Take any car on the street and bring it to her garage.',
    target: { ...PLACES.garage },
    reward: 150,
  },
  {
    title: 'Pier 9 Run',
    brief: 'A sealed package has to reach the Pier 9 diner before the lunch crowd. Fast wheels, no detours, no police.',
    target: { ...PLACES.pier },
    reward: 250,
    timeLimit: 80,
  },
  {
    title: 'Plaza Brawl',
    brief: "Dario's crew is leaning on the plaza vendors. Walk in and settle it with your fists — all three of them.",
    target: { ...PLACES.plaza },
    reward: 400,
  },
  {
    title: 'Hot Exit',
    brief: 'The whole bay is looking for you now. Three stars and rising — shake the chase and get to the hideout in one piece.',
    target: { ...PLACES.hideout },
    reward: 600,
  },
];

/** Start job `index`: set its target, arm its setup, and announce it. */
export function startMission(game, index) {
  const def = MISSION_DEFS[index];
  if (!def) {
    game.mission = null;
    game.allMissionsDone = true;
    return;
  }
  game.mission = {
    index,
    def,
    target: { ...def.target },
    stage: 'go',
    timer: def.timeLimit || 0,
    rivalsSpawned: false,
  };
  game.banner = { text: `JOB ${index + 1}: ${def.title.toUpperCase()}`, sub: def.brief, timer: 4 };
  if (index === 2) {
    // Dario's crew waits at the plaza: three rivals, fists ready.
    game.rivals = [];
    const spots = [
      { x: def.target.x - 70, y: def.target.y - 40 },
      { x: def.target.x + 60, y: def.target.y - 70 },
      { x: def.target.x + 10, y: def.target.y + 70 },
    ];
    const colors = ['#8c2f39', '#3d5a80', '#6d6875'];
    spots.forEach((spot, i) => {
      game.rivals.push({
        x: spot.x, y: spot.y, angle: 0, color: colors[i],
        health: 78, maxHealth: 78, down: false,
        punchTimer: 0, punchCooldown: 0,
        speed: 165, damage: 9,
      });
    });
    game.mission.rivalsSpawned = true;
  }
  if (index === 3) {
    // The getaway starts hot: three stars the moment the job opens.
    addCrime(game, 3);
  }
}

/** The one-line objective the HUD shows for the current job. */
export function missionObjective(game) {
  const mission = game.mission;
  if (!mission) {
    return game.allMissionsDone ? 'All jobs done — Neon Bay is yours' : '';
  }
  const def = mission.def;
  const left = game.rivals.filter((r) => !r.down).length;
  switch (mission.index) {
    case 0:
      return game.player.car
        ? 'JOB 1 — Bring the car to Voss Garage'
        : 'JOB 1 — Steal a car (E near one)';
    case 1: {
      const seconds = Math.max(0, Math.ceil(mission.timer));
      return `JOB 2 — Deliver the package to Pier 9 · ${seconds}s left`;
    }
    case 2:
      return mission.rivalsSpawned
        ? `JOB 3 — Settle the plaza brawl · ${left} crew left`
        : 'JOB 3 — Get to Coral Plaza';
    case 3:
      return 'JOB 4 — Lose the chase, reach the Hideout';
    default:
      return def.title;
  }
}

/** Pay out a finished job and open the next one, or close the story. */
export function completeMission(game) {
  const mission = game.mission;
  if (!mission) return;
  const def = mission.def;
  game.cash += def.reward;
  game.stats.missionsDone += 1;
  game.banner = { text: 'JOB DONE', sub: `${def.title} — +$${def.reward}`, timer: 3.5 };
  game.audio.jingle(true);
  game.audio.pickup();
  saveProgress(game);
  const next = mission.index + 1;
  if (next < MISSION_DEFS.length) startMission(game, next);
  else {
    game.mission = null;
    game.allMissionsDone = true;
    game.banner = { text: 'ALL JOBS DONE', sub: 'Neon Bay is yours, Rook.', timer: 5 };
  }
}

/** One step of the current job: check its finish line and its timer. */
export function updateMissions(game, dt) {
  const mission = game.mission;
  if (!mission) return;
  const player = game.player;
  const reach = MISSIONS.markerRadius;
  switch (mission.index) {
    case 0: {
      // Finished by parking the stolen car at the garage.
      if (player.car && distance(player.x, player.y, mission.target.x, mission.target.y) < reach) {
        completeMission(game);
      }
      break;
    }
    case 1: {
      mission.timer -= dt;
      if (mission.timer <= 0) {
        // Too slow: the package is late, Mara gives the run one more shot.
        mission.timer = mission.def.timeLimit;
        game.banner = { text: 'TOO SLOW', sub: 'The package missed the lunch crowd — run it again.', timer: 3 };
        break;
      }
      if (distance(player.x, player.y, mission.target.x, mission.target.y) < reach) {
        completeMission(game);
      }
      break;
    }
    case 2: {
      if (mission.rivalsSpawned && game.rivals.length > 0 && game.rivals.every((r) => r.down)) {
        completeMission(game);
      }
      break;
    }
    case 3: {
      if (distance(player.x, player.y, mission.target.x, mission.target.y) < reach) {
        completeMission(game);
      }
      break;
    }
    default:
      break;
  }
}

/** Save cash, jobs done and position to this browser. */
export function saveProgress(game) {
  try {
    if (typeof localStorage === 'undefined') return;
    const index = game.allMissionsDone ? MISSION_DEFS.length : (game.mission ? game.mission.index : 0);
    localStorage.setItem(game.saveKey, JSON.stringify({
      cash: game.cash,
      missionsDone: game.stats.missionsDone,
      carsStolen: game.stats.carsStolen,
      player: { x: Math.round(game.player.x), y: Math.round(game.player.y) },
      missionIndex: index,
    }));
  } catch {
    // A browser that refuses storage just plays without saving.
  }
}

/** Read the save back, or null when there is none (or it is broken). */
export function loadProgress(saveKey) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(saveKey);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (typeof save !== 'object' || save === null) return null;
    return save;
  } catch {
    return null;
  }
}
