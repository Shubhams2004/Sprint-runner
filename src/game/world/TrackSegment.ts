import * as THREE from 'three';
import { LANE_WIDTH, TRACK_WIDTH, CHUNK_LENGTH, COLORS, SCENERY_SAFE_MARGIN } from '../constants';
import { ObstacleItem, ObstacleType, LaneIndex, BoundingBox3D } from '../types';
import { PathPoint, PathSegmentProvider } from './PathTracker';
import { EnvironmentAssets } from './EnvironmentAssets';

export type SegmentType =
  | 'STRAIGHT_JUNGLE'
  | 'RUINED_STONE'
  | 'GENTLE_LEFT'
  | 'GENTLE_RIGHT'
  | 'SMALL_BRIDGE'
  | 'RAMP_GAP';

export class TrackSegment implements PathSegmentProvider {
  public type: SegmentType;
  public startZ: number;
  public endZ: number;
  public startX: number;
  public endX: number;
  public startY: number;
  public endY: number;

  public group: THREE.Group;
  public obstacles: ObstacleItem[] = [];

  private deltaX = 0;
  private deltaY = 0;

  // Obstacle geometry cache
  private static obstacleGeos: {
    hurdleBase?: THREE.BoxGeometry;
    hurdleTop?: THREE.BoxGeometry;
    hurdlePost?: THREE.BoxGeometry;
    hurdleCrystal?: THREE.OctahedronGeometry;
    hurdleDecal?: THREE.PlaneGeometry;
    highBeamTop?: THREE.BoxGeometry;
    highBeamPost?: THREE.BoxGeometry;
    highBeamCrystal?: THREE.BoxGeometry;
    highBeamDecal?: THREE.PlaneGeometry;
    pillarShaft?: THREE.BoxGeometry;
    pillarBase?: THREE.BoxGeometry;
    pillarEye?: THREE.SphereGeometry;
    pillarDecal?: THREE.PlaneGeometry;
  } = {};

  constructor(type: SegmentType, startZ: number, startX: number, startY: number) {
    this.type = type;
    this.startZ = startZ;
    this.endZ = startZ + CHUNK_LENGTH;
    this.startX = startX;
    this.startY = startY;

    if (type === 'GENTLE_LEFT') {
      this.deltaX = -4.0;
    } else if (type === 'GENTLE_RIGHT') {
      this.deltaX = 4.0;
    } else {
      this.deltaX = 0;
    }

    this.endX = startX + this.deltaX;
    this.endY = startY;

    this.group = new THREE.Group();
    // Note: Obstacle meshes are added to TrackManager's world obstacle container,
    // NEVER to this.group. This guarantees world-space coordinates match collision volumes 1:1.
    this.buildGeometry();
  }

  public getPath(z: number): PathPoint {
    const t = Math.max(0, Math.min(1, (z - this.startZ) / CHUNK_LENGTH));

    let x = this.startX;
    let y = this.startY;
    let angleY = 0;
    let pitchX = 0;

    if (this.type === 'GENTLE_LEFT' || this.type === 'GENTLE_RIGHT') {
      const smoothT = (1 - Math.cos(Math.PI * t)) / 2;
      x = this.startX + this.deltaX * smoothT;

      const dSmoothT = (Math.PI * Math.sin(Math.PI * t)) / (2 * CHUNK_LENGTH);
      const dx_dz = this.deltaX * dSmoothT;
      angleY = Math.atan2(dx_dz, 1);
    } else if (this.type === 'RAMP_GAP') {
      const maxRise = 1.3;
      if (t < 0.45) {
        const rampT = t / 0.45;
        y = this.startY + maxRise * ((1 - Math.cos(Math.PI * rampT)) / 2);
        pitchX = -0.06;
      } else if (t < 0.65) {
        y = this.startY + maxRise;
        pitchX = 0;
      } else {
        const downT = (t - 0.65) / 0.35;
        y = this.startY + maxRise * (1 - (1 - Math.cos(Math.PI * downT)) / 2);
        pitchX = 0.06;
      }
    } else if (this.type === 'SMALL_BRIDGE') {
      const archH = 0.4;
      y = this.startY + Math.sin(t * Math.PI) * archH;
    }

    return {
      x,
      y,
      groundY: y,
      angleY,
      pitchX,
    };
  }

