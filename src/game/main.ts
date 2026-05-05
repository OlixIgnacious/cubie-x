import { Player } from './player';
import { World } from './world';
import { Renderer } from './renderer';
import { Input } from './input';
import { ScoreManager } from './score';
import { BASE_SPEED, MAX_SPEED, SPEED_INCREMENT, ZONE_DISTANCE, CHECKPOINT_DISTANCE, GROUND_Y_OFFSET } from './constants';
import { audioManager } from '../utils/audio';

export class Game {
  private player: Player;
  private world: World;
  private renderer: Renderer;
  private input: Input;
  public score: ScoreManager;
  
  private canvas: HTMLCanvasElement;
  private scrollX: number;
  private speed: number;
  private lastTime: number = 0;
  private nextCheckpoint: number = CHECKPOINT_DISTANCE;
  private nextZone: number = ZONE_DISTANCE;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.renderer = new Renderer(ctx, canvas.width, canvas.height);
    this.player = new Player(100, canvas.height - GROUND_Y_OFFSET - 80);
    this.world = new World(canvas.width, canvas.height);
    this.input = new Input();
    this.score = new ScoreManager();

    this.scrollX = 0;
    this.speed = BASE_SPEED;

    this.setupInput();
  }

  private setupInput() {
    this.input.onJump = () => {
        if (this.score.state.isGameOver) {
            this.reset();
        } else {
            this.player.jump();
        }
    };
    this.input.onSlideStart = () => this.player.slide(true);
    this.input.onSlideEnd = () => this.player.slide(false);
    this.input.onRestart = () => this.reset();
    
    // Expose for external UI
    this.score.onRestart = () => this.reset();
  }

  public resize(width: number, height: number) {
      this.renderer.resize(width, height);
      this.world.canvasWidth = width;
      this.world.canvasHeight = height;
  }

  public start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  public setUsername(name: string) {
    this.score.username = name;
  }

  private loop = (time: number) => {
    const dt = Math.min(32, time - this.lastTime); // Cap dt to avoid huge jumps
    this.lastTime = time;

    if (!this.score.state.isPaused) {
        this.update(dt);
    }
    this.render();

    requestAnimationFrame(this.loop);
  }

  private update(dt: number) {
    if (this.score.state.isGameOver) return;

    // Progression
    this.scrollX += this.speed;
    this.score.addDistance(this.speed / 10);
    
    // Checkpoints & Zones
    if (this.scrollX > this.nextCheckpoint) {
        this.score.checkpoint();
        this.nextCheckpoint += CHECKPOINT_DISTANCE;
    }
    if (this.scrollX > this.nextZone) {
        this.score.state.zone++;
        this.nextZone += ZONE_DISTANCE;
        this.speed = Math.min(MAX_SPEED, this.speed + SPEED_INCREMENT);
    }

    // World & Player Update
    this.world.update(this.scrollX, this.score.state.zone);
    this.player.update();
    this.player.pos.x = this.scrollX + 100 + this.player.vel.x; // Keep player near left side

    this.checkCollisions();
  }

  private checkCollisions() {
    let onPlatform = false;
    let wallCollision = false;

    // Check world obstacles
    this.world.obstacles.forEach(o => {
      if (!o.active) return;

      // Simple AABB collision
      const isColliding = (
        this.player.pos.x < o.pos.x + o.size.x &&
        this.player.pos.x + this.player.size.x > o.pos.x &&
        this.player.pos.y < o.pos.y + o.size.y &&
        this.player.pos.y + this.player.size.y > o.pos.y
      );

      if (isColliding) {
        if (o.type === 'platform' || o.type === 'moving_h' || o.type === 'moving_v') {
          // Landing on top?
          const prevBottom = this.player.pos.y + this.player.size.y - this.player.vel.y;
          if (prevBottom <= o.pos.y + 10) {
            if (!this.player.isGrounded) {
                audioManager.playLand();
            }
            this.player.pos.y = o.pos.y - this.player.size.y;
            this.player.vel.y = 0;
            this.player.isGrounded = true;
            onPlatform = true;
          } else {
            // Side collision (Wall)
            if (this.player.pos.x + this.player.size.x < o.pos.x + 20) {
              this.player.wallSide = 'left';
              wallCollision = true;
            } else if (this.player.pos.x > o.pos.x + o.size.x - 20) {
              this.player.wallSide = 'right';
              wallCollision = true;
            } else {
               // Crushed or hit wall head on
               if (!o.isSecret) this.die();
            }
          }
        } else if (o.type === 'barrier_low' || o.type === 'barrier_high' || o.type === 'enemy') {
            // Enemy stomp check
            const prevBottom = this.player.pos.y + this.player.size.y - this.player.vel.y;
            if (o.type === 'enemy' && prevBottom <= o.pos.y && this.player.vel.y > 0) {
                this.score.enemyStomp();
                o.active = false;
                this.player.vel.y = -8; // Bounce
                this.renderer.flashEffect();
                audioManager.playStomp();
            } else {
                this.die();
            }
        }
      }
    });

    // Check collectibles
    this.world.collectibles.forEach(c => {
        if (!c.collected && 
            this.player.pos.x < c.pos.x + c.size.x &&
            this.player.pos.x + this.player.size.x > c.pos.x &&
            this.player.pos.y < c.pos.y + c.size.y &&
            this.player.pos.y + this.player.size.y > c.pos.y) {
            
            c.collected = true;
            this.score.collect(c.isSecret);
            if (c.isSecret) this.renderer.flashEffect();
            audioManager.playCollect(c.isSecret);
        }
    });

    if (!onPlatform) this.player.isGrounded = false;
    this.player.isWallSliding = wallCollision;

    // Pit trap
    if (this.player.pos.y > this.canvas.height) {
        this.die();
    }
  }

  private die() {
    if (this.player.isDead) return;
    this.player.die();
    this.score.state.isGameOver = true;
    if (this.score.onGameOver) {
      this.score.onGameOver(true);
    }
    this.score.resetMultiplier();
    this.score.saveToFirebase('gameOver');
    audioManager.playCrash();
  }

  public reset() {
    this.score.rollback();
    if (this.score.onGameOver) {
      this.score.onGameOver(false);
    }
    const cp = this.score.state.lastCheckpoint;
    const respawnPos = this.world.getCheckPointPos(cp.distance);
    
    this.player.respawn(respawnPos.x, respawnPos.y);
    this.scrollX = respawnPos.x - 100;
    this.score.state.cleanRun = true;
    this.speed = BASE_SPEED + cp.zone * SPEED_INCREMENT;
    
    // Resume next counters
    this.nextCheckpoint = this.scrollX + CHECKPOINT_DISTANCE;
    this.nextZone = this.scrollX + ZONE_DISTANCE;
  }

  private render() {
    this.renderer.render(this.player, this.world, this.score.state, this.scrollX, this.input);
  }
}
