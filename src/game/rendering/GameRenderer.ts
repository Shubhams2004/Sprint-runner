import * as THREE from 'three';
import { COLORS } from '../constants';

export class GameRenderer {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public dirLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public rimLight: THREE.DirectionalLight;

  private isContextLost = false;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.fog = new THREE.FogExp2(COLORS.fog, 0.009);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });

    // Mobile-first performance: cap pixel ratio at 2
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // WebGL context restoration hooks
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.isContextLost = true;
    });

    canvas.addEventListener('webglcontextrestored', () => {
      this.isContextLost = false;
    });

    // 1. Ambient Light (soft tropical jungle canopy fill)
    this.ambientLight = new THREE.AmbientLight(0xcde0cc, 1.4);
    this.scene.add(this.ambientLight);

    // 2. Key Directional Sunlight (warm golden sun filtering through canopy)
    this.dirLight = new THREE.DirectionalLight(0xfff7e6, 2.2);
    this.dirLight.position.set(15, 28, 12);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 1.0;
    this.dirLight.shadow.camera.far = 70;
    this.dirLight.shadow.camera.left = -14;
    this.dirLight.shadow.camera.right = 14;
    this.dirLight.shadow.camera.top = 18;
    this.dirLight.shadow.camera.bottom = -14;
    this.dirLight.shadow.bias = -0.0006;
    this.scene.add(this.dirLight);

    // 3. Rim / Sunbeam Highlight (golden rim light from ahead of runner)
    this.rimLight = new THREE.DirectionalLight(0xfef08a, 0.9);
    this.rimLight.position.set(-10, 16, 30);
    this.scene.add(this.rimLight);
  }

  public setSize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
  }

  public updateLightPosition(playerZ: number, playerX = 0) {
    // Keep key light moving synchronously with the runner
    this.dirLight.position.set(playerX + 15, 28, playerZ + 12);
    this.dirLight.target.position.set(playerX, 0, playerZ + 6);
    this.dirLight.target.updateMatrixWorld();

    this.rimLight.position.set(playerX - 10, 16, playerZ + 30);
    this.rimLight.target.position.set(playerX, 0, playerZ);
    this.rimLight.target.updateMatrixWorld();
  }

  public render(camera: THREE.Camera) {
    if (this.isContextLost) return;
    this.renderer.render(this.scene, camera);
  }

  public dispose() {
    this.renderer.dispose();
  }
}
