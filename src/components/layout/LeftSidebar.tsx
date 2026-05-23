'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import { cn, formatDate } from '@/lib/utils';
import {
  Plus, Trash2, BookOpen, ChevronDown, ChevronRight,
  Layout, Users, Globe, ListTree, FileText, X,
  Map, Building2, FlaskConical, Zap, Clock, History,
  GanttChart, Pen, Sparkles, BookMarked, Wand2, Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WorldSetting, KnowledgeBaseTab, PipelineStage, Novel, TimelineNode, Chapter } from '@/types';
import type { VolumeChapter } from '@/types';
import type { FrameworkVolume } from '@/types/novel-framework';
import { PIPELINE_STAGES } from '@/types';
import CreateNovelDialog from '@/components/novel/CreateNovelDialog';
import { deduceChapters } from '@/services/volume-deduce';

const COVER_PALETTE = ['#d4a44c', '#e0556a', '#4caf90', '#5c9ce6', '#7c7cf8', '#e08d3b', '#c462a0', '#52b9c0'];

export default function LeftSidebar() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const novels = useNovelStore((s) => s.novels);
  const currentNovelId = useNovelStore((s) => s.currentNovelId);
  const setCurrentNovel = useNovelStore((s) => s.setCurrentNovel);
  const deleteNovel = useNovelStore((s) => s.deleteNovel);
  const currentNovel = useNovelStore((s) => s.currentNovel());

  const leftSidebarOpen = useUIStore((s) => s.leftSidebarOpen);
  const leftPanelLayer = useUIStore((s) => s.leftPanelLayer);
  const setLeftPanelLayer = useUIStore((s) => s.setLeftPanelLayer);
  const knowledgeBaseTab = useUIStore((s) => s.knowledgeBaseTab);
  const setKnowledgeBaseTab = useUIStore((s) => s.setKnowledgeBaseTab);
  const setSelectedChapterId = useUIStore((s) => s.setSelectedChapterId);
  const setEditorMode = useUIStore((s) => s.setEditorMode);

  const [showCreate, setShowCreate] = useState(false);
  const sortedNovels = [...novels].sort((a, b) => b.updatedAt - a.updatedAt);

  if (!mounted) return null;
  if (!leftSidebarOpen) return null;

  return (
    <>
      <aside className="w-64 shrink-0 border-r border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex flex-col h-full animate-fade-in">
        {/* Layer toggle */}
        <div className="flex border-b border-[var(--color-border-secondary)] shrink-0">
          <LayerButton
            icon={Layout}
            label="项目"
            active={leftPanelLayer === 'projects'}
            onClick={() => setLeftPanelLayer('projects')}
          />
          <LayerButton
            icon={BookMarked}
            label="知识库"
            active={leftPanelLayer === 'knowledge'}
            onClick={() => setLeftPanelLayer('knowledge')}
            disabled={!currentNovel}
          />
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-hidden">
          {leftPanelLayer === 'projects' ? (
            <ProjectsPanel
              novels={sortedNovels}
              currentNovelId={currentNovelId}
              onSelect={(id) => { setCurrentNovel(id); setLeftPanelLayer('knowledge'); }}
              onDelete={deleteNovel}
              onCreate={() => setShowCreate(true)}
            />
          ) : (
            <KnowledgePanel
              novel={currentNovel}
              activeTab={knowledgeBaseTab}
              onTabChange={setKnowledgeBaseTab}
              onChapterClick={(chId) => { setSelectedChapterId(chId); setEditorMode('chapter-edit'); }}
            />
          )}
        </div>
      </aside>

      {showCreate && (
        <CreateNovelDialog open={showCreate} onOpenChange={(v) => setShowCreate(v)} />
      )}
    </>
  );
}

// ─── Layer toggle button ───────────────────────────────────
function LayerButton({ icon: Icon, label, active, onClick, disabled }: {
  icon: LucideIcon; label: string; active: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all duration-200 border-b-2',
        active
          ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      <Icon size={13} strokeWidth={1.5} />
      {label}
    </button>
  );
}

