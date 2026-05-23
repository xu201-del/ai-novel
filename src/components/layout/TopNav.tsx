'use client';

import { useState, useEffect } from 'react';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import {
  BookOpen, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight,
  Settings, Key, Check, X, Upload, Loader2, GitBranch,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const MODEL_OPTIONS = [
  { id: 'deepseek-v3', label: 'DeepSeek V3' },
  { id: 'deepseek-r1', label: 'DeepSeek R1' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'claude-sonnet', label: 'Claude Sonnet' },
  { id: 'claude-opus', label: 'Claude Opus' },
  { id: 'qwen-max', label: '通义千问 Max' },
  { id: 'kimi', label: 'Kimi' },
];

export default function TopNav() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // All Zustand hooks — must be before any early return
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const apiConfig = useNovelStore((s) => s.apiConfig);
  const setApiConfig = useNovelStore((s) => s.setApiConfig);
  const githubConfig = useNovelStore((s) => s.githubConfig);
  const setGithubConfig = useNovelStore((s) => s.setGithubConfig);
  const leftSidebarOpen = useUIStore((s) => s.leftSidebarOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const toggleLeftSidebar = useUIStore((s) => s.toggleLeftSidebar);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState(apiConfig.key);
  const [tempModel, setTempModel] = useState(apiConfig.model);
  const [tempGHToken, setTempGHToken] = useState(githubConfig.token);
  const [tempGHOwner, setTempGHOwner] = useState(githubConfig.owner);
  const [tempGHRepo, setTempGHRepo] = useState(githubConfig.repo);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const handleSaveSettings = () => {
    setApiConfig({ key: tempKey, model: tempModel });
    setGithubConfig({ token: tempGHToken, owner: tempGHOwner, repo: tempGHRepo });
    setShowSettings(false);
  };

  const handleExport = async () => {
    if (!currentNovel || !githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      setExportMsg('请先在设置中配置 GitHub Token、Owner 和 Repo');
      return;
    }
    setExporting(true);
    setExportMsg('');
    try {
      const { exportNovelToGitHub } = await import('@/services/github-export');
      await exportNovelToGitHub(githubConfig, currentNovel, (current, total, path) => {
        setExportMsg(`上传中 (${current}/${total}): ${path}`);
      });
      setExportMsg('导出完成！');
    } catch (err: unknown) {
      setExportMsg(err instanceof Error ? err.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  if (!mounted) {
    return (
      <header className="h-12 flex items-center px-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shrink-0 select-none z-30">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-[var(--color-accent)]" strokeWidth={1.5} />
          <span className="font-semibold text-sm tracking-wide text-[var(--color-text-primary)]">InkFlow</span>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="h-12 flex items-center justify-between px-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shrink-0 select-none z-30">
        <div className="flex items-center gap-3">
          <button onClick={toggleLeftSidebar} className="btn-ghost px-2">
            {leftSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>

          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[var(--color-accent)]" strokeWidth={1.5} />
            <span className="font-semibold text-sm tracking-wide text-[var(--color-text-primary)]">InkFlow</span>
          </div>

          {currentNovel && (
            <>
              <span className="text-[var(--color-text-dim)] text-xs">/</span>
              <span className="text-[var(--color-text-secondary)] text-sm font-medium truncate max-w-[200px]">
                {currentNovel.title}
              </span>
              <span className={cn(
                'badge',
                currentNovel.status === 'writing' && 'bg-[var(--color-green-bg)] text-[var(--color-green)]',
                currentNovel.status === 'planning' && 'bg-[var(--color-purple-bg)] text-[var(--color-purple)]',
                currentNovel.status === 'completed' && 'bg-[var(--color-blue-bg)] text-[var(--color-blue)]',
                currentNovel.status === 'paused' && 'bg-[var(--color-red-bg)] text-[var(--color-red)]'
              )}>
                {currentNovel.status === 'planning' ? '规划中' : currentNovel.status === 'writing' ? '写作中' : currentNovel.status === 'completed' ? '已完结' : '暂停'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => { setTempKey(apiConfig.key); setTempModel(apiConfig.model); setTempGHToken(githubConfig.token); setTempGHOwner(githubConfig.owner); setTempGHRepo(githubConfig.repo); setShowSettings(!showSettings); }}
            className={cn('btn-ghost px-2', !apiConfig.key && 'text-[var(--color-accent)]')}
            title="API 设置"
          >
            <Settings size={16} />
            {!apiConfig.key && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] absolute top-1 right-1" />}
          </button>
          {currentNovel && (
            <div className="relative flex items-center">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="btn-ghost px-2"
                title="导出到 GitHub"
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              </button>
              {exportMsg && (
                <span className={cn(
                  'absolute top-full right-0 mt-1 text-[9px] whitespace-nowrap px-2 py-0.5 rounded-[var(--radius-sm)] animate-fade-in',
                  exportMsg.includes('完成') ? 'text-[var(--color-green)] bg-[var(--color-green-bg)]' : 'text-[var(--color-text-dim)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)]',
                )}>
                  {exportMsg}
                </span>
              )}
            </div>
          )}
          <ThemeToggle />
          <button onClick={toggleRightPanel} className="btn-ghost px-2">
            {rightPanelOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-sm glass-panel rounded-[var(--radius-xl)] p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-[var(--color-accent)]" />
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

              <div className="border-t border-[var(--color-border-secondary)] pt-3 mt-1">
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch size={14} className="text-[var(--color-text-dim)]" />
                  <h4 className="text-xs font-medium text-[var(--color-text-secondary)]">GitHub 导出</h4>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-[var(--color-text-muted)] mb-0.5">Personal Access Token</label>
                    <input
                      type="password"
                      value={tempGHToken}
                      onChange={(e) => setTempGHToken(e.target.value)}
                      placeholder="ghp_..."
                      className="input-field text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-[var(--color-text-muted)] mb-0.5">Owner</label>
                      <input
                        type="text"
                        value={tempGHOwner}
                        onChange={(e) => setTempGHOwner(e.target.value)}
                        placeholder="GitHub 用户名"
                        className="input-field text-xs"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-[var(--color-text-muted)] mb-0.5">Repo</label>
                      <input
                        type="text"
                        value={tempGHRepo}
                        onChange={(e) => setTempGHRepo(e.target.value)}
                        placeholder="仓库名"
                        className="input-field text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-[var(--color-text-dim)]">
                  密钥仅存储在本地浏览器
                </span>
                <button onClick={handleSaveSettings} className="btn-primary text-xs" disabled={!tempKey.trim()}>
                  <Check size={13} />
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
