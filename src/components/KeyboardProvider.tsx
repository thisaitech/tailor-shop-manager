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

    // Check if running in Capacitor
    const isCapacitor = !!(window as any).Capacitor;
    const Capacitor = (window as any).Capacitor;

    // Try to use Capacitor Keyboard plugin if available
    let keyboardPlugin: any = null;
    if (isCapacitor && Capacitor.Plugins?.Keyboard) {
      keyboardPlugin = Capacitor.Plugins.Keyboard;
    }

    // Capacitor Keyboard plugin event handlers
    const handleKeyboardWillShow = (info: { keyboardHeight: number }) => {
      setIsKeyboardOpen(true);
      setKeyboardHeight(info.keyboardHeight);
      document.body.classList.add('keyboard-open');
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
    };

    const handleKeyboardWillHide = () => {
      setIsKeyboardOpen(false);
      setKeyboardHeight(0);
      document.body.classList.remove('keyboard-open');
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    };

    // Add Capacitor keyboard event listeners if available
    if (keyboardPlugin) {
      keyboardPlugin.addListener('keyboardWillShow', handleKeyboardWillShow);
      keyboardPlugin.addListener('keyboardWillHide', handleKeyboardWillHide);
    }

    // Fallback focus handling for scrolling input into view
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const inputType = (target as HTMLInputElement).type;
      
      // Skip non-text inputs
      if (target.tagName === 'INPUT' && ['checkbox', 'radio', 'file', 'submit', 'button', 'hidden', 'range'].includes(inputType)) {
        return;
      }
      
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Set keyboard open if Capacitor plugin isn't handling it
        if (!keyboardPlugin) {
          setIsKeyboardOpen(true);
          document.body.classList.add('keyboard-open');
        }
        
        // Scroll input into view after keyboard animation
        setTimeout(() => {
          // Find the scrollable parent container
          const scrollParent = target.closest(
            '.overflow-y-auto, .overflow-auto, .overflow-y-scroll, [data-radix-scroll-area-viewport], [data-slot="dialog-content"]'
          ) as HTMLElement;
          
          if (scrollParent) {
            const targetRect = target.getBoundingClientRect();
            const parentRect = scrollParent.getBoundingClientRect();
            
            // Calculate if input is below visible area (accounting for keyboard)
            const visibleBottom = parentRect.bottom - (isCapacitor ? 0 : keyboardHeight);
            
            if (targetRect.bottom > visibleBottom - 20) {
              // Scroll the input into view within the container
              const scrollAmount = targetRect.bottom - visibleBottom + 80;
              scrollParent.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            }
          } else {
            // Fallback: scroll the entire page
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, isCapacitor ? 350 : 300); // Slightly longer delay for Capacitor keyboard animation
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (
          activeEl?.tagName !== 'INPUT' &&
          activeEl?.tagName !== 'TEXTAREA' &&
          activeEl?.tagName !== 'SELECT' &&
          !activeEl?.isContentEditable
        ) {
          // Only update state if Capacitor plugin isn't handling it
          if (!keyboardPlugin) {
            setIsKeyboardOpen(false);
            setKeyboardHeight(0);
            document.body.classList.remove('keyboard-open');
          }
        }
      }, 100);
    };

    // Focus events for auto-scroll
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.body.classList.remove('keyboard-open');
      document.documentElement.style.setProperty('--keyboard-height', '0px');
      
      // Remove Capacitor keyboard listeners
      if (keyboardPlugin) {
        keyboardPlugin.removeAllListeners?.();
      }
    };
  }, [keyboardHeight]);

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

