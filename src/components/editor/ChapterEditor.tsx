'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import { fetchAIStream } from '@/services/api';
import {
  buildChapterPrompt, buildContinuePrompt,
  buildNextChapterPrompt, buildRewritePrompt, buildVotePrompt,
} from '@/services/prompts';
import { GROWTH_STAGES, getStageForChapter } from '@/services/writing-framework';
import { cn, formatWordCount } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, Loader2, StopCircle,
  AlertTriangle, CheckCircle2, Clock, User, Target, Wand2, ArrowRight,
  RefreshCw, ThumbsUp, Copy, Check,
} from 'lucide-react';
import OutlineReview from './OutlineReview';

// ─── Toolbar actions ────────────────────────────────────────
type ToolAction = 'generate' | 'continue' | 'next-chapter' | 'rewrite' | 'vote' | null;

export default function ChapterEditor() {
  // ─── Stores ──────────────────────────────────────────────
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const apiConfig = useNovelStore((s) => s.apiConfig);
  const updateChapter = useNovelStore((s) => s.updateChapter);
  const addChapter = useNovelStore((s) => s.addChapter);
  const deleteChapter = useNovelStore((s) => s.deleteChapter);
  const updateNovel = useNovelStore((s) => s.updateNovel);
  const updateGlobalMemory = useNovelStore((s) => s.updateGlobalMemory);
  const selectedChapterId = useUIStore((s) => s.selectedChapterId);
  const setSelectedChapterId = useUIStore((s) => s.setSelectedChapterId);
  const setEditorMode = useUIStore((s) => s.setEditorMode);
  const isGenerating = useUIStore((s) => s.isGeneratingChapter);
  const setIsGenerating = useUIStore((s) => s.setIsGeneratingChapter);
  const generationError = useUIStore((s) => s.generationError);
  const setGenerationError = useUIStore((s) => s.setGenerationError);

  // ─── Local state ─────────────────────────────────────────
  const [localContent, setLocalContent] = useState('');
  const [localTitle, setLocalTitle] = useState('');
  const [saved, setSaved] = useState(true);
  const [activeAction, setActiveAction] = useState<ToolAction>(null);
  const [selectedText, setSelectedText] = useState('');
  const [copied, setCopied] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Derived data ───────────────────────────────────────
  const chapters = currentNovel?.chapters ?? [];
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
  const currentChapter = chapters.find((c) => c.id === selectedChapterId) ?? null;
  const currentIndex = currentChapter ? sortedChapters.findIndex((c) => c.id === currentChapter.id) : -1;
  const totalChapters = currentNovel?.chapterCount || chapters.length || 10;
  const stageId = currentIndex >= 0 ? getStageForChapter(currentIndex, totalChapters, currentNovel?.writeMode || 'long') : 1;
  const stageInfo = GROWTH_STAGES.find((s) => s.id === stageId) || GROWTH_STAGES[0];
  const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;

  // ─── Sync chapter data ───────────────────────────────────
  useEffect(() => {
    if (currentChapter) { setLocalContent(currentChapter.content); setLocalTitle(currentChapter.title); }
  }, [currentChapter?.id]);

  // ─── Auto-save ──────────────────────────────────────────
  useEffect(() => {
    if (!currentNovel || !currentChapter || isGenerating) return;
    setSaved(false);
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      updateChapter(currentNovel.id, currentChapter.id, { content: localContent, title: localTitle });
      setSaved(true);
    }, 800);
    return () => clearTimeout(autoSaveTimer.current);
  }, [localContent, localTitle]);

  // ─── Flush save on unmount ──────────────────────────────
  useEffect(() => {
    return () => {
      if (currentNovel && currentChapter && !saved) {
        updateChapter(currentNovel.id, currentChapter.id, { content: localContent, title: localTitle });
      }
    };
  }, []);

  // ─── Navigation ─────────────────────────────────────────
  const navigateChapter = useCallback((dir: 'prev' | 'next') => {
    const nextIdx = dir === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIdx >= 0 && nextIdx < sortedChapters.length) {
      setSelectedChapterId(sortedChapters[nextIdx].id);
    }
  }, [currentIndex, sortedChapters]);

  const handleNewChapter = () => {
    if (!currentNovel) return;
    const nextNum = currentNovel.chapters.length + 1;
    const id = addChapter(currentNovel.id, `第 ${nextNum} 章`);
    updateNovel(currentNovel.id, { chapterCount: Math.max(currentNovel.chapterCount, nextNum) });
    setSelectedChapterId(id);
  };

  const handleDeleteChapter = () => {
    if (!currentNovel || !currentChapter) return;
    if (!confirm(`确定删除「${currentChapter.title}」？`)) return;
    deleteChapter(currentNovel.id, currentChapter.id);
    if (sortedChapters.length > 1) {
      const next = sortedChapters[currentIndex + 1] ?? sortedChapters[currentIndex - 1];
      if (next) setSelectedChapterId(next.id);
    }
  };

  // ─── Parse AI output ────────────────────────────────────
  const parseGeneratedText = (fullText: string) => {
    const content = fullText
      .replace(/【本章成长记录】[\s\S]*$/, '')
      .replace(/【本章记忆更新】[\s\S]*$/, '')
      .replace(/【章节标题】[^\n]*\n?/, '')
      .replace(/【作家的话】[\s\S]*$/, '')
      .trim();
    const growthMatch = fullText.match(/【本章成长记录】([\s\S]*?)(?=【本章记忆更新】|【作家的话】|$)/);
    const memoryMatch = fullText.match(/【本章记忆更新】([\s\S]*?)(?=【作家的话】|$)/);
    const authorNote = fullText.match(/【作家的话】([\s\S]*?)$/);
    return { content, growthMatch, memoryMatch, authorNote };
  };

  const saveGeneratedResult = (fullText: string, targetChapterId: string) => {
    const { content, growthMatch, memoryMatch } = parseGeneratedText(fullText);
    updateChapter(currentNovel!.id, targetChapterId, {
      content,
      status: 'completed',
      growthRecord: {
        chapterIndex: currentIndex,
        stage: stageId as 1 | 2 | 3 | 4 | 5,
        stageName: stageInfo.name,
        psychologicalChange: growthMatch?.[1]?.trim() || '',
        timelineNode: '',
      },
    });
    if (memoryMatch) {
      updateGlobalMemory(currentNovel!.id, { notes: memoryMatch[1].trim().slice(0, 300) });
    }
    return content;
  };

  // ─── Streaming generator ────────────────────────────────
  const streamGenerate = async (
    prompt: string,
    onDisplay: (text: string) => void,
  ): Promise<string> => {
    const controller = new AbortController();
    abortRef.current = controller;
    let lastText = '';

    const fullText = await fetchAIStream({
      prompt, maxTokens: 4096, apiConfig, signal: controller.signal,
      onToken: (token) => {
        lastText = token;
        const display = token
          .replace(/【本章成长记录】[\s\S]*$/, '')
          .replace(/【本章记忆更新】[\s\S]*$/, '')
          .replace(/【章节标题】[^\n]*\n?/, '')
          .replace(/【作家的话】[\s\S]*$/, '')
          .trim();
        onDisplay(display);
      },
    });
    return fullText;
  };

  // ─── Build context helpers ──────────────────────────────
  const getContext = () => ({
    genre: currentNovel?.genre || '',
    protagonist: currentNovel?.protagonist
      ? `${currentNovel.protagonist.name}·${currentNovel.protagonist.gender}·${currentNovel.protagonist.personality}`
      : '',
    outline: currentNovel?.generationOutline?.outline || currentNovel?.description || '',
    location: currentNovel?.globalMemory?.location || '',
    memoryNotes: currentNovel?.globalMemory?.notes || '',
  });

  // ─── Action: AI 生成本章 ────────────────────────────────
  const handleGenerateChapter = async () => {
    if (!currentNovel || !currentChapter || !apiConfig.key) {
      setGenerationError('请先配置 API Key'); return;
    }
    setIsGenerating(true); setActiveAction('generate'); setGenerationError(null);
    setLocalContent('');

    try {
      const ctx = getContext();
      const prompt = buildChapterPrompt({
        title: currentChapter.title,
        summary: currentChapter.summary || currentChapter.title,
        prevTail: prevChapter?.content?.slice(-400) || '',
        chapterIndex: currentIndex, totalChapters,
        writeMode: currentNovel.writeMode,
        genre: ctx.genre, protagonist: ctx.protagonist,
        outline: ctx.outline, location: ctx.location, memoryNotes: ctx.memoryNotes,
      });

      const fullText = await streamGenerate(prompt, setLocalContent);
      const finalContent = saveGeneratedResult(fullText, currentChapter.id);
      setLocalContent(finalContent);
      setSaved(true);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGenerationError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false); setActiveAction(null); abortRef.current = null;
    }
  };

  // ─── Action: 续写本章 ───────────────────────────────────
  const handleContinue = async () => {
    if (!currentNovel || !currentChapter || !apiConfig.key) {
      setGenerationError('请先配置 API Key'); return;
    }
    setIsGenerating(true); setActiveAction('continue'); setGenerationError(null);

    try {
      const ctx = getContext();
      const prompt = buildContinuePrompt({
        currentText: localContent,
        genre: ctx.genre,
        protagonist: ctx.protagonist,
        globalMemory: ctx.memoryNotes,
      });

      const continuation = await streamGenerate(prompt, (token) => {
        setLocalContent(localContent + '\n\n' + token);
      });
      const newContent = localContent + '\n\n' + continuation;
      setLocalContent(newContent);
      setSaved(false);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGenerationError(err instanceof Error ? err.message : '续写失败');
    } finally {
      setIsGenerating(false); setActiveAction(null); abortRef.current = null;
    }
  };

  // ─── Action: 创作下一章 ─────────────────────────────────
  const handleNextChapter = async () => {
    if (!currentNovel || !apiConfig.key) {
      setGenerationError('请先配置 API Key'); return;
    }
    const nextIdx = currentIndex + 1;
    if (nextIdx >= sortedChapters.length) {
      // No next chapter defined — create one
      const nextNum = sortedChapters.length + 1;
      const id = addChapter(currentNovel.id, `第 ${nextNum} 章`);
      updateNovel(currentNovel.id, { chapterCount: Math.max(currentNovel.chapterCount, nextNum) });
      setSelectedChapterId(id);
      setGenerationError('已创建新章节，请点击 AI 生成');
      return;
    }

    const nextChapter = sortedChapters[nextIdx];
    setIsGenerating(true); setActiveAction('next-chapter'); setGenerationError(null);
    setSelectedChapterId(nextChapter.id); setLocalContent('');

    try {
      const ctx = getContext();
      const prompt = buildNextChapterPrompt({
        nextTitle: nextChapter.title,
        nextSummary: nextChapter.summary || nextChapter.title,
        prevChapterContent: localContent,
        chapterIndex: nextIdx, totalChapters,
        writeMode: currentNovel.writeMode,
        genre: ctx.genre, protagonist: ctx.protagonist,
        outline: ctx.outline, globalMemory: ctx.memoryNotes,
      });

      const fullText = await streamGenerate(prompt, setLocalContent);
      const finalContent = saveGeneratedResult(fullText, nextChapter.id);
      setLocalContent(finalContent);
      setSaved(true);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGenerationError(err instanceof Error ? err.message : '生成下一章失败');
    } finally {
      setIsGenerating(false); setActiveAction(null); abortRef.current = null;
    }
  };

  // ─── Action: 改写选中文字 ───────────────────────────────
  const handleRewrite = async () => {
    if (!currentNovel || !apiConfig.key) {
      setGenerationError('请先配置 API Key'); return;
    }
    const text = selectedText || (textareaRef.current ?
      textareaRef.current.value.substring(
        textareaRef.current.selectionStart,
        textareaRef.current.selectionEnd
      ) : '');

    if (!text || text.length < 10) {
      setGenerationError('请先选中要改写的文字（至少10字）'); return;
    }

    setIsGenerating(true); setActiveAction('rewrite'); setGenerationError(null);

    try {
      const ctx = getContext();
      const prompt = buildRewritePrompt({
        selectedText: text,
        style: '增强画面感和节奏感，Show Don\'t Tell，用感官细节替代陈述句',
        context: ctx.genre + ' · ' + ctx.protagonist,
      });

      const rewritten = await streamGenerate(prompt, (token) => {
        const newContent = localContent.replace(text, token);
        setLocalContent(newContent);
      });
      const finalContent = localContent.replace(text, rewritten);
      setLocalContent(finalContent);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGenerationError(err instanceof Error ? err.message : '改写失败');
    } finally {
      setIsGenerating(false); setActiveAction(null); abortRef.current = null;
    }
  };

  // ─── Action: 求票文案 ───────────────────────────────────
  const handleVoteRequest = async () => {
    if (!currentNovel || !apiConfig.key) {
      setGenerationError('请先配置 API Key'); return;
    }
    setIsGenerating(true); setActiveAction('vote'); setGenerationError(null);

    try {
      const prompt = buildVotePrompt({
        bookTitle: currentNovel.title,
        recentContent: localContent,
        chapterInfo: `${currentIndex + 1}/${totalChapters} 章`,
        type: '推荐票',
      });

      const text = await streamGenerate(prompt, (token) => {});
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGenerationError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false); setActiveAction(null); abortRef.current = null;
    }
  };

  const handleStop = () => { abortRef.current?.abort(); };

  const handleSelectionChange = () => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const text = ta.value.substring(ta.selectionStart, ta.selectionEnd);
    setSelectedText(text);
  };

  // ─── Conditional renders ─────────────────────────────────
  if (!currentNovel) return null;

  if (currentNovel.generationPhase === 'outline-review') {
    return <OutlineReview />;
  }

  if (chapters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <Sparkles size={40} className="text-[var(--color-accent)] mb-4" strokeWidth={1} />
        <h3 className="text-lg font-medium text-[var(--color-text-secondary)] mb-2">先创建大纲</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm">
          在灵感输入中填写创意，AI 自动生成大纲和初始章节
        </p>
        <button onClick={() => setEditorMode('inspiration')} className="btn-primary">
          <Sparkles size={15} />去灵感输入
        </button>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ═══ Chapter header bar ═══ */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-[var(--color-border-primary)] shrink-0">
        {/* Left: navigation */}
        <div className="flex items-center gap-1">
          <button onClick={() => navigateChapter('prev')} disabled={currentIndex <= 0} className="btn-ghost px-1.5 disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          <input
            value={localTitle} onChange={(e) => setLocalTitle(e.target.value)}
            className="bg-transparent text-sm font-medium text-[var(--color-text-primary)] outline-none border-b border-transparent hover:border-[var(--color-border-accent)] focus:border-[var(--color-accent)] px-1 py-0.5 min-w-[100px] max-w-[200px]"
            placeholder="章节标题"
          />
          {currentChapter && <span className="text-xs text-[var(--color-text-dim)]">{formatWordCount(localContent.length)}</span>}
          <button onClick={() => navigateChapter('next')} disabled={currentIndex >= sortedChapters.length - 1} className="btn-ghost px-1.5 disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Right: stage + actions */}
        <div className="flex items-center gap-1.5">
          <div className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ color: stageInfo.color, background: `${stageInfo.color}15` }}>
            <Target size={10} />{stageInfo.name}
          </div>
          <span className={cn('text-[10px] w-12 text-center', saved ? 'text-[var(--color-green)]' : 'text-[var(--color-text-dim)]')}>
            {saved ? '已保存' : '未保存'}
          </span>
          <button onClick={handleNewChapter} className="btn-ghost px-1.5" title="新建章节"><Plus size={15} /></button>
          {currentChapter && (
            <button onClick={handleDeleteChapter} className="btn-ghost px-1.5 hover:text-[var(--color-red)]" title="删除章节"><Trash2 size={14} /></button>
          )}
        </div>
      </div>

      {/* ═══ Toolbar ═══ */}
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-[var(--color-border-secondary)] bg-[var(--color-bg-secondary)] shrink-0">
        <ToolButton icon={Sparkles} label="AI 生成" desc="根据大纲生成当前章节" active={activeAction === 'generate'} loading={isGenerating && activeAction === 'generate'} onClick={handleGenerateChapter} disabled={!apiConfig.key} />
        <div className="w-px h-4 bg-[var(--color-border-primary)] mx-1" />
        <ToolButton icon={Wand2} label="续写本章" desc="从当前正文末尾接续" active={activeAction === 'continue'} loading={isGenerating && activeAction === 'continue'} onClick={handleContinue} disabled={!apiConfig.key || !localContent} />
        <ToolButton icon={ArrowRight} label="下一章" desc="生成下一章内容" active={activeAction === 'next-chapter'} loading={isGenerating && activeAction === 'next-chapter'} onClick={handleNextChapter} disabled={!apiConfig.key || !localContent} />
        <div className="w-px h-4 bg-[var(--color-border-primary)] mx-1" />
        <ToolButton icon={RefreshCw} label="改写选中" desc="选中文字后点击改写" active={activeAction === 'rewrite'} loading={isGenerating && activeAction === 'rewrite'} onClick={handleRewrite} disabled={!apiConfig.key} />
        <ToolButton icon={ThumbsUp} label="求票文案" desc="生成求票文案并复制" active={activeAction === 'vote'} loading={isGenerating && activeAction === 'vote'} onClick={handleVoteRequest} disabled={!apiConfig.key} />
        <button onClick={handleStop} className={cn('ml-auto btn-ghost px-1.5 text-[var(--color-red)]', !isGenerating && 'hidden')} title="停止生成">
          <StopCircle size={14} />
        </button>
      </div>

      {/* ═══ Generation error ═══ */}
      {generationError && (
        <div className="mx-4 mt-2 flex items-center gap-2 p-2 px-3 rounded-[var(--radius-sm)] bg-[var(--color-red-bg)] border border-[var(--color-red)]/20 text-[var(--color-red)] text-xs animate-fade-in">
          <AlertTriangle size={13} />
          {generationError}
          <button onClick={() => setGenerationError(null)} className="ml-auto text-[var(--color-text-dim)] hover:text-white">×</button>
        </div>
      )}

      {/* ═══ Copied toast ═══ */}
      {copied && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-green-bg)] border border-[var(--color-green)]/20 text-[var(--color-green)] text-xs animate-fade-in">
          <Check size={12} />已复制到剪贴板
        </div>
      )}

      {/* ═══ Main writing area ═══ */}
      <div className="flex-1 relative overflow-hidden">
        {isGenerating && (
          <div className="absolute top-2 right-4 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-accent-bg)] border border-[var(--color-accent)]/20 text-xs text-[var(--color-accent)] animate-fade-in">
            <Loader2 size={12} className="animate-spin" />
            <span className="animate-pulse">
              {activeAction === 'generate' && '正在创作...'}
              {activeAction === 'continue' && '正在续写...'}
              {activeAction === 'next-chapter' && '正在生成下一章...'}
              {activeAction === 'rewrite' && '正在改写...'}
              {activeAction === 'vote' && '正在生成文案...'}
            </span>
          </div>
        )}

        {currentChapter ? (
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onMouseUp={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            className={cn(
              'w-full h-full p-6 textarea-writer transition-all',
              isGenerating && 'opacity-80'
            )}
            placeholder={isGenerating ? '' : '开始书写你的故事，或点击上方工具栏...'}
            readOnly={isGenerating}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-text-muted)]">
            选择一个章节开始写作
          </div>
        )}
      </div>

      {/* ═══ Bottom: chapter strip + AI button ═══ */}
      <div className="border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-3 py-2 shrink-0 flex items-center gap-3">
        {currentChapter && (
          <button
            onClick={isGenerating ? handleStop : handleGenerateChapter}
            disabled={!apiConfig.key && !isGenerating}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-all',
              isGenerating
                ? 'bg-[var(--color-red-bg)] text-[var(--color-red)] border border-[var(--color-red)]/20'
                : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20'
            )}
            title={!apiConfig.key ? '请先配置 API Key' : isGenerating ? '停止生成' : 'AI 生成本章'}
          >
            {isGenerating ? <><StopCircle size={13} />停止</> : <><Sparkles size={13} />AI 生成</>}
          </button>
        )}
        <div className="flex items-center gap-1 overflow-x-auto flex-1">
          {sortedChapters.map((ch, idx) => {
            const chStageId = getStageForChapter(idx, totalChapters, currentNovel.writeMode);
            const chStage = GROWTH_STAGES.find((s) => s.id === chStageId);
            return (
              <button key={ch.id}
                onClick={() => setSelectedChapterId(ch.id)}
                className={cn(
                  'shrink-0 px-2.5 py-1 rounded-[var(--radius-sm)] text-xs transition-all border flex items-center gap-1',
                  ch.id === currentChapter?.id
                    ? 'bg-[var(--color-accent-bg)] border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: chStage?.color || '#666' }} />
                <span className="text-[10px] text-[var(--color-text-dim)]">{idx + 1}.</span>
                {ch.title || '未命名'}
                {ch.content && <CheckCircle2 size={10} className="text-[var(--color-green)]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Growth stage progress bar ═══ */}
      <div className="border-t border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-4 py-1.5 flex items-center gap-3 text-[10px] text-[var(--color-text-dim)] shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Target size={10} className="text-[var(--color-accent)]" />阶段 {stageId}/5</span>
          <span className="flex items-center gap-1"><Clock size={10} />{currentIndex + 1} / {totalChapters} 章</span>
          {currentNovel.protagonist && (
            <span className="flex items-center gap-1"><User size={10} />{currentNovel.protagonist.name}</span>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          {GROWTH_STAGES.map((s) => (
            <div key={s.id} className="w-12 h-1 rounded-full transition-all duration-500"
              style={{ background: s.id <= stageId ? s.color : 'var(--color-border-primary)', opacity: s.id <= stageId ? 1 : 0.4 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Toolbar button ────────────────────────────────────────
function ToolButton({
  icon: Icon, label, desc, active, loading, onClick, disabled,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string; desc: string; active: boolean; loading: boolean;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-xs transition-all group relative',
        active
          ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)]'
          : disabled
            ? 'text-[var(--color-text-dim)] cursor-not-allowed'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
      )}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} className={active ? 'text-[var(--color-accent)]' : ''} />}
      {label}
      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-[var(--color-text-dim)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
        {desc}
      </span>
    </button>
  );
}
