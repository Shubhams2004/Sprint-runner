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

export const CAMERA_OFFSET_Y = 3.6;
export const CAMERA_OFFSET_Z = -6.8;
export const CAMERA_LOOK_AHEAD_Y = 1.4;
export const CAMERA_LOOK_AHEAD_Z = 10.0;

export const COLORS = {
  background: 0x07090e,
  fog: 0x07090e,
  track: 0x111622,
  trackEdge: 0x06b6d4,
  laneDivider: 0x223048,
  playerBody: 0x38bdf8,
  playerVisor: 0x0284c7,
  playerCore: 0x34d399,
  hurdle: 0xf59e0b, // Amber - Jump over
  highBeam: 0xec4899, // Pink/Magenta - Slide under
  pillar: 0xef4444, // Red - Lane switch required
  coin: 0xfacc15, // Golden energy orbs
};
