// Drawing only: the city's pixels and the screens over them. The camera shows
// a 1280x720 window of the world, centred on the player and clamped to the
// map's edges; the title screen pans slowly over the city instead. Flat
// colours, soft shadows and neon signs — no images, nothing fetched.
import { CAR, FONT, PALETTE, ROAD_WIDTH, VIEW, WORLD } from './config.js';
import { drawHud } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The camera's slow drift over the city behind the title screen. */
const TITLE_PAN = { x: 900, y: 700, speed: 26 };

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.x = (width - VIEW.width * view.scale) / 2;
    view.y = (height - VIEW.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || ''} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function drawGround(game, camX, camY) {
    const city = game.city;
    // Grass base.
    context.fillStyle = PALETTE.grass;
    context.fillRect(camX - 40, camY - 40, VIEW.width + 80, VIEW.height + 80);
    // The park.
    context.fillStyle = PALETTE.parkGrass;
    context.fillRect(city.park.x0, city.park.y0, city.park.x1 - city.park.x0, city.park.y1 - city.park.y0);
    // Beach and water.
    context.fillStyle = PALETTE.sand;
    context.fillRect(camX - 40, city.beachY, VIEW.width + 80, city.waterY - city.beachY);
    context.fillStyle = PALETTE.water;
    context.fillRect(camX - 40, city.waterY, VIEW.width + 80, WORLD.height - city.waterY + 40);
    // Animated wave lines where the water meets the sand.
    context.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    context.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      const wy = city.waterY + 8 + i * 14 + Math.sin(game.time * 1.6 + i * 2) * 3;
      context.beginPath();
      context.moveTo(camX - 40, wy);
      context.lineTo(camX + VIEW.width + 40, wy);
      context.stroke();
    }
    // Boardwalk along the beach.
    context.fillStyle = '#c9a06a';
    context.fillRect(camX - 40, city.beachY - 14, VIEW.width + 80, 14);
  }

  function drawRoads(game, camX, camY) {
    const city = game.city;
    const half = ROAD_WIDTH / 2;
    context.fillStyle = PALETTE.road;
    for (const avenue of city.avenues) {
      context.fillRect(avenue - half, camY - 40, ROAD_WIDTH, VIEW.height + 80);
    }
    for (const street of city.streets) {
      context.fillRect(camX - 40, street - half, VIEW.width + 80, ROAD_WIDTH);
    }
    // Sidewalks: pale strips along each road's edges.
    context.fillStyle = PALETTE.sidewalk;
    for (const avenue of city.avenues) {
      context.fillRect(avenue - half - 14, camY - 40, 14, VIEW.height + 80);
      context.fillRect(avenue + half, camY - 40, 14, VIEW.height + 80);
    }
    for (const street of city.streets) {
      context.fillRect(camX - 40, street - half - 14, VIEW.width + 80, 14);
      context.fillRect(camX - 40, street + half, VIEW.width + 80, 14);
    }
    // Centre dashes.
    context.fillStyle = PALETTE.roadLine;
    for (const avenue of city.avenues) {
      for (let y = Math.floor((camY - 40) / 64) * 64; y < camY + VIEW.height + 40; y += 64) {
        context.fillRect(avenue - 3, y, 6, 30);
      }
    }
    for (const street of city.streets) {
      for (let x = Math.floor((camX - 40) / 64) * 64; x < camX + VIEW.width + 40; x += 64) {
        context.fillRect(x, street - 3, 30, 6);
      }
    }
  }

  function drawBuildings(game, camX, camY) {
    const city = game.city;
    const x1 = camX + VIEW.width;
    const y1 = camY + VIEW.height;
    for (const b of city.buildings) {
      if (b.x + b.w < camX || b.x > x1 || b.y + b.h < camY || b.y > y1) continue;
      // Drop shadow, then the roof, then a lighter rim and the name.
      context.fillStyle = PALETTE.buildingShadow;
      context.fillRect(b.x + 10, b.y + 12, b.w, b.h);
      context.fillStyle = b.color;
      context.fillRect(b.x, b.y, b.w, b.h);
      context.fillStyle = shade(b.color, 26);
      context.fillRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
      context.strokeStyle = PALETTE.roofEdge;
      context.lineWidth = 2;
      context.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      if (b.name) {
        text(b.name, b.x + b.w / 2, b.y + b.h / 2 + 5, 15, 'rgba(255, 255, 255, 0.85)', 'center', 'bold');
      }
    }
    for (const tree of city.trees) {
      if (tree.x < camX - 20 || tree.x > x1 + 20 || tree.y < camY - 20 || tree.y > y1 + 20) continue;
      context.fillStyle = 'rgba(10, 12, 24, 0.25)';
      context.beginPath();
      context.arc(tree.x + 4, tree.y + 5, tree.r, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = tree.park ? PALETTE.treeLight : PALETTE.tree;
      context.beginPath();
      context.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(255, 255, 255, 0.2)';
      context.beginPath();
      context.arc(tree.x - tree.r * 0.3, tree.y - tree.r * 0.3, tree.r * 0.4, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawMissionMarker(game) {
    const mission = game.mission;
    if (!mission || !mission.target) return;
    const { x, y } = mission.target;
    const pulse = 1 + Math.sin(game.time * 4) * 0.12;
    context.save();
    context.translate(x, y);
    context.scale(pulse, pulse);
    context.strokeStyle = PALETTE.marker;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(0, 0, 52, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = PALETTE.marker;
    context.beginPath();
    context.arc(0, 0, 8, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(0, -66);
    context.lineTo(10, -44);
    context.lineTo(-10, -44);
    context.closePath();
    context.fill();
    context.restore();
    text(mission.target.label, x, y - 74, 16, PALETTE.marker, 'center', 'bold');
  }

  function drawCarShape(car) {
    context.save();
    context.translate(car.x, car.y);
    context.rotate(car.angle);
    // Shadow.
    context.fillStyle = 'rgba(10, 12, 24, 0.3)';
    context.fillRect(-CAR.length / 2 + 4, -CAR.width / 2 + 5, CAR.length, CAR.width);
    // Body.
    context.fillStyle = car.wrecked ? '#3a3a3a' : car.color;
    context.beginPath();
    const r = 10;
    const hw = CAR.width / 2;
    const hl = CAR.length / 2;
    context.moveTo(-hl + r, -hw);
    context.lineTo(hl - r, -hw);
    context.quadraticCurveTo(hl, -hw, hl, -hw + r);
    context.lineTo(hl, hw - r);
    context.quadraticCurveTo(hl, hw, hl - r, hw);
    context.lineTo(-hl + r, hw);
    context.quadraticCurveTo(-hl, hw, -hl, hw - r);
    context.lineTo(-hl, -hw + r);
    context.quadraticCurveTo(-hl, -hw, -hl + r, -hw);
    context.fill();
    // Cabin and windshield.
    context.fillStyle = car.wrecked ? '#222' : 'rgba(20, 28, 44, 0.85)';
    context.fillRect(-8, -hw + 6, 22, CAR.width - 12);
    context.fillStyle = 'rgba(180, 220, 255, 0.5)';
    context.fillRect(14, -hw + 6, 6, CAR.width - 12);
    // Headlights and tail lights.
    context.fillStyle = '#ffe9a8';
    context.fillRect(hl - 4, -hw + 4, 4, 7);
    context.fillRect(hl - 4, hw - 11, 4, 7);
    context.fillStyle = '#ff3b30';
    context.fillRect(-hl, -hw + 4, 4, 7);
    context.fillRect(-hl, hw - 11, 4, 7);
    if (car.driver === 'police') {
      const flash = Math.sin(car.lightTimer * 12) > 0;
      context.fillStyle = flash ? '#ff3b30' : '#2f6df6';
      context.fillRect(-4, -hw + 2, 8, 8);
      context.fillStyle = flash ? '#2f6df6' : '#ff3b30';
      context.fillRect(-4, hw - 10, 8, 8);
      text('POLICE', 0, -hw - 8, 11, '#ffffff', 'center', 'bold');
    }
    if (car.wrecked) {
      context.fillStyle = 'rgba(120, 120, 120, 0.8)';
      context.beginPath();
      context.arc(-hl + 6, -hw + 4, 12, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawPedestrian(ped) {
    context.save();
    context.translate(ped.x, ped.y);
    if (ped.down) {
      context.rotate(Math.PI / 2);
      context.globalAlpha = 0.85;
    }
    context.fillStyle = 'rgba(10, 12, 24, 0.3)';
    context.beginPath();
    context.arc(2, 3, 10, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = ped.color;
    context.beginPath();
    context.arc(0, 0, 9, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#2b2118';
    context.beginPath();
    context.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3, 4.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawRival(game, rival) {
    context.save();
    context.translate(rival.x, rival.y);
    if (rival.down) {
      context.rotate(Math.PI / 2);
      context.globalAlpha = 0.7;
    }
    context.fillStyle = 'rgba(10, 12, 24, 0.3)';
    context.beginPath();
    context.arc(2, 3, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = rival.color;
    context.beginPath();
    context.arc(0, 0, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f2d7b6';
    context.beginPath();
    context.arc(Math.cos(rival.angle) * 4, Math.sin(rival.angle) * 4, 6, 0, Math.PI * 2);
    context.fill();
    if (rival.punchTimer > 0) {
      context.rotate(rival.angle);
      context.fillStyle = '#ffd23f';
      context.beginPath();
      context.arc(20, 0, 6, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    if (!rival.down) {
      const w = 40;
      context.fillStyle = 'rgba(13, 16, 32, 0.7)';
      context.fillRect(rival.x - w / 2, rival.y - 30, w, 6);
      context.fillStyle = rival.health > 30 ? PALETTE.health : PALETTE.healthLow;
      context.fillRect(rival.x - w / 2, rival.y - 30, w * (rival.health / rival.maxHealth), 6);
    }
  }

  function drawPlayer(game) {
    const player = game.player;
    if (player.car) return;
    if (player.hurtTimer > 0 && Math.floor(game.time * 12) % 2 === 0) return;
    context.save();
    context.translate(player.x, player.y);
    context.rotate(player.angle);
    context.fillStyle = 'rgba(10, 12, 24, 0.3)';
    context.beginPath();
    context.arc(2, 3, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.playerJacket;
    context.beginPath();
    context.arc(0, 0, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f2d7b6';
    context.beginPath();
    context.arc(5, 0, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(10, -7, 3, 0, Math.PI * 2);
    context.arc(10, 7, 3, 0, Math.PI * 2);
    context.fill();
    if (player.punchTimer > 0) {
      context.fillStyle = '#ffd23f';
      context.beginPath();
      context.arc(24, 0, 7, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawParticles(game) {
    for (const p of game.particles) {
      const alpha = Math.max(0, p.life / p.max);
      context.globalAlpha = alpha;
      context.fillStyle = p.color;
      if (p.kind === 'spark') {
        context.beginPath();
        context.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        context.fill();
      } else {
        context.beginPath();
        context.arc(p.x, p.y, p.size * (1 - alpha * 0.5), 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }

  function drawWorld(game, camX, camY) {
    context.save();
    context.setTransform(view.scale, 0, 0, view.scale, view.x - camX * view.scale, view.y - camY * view.scale);
    drawGround(game, camX, camY);
    drawRoads(game, camX, camY);
    drawBuildings(game, camX, camY);
    drawMissionMarker(game);
    for (const car of game.cars) drawCarShape(car);
    for (const ped of game.peds) drawPedestrian(ped);
    for (const rival of game.rivals) drawRival(game, rival);
    drawPlayer(game);
    drawParticles(game);
    context.restore();
  }

  function cameraFor(game, screen) {
    if (screen === SCREEN_TITLE) {
      const t = game.time * TITLE_PAN.speed;
      return {
        x: Math.max(0, Math.min(WORLD.width - VIEW.width, TITLE_PAN.x + Math.sin(t * 0.008) * 700)),
        y: Math.max(0, Math.min(WORLD.height - VIEW.height, TITLE_PAN.y + Math.cos(t * 0.006) * 350)),
      };
    }
    const player = game.player;
    return {
      x: Math.max(0, Math.min(WORLD.width - VIEW.width, player.x - VIEW.width / 2)),
      y: Math.max(0, Math.min(WORLD.height - VIEW.height, player.y - VIEW.height / 2)),
    };
  }

  function drawTitle(game, save) {
    context.fillStyle = 'rgba(10, 12, 28, 0.45)';
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    context.save();
    context.textAlign = 'center';
    context.shadowColor = '#ff5fa2';
    context.shadowBlur = 34;
    text('NEON BAY', VIEW.width / 2, 210, 110, '#ffd23f', 'center', 'bold');
    context.shadowBlur = 0;
    text('An open-world crime story on the coast', VIEW.width / 2, 258, 26, PALETTE.text, 'center');
    context.fillStyle = PALETTE.panel;
    context.fillRect(VIEW.width / 2 - 330, 300, 660, 210);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(VIEW.width / 2 - 329, 301, 658, 208);
    text(save ? 'CONTINUE  —  press ENTER' : 'NEW GAME  —  press ENTER', VIEW.width / 2, 350, 26, PALETTE.marker, 'center', 'bold');
    text('WASD / arrows — move and drive      E — steal / enter car', VIEW.width / 2, 398, 18, PALETTE.text, 'center');
    text('Shift — run      F / click — punch      P — pause      M — mute', VIEW.width / 2, 428, 18, PALETTE.text, 'center');
    text('Steal cars, run jobs for Mara Voss, dodge the police — and', VIEW.width / 2, 462, 18, PALETTE.muted, 'center');
    text('keep the cash. Your progress saves in this browser.', VIEW.width / 2, 488, 18, PALETTE.muted, 'center');
    text('A game by an AI agent for make.fun — original city, story and art', VIEW.width / 2, 640, 15, PALETTE.muted, 'center');
    context.restore();
  }

  function drawPaused() {
    context.fillStyle = 'rgba(10, 12, 28, 0.6)';
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    text('PAUSED', VIEW.width / 2, 330, 64, PALETTE.text, 'center', 'bold');
    text('Press P or ENTER to keep playing', VIEW.width / 2, 380, 20, PALETTE.muted, 'center');
  }

  function drawOver(game) {
    context.fillStyle = 'rgba(10, 12, 28, 0.72)';
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    const busted = game.busted;
    text(busted ? 'BUSTED' : 'WASTED', VIEW.width / 2, 300, 84, busted ? '#7fb0ff' : '#ff5a4e', 'center', 'bold');
    text(busted ? 'The police caught up with you. The garage pays your bail.' : 'Rook is down. Mara Voss sends her regards.', VIEW.width / 2, 350, 20, PALETTE.text, 'center');
    text(`Cash kept: $${Math.floor(game.cash * 0.8)}   ·   Jobs done: ${game.stats.missionsDone}`, VIEW.width / 2, 396, 20, PALETTE.muted, 'center');
    text('Press ENTER to get back on the streets', VIEW.width / 2, 450, 22, PALETTE.marker, 'center', 'bold');
  }

  function draw(game, screen, save) {
    resize();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const cam = cameraFor(game, screen);
    drawWorld(game, cam.x, cam.y);
    // The HUD and the screens are drawn in view space, over the world.
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(context, game);
    if (screen === SCREEN_TITLE) drawTitle(game, save);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(game);
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { draw, resize };
}
