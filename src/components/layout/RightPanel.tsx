'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import { useDebouncedMemorySync, type DSMemoryNode } from '@/hooks/useDebouncedMemorySync';
import { cn } from '@/lib/utils';
import {
  Bot, BookOpen, Brain, ListTree, Sparkles, Copy, Check, X,
  ChevronDown, ChevronRight, FileText, RefreshCw, Eye, Columns,
  MessageSquare, Zap, ArrowDownToLine, Clock, Trash2, Loader2, Telescope,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AICard, AICardType, GrowthStageId } from '@/types';
import { GROWTH_STAGES, getStageForChapter } from '@/services/writing-framework';

type RPTab = 'ai-assistant' | 'story-bible' | 'memory' | 'toc';

const RP_TABS: { id: RPTab; icon: LucideIcon; label: string }[] = [
  { id: 'ai-assistant', icon: Bot, label: 'AI 助手' },
  { id: 'story-bible', icon: BookOpen, label: '圣经' },
  { id: 'memory', icon: Brain, label: '记忆' },
  { id: 'toc', icon: ListTree, label: '目录' },
];

const CARD_TYPE_CONFIG: Record<AICardType, { icon: typeof Sparkles; label: string; accent: string }> = {
  'generated-text': { icon: FileText, label: '章节生成', accent: '#4caf90' },
  'continue': { icon: ArrowDownToLine, label: '续写', accent: '#5c9ce6' },
  'rewrite': { icon: RefreshCw, label: '改写', accent: '#7c7cf8' },
  'sensory': { icon: Eye, label: '五感描写', accent: '#d4a44c' },
  'vote-request': { icon: MessageSquare, label: '求票文案', accent: '#e0556a' },
};

export default function RightPanel() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const currentNovel = useNovelStore((s) => s.currentNovel());
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const worldBibleAwakened = useUIStore((s) => s.worldBibleAwakened);
  const setWorldBibleAwakened = useUIStore((s) => s.setWorldBibleAwakened);
  const aiCards = useUIStore((s) => s.aiCards);
  const removeAICard = useUIStore((s) => s.removeAICard);
  const markCardApplied = useUIStore((s) => s.markCardApplied);
  const clearAICards = useUIStore((s) => s.clearAICards);
  const setSelectedChapterId = useUIStore((s) => s.setSelectedChapterId);
  const setEditorMode = useUIStore((s) => s.setEditorMode);

  const [activeTab, setActiveTab] = useState<RPTab>('ai-assistant');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState<string | null>(null);

  // Get current chapter content for memory sync
  const chapters = currentNovel?.chapters ?? [];
  const selectedChapterId = useUIStore((s) => s.selectedChapterId);
  const currentChapter = chapters.find((c) => c.id === selectedChapterId);
  const { nodes, isSyncing, lastSync } = useDebouncedMemorySync(currentChapter?.content || '', 2500);

  if (!mounted) return null;
  if (!rightPanelOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // TOC chapter click → navigate editor + auto-switch to AI assistant
  const handleTocChapterClick = (chId: string) => {
    setSelectedChapterId(chId);
    setEditorMode('chapter-edit');
    setActiveTab('ai-assistant');
  };

  return (
    <aside className="w-72 shrink-0 border-l border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex flex-col h-full animate-fade-in">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--color-border-secondary)] shrink-0">
        {RP_TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-all duration-200 border-b-2',
              activeTab === id
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            )}
            title={label}
          >
            <Icon size={14} strokeWidth={1.5} />
            <span className="leading-none">{label}</span>
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {!currentNovel && <EmptyState icon={Sparkles} text="选择小说后使用辅助工具" />}

        {currentNovel && activeTab === 'ai-assistant' && (
          <AIAssistantPanel
            aiCards={aiCards}
            expandedCards={expandedCards}
            compareMode={compareMode}
            memoryNodes={nodes}
            isSyncing={isSyncing}
            lastSync={lastSync}
            onToggleExpand={toggleExpand}
            onToggleCompare={(id) => setCompareMode(compareMode === id ? null : id)}
            onRemoveCard={removeAICard}
            onApplyCard={markCardApplied}
            onClearCards={clearAICards}
          />
        )}

        {currentNovel && activeTab === 'story-bible' && (
          <div className="relative h-full">
            <StoryBiblePanel novel={currentNovel} />
            {!worldBibleAwakened && (
              <WorldBibleBlurOverlay onActivate={() => setWorldBibleAwakened(true)} />
            )}
          </div>
        )}

        {currentNovel && activeTab === 'memory' && (
          <div className="relative h-full">
            <MemoryPanel novel={currentNovel} memoryNodes={nodes} isSyncing={isSyncing} />
            {!worldBibleAwakened && (
              <WorldBibleBlurOverlay onActivate={() => setWorldBibleAwakened(true)} />
            )}
          </div>
        )}

        {currentNovel && activeTab === 'toc' && (
          <TOCPanel
            novel={currentNovel}
            selectedChapterId={selectedChapterId}
            onChapterClick={handleTocChapterClick}
          />
        )}
      </div>
    </aside>
  );
}

