// Screenshot staging: build the four scenes the dossier's cover sheet is
// made from, each one a real game state stepped forward deterministically
// from the seed. main.js paints the returned scene twice and raises
// window.__shotReady; shots.json maps each scene to its file.
import { STEP } from './config.js';
import { createSilentAudio } from './audio.js';
import { createGame, stepGame } from './state.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { startMission } from './missions.js';
import { createCar } from './vehicles.js';

/** An idle control object: every field the simulation reads, all off. */
function idleControls() {
  return {
    up: false, down: false, left: false, right: false, run: false,
    enter: false, punch: false, confirm: false, pause: false, mute: false,
  };
}

/** Step the game forward `steps` times with the same controls held. */
function runFor(game, controls, steps) {
  for (let i = 0; i < steps; i += 1) {
    stepGame(game, { ...controls }, STEP);
  }
}

/** Put the player behind the wheel of a fresh car at (x, y), facing `angle`. */
function seatPlayerInCar(game, x, y, angle, color) {
  const car = createCar(x, y, angle, color, 'player');
  game.cars.push(car);
  game.player.car = car;
  game.player.x = x;
  game.player.y = y;
  game.player.angle = angle;
  return car;
}

/** The title screen: the city drifting behind the logo. */
function stageStart(seed) {
  const game = createGame(seed, createSilentAudio());
  return { game, screen: SCREEN_TITLE };
}

/** Driving east down Coral Street with traffic around and the minimap live. */
function stageDrive(seed) {
  const game = createGame(seed, createSilentAudio());
  startMission(game, 0);
  seatPlayerInCar(game, 1420, 1280, 0, '#d94f3d');
  const drive = idleControls();
  drive.up = true;
  runFor(game, drive, 150);
  return { game, screen: SCREEN_PLAY };
}

/** Three stars, police on the bumper, and the getaway job on the HUD. */
function stageChase(seed) {
  const game = createGame(seed, createSilentAudio());
  game.cash = 1240;
  startMission(game, 3);
  seatPlayerInCar(game, 920, 1740, 0, '#3d7bd9');
  const drive = idleControls();
  drive.up = true;
  runFor(game, drive, 240);
  return { game, screen: SCREEN_PLAY };
}

/** On foot at Coral Plaza, mid-brawl with Dario's crew. */
function stageMission(seed) {
  const game = createGame(seed, createSilentAudio());
  game.cash = 550;
  startMission(game, 2);
  game.player.x = 1420;
  game.player.y = 1000;
  game.player.angle = -Math.PI / 2;
  const walk = idleControls();
  walk.up = true;
  runFor(game, walk, 45);
  // A few swings once the crew closes in.
  for (let round = 0; round < 4; round += 1) {
    const swing = idleControls();
    swing.punch = true;
    runFor(game, swing, 1);
    runFor(game, idleControls(), 24);
  }
  return { game, screen: SCREEN_PLAY };
}

/** Stage one named scene: 'start', 'drive', 'chase' or 'mission'. */
export function stageShot(name, seed) {
  switch (name) {
    case 'drive':
      return stageDrive(seed);
    case 'chase':
      return stageChase(seed);
    case 'mission':
      return stageMission(seed);
    case 'start':
    default:
      return stageStart(seed);
  }
}
