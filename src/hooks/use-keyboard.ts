import { useEffect, useState, useCallback } from 'react';

/**
 * Hook to detect mobile keyboard visibility
 * Uses visual viewport API for accurate detection
 */
export function useKeyboard() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Check if we're on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    const handleResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const heightDiff = windowHeight - viewportHeight;
        
        // If the viewport is significantly smaller than the window, keyboard is open
        if (heightDiff > 150) {
          setIsKeyboardOpen(true);
          setKeyboardHeight(heightDiff);
          document.body.classList.add('keyboard-open');
          document.documentElement.style.setProperty('--keyboard-height', `${heightDiff}px`);
        } else {
          setIsKeyboardOpen(false);
          setKeyboardHeight(0);
          document.body.classList.remove('keyboard-open');
          document.documentElement.style.setProperty('--keyboard-height', '0px');
        }
      }
    };

    // Use visualViewport API if available
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }

    // Fallback for older browsers
    window.addEventListener('resize', handleResize);

    // Initial check
    handleResize();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('keyboard-open');
    };
  }, []);

  // Scroll active element into view when keyboard opens
  const scrollToInput = useCallback(() => {
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  }, []);

  return { isKeyboardOpen, keyboardHeight, scrollToInput };
}

/**
 * Hook to handle input focus and ensure it's visible above keyboard
 */
export function useInputFocus() {
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Wait for keyboard to appear then scroll
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, []);

  return { handleFocus };
}

