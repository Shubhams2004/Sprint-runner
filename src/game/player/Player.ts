import * as THREE from 'three';
import {
  LANE_WIDTH,
  JUMP_VELOCITY,
  GRAVITY,
  SLIDE_DURATION,
  PLAYER_HEIGHT_STAND,
  PLAYER_HEIGHT_SLIDE,
  PLAYER_WIDTH,
  PLAYER_DEPTH,
  COLORS,
} from '../constants';
import { LaneIndex, BoundingBox3D } from '../types';
import { soundEffects } from '../audio/SoundEffects';
import { pathTracker } from '../world/PathTracker';

export class Player {
  public mesh: THREE.Group;
  public laneIndex: LaneIndex = 0;

  public get lane(): LaneIndex {
    return this.laneIndex;
  }

  public get targetLane(): LaneIndex {
    return this.laneIndex;
  }

  public x = 0;
  public y = 0; // Relative jump height above ground
  public z = 0;
  public vy = 0;
  public currentGroundY = 0;

  public isGrounded = true;
  public isJumping = false;
  public isSliding = false;
  public slideTimer = 0;
  public isDead = false;

  public speed = 0;

  // Visual sub-meshes for adventurer runner
  private torsoMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  private hairBandanaMesh: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private backpackMesh: THREE.Mesh;
  private ponytailMesh: THREE.Mesh;
  private shadowMesh: THREE.Mesh;

  private runCycleTime = 0;

