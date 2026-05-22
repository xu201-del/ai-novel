'use client';

import { useState, useEffect } from 'react';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import {
  Sparkles, Copy, Check, X, ChevronDown, ChevronRight,
  FileText, RefreshCw, Eye, Columns, MessageSquare,
  Zap, ArrowDownToLine, GripVertical, Clock, Trash2,
} from 'lucide-react';
import type { AICard, AICardType } from '@/types';

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
  const aiCards = useUIStore((s) => s.aiCards);
  const removeAICard = useUIStore((s) => s.removeAICard);
  const markCardApplied = useUIStore((s) => s.markCardApplied);
  const clearAICards = useUIStore((s) => s.clearAICards);

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState<string | null>(null);

  if (!mounted) return null;
  if (!rightPanelOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <aside className="w-72 shrink-0 border-l border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border-secondary)]">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-[var(--color-accent)]" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">AI 输出流</span>
          <span className="text-[10px] text-[var(--color-text-dim)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded-full">
            {aiCards.length}
          </span>
        </div>
        {aiCards.length > 0 && (
          <button
            onClick={clearAICards}
            className="text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-red)] transition-colors duration-200"
          >
            清空
          </button>
        )}
      </div>

      {/* Card stream */}
      <div className="flex-1 overflow-y-auto">
        {!currentNovel ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--color-text-dim)] px-4 text-center">
            <Sparkles size={28} strokeWidth={1} />
            <p className="text-xs leading-relaxed">AI 生成结果<br />将在此处展示</p>
          </div>
        ) : aiCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--color-text-dim)] px-4 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-[var(--color-border-primary)] flex items-center justify-center">
              <Zap size={16} strokeWidth={1} />
            </div>
            <p className="text-xs leading-relaxed">等待 AI 生成<br />使用工具栏操作开始</p>
            <div className="text-[10px] text-[var(--color-text-dim)] space-y-1 text-left">
              {['AI 生成 — 生成新章节', '续写 — 从末尾接续', '改写 — 优化选中文本'].map((tip, i) => (
                <p key={i} className="opacity-60">{tip}</p>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {aiCards.map((card) => (
              <AICardItem
                key={card.id}
                card={card}
                expanded={expandedCards.has(card.id)}
                onToggle={() => toggleExpand(card.id)}
                onRemove={() => removeAICard(card.id)}
                onApply={() => markCardApplied(card.id)}
                compareMode={compareMode === card.id}
                onToggleCompare={() => setCompareMode(compareMode === card.id ? null : card.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {aiCards.length > 0 && (
        <div className="px-3 py-2 border-t border-[var(--color-border-secondary)] text-[10px] text-[var(--color-text-dim)] text-center">
          点击卡片展开，选中文字后插入正文
        </div>
      )}
    </aside>
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
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border transition-all duration-200 overflow-hidden',
        card.applied
          ? 'border-[var(--color-green)]/30 bg-[var(--color-green-bg)]/5'
          : 'border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)] hover:border-[var(--color-border-accent)]'
      )}
    >
      {/* Card header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-bg-hover)]/50 transition-colors duration-200"
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: config.accent }}
        />
        <config.icon size={12} className="text-[var(--color-text-dim)] shrink-0" />
        <span className="text-[11px] font-medium text-[var(--color-text-primary)] flex-1 truncate">
          {card.title}
        </span>
        <span className="text-[9px] text-[var(--color-text-dim)]">{timeStr}</span>
        {card.applied && <Check size={10} className="text-[var(--color-green)] shrink-0" />}
        {expanded ? <ChevronDown size={11} className="text-[var(--color-text-dim)] shrink-0" /> : <ChevronRight size={11} className="text-[var(--color-text-dim)] shrink-0" />}
      </button>

      {/* Card body */}
      {expanded && (
        <div className="px-3 pb-3 animate-fade-in">
          <div className="border-t border-[var(--color-border-secondary)] pt-2">
            {/* Content preview */}
            <div className={cn(
              'text-[11px] text-[var(--color-text-secondary)] leading-relaxed max-h-40 overflow-y-auto p-2 rounded-[var(--radius-md)]',
              card.applied
                ? 'bg-[var(--color-green-bg)]/10 border border-[var(--color-green)]/20'
                : 'bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)]'
            )}>
              {compareMode && card.compareWith ? (
                <div className="space-y-2">
                  <div className="text-[10px] text-[var(--color-text-dim)] mb-1 flex items-center gap-1">
                    <Clock size={9} /> 原文
                  </div>
                  <p className="text-[var(--color-text-muted)] line-through opacity-60">{card.compareWith}</p>
                  <div className="text-[10px] text-[var(--color-accent)] mb-1 flex items-center gap-1">
                    <Sparkles size={9} /> AI 生成
                  </div>
                  <p className="text-[var(--color-accent)]">{card.content}</p>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{card.content.slice(0, 500)}{card.content.length > 500 ? '...' : ''}</p>
              )}
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-1.5 mt-2">
              {card.compareWith && (
                <button
                  onClick={onToggleCompare}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors duration-200',
                    compareMode ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                  )}
                >
                  <Columns size={10} />
                  对比
                </button>
              )}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] rounded transition-colors duration-200"
              >
                {copied ? <Check size={10} className="text-[var(--color-green)]" /> : <Copy size={10} />}
                {copied ? '已复制' : '复制'}
              </button>
              <div className="flex-1" />
              <button
                onClick={onApply}
                disabled={card.applied}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-all duration-200',
                  card.applied
                    ? 'text-[var(--color-green)] cursor-default'
                    : 'text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10'
                )}
              >
                {card.applied ? <Check size={10} /> : <ArrowDownToLine size={10} />}
                {card.applied ? '已插入' : '插入'}
              </button>
              <button
                onClick={onRemove}
                className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-red)] rounded transition-colors duration-200"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
