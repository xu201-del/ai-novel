'use client';

import { useState } from 'react';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import { fetchAI, parseJSONFromText } from '@/services/api';
import { buildCreationPrompt } from '@/services/prompts';
import { WRITE_MODES, TROPE_TAGS, CHAPTER_COUNT_OPTIONS, type WriteMode } from '@/services/writing-framework';
import type { GenerationOutline } from '@/types';
import { cn } from '@/lib/utils';
import { Sparkles, ChevronRight, Loader2, CheckCircle2, AlertCircle, Target, Layers, BookOpen, Zap } from 'lucide-react';

export default function InspirationMode() {
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const apiConfig = useNovelStore((s) => s.apiConfig);
  const setInspirationText = useNovelStore((s) => s.setInspirationText);
  const setWriteMode = useNovelStore((s) => s.setWriteMode);
  const setTropeTag = useNovelStore((s) => s.setTropeTag);
  const setChapterCount = useNovelStore((s) => s.setChapterCount);
  const setGenerationPhase = useNovelStore((s) => s.setGenerationPhase);
  const setGenerationOutline = useNovelStore((s) => s.setGenerationOutline);
  const setEditorMode = useUIStore((s) => s.setEditorMode);

  const [localIdea, setLocalIdea] = useState(currentNovel?.inspirationText || '');
  const [localMode, setLocalMode] = useState<WriteMode>(currentNovel?.writeMode || 'long');
  const [localTrope, setLocalTrope] = useState(currentNovel?.tropeTag || '');
  const [localCount, setLocalCount] = useState(currentNovel?.chapterCount || 10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentNovel) return null;

  const wordEstimate = { long: '50,000-80,000', medium: '20,000-35,000', short: '6,000-10,000' };
  const currentMode = WRITE_MODES.find((m) => m.id === localMode)!;

  const handleStartCreation = async () => {
    if (!localIdea.trim()) return;
    if (!apiConfig.key) {
      setError('请先在设置中配置 API Key');
      return;
    }

    setIsGenerating(true);
    setError(null);

    setInspirationText(currentNovel.id, localIdea);
    setWriteMode(currentNovel.id, localMode);
    setTropeTag(currentNovel.id, localTrope);
    setChapterCount(currentNovel.id, localCount);
    setGenerationPhase(currentNovel.id, 'outline-generating');

    try {
      const tropeLabel = TROPE_TAGS.find((t) => t.id === localTrope)?.label || '';
      const prompt = buildCreationPrompt(localIdea, tropeLabel, localCount);
      const raw = await fetchAI({ prompt, maxTokens: 4096, apiConfig });
      const parsed = parseJSONFromText(raw) as GenerationOutline | null;

      if (!parsed || !parsed.chapters || !parsed.protagonist) {
        throw new Error('AI 返回格式异常，请重试');
      }

      const outline: GenerationOutline = {
        genre: parsed.genre || '',
        subGenre: parsed.subGenre || '',
        title: parsed.title || currentNovel.title,
        description: parsed.description || '',
        synopsis: parsed.synopsis || '',
        protagonist: parsed.protagonist,
        worldBuilding: parsed.worldBuilding || '',
        outline: parsed.outline || '',
        timeline: parsed.timeline || [],
        chapters: parsed.chapters.slice(0, localCount),
      };

      setGenerationOutline(currentNovel.id, outline);
      setGenerationPhase(currentNovel.id, 'outline-review');
      setEditorMode('chapter-edit');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '生成失败';
      setError(msg);
      setGenerationPhase(currentNovel.id, 'idle');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-1 flex flex-col items-center px-8 py-8">
        <div className="w-full max-w-2xl space-y-6 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] text-xs">
              <Sparkles size={12} />
              AI 智能创作引擎
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">开始创作</h3>
            <p className="text-sm text-[var(--color-text-muted)]">写下灵感，选择模式，AI 为你生成专业大纲和章节</p>
          </div>

          {/* Write mode selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Target size={12} /> 写作模式
            </label>
            <div className="grid grid-cols-3 gap-2">
              {WRITE_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setLocalMode(mode.id);
                    setLocalCount(mode.defaultChapters);
                  }}
                  className={cn(
                    'text-left p-3 rounded-[var(--radius-md)] border transition-all',
                    localMode === mode.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)]'
                      : 'border-[var(--color-border-primary)] hover:border-[var(--color-border-accent)]'
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium mb-0.5',
                    localMode === mode.id ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
                  )}>
                    {mode.name}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-dim)] leading-relaxed">{mode.density}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Chapter count */}
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Layers size={12} /> 章节数量
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {CHAPTER_COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setLocalCount(n)}
                  className={cn(
                    'px-3 py-1.5 rounded-[var(--radius-sm)] text-xs border transition-all',
                    localCount === n
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)]'
                      : 'border-[var(--color-border-primary)] text-[var(--color-text-muted)] hover:border-[var(--color-border-accent)]'
                  )}
                >
                  {n} 章
                </button>
              ))}
              <span className="text-[10px] text-[var(--color-text-dim)] self-center ml-1">
                约 {wordEstimate[localMode]} 字
              </span>
            </div>
          </div>

          {/* Trope tags */}
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
              <BookOpen size={12} /> 套路标签 <span className="text-[var(--color-text-dim)]">（可选）</span>
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {TROPE_TAGS.map((trope) => (
                <button
                  key={trope.id}
                  onClick={() => setLocalTrope(localTrope === trope.id ? '' : trope.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs border transition-all',
                    localTrope === trope.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                      : 'border-[var(--color-border-primary)] text-[var(--color-text-muted)] hover:border-[var(--color-border-accent)]'
                  )}
                >
                  {trope.label}
                </button>
              ))}
            </div>
          </div>

          {/* Idea input */}
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Zap size={12} /> 创作灵感 <span className="text-[var(--color-red)]">*</span>
            </label>
            <textarea
              value={localIdea}
              onChange={(e) => setLocalIdea(e.target.value)}
              placeholder="写清你想要的故事核心设定…&#10;&#10;例如：在一个人人都有超能力的世界，主角却是唯一没有能力的人。但他发现，所谓的「超能力」其实是外星人用来控制人类的工具…"
              className="w-full h-36 p-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] text-sm leading-relaxed resize-none outline-none placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] transition-all font-[family-name:var(--font-sans)]"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--color-red-bg)] border border-[var(--color-red)]/20 text-[var(--color-red)] text-xs">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Big CTA */}
          <button
            onClick={handleStartCreation}
            disabled={!localIdea.trim() || isGenerating}
            className="w-full py-3.5 rounded-[var(--radius-lg)] bg-[var(--color-accent)] text-[#0b0b0f] font-semibold text-base flex items-center justify-center gap-2 transition-all hover:bg-[var(--color-accent-hover)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                AI 正在生成大纲...
              </>
            ) : (
              <>
                <span>开启创作</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>

          {/* Preview info */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-[var(--color-text-dim)]">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={10} />
              模式：{currentMode.name}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={10} />
              {localCount} 章大纲
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={10} />
              约 {wordEstimate[localMode]} 字
            </span>
          </div>
        </div>
      </div>

      {/* Tips bar */}
      <div className="px-6 py-2.5 border-t border-[var(--color-border-primary)] flex items-center gap-4 text-xs text-[var(--color-text-dim)] shrink-0">
        <span className="text-[var(--color-text-muted)]">写作框架：</span>
        <span>· 五段成长弧线（建立信念→新生蜕变）</span>
        <span>· Show Don&apos;t Tell 铁律</span>
        <span>· 断崖式结尾引擎</span>
      </div>
    </div>
  );
}
