'use client';

import { useState, useEffect } from 'react';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import { cn, formatDate } from '@/lib/utils';
import {
  Plus, Trash2, BookOpen, ChevronDown, ChevronRight,
  Layout, Users, Globe, ListTree, FileText, X,
  Map, Building2, FlaskConical, Zap, Clock, History,
  GanttChart, Pen, Sparkles, BookMarked,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WorldSetting, KnowledgeBaseTab, PipelineStage, Novel, TimelineNode, Chapter } from '@/types';
import { PIPELINE_STAGES } from '@/types';
import CreateNovelDialog from '@/components/novel/CreateNovelDialog';

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
  { id: 'outline', icon: ListTree, label: '大纲' },
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
            const current = novel.pipelineStage === stage.id;
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['chapters']));

  const toggle = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

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

      <CollapsibleSection icon={ListTree} label={`章节目录 (${sortedChapters.length})`} expanded={expandedSections.has('chapters')} onToggle={() => toggle('chapters')}>
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
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    addCharacter(novel.id, { name: newName.trim(), role: newRole.trim(), description: newDesc.trim(), traits: [] });
    setNewName(''); setNewRole(''); setNewDesc(''); setShowAdd(false);
  };

  const protagonist = novel.protagonist;

  return (
    <div className="p-2 space-y-2">
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
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat] = useState<WorldSetting['category']>('geography');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addWorldSetting(novel.id, { category: newCat, title: newTitle.trim(), content: newContent.trim() });
    setNewTitle(''); setNewContent(''); setShowAdd(false);
  };

  const worldText = novel.worldBuildingText;

  return (
    <div className="p-2 space-y-2">
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
