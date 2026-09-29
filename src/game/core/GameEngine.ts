import { GameState, GameStats, GameCallbacks } from '../types';
import { INITIAL_SPEED, MAX_SPEED, SPEED_ACCELERATION } from '../constants';
import { GameRenderer } from '../rendering/GameRenderer';
import { CameraController } from '../camera/CameraController';
import { Player } from '../player/Player';
import { TrackManager } from '../world/TrackManager';
import { CollisionSystem } from '../collision/CollisionSystem';
import { InputManager, GameInputAction } from '../input/InputManager';
import { soundEffects } from '../audio/SoundEffects';

export class GameEngine {
  public state: GameState = 'START';
  public stats: GameStats = {
    score: 0,
    highScore: 0,
    distance: 0,
    coins: 0,
    speed: 0,
  };

  private renderer: GameRenderer | null = null;
  private cameraController: CameraController | null = null;
  private player: Player | null = null;
  private trackManager: TrackManager | null = null;
  private collisionSystem: CollisionSystem = new CollisionSystem();
  private inputManager: InputManager = new InputManager();

  private callbacks: GameCallbacks | null = null;

  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private isDestroyed = false;

  constructor() {
    this.loadHighScore();
  }

  public init(canvas: HTMLCanvasElement, container: HTMLElement, callbacks: GameCallbacks) {
    this.callbacks = callbacks;

    // 1. Initialize 3D renderer
    this.renderer = new GameRenderer(canvas);

    // 2. Initialize camera
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.cameraController = new CameraController(aspect);

    // 3. Initialize player
    this.player = new Player();
    this.renderer.scene.add(this.player.mesh);

    // 4. Initialize track manager
    this.trackManager = new TrackManager(this.renderer.scene);

    // 5. Initialize input system
    this.inputManager.attach(container);
    this.inputManager.onAction(this.handleInputAction.bind(this));

    // Handle container resize
    this.handleResize(container.clientWidth, container.clientHeight);

    // Set initial state
    this.setState('START');
    this.updateStats();

    // Start render/physics loop
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  public handleResize(width: number, height: number) {
    if (!this.renderer || !this.cameraController || height <= 0 || width <= 0) return;
    this.renderer.setSize(width, height);
    this.cameraController.setAspect(width / height);
  }

  public startRun() {
    if (!this.player || !this.trackManager || !this.cameraController) return;

    if (this.state === 'GAME_OVER' || this.state === 'START') {
      this.resetRun();
    }

    this.player.speed = INITIAL_SPEED;
    soundEffects.playStart();
    this.setState('RUNNING');
  }

  public restart() {
    this.resetRun();
    this.startRun();
  }

  public togglePause() {
    if (this.state === 'RUNNING') {
      this.setState('PAUSED');
    } else if (this.state === 'PAUSED') {
      this.setState('RUNNING');
      this.lastTime = performance.now();
    }
  }

  public handleInputAction(action: GameInputAction) {
    if (this.state === 'START') {
      if (action === 'ACTION' || action === 'JUMP') {
        this.startRun();
      }
      return;
    }

    if (this.state === 'GAME_OVER') {
      if (action === 'ACTION' || action === 'JUMP') {
        this.restart();
      }
      return;
    }

    if (this.state === 'PAUSED') {
      if (action === 'PAUSE' || action === 'ACTION') {
        this.togglePause();
      }
      return;
    }

    if (this.state === 'RUNNING' && this.player) {
      switch (action) {
        case 'LEFT':
          this.player.changeLane(-1);
          break;
        case 'RIGHT':
          this.player.changeLane(1);
          break;
        case 'JUMP':
          this.player.jump();
          break;
        case 'SLIDE':
          this.player.slide();
          break;
        case 'PAUSE':
          this.togglePause();
          break;
      }
    }
  }

  public triggerAction(action: GameInputAction) {
    this.handleInputAction(action);
  }

  private resetRun() {
    if (!this.player || !this.trackManager || !this.cameraController) return;

    this.player.reset();
    this.trackManager.reset();
    this.cameraController.reset();

    this.stats.distance = 0;
    this.stats.coins = 0;
    this.stats.score = 0;
    this.stats.speed = INITIAL_SPEED;
    this.updateStats();
  }

  private loop(currentTime: number) {
    if (this.isDestroyed) return;

    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp dt to prevent tunneling / spiraling when browser tab is backgrounded
    const dt = Math.min(rawDt, 0.1);

    if (this.renderer && this.cameraController && this.player && this.trackManager) {
      if (this.state === 'RUNNING') {
        // Accelerate forward speed progressively with distance
        const distanceKm = this.player.z / 100;
        this.player.speed = Math.min(MAX_SPEED, INITIAL_SPEED + distanceKm * SPEED_ACCELERATION);

        // Update player
        this.player.update(dt);

        // Update procedural track
        this.trackManager.update(this.player.z, dt);

        // Collision check
        const col = this.collisionSystem.checkCollisions(this.player, this.trackManager.activeObstacles);

        if (col.collectedCoin) {
          this.stats.coins++;
          soundEffects.playCoin();
          if (this.callbacks) {
            this.callbacks.onCoinCollect(this.stats.coins);
          }
        }

        if (col.hasLethalCollision) {
          this.player.crash();
          this.cameraController.triggerImpactShake(0.85);

          // Update final stats & highscore
          this.stats.distance = Math.floor(this.player.z);
          this.stats.score = this.calculateScore();
          if (this.stats.score > this.stats.highScore) {
            this.stats.highScore = this.stats.score;
            this.saveHighScore(this.stats.highScore);
          }

          this.setState('GAME_OVER');
          if (this.callbacks) {
            this.callbacks.onCrash();
          }
        }

        // Live stats update
        this.stats.distance = Math.floor(this.player.z);
        this.stats.speed = Math.round(this.player.speed * 3.6); // km/h representation
        this.stats.score = this.calculateScore();
        this.updateStats();

        // Update camera and lights
        this.cameraController.update(this.player, dt);
        this.renderer.updateLightPosition(this.player.z, this.player.x);
      } else if (this.state === 'GAME_OVER') {
        // Continue camera shake decay and player tumble
        this.player.update(dt);
        this.cameraController.update(this.player, dt);
        this.renderer.updateLightPosition(this.player.z, this.player.x);
      } else if (this.state === 'START') {
        // Idle animation at start
        this.player.update(0);
        this.cameraController.update(this.player, dt);
        this.renderer.updateLightPosition(this.player.z, this.player.x);
      }

      // Render 3D scene
      this.renderer.render(this.cameraController.camera);
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  }

  private calculateScore(): number {
    if (!this.player) return 0;
    return Math.floor(this.player.z * 1.5) + this.stats.coins * 100;
  }

  private setState(newState: GameState) {
    this.state = newState;
    if (this.callbacks) {
      this.callbacks.onStateChange(newState);
    }
  }

  private updateStats() {
    if (this.callbacks) {
      this.callbacks.onStatsUpdate({ ...this.stats });
    }
  }

  private loadHighScore() {
    try {
      const saved = localStorage.getItem('sprint_runner_highscore');
      if (saved) {
        this.stats.highScore = parseInt(saved, 10) || 0;
      }
    } catch {
      // LocalStorage access safe fallback
    }
  }

  private saveHighScore(score: number) {
    try {
      localStorage.setItem('sprint_runner_highscore', String(score));
    } catch {
      // Ignore
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.inputManager.detach();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
