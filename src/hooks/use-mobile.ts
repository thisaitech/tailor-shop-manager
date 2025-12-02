import { useEffect, useState } from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = (event: MediaQueryListEvent | MediaQueryList) => {
      // Use matches property for better compatibility
      setIsMobile(event.matches)
    }
    
    // Set initial value
    setIsMobile(mql.matches)
    
    // Add listener (handle both old and new API)
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange)
    } else {
      // Fallback for older browsers
      mql.addListener(onChange as any)
    }
    
    // Cleanup function
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange)
      } else {
        // Fallback for older browsers
        mql.removeListener(onChange as any)
      }
    }
  }, [])

  return !!isMobile
}
