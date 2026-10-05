import { useEffect } from 'react';

/**
 * Custom hook to lock body scrolling when a modal/popup is open,
 * preventing background scroll-chaining and jitter.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    // Save previous overflow style
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isLocked]);
}
