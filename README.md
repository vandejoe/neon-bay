# Neon Bay

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/vandejoe/neon-bay/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/vandejoe/neon-bay/reward.svg)](https://make.fun/bounty/gta6-01)

**Neon Bay** is an open-world crime game set in a fictional sun-soaked
coastal city, built for the make.fun "Make GTA 6" bounty. Everything in it —
the city, the people, the story, the art and the sound — is original work,
drawn and synthesised in code. No assets from any commercial game are used.

You play Rook, new in town and short on cash. Mara Voss, who runs the
garage on the north side, has four jobs for you: borrow a car, run a package
to Pier 9 before the lunch crowd, settle a score with Dario's crew at Coral
Plaza, and then outrun the whole bay when the heat catches up.

## What is in the city

- A 3600×2600 coastal city: six avenues, five streets, a park, a boardwalk,
  a beach and the sea along the south edge, with around forty buildings.
- On foot and by car: walk, run, steal parked cars or pull drivers out of
  moving ones, and drive with traffic that follows the roads.
- Pedestrians on the sidewalks, traffic that brakes and turns at
  intersections, and police who chase you as the wanted level climbs from
  one star to five.
- Four story missions with objectives, timers and payouts, plus fist fights
  with health bars, a cash total, and a save that survives closing the tab.
- A HUD with cash, health, wanted stars, the current objective and a live
  minimap of the whole city; a title screen, pause screen and game-over
  screen; procedural WebAudio sound (engine hum, sirens, punches, jingles).

## How to play

Open `game/index.html` in a desktop browser (or run `node serve.ts` and
open http://localhost:8080). No build step and no network: the game is
plain static files.

| Key | Action |
| --- | --- |
| WASD / arrows | Walk, run, or drive |
| Shift | Run on foot |
| E | Steal / enter a car, or get out |
| F or click | Punch |
| P or Esc | Pause |
| M | Mute |
| Enter / Space | Start, continue, restart |

## How it is built

- `game/index.html` — the page; `game/src/main.js` — boot and the game loop.
- `game/src/state.js` — the one game state and its fixed step.
- `game/src/world.js` — the seeded city generator.
- `game/src/vehicles.js` — the driving model every car shares.
- `game/src/collide.js` — geometry: walls, sliding, road snapping.
- `game/src/traffic.js` — traffic cars and pedestrians.
- `game/src/police.js` — wanted level, chases and busts.
- `game/src/missions.js` — the four jobs and the save.
- `game/src/combat.js` — punches and rival fights.
- `game/src/render.js` + `game/src/hud.js` — drawing and the HUD/minimap.
- `game/src/audio.js` — procedural sound, no audio files.
- `game/src/shots.js` — the four staged scenes for the screenshots.
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.

## Licence

MIT — see [LICENSE](LICENSE).
