import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface KeyboardContextType {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
  scrollToActiveInput: () => void;
}

const KeyboardContext = createContext<KeyboardContextType>({
  isKeyboardOpen: false,
  keyboardHeight: 0,
  scrollToActiveInput: () => {},
});

export const useKeyboardContext = () => useContext(KeyboardContext);

interface KeyboardProviderProps {
  children: React.ReactNode;
}

export function KeyboardProvider({ children }: KeyboardProviderProps) {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Check if we're on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    let initialViewportHeight = window.innerHeight;

    const handleResize = () => {
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        const heightDiff = initialViewportHeight - currentHeight;

        // Keyboard is likely open if viewport shrinks significantly
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

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Wait for keyboard to appear
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const handleFocusOut = () => {
      // Small delay to check if focus moved to another input
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (
          activeEl?.tagName !== 'INPUT' &&
          activeEl?.tagName !== 'TEXTAREA' &&
          activeEl?.tagName !== 'SELECT'
        ) {
          // Reset viewport
          window.scrollTo(0, 0);
        }
      }, 100);
    };

    // Visual viewport API
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }

    // Focus events for auto-scroll
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    // Window resize fallback
    window.addEventListener('resize', handleResize);

    // Update initial height on orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        initialViewportHeight = window.innerHeight;
      }, 100);
    });

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('keyboard-open');
    };
  }, []);

  const scrollToActiveInput = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT')
    ) {
      setTimeout(() => {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, []);

  return (
    <KeyboardContext.Provider value={{ isKeyboardOpen, keyboardHeight, scrollToActiveInput }}>
      {children}
    </KeyboardContext.Provider>
  );
}