  constructor() {
    this.mesh = new THREE.Group();

    // Explorer materials matching ancient jungle ruins aesthetic
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.7,
      metalness: 0.05,
    });

    const vestMat = new THREE.MeshStandardMaterial({
      color: COLORS.playerBody, // Khaki / tactical olive
      roughness: 0.65,
      metalness: 0.1,
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x36454f, // Slate cargo pants
      roughness: 0.7,
      metalness: 0.05,
    });

    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e18, // Leather boots, harness & hair
      roughness: 0.5,
      metalness: 0.15,
    });

    const bandanaMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // Red adventurer headband
      roughness: 0.6,
      metalness: 0.05,
    });

    const relicMat = new THREE.MeshStandardMaterial({
      color: COLORS.playerCore, // Brass relic / compass on chest
      roughness: 0.25,
      metalness: 0.8,
      emissive: 0x78350f,
      emissiveIntensity: 0.3,
    });

    // Torso with vest
    const torsoGeo = new THREE.BoxGeometry(0.68, 0.85, 0.42);
    this.torsoMesh = new THREE.Mesh(torsoGeo, vestMat);
    this.torsoMesh.position.y = 1.05;
    this.torsoMesh.castShadow = true;
    this.mesh.add(this.torsoMesh);

    // Explorer backpack / gear pack on back
    const packGeo = new THREE.BoxGeometry(0.48, 0.55, 0.28);
    this.backpackMesh = new THREE.Mesh(packGeo, leatherMat);
    this.backpackMesh.position.set(0, 1.08, -0.26);
    this.backpackMesh.castShadow = true;
    this.mesh.add(this.backpackMesh);

    // Brass relic compass on front strap
    const relicGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8);
    relicGeo.rotateX(Math.PI / 2);
    const relicMesh = new THREE.Mesh(relicGeo, relicMat);
    relicMesh.position.set(0.14, 1.15, 0.22);
    this.mesh.add(relicMesh);

    // Head
    const headGeo = new THREE.BoxGeometry(0.4, 0.42, 0.38);
    this.headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headMesh.position.y = 1.62;
    this.headMesh.castShadow = true;
    this.mesh.add(this.headMesh);

    // Hair / Bandana
    const bandanaGeo = new THREE.BoxGeometry(0.42, 0.1, 0.4);
    this.hairBandanaMesh = new THREE.Mesh(bandanaGeo, bandanaMat);
    this.hairBandanaMesh.position.set(0, 1.72, 0);
    this.mesh.add(this.hairBandanaMesh);

    const hairGeo = new THREE.BoxGeometry(0.42, 0.15, 0.4);
    const hairMesh = new THREE.Mesh(hairGeo, leatherMat);
    hairMesh.position.set(0, 1.82, -0.05);
    this.mesh.add(hairMesh);

    // Adventurer bouncing ponytail
    const ponytailGeo = new THREE.CylinderGeometry(0.06, 0.12, 0.45, 6);
    ponytailGeo.rotateX(Math.PI / 3);
    this.ponytailMesh = new THREE.Mesh(ponytailGeo, leatherMat);
    this.ponytailMesh.position.set(0, 1.75, -0.26);
    this.mesh.add(this.ponytailMesh);

    // Gear bedroll on top of backpack
    const bedrollGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.54, 8);
    bedrollGeo.rotateZ(Math.PI / 2);
    const bedrollMesh = new THREE.Mesh(bedrollGeo, vestMat);
    bedrollMesh.position.set(0, 1.38, -0.26);
    this.mesh.add(bedrollMesh);

    // Legs with cargo pants & boots
    const legGeo = new THREE.BoxGeometry(0.22, 0.65, 0.24);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.2, 0.35, 0);
    this.leftLeg.castShadow = true;
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.2, 0.35, 0);
    this.rightLeg.castShadow = true;
    this.mesh.add(this.rightLeg);

    // Arms with rolled-up sleeves
    const armGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
    this.leftArm = new THREE.Mesh(armGeo, skinMat);
    this.leftArm.position.set(-0.46, 1.0, 0);
    this.leftArm.castShadow = true;
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, skinMat);
    this.rightArm.position.set(0.46, 1.0, 0);
    this.rightArm.castShadow = true;
    this.mesh.add(this.rightArm);

    // Ground shadow decal
    const shadowGeo = new THREE.PlaneGeometry(0.9, 1.3);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x050f08,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.02;
    this.mesh.add(this.shadowMesh);

    this.reset();
  }

  public reset() {
    this.laneIndex = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vy = 0;
    this.currentGroundY = 0;
    this.isGrounded = true;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.isDead = false;
    this.speed = 0;
    this.runCycleTime = 0;

    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.scale.set(1, 1, 1);
  }

  /**
   * Authoritative single-step lane change function.
   * direction = -1 means LEFT
   * direction = +1 means RIGHT
   *
   * Valid discrete transitions:
   *   LEFT (-1) <-> CENTER (0) <-> RIGHT (+1)
   * A single horizontal input may change the lane index by exactly ONE step.
   * Skipping the center lane is completely blocked.
   */
  public changeLane(direction: -1 | 1): void {
    if (this.isDead) return;

    const currentLane = this.laneIndex;
    // Exactly one discrete step clamped between -1 (LEFT) and 1 (RIGHT)
    const nextLane = Math.max(-1, Math.min(1, currentLane + direction)) as LaneIndex;
    this.laneIndex = nextLane;

    // Target X according to discrete lane index mapping:
    // - LEFT   = -laneWidth
    // - CENTER = 0
    // - RIGHT  = +laneWidth
    const targetX = this.laneIndex * LANE_WIDTH;

    // Temporary development logging showing:
    // current laneIndex, input direction, target laneIndex, target X
    console.log(
      `current laneIndex: ${currentLane} | input direction: ${direction} | target laneIndex: ${this.laneIndex} | target X: ${targetX.toFixed(2)}`
    );

    if (this.laneIndex !== currentLane) {
      soundEffects.playLaneSwitch();
    }
  }

  public moveLeft() {
    this.changeLane(-1);
  }

  public moveRight() {
    this.changeLane(1);
  }

  public jump() {
    if (this.isDead) return;
    if (this.isGrounded || this.isSliding) {
      this.isSliding = false;
      this.slideTimer = 0;
      this.vy = JUMP_VELOCITY;
      this.isGrounded = false;
      this.isJumping = true;
      soundEffects.playJump();
    }
  }

  public slide() {
    if (this.isDead) return;
    if (this.isGrounded) {
      this.isSliding = true;
      this.slideTimer = SLIDE_DURATION;
      soundEffects.playSlide();
    } else if (this.isJumping || !this.isGrounded) {
      // Fast drop to slide
      this.vy = -JUMP_VELOCITY * 1.4;
      this.isSliding = true;
      this.slideTimer = SLIDE_DURATION;
      soundEffects.playSlide();
    }
  }

  public crash() {
    this.isDead = true;
    this.speed = 0;
    soundEffects.playCrash();
  }

  public update(dt: number) {
    if (this.isDead) {
      this.mesh.position.y = Math.max(this.currentGroundY, this.mesh.position.y - dt * 2.5);
      this.mesh.rotation.x = Math.min(Math.PI / 2, this.mesh.rotation.x + dt * 5);
      return;
    }

    // Forward translation into the scene away from camera
    this.z += this.speed * dt;

    // Track path lookup at current player Z
    const pathPoint = pathTracker.getPathAt(this.z);
    this.currentGroundY = pathPoint.groundY;

    // Map discrete laneIndex to continuous world X position
    // In our camera coordinate space looking down +Z:
    // Visual LEFT lane (screen left) is at world X: pathPoint.x + LANE_WIDTH (-laneIndex * LANE_WIDTH when laneIndex = -1)
    // Visual RIGHT lane (screen right) is at world X: pathPoint.x - LANE_WIDTH (-laneIndex * LANE_WIDTH when laneIndex = +1)
    // Visual CENTER lane is at world X: pathPoint.x
    const targetWorldX = pathPoint.x - this.laneIndex * LANE_WIDTH;
    const laneLerpSpeed = 16.0;
    this.x += (targetWorldX - this.x) * (1 - Math.exp(-laneLerpSpeed * dt));

    // Hard clamp to ensure player never clips beyond track boundaries
    const maxTrackBound = pathPoint.x + LANE_WIDTH * 1.05;
    const minTrackBound = pathPoint.x - LANE_WIDTH * 1.05;
    this.x = Math.max(minTrackBound, Math.min(maxTrackBound, this.x));

    // Dynamic banking roll & track yaw angle
    const lateralDelta = targetWorldX - this.x;
    const targetRoll = Math.max(-0.15, Math.min(0.15, -lateralDelta * 0.12));
    this.mesh.rotation.z += (targetRoll - this.mesh.rotation.z) * (1 - Math.exp(-12.0 * dt));
    this.mesh.rotation.y = pathPoint.angleY;
    this.mesh.rotation.x = 0;

    // Vertical physics (Jumping and Gravity above the current ground elevation)
    if (!this.isGrounded) {
      this.y += this.vy * dt;
      this.vy -= GRAVITY * dt;

      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.isGrounded = true;
        this.isJumping = false;
      }
    }

    // Sliding mechanics
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        this.slideTimer = 0;
      }
    }

    // Procedural run / jump / slide pose animation
    this.updateAnimationPose(dt);

    // Synchronize 3D mesh position in world space
    const worldY = this.currentGroundY + this.y;
    this.mesh.position.set(this.x, worldY, this.z);

    // Keep ground shadow pinned to road surface with scale attenuation
    const shadowScale = Math.max(0.3, 1 - this.y / 4.0);
    this.shadowMesh.scale.set(shadowScale, shadowScale, 1);
    this.shadowMesh.position.y = 0.02 - this.y;
  }

  private updateAnimationPose(dt: number) {
    if (this.isSliding) {
      // Compressed aerodynamic slide pose
      this.mesh.scale.set(1.1, 0.45, 1.25);
      this.torsoMesh.rotation.x = 0.55;
      this.torsoMesh.rotation.y = 0;
      this.leftLeg.rotation.x = -1.2;
      this.rightLeg.rotation.x = -1.2;
      this.leftArm.rotation.x = -1.4;
      this.rightArm.rotation.x = -1.4;
      this.ponytailMesh.rotation.x = -0.5;
    } else {
      this.mesh.scale.set(1, 1, 1);

      if (!this.isGrounded) {
        // Jumping pose
        this.torsoMesh.rotation.x = 0.05;
        this.torsoMesh.rotation.y = 0;
        this.leftLeg.rotation.x = 0.6;
        this.rightLeg.rotation.x = -0.4;
        this.leftArm.rotation.x = -0.8;
        this.rightArm.rotation.x = -0.8;
        this.ponytailMesh.rotation.x = -0.6;
      } else {
        // Athletic sprinting gait matching the reference video
        const runSpeedMultiplier = Math.max(8.0, this.speed * 0.72);
        this.runCycleTime += dt * runSpeedMultiplier;
        const swing = Math.sin(this.runCycleTime);

        // Forward sprint pitch & slight torso twist
        this.torsoMesh.rotation.x = 0.12;
        this.torsoMesh.rotation.y = -swing * 0.08;

        // Alternating powerful arm drive with bent driving elbows
        this.leftArm.rotation.x = -swing * 0.95 + 0.35;
        this.rightArm.rotation.x = swing * 0.95 + 0.35;
        this.leftArm.rotation.z = -0.08;
        this.rightArm.rotation.z = 0.08;

        // Vigorous leg drive with knee lift
        this.leftLeg.rotation.x = swing * 0.85;
        this.rightLeg.rotation.x = -swing * 0.85;

        // Dynamic ponytail bounce
        this.ponytailMesh.rotation.x = -0.35 + Math.abs(swing) * 0.28;

        // Sprint vertical head/torso bob
        this.torsoMesh.position.y = 1.05 + Math.abs(swing) * 0.08;
      }
    }
  }

  public getBoundingBox(): BoundingBox3D {
    const currentHeight = this.isSliding ? PLAYER_HEIGHT_SLIDE : PLAYER_HEIGHT_STAND;
    const halfWidth = PLAYER_WIDTH * 0.45;
    const halfDepth = PLAYER_DEPTH * 0.45;
    const worldY = this.currentGroundY + this.y;

    return {
      minX: this.x - halfWidth,
      maxX: this.x + halfWidth,
      minY: worldY,
      maxY: worldY + currentHeight,
      minZ: this.z - halfDepth,
      maxZ: this.z + halfDepth,
    };
  }
}
