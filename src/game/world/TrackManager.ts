import * as THREE from 'three';
import {
  LANE_WIDTH,
  LANES,
  CHUNK_LENGTH,
  VISIBLE_CHUNKS,
  TRACK_WIDTH,
  COLORS,
} from '../constants';
import { LaneIndex, ObstacleItem, ObstacleType, TrackChunk, BoundingBox3D } from '../types';

export class TrackManager {
  public scene: THREE.Scene;
  public chunks: TrackChunk[] = [];
  public activeObstacles: ObstacleItem[] = [];

  private nextChunkIndex = 0;
  private nextObstacleId = 1;

  // Reusable materials & geometries for mobile optimization
  private trackMaterial: THREE.MeshStandardMaterial;
  private edgeMaterial: THREE.MeshBasicMaterial;
  private dividerMaterial: THREE.MeshBasicMaterial;
  private sidePillarMaterial: THREE.MeshStandardMaterial;

  private hurdleMaterial: THREE.MeshStandardMaterial;
  private highBeamMaterial: THREE.MeshStandardMaterial;
  private pillarMaterial: THREE.MeshStandardMaterial;
  private coinMaterial: THREE.MeshStandardMaterial;

  private trackGeometry: THREE.PlaneGeometry;
  private hurdleGeometry: THREE.BoxGeometry;
  private highBeamTopGeometry: THREE.BoxGeometry;
  private highBeamPostGeometry: THREE.BoxGeometry;
  private pillarGeometry: THREE.BoxGeometry;
  private coinGeometry: THREE.OctahedronGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Initialize shared materials
    this.trackMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.track,
      roughness: 0.85,
      metalness: 0.1,
    });

    this.edgeMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.trackEdge,
    });

    this.dividerMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.laneDivider,
      transparent: true,
      opacity: 0.7,
    });

    this.sidePillarMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.4,
    });

    this.hurdleMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.hurdle,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0x78350f,
      emissiveIntensity: 0.25,
    });

    this.highBeamMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.highBeam,
      roughness: 0.3,
      metalness: 0.3,
      emissive: 0x831843,
      emissiveIntensity: 0.3,
    });

    this.pillarMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.pillar,
      roughness: 0.4,
      metalness: 0.2,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.25,
    });

    this.coinMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.coin,
      roughness: 0.15,
      metalness: 0.9,
      emissive: 0x854d0e,
      emissiveIntensity: 0.5,
    });

    // Initialize shared geometries
    this.trackGeometry = new THREE.PlaneGeometry(TRACK_WIDTH, CHUNK_LENGTH);
    this.hurdleGeometry = new THREE.BoxGeometry(LANE_WIDTH * 0.9, 0.75, 0.4);
    this.highBeamTopGeometry = new THREE.BoxGeometry(LANE_WIDTH * 0.95, 0.8, 0.4);
    this.highBeamPostGeometry = new THREE.BoxGeometry(0.12, 1.9, 0.12);
    this.pillarGeometry = new THREE.BoxGeometry(LANE_WIDTH * 0.85, 2.8, 0.8);
    this.coinGeometry = new THREE.OctahedronGeometry(0.35, 0);

    this.reset();
  }

  public reset() {
    // Clean up all existing chunks from scene
    for (const chunk of this.chunks) {
      this.scene.remove(chunk.group);
    }
    this.chunks = [];
    this.activeObstacles = [];
    this.nextChunkIndex = 0;
    this.nextObstacleId = 1;

    // Spawn initial visible track chunks
    for (let i = 0; i < VISIBLE_CHUNKS; i++) {
      this.spawnChunk();
    }
  }

  public update(playerZ: number, dt: number) {
    // Animate rotating coins
    for (const obs of this.activeObstacles) {
      if (obs.type === 'COIN' && !obs.collected) {
        obs.mesh.rotation.y += dt * 3.5;
        obs.mesh.position.y = obs.y + Math.sin(playerZ * 0.1 + obs.id) * 0.12;
      }
    }

    // Check if player has passed earliest chunk
    const cullZ = playerZ - 20;
    while (this.chunks.length > 0 && this.chunks[0].zEnd < cullZ) {
      const removed = this.chunks.shift()!;
      this.scene.remove(removed.group);

      // Remove its obstacles from active pool
      const removedIds = new Set(removed.obstacles.map((o) => o.id));
      this.activeObstacles = this.activeObstacles.filter((o) => !removedIds.has(o.id));

      // Spawn next chunk ahead
      this.spawnChunk();
    }
  }

  private spawnChunk() {
    const chunkIndex = this.nextChunkIndex++;
    const zStart = chunkIndex * CHUNK_LENGTH;
    const zEnd = zStart + CHUNK_LENGTH;
    const zCenter = zStart + CHUNK_LENGTH / 2;

    const group = new THREE.Group();

    // 1. Road bed
    const road = new THREE.Mesh(this.trackGeometry, this.trackMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, zCenter);
    road.receiveShadow = true;
    group.add(road);

    // 2. Neon edge lines on left and right borders
    const edgeGeo = new THREE.BoxGeometry(0.12, 0.04, CHUNK_LENGTH);
    const leftEdge = new THREE.Mesh(edgeGeo, this.edgeMaterial);
    leftEdge.position.set(-TRACK_WIDTH / 2, 0.02, zCenter);
    group.add(leftEdge);

    const rightEdge = new THREE.Mesh(edgeGeo, this.edgeMaterial);
    rightEdge.position.set(TRACK_WIDTH / 2, 0.02, zCenter);
    group.add(rightEdge);

    // 3. Lane divider stripes (2 dashed divider lines separating the 3 lanes)
    const dividerGeo = new THREE.BoxGeometry(0.06, 0.02, 3.0);
    const dividersCount = Math.floor(CHUNK_LENGTH / 6);
    for (let i = 0; i < dividersCount; i++) {
      const divZ = zStart + i * 6 + 1.5;
      // Between Lane -1 and 0 (x = -LANE_WIDTH / 2)
      const d1 = new THREE.Mesh(dividerGeo, this.dividerMaterial);
      d1.position.set(-LANE_WIDTH / 2, 0.015, divZ);
      group.add(d1);

      // Between Lane 0 and 1 (x = LANE_WIDTH / 2)
      const d2 = new THREE.Mesh(dividerGeo, this.dividerMaterial);
      d2.position.set(LANE_WIDTH / 2, 0.015, divZ);
      group.add(d2);
    }

    // 4. Side scenery pylons to enhance speed sensation
    const pylonGeo = new THREE.BoxGeometry(0.3, 3.2, 0.3);
    for (let pz = zStart + 5; pz < zEnd; pz += 15) {
      const leftPylon = new THREE.Mesh(pylonGeo, this.sidePillarMaterial);
      leftPylon.position.set(-TRACK_WIDTH / 2 - 0.4, 1.6, pz);
      group.add(leftPylon);

      const rightPylon = new THREE.Mesh(pylonGeo, this.sidePillarMaterial);
      rightPylon.position.set(TRACK_WIDTH / 2 + 0.4, 1.6, pz);
      group.add(rightPylon);
    }

    // 5. Procedural obstacles and collectibles
    const chunkObstacles: ObstacleItem[] = [];

    // Safe zone: First 2 chunks (0m - 90m) have only coins, no lethal obstacles
    if (chunkIndex >= 2) {
      this.generateChunkObstacles(group, zStart, chunkObstacles);
    } else {
      // Spawn welcoming coin line down the center
      for (let cz = zStart + 10; cz < zEnd - 5; cz += 6) {
        this.addCoin(group, 0, cz, chunkObstacles);
      }
    }

    this.scene.add(group);

    const chunk: TrackChunk = {
      index: chunkIndex,
      zStart,
      zEnd,
      group,
      obstacles: chunkObstacles,
    };

    this.chunks.push(chunk);
    this.activeObstacles.push(...chunkObstacles);
  }

  private generateChunkObstacles(group: THREE.Group, zStart: number, list: ObstacleItem[]) {
    // Generate 2 obstacle barriers per chunk (e.g. at zStart + 15 and zStart + 32)
    const positions = [zStart + 15, zStart + 32];

    for (const z of positions) {
      // Ensure fair navigation: NEVER block all 3 lanes with impassable obstacles
      // Pick randomly 1 to 2 lanes to have obstacles, leaving at least 1 open or passable
      const laneShuffled = [...LANES].sort(() => Math.random() - 0.5);
      const obstacleCount = Math.random() < 0.65 ? 2 : 1;

      for (let i = 0; i < obstacleCount; i++) {
        const lane = laneShuffled[i];
        const rand = Math.random();

        if (rand < 0.38) {
          // Hurdle (requires Jump)
          this.addHurdle(group, lane, z, list);
        } else if (rand < 0.72) {
          // High Beam (requires Slide)
          this.addHighBeam(group, lane, z, list);
        } else {
          // Pillar (requires Lane Switch)
          this.addPillar(group, lane, z, list);
        }
      }

      // Add energy coins in the safe lane(s) or over/under obstacles!
      const openLane = laneShuffled[obstacleCount] ?? laneShuffled[0];
      if (Math.random() < 0.8) {
        this.addCoin(group, openLane, z - 3, list);
        this.addCoin(group, openLane, z, list);
        this.addCoin(group, openLane, z + 3, list);
      }
    }
  }

  private addHurdle(group: THREE.Group, lane: LaneIndex, z: number, list: ObstacleItem[]) {
    const x = lane * LANE_WIDTH;
    const y = 0.38; // Height center
    const width = LANE_WIDTH * 0.88;
    const height = 0.75;
    const depth = 0.4;

    const mesh = new THREE.Mesh(this.hurdleGeometry, this.hurdleMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);

    const box: BoundingBox3D = {
      minX: x - width * 0.45,
      maxX: x + width * 0.45,
      minY: 0,
      maxY: height,
      minZ: z - depth * 0.45,
      maxZ: z + depth * 0.45,
    };

    list.push({
      id: this.nextObstacleId++,
      type: 'HURDLE',
      lane,
      x,
      y,
      z,
      width,
      height,
      depth,
      mesh,
      box,
    });
  }

  private addHighBeam(group: THREE.Group, lane: LaneIndex, z: number, list: ObstacleItem[]) {
    const x = lane * LANE_WIDTH;
    const width = LANE_WIDTH * 0.92;
    const height = 1.0;
    const depth = 0.4;
    // Clearance under beam: bottom of beam is at y = 0.95. Standing player is 1.8m so collides; sliding player is 0.8m so clears under!
    const beamY = 1.45;

    const beamGroup = new THREE.Group();

    // Crossbar
    const topBar = new THREE.Mesh(this.highBeamTopGeometry, this.highBeamMaterial);
    topBar.position.set(0, beamY, 0);
    topBar.castShadow = true;
    beamGroup.add(topBar);

    // Left and right support posts
    const leftPost = new THREE.Mesh(this.highBeamPostGeometry, this.sidePillarMaterial);
    leftPost.position.set(-width / 2 + 0.1, 0.95, 0);
    beamGroup.add(leftPost);

    const rightPost = new THREE.Mesh(this.highBeamPostGeometry, this.sidePillarMaterial);
    rightPost.position.set(width / 2 - 0.1, 0.95, 0);
    beamGroup.add(rightPost);

    beamGroup.position.set(x, 0, z);
    group.add(beamGroup);

    const box: BoundingBox3D = {
      minX: x - width * 0.45,
      maxX: x + width * 0.45,
      minY: 0.95, // Clearance threshold
      maxY: 2.2,
      minZ: z - depth * 0.45,
      maxZ: z + depth * 0.45,
    };

    list.push({
      id: this.nextObstacleId++,
      type: 'HIGH_BEAM',
      lane,
      x,
      y: beamY,
      z,
      width,
      height,
      depth,
      mesh: beamGroup,
      box,
    });
  }

  private addPillar(group: THREE.Group, lane: LaneIndex, z: number, list: ObstacleItem[]) {
    const x = lane * LANE_WIDTH;
    const y = 1.4; // Center
    const width = LANE_WIDTH * 0.85;
    const height = 2.8;
    const depth = 0.8;

    const mesh = new THREE.Mesh(this.pillarGeometry, this.pillarMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);

    const box: BoundingBox3D = {
      minX: x - width * 0.45,
      maxX: x + width * 0.45,
      minY: 0,
      maxY: height,
      minZ: z - depth * 0.45,
      maxZ: z + depth * 0.45,
    };

    list.push({
      id: this.nextObstacleId++,
      type: 'PILLAR',
      lane,
      x,
      y,
      z,
      width,
      height,
      depth,
      mesh,
      box,
    });
  }

  private addCoin(group: THREE.Group, lane: LaneIndex, z: number, list: ObstacleItem[]) {
    const x = lane * LANE_WIDTH;
    const y = 1.05;
    const width = 0.7;
    const height = 0.7;
    const depth = 0.7;

    const mesh = new THREE.Mesh(this.coinGeometry, this.coinMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);

    const box: BoundingBox3D = {
      minX: x - 0.35,
      maxX: x + 0.35,
      minY: y - 0.35,
      maxY: y + 0.35,
      minZ: z - 0.35,
      maxZ: z + 0.35,
    };

    list.push({
      id: this.nextObstacleId++,
      type: 'COIN',
      lane,
      x,
      y,
      z,
      width,
      height,
      depth,
      mesh,
      box,
      collected: false,
    });
  }
}
