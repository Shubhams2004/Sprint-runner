import * as THREE from 'three';

export type GameState = 'START' | 'RUNNING' | 'GAME_OVER' | 'PAUSED';

export type LaneIndex = -1 | 0 | 1;

export type ObstacleType = 'HURDLE' | 'HIGH_BEAM' | 'PILLAR' | 'COIN';

export interface BoundingBox3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface ObstacleItem {
  id: number;
  type: ObstacleType;
  lane: LaneIndex;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  collected?: boolean;
  mesh: THREE.Object3D;
  box: BoundingBox3D;
}

export interface TrackChunk {
  index: number;
  zStart: number;
  zEnd: number;
  group: THREE.Group;
  obstacles: ObstacleItem[];
}

export interface GameStats {
  score: number;
  highScore: number;
  distance: number;
  coins: number;
  speed: number;
}

export interface GameCallbacks {
  onStateChange: (state: GameState) => void;
  onStatsUpdate: (stats: GameStats) => void;
  onCrash: () => void;
  onCoinCollect: (coins: number) => void;
}
