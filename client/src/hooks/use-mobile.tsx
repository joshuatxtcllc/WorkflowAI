
import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)
  const [isTouch, setIsTouch] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const tql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      const width = window.innerWidth
      setIsMobile(width < MOBILE_BREAKPOINT)
      setIsTablet(width < TABLET_BREAKPOINT && width >= MOBILE_BREAKPOINT)
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
    
    mql.addEventListener("change", onChange)
    tql.addEventListener("change", onChange)
    onChange()
    
    return () => {
      mql.removeEventListener("change", onChange)
      tql.removeEventListener("change", onChange)
    }
  }, [])

  return {
    isMobile: !!isMobile,
    isTablet: !!isTablet,
    isTouch: !!isTouch,
    isDesktop: !isMobile && !isTablet
  }
}

export function useDeviceType() {
  const { isMobile, isTablet, isTouch, isDesktop } = useIsMobile()
  
  return React.useMemo(() => {
    if (isMobile) return 'mobile'
    if (isTablet) return 'tablet'
    if (isDesktop) return 'desktop'
    return 'unknown'
  }, [isMobile, isTablet, isDesktop])
}

export function useViewportHeight() {
  const [height, setHeight] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.visualViewport?.height || window.innerHeight
    }
    return 0
  })

  React.useEffect(() => {
    const updateHeight = () => {
      setHeight(window.visualViewport?.height || window.innerHeight)
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight)
      return () => window.visualViewport?.removeEventListener('resize', updateHeight)
    } else {
      window.addEventListener('resize', updateHeight)
      return () => window.removeEventListener('resize', updateHeight)
    }
  }, [])

  return height
}
