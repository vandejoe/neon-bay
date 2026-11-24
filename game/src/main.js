// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens: title,
// play, paused and game over. Progress saves to the browser after every job.
//
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { SAVE_KEY, STEP } from './config.js';
import { createAudio } from './audio.js';
import { createInput, readControls } from './input.js';
import { applySave, createGame, resetGame, stepGame } from './state.js';
import { loadProgress, saveProgress } from './missions.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const game = createGame(seed, audio);
const renderer = createRenderer(canvas);
const save = loadProgress(SAVE_KEY);

function runShot(name) {
  const scene = stageShot(name, seed);
  let painted = 0;
  function paint() {
    renderer.draw(scene.game, scene.screen, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame(fresh) {
    resetGame(game);
    if (!fresh) {
      const latest = loadProgress(SAVE_KEY);
      if (latest) applySave(game, latest);
    }
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing Neon Bay. First job: Borrowed Wheels.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    saveProgress(game);
    announce(game.busted ? 'Busted. The police caught up with you.' : 'Wasted. Rook is down.');
  }

  function handleActions(controls) {
    if (controls.mute) {
      audio.setMuted(!audio.isMuted());
      controls.mute = false;
    }
    if (controls.confirm && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      audio.unlock();
      audio.click();
      startGame(screen === SCREEN_TITLE);
      controls.confirm = false;
      return;
    }
    if (controls.pause && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      saveProgress(game);
      announce('Paused.');
      controls.pause = false;
      return;
    }
    if ((controls.pause || controls.confirm) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
      controls.pause = false;
      controls.confirm = false;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const controls = readControls(input);
    if (controls.confirm || controls.pause || controls.mute) audio.unlock();
    handleActions(controls);
    if (screen === SCREEN_TITLE) {
      // The city lives behind the title screen.
      while (accumulator >= STEP) {
        stepGame(game, { up: false, down: false, left: false, right: false, run: false, enter: false, punch: false, confirm: false, pause: false, mute: false }, STEP);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        stepGame(game, controls, STEP);
        accumulator -= STEP;
        if (game.busted || game.wasted) endGame();
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(game, screen, Boolean(save));
  }

  // Leaving the tab pauses a running game rather than letting the city run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      saveProgress(game);
      announce('Paused.');
    }
  });

  announce('Neon Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
