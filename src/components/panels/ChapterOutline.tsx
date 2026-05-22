'use client';

import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import { GROWTH_STAGES, getStageForChapter, WRITE_MODES } from '@/services/writing-framework';
import { cn, formatWordCount } from '@/lib/utils';
import {
  Plus, GripVertical, FileText, PenLine, Target, Clock, User,
  CheckCircle2, Edit3, Sparkles,
} from 'lucide-react';

export default function ChapterOutline() {
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const addChapter = useNovelStore((s) => s.addChapter);
  const selectedChapterId = useUIStore((s) => s.selectedChapterId);
  const setSelectedChapterId = useUIStore((s) => s.setSelectedChapterId);
  const setEditorMode = useUIStore((s) => s.setEditorMode);

  if (!currentNovel) return null;

  const sortedChapters = [...currentNovel.chapters].sort((a, b) => a.order - b.order);
  const totalWords = sortedChapters.reduce((sum, c) => sum + c.content.length, 0);
  const totalChapters = currentNovel.chapterCount || sortedChapters.length || 10;
  const modeInfo = WRITE_MODES.find((m) => m.id === currentNovel.writeMode);
  const completedCount = sortedChapters.filter((c) => c.content).length;

  const handleNewChapter = () => {
    const nextNum = sortedChapters.length + 1;
    const id = addChapter(currentNovel.id, `第 ${nextNum} 章`);
    setSelectedChapterId(id);
    setEditorMode('chapter-edit');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--color-border-secondary)] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <FileText size={12} />
            <span>{completedCount}/{totalChapters} 章 · {formatWordCount(totalWords)}</span>
          </div>
          <button onClick={handleNewChapter} className="btn-ghost px-2 text-xs">
            <Plus size={13} />新章
          </button>
        </div>

        {/* Mode + protagonist */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-[var(--color-text-dim)]">
            <Clock size={10} />
            {modeInfo?.name || '长篇连载'}
          </span>
          {currentNovel.protagonist?.name && (
            <span className="flex items-center gap-1 text-[var(--color-text-dim)]">
              <User size={10} />
              {currentNovel.protagonist.name}
            </span>
          )}
        </div>
      </div>

      {/* Growth stage progress */}
      <div className="px-3 py-2 border-b border-[var(--color-border-secondary)]">
        <div className="flex items-center gap-1.5">
          {GROWTH_STAGES.map((stage) => {
            const stageChapters = sortedChapters.filter((_, i) =>
              getStageForChapter(i, totalChapters, currentNovel.writeMode) === stage.id
            );
            const stageCompleted = stageChapters.filter((c) => c.content).length;
            const stageTotal = stageChapters.length || 1;
            const hasContent = stageChapters.length > 0;
            return (
              <div
                key={stage.id}
                className="flex-1 relative group"
                title={`${stage.name}: ${stageCompleted}/${stageTotal} 章完成`}
              >
                <div
                  className="h-1 rounded-full transition-all"
                  style={{
                    background: hasContent
                      ? stageCompleted === stageTotal
                        ? stage.color
                        : `linear-gradient(to right, ${stage.color} ${(stageCompleted / stageTotal) * 100}%, var(--color-border-primary) ${(stageCompleted / stageTotal) * 100}%)`
                      : 'var(--color-border-primary)',
                  }}
                />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-[var(--color-text-dim)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {stage.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto">
        {sortedChapters.length === 0 ? (
          <div className="text-center py-12 px-4">
            <PenLine size={28} className="text-[var(--color-text-dim)] mx-auto mb-2" strokeWidth={1} />
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              还没有章节
              <br />点击上方按钮创建
            </p>
          </div>
        ) : (
          <div className="py-1">
            {sortedChapters.map((ch, idx) => {
              const chStageId = getStageForChapter(idx, totalChapters, currentNovel.writeMode);
              const chStage = GROWTH_STAGES.find((s) => s.id === chStageId);
              const hasContent = !!ch.content;

              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setSelectedChapterId(ch.id);
                    setEditorMode('chapter-edit');
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--color-bg-hover)] transition-all border-b border-[var(--color-border-secondary)] last:border-0',
                    selectedChapterId === ch.id && 'bg-[var(--color-accent-bg)] border-l-2 border-l-[var(--color-accent)]'
                  )}
                >
                  {/* Stage dot */}
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: chStage?.color || '#666' }}
                    title={chStage?.name}
                  />
                  <GripVertical size={12} className="text-[var(--color-text-dim)] shrink-0" />
                  <span className="text-[10px] text-[var(--color-text-dim)] w-4 shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[var(--color-text-secondary)] truncate">
                        {ch.title || '未命名'}
                      </span>
                      {hasContent && (
                        <CheckCircle2 size={10} className="text-[var(--color-green)] shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[var(--color-text-dim)]">
                        {formatWordCount(ch.content.length)}
                      </span>
                      <span
                        className="text-[9px] px-1 py-0.5 rounded-full"
                        style={{
                          color: chStage?.color,
                          background: `${chStage?.color}15`,
                        }}
                      >
                        {chStage?.name || '—'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
