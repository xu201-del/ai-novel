'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '@/hooks/useResponsive';
import { useUIStore } from '@/stores/ui-store';
import { useNovelStore } from '@/stores/novel-store';
import { cn } from '@/lib/utils';
import {
  BookOpen, Menu, X, PanelLeft, PanelRight,
  Settings, Key, Check,
} from 'lucide-react';
import LeftSidebar from './LeftSidebar';
import MainContent from './MainContent';
import RightPanel from './RightPanel';

const MODEL_OPTIONS = [
  { id: 'deepseek-v3', label: 'DeepSeek V3' },
  { id: 'deepseek-r1', label: 'DeepSeek R1' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'claude-sonnet', label: 'Claude Sonnet' },
  { id: 'claude-opus', label: 'Claude Opus' },
  { id: 'qwen-max', label: '通义千问 Max' },
  { id: 'kimi', label: 'Kimi' },
];

export default function InkFlowContainer() {
  const { mounted, isMobile, isDesktop } = useResponsive();

  // Zustand
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const apiConfig = useNovelStore((s) => s.apiConfig);
  const setApiConfig = useNovelStore((s) => s.setApiConfig);
  const leftSidebarOpen = useUIStore((s) => s.leftSidebarOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const toggleLeftSidebar = useUIStore((s) => s.toggleLeftSidebar);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);

  // Mobile drawer state
  const [drawer, setDrawer] = useState<'left' | 'right' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState(apiConfig.key);
  const [tempModel, setTempModel] = useState(apiConfig.model);

  // Close drawer on desktop transition
  useEffect(() => {
    if (isDesktop) setDrawer(null);
  }, [isDesktop]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        toggleLeftSidebar();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault();
        toggleRightPanel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleLeftSidebar, toggleRightPanel]);

  const handleSaveSettings = () => {
    setApiConfig({ key: tempKey, model: tempModel });
    setShowSettings(false);
  };

  // Don't render until responsive check completes
  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--color-bg-primary)]">
        <BookOpen size={32} className="text-[var(--color-text-dim)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ─── Top Navigation Bar ──────────────────────────── */}
      <header className="h-12 flex items-center justify-between px-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shrink-0 select-none z-30">
        <div className="flex items-center gap-2">
          {/* Hamburger — mobile only */}
          {!isDesktop && (
            <button
              onClick={() => setDrawer(drawer === 'left' ? null : 'left')}
              className="btn-ghost px-1.5"
            >
              <Menu size={17} />
            </button>
          )}

          {/* Desktop sidebar toggle */}
          {isDesktop && (
            <button onClick={toggleLeftSidebar} className="btn-ghost px-1.5" title="Ctrl+\">
              {leftSidebarOpen ? <PanelLeft size={15} /> : <PanelLeft size={15} className="text-[var(--color-text-dim)]" />}
            </button>
          )}

          {/* Logo */}
          <div className="flex items-center gap-2">
            <BookOpen size={17} className="text-[var(--color-accent)]" strokeWidth={1.5} />
            <span className="font-semibold text-sm tracking-wide text-[var(--color-text-primary)]">InkFlow</span>
            <span className="hidden sm:inline text-[9px] text-[var(--color-text-dim)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded font-medium uppercase tracking-widest">
              Pro
            </span>
          </div>

          {/* Novel breadcrumb */}
          {currentNovel && (
            <>
              <span className="text-[var(--color-text-dim)] text-xs">/</span>
              <span className="text-[var(--color-text-secondary)] text-sm font-medium truncate max-w-[160px]">
                {currentNovel.title}
              </span>
              <span className={cn(
                'badge text-[10px]',
                currentNovel.status === 'writing' && 'bg-[var(--color-green-bg)] text-[var(--color-green)]',
                currentNovel.status === 'planning' && 'bg-[var(--color-purple-bg)] text-[var(--color-purple)]',
                currentNovel.status === 'completed' && 'bg-[var(--color-blue-bg)] text-[var(--color-blue)]',
                currentNovel.status === 'paused' && 'bg-[var(--color-red-bg)] text-[var(--color-red)]'
              )}>
                {currentNovel.status === 'planning' ? '规划' : currentNovel.status === 'writing' ? '写作' : currentNovel.status === 'completed' ? '完结' : '暂停'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* API settings */}
          <button
            onClick={() => { setTempKey(apiConfig.key); setTempModel(apiConfig.model); setShowSettings(!showSettings); }}
            className={cn('btn-ghost px-2', !apiConfig.key && 'text-[var(--color-accent)]')}
            title="API 设置"
          >
            <Settings size={15} />
            {!apiConfig.key && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] absolute top-1 right-1" />}
          </button>

          {/* Right panel toggle */}
          <button
            onClick={isDesktop ? toggleRightPanel : () => setDrawer(drawer === 'right' ? null : 'right')}
            className="btn-ghost px-1.5"
            title="Ctrl+]"
          >
            {rightPanelOpen ? <PanelRight size={15} /> : <PanelRight size={15} className="text-[var(--color-text-dim)]" />}
          </button>
        </div>
      </header>

      {/* ─── Three-Column Body ────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop: always visible sidebars based on state */}
        {isDesktop && (
          <>
            {leftSidebarOpen && <LeftSidebar />}
            <MainContent />
            {rightPanelOpen && <RightPanel />}
          </>
        )}

        {/* Mobile/Tablet: sidebars hidden, drawer overlay */}
        {!isDesktop && (
          <>
            <MainContent />

            {/* Mobile drawer overlay */}
            <AnimatePresence>
              {drawer && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
                  onClick={() => setDrawer(null)}
                />
              )}
            </AnimatePresence>

            {/* Left drawer */}
            <AnimatePresence>
              {drawer === 'left' && (
                <motion.div
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                  className="absolute left-0 top-0 bottom-0 w-72 z-50 shadow-2xl"
                >
                  <LeftSidebar />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right drawer */}
            <AnimatePresence>
              {drawer === 'right' && (
                <motion.div
                  initial={{ x: 280 }}
                  animate={{ x: 0 }}
                  exit={{ x: 280 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                  className="absolute right-0 top-0 bottom-0 w-72 z-50 shadow-2xl"
                >
                  <RightPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* ─── Settings Modal ────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-sm glass-modal p-5 mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Key size={15} className="text-[var(--color-accent)]" />
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">API 设置</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="btn-ghost px-1">
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">API Key</label>
                  <input
                    type="password"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="sk-..."
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">模型</label>
                  <select
                    value={tempModel}
                    onChange={(e) => setTempModel(e.target.value)}
                    className="input-field text-xs cursor-pointer"
                  >
                    {MODEL_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-[var(--color-text-dim)]">密钥仅存储在本地浏览器</span>
                  <button onClick={handleSaveSettings} className="btn-primary text-xs" disabled={!tempKey.trim()}>
                    <Check size={13} /> 保存
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
