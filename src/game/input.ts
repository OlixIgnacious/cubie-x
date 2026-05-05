export class Input {
  public onJump: () => void = () => {};
  public onSlideStart: () => void = () => {};
  public onSlideEnd: () => void = () => {};
  public onRestart: () => void = () => {};

  public keysActive: Record<string, boolean> = {};

  private touchStartY: number = 0;
  private isTouching: boolean = false;

  constructor() {
    const handleDown = (e: KeyboardEvent) => {
      const key = (e.key || '').toLowerCase();
      const code = e.code;

      // Prevent default scrolling for game keys if target is the game
      const gameKeys = ['arrowup', 'arrowdown', 'space', ' ', 'w', 's', 'r'];
      if (gameKeys.includes(key) || gameKeys.includes(code.toLowerCase())) {
          e.preventDefault();
      }

      if (e.repeat) return;
      
      this.keysActive[key] = true;
      this.keysActive[code] = true;

      // Explicitly check common jump keys
      if (key === ' ' || key === 'arrowup' || key === 'w' || code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        this.onJump();
      }
      // Explicitly check common slide keys
      if (key === 'arrowdown' || key === 's' || code === 'ArrowDown' || code === 'KeyS') {
        this.onSlideStart();
      }
      // Explicitly check restart
      if (key === 'r' || code === 'KeyR') {
        this.onRestart();
      }
    };

    const handleUp = (e: KeyboardEvent) => {
      const key = (e.key || '').toLowerCase();
      const code = e.code;

      this.keysActive[key] = false;
      this.keysActive[code] = false;

      if (key === 'arrowdown' || key === 's' || code === 'ArrowDown' || code === 'KeyS') {
        this.onSlideEnd();
      }
    };

    // Attach to window only to avoid double-triggering in bubble/capture phases
    window.addEventListener('keydown', handleDown, true);
    window.addEventListener('keyup', handleUp, true);

    // Touch
    window.addEventListener('touchstart', (e) => {
        this.touchStartY = e.touches[0].clientY;
        this.isTouching = true;
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!this.isTouching) return;
        const currentY = e.touches[0].clientY;
        if (currentY - this.touchStartY > 30) {
            this.onSlideStart();
        }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        const diff = e.changedTouches[0].clientY - this.touchStartY;
        if (Math.abs(diff) < 20) {
            this.onJump();
        }
        this.onSlideEnd();
        this.isTouching = false;
    }, { passive: false });
  }
}
