export type GameInputAction = 'LEFT' | 'RIGHT' | 'JUMP' | 'SLIDE' | 'ACTION' | 'PAUSE';

export type InputCallback = (action: GameInputAction) => void;

export class InputManager {
  private targetElement: HTMLElement | Window | null = null;
  private callbacks: Set<InputCallback> = new Set();

  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private isSwiping = false;

  private minSwipeDistance = 25; // Pixels
  private maxSwipeTime = 600; // Milliseconds

  private boundHandleKeyDown = this.handleKeyDown.bind(this);
  private boundHandleTouchStart = this.handleTouchStart.bind(this);
  private boundHandleTouchMove = this.handleTouchMove.bind(this);
  private boundHandleTouchEnd = this.handleTouchEnd.bind(this);

  public attach(element: HTMLElement = document.body) {
    this.detach();
    this.targetElement = element;

    window.addEventListener('keydown', this.boundHandleKeyDown, { passive: false });
    element.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false });
    element.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
    element.addEventListener('touchend', this.boundHandleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', this.boundHandleTouchEnd, { passive: true });
  }

  public detach() {
    window.removeEventListener('keydown', this.boundHandleKeyDown);
    if (this.targetElement && 'removeEventListener' in this.targetElement) {
      this.targetElement.removeEventListener('touchstart', this.boundHandleTouchStart as EventListener);
      this.targetElement.removeEventListener('touchmove', this.boundHandleTouchMove as EventListener);
      this.targetElement.removeEventListener('touchend', this.boundHandleTouchEnd as EventListener);
      this.targetElement.removeEventListener('touchcancel', this.boundHandleTouchEnd as EventListener);
    }
    this.targetElement = null;
  }

  public onAction(cb: InputCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  public emitAction(action: GameInputAction) {
    for (const cb of this.callbacks) {
      cb(action);
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Ignore input if user is focusing an input field
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      return;
    }

    let handled = false;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.emitAction('LEFT');
        handled = true;
        break;

      case 'ArrowRight':
      case 'KeyD':
        this.emitAction('RIGHT');
        handled = true;
        break;

      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        this.emitAction('JUMP');
        this.emitAction('ACTION');
        handled = true;
        break;

      case 'ArrowDown':
      case 'KeyS':
        this.emitAction('SLIDE');
        handled = true;
        break;

      case 'Escape':
      case 'KeyP':
        this.emitAction('PAUSE');
        handled = true;
        break;

      case 'Enter':
        this.emitAction('ACTION');
        handled = true;
        break;
    }

    if (handled && e.code !== 'F11' && e.code !== 'F12') {
      e.preventDefault();
    }
  }

  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = performance.now();
      this.isSwiping = true;
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (!this.isSwiping || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // If swipe distance exceeded threshold, fire action immediately
    if (absX >= this.minSwipeDistance || absY >= this.minSwipeDistance) {
      e.preventDefault(); // Prevent accidental mobile pull-down refresh or pinch zoom

      if (absX > absY) {
        if (dx > 0) {
          this.emitAction('RIGHT');
        } else {
          this.emitAction('LEFT');
        }
      } else {
        if (dy > 0) {
          // Downward swipe
          this.emitAction('SLIDE');
        } else {
          // Upward swipe
          this.emitAction('JUMP');
        }
      }

      // Reset start coordinates to allow chaining swipes during a long drag
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = performance.now();
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    if (this.isSwiping) {
      const elapsed = performance.now() - this.touchStartTime;
      // If it was a quick stationary tap (short duration, minimal move), emit ACTION
      if (elapsed < 300) {
        if (e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          const dist = Math.hypot(touch.clientX - this.touchStartX, touch.clientY - this.touchStartY);
          if (dist < 15) {
            this.emitAction('ACTION');
          }
        }
      }
    }
    this.isSwiping = false;
  }
}
