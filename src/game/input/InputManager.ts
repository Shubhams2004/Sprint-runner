export type GameInputAction = 'LEFT' | 'RIGHT' | 'JUMP' | 'SLIDE' | 'ACTION' | 'PAUSE';

export type InputCallback = (action: GameInputAction) => void;

/**
 * Centralized, hardened input manager for Sprint Runner.
 * Normalizes touch swipes, taps, and keyboard events into discrete game actions.
 * Prevents browser gestures, multi-triggering, and accidental double inputs.
 */
export class InputManager {
  private targetElement: HTMLElement | null = null;
  private callbacks: Set<InputCallback> = new Set();

  // Active touch stroke state
  private activeTouchId: number | null = null;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private hasTriggeredInStroke = false;

  // Gesture calibration thresholds
  private readonly minSwipeDistance = 32; // Minimum pixels to qualify as an intentional swipe
  private readonly dominantAxisRatio = 1.15; // Dominance factor to eliminate ambiguous diagonal swipes
  private readonly maxTapDuration = 300; // Milliseconds for a tap
  private readonly maxTapDistance = 16; // Maximum drift for a tap

  // Bound event handlers for clean removal
  private boundHandleKeyDown = this.handleKeyDown.bind(this);
  private boundHandleTouchStart = this.handleTouchStart.bind(this);
  private boundHandleTouchMove = this.handleTouchMove.bind(this);
  private boundHandleTouchEnd = this.handleTouchEnd.bind(this);
  private boundHandleTouchCancel = this.handleTouchCancel.bind(this);

  public attach(element: HTMLElement) {
    this.detach();
    this.targetElement = element;

    // Apply strict CSS touch behavior to target element
    element.style.touchAction = 'none';
    element.style.userSelect = 'none';
    element.style.webkitUserSelect = 'none';

    // Keyboard events on window
    window.addEventListener('keydown', this.boundHandleKeyDown, { passive: false });

    // Touch events on full gameplay container
    element.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false });
    element.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
    element.addEventListener('touchend', this.boundHandleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', this.boundHandleTouchCancel, { passive: false });
  }

  public detach() {
    window.removeEventListener('keydown', this.boundHandleKeyDown);

    if (this.targetElement) {
      this.targetElement.removeEventListener('touchstart', this.boundHandleTouchStart);
      this.targetElement.removeEventListener('touchmove', this.boundHandleTouchMove);
      this.targetElement.removeEventListener('touchend', this.boundHandleTouchEnd);
      this.targetElement.removeEventListener('touchcancel', this.boundHandleTouchCancel);
      this.targetElement = null;
    }

    this.resetStroke();
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

  /**
   * Safe desktop keyboard input with key-repeat prevention.
   */
  private handleKeyDown(e: KeyboardEvent) {
    // Ignore if typing in text inputs
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      return;
    }

    // Ignore keyboard auto-repeat to prevent holding keys from spamming actions
    if (e.repeat) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
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

    if (handled) {
      e.preventDefault();
    }
  }

  /**
   * Touch input handling.
   * Ensures exactly one action per swipe stroke and cleanly distinguishes taps.
   */
  private handleTouchStart(e: TouchEvent) {
    // Always prevent native browser gestures (pull-to-refresh, page scroll, pinch zoom)
    if (e.cancelable) {
      e.preventDefault();
    }

    // Lock onto the first primary touch
    if (this.activeTouchId === null && e.touches.length > 0) {
      const touch = e.touches[0];
      this.activeTouchId = touch.identifier;
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = performance.now();
      this.hasTriggeredInStroke = false;
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (e.cancelable) {
      e.preventDefault();
    }

    if (this.activeTouchId === null || this.hasTriggeredInStroke) {
      return;
    }

    // Find the tracked active touch
    let activeTouch: Touch | null = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.activeTouchId) {
        activeTouch = e.touches[i];
        break;
      }
    }

    if (!activeTouch) return;

    const dx = activeTouch.clientX - this.touchStartX;
    const dy = activeTouch.clientY - this.touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Require minimum gesture distance threshold
    const maxDelta = Math.max(absX, absY);
    if (maxDelta < this.minSwipeDistance) {
      return;
    }

    // Require dominant axis to prevent ambiguous diagonal swipes
    if (absX >= absY * this.dominantAxisRatio) {
      // Horizontal swipe
      this.hasTriggeredInStroke = true;
      if (dx > 0) {
        this.emitAction('RIGHT');
      } else {
        this.emitAction('LEFT');
      }
    } else if (absY >= absX * this.dominantAxisRatio) {
      // Vertical swipe
      this.hasTriggeredInStroke = true;
      if (dy > 0) {
        this.emitAction('SLIDE');
      } else {
        this.emitAction('JUMP');
      }
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    if (e.cancelable) {
      e.preventDefault();
    }

    if (this.activeTouchId === null) return;

    // Check if the released touch is our active touch
    let releasedTouch: Touch | null = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.activeTouchId) {
        releasedTouch = e.changedTouches[i];
        break;
      }
    }

    if (releasedTouch) {
      // If no swipe triggered during the stroke, check if it was an intentional stationary tap
      if (!this.hasTriggeredInStroke) {
        const elapsed = performance.now() - this.touchStartTime;
        const dist = Math.hypot(
          releasedTouch.clientX - this.touchStartX,
          releasedTouch.clientY - this.touchStartY
        );

        if (elapsed <= this.maxTapDuration && dist <= this.maxTapDistance) {
          // Stationary tap: start run or restart
          this.emitAction('ACTION');
        }
      }

      this.resetStroke();
    }
  }

  private handleTouchCancel() {
    this.resetStroke();
  }

  private resetStroke() {
    this.activeTouchId = null;
    this.hasTriggeredInStroke = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
  }
}
