import * as THREE from 'three';

/**
 * Procedural texture generator.
 * Creates optimized, crisp canvas textures in memory.
 * Requires 0 network bandwidth, 0 external assets, 100% offline and GitHub Pages compatible.
 */
class TextureGenerator {
  private cache: Map<string, THREE.CanvasTexture> = new Map();

  public getStonePathTexture(): THREE.CanvasTexture {
    if (this.cache.has('stonePath')) return this.cache.get('stonePath')!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Earthy sandstone base
    ctx.fillStyle = '#4c463b';
    ctx.fillRect(0, 0, 512, 512);

    // Stone paver slabs layout (grid with offsets)
    const rows = 8;
    const cols = 4;
    const rowH = 512 / rows;
    const colW = 512 / cols;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2 === 0) ? 0 : colW / 2;
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + offsetX;
        const y = r * rowH;

        // Subtle color variation per slab
        const brightness = 0.85 + Math.random() * 0.3;
        const red = Math.floor(95 * brightness);
        const green = Math.floor(90 * brightness);
        const blue = Math.floor(75 * brightness);

        ctx.fillStyle = `rgb(${red},${green},${blue})`;
        ctx.fillRect(x + 3, y + 3, colW - 6, rowH - 6);

        // Weathered cracks and stone texture
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        for (let i = 0; i < 6; i++) {
          const rx = x + Math.random() * colW;
          const ry = y + Math.random() * rowH;
          ctx.fillRect(rx, ry, Math.random() * 18 + 4, Math.random() * 3 + 1);
        }

        // Green moss in corners and edges
        if (Math.random() < 0.65) {
          ctx.fillStyle = 'rgba(46, 85, 38, 0.7)';
          ctx.beginPath();
          ctx.arc(x + 5, y + 5, Math.random() * 12 + 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Three distinct lane guideline markers (worn center grooves and moss lines)
    ctx.strokeStyle = 'rgba(35, 65, 30, 0.85)';
    ctx.lineWidth = 6;
    // Lane divider 1
    ctx.beginPath();
    ctx.moveTo(170, 0);
    ctx.lineTo(170, 512);
    ctx.stroke();

    // Lane divider 2
    ctx.beginPath();
    ctx.moveTo(342, 0);
    ctx.lineTo(342, 512);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set('stonePath', texture);
    return texture;
  }

  public getStoneWallTexture(): THREE.CanvasTexture {
    if (this.cache.has('stoneWall')) return this.cache.get('stoneWall')!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Ancient temple sandstone block pattern
    ctx.fillStyle = '#5c5446';
    ctx.fillRect(0, 0, 512, 512);

    const rows = 12;
    const cols = 6;
    const rH = 512 / rows;
    const cW = 512 / cols;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2) * (cW / 2);
      for (let c = -1; c <= cols; c++) {
        const x = c * cW + offsetX;
        const y = r * rH;

        const shade = 100 + Math.floor(Math.random() * 35);
        ctx.fillStyle = `rgb(${shade + 10}, ${shade}, ${shade - 15})`;
        ctx.fillRect(x + 2, y + 2, cW - 4, rH - 4);

        // Ancient carved relief line / dentil
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x + 6, y + rH - 8, cW - 12, 3);
      }
    }

    // Overgrown creeping vine patches
    for (let i = 0; i < 15; i++) {
      const vx = Math.random() * 512;
      const vy = Math.random() * 512;
      ctx.fillStyle = 'rgba(40, 75, 32, 0.75)';
      ctx.beginPath();
      ctx.ellipse(vx, vy, 16, 28, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set('stoneWall', texture);
    return texture;
  }

  public getPillarTexture(): THREE.CanvasTexture {
    if (this.cache.has('pillar')) return this.cache.get('pillar')!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Ancient temple column sandstone
    ctx.fillStyle = '#655e50';
    ctx.fillRect(0, 0, 256, 512);

    // Vertical carved fluting
    const flutes = 8;
    const fw = 256 / flutes;
    for (let f = 0; f < flutes; f++) {
      const grad = ctx.createLinearGradient(f * fw, 0, (f + 1) * fw, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0.25)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
      grad.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = grad;
      ctx.fillRect(f * fw, 0, fw, 512);
    }

    // Winding green ivy / roots
    ctx.strokeStyle = '#2d5427';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.bezierCurveTo(90, 160, 20, 320, 80, 512);
    ctx.stroke();

    ctx.strokeStyle = '#4a3b2c'; // Woody root
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(210, 0);
    ctx.bezierCurveTo(140, 180, 230, 350, 170, 512);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set('pillar', texture);
    return texture;
  }

  public getWoodBridgeTexture(): THREE.CanvasTexture {
    if (this.cache.has('woodBridge')) return this.cache.get('woodBridge')!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Weathered timber planks
    ctx.fillStyle = '#3a2b1c';
    ctx.fillRect(0, 0, 256, 512);

    const plankCount = 10;
    const ph = 512 / plankCount;
    for (let i = 0; i < plankCount; i++) {
      const y = i * ph;
      const shade = 70 + Math.floor(Math.random() * 25);
      ctx.fillStyle = `rgb(${shade + 20}, ${shade + 8}, ${shade - 10})`;
      ctx.fillRect(2, y + 2, 252, ph - 4);

      // Wood grain lines
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(4, y + ph * 0.35, 248, 1);
      ctx.fillRect(4, y + ph * 0.7, 248, 1.5);

      // Iron bolts on plank ends
      ctx.fillStyle = '#1c1b18';
      ctx.beginPath();
      ctx.arc(14, y + ph / 2, 3, 0, Math.PI * 2);
      ctx.arc(242, y + ph / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set('woodBridge', texture);
    return texture;
  }

  public getWaterTexture(): THREE.CanvasTexture {
    if (this.cache.has('water')) return this.cache.get('water')!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Tropical jungle stream turquoise
    ctx.fillStyle = '#1e595e';
    ctx.fillRect(0, 0, 256, 256);

    // Water caustics & foam waves
    ctx.fillStyle = 'rgba(70, 160, 170, 0.35)';
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const w = Math.random() * 40 + 15;
      const h = Math.random() * 8 + 3;
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // White water ripples
    ctx.fillStyle = 'rgba(210, 245, 245, 0.4)';
    for (let i = 0; i < 15; i++) {
      ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 20 + 8, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set('water', texture);
    return texture;
  }

  public getFoliageTexture(): THREE.CanvasTexture {
    if (this.cache.has('foliage')) return this.cache.get('foliage')!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 256, 256);

    // Tropical palm / fern leaves
    ctx.fillStyle = '#2d5a27';
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      ctx.save();
      ctx.translate(128, 128);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(25, -60, 0, -110);
      ctx.quadraticCurveTo(-25, -60, 0, 0);
      ctx.fill();

      // Leaf rib
      ctx.strokeStyle = '#4e853f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -100);
      ctx.stroke();

      ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set('foliage', texture);
    return texture;
  }
}

export const textureGen = new TextureGenerator();
