import { Player } from '../player/Player';
import { ObstacleItem } from '../types';

export interface CollisionResult {
  hasLethalCollision: boolean;
  collectedCoin: ObstacleItem | null;
  collidedObstacle?: ObstacleItem;
}

export class CollisionSystem {
  /**
   * Evaluates physical collisions between the player and intentional gameplay obstacles.
   * Scenery, decorative foliage, ruins, rocks and terrain have ZERO gameplay colliders.
   *
   * A fair 5% forgiveness tolerance is applied to lateral (X) and forward (Z) margins
   * so millimeter grazes feel responsive and intentional rather than frustrating.
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

      // Quick Z distance early rejection (obstacles further than 3.5 units ahead or behind can't collide)
      const distZ = Math.abs(obs.z - player.z);
      if (distZ > 3.5) continue;

      const oBox = obs.box;

      if (obs.type === 'COIN') {
        // Generous pickup magnet box for coins
        const coinMargin = 0.25;
        const overlapX = pBox.minX < oBox.maxX + coinMargin && pBox.maxX > oBox.minX - coinMargin;
        const overlapY = pBox.minY < oBox.maxY + coinMargin && pBox.maxY > oBox.minY - coinMargin;
        const overlapZ = pBox.minZ < oBox.maxZ + coinMargin && pBox.maxZ > oBox.minZ - coinMargin;

        if (overlapX && overlapY && overlapZ) {
          obs.collected = true;
          obs.mesh.visible = false;
          result.collectedCoin = obs;
        }
      } else {
        // Lethal obstacle collision test with fair forgiveness margins
        // 5cm margin on lateral sides to prevent edge-clipping during late lane switches
        const forgivenessX = 0.05;
        const forgivenessZ = 0.04;

        const overlapX = (pBox.minX + forgivenessX) < oBox.maxX && (pBox.maxX - forgivenessX) > oBox.minX;
        const overlapY = pBox.minY < oBox.maxY && pBox.maxY > oBox.minY;
        const overlapZ = (pBox.minZ + forgivenessZ) < oBox.maxZ && (pBox.maxZ - forgivenessZ) > oBox.minZ;

        if (overlapX && overlapY && overlapZ) {
          // Lethal obstacle collision
          result.hasLethalCollision = true;
          result.collidedObstacle = obs;
          break;
        }
      }
    }

    return result;
  }
}
