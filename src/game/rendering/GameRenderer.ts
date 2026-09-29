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
    this.scene.fog = new THREE.FogExp2(COLORS.fog, 0.012);

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
    this.renderer.toneMappingExposure = 1.05;

    // WebGL context restoration hooks
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.isContextLost = true;
    });

    canvas.addEventListener('webglcontextrestored', () => {
      this.isContextLost = false;
    });

    // 1. Ambient Fill Light (soft cool ambient)
    this.ambientLight = new THREE.AmbientLight(0xcfd8dc, 1.2);
    this.scene.add(this.ambientLight);

    // 2. Key Directional Light (angled from top-left, casting forward shadows)
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    this.dirLight.position.set(10, 20, 10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 60;
    this.dirLight.shadow.camera.left = -10;
    this.dirLight.shadow.camera.right = 10;
    this.dirLight.shadow.camera.top = 15;
    this.dirLight.shadow.camera.bottom = -10;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // 3. Rim / Cyber Highlight Light (sharp electric cyan highlight from ahead)
    this.rimLight = new THREE.DirectionalLight(0x06b6d4, 1.1);
    this.rimLight.position.set(-8, 12, 25);
    this.scene.add(this.rimLight);
  }

  public setSize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
  }

  public updateLightPosition(playerZ: number) {
    // Keep key light moving synchronously with the runner
    this.dirLight.position.z = playerZ + 8;
    this.dirLight.target.position.set(0, 0, playerZ + 5);
    this.dirLight.target.updateMatrixWorld();

    this.rimLight.position.z = playerZ + 25;
    this.rimLight.target.position.set(0, 0, playerZ);
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
