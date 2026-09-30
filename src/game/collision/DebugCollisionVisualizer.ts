import * as THREE from 'three';
import { Player } from '../player/Player';
import { ObstacleItem, BoundingBox3D } from '../types';
import { TrackSegment } from '../world/TrackSegment';
import { COLORS, LANE_WIDTH, TRACK_WIDTH } from '../constants';

/**
 * Development & Debug Collision Visualizer.
 * Provides wireframe overlays for:
 * 1. Player collider (exact standing / sliding / jumping AABB)
 * 2. Hurdle & obstacle colliders (exact lethal volumes)
 * 3. Hurdle world position & lane index indicators
 * 4. Three lane center positions (Left, Center, Right)
 * 5. Playable track bounds
 *
 * Kept disabled during normal gameplay; zero performance cost when inactive.
 */
export class DebugCollisionVisualizer {
  public group: THREE.Group;
  public enabled: boolean = false;

  private playerBoxMesh: THREE.LineSegments;
  private obstacleBoxesPool: THREE.LineSegments[] = [];
  private hurdleMarkersPool: THREE.Group[] = [];
  private laneLinesGroup: THREE.Group;
  private trackBoundsGroup: THREE.Group;

  // Shared geometries
  private static unitBoxGeo: THREE.BufferGeometry | null = null;
  private static markerPoleGeo: THREE.BufferGeometry | null = null;
  private static markerDiamondGeo: THREE.BufferGeometry | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'DebugCollisionVisualizer';
    this.group.visible = false;

