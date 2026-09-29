import * as THREE from 'three';
import { LANE_WIDTH, TRACK_WIDTH, CHUNK_LENGTH, COLORS } from '../constants';
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
    hurdleLog?: THREE.CylinderGeometry;
    highBeamTop?: THREE.BoxGeometry;
    highBeamPost?: THREE.CylinderGeometry;
    pillarIdol?: THREE.BoxGeometry;
  } = {};

  constructor(type: SegmentType, startZ: number, startX: number, startY: number) {
    this.type = type;
    this.startZ = startZ;
    this.endZ = startZ + CHUNK_LENGTH;
    this.startX = startX;
    this.startY = startY;

    // Determine endX and endY based on segment type
    if (type === 'GENTLE_LEFT') {
      this.deltaX = -4.0;
    } else if (type === 'GENTLE_RIGHT') {
      this.deltaX = 4.0;
    } else {
      this.deltaX = 0;
    }

    this.endX = startX + this.deltaX;
    this.endY = startY; // Bridges and ramps return smoothly to base elevation

    this.group = new THREE.Group();
    this.buildGeometry();
  }

  public getPath(z: number): PathPoint {
    const t = Math.max(0, Math.min(1, (z - this.startZ) / CHUNK_LENGTH));

    let x = this.startX;
    let y = this.startY;
    let angleY = 0;
    let pitchX = 0;

    if (this.type === 'GENTLE_LEFT' || this.type === 'GENTLE_RIGHT') {
      // Smooth S-curve easing: (1 - cos(pi * t)) / 2
      const smoothT = (1 - Math.cos(Math.PI * t)) / 2;
      x = this.startX + this.deltaX * smoothT;

      // Derivative dx/dz for angle
      const dSmoothT = (Math.PI * Math.sin(Math.PI * t)) / (2 * CHUNK_LENGTH);
      const dx_dz = this.deltaX * dSmoothT;
      angleY = Math.atan2(dx_dz, 1);
    } else if (this.type === 'RAMP_GAP') {
      // Ramp up in first half, ramp down in second half
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
      // Gentle arch over stream
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

  /**
   * Repositions this segment when recycled from the pool.
   * Completely avoids garbage collection!
   */
  public reposition(newStartZ: number, newStartX: number, newStartY: number) {
    this.startZ = newStartZ;
    this.endZ = newStartZ + CHUNK_LENGTH;
    this.startX = newStartX;
    this.endX = newStartX + this.deltaX;
    this.startY = newStartY;
    this.endY = newStartY;

    this.group.position.set(this.startX, this.startY, this.startZ);

    // Update obstacles positions to new world coordinates
    for (const obs of this.obstacles) {
      obs.collected = false;
      obs.mesh.visible = true;

      const path = this.getPath(obs.z);
      obs.x = path.x + obs.lane * LANE_WIDTH;
      obs.y = path.groundY + (obs.type === 'HIGH_BEAM' ? 1.5 : obs.type === 'COIN' ? 1.05 : obs.height / 2);

      obs.mesh.position.set(obs.x, obs.y, obs.z);

      // Update bounding box
      obs.box = {
        minX: obs.x - obs.width * 0.45,
        maxX: obs.x + obs.width * 0.45,
        minY: obs.type === 'HIGH_BEAM' ? path.groundY + 0.95 : path.groundY,
        maxY: path.groundY + obs.height,
        minZ: obs.z - obs.depth * 0.45,
        maxZ: obs.z + obs.depth * 0.45,
      };
    }
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

  private buildStraightPath(assets: EnvironmentAssets) {
    const roadGeo = new THREE.PlaneGeometry(TRACK_WIDTH, CHUNK_LENGTH);
    const road = new THREE.Mesh(roadGeo, assets.stonePathMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, CHUNK_LENGTH / 2);
    road.receiveShadow = true;
    this.group.add(road);

    // Weathered stone curb borders
    const curbGeo = new THREE.BoxGeometry(0.5, 0.35, CHUNK_LENGTH);
    const leftCurb = new THREE.Mesh(curbGeo, assets.curbMaterial);
    leftCurb.position.set(-TRACK_WIDTH / 2 - 0.2, 0.15, CHUNK_LENGTH / 2);
    leftCurb.castShadow = true;
    this.group.add(leftCurb);

    const rightCurb = new THREE.Mesh(curbGeo, assets.curbMaterial);
    rightCurb.position.set(TRACK_WIDTH / 2 + 0.2, 0.15, CHUNK_LENGTH / 2);
    rightCurb.castShadow = true;
    this.group.add(rightCurb);

    // Side jungle trees and vegetation
    for (let z = 6; z < CHUNK_LENGTH; z += 14) {
      const tree = assets.createTropicalTree(9 + Math.random() * 3);
      tree.position.set(-TRACK_WIDTH / 2 - 2.8 - Math.random() * 2, 0, z);
      this.group.add(tree);

      const treeR = assets.createTropicalTree(9 + Math.random() * 3);
      treeR.position.set(TRACK_WIDTH / 2 + 2.8 + Math.random() * 2, 0, z + 5);
      this.group.add(treeR);

      // Fern bushes
      const fern = assets.createFernBush();
      fern.position.set(-TRACK_WIDTH / 2 - 1.2, 0, z + 3);
      this.group.add(fern);

      const fernR = assets.createFernBush();
      fernR.position.set(TRACK_WIDTH / 2 + 1.2, 0, z + 8);
      this.group.add(fernR);
    }

    // Ancient guardian deity statues flanking the avenue (matching video reference 00:00)
    const statueL = assets.createGuardianStatue();
    statueL.position.set(-TRACK_WIDTH / 2 - 1.4, 0, 8);
    this.group.add(statueL);

    const statueR = assets.createGuardianStatue();
    statueR.position.set(TRACK_WIDTH / 2 + 1.4, 0, 8);
    this.group.add(statueR);

    // Golden sunbeams filtering through the jungle canopy
    const sunbeams = assets.createSunbeamCluster();
    sunbeams.position.set(0, 0, CHUNK_LENGTH / 2);
    this.group.add(sunbeams);
  }

  private buildRuinedStone(assets: EnvironmentAssets) {
    // Road surface
    const roadGeo = new THREE.PlaneGeometry(TRACK_WIDTH, CHUNK_LENGTH);
    const road = new THREE.Mesh(roadGeo, assets.stonePathMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, CHUNK_LENGTH / 2);
    road.receiveShadow = true;
    this.group.add(road);

    // Temple stone walls flanking the road
    const wallGeo = new THREE.BoxGeometry(0.8, 2.5, 12);
    const leftWall = new THREE.Mesh(wallGeo, assets.stoneWallMaterial);
    leftWall.position.set(-TRACK_WIDTH / 2 - 0.9, 1.25, 12);
    leftWall.castShadow = true;
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, assets.stoneWallMaterial);
    rightWall.position.set(TRACK_WIDTH / 2 + 0.9, 1.25, 28);
    rightWall.castShadow = true;
    this.group.add(rightWall);

    // Ancient fluted pillars (some intact, some crumbling/broken)
    const pillarPositions = [
      { x: -TRACK_WIDTH / 2 - 1.2, z: 6, broken: false },
      { x: TRACK_WIDTH / 2 + 1.2, z: 10, broken: true },
      { x: -TRACK_WIDTH / 2 - 1.2, z: 22, broken: true },
      { x: TRACK_WIDTH / 2 + 1.2, z: 24, broken: false },
      { x: -TRACK_WIDTH / 2 - 1.2, z: 36, broken: false },
      { x: TRACK_WIDTH / 2 + 1.2, z: 38, broken: false },
    ];

    for (const p of pillarPositions) {
      const col = assets.createPillar(p.broken);
      col.position.set(p.x, 0, p.z);
      this.group.add(col);

      // Vines on pillars
      const vines = assets.createHangingVines();
      vines.position.set(p.x, 3.5, p.z);
      this.group.add(vines);
    }

    // Distant Temple Stupa Landmarks in background (towering spires like in reference video)
    const stupaL = assets.createTempleStupa(true);
    stupaL.position.set(-TRACK_WIDTH / 2 - 8.5, 0, CHUNK_LENGTH / 2);
    this.group.add(stupaL);

    const stupaR = assets.createTempleStupa(false);
    stupaR.position.set(TRACK_WIDTH / 2 + 8.5, 0, CHUNK_LENGTH * 0.7);
    this.group.add(stupaR);

    // Sunbeam shafts
    const sunbeams = assets.createSunbeamCluster();
    sunbeams.position.set(0, 0, 18);
    this.group.add(sunbeams);
  }

  private buildCurvedPath(assets: EnvironmentAssets) {
    // Generate curved ribbon track mesh using segmented strips
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

      // Curbs on curve
      const curbGeo = new THREE.BoxGeometry(0.5, 0.35, segLen + 0.1);
      const cosA = Math.cos(segAngle);
      const sinA = Math.sin(segAngle);

      const leftC = new THREE.Mesh(curbGeo, assets.curbMaterial);
      leftC.position.set((x0 + x1) / 2 - (TRACK_WIDTH / 2 + 0.2) * cosA, 0.15, (z0 + z1) / 2 + (TRACK_WIDTH / 2 + 0.2) * sinA);
      leftC.rotation.y = segAngle;
      this.group.add(leftC);

      const rightC = new THREE.Mesh(curbGeo, assets.curbMaterial);
      rightC.position.set((x0 + x1) / 2 + (TRACK_WIDTH / 2 + 0.2) * cosA, 0.15, (z0 + z1) / 2 - (TRACK_WIDTH / 2 + 0.2) * sinA);
      rightC.rotation.y = segAngle;
      this.group.add(rightC);
    }

    // Outer curve ancient statues / pillars
    for (let i = 0; i < 4; i++) {
      const cz = 8 + i * 10;
      const ct = (1 - Math.cos(Math.PI * (cz / CHUNK_LENGTH))) / 2;
      const cx = this.deltaX * ct;

      const sideSign = this.deltaX > 0 ? -1 : 1;
      const col = assets.createPillar(i % 2 === 1);
      col.position.set(cx + sideSign * (TRACK_WIDTH / 2 + 1.8), 0, cz);
      this.group.add(col);

      const rock = assets.createMossyRock(1.3);
      rock.position.set(cx - sideSign * (TRACK_WIDTH / 2 + 1.5), 0.5, cz + 2);
      this.group.add(rock);
    }

    // Landmark stupa on curve
    const stupa = assets.createTempleStupa(false);
    stupa.position.set(this.deltaX * 0.7 + (this.deltaX > 0 ? 8 : -8), 0, CHUNK_LENGTH * 0.7);
    this.group.add(stupa);
  }

  private buildBridge(assets: EnvironmentAssets) {
    // 1. Sunken water stream underneath
    const waterGeo = new THREE.PlaneGeometry(TRACK_WIDTH * 2.8, CHUNK_LENGTH);
    const water = new THREE.Mesh(waterGeo, assets.waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -1.8, CHUNK_LENGTH / 2);
    this.group.add(water);

    // River bed banks / canyon rocks
    for (let rz = 4; rz < CHUNK_LENGTH; rz += 8) {
      const rockL = assets.createMossyRock(2.2);
      rockL.position.set(-TRACK_WIDTH / 2 - 2.5, -0.8, rz);
      this.group.add(rockL);

      const rockR = assets.createMossyRock(2.2);
      rockR.position.set(TRACK_WIDTH / 2 + 2.5, -0.8, rz + 3);
      this.group.add(rockR);
    }

    // 2. Weathered timber bridge deck
    const bridgeGeo = new THREE.BoxGeometry(TRACK_WIDTH, 0.45, CHUNK_LENGTH);
    const bridge = new THREE.Mesh(bridgeGeo, assets.woodBridgeMaterial);
    bridge.position.set(0, 0.1, CHUNK_LENGTH / 2);
    bridge.receiveShadow = true;
    this.group.add(bridge);

    // 3. Wooden side handrails & rope posts
    const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.2, 6);
    const railGeo = new THREE.BoxGeometry(0.18, 0.12, CHUNK_LENGTH);

    const leftRail = new THREE.Mesh(railGeo, assets.rootMaterial);
    leftRail.position.set(-TRACK_WIDTH / 2 + 0.15, 0.9, CHUNK_LENGTH / 2);
    this.group.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, assets.rootMaterial);
    rightRail.position.set(TRACK_WIDTH / 2 - 0.15, 0.9, CHUNK_LENGTH / 2);
    this.group.add(rightRail);

    for (let pz = 2; pz <= CHUNK_LENGTH - 2; pz += 6) {
      const postL = new THREE.Mesh(postGeo, assets.rootMaterial);
      postL.position.set(-TRACK_WIDTH / 2 + 0.15, 0.6, pz);
      this.group.add(postL);

      const postR = new THREE.Mesh(postGeo, assets.rootMaterial);
      postR.position.set(TRACK_WIDTH / 2 - 0.15, 0.6, pz);
      this.group.add(postR);
    }
  }

  private buildRampGap(assets: EnvironmentAssets) {
    // Incline ramp leading to an elevated temple dais / chasm
    const rampLen1 = CHUNK_LENGTH * 0.45;
    const rampLen2 = CHUNK_LENGTH * 0.2;
    const rampLen3 = CHUNK_LENGTH * 0.35;

    // Up section
    const upGeo = new THREE.BoxGeometry(TRACK_WIDTH, 0.5, rampLen1);
    const upMesh = new THREE.Mesh(upGeo, assets.stonePathMaterial);
    upMesh.position.set(0, 0.65, rampLen1 / 2);
    upMesh.rotation.x = 0.06;
    upMesh.receiveShadow = true;
    this.group.add(upMesh);

    // Plateau section
    const plateauGeo = new THREE.BoxGeometry(TRACK_WIDTH, 0.5, rampLen2);
    const platMesh = new THREE.Mesh(plateauGeo, assets.stonePathMaterial);
    platMesh.position.set(0, 1.3, rampLen1 + rampLen2 / 2);
    platMesh.receiveShadow = true;
    this.group.add(platMesh);

    // Down section
    const downGeo = new THREE.BoxGeometry(TRACK_WIDTH, 0.5, rampLen3);
    const downMesh = new THREE.Mesh(downGeo, assets.stonePathMaterial);
    downMesh.position.set(0, 0.65, rampLen1 + rampLen2 + rampLen3 / 2);
    downMesh.rotation.x = -0.07;
    downMesh.receiveShadow = true;
    this.group.add(downMesh);

    // Stone terrace wall foundation underneath
    const foundGeo = new THREE.BoxGeometry(TRACK_WIDTH + 1.0, 1.2, rampLen2 + 6);
    const found = new THREE.Mesh(foundGeo, assets.stoneWallMaterial);
    found.position.set(0, 0.3, rampLen1 + rampLen2 / 2);
    this.group.add(found);

    // Guardian carved pillars on the terrace
    const colL = assets.createPillar(false);
    colL.position.set(-TRACK_WIDTH / 2 - 1.2, 1.3, rampLen1 + 3);
    this.group.add(colL);

    const colR = assets.createPillar(false);
    colR.position.set(TRACK_WIDTH / 2 + 1.2, 1.3, rampLen1 + 3);
    this.group.add(colR);
  }

  /**
   * Spawns obstacles and coins on this segment.
   */
  public generateObstacles(startIndex: number) {
    this.obstacles = [];
    const assets = EnvironmentAssets.get();

    // In first 2 chunks, no lethal obstacles, only coins
    if (startIndex < 2) {
      for (let zOffset = 10; zOffset < CHUNK_LENGTH - 5; zOffset += 6) {
        this.addCoin(assets, 0, this.startZ + zOffset);
      }
      return;
    }

    // 2 obstacle barriers per chunk
    const zOffsets = [15, 32];
    const lanes: LaneIndex[] = [-1, 0, 1];

    for (const zOff of zOffsets) {
      const worldZ = this.startZ + zOff;
      const path = this.getPath(worldZ);

      // Fair layout: randomly block 1 or 2 lanes, never all 3
      const shuffledLanes = [...lanes].sort(() => Math.random() - 0.5);
      const obstacleCount = Math.random() < 0.65 ? 2 : 1;

      for (let i = 0; i < obstacleCount; i++) {
        const lane = shuffledLanes[i];
        const rand = Math.random();

        if (rand < 0.38) {
          // Hurdle (ancient mossy log / altar) -> Jump
          this.addHurdle(assets, lane, worldZ, path);
        } else if (rand < 0.72) {
          // High Beam (ancient vine arch / stone lintel) -> Slide
          this.addHighBeam(assets, lane, worldZ, path);
        } else {
          // Pillar (carved stone monolith / idol) -> Lane switch
          this.addPillar(assets, lane, worldZ, path);
        }
      }

      // Add coins along the clear open lane
      const openLane = shuffledLanes[obstacleCount] ?? shuffledLanes[0];
      if (Math.random() < 0.8) {
        this.addCoin(assets, openLane, worldZ - 3);
        this.addCoin(assets, openLane, worldZ);
        this.addCoin(assets, openLane, worldZ + 3);
      }
    }
  }

  private addHurdle(assets: EnvironmentAssets, lane: LaneIndex, worldZ: number, path: PathPoint) {
    if (!TrackSegment.obstacleGeos.hurdleLog) {
      TrackSegment.obstacleGeos.hurdleLog = new THREE.CylinderGeometry(0.35, 0.38, LANE_WIDTH * 0.9, 8);
      TrackSegment.obstacleGeos.hurdleLog.rotateZ(Math.PI / 2);
    }

    const hurdleMat = new THREE.MeshStandardMaterial({
      color: COLORS.hurdle || 0xd97706,
      roughness: 0.6,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(TrackSegment.obstacleGeos.hurdleLog, hurdleMat);
    const x = path.x - lane * LANE_WIDTH;
    const y = path.groundY + 0.38;
    mesh.position.set(x, y, worldZ);
    mesh.rotation.y = path.angleY;
    mesh.castShadow = true;
    this.group.add(mesh);

    const width = LANE_WIDTH * 0.88;
    const height = 0.75;
    const depth = 0.5;

    this.obstacles.push({
      id: Math.random() * 1000000 | 0,
      type: 'HURDLE',
      lane,
      x,
      y,
      z: worldZ,
      width,
      height,
      depth,
      mesh,
      box: {
        minX: x - width * 0.45,
        maxX: x + width * 0.45,
        minY: path.groundY,
        maxY: path.groundY + height,
        minZ: worldZ - depth * 0.45,
        maxZ: worldZ + depth * 0.45,
      },
    });
  }

  private addHighBeam(assets: EnvironmentAssets, lane: LaneIndex, worldZ: number, path: PathPoint) {
    if (!TrackSegment.obstacleGeos.highBeamTop) {
      TrackSegment.obstacleGeos.highBeamTop = new THREE.BoxGeometry(LANE_WIDTH * 0.95, 0.75, 0.45);
      TrackSegment.obstacleGeos.highBeamPost = new THREE.CylinderGeometry(0.12, 0.14, 2.0, 6);
    }

    const beamGroup = new THREE.Group();
    const beamMat = new THREE.MeshStandardMaterial({
      color: COLORS.highBeam || 0x9333ea,
      roughness: 0.5,
      metalness: 0.2,
      emissive: 0x581c87,
      emissiveIntensity: 0.3,
    });

    // Cross lintel bar
    const topBar = new THREE.Mesh(TrackSegment.obstacleGeos.highBeamTop, beamMat);
    topBar.position.y = 1.45;
    topBar.castShadow = true;
    beamGroup.add(topBar);

    // Left and right stone posts
    const p1 = new THREE.Mesh(TrackSegment.obstacleGeos.highBeamPost, assets.stoneWallMaterial);
    p1.position.set(-LANE_WIDTH * 0.45, 1.0, 0);
    beamGroup.add(p1);

    const p2 = new THREE.Mesh(TrackSegment.obstacleGeos.highBeamPost, assets.stoneWallMaterial);
    p2.position.set(LANE_WIDTH * 0.45, 1.0, 0);
    beamGroup.add(p2);

    const x = path.x - lane * LANE_WIDTH;
    const y = path.groundY;
    beamGroup.position.set(x, y, worldZ);
    beamGroup.rotation.y = path.angleY;
    this.group.add(beamGroup);

    const width = LANE_WIDTH * 0.9;
    const height = 1.0;
    const depth = 0.45;

    this.obstacles.push({
      id: Math.random() * 1000000 | 0,
      type: 'HIGH_BEAM',
      lane,
      x,
      y: y + 1.45,
      z: worldZ,
      width,
      height,
      depth,
      mesh: beamGroup,
      box: {
        minX: x - width * 0.45,
        maxX: x + width * 0.45,
        minY: path.groundY + 0.95,
        maxY: path.groundY + 2.2,
        minZ: worldZ - depth * 0.45,
        maxZ: worldZ + depth * 0.45,
      },
    });
  }

  private addPillar(assets: EnvironmentAssets, lane: LaneIndex, worldZ: number, path: PathPoint) {
    if (!TrackSegment.obstacleGeos.pillarIdol) {
      TrackSegment.obstacleGeos.pillarIdol = new THREE.BoxGeometry(LANE_WIDTH * 0.85, 2.8, 0.85);
    }

    const idolMat = new THREE.MeshStandardMaterial({
      color: COLORS.pillar || 0xb91c1c,
      roughness: 0.6,
      metalness: 0.15,
      emissive: 0x450a0a,
      emissiveIntensity: 0.25,
    });

    const mesh = new THREE.Mesh(TrackSegment.obstacleGeos.pillarIdol, idolMat);
    const x = path.x - lane * LANE_WIDTH;
    const y = path.groundY + 1.4;
    mesh.position.set(x, y, worldZ);
    mesh.rotation.y = path.angleY;
    mesh.castShadow = true;
    this.group.add(mesh);

    const width = LANE_WIDTH * 0.85;
    const height = 2.8;
    const depth = 0.85;

    this.obstacles.push({
      id: Math.random() * 1000000 | 0,
      type: 'PILLAR',
      lane,
      x,
      y,
      z: worldZ,
      width,
      height,
      depth,
      mesh,
      box: {
        minX: x - width * 0.45,
        maxX: x + width * 0.45,
        minY: path.groundY,
        maxY: path.groundY + height,
        minZ: worldZ - depth * 0.45,
        maxZ: worldZ + depth * 0.45,
      },
    });
  }

  private addCoin(assets: EnvironmentAssets, lane: LaneIndex, worldZ: number) {
    const path = this.getPath(worldZ);
    const mesh = new THREE.Mesh(assets.coinGeo, assets.goldMaterial);

    const x = path.x - lane * LANE_WIDTH;
    const y = path.groundY + 1.05;
    mesh.position.set(x, y, worldZ);
    mesh.castShadow = true;
    this.group.add(mesh);

    this.obstacles.push({
      id: Math.random() * 1000000 | 0,
      type: 'COIN',
      lane,
      x,
      y,
      z: worldZ,
      width: 0.7,
      height: 0.7,
      depth: 0.7,
      mesh,
      collected: false,
      box: {
        minX: x - 0.35,
        maxX: x + 0.35,
        minY: y - 0.35,
        maxY: y + 0.35,
        minZ: worldZ - 0.35,
        maxZ: worldZ + 0.35,
      },
    });
  }
}
