// The heads-up display and the minimap, drawn over the world: cash and health
// top-left, wanted stars top-right, the mission objective across the top,
// speed bottom-left while driving, and a live minimap of the whole city
// bottom-right with the player, the police and the mission marker on it.
import { PALETTE, VIEW, WANTED } from './config.js';

const MINIMAP = { width: 210, height: 152, margin: 16 };

function drawStar(context, x, y, size, filled) {
  context.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? size : size * 0.45;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
  context.fillStyle = filled ? PALETTE.star : 'rgba(244, 241, 232, 0.25)';
  context.fill();
  context.strokeStyle = 'rgba(13, 16, 32, 0.8)';
  context.lineWidth = 1.5;
  context.stroke();
}

function drawPanel(context, x, y, width, height) {
  context.fillStyle = PALETTE.panel;
  context.fillRect(x, y, width, height);
  context.strokeStyle = 'rgba(244, 241, 232, 0.25)';
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

function drawMinimap(context, game) {
  const x0 = VIEW.width - MINIMAP.width - MINIMAP.margin;
  const y0 = VIEW.height - MINIMAP.height - MINIMAP.margin;
  const sx = MINIMAP.width / game.cityWidth;
  const sy = MINIMAP.height / game.cityHeight;
  drawPanel(context, x0 - 6, y0 - 6, MINIMAP.width + 12, MINIMAP.height + 12);
  context.save();
  context.beginPath();
  context.rect(x0, y0, MINIMAP.width, MINIMAP.height);
  context.clip();
  // Sand and water along the bottom.
  context.fillStyle = PALETTE.grass;
  context.fillRect(x0, y0, MINIMAP.width, MINIMAP.height);
  context.fillStyle = PALETTE.sand;
  context.fillRect(x0, y0 + game.city.beachY * sy, MINIMAP.width, (game.city.waterY - game.city.beachY) * sy);
  context.fillStyle = PALETTE.water;
  context.fillRect(x0, y0 + game.city.waterY * sy, MINIMAP.width, MINIMAP.height - game.city.waterY * sy);
  // Roads.
  context.fillStyle = '#565b66';
  for (const avenue of game.city.avenues) {
    context.fillRect(x0 + avenue * sx - 3, y0, 6, MINIMAP.height);
  }
  for (const street of game.city.streets) {
    context.fillRect(x0, y0 + street * sy - 3, MINIMAP.width, 6);
  }
  // Mission marker: a pulsing yellow diamond.
  const mission = game.mission;
  if (mission && mission.target) {
    const mx = x0 + mission.target.x * sx;
    const my = y0 + mission.target.y * sy;
    const pulse = 5 + Math.sin(game.time * 5) * 2;
    context.fillStyle = PALETTE.marker;
    context.beginPath();
    context.moveTo(mx, my - pulse);
    context.lineTo(mx + pulse, my);
    context.lineTo(mx, my + pulse);
    context.lineTo(mx - pulse, my);
    context.closePath();
    context.fill();
  }
  // Police cars flash red and blue.
  for (const car of game.cars) {
    if (car.driver !== 'police') continue;
    context.fillStyle = Math.sin(game.time * 10) > 0 ? '#ff3b30' : '#2f6df6';
    context.beginPath();
    context.arc(x0 + car.x * sx, y0 + car.y * sy, 3.5, 0, Math.PI * 2);
    context.fill();
  }
  // The player's car, when driving, is a white dot.
  if (game.player.car) {
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(x0 + game.player.car.x * sx, y0 + game.player.car.y * sy, 3, 0, Math.PI * 2);
    context.fill();
  }
  // The player is a yellow arrow pointing where they face.
  const px = x0 + game.player.x * sx;
  const py = y0 + game.player.y * sy;
  context.fillStyle = PALETTE.player;
  context.beginPath();
  context.moveTo(px + Math.cos(game.player.angle) * 7, py + Math.sin(game.player.angle) * 7);
  context.lineTo(px + Math.cos(game.player.angle + 2.5) * 5, py + Math.sin(game.player.angle + 2.5) * 5);
  context.lineTo(px + Math.cos(game.player.angle - 2.5) * 5, py + Math.sin(game.player.angle - 2.5) * 5);
  context.closePath();
  context.fill();
  context.restore();
  context.fillStyle = PALETTE.text;
  context.font = 'bold 13px system-ui, sans-serif';
  context.textAlign = 'left';
  context.fillText('NEON BAY', x0, y0 - 10);
}

/** Draw the whole HUD over a playing frame. */
export function drawHud(context, game) {
  context.save();
  context.textBaseline = 'alphabetic';
  // Cash and health, top-left.
  drawPanel(context, 16, 14, 250, 64);
  context.fillStyle = PALETTE.text;
  context.font = 'bold 26px system-ui, sans-serif';
  context.textAlign = 'left';
  context.fillText(`$${game.cash}`, 30, 44);
  context.fillStyle = game.player.health > 30 ? PALETTE.health : PALETTE.healthLow;
  context.fillRect(30, 54, 222 * (game.player.health / 100), 10);
  context.strokeStyle = 'rgba(244, 241, 232, 0.4)';
  context.strokeRect(30.5, 54.5, 222, 10);
  // Wanted stars, top-right.
  const starSize = 15;
  const starGap = 34;
  const starsX = VIEW.width - 16 - WANTED.max * starGap;
  for (let i = 0; i < WANTED.max; i += 1) {
    drawStar(context, starsX + i * starGap + starSize, 40, starSize, i < game.wanted);
  }
  context.fillStyle = PALETTE.text;
  context.font = 'bold 13px system-ui, sans-serif';
  context.textAlign = 'right';
  context.fillText(game.wanted > 0 ? 'WANTED' : 'CLEAN', VIEW.width - 16, 66);
  // Mission objective, across the top centre.
  const objective = game.objectiveText || '';
  if (objective) {
    context.font = 'bold 17px system-ui, sans-serif';
    const width = Math.min(620, context.measureText(objective).width + 36);
    drawPanel(context, (VIEW.width - width) / 2, 14, width, 34);
    context.fillStyle = PALETTE.marker;
    context.textAlign = 'center';
    context.fillText(objective, VIEW.width / 2, 37);
  }
  // Speed, bottom-left while driving.
  if (game.player.car) {
    const mph = Math.round(Math.abs(game.player.car.speed) * 0.12);
    context.fillStyle = PALETTE.text;
    context.font = 'bold 44px system-ui, sans-serif';
    context.textAlign = 'left';
    context.fillText(String(mph), 28, VIEW.height - 30);
    context.font = 'bold 15px system-ui, sans-serif';
    context.fillStyle = PALETTE.speed;
    context.fillText('MPH', 28, VIEW.height - 8);
    if (game.player.car.health < 100) {
      context.fillStyle = PALETTE.healthLow;
      context.fillRect(28, VIEW.height - 78, 130 * (game.player.car.health / 100), 8);
      context.strokeStyle = 'rgba(244, 241, 232, 0.4)';
      context.strokeRect(28.5, VIEW.height - 78.5, 130, 8);
    }
  } else {
    context.fillStyle = PALETTE.muted;
    context.font = '14px system-ui, sans-serif';
    context.textAlign = 'left';
    context.fillText('WASD move · Shift run · E enter car · F punch · P pause · M mute', 16, VIEW.height - 12);
  }
  // The minimap, bottom-right.
  drawMinimap(context, game);
  // A banner celebrates a finished job or warns of trouble.
  if (game.banner && game.banner.timer > 0) {
    const alpha = Math.min(1, game.banner.timer);
    context.globalAlpha = alpha;
    context.fillStyle = PALETTE.panel;
    const bw = 560;
    context.fillRect((VIEW.width - bw) / 2, 190, bw, 92);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect((VIEW.width - bw) / 2 + 1, 191, bw - 2, 90);
    context.fillStyle = PALETTE.marker;
    context.font = 'bold 34px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(game.banner.text, VIEW.width / 2, 232);
    context.fillStyle = PALETTE.text;
    context.font = '16px system-ui, sans-serif';
    const sub = game.banner.sub || '';
    const words = sub.split(' ');
    let line = '';
    let lineY = 258;
    for (const word of words) {
      if (context.measureText(line + word).width > bw - 40) {
        context.fillText(line.trim(), VIEW.width / 2, lineY);
        line = '';
        lineY += 20;
      }
      line += word + ' ';
    }
    if (line.trim()) context.fillText(line.trim(), VIEW.width / 2, lineY);
    context.globalAlpha = 1;
  }
  context.restore();
}
