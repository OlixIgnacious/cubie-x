import { Vector2 } from './types';
import { GRAVITY, JUMP_FORCE, DOUBLE_JUMP_FORCE, WALL_JUMP_FORCE_X, WALL_JUMP_FORCE_Y, SLIDE_HITBOX_HEIGHT, NORMAL_HITBOX_HEIGHT, PLAYER_WIDTH } from './constants';

export class Player {
  pos: Vector2;
  vel: Vector2;
  size: Vector2;
  isGrounded: boolean;
  canDoubleJump: boolean;
  isSliding: boolean;
  isWallSliding: boolean;
  wallSide: 'left' | 'right' | null;
  isDead: boolean;

  private coyoteTimer: number = 0;
  private jumpBufferTimer: number = 0;
  private readonly COYOTE_TIME = 5; // frames
  private readonly JUMP_BUFFER = 10; // frames

  constructor(x: number, y: number) {
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.size = { x: PLAYER_WIDTH, y: NORMAL_HITBOX_HEIGHT };
    this.isGrounded = false;
    this.canDoubleJump = true;
    this.isSliding = false;
    this.isWallSliding = false;
    this.wallSide = null;
    this.isDead = false;
  }

  jump() {
    if (this.isDead) return;
    this.jumpBufferTimer = this.JUMP_BUFFER;
  }

  private handleJump() {
    if (this.jumpBufferTimer <= 0) return;

    if (this.isGrounded || this.coyoteTimer > 0) {
      this.vel.y = JUMP_FORCE;
      this.isGrounded = false;
      this.canDoubleJump = true;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
    } else if (this.isWallSliding && this.wallSide) {
      this.vel.y = WALL_JUMP_FORCE_Y;
      this.vel.x = this.wallSide === 'left' ? WALL_JUMP_FORCE_X : -WALL_JUMP_FORCE_X;
      this.isWallSliding = false;
      this.wallSide = null;
      this.canDoubleJump = true;
      this.jumpBufferTimer = 0;
    } else if (this.canDoubleJump) {
      this.vel.y = DOUBLE_JUMP_FORCE;
      this.canDoubleJump = false;
      this.jumpBufferTimer = 0;
    }
  }

  slide(active: boolean) {
    if (this.isDead) return;
    if (this.isSliding === active) return;
    
    this.isSliding = active;
    const oldY = this.pos.y + this.size.y;
    this.size.y = active ? SLIDE_HITBOX_HEIGHT : NORMAL_HITBOX_HEIGHT;
    this.pos.y = oldY - this.size.y;
  }

  update() {
    if (this.isDead) return;

    // Update timers
    if (this.isGrounded) {
        this.coyoteTimer = this.COYOTE_TIME;
    } else {
        this.coyoteTimer--;
    }
    this.jumpBufferTimer--;

    // Process jump intent
    this.handleJump();

    // Apply gravity
    if (this.isWallSliding) {
      this.vel.y += GRAVITY * 0.3; // Half gravity on wall slide
      if (this.vel.y > 2) this.vel.y = 2; // Terminal velocity on wall
    } else {
      this.vel.y += GRAVITY;
    }

    // Horizontal friction for horizontal wall jump velocity
    this.vel.x *= 0.85;

    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
  }

  die() {
    this.isDead = true;
  }

  respawn(x: number, y: number) {
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.isDead = false;
    this.isGrounded = false;
    this.isSliding = false;
    this.isWallSliding = false;
    this.size.y = NORMAL_HITBOX_HEIGHT;
  }
}
