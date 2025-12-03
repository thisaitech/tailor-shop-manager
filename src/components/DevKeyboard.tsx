import { useState, useEffect } from 'react';

// ⚠️ SET TO false TO DISABLE THE FAKE KEYBOARD
const DEV_KEYBOARD_ENABLED = false;

// Check if running in Capacitor/mobile - NEVER enable dev keyboard on mobile
const isCapacitorApp = typeof window !== 'undefined' && !!(window as any).Capacitor;
const isMobileDevice = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// SAFETY: Dev keyboard is COMPLETELY disabled on mobile/Capacitor
const SHOULD_ENABLE = DEV_KEYBOARD_ENABLED && !isCapacitorApp && !isMobileDevice;

export function DevKeyboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [isShift, setIsShift] = useState(false);
  const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    // Triple safety check - never run on mobile/Capacitor
    if (!SHOULD_ENABLE) return;

    const KEYBOARD_HEIGHT = 280; // Height of the dev keyboard

    const handleFocus = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const inputType = (target as HTMLInputElement).type;
        if (['checkbox', 'radio', 'file', 'submit', 'button', 'hidden'].includes(inputType)) {
          return;
        }
        setActiveInput(target as HTMLInputElement | HTMLTextAreaElement);
        setIsVisible(true);
        
        // Add extra padding to scrollable areas so bottom inputs can scroll up
        document.body.classList.add('dev-keyboard-open');
        
        // Scroll input into view if it would be hidden by keyboard
        setTimeout(() => {
          const rect = target.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const inputBottom = rect.bottom;
          const visibleAreaBottom = viewportHeight - KEYBOARD_HEIGHT - 20; // 20px buffer
          
          if (inputBottom > visibleAreaBottom) {
            // Find scrollable parent
            const scrollParent = target.closest('.overflow-y-auto, .overflow-auto, [data-radix-scroll-area-viewport]') as HTMLElement;
            if (scrollParent) {
              const scrollAmount = inputBottom - visibleAreaBottom + 40;
              scrollParent.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            } else {
              // Fallback to scrollIntoView
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }, 100);
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;
        setIsVisible(false);
        setActiveInput(null);
        document.body.classList.remove('dev-keyboard-open');
      }, 200);
    };

    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  const handleKeyPress = (key: string) => {
    if (!activeInput) return;
    const start = activeInput.selectionStart || 0;
    const end = activeInput.selectionEnd || 0;
    const value = activeInput.value;
    let newValue = value;
    let newCursorPos = start;

    if (key === '⌫') {
      if (start !== end) {
        newValue = value.substring(0, start) + value.substring(end);
        newCursorPos = start;
      } else if (start > 0) {
        newValue = value.substring(0, start - 1) + value.substring(end);
        newCursorPos = start - 1;
      }
    } else if (key === '⇧') {
      setIsShift(!isShift);
      return;
    } else if (key === 'space') {
      newValue = value.substring(0, start) + ' ' + value.substring(end);
      newCursorPos = start + 1;
    } else {
      const char = isShift ? key.toUpperCase() : key;
      newValue = value.substring(0, start) + char + value.substring(end);
      newCursorPos = start + 1;
      if (isShift) setIsShift(false);
    }

    const proto = activeInput.tagName === 'TEXTAREA' 
      ? window.HTMLTextAreaElement.prototype 
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
      setter.call(activeInput, newValue);
      activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    requestAnimationFrame(() => {
      activeInput.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  // Never render on mobile/Capacitor, even if somehow this component is mounted
  if (!SHOULD_ENABLE || !isVisible) return null;

  const rows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['⇧', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'],
    ['space'],
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 99999,
      backgroundColor: '#d1d5db',
      borderTop: '1px solid #9ca3af',
      padding: '8px 4px 12px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 8px',
        marginBottom: '4px',
      }}>
        <span style={{ fontSize: '10px', color: '#666', background: '#fef08a', padding: '2px 6px', borderRadius: '4px' }}>
          DEV KEYBOARD
        </span>
        <button onClick={() => setIsVisible(false)} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none' }}>
          Done
        </button>
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
          {row.map((key) => (
            <button
              key={key}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleKeyPress(key); }}
              style={{
                width: key === 'space' ? '160px' : '32px',
                height: '40px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: '#fff',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              {key === 'space' ? '' : (isShift && !['⇧', '⌫'].includes(key) ? key.toUpperCase() : key)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