// ─── Projects Panel ────────────────────────────────────────
function ProjectsPanel({ novels, currentNovelId, onSelect, onDelete, onCreate }: {
  novels: import('@/types').Novel[];
  currentNovelId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5">
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-primary)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all duration-200"
        >
          <Plus size={13} strokeWidth={1.5} />
          新建小说
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {novels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-[var(--color-text-dim)]">
            <BookOpen size={28} strokeWidth={1} />
            <p className="text-xs">还没有作品</p>
          </div>
        ) : (
          novels.map((novel) => {
            const color = COVER_PALETTE[parseInt(novel.id.slice(0, 4), 16) % COVER_PALETTE.length];
            const initials = novel.title.slice(0, 2);
            return (
              <div
                key={novel.id}
                onClick={() => onSelect(novel.id)}
                className={cn(
                  'group flex items-center gap-2.5 p-2 rounded-[var(--radius-md)] cursor-pointer transition-all duration-200',
                  currentNovelId === novel.id
                    ? 'bg-[var(--color-bg-elevated)] ring-1 ring-[var(--color-accent)]/30'
                    : 'hover:bg-[var(--color-bg-hover)]'
                )}
              >
                <div
                  className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                    {novel.title}
                  </h3>
                  <p className="text-[10px] text-[var(--color-text-dim)]">
                    {novel.chapters.length} 章 · {novel.genre || '未分类'}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(novel.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-dim)] hover:text-[var(--color-red)] transition-all duration-200"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Knowledge Base Panel ──────────────────────────────────
const KB_TABS: { id: KnowledgeBaseTab; icon: LucideIcon; label: string }[] = [
  { id: 'outline', icon: ListTree, label: '篇幅大纲' },
  { id: 'characters', icon: Users, label: '角色' },
  { id: 'worldbuilding', icon: Globe, label: '世界观' },
];

const PIPELINE_ICONS: Record<PipelineStage, LucideIcon> = {
  outline: ListTree,
  characters: Users,
  beats: GanttChart,
  drafting: Pen,
  polish: Sparkles,
};

function KnowledgePanel({ novel, activeTab, onTabChange, onChapterClick }: {
  novel: import('@/types').Novel | undefined;
  activeTab: KnowledgeBaseTab;
  onTabChange: (tab: KnowledgeBaseTab) => void;
  onChapterClick: (chId: string) => void;
}) {
  if (!novel) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--color-text-dim)] px-4 text-center">
        <BookMarked size={28} strokeWidth={1} />
        <p className="text-xs leading-relaxed">选择一本小说后<br />查看知识库</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Pipeline mini indicator */}
      <div className="px-3 py-2 border-b border-[var(--color-border-secondary)]">
        <div className="flex items-center gap-1.5">
          {PIPELINE_STAGES.map((stage, i) => {
            const Icon = PIPELINE_ICONS[stage.id];
            const done = novel.pipelineCompleted?.includes(stage.id);
            const current = (novel.pipelineStage || 'outline') === stage.id;
            return (
              <div key={stage.id} className="flex items-center gap-1.5">
                {i > 0 && (
                  <div className={cn(
                    'w-2 h-px',
                    done ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-primary)]'
                  )} />
                )}
                <div
                  className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200',
                    done && 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]',
                    current && !done && 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/40',
                    !done && !current && 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-dim)]'
                  )}
                  title={`${stage.label}: ${stage.desc}`}
                >
                  <Icon size={9} strokeWidth={2} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[var(--color-border-secondary)]">
        {KB_TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium transition-all duration-200 border-b-2',
              activeTab === id
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            )}
          >
            <Icon size={11} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'outline' && <OutlineTab novel={novel} onChapterClick={onChapterClick} />}
        {activeTab === 'characters' && <CharactersTab novel={novel} />}
        {activeTab === 'worldbuilding' && <WorldBuildingTab novel={novel} />}
      </div>
    </div>
  );
}

