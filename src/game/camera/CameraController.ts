import * as THREE from 'three';
import {
  CAMERA_OFFSET_Y,
  CAMERA_OFFSET_Z,
  CAMERA_LOOK_AHEAD_Y,
  CAMERA_LOOK_AHEAD_Z,
} from '../constants';
import { Player } from '../player/Player';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  private currentLookAt: THREE.Vector3 = new THREE.Vector3();
  private shakeIntensity: number = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(68, aspect, 0.1, 450);
    this.reset();
  }

  public reset() {
    this.camera.position.set(0, CAMERA_OFFSET_Y, CAMERA_OFFSET_Z);
    this.currentLookAt.set(0, CAMERA_LOOK_AHEAD_Y, CAMERA_LOOK_AHEAD_Z);
    this.camera.lookAt(this.currentLookAt);
    this.shakeIntensity = 0;
  }

  public triggerImpactShake(intensity: number = 0.6) {
    this.shakeIntensity = intensity;
  }

  public setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  public update(player: Player, dt: number) {
    // 1. Damped camera positioning behind and slightly above the runner
    const targetCamX = player.x * 0.85;
    const targetCamY = player.currentGroundY + player.y * 0.2 + CAMERA_OFFSET_Y;
    const targetCamZ = player.z + CAMERA_OFFSET_Z;

    // Smooth lateral damping
    const lerpSpeed = 12.0;
    this.camera.position.x += (targetCamX - this.camera.position.x) * (1 - Math.exp(-lerpSpeed * dt));
    this.camera.position.y += (targetCamY - this.camera.position.y) * (1 - Math.exp(-lerpSpeed * dt));
    this.camera.position.z = targetCamZ;

    // 2. Camera shake decay on impact
    if (this.shakeIntensity > 0.001) {
      const offsetX = (Math.random() * 2 - 1) * this.shakeIntensity;
      const offsetY = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.camera.position.x += offsetX;
      this.camera.position.y += offsetY;
      this.shakeIntensity *= Math.exp(-8.0 * dt);
    } else {
      this.shakeIntensity = 0;
    }

    // 3. Look target ahead of player into the scene (+Z)
    const targetLookX = player.x * 0.6;
    const targetLookY = player.currentGroundY + player.y * 0.2 + CAMERA_LOOK_AHEAD_Y;
    const targetLookZ = player.z + CAMERA_LOOK_AHEAD_Z;

    this.currentLookAt.x += (targetLookX - this.currentLookAt.x) * (1 - Math.exp(-12.0 * dt));
    this.currentLookAt.y += (targetLookY - this.currentLookAt.y) * (1 - Math.exp(-12.0 * dt));
    this.currentLookAt.z = targetLookZ;

    // Enforce upright orientation and aim forward into scene
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.currentLookAt);

    // Subtle dynamic FOV expansion on higher speeds
    const targetFov = 68 + Math.min(8, (player.speed - 18) * 0.4);
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-6.0 * dt));
      this.camera.updateProjectionMatrix();
    }
  }
}
