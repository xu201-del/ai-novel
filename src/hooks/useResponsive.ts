import { useState, useEffect } from 'react';

export function useResponsive() {
  const [width, setWidth] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setWidth(window.innerWidth);
    setMounted(true);

    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return {
    mounted,
    isMobile: mounted && width < 768,
    isTablet: mounted && width >= 768 && width < 1025,
    isDesktop: mounted && width >= 1025,
    width,
  };
}