  public reposition(newStartZ: number, newStartX: number, newStartY: number) {
    this.startZ = newStartZ;
    this.endZ = newStartZ + CHUNK_LENGTH;
    this.startX = newStartX;
    this.endX = newStartX + this.deltaX;
    this.startY = newStartY;
    this.endY = newStartY;

    this.group.position.set(this.startX, this.startY, this.startZ);
    this.obstacles = [];
  }

  private buildGeometry() {
    const assets = EnvironmentAssets.get();

    switch (this.type) {
      case 'STRAIGHT_JUNGLE':
        this.buildStraightPath(assets);
        break;
      case 'RUINED_STONE':
        this.buildRuinedStone(assets);
        break;
      case 'GENTLE_LEFT':
      case 'GENTLE_RIGHT':
        this.buildCurvedPath(assets);
        break;
      case 'SMALL_BRIDGE':
        this.buildBridge(assets);
        break;
      case 'RAMP_GAP':
        this.buildRampGap(assets);
        break;
    }

    this.group.position.set(this.startX, this.startY, this.startZ);
  }

  private addLaneDividersAndCurbs(assets: EnvironmentAssets, length: number, yOffset = 0.015) {
    const dividerGeo = new THREE.BoxGeometry(0.12, 0.03, length);

    const divL = new THREE.Mesh(dividerGeo, assets.laneInlayMaterial);
    divL.position.set(LANE_WIDTH / 2, yOffset, length / 2);
    divL.receiveShadow = true;
    this.group.add(divL);

    const divR = new THREE.Mesh(dividerGeo, assets.laneInlayMaterial);
    divR.position.set(-LANE_WIDTH / 2, yOffset, length / 2);
    divR.receiveShadow = true;
    this.group.add(divR);

    const curbGeo = new THREE.BoxGeometry(0.45, 0.32, length);

    const leftCurb = new THREE.Mesh(curbGeo, assets.curbMaterial);
    leftCurb.position.set(TRACK_WIDTH / 2 + 0.22, yOffset + 0.14, length / 2);
    leftCurb.castShadow = true;
    leftCurb.receiveShadow = true;
    this.group.add(leftCurb);

    const rightCurb = new THREE.Mesh(curbGeo, assets.curbMaterial);
    rightCurb.position.set(-TRACK_WIDTH / 2 - 0.22, yOffset + 0.14, length / 2);
    rightCurb.castShadow = true;
    rightCurb.receiveShadow = true;
    this.group.add(rightCurb);
  }

  private buildStraightPath(assets: EnvironmentAssets) {
    const roadGeo = new THREE.PlaneGeometry(TRACK_WIDTH, CHUNK_LENGTH);
    const road = new THREE.Mesh(roadGeo, assets.stonePathMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, CHUNK_LENGTH / 2);
    road.receiveShadow = true;
    this.group.add(road);

    this.addLaneDividersAndCurbs(assets, CHUNK_LENGTH);

    const sceneryMinX = TRACK_WIDTH / 2 + SCENERY_SAFE_MARGIN;

    for (let z = 6; z < CHUNK_LENGTH; z += 14) {
      const tree = assets.createTropicalTree(9 + Math.random() * 3);
      tree.position.set(sceneryMinX + 1.2 + Math.random() * 2, 0, z);
      this.group.add(tree);

      const treeR = assets.createTropicalTree(9 + Math.random() * 3);
      treeR.position.set(-(sceneryMinX + 1.2 + Math.random() * 2), 0, z + 5);
      this.group.add(treeR);

      const fern = assets.createFernBush();
      fern.position.set(sceneryMinX + 0.3, 0, z + 3);
      this.group.add(fern);

      const fernR = assets.createFernBush();
      fernR.position.set(-(sceneryMinX + 0.3), 0, z + 8);
      this.group.add(fernR);
    }

    const statueL = assets.createGuardianStatue();
    statueL.position.set(sceneryMinX + 0.4, 0, 8);
    this.group.add(statueL);

    const statueR = assets.createGuardianStatue();
    statueR.position.set(-(sceneryMinX + 0.4), 0, 8);
    this.group.add(statueR);

    const sunbeams = assets.createSunbeamCluster();
    sunbeams.position.set(0, 0, CHUNK_LENGTH / 2);
    this.group.add(sunbeams);
  }

