import * as THREE from 'three';
import { VISIBLE_CHUNKS } from '../constants';
import { ObstacleItem, NearestHurdleDebug } from '../types';
import { TrackSegment, SegmentType } from './TrackSegment';
import { pathTracker } from './PathTracker';
import { EnvironmentAssets } from './EnvironmentAssets';
import { DebugCollisionVisualizer } from '../collision/DebugCollisionVisualizer';
import { Player } from '../player/Player';

export class TrackManager {
  public scene: THREE.Scene;
  public activeSegments: TrackSegment[] = [];
  public activeObstacles: ObstacleItem[] = [];
  public obstacleContainer: THREE.Group;
  public debugVisualizer: DebugCollisionVisualizer;

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

    // Dedicated world-space obstacle container (position = 0, 0, 0)
    // Ensures obstacle visual meshes and collision boxes are in the EXACT SAME coordinate space.
    this.obstacleContainer = new THREE.Group();
    this.obstacleContainer.name = 'ObstacleContainer';
    this.scene.add(this.obstacleContainer);

    this.debugVisualizer = new DebugCollisionVisualizer();
    this.scene.add(this.debugVisualizer.group);

    this.reset();
  }

  public reset() {
    // Clear path tracker
    pathTracker.clear();

    // Clear all obstacles from world container
    while (this.obstacleContainer.children.length > 0) {
      this.obstacleContainer.remove(this.obstacleContainer.children[0]);
    }
    this.activeObstacles = [];

    // Remove all active segments from scene and return to pool
    for (const seg of this.activeSegments) {
      this.scene.remove(seg.group);
      this.returnToPool(seg);
    }

    this.activeSegments = [];
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

  public update(player: Player, dt: number) {
    const playerZ = player.z;

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

      // Remove its obstacles from world container and active list
      for (const obs of removed.obstacles) {
        this.obstacleContainer.remove(obs.mesh);
      }
      const removedIds = new Set(removed.obstacles.map((o) => o.id));
      this.activeObstacles = this.activeObstacles.filter((o) => !removedIds.has(o.id));

      // Return segment to pool
      this.returnToPool(removed);

      // Spawn next segment ahead
      this.spawnNextSegment();
    }

    // 4. Update collision debug visualizer if active
    if (this.debugVisualizer.enabled) {
      this.debugVisualizer.update(player, this.activeObstacles, this.activeSegments);
    }
  }

  public getNearestHurdle(playerZ: number): NearestHurdleDebug | null {
    let nearest: ObstacleItem | null = null;
    let minDist = Infinity;

    for (const obs of this.activeObstacles) {
      if (obs.type === 'HURDLE' && !obs.collected && obs.z >= playerZ - 1.0) {
        const dist = obs.z - playerZ;
        if (dist < minDist) {
          minDist = dist;
          nearest = obs;
        }
      }
    }

    if (!nearest) return null;

    return {
      x: nearest.x,
      z: nearest.z,
      lane: nearest.lane,
      distance: Math.max(0, nearest.z - playerZ),
    };
  }

  public toggleDebugColliders(): boolean {
    return this.debugVisualizer.toggle();
  }

  public isDebugCollidersEnabled(): boolean {
    return this.debugVisualizer.enabled;
  }

  private spawnNextSegment() {
    const chunkIdx = this.nextChunkIndex++;
    const segType = this.chooseNextSegmentType(chunkIdx);

    const segment = this.acquireFromPool(segType, this.currentEndZ, this.currentEndX, this.currentEndY);

    // Generate obstacles with true world coordinates
    segment.generateObstacles(chunkIdx);

    this.scene.add(segment.group);
    pathTracker.addSegment(segment);

    // Add obstacle visual meshes to the world-space container
    for (const obs of segment.obstacles) {
      this.obstacleContainer.add(obs.mesh);
      this.activeObstacles.push(obs);
    }

    this.activeSegments.push(segment);

    // Update cursor for next segment
    this.currentEndX = segment.endX;
    this.currentEndY = segment.endY;
    this.currentEndZ = segment.endZ;
  }

  private chooseNextSegmentType(index: number): SegmentType {
    if (index === 0) return 'STRAIGHT_JUNGLE';
    if (index === 1) return 'RUINED_STONE';

    if (this.currentEndX > 6.0) {
      this.lastTurnDirection = 'LEFT';
      return 'GENTLE_LEFT';
    }
    if (this.currentEndX < -6.0) {
      this.lastTurnDirection = 'RIGHT';
      return 'GENTLE_RIGHT';
    }

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