// ─── Empty State ───────────────────────────────────────────
function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--color-text-dim)] px-4 text-center">
      <Icon size={28} strokeWidth={1} />
      <p className="text-xs leading-relaxed">{text}</p>
    </div>
  );
}

// ─── AI Assistant Panel (cards + memory) ──────────────────
function AIAssistantPanel({ aiCards, expandedCards, compareMode, memoryNodes, isSyncing, lastSync, onToggleExpand, onToggleCompare, onRemoveCard, onApplyCard, onClearCards }: {
  aiCards: AICard[];
  expandedCards: Set<string>;
  compareMode: string | null;
  memoryNodes: DSMemoryNode[];
  isSyncing: boolean;
  lastSync: number | null;
  onToggleExpand: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onRemoveCard: (id: string) => void;
  onApplyCard: (id: string) => void;
  onClearCards: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Memory sync indicator */}
      <div className="px-3 py-2 border-b border-[var(--color-border-secondary)] flex items-center gap-2">
        <div className={cn(
          'w-1.5 h-1.5 rounded-full transition-all duration-300',
          isSyncing ? 'bg-[var(--color-accent)] animate-breathing' : 'bg-[var(--color-text-dim)]'
        )} />
        <span className="text-[10px] text-[var(--color-text-dim)]">
          {isSyncing ? '同步中...' : lastSync ? `已同步 ${new Date(lastSync).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '记忆就绪'}
        </span>
      </div>

      {/* Memory nodes — DeepSeek 增量记忆 */}
      {memoryNodes.length > 0 && (
        <div className="p-2 space-y-1.5 border-b border-[var(--color-border-secondary)]">
          <div className="flex items-center gap-1.5 px-1.5">
            <Brain size={10} className="text-[var(--color-accent)]" />
            <span className="text-[9px] text-[var(--color-text-dim)] uppercase tracking-wider">DeepSeek 增量记忆</span>
          </div>
          {memoryNodes.map((n) => (
            <div key={n.id} className="px-1.5 py-1 animate-fade-in">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-medium text-[var(--color-text-primary)]">{n.label}</span>
                <span className="text-[9px] text-[var(--color-text-dim)]">{Math.round(n.confidence * 100)}%</span>
              </div>
              <div className="w-full h-0.5 rounded-full bg-[var(--color-bg-tertiary)] mb-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(n.confidence * 100)}%`,
                    backgroundColor: n.confidence > 0.6 ? 'var(--color-accent)' : n.confidence > 0.3 ? 'var(--color-amber-start)' : 'var(--color-text-dim)',
                  }}
                />
              </div>
              <p className="text-[10px] text-[var(--color-text-dim)] leading-relaxed">{n.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* Card stream header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={11} className="text-[var(--color-accent)]" />
          <span className="text-[10px] font-medium text-[var(--color-text-muted)]">输出流 ({aiCards.length})</span>
        </div>
        {aiCards.length > 0 && (
          <button onClick={onClearCards} className="text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-red)] transition-colors">清空</button>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {aiCards.length === 0 ? (
          <p className="text-[10px] text-[var(--color-text-dim)] text-center py-8">使用工具栏生成内容</p>
        ) : (
          aiCards.map((card) => (
            <AICardItem
              key={card.id}
              card={card}
              expanded={expandedCards.has(card.id)}
              onToggle={() => onToggleExpand(card.id)}
              onRemove={() => onRemoveCard(card.id)}
              onApply={() => onApplyCard(card.id)}
              compareMode={compareMode === card.id}
              onToggleCompare={() => onToggleCompare(card.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── AI Card Item ──────────────────────────────────────────
function AICardItem({ card, expanded, onToggle, onRemove, onApply, compareMode, onToggleCompare }: {
  card: AICard;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onApply: () => void;
  compareMode: boolean;
  onToggleCompare: () => void;
}) {
  const config = CARD_TYPE_CONFIG[card.type];
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(card.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeStr = new Date(card.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={cn(
      'rounded-[var(--radius-lg)] border transition-all duration-200 overflow-hidden',
      card.applied
        ? 'border-[var(--color-green)]/30 bg-[var(--color-green-bg)]/5'
        : 'border-[var(--color-border-primary)] glass-depth-1 hover:border-[var(--color-border-accent)]'
    )}>
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-bg-hover)]/50 transition-colors duration-200">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: config.accent }} />
        <config.icon size={12} className="text-[var(--color-text-dim)] shrink-0" />
        <span className="text-[11px] font-medium text-[var(--color-text-primary)] flex-1 truncate">{card.title}</span>
        <span className="text-[9px] text-[var(--color-text-dim)]">{timeStr}</span>
        {card.applied && <Check size={10} className="text-[var(--color-green)] shrink-0" />}
        {expanded ? <ChevronDown size={11} className="text-[var(--color-text-dim)] shrink-0" /> : <ChevronRight size={11} className="text-[var(--color-text-dim)] shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 animate-fade-in">
          <div className="border-t border-[var(--color-border-secondary)] pt-2">
            <div className={cn(
              'text-[11px] text-[var(--color-text-secondary)] leading-relaxed max-h-40 overflow-y-auto p-2 rounded-[var(--radius-md)]',
              card.applied ? 'bg-[var(--color-green-bg)]/10 border border-[var(--color-green)]/20' : 'bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)]'
            )}>
              {compareMode && card.compareWith ? (
                <div className="space-y-2">
                  <div className="text-[10px] text-[var(--color-text-dim)] mb-1 flex items-center gap-1"><Clock size={9} /> 原文</div>
                  <p className="text-[var(--color-text-muted)] line-through opacity-60">{card.compareWith}</p>
                  <div className="text-[10px] text-[var(--color-accent)] mb-1 flex items-center gap-1"><Sparkles size={9} /> AI 生成</div>
                  <p className="text-[var(--color-accent)]">{card.content}</p>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{card.content.slice(0, 500)}{card.content.length > 500 ? '...' : ''}</p>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-2">
              {card.compareWith && (
                <button onClick={onToggleCompare} className={cn('flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors duration-200', compareMode ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]')}>
                  <Columns size={10} /> 对比
                </button>
              )}
              <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] rounded transition-colors duration-200">
                {copied ? <Check size={10} className="text-[var(--color-green)]" /> : <Copy size={10} />} {copied ? '已复制' : '复制'}
              </button>
              <div className="flex-1" />
              <button onClick={onApply} disabled={card.applied} className={cn('flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-all duration-200', card.applied ? 'text-[var(--color-green)] cursor-default' : 'text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10')}>
                {card.applied ? <Check size={10} /> : <ArrowDownToLine size={10} />} {card.applied ? '已插入' : '插入'}
              </button>
              <button onClick={onRemove} className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-red)] rounded transition-colors duration-200">
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Story Bible Panel ─────────────────────────────────────
function StoryBiblePanel({ novel }: { novel: import('@/types').Novel }) {
  const protagonist = novel.protagonist;
  const outline = novel.generationOutline;

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full">
      {/* Protagonist */}
      {protagonist && (
        <div className="glass-depth-1 rounded-[var(--radius-lg)] p-3">
          <h4 className="text-[10px] font-semibold text-[var(--color-accent)] mb-2 uppercase tracking-wider">主角档案</h4>
          <p className="text-xs font-medium text-[var(--color-text-primary)]">{protagonist.name} · {protagonist.gender} · {protagonist.age}岁</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1 leading-relaxed">{protagonist.personality}</p>
          {protagonist.abilities && <p className="text-[10px] text-[var(--color-accent)]/80 mt-1">⚡ {protagonist.abilities}</p>}
          {protagonist.goals && <p className="text-[10px] text-[var(--color-text-dim)] mt-1">🎯 {protagonist.goals}</p>}
        </div>
      )}

      {/* Synopsis */}
      {outline?.synopsis && (
        <div className="glass-depth-1 rounded-[var(--radius-lg)] p-3">
          <h4 className="text-[10px] font-semibold text-[var(--color-purple)] mb-1.5 uppercase tracking-wider">核心梗概</h4>
          <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">{outline.synopsis}</p>
        </div>
      )}

      {/* Timeline */}
      {novel.timeline?.length > 0 && (
        <div className="glass-depth-1 rounded-[var(--radius-lg)] p-3">
          <h4 className="text-[10px] font-semibold text-[var(--color-blue)] mb-2 uppercase tracking-wider">五段时间线</h4>
          <div className="space-y-2">
            {novel.timeline.map((t: { phase: string; event: string; description: string }, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] mt-1 shrink-0" />
                <div>
                  <p className="text-[10px] font-medium text-[var(--color-text-primary)]">{t.phase}: {t.event}</p>
                  <p className="text-[10px] text-[var(--color-text-dim)]">{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Memory Panel ──────────────────────────────────────────
function MemoryPanel({ novel, memoryNodes, isSyncing }: {
  novel: import('@/types').Novel;
  memoryNodes: DSMemoryNode[];
  isSyncing: boolean;
}) {
  const nodeColor = (label: string) => {
    if (label === 'Time Dimension') return 'var(--color-blue)';
    if (label === 'Token Fingerprint') return 'var(--color-purple)';
    return 'var(--color-amber-start)';
  };

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full">
      {/* Live memory nodes — DeepSeek 增量语义提取 */}
      <div className="glass-depth-1 rounded-[var(--radius-lg)] p-3">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={11} className="text-[var(--color-accent)]" />
          <h4 className="text-[10px] font-semibold text-[var(--color-accent)] uppercase tracking-wider">DeepSeek 语义节点</h4>
          {isSyncing && <Loader2 size={10} className="text-[var(--color-accent)] animate-spin" />}
        </div>
        {memoryNodes.length === 0 ? (
          <p className="text-[10px] text-[var(--color-text-dim)]">编辑正文以自动提取语义节点...</p>
        ) : (
          <div className="space-y-2">
            {memoryNodes.map((n) => (
              <div key={n.id} className="animate-fade-in">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: nodeColor(n.label) }} />
                    <span className="text-[10px] font-medium text-[var(--color-text-primary)]">{n.label}</span>
                  </div>
                  <span className="text-[9px] font-mono text-[var(--color-text-dim)]">{Math.round(n.confidence * 100)}%</span>
                </div>
                <div className="w-full h-0.5 rounded-full bg-[var(--color-bg-tertiary)] mb-1 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(n.confidence * 100)}%`,
                      backgroundColor: n.confidence > 0.6 ? 'var(--color-accent)' : n.confidence > 0.3 ? 'var(--color-amber-start)' : 'var(--color-text-dim)',
                    }}
                  />
                </div>
                <p className="text-[10px] text-[var(--color-text-dim)] leading-relaxed ml-3.5">{n.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global memory */}
      <div className="glass-depth-1 rounded-[var(--radius-lg)] p-3">
        <h4 className="text-[10px] font-semibold text-[var(--color-purple)] mb-2 uppercase tracking-wider">全局记忆锚点</h4>
        {novel.globalMemory?.mainPlot && (
          <div className="mb-2">
            <p className="text-[10px] font-medium text-[var(--color-text-primary)]">主情节</p>
            <p className="text-[10px] text-[var(--color-text-dim)]">{novel.globalMemory.mainPlot}</p>
          </div>
        )}
        {novel.globalMemory?.characters && (
          <div className="mb-2">
            <p className="text-[10px] font-medium text-[var(--color-text-primary)]">人物状态</p>
            <p className="text-[10px] text-[var(--color-text-dim)]">{novel.globalMemory.characters}</p>
          </div>
        )}
        {novel.globalMemory?.location && (
          <div>
            <p className="text-[10px] font-medium text-[var(--color-text-primary)]">当前位置</p>
            <p className="text-[10px] text-[var(--color-text-dim)]">{novel.globalMemory.location}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TOC Panel ─────────────────────────────────────────────
function TOCPanel({ novel, selectedChapterId, onChapterClick }: {
  novel: import('@/types').Novel;
  selectedChapterId: string | null;
  onChapterClick: (chId: string) => void;
}) {
  const sortedChapters = [...novel.chapters].sort((a, b) => a.order - b.order);
  const total = novel.chapterCount || sortedChapters.length || 10;

  return (
    <div className="overflow-y-auto h-full p-2">
      <div className="flex items-center justify-between px-2 py-1.5 mb-2">
        <span className="text-[10px] text-[var(--color-text-muted)]">{sortedChapters.length} / {total} 章</span>
      </div>
      <div className="space-y-0.5">
        {sortedChapters.map((ch, i) => {
          const sid = getStageForChapter(i, total, novel.writeMode);
          const sc = GROWTH_STAGES.find((s) => s.id === sid);
          return (
            <button
              key={ch.id}
              onClick={() => onChapterClick(ch.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-md)] transition-all duration-200 text-left group',
                ch.id === selectedChapterId
                  ? 'bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/20'
                  : 'hover:bg-[var(--color-bg-hover)]'
              )}
            >
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sc?.color || '#666' }} />
              <span className="text-[11px] text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors flex-1 truncate">
                {i + 1}. {ch.title}
              </span>
              {ch.content && <span className="text-[9px] text-[var(--color-text-dim)]">{ch.content.length}字</span>}
              {ch.content && <Check size={9} className="text-[var(--color-green)] shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── World Bible Blur Overlay ──────────────────────────────
function WorldBibleBlurOverlay({ onActivate }: { onActivate: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-md bg-zinc-950/40 animate-fade-in">
      <div className="text-center space-y-4 px-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
          <Telescope size={28} className="text-amber-400" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100 mb-1">世界圣经未唤醒</h3>
          <p className="text-[11px] text-zinc-400 max-w-[200px] leading-relaxed">
            点击下方按钮，DeepSeek 将基于你的大纲框架，一键唤醒世界观、角色档案与记忆锚点
          </p>
        </div>
        <button
          onClick={onActivate}
          className="px-5 py-2.5 rounded-[var(--radius-lg)] bg-gradient-to-r from-amber-500/90 to-amber-600/90 text-[#0b0b0f] text-xs font-bold hover:from-amber-400 hover:to-amber-500 transition-all duration-300 shadow-[0_0_24px_rgba(245,158,11,0.35)] hover:shadow-[0_0_36px_rgba(245,158,11,0.5)] active:scale-95"
        >
          🔮 一键唤醒世界圣经
        </button>
      </div>
    </div>
  );
}
