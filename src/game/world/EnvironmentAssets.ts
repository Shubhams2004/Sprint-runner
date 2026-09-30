import * as THREE from 'three';
import { textureGen } from './textures';
import { COLORS } from '../constants';

export class EnvironmentAssets {
  private static instance: EnvironmentAssets | null = null;

  public stonePathMaterial: THREE.MeshStandardMaterial;
  public stoneWallMaterial: THREE.MeshStandardMaterial;
  public pillarMaterial: THREE.MeshStandardMaterial;
  public woodBridgeMaterial: THREE.MeshStandardMaterial;
  public waterMaterial: THREE.MeshStandardMaterial;
  public foliageMaterial: THREE.MeshStandardMaterial;
  public rockMaterial: THREE.MeshStandardMaterial;
  public rootMaterial: THREE.MeshStandardMaterial;
  public goldMaterial: THREE.MeshStandardMaterial;
  public curbMaterial: THREE.MeshStandardMaterial;
  public laneInlayMaterial: THREE.MeshStandardMaterial;
  public hurdleDecalMaterial: THREE.MeshBasicMaterial;
  public obstacleAccentMaterial: THREE.MeshStandardMaterial;
  public pillarEyeMaterial: THREE.MeshStandardMaterial;

  // Shared geometries
  public pillarBaseGeo: THREE.BoxGeometry;
  public pillarShaftGeo: THREE.CylinderGeometry;
  public pillarCapitalGeo: THREE.BoxGeometry;
  public rockGeo: THREE.DodecahedronGeometry;
  public vineGeo: THREE.CylinderGeometry;
  public coinGeo: THREE.CylinderGeometry;