    if (!DebugCollisionVisualizer.unitBoxGeo) {
      const boxGeo = new THREE.BoxGeometry(1, 1, 1);
      DebugCollisionVisualizer.unitBoxGeo = new THREE.WireframeGeometry(boxGeo);

      const polePts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.2, 0)];
      DebugCollisionVisualizer.markerPoleGeo = new THREE.BufferGeometry().setFromPoints(polePts);

      const diamondGeo = new THREE.OctahedronGeometry(0.2, 0);
      DebugCollisionVisualizer.markerDiamondGeo = new THREE.WireframeGeometry(diamondGeo);
    }

    // 1. Player wireframe collider (Cyan)
    const playerMat = new THREE.LineBasicMaterial({
      color: COLORS.debugPlayer,
      linewidth: 2,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    });
    this.playerBoxMesh = new THREE.LineSegments(DebugCollisionVisualizer.unitBoxGeo, playerMat);
    this.playerBoxMesh.renderOrder = 999;
    this.group.add(this.playerBoxMesh);

    // 2. Groups for lane boundaries and track bounds
    this.laneLinesGroup = new THREE.Group();
    this.trackBoundsGroup = new THREE.Group();
    this.group.add(this.laneLinesGroup);
    this.group.add(this.trackBoundsGroup);
  }

  public setEnabled(enable: boolean) {
    this.enabled = enable;
    this.group.visible = enable;
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public update(player: Player, obstacles: ObstacleItem[], activeSegments: TrackSegment[]): void {
    if (!this.enabled) return;

    // 1. Player Collider AABB wireframe box
    const pBox = player.getBoundingBox();
    this.positionBoxMesh(this.playerBoxMesh, pBox);

    // 2. Obstacles within 50 meters of player
    const nearbyObstacles = obstacles.filter(
      (obs) => !obs.collected && Math.abs(obs.z - player.z) < 50
    );

    // Ensure pool size matches nearby obstacles
    while (this.obstacleBoxesPool.length < nearbyObstacles.length) {
      const mat = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 2,
        depthTest: false,
        transparent: true,
        opacity: 0.9,
      });
      const box = new THREE.LineSegments(DebugCollisionVisualizer.unitBoxGeo!, mat);
      box.renderOrder = 998;
      this.obstacleBoxesPool.push(box);
      this.group.add(box);
    }

    // Hurdle markers pool
    const nearbyHurdles = nearbyObstacles.filter((o) => o.type === 'HURDLE');
    while (this.hurdleMarkersPool.length < nearbyHurdles.length) {
      const markerGroup = new THREE.Group();
      const poleMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, depthTest: false });
      const pole = new THREE.Line(DebugCollisionVisualizer.markerPoleGeo!, poleMat);
      pole.renderOrder = 998;
      markerGroup.add(pole);

      const diamondMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, depthTest: false });
      const diamond = new THREE.LineSegments(DebugCollisionVisualizer.markerDiamondGeo!, diamondMat);
      diamond.position.y = 2.2;
      diamond.renderOrder = 998;
      markerGroup.add(diamond);

      this.hurdleMarkersPool.push(markerGroup);
      this.group.add(markerGroup);
    }

    // Position obstacle boxes
    for (let i = 0; i < this.obstacleBoxesPool.length; i++) {
      const boxMesh = this.obstacleBoxesPool[i];
      if (i < nearbyObstacles.length) {
        const obs = nearbyObstacles[i];
        boxMesh.visible = true;

        const mat = boxMesh.material as THREE.LineBasicMaterial;
        if (obs.type === 'PILLAR') {
          mat.color.setHex(COLORS.debugPillar);
        } else if (obs.type === 'HURDLE') {
          mat.color.setHex(COLORS.debugHurdle);
        } else if (obs.type === 'HIGH_BEAM') {
          mat.color.setHex(COLORS.debugHighBeam);
        } else {
          mat.color.setHex(COLORS.debugCoin);
        }

        this.positionBoxMesh(boxMesh, obs.box);
      } else {
        boxMesh.visible = false;
      }
    }

    // Position hurdle position & lane markers
    for (let i = 0; i < this.hurdleMarkersPool.length; i++) {
      const marker = this.hurdleMarkersPool[i];
      if (i < nearbyHurdles.length) {
        const hurdle = nearbyHurdles[i];
        marker.visible = true;
        marker.position.set(hurdle.x, hurdle.y, hurdle.z);
      } else {
        marker.visible = false;
      }
    }

    // 3. Update three lane centerlines & track bounds
    this.updateLaneAndTrackLines(player.z, activeSegments);
  }

  private positionBoxMesh(mesh: THREE.LineSegments, box: BoundingBox3D) {
    const sizeX = Math.max(0.01, box.maxX - box.minX);
    const sizeY = Math.max(0.01, box.maxY - box.minY);
    const sizeZ = Math.max(0.01, box.maxZ - box.minZ);

    const centerX = (box.minX + box.maxX) / 2;
    const centerY = (box.minY + box.maxY) / 2;
    const centerZ = (box.minZ + box.maxZ) / 2;

    mesh.position.set(centerX, centerY, centerZ);
    mesh.scale.set(sizeX, sizeY, sizeZ);
  }

  private updateLaneAndTrackLines(playerZ: number, activeSegments: TrackSegment[]) {
    const zStart = playerZ - 10;
    const zEnd = playerZ + 60;
    const stepZ = 2.0;
    const pointCount = Math.ceil((zEnd - zStart) / stepZ) + 1;

    // Clear old line objects
    while (this.laneLinesGroup.children.length > 0) {
      const child = this.laneLinesGroup.children.pop()!;
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
      }
    }
    while (this.trackBoundsGroup.children.length > 0) {
      const child = this.trackBoundsGroup.children.pop()!;
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
      }
    }

    if (activeSegments.length === 0) return;

    const getPointAtZ = (z: number) => {
      for (const seg of activeSegments) {
        if (z >= seg.startZ && z <= seg.endZ) {
          return seg.getPath(z);
        }
      }
      return activeSegments[0].getPath(z);
    };

    // Construct point buffers:
    // 1. Left lane center (x = path.x + LANE_WIDTH)
    // 2. Center lane center (x = path.x)
    // 3. Right lane center (x = path.x - LANE_WIDTH)
    // 4. Outer track bounds (x = path.x ± TRACK_WIDTH / 2)
    const ptsLaneL: THREE.Vector3[] = [];
    const ptsLaneC: THREE.Vector3[] = [];
    const ptsLaneR: THREE.Vector3[] = [];
    const ptsBoundL: THREE.Vector3[] = [];
    const ptsBoundR: THREE.Vector3[] = [];

    for (let i = 0; i < pointCount; i++) {
      const z = zStart + i * stepZ;
      const pt = getPointAtZ(z);
      const elevatedY = pt.groundY + 0.12;

      // Three lane center positions
      ptsLaneL.push(new THREE.Vector3(pt.x + LANE_WIDTH, elevatedY, z));
      ptsLaneC.push(new THREE.Vector3(pt.x, elevatedY, z));
      ptsLaneR.push(new THREE.Vector3(pt.x - LANE_WIDTH, elevatedY, z));

      // Track outer bounds
      ptsBoundL.push(new THREE.Vector3(pt.x + TRACK_WIDTH / 2, elevatedY, z));
      ptsBoundR.push(new THREE.Vector3(pt.x - TRACK_WIDTH / 2, elevatedY, z));
    }

    const laneMat = new THREE.LineBasicMaterial({
      color: COLORS.debugLaneBounds,
      depthTest: false,
      transparent: true,
      opacity: 0.85,
    });
    const boundMat = new THREE.LineBasicMaterial({
      color: COLORS.debugTrackBounds,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    });

    // Left lane centerline
    const geoLaneL = new THREE.BufferGeometry().setFromPoints(ptsLaneL);
    const lineLaneL = new THREE.Line(geoLaneL, laneMat);
    lineLaneL.renderOrder = 997;
    this.laneLinesGroup.add(lineLaneL);

    // Center lane centerline
    const geoLaneC = new THREE.BufferGeometry().setFromPoints(ptsLaneC);
    const lineLaneC = new THREE.Line(geoLaneC, laneMat);
    lineLaneC.renderOrder = 997;
    this.laneLinesGroup.add(lineLaneC);

    // Right lane centerline
    const geoLaneR = new THREE.BufferGeometry().setFromPoints(ptsLaneR);
    const lineLaneR = new THREE.Line(geoLaneR, laneMat);
    lineLaneR.renderOrder = 997;
    this.laneLinesGroup.add(lineLaneR);

    // Outer bounds
    const geoBoundL = new THREE.BufferGeometry().setFromPoints(ptsBoundL);
    const lineBoundL = new THREE.Line(geoBoundL, boundMat);
    lineBoundL.renderOrder = 997;
    this.trackBoundsGroup.add(lineBoundL);

    const geoBoundR = new THREE.BufferGeometry().setFromPoints(ptsBoundR);
    const lineBoundR = new THREE.Line(geoBoundR, boundMat);
    lineBoundR.renderOrder = 997;
    this.trackBoundsGroup.add(lineBoundR);
  }

  public dispose() {
    for (const box of this.obstacleBoxesPool) {
      if (box.material instanceof THREE.Material) {
        box.material.dispose();
      }
    }
    this.obstacleBoxesPool = [];
    if (this.playerBoxMesh.material instanceof THREE.Material) {
      this.playerBoxMesh.material.dispose();
    }
  }
}