  private buildRuinedStone(assets: EnvironmentAssets) {
    const roadGeo = new THREE.PlaneGeometry(TRACK_WIDTH, CHUNK_LENGTH);
    const road = new THREE.Mesh(roadGeo, assets.stonePathMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, CHUNK_LENGTH / 2);
    road.receiveShadow = true;
    this.group.add(road);

    this.addLaneDividersAndCurbs(assets, CHUNK_LENGTH);

    const sceneryMinX = TRACK_WIDTH / 2 + SCENERY_SAFE_MARGIN;

    const wallGeo = new THREE.BoxGeometry(0.8, 2.5, 12);
    const leftWall = new THREE.Mesh(wallGeo, assets.stoneWallMaterial);
    leftWall.position.set(sceneryMinX + 0.6, 1.25, 12);
    leftWall.castShadow = true;
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, assets.stoneWallMaterial);
    rightWall.position.set(-(sceneryMinX + 0.6), 1.25, 28);
    rightWall.castShadow = true;
    this.group.add(rightWall);

    const pillarPositions = [
      { x: sceneryMinX + 0.8, z: 6, broken: false },
      { x: -(sceneryMinX + 0.8), z: 10, broken: true },
      { x: sceneryMinX + 0.8, z: 22, broken: true },
      { x: -(sceneryMinX + 0.8), z: 24, broken: false },
      { x: sceneryMinX + 0.8, z: 36, broken: false },
      { x: -(sceneryMinX + 0.8), z: 38, broken: false },
    ];

    for (const p of pillarPositions) {
      const col = assets.createPillar(p.broken);
      col.position.set(p.x, 0, p.z);
      this.group.add(col);

      const vines = assets.createHangingVines();
      vines.position.set(p.x, 3.5, p.z);
      this.group.add(vines);
    }

    const stupaL = assets.createTempleStupa(true);
    stupaL.position.set(sceneryMinX + 5.0, 0, CHUNK_LENGTH / 2);
    this.group.add(stupaL);

    const stupaR = assets.createTempleStupa(false);
    stupaR.position.set(-(sceneryMinX + 5.0), 0, CHUNK_LENGTH * 0.7);
    this.group.add(stupaR);

