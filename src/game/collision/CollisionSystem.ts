import { Player } from '../player/Player';
import { ObstacleItem } from '../types';

export interface CollisionResult {
  hasLethalCollision: boolean;
  collectedCoin: ObstacleItem | null;
}

export class CollisionSystem {
  /**
   * Evaluates collisions between the player and all obstacles in the active track window.
   */
  public checkCollisions(player: Player, obstacles: ObstacleItem[]): CollisionResult {
    const result: CollisionResult = {
      hasLethalCollision: false,
      collectedCoin: null,
    };

    if (player.isDead) return result;

    const pBox = player.getBoundingBox();

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (obs.collected) continue;

      // Quick Z distance early rejection (obstacles further than 3 units ahead or behind can't collide)
      const distZ = Math.abs(obs.z - player.z);
      if (distZ > 3.0) continue;

      const oBox = obs.box;

      // 3D Axis-Aligned Bounding Box (AABB) intersection test
      const overlapX = pBox.minX < oBox.maxX && pBox.maxX > oBox.minX;
      const overlapY = pBox.minY < oBox.maxY && pBox.maxY > oBox.minY;
      const overlapZ = pBox.minZ < oBox.maxZ && pBox.maxZ > oBox.minZ;

      if (overlapX && overlapY && overlapZ) {
        if (obs.type === 'COIN') {
          obs.collected = true;
          obs.mesh.visible = false;
          result.collectedCoin = obs;
        } else {
          // Lethal obstacle collision!
          result.hasLethalCollision = true;
          break;
        }
      }
    }

    return result;
  }
}