// ─── Knowledge: Outline Tab ────────────────────────────────
function OutlineTab({ novel, onChapterClick }: {
  novel: Novel;
  onChapterClick: (chId: string) => void;
}) {
  const apiConfig = useNovelStore((s) => s.apiConfig);
  const hasApiKey = !!apiConfig.key;
  const setVolumeChapters = useNovelStore((s) => s.setVolumeChapters);
  const addFrameworkVolume = useNovelStore((s) => s.addFrameworkVolume);
  const deleteFrameworkVolume = useNovelStore((s) => s.deleteFrameworkVolume);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['volumes']));
  const [controllerOpen, setControllerOpen] = useState<Record<string, boolean>>({});
  const [chapterCounts, setChapterCounts] = useState<Record<string, string>>({});
  const [overflowFlags, setOverflowFlags] = useState<Record<string, boolean>>({});
  const [isDeducing, setIsDeducing] = useState<Record<string, boolean>>({});
  const [deduceErrors, setDeduceErrors] = useState<Record<string, string>>({});
  const abortRef = useRef<Record<string, AbortController>>({});

  // ── New volume creation state ──
  const [showAddVolume, setShowAddVolume] = useState(false);
  const [addVolumeMode, setAddVolumeMode] = useState<'manual' | 'ai'>('manual');
  const [newVolume, setNewVolume] = useState({
    title: '', arc: '发展', theme: '', synopsis: '', mainConflict: '', volumeEnding: '', chapterCount: '12',
  });
  const [aiHint, setAiHint] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  // ── 新增篇 handler：手动 ──
  const handleAddVolumeManual = () => {
    const vols = novel.novelFramework?.volumes ?? [];
    const lastVol = vols[vols.length - 1];
    const nextStart = lastVol ? lastVol.chapterRange[1] + 1 : 1;
    const count = Math.max(1, Math.min(100, parseInt(newVolume.chapterCount, 10) || 12));
    const vol: FrameworkVolume = {
      id: `vol-${String(vols.length + 1).padStart(2, '0')}`,
      title: newVolume.title || `第${vols.length + 1}篇`,
      arc: newVolume.arc || '发展',
      chapterRange: [nextStart, nextStart + count - 1],
      theme: newVolume.theme,
      synopsis: newVolume.synopsis,
      mainConflict: newVolume.mainConflict,
      volumeEnding: newVolume.volumeEnding,
    };
    addFrameworkVolume(novel.id, vol);
    setShowAddVolume(false);
    setNewVolume({ title: '', arc: '发展', theme: '', synopsis: '', mainConflict: '', volumeEnding: '', chapterCount: '12' });
  };

  // ── 新增篇 handler：AI 生成 ──
  const handleAddVolumeAI = async () => {
    const fw = novel.novelFramework;
    if (!fw) return;
    setAiGenerating(true);
    setAiError('');
    try {
      const { generateNextVolume } = await import('@/services/volume-deduce');
      const result = await generateNextVolume(apiConfig, fw, aiHint);
      const vols = fw.volumes ?? [];
      const lastVol = vols[vols.length - 1];
      const nextStart = lastVol ? lastVol.chapterRange[1] + 1 : 1;
      const vol: FrameworkVolume = {
        id: `vol-${String(vols.length + 1).padStart(2, '0')}`,
        title: result.title,
        arc: result.arc,
        chapterRange: [nextStart, nextStart + 11],
        theme: result.theme,
        synopsis: result.synopsis,
        mainConflict: result.mainConflict,
        volumeEnding: result.volumeEnding,
      };
      addFrameworkVolume(novel.id, vol);
      setShowAddVolume(false);
      setAiHint('');
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI 生成失败，请重试');
    } finally {
      setAiGenerating(false);
    }
  };

  const toggle = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const volumes: FrameworkVolume[] = novel.novelFramework?.volumes ?? [];
  const volumeChapters = novel.volumeChapters ?? {};
  const hasFrameworkVolumes = volumes.length > 0;
  const inspiration = novel.inspirationText || novel.description || '';
  const tropeTag = novel.tropeTag || '';

  const toggleController = useCallback((volumeId: string) => {
    setControllerOpen((prev) => ({ ...prev, [volumeId]: !prev[volumeId] }));
    setDeduceErrors((prev) => { const n = { ...prev }; delete n[volumeId]; return n; });
  }, []);

  const handleCountChange = useCallback((volumeId: string, raw: string) => {
    setOverflowFlags((prev) => { const n = { ...prev }; delete n[volumeId]; return n; });
    if (raw === '') {
      setChapterCounts((prev) => ({ ...prev, [volumeId]: '' }));
      return;
    }
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;
    if (num > 100) {
      setChapterCounts((prev) => ({ ...prev, [volumeId]: '100' }));
      setOverflowFlags((prev) => ({ ...prev, [volumeId]: true }));
      setTimeout(() => setOverflowFlags((prev) => { const n = { ...prev }; delete n[volumeId]; return n; }), 1500);
    } else if (num < 1) {
      setChapterCounts((prev) => ({ ...prev, [volumeId]: '1' }));
    } else {
      setChapterCounts((prev) => ({ ...prev, [volumeId]: String(num) }));
    }
  }, []);

  const handleDeduce = useCallback(async (volumeId: string, volume: FrameworkVolume) => {
    if (!apiConfig.key) {
      setDeduceErrors((prev) => ({ ...prev, [volumeId]: '请先在设置中配置 API Key' }));
      setControllerOpen((prev) => ({ ...prev, [volumeId]: true }));
      return;
    }

    const raw = chapterCounts[volumeId];
    const count = raw ? parseInt(raw, 10) : (volume.chapterRange[1] - volume.chapterRange[0] + 1);
    const safeCount = Math.max(1, Math.min(100, isNaN(count) ? 12 : count));

    // Persist count to input
    setChapterCounts((prev) => ({ ...prev, [volumeId]: String(safeCount) }));
    setDeduceErrors((prev) => { const n = { ...prev }; delete n[volumeId]; return n; });

    // Abort previous
    abortRef.current[volumeId]?.abort();
    const controller = new AbortController();
    abortRef.current[volumeId] = controller;

    setIsDeducing((prev) => ({ ...prev, [volumeId]: true }));
    try {
      const chapters = await deduceChapters(apiConfig, inspiration, tropeTag, volume, safeCount, controller.signal);
      setVolumeChapters(novel.id, volumeId, chapters);
      setControllerOpen((prev) => { const n = { ...prev }; delete n[volumeId]; return n; });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : '推演失败';
      setDeduceErrors((prev) => ({ ...prev, [volumeId]: msg }));
    } finally {
      setIsDeducing((prev) => { const n = { ...prev }; delete n[volumeId]; return n; });
    }
  }, [apiConfig, inspiration, tropeTag, chapterCounts, setVolumeChapters, novel.id]);

  const sortedChapters = [...novel.chapters].sort((a, b) => a.order - b.order);

  return (
    <div className="p-2 space-y-1">
      {novel.description && (
        <CollapsibleSection icon={FileText} label="故事梗概" expanded={expandedSections.has('synopsis')} onToggle={() => toggle('synopsis')}>
          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{novel.description}</p>
        </CollapsibleSection>
      )}

      {novel.generationOutline?.outline && (
        <CollapsibleSection icon={Zap} label="核心大纲" expanded={expandedSections.has('outline')} onToggle={() => toggle('outline')}>
          <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed whitespace-pre-wrap">{novel.generationOutline.outline}</p>
        </CollapsibleSection>
      )}

      {(novel.timeline?.length ?? 0) > 0 && (
        <CollapsibleSection icon={Clock} label="五段时间线" expanded={expandedSections.has('timeline')} onToggle={() => toggle('timeline')}>
          <div className="space-y-1.5">
            {novel.timeline.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] mt-1 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-[var(--color-text-primary)]">{t.phase}：{t.event}</span>
                  <p className="text-[10px] text-[var(--color-text-dim)]">{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ── 篇级大纲目录（框架卷）vs 平铺章节目录 ── */}
      {hasFrameworkVolumes ? (
        <VolumeTreeSection
          volumes={volumes}
          volumeChapters={volumeChapters}
          controllerOpen={controllerOpen}
          chapterCounts={chapterCounts}
          overflowFlags={overflowFlags}
          isDeducing={isDeducing}
          deduceErrors={deduceErrors}
          hasApiKey={hasApiKey}
          novelChapters={sortedChapters}
          onChapterClick={onChapterClick}
          onToggleController={toggleController}
          onCountChange={handleCountChange}
          onDeduce={handleDeduce}
          showAddVolume={showAddVolume}
          addVolumeMode={addVolumeMode}
          newVolume={newVolume}
          aiHint={aiHint}
          aiGenerating={aiGenerating}
          aiError={aiError}
          onShowAddVolume={setShowAddVolume}
          onAddVolumeMode={setAddVolumeMode}
          onNewVolumeChange={(f) => setNewVolume((prev) => ({ ...prev, ...f }))}
          onAiHintChange={setAiHint}
          onAddManual={handleAddVolumeManual}
          onAddAI={handleAddVolumeAI}
          onDeleteVolume={(vid) => deleteFrameworkVolume(novel.id, vid)}
        />
      ) : (
        <CollapsibleSection icon={ListTree} label={`篇幅大纲目录 (${sortedChapters.length})`} expanded={expandedSections.has('chapters')} onToggle={() => toggle('chapters')}>
          <div className="space-y-0.5">
            {sortedChapters.map((ch) => {
              const stageId = Math.min(Math.floor(ch.order / 2) + 1, 5);
              const stageColors = ['#5c9ce6', '#d4a44c', '#e0556a', '#7c7cf8', '#4caf90'];
              return (
                <button
                  key={ch.id}
                  onClick={() => onChapterClick(ch.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] transition-all duration-200 text-left group"
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: stageColors[stageId - 1] }} />
                  <span className="text-[11px] text-[var(--color-text-secondary)] truncate flex-1 group-hover:text-[var(--color-text-primary)]">
                    {ch.order + 1}. {ch.title}
                  </span>
                  {ch.content && <span className="text-[9px] text-[var(--color-text-dim)]">{ch.content.length}字</span>}
                  {ch.content && <div className="w-1 h-1 rounded-full bg-[var(--color-green)] shrink-0" />}
                </button>
              );
            })}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

// ─── 篇级大纲目录树 ──────────────────────────────────────
function VolumeTreeSection({
  volumes, volumeChapters, controllerOpen, chapterCounts, overflowFlags,
  isDeducing, deduceErrors, hasApiKey, novelChapters, onChapterClick, onToggleController, onCountChange, onDeduce,
  showAddVolume, addVolumeMode, newVolume, aiHint, aiGenerating, aiError,
  onShowAddVolume, onAddVolumeMode, onNewVolumeChange, onAiHintChange,
  onAddManual, onAddAI, onDeleteVolume,
}: {
  volumes: FrameworkVolume[];
  volumeChapters: Record<string, VolumeChapter[]>;
  controllerOpen: Record<string, boolean>;
  chapterCounts: Record<string, string>;
  overflowFlags: Record<string, boolean>;
  isDeducing: Record<string, boolean>;
  deduceErrors: Record<string, string>;
  hasApiKey: boolean;
  novelChapters: Chapter[];
  onChapterClick: (chId: string) => void;
  onToggleController: (id: string) => void;
  onCountChange: (id: string, val: string) => void;
  onDeduce: (id: string, volume: FrameworkVolume) => void;
  // New volume creation
  showAddVolume: boolean;
  addVolumeMode: 'manual' | 'ai';
  newVolume: { title: string; arc: string; theme: string; synopsis: string; mainConflict: string; volumeEnding: string; chapterCount: string };
  aiHint: string;
  aiGenerating: boolean;
  aiError: string;
  onShowAddVolume: (v: boolean) => void;
  onAddVolumeMode: (m: 'manual' | 'ai') => void;
  onNewVolumeChange: (f: Partial<typeof newVolume>) => void;
  onAiHintChange: (v: string) => void;
  onAddManual: () => void;
  onAddAI: () => void;
  onDeleteVolume: (vid: string) => void;
}) {
  const totalDeduced = Object.values(volumeChapters).reduce((sum, chs) => sum + chs.length, 0);
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border-primary)] overflow-hidden transition-all duration-200">
      <div className="flex items-center gap-1.5 px-2.5 py-2 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border-secondary)]">
        <ListTree size={11} className="text-[var(--color-text-dim)] shrink-0" />
        <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">篇级大纲目录</span>
        <span className="text-[10px] text-[var(--color-text-dim)] ml-auto">
          {volumes.length} 篇{totalDeduced > 0 ? ` · ${totalDeduced} 细化章` : ''}
        </span>
      </div>

      <div className="divide-y divide-[var(--color-border-secondary)]">
        {volumes.map((vol) => (
          <VolumeNode
            key={vol.id}
            volume={vol}
            chapters={volumeChapters[vol.id] ?? []}
            controllerOpen={!!controllerOpen[vol.id]}
            chapterCount={chapterCounts[vol.id] ?? String(vol.chapterRange[1] - vol.chapterRange[0] + 1)}
            isOverflow={!!overflowFlags[vol.id]}
            isDeducing={!!isDeducing[vol.id]}
            deduceError={deduceErrors[vol.id] ?? ''}
            hasApiKey={hasApiKey}
            novelChapters={novelChapters}
            onChapterClick={onChapterClick}
            onToggleController={() => onToggleController(vol.id)}
            onCountChange={(v) => onCountChange(vol.id, v)}
            onDeduce={() => onDeduce(vol.id, vol)}
            onDeleteVolume={() => onDeleteVolume(vol.id)}
          />
        ))}
      </div>

      {/* ── 新增篇幅按钮 + 表单 ── */}
      <div className="border-t border-[var(--color-border-secondary)]">
        {!showAddVolume ? (
          <button
            onClick={() => onShowAddVolume(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-all duration-200"
          >
            <Plus size={12} strokeWidth={1.5} /> 新增篇幅
          </button>
        ) : (
          <div className="px-2.5 py-2.5 space-y-2 animate-fade-in">
            {/* Mode toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => onAddVolumeMode('manual')}
                className={cn(
                  'flex-1 py-1 text-[10px] font-medium rounded-[var(--radius-sm)] transition-all duration-200',
                  addVolumeMode === 'manual'
                    ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border border-[var(--color-border-primary)]'
                )}
              >
                ✏️ 自定义
              </button>
              <button
                onClick={() => onAddVolumeMode('ai')}
                className={cn(
                  'flex-1 py-1 text-[10px] font-medium rounded-[var(--radius-sm)] transition-all duration-200',
                  addVolumeMode === 'ai'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border border-[var(--color-border-primary)]'
                )}
              >
                🤖 AI 生成
              </button>
            </div>

            {addVolumeMode === 'manual' ? (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    value={newVolume.title}
                    onChange={(e) => onNewVolumeChange({ title: e.target.value })}
                    placeholder="篇名（如：觉醒篇）"
                    className="px-2 py-1 text-[10px] rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50"
                  />
                  <input
                    value={newVolume.arc}
                    onChange={(e) => onNewVolumeChange({ arc: e.target.value })}
                    placeholder="弧线（如：承接/转折）"
                    className="px-2 py-1 text-[10px] rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50"
                  />
                </div>
                <input
                  value={newVolume.chapterCount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || (/^\d+$/.test(v) && parseInt(v) <= 100)) onNewVolumeChange({ chapterCount: v });
                  }}
                  onBlur={(e) => {
                    const num = parseInt(e.target.value, 10);
                    if (isNaN(num) || num < 1) onNewVolumeChange({ chapterCount: '12' });
                    else if (num > 100) onNewVolumeChange({ chapterCount: '100' });
                  }}
                  placeholder="章数"
                  className="w-full px-2 py-1 text-[10px] font-mono rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50"
                />
                <input
                  value={newVolume.theme}
                  onChange={(e) => onNewVolumeChange({ theme: e.target.value })}
                  placeholder="本篇主题（20字以内）"
                  className="w-full px-2 py-1 text-[10px] rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50"
                />
                <textarea
                  value={newVolume.synopsis}
                  onChange={(e) => onNewVolumeChange({ synopsis: e.target.value })}
                  placeholder="本篇概要（60-100字）"
                  rows={2}
                  className="w-full px-2 py-1 text-[10px] rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50 resize-none"
                />
                <textarea
                  value={newVolume.mainConflict}
                  onChange={(e) => onNewVolumeChange({ mainConflict: e.target.value })}
                  placeholder="核心冲突（50-80字）"
                  rows={2}
                  className="w-full px-2 py-1 text-[10px] rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50 resize-none"
                />
                <textarea
                  value={newVolume.volumeEnding}
                  onChange={(e) => onNewVolumeChange({ volumeEnding: e.target.value })}
                  placeholder="篇末大结局/最高潮（50-80字）"
                  rows={2}
                  className="w-full px-2 py-1 text-[10px] rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50 resize-none"
                />
              </>
            ) : (
              <>
                <textarea
                  value={aiHint}
                  onChange={(e) => onAiHintChange(e.target.value)}
                  placeholder="补充提示（可选）：如'希望本篇聚焦学院对抗，引入新反派'…"
                  rows={2}
                  className="w-full px-2 py-1 text-[10px] rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50 resize-none"
                />
                {aiError && (
                  <p className="text-[9px] text-[var(--color-red)] leading-relaxed">{aiError}</p>
                )}
                {aiGenerating && (
                  <div className="flex items-center gap-2 px-1">
                    <Loader2 size={10} className="text-amber-400 animate-spin shrink-0" />
                    <span className="text-[10px] text-amber-400/80">DeepSeek 正在构思新篇大纲…</span>
                  </div>
                )}
              </>
            )}

            {/* Action buttons */}
            <div className="flex gap-1.5">
              <button
                onClick={() => { onShowAddVolume(false); onAiHintChange(''); }}
                className="flex-1 py-1 text-[10px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-[var(--color-border-primary)] rounded-[var(--radius-sm)] transition-all duration-200"
              >
                取消
              </button>
              {addVolumeMode === 'manual' ? (
                <button
                  onClick={onAddManual}
                  className="flex-1 py-1 text-[10px] font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 rounded-[var(--radius-sm)] hover:bg-[var(--color-accent)]/20 transition-all duration-200"
                >
                  添加篇幅
                </button>
              ) : (
                <button
                  onClick={onAddAI}
                  disabled={aiGenerating}
                  className={cn(
                    'flex-1 py-1 text-[10px] font-medium rounded-[var(--radius-sm)] transition-all duration-200',
                    aiGenerating
                      ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-dim)] cursor-wait'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25',
                  )}
                >
                  {aiGenerating ? '生成中…' : '🪄 AI 推演新篇'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 单个篇节点 — 卷级控制器 + 章列表 ──────────────────
function VolumeNode({
  volume, chapters, controllerOpen, chapterCount, isOverflow, isDeducing, deduceError, hasApiKey,
  novelChapters, onChapterClick, onToggleController, onCountChange, onDeduce, onDeleteVolume,
}: {
  volume: FrameworkVolume;
  chapters: VolumeChapter[];
  controllerOpen: boolean;
  chapterCount: string;
  isOverflow: boolean;
  isDeducing: boolean;
  deduceError: string;
  hasApiKey: boolean;
  novelChapters: Chapter[];
  onChapterClick: (chId: string) => void;
  onToggleController: () => void;
  onCountChange: (val: string) => void;
  onDeduce: () => void;
  onDeleteVolume: () => void;
}) {
  const [expanded, setExpanded] = useState(chapters.length > 0);
  const hasChapters = chapters.length > 0;

  // Auto-expand when chapters are loaded
  useEffect(() => {
    if (hasChapters) setExpanded(true);
  }, [hasChapters]);

  const handleChapterClick = (deducedIndex: number) => {
    const order = volume.chapterRange[0] + deducedIndex;
    const target = novelChapters.find((c) => c.order === order);
    if (target) onChapterClick(target.id);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onDeduce();
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') return;
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;
    if (num > 100) {
      onCountChange('100');
    } else if (num < 1) {
      onCountChange('1');
    }
  };

  return (
    <div className="transition-all duration-200">
      {/* ── 篇头 ── */}
      <div className="group flex items-center gap-1.5 px-2.5 py-2 hover:bg-[var(--color-bg-hover)] transition-colors duration-200">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 text-[var(--color-text-dim)] hover:text-[var(--color-text-primary)] transition-colors shrink-0"
        >
          {expanded ? <ChevronDown size={11} strokeWidth={1.5} /> : <ChevronRight size={11} strokeWidth={1.5} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-[var(--color-text-primary)] truncate">
              {volume.title}
            </span>
            <span className="text-[9px] text-[var(--color-text-dim)] shrink-0">
              Ch.{volume.chapterRange[0]}–{volume.chapterRange[1]}
            </span>
          </div>
          <p className="text-[10px] text-[var(--color-text-dim)] truncate">{volume.theme}</p>
        </div>

        {/* Hover-triggered buttons */}
        <div className="ml-auto shrink-0 flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleController(); }}
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[10px] transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              'text-[var(--color-text-dim)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10',
            )}
            title="自定义细化章节"
          >
            <span>⚙️ 细化</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteVolume(); }}
            className={cn(
              'flex items-center px-1 py-0.5 rounded-[var(--radius-sm)] text-[10px] transition-all duration-200',
              'opacity-0 group-hover:opacity-100',
              'text-[var(--color-text-dim)] hover:text-[var(--color-red)] hover:bg-[var(--color-red)]/10',
            )}
            title="删除此篇"
          >
            <X size={10} strokeWidth={1.5} />
          </button>
        </div>

        {/* Deduced badge */}
        {hasChapters && (
          <span className="text-[9px] text-[var(--color-accent)]/70 shrink-0">{chapters.length}章</span>
        )}
      </div>

      {/* ── 内联控制器：流式展开 ── */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          controllerOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-2.5 pb-2.5 pt-1 border-t border-[var(--color-border-secondary)] bg-[var(--color-bg-tertiary)]/50 space-y-2">
            {!hasApiKey ? (
              <div className="flex items-center gap-2 py-1">
                <Zap size={12} className="text-[var(--color-accent)] shrink-0" />
                <span className="text-[10px] text-[var(--color-accent)] leading-relaxed">
                  请先在设置中配置 API Key 以启用推演
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex items-center gap-1.5">
                    <label className="text-[10px] text-[var(--color-text-muted)] shrink-0">章数</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={chapterCount}
                      onChange={(e) => onCountChange(e.target.value)}
                      onKeyDown={onKeyDown}
                      onBlur={onBlur}
                      className={cn(
                        'w-14 px-1.5 py-0.5 text-[11px] text-center rounded-[var(--radius-sm)] font-mono',
                        'bg-[var(--color-bg-primary)] border outline-none transition-colors duration-200',
                        isOverflow
                          ? 'border-[var(--color-red)] text-[var(--color-red)]'
                          : 'border-[var(--color-border-primary)] text-[var(--color-text-primary)] focus:border-[var(--color-accent)]',
                      )}
                    />
                    {isOverflow && (
                      <span className="text-[9px] text-[var(--color-red)] animate-fade-in">上限100</span>
                    )}
                  </div>

                  <button
                    onClick={onDeduce}
                    disabled={isDeducing}
                    className={cn(
                      'shrink-0 flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-[10px] font-medium transition-all duration-200',
                      isDeducing
                        ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-dim)] cursor-wait'
                        : 'bg-[var(--color-amber)]/15 text-[var(--color-amber)] hover:bg-[var(--color-amber)]/25 border border-[var(--color-amber)]/30',
                    )}
                  >
                    <Wand2 size={10} strokeWidth={1.5} className={isDeducing ? 'animate-spin' : ''} />
                    <span>🪄 一键推演</span>
                  </button>
                </div>

                {deduceError && (
                  <p className="text-[10px] text-[var(--color-red)] leading-relaxed">{deduceError}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 局部 Loading 态 ── */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isDeducing ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-2.5 py-2.5 border-t border-[var(--color-border-secondary)]">
            <div className="flex items-center gap-2">
              <Loader2 size={11} className="text-[var(--color-accent)] animate-spin" />
              <span className="text-[10px] text-[var(--color-accent)]/80">
                ⚡ DeepSeek 正在基于本篇大纲反向解构微观章/节...
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-hover)] animate-pulse"
                  style={{ width: `${85 - i * 12}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 章节列表：平滑揭幕 ── */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          expanded && hasChapters ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[var(--color-border-secondary)] bg-[var(--color-bg-tertiary)]/30">
            <div className="px-1 py-1 space-y-0">
              {chapters.map((ch, i) => (
                <button
                  key={ch.id}
                  onClick={() => handleChapterClick(i)}
                  className="group/ch flex items-start gap-2 px-1.5 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] transition-colors duration-200 w-full text-left cursor-pointer"
                >
                  <span className="text-[9px] font-mono text-[var(--color-text-dim)] mt-0.5 shrink-0 w-5 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-[var(--color-text-primary)] truncate leading-tight group-hover/ch:text-[var(--color-accent)] transition-colors">
                      {ch.chapterTitle}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-dim)] truncate leading-relaxed mt-0.5">
                      {ch.microPlot}
                    </p>
                    {ch.cliffhangerPoint && (
                      <p className="text-[9px] text-[var(--color-red)]/60 truncate leading-relaxed mt-0.5">
                        ⚡ {ch.cliffhangerPoint}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 空状态（无细化章且未推演中） ── */}
      {!hasChapters && !isDeducing && expanded && (
        <div className="px-2.5 py-3 border-t border-[var(--color-border-secondary)] text-center">
          <p className="text-[10px] text-[var(--color-text-dim)]">
            悬停篇名，点击 ⚙️ 细化章节 推演章节目录
          </p>
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ icon: Icon, label, expanded, onToggle, children }: {
  icon: LucideIcon; label: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border-primary)] overflow-hidden transition-all duration-200">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-2.5 py-2 hover:bg-[var(--color-bg-hover)] transition-colors duration-200"
      >
        <Icon size={11} className="text-[var(--color-text-dim)] shrink-0" />
        <span className="text-[11px] font-medium text-[var(--color-text-secondary)] flex-1 text-left">{label}</span>
        {expanded ? <ChevronDown size={11} className="text-[var(--color-text-dim)]" /> : <ChevronRight size={11} className="text-[var(--color-text-dim)]" />}
      </button>
      {expanded && (
        <div className="px-2.5 pb-2.5 border-t border-[var(--color-border-secondary)] animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Knowledge: Characters Tab ─────────────────────────────
function CharactersTab({ novel }: {
  novel: Novel;
}) {
  const addCharacter = useNovelStore((s) => s.addCharacter);
  const deleteCharacter = useNovelStore((s) => s.deleteCharacter);
  const awakenWorldBibleFromFramework = useNovelStore((s) => s.awakenWorldBibleFromFramework);
  const setWorldBibleAwakened = useUIStore((s) => s.setWorldBibleAwakened);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [awakening, setAwakening] = useState(false);

  const handleAwaken = () => {
    setAwakening(true);
    awakenWorldBibleFromFramework(novel.id);
    setWorldBibleAwakened(true);
    setTimeout(() => setAwakening(false), 600);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addCharacter(novel.id, { name: newName.trim(), role: newRole.trim(), description: newDesc.trim(), traits: [] });
    setNewName(''); setNewRole(''); setNewDesc(''); setShowAdd(false);
  };

  const protagonist = novel.protagonist;

  const fw = novel.novelFramework;
  const hasFramework = !!fw;
  const hasCharData = !!novel.protagonist || novel.characters.length > 0;

  return (
    <div className="p-2 space-y-2">
      {/* Framework awaken button — only when framework exists but no character data imported */}
      {hasFramework && !hasCharData && (
        <div className="p-2.5 rounded-[var(--radius-md)] border border-amber-500/20 bg-amber-500/5 animate-fade-in">
          <p className="text-[10px] text-[var(--color-text-dim)] mb-2 leading-relaxed">
            完整框架已就绪，可从框架中一键提取主角档案与角色列表
          </p>
          <button
            onClick={handleAwaken}
            disabled={awakening}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-[var(--radius-sm)] text-[10px] font-medium transition-all duration-200',
              awakening
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/50',
            )}
          >
            <Wand2 size={10} strokeWidth={1.5} className={awakening ? '' : ''} />
            {awakening ? '✓ 角色数据已导入' : '📖 从框架导入角色设定'}
          </button>
        </div>
      )}

      {protagonist && (
        <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-accent)]/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold text-[var(--color-accent)]">主角</span>
          </div>
          <h4 className="text-xs font-medium text-[var(--color-text-primary)]">{protagonist.name}</h4>
          <p className="text-[10px] text-[var(--color-text-dim)]">{protagonist.gender} · {protagonist.age}岁</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1 leading-relaxed">{protagonist.personality}</p>
          {protagonist.abilities && <p className="text-[10px] text-[var(--color-accent)]/80 mt-0.5">能力：{protagonist.abilities}</p>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-[var(--color-text-muted)]">自定义角色 ({novel.characters.length})</span>
        <button onClick={() => setShowAdd(!showAdd)} className="p-0.5 text-[var(--color-text-dim)] hover:text-[var(--color-accent)] transition-colors">
          <Plus size={12} />
        </button>
      </div>

      {showAdd && (
        <div className="space-y-1.5 p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] animate-fade-in">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="角色名" className="w-full text-[11px] px-2 py-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]" />
          <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="身份 (如：导师、反派)" className="w-full text-[11px] px-2 py-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]" />
          <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="简短描述..." rows={2} className="w-full text-[11px] px-2 py-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] resize-none" />
          <div className="flex gap-1.5">
            <button onClick={handleAdd} className="flex-1 py-1 text-[10px] font-medium bg-[var(--color-accent)] text-[#0b0b0f] rounded transition-colors hover:opacity-90">添加</button>
            <button onClick={() => setShowAdd(false)} className="px-2 py-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"><X size={12} /></button>
          </div>
        </div>
      )}

      {novel.characters.length === 0 && !showAdd && (
        <p className="text-[10px] text-[var(--color-text-dim)] text-center py-4">还没有自定义角色</p>
      )}

      <div className="space-y-1">
        {novel.characters.map((ch) => (
          <div key={ch.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] transition-colors">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-[var(--color-text-primary)]">{ch.name}</span>
              {ch.role && <span className="text-[10px] text-[var(--color-text-dim)] ml-1.5">{ch.role}</span>}
            </div>
            <button onClick={() => deleteCharacter(novel.id, ch.id)} className="opacity-0 group-hover:opacity-100 text-[var(--color-text-dim)] hover:text-[var(--color-red)] transition-all">
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Knowledge: World Building Tab ─────────────────────────
const WORLD_CATEGORIES: { id: WorldSetting['category']; label: string; icon: LucideIcon }[] = [
  { id: 'geography', label: '地理', icon: Map },
  { id: 'culture', label: '文化', icon: Building2 },
  { id: 'magic', label: '魔法/能力', icon: FlaskConical },
  { id: 'technology', label: '科技', icon: Zap },
  { id: 'history', label: '历史', icon: History },
  { id: 'faction', label: '势力', icon: Users },
  { id: 'other', label: '其他', icon: Globe },
];

function WorldBuildingTab({ novel }: {
  novel: Novel;
}) {
  const addWorldSetting = useNovelStore((s) => s.addWorldSetting);
  const deleteWorldSetting = useNovelStore((s) => s.deleteWorldSetting);
  const awakenWorldBibleFromFramework = useNovelStore((s) => s.awakenWorldBibleFromFramework);
  const setWorldBibleAwakened = useUIStore((s) => s.setWorldBibleAwakened);
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat] = useState<WorldSetting['category']>('geography');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [awakening, setAwakening] = useState(false);

  const handleAwaken = () => {
    setAwakening(true);
    awakenWorldBibleFromFramework(novel.id);
    setWorldBibleAwakened(true);
    setTimeout(() => setAwakening(false), 600);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addWorldSetting(novel.id, { category: newCat, title: newTitle.trim(), content: newContent.trim() });
    setNewTitle(''); setNewContent(''); setShowAdd(false);
  };

  const worldText = novel.worldBuildingText;
  const fw = novel.novelFramework;
  const hasFramework = !!fw;
  const hasWorldData = !!worldText || novel.worldSettings.length > 0;

  return (
    <div className="p-2 space-y-2">
      {/* Framework awaken button — only when framework exists but no world data imported */}
      {hasFramework && !hasWorldData && (
        <div className="p-2.5 rounded-[var(--radius-md)] border border-purple-500/20 bg-purple-500/5 animate-fade-in">
          <p className="text-[10px] text-[var(--color-text-dim)] mb-2 leading-relaxed">
            完整框架已就绪，可从框架中一键提取世界观、势力与能力体系
          </p>
          <button
            onClick={handleAwaken}
            disabled={awakening}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-[var(--radius-sm)] text-[10px] font-medium transition-all duration-200',
              awakening
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/30 hover:border-purple-500/50',
            )}
          >
            <Globe size={10} strokeWidth={1.5} />
            {awakening ? '✓ 世界观数据已导入' : '🌍 从框架导入世界观设定'}
          </button>
        </div>
      )}

      {worldText && (
        <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-purple)]/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Globe size={11} className="text-[var(--color-purple)]" />
            <span className="text-[10px] font-medium text-[var(--color-purple)]">世界观设定</span>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">{worldText}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-[var(--color-text-muted)]">自定义设定 ({novel.worldSettings.length})</span>
        <button onClick={() => setShowAdd(!showAdd)} className="p-0.5 text-[var(--color-text-dim)] hover:text-[var(--color-accent)] transition-colors">
          <Plus size={12} />
        </button>
      </div>

      {showAdd && (
        <div className="space-y-1.5 p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] animate-fade-in">
          <select value={newCat} onChange={(e) => setNewCat(e.target.value as WorldSetting['category'])} className="w-full text-[11px] px-2 py-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none">
            {WORLD_CATEGORIES.map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}
          </select>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="设定名称" className="w-full text-[11px] px-2 py-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]" />
          <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="详细描述..." rows={2} className="w-full text-[11px] px-2 py-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] resize-none" />
          <div className="flex gap-1.5">
            <button onClick={handleAdd} className="flex-1 py-1 text-[10px] font-medium bg-[var(--color-accent)] text-[#0b0b0f] rounded transition-colors hover:opacity-90">添加</button>
            <button onClick={() => setShowAdd(false)} className="px-2 py-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={12} /></button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {novel.worldSettings.map((ws) => {
          const cat = WORLD_CATEGORIES.find((c) => c.id === ws.category);
          const CatIcon = cat?.icon || Globe;
          return (
            <div key={ws.id} className="group flex items-start gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] transition-colors">
              <CatIcon size={11} className="text-[var(--color-text-dim)] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] text-[var(--color-text-primary)]">{ws.title}</span>
                <p className="text-[10px] text-[var(--color-text-dim)] line-clamp-2">{ws.content}</p>
              </div>
              <button onClick={() => deleteWorldSetting(novel.id, ws.id)} className="opacity-0 group-hover:opacity-100 text-[var(--color-text-dim)] hover:text-[var(--color-red)] transition-all shrink-0"><X size={10} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
