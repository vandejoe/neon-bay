// Neon Bay: every tuning number, colour and key in one place. The camera shows a
// 1280x720 window of a 3600x2600 coastal city; the renderer scales that window to
// the browser window, so no rule below depends on the screen size.

/** The logical view the camera shows, in world pixels. */
export const VIEW = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The whole city, in world pixels: avenues run north-south, streets east-west. */
export const WORLD = { width: 3600, height: 2600 };

/** Centres of the north-south avenues and the east-west streets. */
export const AVENUES = [420, 920, 1420, 1920, 2420, 2920];
export const STREETS = [360, 820, 1280, 1740, 2200];
export const ROAD_WIDTH = 120;

/** The beach strip and the water along the south edge of the map. */
export const BEACH_Y = 2380;
export const WATER_Y = 2500;

/** Where the save lives between visits (this browser only). */
export const SAVE_KEY = 'neon-bay.save.v1';

export const PLAYER = {
  radius: 14,
  walkSpeed: 235,
  runSpeed: 340,
  health: 100,
  punchDamage: 26,
  punchRange: 40,
  punchCooldown: 0.38,
  punchArc: 1.9,
};

export const CAR = {
  length: 64,
  width: 32,
  accel: 560,
  reverseAccel: 340,
  maxSpeed: 640,
  maxReverse: 230,
  turnRate: 2.7,
  brake: 980,
  drag: 0.55,
  grip: 8.5,
  health: 100,
  /** Seconds a wrecked car smokes before it is towed away. */
  wreckTime: 14,
};

/** How many traffic cars and pedestrians wander the city at once. */
export const TRAFFIC = { cars: 11, peds: 20, carSpeed: 175, pedSpeed: 62 };

export const POLICE = {
  /** Police cars on the road at each wanted level, and how fast they chase. */
  carsPerStar: [0, 1, 2, 2, 3, 3],
  chaseSpeed: 690,
  ramDamage: 9,
  /** Seconds a police car must stay on the player to make the bust. */
  bustTime: 1.6,
  spawnDistance: 620,
};

export const WANTED = {
  max: 5,
  steal: 1,
  hitPed: 1,
  hitCop: 2,
  punch: 1,
  /** Quiet seconds with no police near before one star fades. */
  decaySeconds: 26,
};

export const MISSIONS = { markerRadius: 92 };

export const PALETTE = {
  backdrop: '#0d1020',
  grass: '#3f7d4e',
  parkGrass: '#4c9159',
  sand: '#e8cf9a',
  water: '#1f8fb5',
  waterDeep: '#1668a0',
  sidewalk: '#b9b3a4',
  road: '#3a3f4a',
  roadLine: '#e8d44d',
  curb: '#8f887a',
  buildingShadow: 'rgba(10, 12, 24, 0.35)',
  roofEdge: 'rgba(255, 255, 255, 0.25)',
  tree: '#2f6b3a',
  treeLight: '#57a05e',
  player: '#ffcf3f',
  playerJacket: '#e14b7a',
  cop: '#2f6df6',
  copLight: '#ff3b30',
  marker: '#ffd23f',
  text: '#f4f1e8',
  muted: '#b9bcc9',
  panel: 'rgba(12, 14, 28, 0.82)',
  panelEdge: '#ff5fa2',
  star: '#ffd23f',
  health: '#58d68d',
  healthLow: '#ff5a4e',
  speed: '#7fe7ff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Roof colours the city generator picks from, one per building. */
export const ROOF_COLORS = [
  '#e07856', '#5b8dd9', '#e0a458', '#7fb069', '#c77dff', '#f4845f',
  '#4cc9f0', '#f9c74f', '#90be6d', '#f3722c', '#577590', '#ff8fa3',
  '#b56576', '#6d6875', '#8ac926', '#ff6b6b',
];

/** Car paint colours, one per car. */
export const CAR_COLORS = [
  '#d94f3d', '#3d7bd9', '#e8b93c', '#7fb069', '#9b5de5', '#f15bb5',
  '#e8e8e8', '#2b2d42', '#00b4a2', '#ff8c42', '#5a189a', '#4361ee',
];

/** Named places the story and the minimap point at. */
export const PLACES = {
  spawn: { x: 1420, y: 1280, label: 'Coral Ave' },
  garage: { x: 1920, y: 560, label: 'Voss Garage' },
  pier: { x: 2850, y: 2440, label: 'Pier 9' },
  hideout: { x: 420, y: 2200, label: 'Hideout' },
  plaza: { x: 1420, y: 820, label: 'Coral Plaza' },
};
