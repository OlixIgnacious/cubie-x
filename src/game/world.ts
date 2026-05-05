import { Obstacle, Vector2, ObstacleType, Collectible } from './types';
import { GROUND_Y_OFFSET } from './constants';

export class World {
  obstacles: Obstacle[];
  collectibles: Collectible[];
  lastX: number;
  canvasWidth: number;
  canvasHeight: number;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.obstacles = [];
    this.collectibles = [];
    this.lastX = 0;
    this.init();
  }

  init() {
    this.obstacles = [];
    this.collectibles = [];
    this.lastX = 0;
    // Initial safe ground
    this.addBuilding(0, this.canvasHeight - GROUND_Y_OFFSET, 1200);
  }

  addBuilding(x: number, y: number, width: number, isSecret: boolean = false) {
    this.obstacles.push({
      id: Math.random().toString(36),
      type: 'platform',
      pos: { x, y },
      size: { x: width, y: 2000 },
      vel: { x: 0, y: 0 },
      active: true,
      phase: 0,
      isSecret
    });
    this.lastX = x + width;
  }

  addObstacle(type: ObstacleType, x: number, y: number, width: number, height: number, isSecret: boolean = false) {
    this.obstacles.push({
      id: Math.random().toString(36),
      type,
      pos: { x, y },
      size: { x: width, y: height },
      vel: { x: 0, y: 0 },
      active: true,
      phase: Math.random() * Math.PI * 2,
      isSecret
    });
  }

  addCollectible(x: number, y: number, isSecret: boolean = false) {
    this.collectibles.push({
      id: Math.random().toString(36),
      pos: { x, y },
      size: { x: 20, y: 20 },
      collected: false,
      isSecret
    });
  }

  update(scrollX: number, zone: number) {
    // Clean up
    this.obstacles = this.obstacles.filter(o => o.pos.x + o.size.x > scrollX - 500);
    this.collectibles = this.collectibles.filter(c => c.pos.x + c.size.x > scrollX - 500);

    // Generate
    while (this.lastX < scrollX + this.canvasWidth + 1000) {
      this.generateBuilding(zone);
    }

    // Physics for moving platforms/enemies
    this.obstacles.forEach(o => {
      if (o.type === 'moving_h') {
        o.pos.x += Math.sin(o.phase) * (2 + zone * 0.5);
        o.phase += 0.05;
      } else if (o.type === 'moving_v') {
        const amp = 80 + zone * 10;
        o.pos.y = o.pos.y + Math.sin(o.phase) * (zone + 1); // Not quite right for V, should store center
        o.phase += 0.03;
      } else if (o.type === 'enemy') {
          o.pos.x += Math.sin(o.phase) * 3;
          o.phase += 0.04;
      }
    });
  }

  generateBuilding(zone: number) {
    const minGap = 80 + zone * 20;
    const maxGap = 200 + zone * 30;
    const gap = minGap + Math.random() * (maxGap - minGap);
    const width = 450 + Math.random() * 500 - zone * 15;
    const baseY = this.canvasHeight - GROUND_Y_OFFSET;
    const y = baseY + (Math.random() - 0.5) * 150;
    
    const startX = this.lastX + gap;
    this.addBuilding(startX, y, width);

    // Add decorations/hazards on roof
    if (Math.random() > 0.4) {
      const typeRand = Math.random();
      if (typeRand < 0.3) {
        this.addObstacle('barrier_low', startX + width / 2, y - 40, 20, 40);
      } else if (typeRand < 0.5) {
        this.addObstacle('barrier_high', startX + width / 4, y - 100, 300, 40);
      } else if (typeRand < 0.7) {
        this.addObstacle('enemy', startX + width / 2, y - 40, 40, 40);
      } else if (zone > 1 && typeRand < 0.9) {
          // Add a floating platform between buildings
          this.addObstacle('moving_v', startX - gap/2, y - 100, 100, 20);
      }
    }

    // Secrets
    if (Math.random() > 0.8) {
      this.addCollectible(startX + width / 2, y - 150, true);
    } else {
        this.addCollectible(startX + width / 2, y - 80, false);
    }

    // Hidden wall
    if (Math.random() > 0.9) {
        this.addObstacle('disappearing', startX + width - 100, y - 150, 40, 150, true);
    }
  }

  getCheckPointPos(distance: number): Vector2 {
      // Find a safe spot near distance
      const platform = this.obstacles.find(o => o.type === 'platform' && o.pos.x > distance);
      if (platform) {
          return { x: platform.pos.x + 50, y: platform.pos.y - 70 };
      }
      return { x: distance, y: this.canvasHeight / 2 };
  }
}
