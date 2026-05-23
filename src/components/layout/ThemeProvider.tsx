'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'dark') {
      el.classList.add('dark');
    } else {
      el.classList.remove('dark');
    }
  }, [theme]);

  return <>{children}</>;
}
