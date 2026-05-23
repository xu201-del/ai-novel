'use client';

import { useEffect } from 'react';
import { useUIStore, type ThemeMode } from '@/stores/ui-store';

export function useTheme(): { theme: ThemeMode; toggleTheme: () => void } {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'dark') {
      el.classList.add('dark');
    } else {
      el.classList.remove('dark');
    }
  }, [theme]);

  return { theme, toggleTheme };
}
