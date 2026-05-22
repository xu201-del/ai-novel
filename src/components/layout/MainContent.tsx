'use client';

import { useState, useEffect } from 'react';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import { Lightbulb, PenLine, BookOpen, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import InspirationMode from '@/components/editor/InspirationMode';
import ChapterEditor from '@/components/editor/ChapterEditor';

export default function MainContent() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const currentNovel = useNovelStore((s) => s.currentNovel());
  const editorMode = useUIStore((s) => s.editorMode);
  const setEditorMode = useUIStore((s) => s.setEditorMode);

  if (!mounted) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="text-center animate-fade-in px-8">
          <BookOpen size={56} className="text-[var(--color-text-dim)] mx-auto mb-6" strokeWidth={1} />
          <h2 className="text-xl font-semibold text-[var(--color-text-secondary)] mb-2">
            AI 小说创作工坊
          </h2>
          <p className="text-[var(--color-text-muted)] text-sm max-w-md leading-relaxed">
            在左侧创建或选择一本小说开始创作。
            <br />
            五段成长弧线 · Show Don&apos;t Tell · 断崖式结尾引擎
          </p>
        </div>
      </main>
    );
  }

  if (!currentNovel) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="text-center animate-fade-in px-8">
          <BookOpen size={56} className="text-[var(--color-text-dim)] mx-auto mb-6" strokeWidth={1} />
          <h2 className="text-xl font-semibold text-[var(--color-text-secondary)] mb-2">
            AI 小说创作工坊
          </h2>
          <p className="text-[var(--color-text-muted)] text-sm max-w-md leading-relaxed">
            在左侧创建或选择一本小说开始创作。
            <br />
            五段成长弧线 · Show Don&apos;t Tell · 断崖式结尾引擎
          </p>
        </div>
      </main>
    );
  }

  // Show outline generating state
  if (currentNovel.generationPhase === 'outline-generating') {
    return (
      <main className="flex-1 flex items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="text-center animate-fade-in px-8">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full border-2 border-[var(--color-accent)]/20 border-t-[var(--color-accent)] animate-spin mx-auto" />
            <Loader2 size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--color-accent)] animate-spin" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            AI 正在创作大纲
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] max-w-sm leading-relaxed">
            正在分析你的灵感，结合五段成长模型生成专业故事大纲...
          </p>
          <div className="mt-6 space-y-2 max-w-xs mx-auto">
            {['分析灵感素材...', '构建主角弧线...', '设计五段时间线...', '生成章节目录...'].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[var(--color-text-dim)] animate-fade-in" style={{ animationDelay: `${i * 0.4}s` }}>
                <Loader2 size={10} className="animate-spin text-[var(--color-accent)]" />
                {step}
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const isWritingPhase = currentNovel.generationPhase === 'outline-review' || currentNovel.generationPhase === 'writing';

  return (
    <main className="flex-1 flex flex-col bg-[var(--color-bg-primary)] min-w-0">
      {/* Mode switcher */}
      <div className="flex items-center gap-0 border-b border-[var(--color-border-primary)] px-4">
        <ModeTab
          icon={Lightbulb}
          label="灵感输入"
          active={editorMode === 'inspiration'}
          onClick={() => setEditorMode('inspiration')}
        />
        <ModeTab
          icon={PenLine}
          label={isWritingPhase ? '创作编辑' : '章节编辑'}
          active={editorMode === 'chapter-edit'}
          onClick={() => setEditorMode('chapter-edit')}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        {editorMode === 'inspiration' ? <InspirationMode /> : <ChapterEditor />}
      </div>
    </main>
  );
}

function ModeTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all',
        active
          ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
      )}
    >
      <Icon size={15} strokeWidth={1.5} />
      {label}
    </button>
  );
}
