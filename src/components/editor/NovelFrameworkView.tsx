'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import type {
  NovelFramework,
  FrameworkVolume,
  FrameworkFaction,
  FrameworkCharacter,
  FrameworkRelationship,
  FrameworkItem,
  FrameworkChapterBreakdown,
  FrameworkForeshadowing,
  FrameworkEvent,
} from '@/types/novel-framework';
import type { VolumeChapter } from '@/types';
import { createEmptyFramework } from '@/types/novel-framework';
import { cn } from '@/lib/utils';
import { useBatchGeneration } from '@/hooks/useBatchGeneration';
import {
  ChevronDown, Globe, Swords, Users, User, Heart, Zap,
  Package, GitBranch, TrendingUp, Clock, BookOpen,
  Eye, Target, Edit3, Save, X, Plus, Trash2, Sparkles,
  Layers, Hash, PenLine, Loader2, XCircle, Wand2, AlertCircle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// Collapsible Section (framework details)
// ═══════════════════════════════════════════════════════════
function Section({
  icon: Icon,
  title,
  badge,
  children,
  defaultOpen = false,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[var(--color-border-primary)] rounded-[var(--radius-lg)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
      >
        <Icon size={15} className="text-[var(--color-accent)]" />
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{title}</span>
        {badge && (
          <span className="text-[10px] text-[var(--color-text-dim)] ml-auto mr-1">{badge}</span>
        )}
        <ChevronDown
          size={14}
          className={cn(
            'text-[var(--color-text-dim)] transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && <div className="px-4 py-3 bg-[var(--color-bg-primary)]">{children}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Editable text field
// ═══════════════════════════════════════════════════════════
function Field({
  label, value, onChange, multiline = false,
}: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  if (multiline) {
    return (
      <div className="space-y-1">
        <span className="text-[10px] text-[var(--color-text-muted)]">{label}</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] text-xs resize-none outline-none focus:border-[var(--color-accent)]/50"
        />
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <span className="text-[10px] text-[var(--color-text-muted)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] text-xs outline-none focus:border-[var(--color-accent)]/50"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Character Card
// ═══════════════════════════════════════════════════════════
function CharacterCard({ char, colorClass }: {
  char: FrameworkCharacter; colorClass: string;
}) {
  return (
    <div className={cn('p-3 rounded-[var(--radius-md)] border', colorClass)}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{char.name}</span>
        <span className="text-[10px] text-[var(--color-text-dim)]">{char.gender} · {char.age}</span>
      </div>
      {char.personality && <p className="text-xs text-[var(--color-text-secondary)] mb-1"><span className="text-[var(--color-text-muted)]">性格：</span>{char.personality}</p>}
      {char.background && <p className="text-xs text-[var(--color-text-secondary)] mb-1"><span className="text-[var(--color-text-muted)]">背景：</span>{char.background}</p>}
      {char.abilities && <p className="text-xs text-[var(--color-text-secondary)] mb-1"><span className="text-[var(--color-text-muted)]">能力：</span>{char.abilities}</p>}
      {char.goals && <p className="text-xs text-[var(--color-text-secondary)]"><span className="text-[var(--color-text-muted)]">目标：</span>{char.goals}</p>}
      {char.weaknesses && <p className="text-xs text-[var(--color-red)] mt-1">弱点：{char.weaknesses}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Framework Chapter Card (compact)
// ═══════════════════════════════════════════════════════════
function FrameworkChapterCard({ ch }: { ch: FrameworkChapterBreakdown }) {
  return (
    <div className="p-2.5 rounded-[var(--radius-md)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-accent)]/40 transition-colors">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-5 h-5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] text-[10px] font-bold flex items-center justify-center shrink-0">
          {ch.chapterNumber}
        </span>
        <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{ch.title}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <p><span className="text-[var(--color-text-muted)]">剧情：</span><span className="text-[var(--color-text-secondary)]">{ch.mainPlot}</span></p>
        <p><span className="text-[var(--color-text-muted)]">目的：</span><span className="text-[var(--color-text-secondary)]">{ch.purpose}</span></p>
        <p><span className="text-[var(--color-text-muted)]">冲突：</span><span className="text-[var(--color-text-secondary)]">{ch.keyConflict}</span></p>
        <p><span className="text-[var(--color-text-muted)]">伏笔：</span><span className="text-[var(--color-text-secondary)]">{ch.foreshadowing}</span></p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Deduced Chapter Card (from volume deducing)
// ═══════════════════════════════════════════════════════════
function DeducedChapterCard({ chapter, index }: { chapter: VolumeChapter; index: number }) {
  return (
    <div className="group p-3 rounded-[var(--radius-md)] border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] hover:border-[var(--color-accent)]/30 transition-all duration-200">
      <div className="flex items-start gap-3">
        <span className="w-6 h-6 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <h5 className="text-xs font-semibold text-[var(--color-text-primary)] mb-1 truncate">
            {chapter.chapterTitle}
          </h5>
          <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed break-words">
            {chapter.microPlot}
          </p>
          {chapter.cliffhangerPoint && (
            <div className="mt-2 flex items-start gap-1.5 text-[10px]">
              <span className="text-[var(--color-red)]/70 shrink-0 mt-0.5">
                <AlertCircle size={10} />
              </span>
              <span className="text-[var(--color-red)]/70 leading-relaxed">
                ⚡ 断崖：{chapter.cliffhangerPoint}
              </span>
            </div>
          )}
          <span className="inline-block mt-1.5 text-[9px] text-[var(--color-text-dim)]/50">
            ~{(chapter.wordCountPreset ?? 3000).toLocaleString()}字
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Volume Hero Card — 篇级大纲核心卡片
// ═══════════════════════════════════════════════════════════
function VolumeHeroCard({
  volume,
  deducedChapters,
  frameworkChapters,
  expanded,
  onToggle,
}: {
  volume: FrameworkVolume;
  deducedChapters: VolumeChapter[];
  frameworkChapters: FrameworkChapterBreakdown[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDeduced = deducedChapters.length > 0;
  const displayChapters = hasDeduced ? deducedChapters : null;
  const volNum = volume.id.replace('vol-', '');

  return (
    <div className="border border-[var(--color-border-primary)] rounded-[var(--radius-xl)] overflow-hidden bg-[var(--color-bg-secondary)] transition-all duration-300 hover:border-[var(--color-border-accent)]/40">
      {/* ── Card Header — always visible ── */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-[var(--color-bg-hover)]/50 transition-colors duration-200"
      >
        {/* Volume number badge */}
        <span className="shrink-0 w-9 h-9 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-bold flex items-center justify-center mt-0.5 border border-[var(--color-accent)]/20">
          {volNum}
        </span>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{volume.title}</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]/80 font-medium">
              {volume.arc}
            </span>
            <span className="text-[10px] text-[var(--color-text-dim)] font-mono">
              Ch.{volume.chapterRange[0]}–{volume.chapterRange[1]}
            </span>
            {hasDeduced && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                {deducedChapters.length} 细化章
              </span>
            )}
          </div>

          {/* Theme */}
          {volume.theme && (
            <p className="text-[11px] text-[var(--color-text-dim)] mb-2">{volume.theme}</p>
          )}

          {/* Core conflict */}
          <div className="flex items-start gap-1.5 mb-1">
            <span className="text-[10px] text-amber-400/70 shrink-0 mt-0.5 font-medium">核心冲突</span>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{volume.mainConflict}</p>
          </div>

          {/* Volume ending */}
          <div className="flex items-start gap-1.5">
            <span className="text-[10px] text-red-400/70 shrink-0 mt-0.5 font-medium">篇末大结局</span>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{volume.volumeEnding}</p>
          </div>
        </div>

        {/* Expand chevron */}
        <ChevronDown
          size={18}
          className={cn(
            'shrink-0 text-[var(--color-text-dim)] transition-transform duration-300 mt-0.5',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* ── Accordion Body — 章节揭幕 ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-[var(--color-border-primary)]">
              {/* Synopsis */}
              {volume.synopsis && (
                <div className="mt-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]">
                  <span className="text-[10px] text-[var(--color-text-muted)] font-medium">篇章概要</span>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 leading-relaxed">{volume.synopsis}</p>
                </div>
              )}

              {/* Deduced chapters */}
              {displayChapters ? (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wand2 size={12} className="text-[var(--color-accent)]" />
                    <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
                      细化章节列表（{displayChapters.length} 章）
                    </span>
                  </div>
                  <div className="space-y-2">
                    {displayChapters.map((ch, i) => (
                      <DeducedChapterCard key={ch.id} chapter={ch} index={i} />
                    ))}
                  </div>
                </div>
              ) : frameworkChapters.length > 0 ? (
                /* Fallback: show framework chapter breakdown if no deduceed */
                <div className="mt-4">
                  <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
                    框架章节拆分（{frameworkChapters.length} 章）
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {frameworkChapters.map((ch) => (
                      <FrameworkChapterCard key={ch.chapterNumber} ch={ch} />
                    ))}
                  </div>
                </div>
              ) : (
                /* Empty — prompt user to deduce */
                <div className="mt-4 py-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/5 flex items-center justify-center mx-auto mb-2">
                    <Wand2 size={16} className="text-[var(--color-text-dim)]" />
                  </div>
                  <p className="text-[11px] text-[var(--color-text-dim)] leading-relaxed">
                    在左侧目录中找到本篇，悬停后点击
                    <span className="text-[var(--color-accent)]/80 mx-1">⚙️ 细化章节</span>
                    使用 🪄 推演章节目录
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component — Volume-Centric Framework View
// ═══════════════════════════════════════════════════════════
export default function NovelFrameworkView() {
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const setNovelFramework = useNovelStore((s) => s.setNovelFramework);
  const setEditorMode = useUIStore((s) => s.setEditorMode);
  const batchGenProgress = useUIStore((s) => s.batchGenProgress);

  const { generateAll, cancel, phase: batchPhase } = useBatchGeneration();

  const framework = currentNovel?.novelFramework ?? null;
  const volumeChapters = currentNovel?.volumeChapters ?? {};

  const [editing, setEditing] = useState(false);
  const [localFw, setLocalFw] = useState<NovelFramework | null>(null);
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [showFrameworkDetails, setShowFrameworkDetails] = useState(false);

  const toggleVolume = (volId: string) => {
    setExpandedVolumes((prev) => {
      const next = new Set(prev);
      if (next.has(volId)) next.delete(volId);
      else next.add(volId);
      return next;
    });
  };

  const displayFw = editing && localFw ? localFw : framework;

  const startEditing = () => {
    setLocalFw(framework ? JSON.parse(JSON.stringify(framework)) : createEmptyFramework(currentNovel?.title || ''));
    setEditing(true);
  };

  const cancelEditing = () => { setLocalFw(null); setEditing(false); };
  const saveEditing = () => {
    if (localFw && currentNovel) {
      setNovelFramework(currentNovel.id, { ...localFw, lastModifiedAt: Date.now() });
    }
    setEditing(false); setLocalFw(null);
  };

  const update = (fn: (fw: NovelFramework) => void) => {
    if (!editing || !localFw) return;
    const copy = JSON.parse(JSON.stringify(localFw));
    fn(copy);
    setLocalFw(copy);
  };

  if (!currentNovel) return null;

  // ══════ Empty state ══════
  if (!framework && !editing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="text-center space-y-4 px-8 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
            <BookOpen size={24} className="text-amber-400" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">尚无完整框架</h3>
            <p className="text-sm text-[var(--color-text-muted)] max-w-sm leading-relaxed">
              回到灵感输入页，输入题材描述，点击"快速大纲"即可自动生成含卷目结构的完整小说框架。
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setEditorMode('inspiration')}
              className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[#0b0b0f] text-xs font-medium"
            >
              去灵感输入
            </button>
            <button
              onClick={startEditing}
              className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] text-xs font-medium hover:border-[var(--color-accent)]/40 transition-colors"
            >
              手动填写框架
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!displayFw) return null;

  const fw = displayFw;
  const volumes: FrameworkVolume[] = fw.volumes ?? [];
  const totalDeduced = Object.values(volumeChapters).reduce((sum, chs) => sum + chs.length, 0);

  // ══════ Edit bar ══════
  const editBar = (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--color-text-muted)]">
          {editing ? '编辑模式 — 修改后请保存' : '篇级大纲画布 — 点击篇卡片展开细化章节'}
        </span>
        {batchPhase === 'generating' && (
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <Loader2 size={12} className="animate-spin" />
            <span>正在生成 {batchGenProgress.currentTitle} ({batchGenProgress.current}/{batchGenProgress.total})</span>
          </div>
        )}
        {batchPhase === 'completed' && (
          <span className="text-xs text-emerald-400">全部章节生成完毕</span>
        )}
        {batchPhase === 'error' && (
          <span className="text-xs text-red-400">生成中断</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {batchPhase === 'generating' ? (
          <button
            onClick={cancel}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all"
          >
            <XCircle size={12} />取消生成
          </button>
        ) : (
          <button
            onClick={generateAll}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-[var(--radius-sm)] bg-gradient-to-r from-amber-500/80 to-amber-600/80 text-[#0b0b0f] font-semibold hover:from-amber-500 hover:to-amber-600 transition-all shadow-[0_2px_8px_rgba(245,158,11,0.25)]"
          >
            <PenLine size={12} strokeWidth={2} />一键生成全部章节
          </button>
        )}
        <div className="w-px h-4 bg-[var(--color-border-primary)]" />
        {editing ? (
          <>
            <button onClick={cancelEditing} className="px-3 py-1 text-xs border border-[var(--color-border-primary)] rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors">
              <X size={12} className="inline mr-1" />取消
            </button>
            <button onClick={saveEditing} className="px-3 py-1 text-xs bg-[var(--color-accent)] text-[#0b0b0f] rounded-[var(--radius-sm)] font-medium">
              <Save size={12} className="inline mr-1" />保存
            </button>
          </>
        ) : (
          <button onClick={startEditing} className="px-3 py-1 text-xs border border-[var(--color-border-primary)] rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
            <Edit3 size={12} className="inline mr-1" />编辑框架
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {editBar}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">
          {/* ═══════════════════════════════════════════════════ */}
          {/* PRIMARY: 篇级大纲画布 — Volume Hero Card Array  */}
          {/* ═══════════════════════════════════════════════════ */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                  篇级大纲画布
                </h2>
                <p className="text-[11px] text-[var(--color-text-dim)] mt-0.5">
                  {volumes.length} 篇{totalDeduced > 0 ? ` · ${totalDeduced} 细化章` : ''} — 点击篇卡片展开章节详情
                </p>
              </div>
              {/* Expand / collapse all */}
              {volumes.length > 0 && (
                <button
                  onClick={() => {
                    const allExpanded = volumes.every((v) => expandedVolumes.has(v.id));
                    if (allExpanded) {
                      setExpandedVolumes(new Set());
                    } else {
                      setExpandedVolumes(new Set(volumes.map((v) => v.id)));
                    }
                  }}
                  className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--color-border-primary)] hover:border-[var(--color-accent)]/30"
                >
                  {volumes.every((v) => expandedVolumes.has(v.id)) ? '折叠全部' : '展开全部'}
                </button>
              )}
            </div>

            {volumes.length > 0 ? (
              <div className="space-y-4">
                {volumes.map((vol) => {
                  const deducedChapters = volumeChapters[vol.id] ?? [];
                  const fwChapters = fw.chapterBreakdown.filter(
                    (ch) => ch.chapterNumber >= vol.chapterRange[0] && ch.chapterNumber <= vol.chapterRange[1]
                  );
                  return (
                    <VolumeHeroCard
                      key={vol.id}
                      volume={vol}
                      deducedChapters={deducedChapters}
                      frameworkChapters={fwChapters}
                      expanded={expandedVolumes.has(vol.id)}
                      onToggle={() => toggleVolume(vol.id)}
                    />
                  );
                })}
              </div>
            ) : (
              /* Fallback: no volumes, show flat chapters from framework */
              <div className="space-y-1.5">
                {fw.chapterBreakdown.map((ch) => (
                  <FrameworkChapterCard key={ch.chapterNumber} ch={ch} />
                ))}
                {fw.chapterBreakdown.length === 0 && (
                  <div className="py-12 text-center">
                    <BookOpen size={32} className="text-[var(--color-text-dim)] mx-auto mb-3" strokeWidth={1} />
                    <p className="text-sm text-[var(--color-text-dim)]">尚无章节拆分数据</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════ */}
          {/* SECONDARY: 完整框架设定 (12 部分) — collapsible */}
          {/* ═══════════════════════════════════════════════════ */}
          <div className="border-t border-[var(--color-border-primary)] pt-6">
            <button
              onClick={() => setShowFrameworkDetails(!showFrameworkDetails)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-200"
            >
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-[var(--color-text-dim)]" />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  完整框架设定
                </span>
                <span className="text-[10px] text-[var(--color-text-dim)]">
                  (12 部分：世界观·势力·角色·关系·能力·道具·剧情·结构·时间线·章节·伏笔·事件库)
                </span>
              </div>
              <ChevronDown
                size={16}
                className={cn(
                  'text-[var(--color-text-dim)] transition-transform duration-300',
                  showFrameworkDetails && 'rotate-180'
                )}
              />
            </button>

            <AnimatePresence initial={false}>
              {showFrameworkDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-3">
                    {/* Part 1: Meta */}
                    <Section icon={BookOpen} title="基本信息" defaultOpen>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="书名" value={fw.bookTitle} onChange={(v) => update((f) => { f.bookTitle = v; })} />
                        <Field label="类型" value={fw.bookType} onChange={(v) => update((f) => { f.bookType = v; })} />
                        <Field label="预计字数" value={fw.estimatedWords} onChange={(v) => update((f) => { f.estimatedWords = v; })} />
                        <Field label="关键词" value={fw.keywords} onChange={(v) => update((f) => { f.keywords = v; })} />
                        <div className="col-span-2">
                          <Field label="一句话简介" value={fw.oneLiner} onChange={(v) => update((f) => { f.oneLiner = v; })} />
                        </div>
                        <div className="col-span-2">
                          <Field label="内容简介" value={fw.synopsis} onChange={(v) => update((f) => { f.synopsis = v; })} multiline />
                        </div>
                      </div>
                    </Section>

                    {/* Part 1: World Setting */}
                    <Section icon={Globe} title="一、世界背景设定">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="世界名称" value={fw.worldSetting.worldName} onChange={(v) => update((f) => { f.worldSetting.worldName = v; })} />
                        <Field label="世界类型" value={fw.worldSetting.worldType} onChange={(v) => update((f) => { f.worldSetting.worldType = v; })} />
                        <div className="col-span-2"><Field label="时代背景" value={fw.worldSetting.eraBackground} onChange={(v) => update((f) => { f.worldSetting.eraBackground = v; })} multiline /></div>
                        <div className="col-span-2"><Field label="世界规则" value={fw.worldSetting.worldRules} onChange={(v) => update((f) => { f.worldSetting.worldRules = v; })} multiline /></div>
                        <div className="col-span-2"><Field label="地图环境" value={fw.worldSetting.mapEnvironment} onChange={(v) => update((f) => { f.worldSetting.mapEnvironment = v; })} multiline /></div>
                      </div>
                    </Section>

                    {/* Part 2: Factions */}
                    <Section icon={Swords} title="二、势力设定" badge={`${fw.factions.length} 个势力`}>
                      <div className="space-y-3">
                        {fw.factions.map((faction, i) => (
                          <div key={i} className="p-3 rounded-[var(--radius-md)] border border-purple-500/20 bg-purple-500/5">
                            <div className="flex items-center gap-2 mb-2"><span className="text-sm font-semibold text-[var(--color-text-primary)]">{faction.name}</span></div>
                            <p className="text-xs text-[var(--color-text-secondary)] mb-1"><span className="text-[var(--color-text-muted)]">背景：</span>{faction.background}</p>
                            <p className="text-xs text-[var(--color-text-secondary)] mb-1"><span className="text-[var(--color-text-muted)]">目标：</span>{faction.goal}</p>
                            <p className="text-xs text-[var(--color-text-secondary)] mb-1"><span className="text-[var(--color-text-muted)]">特征：</span>{faction.characteristics}</p>
                            <p className="text-xs text-[var(--color-accent)]">对主角：{faction.attitudeToProtagonist}</p>
                          </div>
                        ))}
                        {fw.factions.length === 0 && <p className="text-xs text-[var(--color-text-dim)]">暂无势力设定</p>}
                      </div>
                    </Section>

                    {/* Part 3: Characters */}
                    <Section icon={User} title="三、角色设定" badge="主角 + 配角 + 对手 + Boss">
                      <div className="mb-3"><h4 className="text-xs font-semibold text-[var(--color-accent)] mb-2">主角</h4><CharacterCard char={fw.protagonist} colorClass="border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5" /></div>
                      {fw.importantCharacters.length > 0 && (
                        <div className="mb-3"><h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">重要配角 ({fw.importantCharacters.length})</h4>
                          <div className="grid grid-cols-2 gap-2">{fw.importantCharacters.map((c, i) => (<CharacterCard key={i} char={c} colorClass="border-blue-500/20 bg-blue-500/5" />))}</div>
                        </div>
                      )}
                      {fw.opponents.length > 0 && (
                        <div className="mb-3"><h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">主要对手 ({fw.opponents.length})</h4>
                          <div className="grid grid-cols-2 gap-2">{fw.opponents.map((c, i) => (<CharacterCard key={i} char={c} colorClass="border-red-500/20 bg-red-500/5" />))}</div>
                        </div>
                      )}
                      <div><h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">最终 Boss</h4><CharacterCard char={fw.finalBoss} colorClass="border-red-500/40 bg-red-500/10" /></div>
                    </Section>

                    {/* Part 4: Relationships */}
                    <Section icon={Heart} title="四、人物关系" badge={`${fw.relationships.length} 组`}>
                      <div className="space-y-2">
                        {fw.relationships.map((rel, i) => (
                          <div key={i} className="p-2 rounded-[var(--radius-md)] border border-pink-500/20 bg-pink-500/5">
                            <div className="flex items-center gap-2 mb-1"><span className="text-xs font-medium text-[var(--color-text-primary)]">{rel.characters[0]} ↔ {rel.characters[1]}</span><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-dim)]">{rel.type}</span></div>
                            <p className="text-xs text-[var(--color-text-secondary)]">{rel.description}</p><p className="text-[10px] text-[var(--color-text-dim)] mt-1">{rel.stages}</p>
                          </div>
                        ))}
                        {fw.relationships.length === 0 && <p className="text-xs text-[var(--color-text-dim)]">暂无关系设定</p>}
                      </div>
                    </Section>

                    {/* Part 5: Ability System */}
                    <Section icon={Zap} title="五、能力/系统设定">
                      <div className="space-y-3">
                        <Field label="体系名称" value={fw.abilitySystem.systemName} onChange={(v) => update((f) => { f.abilitySystem.systemName = v; })} />
                        <Field label="体系概述" value={fw.abilitySystem.description} onChange={(v) => update((f) => { f.abilitySystem.description = v; })} multiline />
                        <div><span className="text-[10px] text-[var(--color-text-muted)]">等级序列</span>
                          <div className="flex gap-1 flex-wrap mt-1">{fw.abilitySystem.levels.map((lvl, i) => (<span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--color-accent-bg)] text-[var(--color-accent)]">{lvl}</span>))}</div>
                        </div>
                        <Field label="核心规则" value={fw.abilitySystem.rules} onChange={(v) => update((f) => { f.abilitySystem.rules = v; })} multiline />
                        <Field label="代价/限制" value={fw.abilitySystem.costs} onChange={(v) => update((f) => { f.abilitySystem.costs = v; })} multiline />
                      </div>
                    </Section>

                    {/* Part 6: Items */}
                    <Section icon={Package} title="六、道具设定" badge={`${fw.items.length} 件`}>
                      <div className="space-y-2">
                        {fw.items.map((item, i) => (
                          <div key={i} className="p-2 rounded-[var(--radius-md)] border border-[var(--color-border-primary)]">
                            <div className="flex items-center gap-2 mb-1"><span className="text-xs font-semibold text-[var(--color-text-primary)]">{item.name}</span><span className="text-[10px] text-[var(--color-text-dim)]">{item.type} · {item.owner}</span></div>
                            <p className="text-xs text-[var(--color-text-secondary)]">{item.description}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">能力：{item.abilities}</p>
                            <p className="text-xs text-[var(--color-accent)]">作用：{item.significance}</p>
                          </div>
                        ))}
                        {fw.items.length === 0 && <p className="text-xs text-[var(--color-text-dim)]">暂无道具设定</p>}
                      </div>
                    </Section>

                    {/* Parts 7-8: Plots & Structure */}
                    <Section icon={GitBranch} title="七、主线与支线">
                      <Field label="主线剧情" value={fw.plots.mainPlot} onChange={(v) => update((f) => { f.plots.mainPlot = v; })} multiline />
                      <div className="mt-2"><span className="text-[10px] text-[var(--color-text-muted)]">支线剧情</span>{fw.plots.subPlots.map((sp, i) => (<p key={i} className="text-xs text-[var(--color-text-secondary)] mt-1">· {sp}</p>))}</div>
                    </Section>

                    <Section icon={TrendingUp} title="八、剧情结构">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="开端" value={fw.plotStructure.opening} onChange={(v) => update((f) => { f.plotStructure.opening = v; })} multiline />
                        <Field label="发展" value={fw.plotStructure.development} onChange={(v) => update((f) => { f.plotStructure.development = v; })} multiline />
                        <Field label="高潮" value={fw.plotStructure.climax} onChange={(v) => update((f) => { f.plotStructure.climax = v; })} multiline />
                        <Field label="结局" value={fw.plotStructure.ending} onChange={(v) => update((f) => { f.plotStructure.ending = v; })} multiline />
                      </div>
                    </Section>

                    {/* Part 9: Timeline */}
                    <Section icon={Clock} title="九、时间线" badge={`${fw.timeline.length} 个节点`}>
                      <div className="space-y-2">
                        {fw.timeline.map((t, i) => (
                          <div key={i} className="flex gap-3 p-2 rounded-[var(--radius-md)] border border-[var(--color-border-primary)]">
                            <div className="shrink-0 w-12 text-center"><span className="text-[10px] text-[var(--color-accent)] font-medium">{t.chapters}</span></div>
                            <div><span className="text-xs font-medium text-[var(--color-text-primary)]">{t.phase} — {t.event}</span><p className="text-xs text-[var(--color-text-muted)]">{t.description}</p></div>
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* Part 10: Volume breakdown (now secondary — shows framework chapterBreakdown) */}
                    <Section icon={BookOpen} title="十、篇目框架拆分" badge={`${fw.volumes.length} 篇 · ${fw.chapterBreakdown.length} 章`} defaultOpen>
                      <div className="space-y-3">
                        {fw.volumes.map((vol) => {
                          const volChapters = fw.chapterBreakdown.filter(
                            (ch) => ch.chapterNumber >= vol.chapterRange[0] && ch.chapterNumber <= vol.chapterRange[1]
                          );
                          return (
                            <div key={vol.id} className="border border-zinc-800/80 rounded-[var(--radius-lg)] overflow-hidden">
                              <div className="px-4 py-2.5 bg-[var(--color-bg-secondary)] border-b border-zinc-800/60 flex items-center gap-2">
                                <Hash size={11} className="text-[var(--color-accent)]" />
                                <span className="text-xs font-semibold text-[var(--color-text-primary)]">{vol.title}</span>
                                <span className="text-[10px] text-[var(--color-text-dim)]">Ch.{vol.chapterRange[0]}–{vol.chapterRange[1]} · {vol.arc}</span>
                                <span className="ml-auto text-[10px] text-[var(--color-text-dim)]">{volChapters.length} 章</span>
                              </div>
                              <div className="p-3 space-y-1.5">
                                {volChapters.map((ch) => (<FrameworkChapterCard key={ch.chapterNumber} ch={ch} />))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Section>

                    {/* Part 11: Foreshadowing */}
                    <Section icon={Eye} title="十一、伏笔系统" badge={`${fw.foreshadowing.length} 个伏笔`}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-[var(--color-border-primary)]"><th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium">ID</th><th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium">埋设章</th><th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium">描述</th><th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium">回收章</th><th className="text-left py-2 px-2 text-[var(--color-text-muted)] font-medium">状态</th></tr></thead>
                          <tbody>
                            {fw.foreshadowing.map((fs) => (
                              <tr key={fs.id} className="border-b border-[var(--color-border-primary)]/50">
                                <td className="py-2 px-2 font-mono text-[var(--color-accent)]">{fs.id}</td><td className="py-2 px-2">第{fs.plantedChapter}章</td><td className="py-2 px-2 text-[var(--color-text-secondary)]">{fs.description}</td><td className="py-2 px-2">第{fs.payoffChapter}章</td>
                                <td className="py-2 px-2"><span className={cn('px-1.5 py-0.5 rounded-full text-[10px]', fs.status === 'planted' ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400')}>{fs.status === 'planted' ? '待回收' : '已回收'}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Section>

                    {/* Part 12: Event Library */}
                    <Section icon={Target} title="十二、事件库" badge={`${fw.eventLibrary.length} 个事件`}>
                      <div className="grid grid-cols-2 gap-2">
                        {fw.eventLibrary.map((ev, i) => (
                          <div key={i} className="p-2 rounded-[var(--radius-md)] border border-[var(--color-border-primary)]">
                            <div className="flex items-center gap-2 mb-1"><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">{ev.type}</span><span className="text-[10px] text-[var(--color-text-dim)]">章 {ev.possibleChapters.join(', ')}</span></div>
                            <p className="text-xs text-[var(--color-text-secondary)]">{ev.description}</p>
                            <p className="text-[10px] text-[var(--color-accent)] mt-1">影响：{ev.impact}</p>
                            {ev.involvedCharacters.length > 0 && <p className="text-[10px] text-[var(--color-text-dim)]">角色：{ev.involvedCharacters.join('、')}</p>}
                          </div>
                        ))}
                        {fw.eventLibrary.length === 0 && <p className="text-xs text-[var(--color-text-dim)] col-span-2">暂无事件库</p>}
                      </div>
                    </Section>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
