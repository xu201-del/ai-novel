'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import { fetchAIStream } from '@/services/api';
import {
  buildChapterPrompt, buildChapterBodyPrompt, buildContinuePrompt,
  buildNextChapterPrompt, buildRewritePrompt,
} from '@/services/prompts';
import { GROWTH_STAGES, getStageForChapter } from '@/services/writing-framework';
import { getChapterContext } from '@/services/framework-prompts';
import { cn, formatWordCount } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, Loader2, StopCircle,
  CheckCircle2, GanttChart, Pen, ListTree, Users, Copy, Check,
} from 'lucide-react';
import type { PipelineStage } from '@/types';
import { PIPELINE_STAGES } from '@/types';
import OutlineReview from './OutlineReview';
import VoteDropdown from '@/components/ui/VoteDropdown';

// ═══════════════════════════════════════════════════════════
// Toolbar action types
// ═══════════════════════════════════════════════════════════
type ToolAction = 'generate' | 'continue' | 'next-chapter' | 'rewrite' | 'vote' | null;

// ═══════════════════════════════════════════════════════════
// Floating selection menu
// ═══════════════════════════════════════════════════════════
function FloatingMenu({ position, onSensory, onRewrite, onClose }: {
  position: { top: number; left: number };
  onSensory: () => void;
  onRewrite: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed z-50 animate-fade-in"
      style={{ top: position.top - 8, left: position.left, transform: 'translate(-50%, -100%)' }}
    >
      <div className="flex items-center gap-1 p-1.5 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-2xl shadow-black/40">
        <button
          onClick={onSensory}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-accent)] transition-all duration-200 whitespace-nowrap"
        >
          <Sparkles size={12} strokeWidth={1.5} />
          描述五感
        </button>
        <div className="w-px h-4 bg-[var(--color-border-primary)]" />
        <button
          onClick={onRewrite}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-purple)] transition-all duration-200 whitespace-nowrap"
        >
          <Pen size={12} strokeWidth={1.5} />
          风格重写
        </button>
      </div>
      {/* Arrow */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1">
        <div className="w-2 h-2 rotate-45 bg-[var(--color-bg-elevated)] border-r border-b border-[var(--color-border-primary)]" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Story Engine Pipeline FSM Bar
// ═══════════════════════════════════════════════════════════
function StoryPipelineBar({ currentStage, completed, onStageClick }: {
  currentStage: PipelineStage;
  completed: PipelineStage[];
  onStageClick: (stage: PipelineStage) => void;
}) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shrink-0">
      <span className="text-[10px] text-[var(--color-text-dim)] mr-2 shrink-0">流水线</span>
      {PIPELINE_STAGES.map((stage, i) => {
        const Icon = PIPELINE_ICONS[stage.id];
        const isCompleted = completed.includes(stage.id);
        const isCurrent = currentStage === stage.id;
        const isLocked = !isCompleted && !isCurrent && i > 0 && !completed.includes(PIPELINE_STAGES[i - 1].id);

        return (
          <div key={stage.id} className="flex items-center gap-1">
            {i > 0 && (
              <div className={cn(
                'w-3 h-px transition-colors duration-300',
                isCompleted ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-primary)]'
              )} />
            )}
            <button
              onClick={() => onStageClick(stage.id)}
              disabled={isLocked}
              title={`${stage.label}: ${stage.desc}${isLocked ? ' (前置阶段未完成)' : ''}`}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-md)] text-[10px] transition-all duration-300',
                isCurrent && 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/30',
                isCompleted && !isCurrent && 'text-[var(--color-green)]',
                !isCompleted && !isCurrent && !isLocked && 'text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)]',
                isLocked && 'text-[var(--color-text-dim)] opacity-30 cursor-not-allowed'
              )}
            >
              <Icon size={11} strokeWidth={isCurrent ? 2 : 1.5} />
              <span className="hidden sm:inline">{stage.label}</span>
              {isCompleted && <CheckCircle2 size={9} className="text-[var(--color-green)]" />}
              {isCurrent && !isCompleted && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

const PIPELINE_ICONS: Record<PipelineStage, typeof GanttChart> = {
  outline: ListTree,
  characters: Users,
  beats: GanttChart,
  drafting: Pen,
  polish: Sparkles,
};

// ═══════════════════════════════════════════════════════════
// Chapter Editor — Main Component
// ═══════════════════════════════════════════════════════════
export default function ChapterEditor() {
  // ─── Stores ──────────────────────────────────────────────
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const apiConfig = useNovelStore((s) => s.apiConfig);
  const updateChapter = useNovelStore((s) => s.updateChapter);
  const addChapter = useNovelStore((s) => s.addChapter);
  const deleteChapter = useNovelStore((s) => s.deleteChapter);
  const updateNovel = useNovelStore((s) => s.updateNovel);
  const updateGlobalMemory = useNovelStore((s) => s.updateGlobalMemory);
  const setPipelineStage = useNovelStore((s) => s.setPipelineStage);
  const selectedChapterId = useUIStore((s) => s.selectedChapterId);
  const setSelectedChapterId = useUIStore((s) => s.setSelectedChapterId);
  const setEditorMode = useUIStore((s) => s.setEditorMode);
  const isGenerating = useUIStore((s) => s.isGeneratingChapter);
  const setIsGenerating = useUIStore((s) => s.setIsGeneratingChapter);
  const generationError = useUIStore((s) => s.generationError);
  const setGenerationError = useUIStore((s) => s.setGenerationError);
  const addAICard = useUIStore((s) => s.addAICard);

  // ─── Local state ─────────────────────────────────────────
  const editorRef = useRef<HTMLDivElement>(null);
  const [localContent, setLocalContent] = useState('');
  const [localTitle, setLocalTitle] = useState('');
  const [saved, setSaved] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeAction, setActiveAction] = useState<ToolAction>(null);
  const [selectedText, setSelectedText] = useState('');
  const [floatingMenu, setFloatingMenu] = useState<{ top: number; left: number } | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  // ─── Derived data ───────────────────────────────────────
  const chapters = currentNovel?.chapters ?? [];
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
  const currentChapter = chapters.find((c) => c.id === selectedChapterId) ?? null;
  const currentIndex = currentChapter ? sortedChapters.findIndex((c) => c.id === currentChapter.id) : -1;
  const totalChapters = currentNovel?.chapterCount || chapters.length || 10;
  const stageId = currentIndex >= 0 ? getStageForChapter(currentIndex, totalChapters, currentNovel?.writeMode || 'long') : 1;
  const stageInfo = GROWTH_STAGES.find((s) => s.id === stageId) || GROWTH_STAGES[0];
  const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;

  // ─── Sync content from selected chapter ─────────────────
  useEffect(() => {
    if (currentChapter) {
      setLocalContent(currentChapter.content);
      setLocalTitle(currentChapter.title);
      setSaved(true);
    }
  }, [currentChapter?.id]);

  // ─── Auto-save (800ms debounce) ─────────────────────────
  const triggerSave = useCallback((content: string, title: string) => {
    if (!currentNovel || !currentChapter) return;
    setSaved(false);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      updateChapter(currentNovel.id, currentChapter.id, { content, title });
      setSaved(true);
    }, 800);
  }, [currentNovel?.id, currentChapter?.id, updateChapter]);

  // ─── Handle contentEditable input ───────────────────────
  const handleEditorInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const text = extractText(editor);
    setLocalContent(text);
    triggerSave(text, localTitle);
  }, [localTitle, triggerSave]);

  // ─── Extract plain text from contentEditable ────────────
  const extractText = (el: HTMLElement): string => {
    let text = '';
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement;
        if (elem.tagName === 'BR') {
          text += '\n';
        } else if (elem.tagName === 'DIV' || elem.tagName === 'P') {
          text += extractText(elem) + '\n';
        } else {
          text += extractText(elem);
        }
      }
    });
    return text;
  };

  // ─── Render plain text to contentEditable HTML ──────────
  const renderContentToHtml = (content: string, aiSegments?: Array<{ start: number; end: number; id: string }>): string => {
    if (!aiSegments || aiSegments.length === 0) {
      return content.split('\n').map((p, i) => `<p>${p || '<br>'}</p>`).join('');
    }
    // Build spans with AI markers
    const sorted = [...aiSegments].sort((a, b) => a.start - b.start);
    let result = '';
    let cursor = 0;
    for (const seg of sorted) {
      if (seg.start > cursor) {
        result += escapeHtml(content.slice(cursor, seg.start));
      }
      result += `<span data-ai-generated="${seg.id}" class="text-amber-400 bg-amber-500/10 transition-colors duration-1000 animate-pulse">${escapeHtml(content.slice(seg.start, seg.end))}</span>`;
      cursor = seg.end;
    }
    if (cursor < content.length) {
      result += escapeHtml(content.slice(cursor));
    }
    return result.split('\n').map((p) => `<p>${p || '<br>'}</p>`).join('');
  };

  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ─── AI text segments tracking ──────────────────────────
  const [aiSegments, setAiSegments] = useState<Array<{ start: number; end: number; id: string }>>([]);

  // ─── Re-render contentEditable when content/segments change ──
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || activeAction) return; // Don't overwrite during generation
    const sel = saveSelection(editor);
    editor.innerHTML = renderContentToHtml(localContent, aiSegments);
    restoreSelection(editor, sel);
  }, [localContent, aiSegments]);

  // ─── Save/restore cursor in contentEditable ─────────────
  const saveSelection = (containerEl: HTMLElement): { start: number; end: number } | null => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(containerEl);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const start = preCaretRange.toString().length;
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const end = preCaretRange.toString().length;
    return { start, end };
  };

  const restoreSelection = (containerEl: HTMLElement, saved: { start: number; end: number } | null) => {
    if (!saved) return;
    try {
      const charIndex = (node: Node, target: number): { node: Node; offset: number } => {
        if (node.nodeType === Node.TEXT_NODE) {
          return { node, offset: Math.min(target, (node.textContent || '').length) };
        }
        for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i];
          const len = (child.textContent || '').length;
          if (target <= len) return charIndex(child, target);
          target -= len;
        }
        return { node, offset: 0 };
      };
      const range = document.createRange();
      const start = charIndex(containerEl, saved.start);
      const end = charIndex(containerEl, saved.end);
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch {
      // ignore
    }
  };

  // ─── Handle selection for floating menu ─────────────────
  const handleSelectionChange = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setFloatingMenu(null);
        setSelectedText('');
        return;
      }
      const text = sel.toString().trim();
      if (!text || text.length < 2) {
        setFloatingMenu(null);
        setSelectedText('');
        return;
      }

      // Check if selection is within our editor
      const editor = editorRef.current;
      if (!editor || !editor.contains(sel.anchorNode)) {
        setFloatingMenu(null);
        setSelectedText('');
        return;
      }

      setSelectedText(text);

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setFloatingMenu({
        top: rect.top + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX,
      });
    }, 10);
  }, []);

  // ─── Listen for human edits on AI-generated spans ───────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleKeydown = (e: KeyboardEvent) => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      let node: Node | null = sel.anchorNode;
      while (node && node !== editor) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.hasAttribute('data-ai-generated')) {
            // Human editing AI text — strip the marker
            el.removeAttribute('data-ai-generated');
            el.className = '';
            el.style.cssText = '';
            setAiSegments((prev) => prev.filter((s) => s.id !== el.getAttribute('data-ai-generated-id')));
            break;
          }
        }
        node = node.parentNode;
      }
    };

    editor.addEventListener('keydown', handleKeydown);
    return () => editor.removeEventListener('keydown', handleKeydown);
  }, []);

  // ─── Insert AI text at cursor ────────────────────────────
  const insertAIText = useCallback((text: string, cardId: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const currentText = extractText(editor);
    const insertPos = saveSelection(editor);
    const startPos = insertPos ? insertPos.start : currentText.length;

    const span = document.createElement('span');
    span.setAttribute('data-ai-generated', 'true');
    span.setAttribute('data-ai-generated-id', cardId);
    span.className = 'text-amber-400 bg-amber-500/10 transition-colors duration-1000 animate-pulse';
    span.textContent = text;

    range.insertNode(span);
    range.setStartAfter(span);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    // Track segment
    setAiSegments((prev) => [...prev, { start: startPos, end: startPos + text.length, id: cardId }]);

    // Update content and save
    const newContent = extractText(editor);
    setLocalContent(newContent);
    triggerSave(newContent, localTitle);
  }, [localTitle, triggerSave]);

  // Expose insertAIText to parent via a ref trick — actually use store
  // The RightPanel will dispatch a custom event
  useEffect(() => {
    const handler = (e: CustomEvent<{ text: string; cardId: string }>) => {
      insertAIText(e.detail.text, e.detail.cardId);
    };
    window.addEventListener('inkflow:insert-ai-text', handler as EventListener);
    return () => window.removeEventListener('inkflow:insert-ai-text', handler as EventListener);
  }, [insertAIText]);

  // ─── Title editing ──────────────────────────────────────
  const handleTitleChange = (val: string) => {
    setLocalTitle(val);
    triggerSave(localContent, val);
  };

  // ─── Chapter navigation ─────────────────────────────────
  const goToChapter = (chId: string | null) => {
    if (!chId) return;
    setSelectedChapterId(chId);
  };

  // ─── Parse AI response ──────────────────────────────────
  const parseGeneratedText = (raw: string) => {
    const contentMatch = raw.match(/【章节标题】[^\n]*\n([\s\S]*?)(?=【本章成长记录】|$)/);
    const growthMatch = raw.match(/【本章成长记录】\n([\s\S]*?)(?=【本章记忆更新】|$)/);
    const memoryMatch = raw.match(/【本章记忆更新】\n([\s\S]*?)$/);

    const content = contentMatch?.[1]?.trim() || raw;
    const growthText = growthMatch?.[1]?.trim() || '';
    const memoryText = memoryMatch?.[1]?.trim() || '';

    // Parse growth fields
    const stageName = growthText.match(/当前阶段[：:]\s*(.+)/)?.[1]?.trim();
    const psychChange = growthText.match(/心理关键变化[：:]\s*(.+)/)?.[1]?.trim();
    const timelineNode = growthText.match(/时间线节点[：:]\s*(.+)/)?.[1]?.trim();

    // Parse memory fields
    const charStates = memoryText.match(/人物状态[：:]\s*([\s\S]*?)(?=重要情节[：:]|下一章|$)/)?.[1]?.trim();
    const keyEvents = memoryText.match(/重要情节[：:]\s*([\s\S]*?)(?=下一章|$)/)?.[1]?.trim();
    const nextDirs = memoryText.match(/下一章[^\n:：]*[：:]\s*([\s\S]*)/)?.[1]?.trim();

    return { content, growthText, memoryText, stageName, psychChange, timelineNode, charStates, keyEvents, nextDirs };
  };

  // ─── Generic generation handler ─────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!currentNovel || !currentChapter || !apiConfig.key) return;
    const abort = new AbortController();
    abortRef.current = abort;
    setActiveAction('generate');
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const prevTail = currentChapter.content.slice(-500);

      // ── 尝试匹配篇章裂变引擎的微蓝图 ──
      const fw = currentNovel.novelFramework;
      const currentVolume = fw?.volumes?.find(
        (v) => currentIndex + 1 >= v.chapterRange[0] && currentIndex + 1 <= v.chapterRange[1],
      );
      const deducedChapters = currentVolume ? (currentNovel.volumeChapters?.[currentVolume.id] ?? []) : [];
      const deducedChapter = deducedChapters[currentIndex + 1 - (currentVolume?.chapterRange[0] ?? 1)];

      // 提取当前章节的大纲子框架
      const outlineChapter = currentNovel.generationOutline?.chapters?.[currentIndex];
      const chapterOutline = outlineChapter && 'coreConflict' in outlineChapter
        ? {
            coreConflict: outlineChapter.coreConflict,
            plotFlow: outlineChapter.plotFlow,
            informationAsymmetry: outlineChapter.informationAsymmetry,
            visualSymbol: outlineChapter.visualSymbol,
            cliffhangerPoint: outlineChapter.cliffhangerPoint,
            industryLore: outlineChapter.industryLore,
            uiMetrics: outlineChapter.uiMetrics,
          }
        : undefined;

      const prompt = deducedChapter && currentVolume
        ? buildChapterBodyPrompt({
            activeVolumeTitle: currentVolume.title,
            activeVolumeEnding: currentVolume.volumeEnding,
            activeChapterTitle: deducedChapter.chapterTitle,
            activeChapterPlot: deducedChapter.microPlot,
            activeChapterCliffhanger: deducedChapter.cliffhangerPoint || '剧情情绪最高潮瞬间',
            lastChapterText: prevTail,
          })
        : buildChapterPrompt({
        title: currentChapter.title,
        summary: currentChapter.summary,
        prevTail,
        chapterIndex: currentIndex,
        totalChapters,
        writeMode: currentNovel.writeMode,
        genre: currentNovel.genre,
        protagonist: currentNovel.protagonist ? `${currentNovel.protagonist.name}（${currentNovel.protagonist.personality}）` : '',
        outline: currentNovel.generationOutline?.outline || '',
        location: currentNovel.globalMemory.location || '',
        memoryNotes: currentNovel.globalMemory.notes || '',
        novelFrameworkContext: currentNovel.novelFramework
          ? getChapterContext(currentNovel.novelFramework, currentIndex)
          : undefined,
        chapterOutline,
      });

      let fullText = '';
      await fetchAIStream({
        prompt,
        apiConfig,
        signal: abort.signal,
        onToken: (text: string) => { fullText = text; },
      });

      const parsed = parseGeneratedText(fullText);
      const generatedContent = parsed.content || fullText;

      // Save to chapter
      updateChapter(currentNovel.id, currentChapter.id, {
        content: generatedContent,
        wordCount: generatedContent.length,
        status: 'completed' as const,
        growthRecord: {
          chapterIndex: currentIndex,
          stage: stageId as 1 | 2 | 3 | 4 | 5,
          stageName: parsed.stageName || stageInfo.name,
          psychologicalChange: parsed.psychChange || '',
          timelineNode: parsed.timelineNode || '',
        },
        memoryUpdate: {
          characterStates: parsed.charStates || '',
          keyEvents: parsed.keyEvents || '',
          nextDirections: parsed.nextDirs ? [parsed.nextDirs] : [],
        },
      });

      setLocalContent(generatedContent);

      // Update global memory
      if (parsed.keyEvents || parsed.charStates) {
        updateGlobalMemory(currentNovel.id, {
          mainPlot: parsed.keyEvents || '',
          characters: parsed.charStates || '',
        });
      }

      // Add card to right panel
      addAICard({
        type: 'generated-text',
        title: `第 ${currentIndex + 1} 章 — 生成`,
        content: generatedContent,
        sourceAction: 'AI 生成',
        chapterId: currentChapter.id,
      });

      // Advance pipeline to drafting
      setPipelineStage(currentNovel.id, 'drafting');

    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : '生成失败';
      setGenerationError(msg);
    } finally {
      setIsGenerating(false);
      setActiveAction(null);
      abortRef.current = null;
    }
  }, [currentNovel?.id, currentChapter?.id, apiConfig.key, currentIndex, totalChapters, stageId, stageInfo.name]);

  // ─── Continue writing ────────────────────────────────────
  const handleContinue = useCallback(async () => {
    if (!currentNovel || !currentChapter || !apiConfig.key) return;
    const abort = new AbortController();
    abortRef.current = abort;
    setActiveAction('continue');
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const prompt = buildContinuePrompt({
        currentText: localContent,
        genre: currentNovel.genre,
        protagonist: currentNovel.protagonist?.name || '',
        globalMemory: currentNovel.globalMemory.mainPlot || '',
      });

      let fullText = '';
      await fetchAIStream({
        prompt,
        apiConfig,
        signal: abort.signal,
        onToken: (text: string) => { fullText = text; },
      });

      const newContent = localContent + '\n\n' + fullText.trim();
      setLocalContent(newContent);
      updateChapter(currentNovel.id, currentChapter.id, { content: newContent, wordCount: newContent.length });

      addAICard({
        type: 'continue',
        title: `${currentChapter.title} — 续写`,
        content: fullText.trim(),
        sourceAction: '续写本章',
        chapterId: currentChapter.id,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGenerationError(err instanceof Error ? err.message : '续写失败');
    } finally {
      setIsGenerating(false);
      setActiveAction(null);
      abortRef.current = null;
    }
  }, [currentNovel?.id, currentChapter?.id, apiConfig.key, localContent]);

  // ─── Next chapter ────────────────────────────────────────
  const handleNextChapter = useCallback(async () => {
    if (!currentNovel || !currentChapter || !apiConfig.key) return;
    const abort = new AbortController();
    abortRef.current = abort;
    setActiveAction('next-chapter');
    setIsGenerating(true);
    setGenerationError(null);

    // Create next chapter if needed
    let nextChId: string;
    if (nextChapter) {
      nextChId = nextChapter.id;
    } else {
      const nidx = sortedChapters.length;
      const total = currentNovel.chapterCount || 10;
      const si = getStageForChapter(nidx, total, currentNovel.writeMode);
      const siName = GROWTH_STAGES.find((s) => s.id === si)?.name || '';
      nextChId = addChapter(currentNovel.id, `第 ${nidx + 1} 章`, `阶段${si}: ${siName}`);
    }

    try {
      const nc = currentNovel.chapters.find((c) => c.id === nextChId);
      const prompt = buildNextChapterPrompt({
        nextTitle: nc?.title || `第 ${sortedChapters.length + 1} 章`,
        nextSummary: nc?.summary || '',
        prevChapterContent: localContent,
        chapterIndex: sortedChapters.length,
        totalChapters: currentNovel.chapterCount || 10,
        writeMode: currentNovel.writeMode,
        genre: currentNovel.genre,
        protagonist: currentNovel.protagonist?.name || '',
        outline: currentNovel.generationOutline?.outline || '',
        globalMemory: currentNovel.globalMemory.mainPlot || '',
        novelFrameworkContext: currentNovel.novelFramework
          ? getChapterContext(currentNovel.novelFramework, sortedChapters.length)
          : undefined,
      });

      let fullText = '';
      await fetchAIStream({
        prompt,
        apiConfig,
        signal: abort.signal,
        onToken: (text: string) => { fullText = text; },
      });

      const parsed = parseGeneratedText(fullText);
      const genContent = parsed.content || fullText;

      updateChapter(currentNovel.id, nextChId, { content: genContent, wordCount: genContent.length });
      setSelectedChapterId(nextChId);

      addAICard({
        type: 'generated-text',
        title: `第 ${sortedChapters.length + 1} 章 — 生成`,
        content: genContent,
        sourceAction: '下一章',
        chapterId: nextChId,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGenerationError(err instanceof Error ? err.message : '生成下一章失败');
    } finally {
      setIsGenerating(false);
      setActiveAction(null);
      abortRef.current = null;
    }
  }, [currentNovel?.id, currentChapter?.id, apiConfig.key, localContent, sortedChapters.length, nextChapter]);

  // ─── Rewrite selected text ───────────────────────────────
  const handleRewrite = useCallback(async (text?: string) => {
    const target = text || selectedText;
    if (!currentNovel || !currentChapter || !apiConfig.key || !target) return;

    const abort = new AbortController();
    abortRef.current = abort;
    setActiveAction('rewrite');
    setIsGenerating(true);
    setFloatingMenu(null);
    setGenerationError(null);

    try {
      const prompt = buildRewritePrompt({
        selectedText: target,
        style: '增强画面感和节奏感，Show Don\'t Tell，用感官细节替代抽象陈述',
        context: localContent.slice(Math.max(0, localContent.indexOf(target) - 200), localContent.indexOf(target) + target.length + 200),
      });

      let fullText = '';
      await fetchAIStream({
        prompt,
        apiConfig,
        signal: abort.signal,
        onToken: (text: string) => { fullText = text; },
      });

      const rewritten = fullText.trim();
      const newContent = localContent.replace(target, rewritten);
      setLocalContent(newContent);
      updateChapter(currentNovel.id, currentChapter.id, { content: newContent, wordCount: newContent.length });

      addAICard({
        type: 'rewrite',
        title: `${currentChapter.title} — 改写`,
        content: rewritten,
        sourceAction: '改写选中',
        chapterId: currentChapter.id,
        compareWith: target,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGenerationError(err instanceof Error ? err.message : '改写失败');
    } finally {
      setIsGenerating(false);
      setActiveAction(null);
      abortRef.current = null;
    }
  }, [currentNovel?.id, currentChapter?.id, apiConfig.key, selectedText, localContent]);

  // ─── Sensory description ─────────────────────────────────
  const handleSensory = useCallback(async () => {
    if (!selectedText) return;
    const prompt = `请为以下场景进行「五感注入」描写增强。从视觉、听觉、嗅觉、触觉、味觉五个维度展开，每个维度写一句具体的感官细节。不要写解释，直接输出五感描写：\n\n场景：${selectedText}\n\n上下文：${localContent.slice(Math.max(0, localContent.indexOf(selectedText) - 100), localContent.indexOf(selectedText) + selectedText.length + 100)}`;

    setActiveAction('rewrite');
    setIsGenerating(true);
    setFloatingMenu(null);
    setGenerationError(null);
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      let fullText = '';
      await fetchAIStream({
        prompt,
        apiConfig,
        signal: abort.signal,
        onToken: (text: string) => { fullText = text; },
      });

      addAICard({
        type: 'sensory',
        title: `${currentChapter?.title || ''} — 五感描写`,
        content: fullText.trim(),
        sourceAction: '描述五感',
        chapterId: currentChapter?.id || '',
        compareWith: selectedText,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGenerationError(err instanceof Error ? err.message : '五感生成失败');
    } finally {
      setIsGenerating(false);
      setActiveAction(null);
      abortRef.current = null;
    }
  }, [selectedText, localContent, currentChapter?.id, currentChapter?.title, apiConfig.key]);

  // ─── Stop generation ─────────────────────────────────────
  const handleStop = () => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setActiveAction(null);
  };

  // ─── New/delete chapter ──────────────────────────────────
  const handleNewChapter = () => {
    if (!currentNovel) return;
    const idx = sortedChapters.length;
    const si = getStageForChapter(idx, totalChapters, currentNovel.writeMode);
    const siName = GROWTH_STAGES.find((s) => s.id === si)?.name || '';
    const id = addChapter(currentNovel.id, `第 ${idx + 1} 章`, `阶段${si}: ${siName}`);
    setSelectedChapterId(id);
  };

  const handleDeleteChapter = () => {
    if (!currentNovel || !currentChapter) return;
    deleteChapter(currentNovel.id, currentChapter.id);
    setSelectedChapterId(prevChapter?.id || nextChapter?.id || null);
  };

  const handleCopy = async () => {
    if (!currentChapter) return;
    const text = `${currentChapter.title}\n\n${localContent}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ─── Pipeline stage change ───────────────────────────────
  const handlePipelineStage = (stage: PipelineStage) => {
    if (!currentNovel) return;
    setPipelineStage(currentNovel.id, stage);
  };

  // ─── Guard ───────────────────────────────────────────────
  if (!currentNovel) return null;
  if (currentNovel.generationPhase === 'outline-review') return <OutlineReview />;

  if (!currentChapter) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[var(--color-bg-primary)] gap-3">
        <Pen size={36} className="text-[var(--color-text-dim)]" strokeWidth={1} />
        <p className="text-sm text-[var(--color-text-muted)]">选择或创建章节开始写作</p>
        <button onClick={handleNewChapter} className="btn-primary text-xs">
          <Plus size={14} /> 新建章节
        </button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full min-w-0 bg-[var(--color-bg-primary)]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shrink-0 overflow-x-auto">
        <ToolButton icon={Sparkles} label="AI 生成" desc="根据大纲生成当前章节" loading={activeAction === 'generate'} active={activeAction === 'generate'} disabled={isGenerating && activeAction !== 'generate'} onClick={handleGenerate} />
        <div className="w-px h-5 bg-[var(--color-border-primary)] mx-1" />
        <GradientToolButton icon={ChevronRight} label="续写本章" desc="从当前正文末尾接续" loading={activeAction === 'continue'} disabled={isGenerating && activeAction !== 'continue'} onClick={handleContinue} />
        <GradientToolButton icon={Plus} label="下一章" desc="生成下一章内容" loading={activeAction === 'next-chapter'} disabled={isGenerating && activeAction !== 'next-chapter'} onClick={handleNextChapter} />
        <div className="w-px h-5 bg-[var(--color-border-primary)] mx-1" />
        <ToolButton icon={Pen} label="改写选中" desc="选中文字后点击改写" active={!!selectedText} disabled={!selectedText || isGenerating} onClick={() => handleRewrite()} />
        <VoteDropdown />

        <div className="flex-1" />

        {isGenerating && (
          <button onClick={handleStop} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-red)] hover:bg-[var(--color-red-bg)] rounded-[var(--radius-md)] transition-all duration-200 animate-fade-in">
            <StopCircle size={13} />
            停止生成
          </button>
        )}

        {generationError && (
          <span className="text-[10px] text-[var(--color-red)] ml-2 truncate max-w-[180px]">{generationError}</span>
        )}
      </div>

      {/* Chapter header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border-primary)] shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => goToChapter(prevChapter?.id || null)} disabled={!prevChapter} className="p-1 text-[var(--color-text-dim)] hover:text-[var(--color-text-primary)] disabled:opacity-20 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <input
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="bg-transparent text-sm font-semibold text-[var(--color-text-primary)] outline-none border-b border-transparent hover:border-[var(--color-border-primary)] focus:border-[var(--color-accent)] px-1 py-0.5 min-w-[120px] transition-colors"
          />
          <span className="text-[10px] text-[var(--color-text-dim)]">{formatWordCount(localContent.length)}</span>
          <button onClick={() => goToChapter(nextChapter?.id || null)} disabled={!nextChapter} className="p-1 text-[var(--color-text-dim)] hover:text-[var(--color-text-primary)] disabled:opacity-20 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: stageInfo.color, backgroundColor: stageInfo.color + '18' }}>
            {stageInfo.name}
          </span>
          <span className={cn('text-[10px]', saved ? 'text-[var(--color-green)]' : 'text-[var(--color-text-dim)]')}>
            {saved ? '已保存' : '保存中...'}
          </span>
          <button onClick={handleCopy} className="p-1 text-[var(--color-text-dim)] hover:text-[var(--color-accent)] transition-colors" title="复制章节内容">
            {copied ? <Check size={14} className="text-[var(--color-green)]" /> : <Copy size={14} />}
          </button>
          <button onClick={handleNewChapter} className="p-1 text-[var(--color-text-dim)] hover:text-[var(--color-accent)] transition-colors" title="新建章节">
            <Plus size={14} />
          </button>
          <button onClick={handleDeleteChapter} className="p-1 text-[var(--color-text-dim)] hover:text-[var(--color-red)] transition-colors" title="删除章节">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Editor area — natural flow, no nested scroll */}
      <div className="flex-1 flex justify-center px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-2xl relative">
          {/* AI generation streaming overlay */}
          {isGenerating && activeAction === 'generate' && (
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 animate-fade-in -mt-2 mb-2">
              <Loader2 size={13} className="text-[var(--color-accent)] animate-spin" />
              <span className="text-xs text-[var(--color-accent)]">AI 正在写作中...</span>
            </div>
          )}

          {/* The editor — contentEditable for rich text features */}
          <div
            ref={editorRef}
            contentEditable={!isGenerating}
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onMouseUp={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            className={cn(
              'outline-none min-h-[60vh] cursor-text',
              'writer-prose',
              'selection:bg-amber-500/20 selection:text-amber-300',
              isGenerating && activeAction === 'generate' ? 'opacity-50' : '',
            )}
            dangerouslySetInnerHTML={{ __html: renderContentToHtml(localContent, aiSegments.length > 0 ? aiSegments : undefined) }}
          />

          {!localContent && !isGenerating && (
            <div className="absolute inset-0 pointer-events-none flex items-start justify-center pt-20">
              <p className="text-sm text-[var(--color-text-dim)]">点击上方工具栏开始创作，或直接输入文字...</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating selection menu */}
      {floatingMenu && !isGenerating && (
        <FloatingMenu
          position={floatingMenu}
          onSensory={handleSensory}
          onRewrite={() => handleRewrite()}
          onClose={() => setFloatingMenu(null)}
        />
      )}

      {/* Chapter strip + bottom bar */}
      <div className="shrink-0 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center px-4 py-1.5 gap-2">
          <button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40">
            <Sparkles size={11} /> AI 生成
          </button>
          <div className="flex-1 flex items-center gap-1 overflow-x-auto">
            {sortedChapters.map((ch, i) => {
              const sid = getStageForChapter(i, totalChapters, currentNovel.writeMode);
              const sc = GROWTH_STAGES.find((s) => s.id === sid);
              return (
                <button
                  key={ch.id}
                  onClick={() => goToChapter(ch.id)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 text-[10px] rounded transition-all duration-200 whitespace-nowrap',
                    ch.id === selectedChapterId
                      ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                      : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)]'
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sc?.color || '#666' }} />
                  {i + 1}. {ch.title}
                  {ch.content && <CheckCircle2 size={9} className="text-[var(--color-green)]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pipeline FSM bar */}
        <StoryPipelineBar
          currentStage={currentNovel.pipelineStage || 'outline'}
          completed={currentNovel.pipelineCompleted || []}
          onStageClick={handlePipelineStage}
        />
      </div>
    </div>
  );
}

// ─── Toolbar button ────────────────────────────────────────
function ToolButton({ icon: Icon, label, desc, active, loading, disabled, onClick }: {
  icon: typeof Sparkles;
  label: string;
  desc: string;
  active?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-[var(--radius-md)] transition-all duration-200 whitespace-nowrap',
        active && 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
        !active && 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} strokeWidth={1.5} />}
      {label}
      <span className="invisible group-hover:visible absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] text-[10px] text-[var(--color-text-secondary)] whitespace-nowrap rounded shadow-xl z-50 pointer-events-none">
        {desc}
      </span>
    </button>
  );
}

function GradientToolButton({ icon: Icon, label, desc, loading, disabled, onClick }: {
  icon: typeof Sparkles;
  label: string;
  desc: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[var(--radius-md)] transition-all duration-200 whitespace-nowrap',
        'bg-gradient-to-r from-[var(--color-amber-start)] to-[var(--color-amber-end)] text-[#0b0b0f] font-semibold',
        'shadow-[0_2px_8px_rgba(212,164,76,0.25)] hover:shadow-[0_4px_16px_rgba(212,164,76,0.4)] hover:-translate-y-0.5 active:translate-y-0',
        disabled && 'opacity-30 cursor-not-allowed shadow-none transform-none'
      )}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} strokeWidth={2} />}
      {label}
      <span className="invisible group-hover:visible absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] text-[10px] text-[var(--color-text-secondary)] whitespace-nowrap rounded shadow-xl z-50 pointer-events-none">
        {desc}
      </span>
    </button>
  );
}