    const sunbeams = assets.createSunbeamCluster();
    sunbeams.position.set(0, 0, 18);
    this.group.add(sunbeams);
  }

  private buildCurvedPath(assets: EnvironmentAssets) {
    const segments = 12;
    const stepZ = CHUNK_LENGTH / segments;

    for (let i = 0; i < segments; i++) {
      const z0 = i * stepZ;
      const z1 = (i + 1) * stepZ;
      const t0 = (1 - Math.cos(Math.PI * (z0 / CHUNK_LENGTH))) / 2;
      const t1 = (1 - Math.cos(Math.PI * (z1 / CHUNK_LENGTH))) / 2;
      const x0 = this.deltaX * t0;
      const x1 = this.deltaX * t1;

      const segLen = Math.hypot(x1 - x0, z1 - z0);
      const segAngle = Math.atan2(x1 - x0, z1 - z0);

      const roadSegmentGeo = new THREE.PlaneGeometry(TRACK_WIDTH, segLen + 0.1);
      const roadSeg = new THREE.Mesh(roadSegmentGeo, assets.stonePathMaterial);
      roadSeg.rotation.x = -Math.PI / 2;
      roadSeg.rotation.z = -segAngle;
      roadSeg.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
      roadSeg.receiveShadow = true;
      this.group.add(roadSeg);

      const cosA = Math.cos(segAngle);
      const sinA = Math.sin(segAngle);
      const divGeo = new THREE.BoxGeometry(0.12, 0.03, segLen + 0.1);

      const divL = new THREE.Mesh(divGeo, assets.laneInlayMaterial);
      divL.position.set((x0 + x1) / 2 + (LANE_WIDTH / 2) * cosA, 0.015, (z0 + z1) / 2 - (LANE_WIDTH / 2) * sinA);
      divL.rotation.y = segAngle;
      this.group.add(divL);

      const divR = new THREE.Mesh(divGeo, assets.laneInlayMaterial);
      divR.position.set((x0 + x1) / 2 - (LANE_WIDTH / 2) * cosA, 0.015, (z0 + z1) / 2 + (LANE_WIDTH / 2) * sinA);
      divR.rotation.y = segAngle;
      this.group.add(divR);

      const curbGeo = new THREE.BoxGeometry(0.45, 0.32, segLen + 0.1);

      const leftC = new THREE.Mesh(curbGeo, assets.curbMaterial);
      leftC.position.set((x0 + x1) / 2 + (TRACK_WIDTH / 2 + 0.22) * cosA, 0.15, (z0 + z1) / 2 - (TRACK_WIDTH / 2 + 0.22) * sinA);
      leftC.rotation.y = segAngle;
      this.group.add(leftC);

      const rightC = new THREE.Mesh(curbGeo, assets.curbMaterial);
      rightC.position.set((x0 + x1) / 2 - (TRACK_WIDTH / 2 + 0.22) * cosA, 0.15, (z0 + z1) / 2 + (TRACK_WIDTH / 2 + 0.22) * sinA);
      rightC.rotation.y = segAngle;
      this.group.add(rightC);
    }

    const sceneryOffset = TRACK_WIDTH / 2 + SCENERY_SAFE_MARGIN + 1.0;
    for (let i = 0; i < 4; i++) {
      const cz = 8 + i * 10;
      const ct = (1 - Math.cos(Math.PI * (cz / CHUNK_LENGTH))) / 2;
      const cx = this.deltaX * ct;

      const sideSign = this.deltaX > 0 ? -1 : 1;
      const col = assets.createPillar(i % 2 === 1);
      col.position.set(cx + sideSign * sceneryOffset, 0, cz);
      this.group.add(col);

      const rock = assets.createMossyRock(1.3);
      rock.position.set(cx - sideSign * sceneryOffset, 0.5, cz + 2);
      this.group.add(rock);
    }

    const stupa = assets.createTempleStupa(false);
    stupa.position.set(this.deltaX * 0.7 + (this.deltaX > 0 ? 10 : -10), 0, CHUNK_LENGTH * 0.7);
    this.group.add(stupa);
  }

  private buildBridge(assets: EnvironmentAssets) {
    const waterGeo = new THREE.PlaneGeometry(TRACK_WIDTH * 3.0, CHUNK_LENGTH);
    const water = new THREE.Mesh(waterGeo, assets.waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -1.8, CHUNK_LENGTH / 2);
    this.group.add(water);

    const rockDist = TRACK_WIDTH / 2 + SCENERY_SAFE_MARGIN + 1.2;
    for (let rz = 4; rz < CHUNK_LENGTH; rz += 8) {
      const rockL = assets.createMossyRock(2.0);
      rockL.position.set(rockDist, -0.8, rz);
      this.group.add(rockL);

      const rockR = assets.createMossyRock(2.0);
      rockR.position.set(-rockDist, -0.8, rz + 3);
      this.group.add(rockR);
    }

    const bridgeGeo = new THREE.BoxGeometry(TRACK_WIDTH, 0.45, CHUNK_LENGTH);
    const bridge = new THREE.Mesh(bridgeGeo, assets.woodBridgeMaterial);
    bridge.position.set(0, 0.1, CHUNK_LENGTH / 2);
    bridge.receiveShadow = true;
    this.group.add(bridge);

    this.addLaneDividersAndCurbs(assets, CHUNK_LENGTH, 0.33);

    const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.2, 6);
    const railGeo = new THREE.BoxGeometry(0.18, 0.12, CHUNK_LENGTH);

    const leftRail = new THREE.Mesh(railGeo, assets.rootMaterial);
    leftRail.position.set(TRACK_WIDTH / 2 + 0.3, 1.1, CHUNK_LENGTH / 2);
    this.group.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, assets.rootMaterial);
    rightRail.position.set(-TRACK_WIDTH / 2 - 0.3, 1.1, CHUNK_LENGTH / 2);
    this.group.add(rightRail);

    for (let pz = 2; pz <= CHUNK_LENGTH - 2; pz += 6) {
      const postL = new THREE.Mesh(postGeo, assets.rootMaterial);
      postL.position.set(TRACK_WIDTH / 2 + 0.3, 0.7, pz);
      this.group.add(postL);

      const postR = new THREE.Mesh(postGeo, assets.rootMaterial);
      postR.position.set(-TRACK_WIDTH / 2 - 0.3, 0.7, pz);
      this.group.add(postR);
    }
  }

  private buildRampGap(assets: EnvironmentAssets) {
    const rampLen1 = CHUNK_LENGTH * 0.45;
    const rampLen2 = CHUNK_LENGTH * 0.2;
    const rampLen3 = CHUNK_LENGTH * 0.35;

    const upGeo = new THREE.BoxGeometry(TRACK_WIDTH, 0.5, rampLen1);
    const upMesh = new THREE.Mesh(upGeo, assets.stonePathMaterial);
    upMesh.position.set(0, 0.65, rampLen1 / 2);
    upMesh.rotation.x = 0.06;
    upMesh.receiveShadow = true;
    this.group.add(upMesh);

    const plateauGeo = new THREE.BoxGeometry(TRACK_WIDTH, 0.5, rampLen2);
    const platMesh = new THREE.Mesh(plateauGeo, assets.stonePathMaterial);
    platMesh.position.set(0, 1.3, rampLen1 + rampLen2 / 2);
    platMesh.receiveShadow = true;
    this.group.add(platMesh);

    const downGeo = new THREE.BoxGeometry(TRACK_WIDTH, 0.5, rampLen3);
    const downMesh = new THREE.Mesh(downGeo, assets.stonePathMaterial);
    downMesh.position.set(0, 0.65, rampLen1 + rampLen2 + rampLen3 / 2);
    downMesh.rotation.x = -0.07;
    downMesh.receiveShadow = true;
    this.group.add(downMesh);

    const dividerGeo = new THREE.BoxGeometry(0.12, 0.03, rampLen2);
    const divPlatL = new THREE.Mesh(dividerGeo, assets.laneInlayMaterial);
    divPlatL.position.set(LANE_WIDTH / 2, 1.56, rampLen1 + rampLen2 / 2);
    this.group.add(divPlatL);

    const divPlatR = new THREE.Mesh(dividerGeo, assets.laneInlayMaterial);
    divPlatR.position.set(-LANE_WIDTH / 2, 1.56, rampLen1 + rampLen2 / 2);
    this.group.add(divPlatR);

    const foundGeo = new THREE.BoxGeometry(TRACK_WIDTH + 1.2, 1.2, rampLen2 + 6);
    const found = new THREE.Mesh(foundGeo, assets.stoneWallMaterial);
    found.position.set(0, 0.3, rampLen1 + rampLen2 / 2);
    this.group.add(found);

    const sceneryDist = TRACK_WIDTH / 2 + SCENERY_SAFE_MARGIN;
    const colL = assets.createPillar(false);
    colL.position.set(sceneryDist, 1.3, rampLen1 + 3);
    this.group.add(colL);

    const colR = assets.createPillar(false);
    colR.position.set(-sceneryDist, 1.3, rampLen1 + 3);
    this.group.add(colR);
  }

  /**
   * Spawns obstacles with 100% accurate world-space coordinates.
   *
   * Requirement 7:
   * Chunk 0 spawns ONE guaranteed deterministic test hurdle at z = 32.0 in the center lane.
   * This gives the player 32 meters of clear visibility and reaction time from the start line.
   *
   * Chunk 1: Introductory coin trail down the center lane.
   * Chunk 2+: Procedural obstacle gates with guaranteed open corridors and breadcrumb coins.
   */
  public generateObstacles(startIndex: number) {
    this.obstacles = [];
    const assets = EnvironmentAssets.get();

    // Chunk 0: GUARANTEED DETERMINISTIC TEST HURDLE
    if (startIndex === 0) {
      const worldZ = 32.0;
      const path = this.getPath(worldZ);
      // Center lane (lane = 0)
      this.addHurdle(assets, 0, worldZ, path);
      return;
    }

    // Chunk 1: Introductory coin trail down center
    if (startIndex === 1) {
      for (let zOffset = 10; zOffset < CHUNK_LENGTH - 5; zOffset += 6) {
        this.addCoin(assets, 0, this.startZ + zOffset);
      }
      return;
    }

    // Chunk 2+: Procedural Obstacle Gate
    const zOffset = this.type === 'RAMP_GAP' ? 24.0 : 22.5;
    const worldZ = this.startZ + zOffset;
    const path = this.getPath(worldZ);

    const lanes: LaneIndex[] = [-1, 0, 1];
    const shuffledLanes = [...lanes].sort(() => Math.random() - 0.5);

    // Guarantee: At most 1 or 2 lanes blocked, NEVER all 3.
    const obstacleCount = startIndex < 4 ? 1 : Math.random() < 0.65 ? 2 : 1;

    for (let i = 0; i < obstacleCount; i++) {
      const lane = shuffledLanes[i];
      const rand = Math.random();

      if (rand < 0.42) {
        this.addHurdle(assets, lane, worldZ, path);
      } else if (rand < 0.75) {
        this.addHighBeam(assets, lane, worldZ, path);
      } else {
        this.addPillar(assets, lane, worldZ, path);
      }
    }

    // Breadcrumb coin trail through the guaranteed safe open lane
    const openLane = shuffledLanes[obstacleCount] ?? shuffledLanes[0];
    for (let cOffset = -6; cOffset <= 6; cOffset += 3) {
      this.addCoin(assets, openLane, worldZ + cOffset);
    }
  }

  /**
   * HURDLE (Jump Obstacle)
   * High visual contrast: Bold amber/gold barrier with dark hazard chevrons,
   * glowing beacon crystals on end posts, and a dark ground depth decal.
   */
  private addHurdle(assets: EnvironmentAssets, lane: LaneIndex, worldZ: number, path: PathPoint) {
    if (!TrackSegment.obstacleGeos.hurdleBase) {
      TrackSegment.obstacleGeos.hurdleBase = new THREE.BoxGeometry(LANE_WIDTH * 0.9, 0.42, 0.35);
      TrackSegment.obstacleGeos.hurdleTop = new THREE.BoxGeometry(LANE_WIDTH * 0.88, 0.22, 0.38);
      TrackSegment.obstacleGeos.hurdlePost = new THREE.BoxGeometry(0.28, 0.85, 0.35);
      TrackSegment.obstacleGeos.hurdleCrystal = new THREE.OctahedronGeometry(0.16, 0);
      TrackSegment.obstacleGeos.hurdleDecal = new THREE.PlaneGeometry(LANE_WIDTH * 0.9, 1.4);
      TrackSegment.obstacleGeos.hurdleDecal.rotateX(-Math.PI / 2);
    }

    const hurdleGroup = new THREE.Group();

    // 1. Ground warning plate directly on the pavement for clear depth cues
    const decal = new THREE.Mesh(TrackSegment.obstacleGeos.hurdleDecal, assets.hurdleDecalMaterial);
    decal.position.set(0, 0.02, 0);
    hurdleGroup.add(decal);

    // 2. Base carved stone barrier
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.55,
      metalness: 0.2,
    });
    const base = new THREE.Mesh(TrackSegment.obstacleGeos.hurdleBase, baseMat);
    base.position.y = 0.21;
    base.castShadow = true;
    base.receiveShadow = true;
    hurdleGroup.add(base);

    // 3. Top hazard bar with bold amber warning rune material
    const topBar = new THREE.Mesh(TrackSegment.obstacleGeos.hurdleTop, assets.obstacleAccentMaterial);
    topBar.position.y = 0.53;
    topBar.castShadow = true;
    hurdleGroup.add(topBar);

    // 4. Two sturdy carved stone end-posts
    const postMat = assets.stoneWallMaterial;
    const postL = new THREE.Mesh(TrackSegment.obstacleGeos.hurdlePost, postMat);
    postL.position.set(LANE_WIDTH * 0.44, 0.42, 0);
    postL.castShadow = true;
    hurdleGroup.add(postL);

    // Glowing beacon crystals atop each post (high visibility)
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.8,
    });
    const crystalL = new THREE.Mesh(TrackSegment.obstacleGeos.hurdleCrystal, crystalMat);
    crystalL.position.set(LANE_WIDTH * 0.44, 0.92, 0);
    hurdleGroup.add(crystalL);

    const postR = new THREE.Mesh(TrackSegment.obstacleGeos.hurdlePost, postMat);
    postR.position.set(-LANE_WIDTH * 0.44, 0.42, 0);
    postR.castShadow = true;
    hurdleGroup.add(postR);

    const crystalR = new THREE.Mesh(TrackSegment.obstacleGeos.hurdleCrystal, crystalMat);
    crystalR.position.set(-LANE_WIDTH * 0.44, 0.92, 0);
    hurdleGroup.add(crystalR);

    // WORLD COORDINATES:
    // In Three.js camera coordinate space looking down +Z:
    // Left lane (lane = -1) is at path.x + LANE_WIDTH
    // Center lane (lane = 0) is at path.x
    // Right lane (lane = +1) is at path.x - LANE_WIDTH
    const worldX = path.x - lane * LANE_WIDTH;
    const worldY = path.groundY;

    hurdleGroup.position.set(worldX, worldY, worldZ);
    hurdleGroup.rotation.y = path.angleY;

    const width = LANE_WIDTH * 0.9;
    const height = 0.72;
    const depth = 0.45;

    this.obstacles.push({
      id: (Math.random() * 1000000) | 0,
      type: 'HURDLE',
      lane,
      x: worldX,
      y: worldY,
      z: worldZ,
      width,
      height,
      depth,
      mesh: hurdleGroup,
      box: {
        minX: worldX - (width / 2) * 0.92,
        maxX: worldX + (width / 2) * 0.92,
        minY: worldY,
        maxY: worldY + height,
        minZ: worldZ - depth * 0.45,
        maxZ: worldZ + depth * 0.45,
      },
    });
  }

  /**
   * HIGH BEAM (Slide Obstacle)
   * High-contrast lintel arch with glowing amethyst crossbeam at height 1.35 - 2.25m,
   * tall side posts outside active lane, and clear open crawl space underneath.
   */
  private addHighBeam(assets: EnvironmentAssets, lane: LaneIndex, worldZ: number, path: PathPoint) {
    if (!TrackSegment.obstacleGeos.highBeamTop) {
      TrackSegment.obstacleGeos.highBeamTop = new THREE.BoxGeometry(LANE_WIDTH * 0.96, 0.65, 0.45);
      TrackSegment.obstacleGeos.highBeamPost = new THREE.BoxGeometry(0.24, 2.4, 0.32);
      TrackSegment.obstacleGeos.highBeamCrystal = new THREE.BoxGeometry(LANE_WIDTH * 0.75, 0.12, 0.48);
      TrackSegment.obstacleGeos.highBeamDecal = new THREE.PlaneGeometry(LANE_WIDTH * 0.85, 1.2);
      TrackSegment.obstacleGeos.highBeamDecal.rotateX(-Math.PI / 2);
    }

    const beamGroup = new THREE.Group();

    const decal = new THREE.Mesh(TrackSegment.obstacleGeos.highBeamDecal, assets.hurdleDecalMaterial);
    decal.position.set(0, 0.02, 0);
    beamGroup.add(decal);

    const beamMat = new THREE.MeshStandardMaterial({
      color: COLORS.highBeam,
      roughness: 0.45,
      metalness: 0.3,
      emissive: 0x581c87,
      emissiveIntensity: 0.4,
    });
    const topBar = new THREE.Mesh(TrackSegment.obstacleGeos.highBeamTop, beamMat);
    topBar.position.y = 1.68;
    topBar.castShadow = true;
    beamGroup.add(topBar);

    const glowMat = new THREE.MeshStandardMaterial({
      color: COLORS.highBeamGlow,
      roughness: 0.2,
      metalness: 0.6,
      emissive: 0x9333ea,
      emissiveIntensity: 0.8,
    });
    const crystalBar = new THREE.Mesh(TrackSegment.obstacleGeos.highBeamCrystal, glowMat);
    crystalBar.position.set(0, 1.68, 0.02);
    beamGroup.add(crystalBar);

    const postMat = assets.stoneWallMaterial;
    const postL = new THREE.Mesh(TrackSegment.obstacleGeos.highBeamPost, postMat);
    postL.position.set(LANE_WIDTH * 0.46, 1.2, 0);
    postL.castShadow = true;
    beamGroup.add(postL);

    const postR = new THREE.Mesh(TrackSegment.obstacleGeos.highBeamPost, postMat);
    postR.position.set(-LANE_WIDTH * 0.46, 1.2, 0);
    postR.castShadow = true;
    beamGroup.add(postR);

    const worldX = path.x - lane * LANE_WIDTH;
    const worldY = path.groundY;

    beamGroup.position.set(worldX, worldY, worldZ);
    beamGroup.rotation.y = path.angleY;

    const width = LANE_WIDTH * 0.84;
    const depth = 0.45;

    this.obstacles.push({
      id: (Math.random() * 1000000) | 0,
      type: 'HIGH_BEAM',
      lane,
      x: worldX,
      y: worldY + 1.68,
      z: worldZ,
      width,
      height: 1.25,
      depth,
      mesh: beamGroup,
      box: {
        minX: worldX - (width / 2) * 0.92,
        maxX: worldX + (width / 2) * 0.92,
        minY: worldY + 1.05,
        maxY: worldY + 2.3,
        minZ: worldZ - depth * 0.45,
        maxZ: worldZ + depth * 0.45,
      },
    });
  }

  /**
   * PILLAR (Lane Switch Obstacle)
   * Ancient monolith with radiant crimson guardian eye at eye level,
   * high-visibility hazard chevrons, and clear lane base.
   */
  private addPillar(assets: EnvironmentAssets, lane: LaneIndex, worldZ: number, path: PathPoint) {
    if (!TrackSegment.obstacleGeos.pillarShaft) {
      TrackSegment.obstacleGeos.pillarShaft = new THREE.BoxGeometry(LANE_WIDTH * 0.78, 2.7, 0.75);
      TrackSegment.obstacleGeos.pillarBase = new THREE.BoxGeometry(LANE_WIDTH * 0.84, 0.35, 0.85);
      TrackSegment.obstacleGeos.pillarEye = new THREE.SphereGeometry(0.22, 10, 8);
      TrackSegment.obstacleGeos.pillarDecal = new THREE.PlaneGeometry(LANE_WIDTH * 0.85, 1.5);
      TrackSegment.obstacleGeos.pillarDecal.rotateX(-Math.PI / 2);
    }

    const pillarGroup = new THREE.Group();

    const decal = new THREE.Mesh(TrackSegment.obstacleGeos.pillarDecal, assets.hurdleDecalMaterial);
    decal.position.set(0, 0.02, -0.2);
    pillarGroup.add(decal);

    const baseMat = assets.curbMaterial;
    const base = new THREE.Mesh(TrackSegment.obstacleGeos.pillarBase, baseMat);
    base.position.y = 0.17;
    base.castShadow = true;
    base.receiveShadow = true;
    pillarGroup.add(base);

    const shaftMat = new THREE.MeshStandardMaterial({
      color: COLORS.pillar,
      roughness: 0.55,
      metalness: 0.2,
      emissive: 0x450a0a,
      emissiveIntensity: 0.2,
    });
    const shaft = new THREE.Mesh(TrackSegment.obstacleGeos.pillarShaft, shaftMat);
    shaft.position.y = 1.45;
    shaft.castShadow = true;
    pillarGroup.add(shaft);

    const eye = new THREE.Mesh(TrackSegment.obstacleGeos.pillarEye, assets.pillarEyeMaterial);
    eye.position.set(0, 1.55, 0.38);
    pillarGroup.add(eye);

    const hazardRuneGeo = new THREE.BoxGeometry(LANE_WIDTH * 0.65, 0.12, 0.06);
    const runeTop = new THREE.Mesh(hazardRuneGeo, assets.obstacleAccentMaterial);
    runeTop.position.set(0, 2.1, 0.39);
    pillarGroup.add(runeTop);

    const runeBottom = new THREE.Mesh(hazardRuneGeo, assets.obstacleAccentMaterial);
    runeBottom.position.set(0, 1.0, 0.39);
    pillarGroup.add(runeBottom);

    const worldX = path.x - lane * LANE_WIDTH;
    const worldY = path.groundY;

    pillarGroup.position.set(worldX, worldY, worldZ);
    pillarGroup.rotation.y = path.angleY;

    const width = LANE_WIDTH * 0.78;
    const height = 2.8;
    const depth = 0.75;

    this.obstacles.push({
      id: (Math.random() * 1000000) | 0,
      type: 'PILLAR',
      lane,
      x: worldX,
      y: worldY + 1.4,
      z: worldZ,
      width,
      height,
      depth,
      mesh: pillarGroup,
      box: {
        minX: worldX - (width / 2) * 0.92,
        maxX: worldX + (width / 2) * 0.92,
        minY: worldY,
        maxY: worldY + height,
        minZ: worldZ - depth * 0.45,
        maxZ: worldZ + depth * 0.45,
      },
    });
  }

  /**
   * COIN (Energy Sun Medallion)
   */
  private addCoin(assets: EnvironmentAssets, lane: LaneIndex, worldZ: number) {
    const path = this.getPath(worldZ);
    const mesh = new THREE.Mesh(assets.coinGeo, assets.goldMaterial);

    const worldX = path.x - lane * LANE_WIDTH;
    const worldY = path.groundY + 1.05;

    mesh.position.set(worldX, worldY, worldZ);
    mesh.castShadow = true;

    this.obstacles.push({
      id: (Math.random() * 1000000) | 0,
      type: 'COIN',
      lane,
      x: worldX,
      y: worldY,
      z: worldZ,
      width: 0.7,
      height: 0.7,
      depth: 0.7,
      mesh,
      collected: false,
      box: {
        minX: worldX - 0.35,
        maxX: worldX + 0.35,
        minY: worldY - 0.35,
        maxY: worldY + 0.35,
        minZ: worldZ - 0.35,
        maxZ: worldZ + 0.35,
      },
    });
  }
}
