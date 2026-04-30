import { useState, useRef, useCallback } from "react";

/**
 * Makes any element gesture-interaction ready:
 * - Touch start/end tracking
 * - Long press detection (500ms)
 * - Swipe direction detection
 * - Visual press state
 */
export function useGestureReady({
  onLongPress,
  onSwipeLeft,
  onSwipeRight,
  longPressMs = 500,
} = {}) {
  const [pressed, setPressed] = useState(false);
  const timerRef   = useRef(null);
  const startPos   = useRef(null);
  const startTime  = useRef(null);

  const onTouchStart = useCallback((e) => {
    setPressed(true);
    startTime.current = Date.now();
    startPos.current  = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    if (onLongPress) {
      timerRef.current = setTimeout(() => {
        onLongPress();
        setPressed(false);
      }, longPressMs);
    }
  }, [onLongPress, longPressMs]);

  const onTouchEnd = useCallback((e) => {
    setPressed(false);
    clearTimeout(timerRef.current);

    if (!startPos.current) return;
    const dx = e.changedTouches[0].clientX - startPos.current.x;
    const dy = e.changedTouches[0].clientY - startPos.current.y;
    const elapsed = Date.now() - startTime.current;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) && elapsed < 400) {
      if (dx < 0 && onSwipeLeft)  onSwipeLeft();
      if (dx > 0 && onSwipeRight) onSwipeRight();
    }

    startPos.current  = null;
    startTime.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  const onTouchCancel = useCallback(() => {
    setPressed(false);
    clearTimeout(timerRef.current);
  }, []);

  return {
    pressed,
    gestureProps: { onTouchStart, onTouchEnd, onTouchCancel },
  };
}
