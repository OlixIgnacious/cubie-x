import { Player } from './player';
import { World } from './world';
import { GameState } from './types';
import { COLORS } from './constants';

export class Renderer {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  render(player: Player, world: World, state: GameState, scrollX: number, input: any) {
    // Clear
    this.ctx.fillStyle = COLORS.BG;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Context save
    this.ctx.save();
    
    // Parallax Background
    this.renderBackground(scrollX);

    // Apply Camera scroll
    this.ctx.translate(-scrollX, 0);

    // World
    this.renderWorld(world, scrollX);

    // Player
    this.renderPlayer(player);

    this.ctx.restore();

    // HUD
    this.renderHUD(state);
  }

  private renderBackground(scrollX: number) {
    const layers = [
      { speed: 0.1, color: '#111', height: this.height * 0.4 },
      { speed: 0.3, color: '#1a1a1a', height: this.height * 0.3 },
      { speed: 0.5, color: '#222', height: this.height * 0.2 },
    ];

    layers.forEach(layer => {
      this.ctx.fillStyle = layer.color;
      const xOffset = -(scrollX * layer.speed) % 400;
      
      for (let x = xOffset; x < this.width + 400; x += 300) {
        // Draw some building shapes
        const h = layer.height + Math.sin(x) * 50;
        this.ctx.fillRect(x, this.height - h, 250, h);
      }
    });
  }

  private renderWorld(world: World, scrollX: number) {
    // Draw platforms (Buildings)
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.fillStyle = '#000000';

    world.obstacles.forEach(o => {
      if (o.isSecret) return; // Hidden walls are invisible or subtle
      
      this.ctx.beginPath();
      this.ctx.rect(o.pos.x, o.pos.y, o.size.x, o.size.y);
      this.ctx.fill();
      this.ctx.stroke();

      // Building details (windows)
      if (o.type === 'platform') {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for(let i=0; i<3; i++) {
            for(let j=0; j<5; j++) {
                this.ctx.fillRect(o.pos.x + 20 + i*40, o.pos.y + 20 + j*40, 20, 20);
            }
        }
        this.ctx.fillStyle = '#000000';
      }
    });

    // Draw collectibles
    world.collectibles.forEach(c => {
      if (c.collected) return;
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(c.pos.x + c.size.x/2, c.pos.y + c.size.y/2, c.size.x/2, 0, Math.PI * 2);
      this.ctx.stroke();
      if (c.isSecret) {
          this.ctx.fillStyle = 'white';
          this.ctx.fill();
      }
    });
  }

  private renderPlayer(player: Player) {
    if (player.isDead) return;

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;

    // Silhouette
    this.ctx.fillRect(player.pos.x, player.pos.y, player.size.x, player.size.y);
    
    // Some "sharp vector" detail - eye?
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(player.pos.x + player.size.x * 0.6, player.pos.y + 10, 5, 5);
  }

  private renderHUD(state: GameState) {
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'left';

    // Score
    this.ctx.fillText(`SCORE: ${Math.floor(state.score)}`, 20, 40);
    this.ctx.fillText(`DIST: ${Math.floor(state.distance)}m`, 20, 70);
    this.ctx.fillText(`ZONE: ${state.zone + 1}`, 20, 100);
    this.ctx.fillText(`MULT: X${state.multiplier.toFixed(1)}`, 20, 130);

    // Clean Run Bonus
    if (state.cleanRun) {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'italic bold 32px serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('CLEAN RUN', this.width / 2, 50);
    }
  }

  flashEffect() {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundColor = 'white';
      overlay.style.zIndex = '100';
      overlay.style.pointerEvents = 'none';
      overlay.style.opacity = '1';
      overlay.style.transition = 'opacity 0.2s';
      document.body.appendChild(overlay);
      setTimeout(() => {
          overlay.style.opacity = '0';
          setTimeout(() => document.body.removeChild(overlay), 200);
      }, 50);
  }
}
