// Keyboard and pointer input. Held keys steer and drive; one-shot presses (start,
// pause, enter a car, punch) are queued as bit flags and taken once by the loop,
// so a press between two frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const MUTE = new Set(['KeyM']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);

export function createInput(target) {
  const held = { up: false, down: false, left: false, right: false, run: false };
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (RUN.has(event.code)) held.run = true;
    else if (UP.has(event.code)) held.up = true;
    else if (DOWN.has(event.code)) held.down = true;
    else if (LEFT.has(event.code)) held.left = true;
    else if (RIGHT.has(event.code)) held.right = true;
    else if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (ENTER.has(event.code)) { if (!event.repeat) actions |= ACTION_ENTER; }
    else if (PUNCH.has(event.code)) { if (!event.repeat) actions |= ACTION_PUNCH; }
    else if (MUTE.has(event.code)) { if (!event.repeat) actions |= ACTION_MUTE; }
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (RUN.has(event.code)) held.run = false;
    else if (UP.has(event.code)) held.up = false;
    else if (DOWN.has(event.code)) held.down = false;
    else if (LEFT.has(event.code)) held.left = false;
    else if (RIGHT.has(event.code)) held.right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    held.up = false; held.down = false; held.left = false; held.right = false; held.run = false;
  });
  // A click starts the game on the title screen and throws a punch while playing.
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM | ACTION_PUNCH;
  });

  return {
    held,
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

/**
 * Build the per-step control object the simulation reads: held directions plus
 * the edge-triggered actions of this frame. The simulation clears the edge
 * flags it consumes, so a press never fires twice.
 */
export function readControls(input) {
  const actions = input.takeActions();
  return {
    up: input.held.up,
    down: input.held.down,
    left: input.held.left,
    right: input.held.right,
    run: input.held.run,
    confirm: Boolean(actions & ACTION_CONFIRM),
    pause: Boolean(actions & ACTION_PAUSE),
    enter: Boolean(actions & ACTION_ENTER),
    punch: Boolean(actions & ACTION_PUNCH),
    mute: Boolean(actions & ACTION_MUTE),
  };
}
