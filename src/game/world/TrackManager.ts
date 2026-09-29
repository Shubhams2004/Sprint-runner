import * as THREE from 'three';
import { VISIBLE_CHUNKS } from '../constants';
import { ObstacleItem } from '../types';
import { TrackSegment, SegmentType } from './TrackSegment';
import { pathTracker } from './PathTracker';
import { EnvironmentAssets } from './EnvironmentAssets';

export class TrackManager {
  public scene: THREE.Scene;
  public activeSegments: TrackSegment[] = [];
  public activeObstacles: ObstacleItem[] = [];

  // Object pool for segments: Map<SegmentType, TrackSegment[]>
  private segmentPool: Map<SegmentType, TrackSegment[]> = new Map();

  private nextChunkIndex = 0;
  private currentEndX = 0;
  private currentEndY = 0;
  private currentEndZ = 0;

  // Segment generation sequence weights & balance
  private lastTurnDirection: 'LEFT' | 'RIGHT' | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    EnvironmentAssets.get(); // Pre-warm textures and geometries
    this.reset();
  }

  public reset() {
    // Clear path tracker
    pathTracker.clear();

    // Remove all active segments from scene and return to pool
    for (const seg of this.activeSegments) {
      this.scene.remove(seg.group);
      this.returnToPool(seg);
    }

    this.activeSegments = [];
    this.activeObstacles = [];
    this.nextChunkIndex = 0;
    this.currentEndX = 0;
    this.currentEndY = 0;
    this.currentEndZ = 0;
    this.lastTurnDirection = null;

    // Spawn initial visible track segments
    for (let i = 0; i < VISIBLE_CHUNKS; i++) {
      this.spawnNextSegment();
    }
  }

  public update(playerZ: number, dt: number) {
    // 1. Animate coins
    for (const obs of this.activeObstacles) {
      if (obs.type === 'COIN' && !obs.collected) {
        obs.mesh.rotation.y += dt * 3.5;
        obs.mesh.position.y = obs.y + Math.sin(playerZ * 0.15 + obs.id) * 0.12;
      }
    }

    // 2. Animate river water texture UVs if any bridges active
    const assets = EnvironmentAssets.get();
    if (assets.waterMaterial.map) {
      assets.waterMaterial.map.offset.y += dt * 0.2;
    }

    // 3. Segment recycling: cull segments behind camera
    const cullZ = playerZ - 25;
    while (this.activeSegments.length > 0 && this.activeSegments[0].endZ < cullZ) {
      const removed = this.activeSegments.shift()!;
      this.scene.remove(removed.group);
      pathTracker.removeSegment(removed);

      // Remove its obstacles from active obstacle pool
      const removedIds = new Set(removed.obstacles.map((o) => o.id));
      this.activeObstacles = this.activeObstacles.filter((o) => !removedIds.has(o.id));

      // Return segment to pool
      this.returnToPool(removed);

      // Spawn next segment ahead
      this.spawnNextSegment();
    }
  }

  private spawnNextSegment() {
    const chunkIdx = this.nextChunkIndex++;
    const segType = this.chooseNextSegmentType(chunkIdx);

    const segment = this.acquireFromPool(segType, this.currentEndZ, this.currentEndX, this.currentEndY);

    // Generate or reset obstacles on this segment
    segment.generateObstacles(chunkIdx);

    this.scene.add(segment.group);
    pathTracker.addSegment(segment);

    this.activeSegments.push(segment);
    this.activeObstacles.push(...segment.obstacles);

    // Update cursor for next segment
    this.currentEndX = segment.endX;
    this.currentEndY = segment.endY;
    this.currentEndZ = segment.endZ;
  }

  private chooseNextSegmentType(index: number): SegmentType {
    // First 2 segments are straight jungle/ruins paths to establish safe running foundation
    if (index === 0) return 'STRAIGHT_JUNGLE';
    if (index === 1) return 'RUINED_STONE';

    // Balance turns so the track doesn't drift too far from center X = 0
    if (this.currentEndX > 6.0) {
      this.lastTurnDirection = 'LEFT';
      return 'GENTLE_LEFT';
    }
    if (this.currentEndX < -6.0) {
      this.lastTurnDirection = 'RIGHT';
      return 'GENTLE_RIGHT';
    }

    // Variety distribution among the 6 segment types
    const rand = Math.random();
    if (rand < 0.25) {
      return 'STRAIGHT_JUNGLE';
    } else if (rand < 0.45) {
      return 'RUINED_STONE';
    } else if (rand < 0.62) {
      return 'SMALL_BRIDGE';
    } else if (rand < 0.78) {
      return 'RAMP_GAP';
    } else if (rand < 0.89) {
      this.lastTurnDirection = 'LEFT';
      return 'GENTLE_LEFT';
    } else {
      this.lastTurnDirection = 'RIGHT';
      return 'GENTLE_RIGHT';
    }
  }

  private acquireFromPool(type: SegmentType, startZ: number, startX: number, startY: number): TrackSegment {
    let pool = this.segmentPool.get(type);
    if (!pool) {
      pool = [];
      this.segmentPool.set(type, pool);
    }

    if (pool.length > 0) {
      const seg = pool.pop()!;
      seg.reposition(startZ, startX, startY);
      return seg;
    }

    // If pool empty, instantiate new segment (done only during initial warm-up)
    return new TrackSegment(type, startZ, startX, startY);
  }

  private returnToPool(segment: TrackSegment) {
    let pool = this.segmentPool.get(segment.type);
    if (!pool) {
      pool = [];
      this.segmentPool.set(segment.type, pool);
    }
    pool.push(segment);
  }
}
