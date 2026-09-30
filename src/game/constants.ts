export const LANE_WIDTH = 2.4;
export const LANES = [-1, 0, 1] as const;

export const INITIAL_SPEED = 18.0; // Units per second forward
export const MAX_SPEED = 36.0;
export const SPEED_ACCELERATION = 0.25; // Speed increase per 100 meters

export const JUMP_VELOCITY = 13.5;
export const GRAVITY = 38.0;
export const SLIDE_DURATION = 0.65; // Seconds

export const PLAYER_HEIGHT_STAND = 1.8;
export const PLAYER_HEIGHT_SLIDE = 0.8;
export const PLAYER_WIDTH = 0.9;
export const PLAYER_DEPTH = 0.9;

export const CHUNK_LENGTH = 45.0;
export const VISIBLE_CHUNKS = 7;
export const TRACK_WIDTH = LANE_WIDTH * 3 + 1.2;

export const CAMERA_OFFSET_Y = 2.5;
export const CAMERA_OFFSET_Z = -5.0;
export const CAMERA_LOOK_AHEAD_Y = 1.7;
export const CAMERA_LOOK_AHEAD_Z = 16.0;

// Track readability & scenery keep-out boundaries
export const SCENERY_SAFE_MARGIN = 2.2; // Minimum distance beyond track curbs where scenery is permitted
export const MIN_OBSTACLE_SPACING = 24.0; // Guaranteed minimum reaction spacing between consecutive obstacle gates

export const COLORS = {
  background: 0x141f17, // Atmospheric jungle canopy depth
  fog: 0x18261c, // Misty warm jungle morning atmosphere
  track: 0x4c463b, // Weathered ancient stone slabs
  trackMoss: 0x2e5328, // Deep moss in crevices
  trackBorder: 0x292524, // High-contrast carved stone curbs
  laneDivider: 0xd97706, // High-visibility ancient gold runic stone inlays
  laneDividerGlow: 0xfbbf24, // Runic edge highlight
  ruinStone: 0x6e6859, // Ancient sandstone temple blocks
  ruinStoneDark: 0x433f36, // Weathered granite
  foliageDark: 0x163319, // Deep rainforest foliage
  foliageBright: 0x3d702d, // Tropical palm fronds & ferns
  woodPlank: 0x543d2b, // Ancient weathered timber bridge
  waterStream: 0x26686e, // Tropical river water
  waterFoam: 0x8edbe0, // River rapids foam
  sunGlow: 0xffedd5, // Golden sun rays filtering through canopy
  goldIdol: 0xfacc15, // Golden ancient medallions / sun idols
  playerBody: 0x2e4033, // Explorer khaki / forest green vest
  playerVisor: 0x1c1917, // Dark leather hair/headband
  playerCore: 0xeab308, // Explorer brass compass / relic
  hurdle: 0xb45309, // Carved ancient stone barrier base (jump)
  hurdleGlow: 0xf59e0b, // Amber warning glow crystals & hazard chevrons
  highBeam: 0x7e22ce, // Overgrown ancient arch lintel (slide)
  highBeamGlow: 0xc084fc, // Amethyst energy crystals
  pillar: 0x991b1b, // Ancient monolith / guardian idol (switch lane)
  pillarEye: 0xef4444, // Glowing crimson guardian core
  coin: 0xfacc15, // Golden energy sun medallions
  debugPlayer: 0x06b6d4, // Cyan wireframe for player collider
  debugPillar: 0xef4444, // Red wireframe for pillar collider
  debugHurdle: 0xf97316, // Orange wireframe for hurdle collider
  debugHighBeam: 0xd946ef, // Magenta wireframe for high beam collider
  debugCoin: 0xeab308, // Yellow wireframe for coin collider
  debugLaneBounds: 0x38bdf8, // Sky blue for lane boundaries
  debugTrackBounds: 0xfacc15, // Amber for playable track bounds
};

