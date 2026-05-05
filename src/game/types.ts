export interface Vector2 {
  x: number;
  y: number;
}

export type ObstacleType = 'platform' | 'barrier_low' | 'barrier_high' | 'moving_h' | 'moving_v' | 'disappearing' | 'enemy';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  pos: Vector2;
  size: Vector2;
  vel: Vector2;
  active: boolean;
  phase: number;
  isSecret?: boolean;
}

export interface Collectible {
  id: string;
  pos: Vector2;
  size: Vector2;
  collected: boolean;
  isSecret: boolean;
}

export interface GameState {
  distance: number;
  score: number;
  multiplier: number;
  streak: number;
  cleanRun: boolean;
  zone: number;
  isGameOver: boolean;
  isPaused: boolean;
  lastCheckpoint: {
    distance: number;
    score: number;
    zone: number;
  };
}
