'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="btn-ghost px-2 relative overflow-hidden"
      title={theme === 'dark' ? '切换白天模式' : '切换夜间模式'}
    >
      <span
        className="inline-flex items-center justify-center transition-all duration-500 ease-out"
        style={{
          transform: theme === 'dark' ? 'rotate(0deg) scale(1)' : 'rotate(180deg) scale(1)',
          opacity: 1,
        }}
      >
        {theme === 'dark' ? (
          <Sun size={16} className="transition-transform duration-500" />
        ) : (
          <Moon size={16} className="transition-transform duration-500" />
        )}
      </span>
    </button>
  );
}