  private constructor() {
    // Generate and link procedural textures
    const stonePathTex = textureGen.getStonePathTexture();
    stonePathTex.repeat.set(1, 4);

    const stoneWallTex = textureGen.getStoneWallTexture();
    stoneWallTex.repeat.set(2, 1);

    const pillarTex = textureGen.getPillarTexture();
    pillarTex.repeat.set(1, 1);

    const woodBridgeTex = textureGen.getWoodBridgeTexture();
    woodBridgeTex.repeat.set(1, 6);

    const waterTex = textureGen.getWaterTexture();
    waterTex.repeat.set(2, 4);

    const foliageTex = textureGen.getFoliageTexture();

    this.stonePathMaterial = new THREE.MeshStandardMaterial({
      map: stonePathTex,
      roughness: 0.85,
      metalness: 0.12,
      color: 0xded8ce,
    });

    this.curbMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.trackBorder || 0x292524,
      roughness: 0.9,
      metalness: 0.05,
    });

    // High-visibility ancient gold runic lane inlay
    this.laneInlayMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.laneDivider || 0xd97706,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0x92400e,
      emissiveIntensity: 0.35,
    });

    // Warning decal directly on the road under/before obstacles for depth perception
    this.hurdleDecalMaterial = new THREE.MeshBasicMaterial({
      color: 0x050505,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    // High-contrast warning accents on obstacles
    this.obstacleAccentMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.hurdleGlow || 0xf59e0b,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
    });

    // Radiant crimson guardian eye
    this.pillarEyeMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.pillarEye || 0xef4444,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0xdc2626,
      emissiveIntensity: 0.9,
    });

    this.stoneWallMaterial = new THREE.MeshStandardMaterial({
      map: stoneWallTex,
      roughness: 0.8,
      metalness: 0.15,
      color: 0xd6cebe,
    });

    this.pillarMaterial = new THREE.MeshStandardMaterial({
      map: pillarTex,
      roughness: 0.75,
      metalness: 0.15,
      color: 0xe0d8cb,
    });

    this.woodBridgeMaterial = new THREE.MeshStandardMaterial({
      map: woodBridgeTex,
      roughness: 0.7,
      metalness: 0.1,
      color: 0xb59b80,
    });

    this.waterMaterial = new THREE.MeshStandardMaterial({
      map: waterTex,
      color: 0x38b2ac,
      roughness: 0.15,
      metalness: 0.6,
      transparent: true,
      opacity: 0.88,
    });

    this.foliageMaterial = new THREE.MeshStandardMaterial({
      map: foliageTex,
      color: 0x3d702d,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.3,
    });

    this.rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x474943,
      roughness: 0.9,
      metalness: 0.05,
    });

    this.rootMaterial = new THREE.MeshStandardMaterial({
      color: 0x38281d,
      roughness: 0.85,
      metalness: 0.05,
    });

    this.goldMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.goldIdol || 0xfacc15,
      roughness: 0.18,
      metalness: 0.85,
      emissive: 0x713f12,
      emissiveIntensity: 0.45,
    });

    // Geometries
    this.pillarBaseGeo = new THREE.BoxGeometry(1.2, 0.5, 1.2);
    this.pillarShaftGeo = new THREE.CylinderGeometry(0.42, 0.46, 3.8, 10);
    this.pillarCapitalGeo = new THREE.BoxGeometry(1.1, 0.4, 1.1);
    this.rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
    this.vineGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.0, 5);
    this.coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12);
    this.coinGeo.rotateX(Math.PI / 2); // Face forward
  }

  public static get(): EnvironmentAssets {
    if (!EnvironmentAssets.instance) {
      EnvironmentAssets.instance = new EnvironmentAssets();
    }
    return EnvironmentAssets.instance;
  }

  /**
   * Builds an ancient temple column (either intact or crumbling/broken).
   */
  public createPillar(isBroken = false): THREE.Group {
    const group = new THREE.Group();

    // Base pedestal
    const base = new THREE.Mesh(this.pillarBaseGeo, this.pillarMaterial);
    base.position.y = 0.25;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    if (isBroken) {
      // Shorter, cracked stump
      const brokenShaftGeo = new THREE.CylinderGeometry(0.44, 0.46, 2.0, 8);
      const shaft = new THREE.Mesh(brokenShaftGeo, this.pillarMaterial);
      shaft.position.y = 1.5;
      shaft.rotation.z = 0.08;
      shaft.castShadow = true;
      group.add(shaft);

      // Fallen rock/capital chunk nearby (oriented along Z to never extend laterally toward track)
      const fallen = new THREE.Mesh(this.pillarCapitalGeo, this.pillarMaterial);
      fallen.position.set(0, 0.2, 0.6);
      fallen.rotation.set(0.4, 0.2, 0.8);
      group.add(fallen);
    } else {
      // Full column
      const shaft = new THREE.Mesh(this.pillarShaftGeo, this.pillarMaterial);
      shaft.position.y = 2.4;
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      group.add(shaft);

      // Carved capital
      const capital = new THREE.Mesh(this.pillarCapitalGeo, this.pillarMaterial);
      capital.position.y = 4.4;
      capital.castShadow = true;
      group.add(capital);
    }

    return group;
  }

  /**
   * Builds an Angkor Wat style conical temple stupa tower for majestic landmarks.
   */
  public createTempleStupa(tall = true): THREE.Group {
    const group = new THREE.Group();
    const heightScale = tall ? 1.0 : 0.7;

    // Multi-tiered stepped pyramid base
    const tiers = 4;
    for (let t = 0; t < tiers; t++) {
      const size = (4.5 - t * 0.8) * heightScale;
      const h = 1.4 * heightScale;
      const tierGeo = new THREE.BoxGeometry(size, h, size);
      const tierMesh = new THREE.Mesh(tierGeo, this.stoneWallMaterial);
      tierMesh.position.y = t * h + h / 2;
      tierMesh.castShadow = true;
      tierMesh.receiveShadow = true;
      group.add(tierMesh);
    }

    // Conical carved lotus spire
    const spireH = 4.5 * heightScale;
    const spireGeo = new THREE.ConeGeometry(1.6 * heightScale, spireH, 8);
    const spire = new THREE.Mesh(spireGeo, this.pillarMaterial);
    spire.position.y = tiers * (1.4 * heightScale) + spireH / 2;
    spire.castShadow = true;
    group.add(spire);

    return group;
  }

  /**
   * Builds tropical jungle tree with thick buttress roots and broadleaf canopy.
   */
  public createTropicalTree(height = 10): THREE.Group {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.6, 1.1, height, 7);
    const trunk = new THREE.Mesh(trunkGeo, this.rootMaterial);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // Buttress roots
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const rootGeo = new THREE.BoxGeometry(0.3, 1.8, 1.8);
      const root = new THREE.Mesh(rootGeo, this.rootMaterial);
      root.position.set(Math.cos(angle) * 0.9, 0.8, Math.sin(angle) * 0.9);
      root.rotation.y = angle;
      group.add(root);
    }

    // Lush canopy spheres
    const canopyGeo = new THREE.DodecahedronGeometry(3.2, 1);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x22481e,
      roughness: 0.8,
      metalness: 0.05,
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = height - 0.5;
    canopy.scale.set(1.4, 0.9, 1.4);
    canopy.castShadow = true;
    group.add(canopy);

    // Secondary sub-canopy clump
    const subCanopy = new THREE.Mesh(canopyGeo, canopyMat);
    subCanopy.position.set(1.5, height - 2.5, 0.8);
    subCanopy.scale.set(0.9, 0.7, 0.9);
    group.add(subCanopy);

    return group;
  }

  /**
   * Builds dangling liana / vine cluster.
   */
  public createHangingVines(): THREE.Group {
    const group = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const vine = new THREE.Mesh(this.vineGeo, this.rootMaterial);
      vine.position.set((Math.random() - 0.5) * 0.6, -2.0, (Math.random() - 0.5) * 0.6);
      vine.rotation.z = (Math.random() - 0.5) * 0.15;
      group.add(vine);
    }
    return group;
  }

  /**
   * Builds weathered mossy boulder.
   */
  public createMossyRock(scale = 1.0): THREE.Mesh {
    const rock = new THREE.Mesh(this.rockGeo, this.rockMaterial);
    rock.scale.set(scale * (0.8 + Math.random() * 0.4), scale * (0.7 + Math.random() * 0.3), scale * (0.8 + Math.random() * 0.4));
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;
    return rock;
  }

  /**
   * Builds a cluster of tropical fern fronds.
   */
  public createFernBush(): THREE.Group {
    const group = new THREE.Group();
    const fronds = 6;
    for (let i = 0; i < fronds; i++) {
      const frondGeo = new THREE.PlaneGeometry(1.2, 1.8);
      const frond = new THREE.Mesh(frondGeo, this.foliageMaterial);
      const angle = (i / fronds) * Math.PI * 2;
      frond.position.set(Math.cos(angle) * 0.3, 0.6, Math.sin(angle) * 0.3);
      frond.rotation.y = angle;
      frond.rotation.x = 0.4;
      group.add(frond);
    }
    return group;
  }

  /**
   * Builds an ancient carved temple guardian idol / deity statue matching the video reference.
   */
  public createGuardianStatue(): THREE.Group {
    const group = new THREE.Group();

    // Stepped pedestal base
    const baseGeo = new THREE.BoxGeometry(1.4, 0.7, 1.4);
    const base = new THREE.Mesh(baseGeo, this.stoneWallMaterial);
    base.position.y = 0.35;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Carved torso
    const torsoGeo = new THREE.BoxGeometry(0.85, 1.3, 0.6);
    const torso = new THREE.Mesh(torsoGeo, this.pillarMaterial);
    torso.position.y = 1.35;
    torso.castShadow = true;
    group.add(torso);

    // Deity crowned head
    const headGeo = new THREE.BoxGeometry(0.55, 0.65, 0.55);
    const head = new THREE.Mesh(headGeo, this.pillarMaterial);
    head.position.y = 2.25;
    head.castShadow = true;
    group.add(head);

    // Stepped tiered crown
    const crownGeo = new THREE.ConeGeometry(0.4, 0.8, 6);
    const crown = new THREE.Mesh(crownGeo, this.pillarMaterial);
    crown.position.y = 2.85;
    crown.castShadow = true;
    group.add(crown);

    return group;
  }

  /**
   * Builds soft golden sunbeam shafts filtering down through the jungle canopy.
   */
  public createSunbeamCluster(): THREE.Group {
    const group = new THREE.Group();
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffedd5,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const beamGeo = new THREE.CylinderGeometry(0.3, 2.5, 16, 6, 1, true);
    for (let i = 0; i < 2; i++) {
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set((i === 0 ? -1.8 : 1.8), 8, (i === 0 ? 2 : -2));
      beam.rotation.z = (i === 0 ? 0.18 : -0.15);
      beam.rotation.x = 0.12;
      group.add(beam);
    }
    return group;
  }
}
