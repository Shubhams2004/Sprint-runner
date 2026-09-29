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

export class Player {
  public mesh: THREE.Group;
  public lane: LaneIndex = 0;
  public targetLane: LaneIndex = 0;

  public x = 0;
  public y = 0;
  public z = 0;
  public vy = 0;

  public isGrounded = true;
  public isJumping = false;
  public isSliding = false;
  public slideTimer = 0;
  public isDead = false;

  public speed = 0;

  // Visual sub-meshes for procedural run animation
  private torsoMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private energyCore: THREE.Mesh;
  private shadowMesh: THREE.Mesh;

  private runCycleTime = 0;

  constructor() {
    this.mesh = new THREE.Group();

    // Standard materials with physical properties
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.playerBody,
      roughness: 0.35,
      metalness: 0.3,
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.1,
    });

    const visorMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.playerVisor,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.4,
    });

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.playerCore,
      emissive: COLORS.playerCore,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.85, 0.45);
    this.torsoMesh = new THREE.Mesh(torsoGeo, bodyMaterial);
    this.torsoMesh.position.y = 1.05;
    this.torsoMesh.castShadow = true;
    this.mesh.add(this.torsoMesh);

    // Glowing core on back / chest
    const coreGeo = new THREE.BoxGeometry(0.3, 0.4, 0.15);
    this.energyCore = new THREE.Mesh(coreGeo, coreMaterial);
    this.energyCore.position.set(0, 1.05, -0.22);
    this.mesh.add(this.energyCore);

    // Head
    const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    this.headMesh = new THREE.Mesh(headGeo, bodyMaterial);
    this.headMesh.position.y = 1.62;
    this.headMesh.castShadow = true;
    this.mesh.add(this.headMesh);

    // Visor looking forward (+Z)
    const visorGeo = new THREE.BoxGeometry(0.36, 0.16, 0.12);
    const visorMesh = new THREE.Mesh(visorGeo, visorMaterial);
    visorMesh.position.set(0, 1.64, 0.2);
    this.mesh.add(visorMesh);

    // Limbs
    const legGeo = new THREE.BoxGeometry(0.2, 0.65, 0.24);
    this.leftLeg = new THREE.Mesh(legGeo, darkMaterial);
    this.leftLeg.position.set(-0.2, 0.35, 0);
    this.leftLeg.castShadow = true;
    this.mesh.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, darkMaterial);
    this.rightLeg.position.set(0.2, 0.35, 0);
    this.rightLeg.castShadow = true;
    this.mesh.add(this.rightLeg);

    const armGeo = new THREE.BoxGeometry(0.16, 0.65, 0.18);
    this.leftArm = new THREE.Mesh(armGeo, darkMaterial);
    this.leftArm.position.set(-0.46, 1.0, 0);
    this.leftArm.castShadow = true;
    this.mesh.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, darkMaterial);
    this.rightArm.position.set(0.46, 1.0, 0);
    this.rightArm.castShadow = true;
    this.mesh.add(this.rightArm);

    // Projected ground shadow decal
    const shadowGeo = new THREE.PlaneGeometry(0.9, 1.3);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.02;
    this.mesh.add(this.shadowMesh);

    this.reset();
  }

  public reset() {
    this.lane = 0;
    this.targetLane = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vy = 0;
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

  public moveLeft() {
    if (this.isDead) return;
    if (this.targetLane > -1) {
      this.targetLane = (this.targetLane - 1) as LaneIndex;
      soundEffects.playLaneSwitch();
    }
  }

  public moveRight() {
    if (this.isDead) return;
    if (this.targetLane < 1) {
      this.targetLane = (this.targetLane + 1) as LaneIndex;
      soundEffects.playLaneSwitch();
    }
  }

  public jump() {
    if (this.isDead) return;
    // Can jump from ground or cancel slide into jump
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
      // Mid-air dive to quickly return to ground and slide
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
      // Tumble backwards on crash
      this.mesh.position.y = Math.max(0, this.mesh.position.y - dt * 2);
      this.mesh.rotation.x = Math.min(Math.PI / 2, this.mesh.rotation.x + dt * 5);
      return;
    }

    // Forward translation
    this.z += this.speed * dt;

    // Smooth lane interpolation with dampening
    const targetX = this.targetLane * LANE_WIDTH;
    const laneLerpSpeed = 16.0;
    this.x += (targetX - this.x) * (1 - Math.exp(-laneLerpSpeed * dt));

    // Current lane calculation for logic
    if (Math.abs(this.x - targetX) < 0.3) {
      this.lane = this.targetLane;
    }

    // Banking roll effect during lane shift
    const lateralDelta = targetX - this.x;
    const targetRoll = -lateralDelta * 0.18;
    this.mesh.rotation.z += (targetRoll - this.mesh.rotation.z) * (1 - Math.exp(-12.0 * dt));

    // Vertical physics (Jumping and Gravity)
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

    // Animation pose update
    this.updateAnimationPose(dt);

    // Synchronize 3D mesh position
    this.mesh.position.set(this.x, this.y, this.z);

    // Ground shadow scale/alpha attenuation with jump height
    const shadowScale = Math.max(0.3, 1 - this.y / 4.0);
    this.shadowMesh.scale.set(shadowScale, shadowScale, 1);
    this.shadowMesh.position.y = 0.02 - this.y; // Keep shadow pinned to ground level
  }

  private updateAnimationPose(dt: number) {
    if (this.isSliding) {
      // Compressed slide pose
      this.mesh.scale.set(1.15, 0.45, 1.25);
      this.torsoMesh.rotation.x = 0.6;
      this.leftLeg.rotation.x = -1.2;
      this.rightLeg.rotation.x = -1.2;
      this.leftArm.rotation.x = -1.4;
      this.rightArm.rotation.x = -1.4;
    } else {
      // Normal standing/jumping scale
      this.mesh.scale.set(1, 1, 1);
      this.torsoMesh.rotation.x = 0;

      if (!this.isGrounded) {
        // Jump pose: legs tucked, arms spread
        this.leftLeg.rotation.x = 0.6;
        this.rightLeg.rotation.x = -0.4;
        this.leftArm.rotation.x = -0.8;
        this.rightArm.rotation.x = -0.8;
      } else {
        // Running gait swing
        const runSpeedMultiplier = Math.max(8.0, this.speed * 0.7);
        this.runCycleTime += dt * runSpeedMultiplier;
        const swing = Math.sin(this.runCycleTime);

        this.leftLeg.rotation.x = swing * 0.75;
        this.rightLeg.rotation.x = -swing * 0.75;
        this.leftArm.rotation.x = -swing * 0.75;
        this.rightArm.rotation.x = swing * 0.75;
        this.torsoMesh.position.y = 1.05 + Math.abs(swing) * 0.06;
      }
    }
  }

  /**
   * Returns Axis-Aligned Bounding Box (AABB) in world space for collision testing
   */
  public getBoundingBox(): BoundingBox3D {
    const currentHeight = this.isSliding ? PLAYER_HEIGHT_SLIDE : PLAYER_HEIGHT_STAND;
    const halfWidth = PLAYER_WIDTH * 0.45; // Slightly forgiving hitbox for great game feel
    const halfDepth = PLAYER_DEPTH * 0.45;

    return {
      minX: this.x - halfWidth,
      maxX: this.x + halfWidth,
      minY: this.y,
      maxY: this.y + currentHeight,
      minZ: this.z - halfDepth,
      maxZ: this.z + halfDepth,
    };
  }
}
