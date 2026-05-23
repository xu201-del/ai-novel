'use client';

import { useRef, useCallback } from 'react';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import { fetchAIStream } from '@/services/api';
import { buildChapterPrompt } from '@/services/prompts';
import { getChapterContext } from '@/services/framework-prompts';
import { getStageForChapter, GROWTH_STAGES } from '@/services/writing-framework';

export function useBatchGeneration() {
  const abortRef = useRef<AbortController | null>(null);

  const currentNovel = useNovelStore((s) => s.currentNovel());
  const apiConfig = useNovelStore((s) => s.apiConfig);
  const addChapter = useNovelStore((s) => s.addChapter);
  const updateChapter = useNovelStore((s) => s.updateChapter);
  const updateGlobalMemory = useNovelStore((s) => s.updateGlobalMemory);
  const setPipelineStage = useNovelStore((s) => s.setPipelineStage);
  const setSelectedChapterId = useUIStore((s) => s.setSelectedChapterId);
  const batchGenPhase = useUIStore((s) => s.batchGenPhase);
  const setBatchGenPhase = useUIStore((s) => s.setBatchGenPhase);
  const setBatchGenProgress = useUIStore((s) => s.setBatchGenProgress);
  const setBatchGenError = useUIStore((s) => s.setBatchGenError);
  const addAICard = useUIStore((s) => s.addAICard);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setBatchGenPhase('cancelled');
    setTimeout(() => setBatchGenPhase('idle'), 600);
  }, [setBatchGenPhase]);

  const generateAll = useCallback(async () => {
    const novel = currentNovel;
    if (!novel || !apiConfig.key) return;

    const totalChapters = novel.chapterCount || novel.chapters.length || 10;
    const outline = novel.generationOutline;
    const framework = novel.novelFramework;

    setBatchGenPhase('generating');
    setBatchGenError(null);

    const abort = new AbortController();
    abortRef.current = abort;

    // Helper: read fresh store state inside the async loop
    const getNovel = () => useNovelStore.getState().currentNovel();

    try {
      for (let i = 0; i < totalChapters; i++) {
        if (abort.signal.aborted) return;

        const freshNovel = getNovel();
        if (!freshNovel) return;

        // 检查本章是否已存在
        const existingChapter = freshNovel.chapters
          .filter((c) => c.order === i)
          .sort((a, b) => a.createdAt - b.createdAt)[0];

        const chapterTitle = outline?.chapters?.[i]?.title || `第 ${i + 1} 章`;
        const stageId = getStageForChapter(i, totalChapters, freshNovel.writeMode);
        const stageInfo = GROWTH_STAGES.find((s) => s.id === stageId);

        // 跳过已完成章节
        if (existingChapter?.status === 'completed' && existingChapter.content) {
          setBatchGenProgress({
            current: i + 1,
            total: totalChapters,
            currentTitle: `${chapterTitle} (已完成，跳过)`,
          });
          // 选中当前章节以便用户查看
          setSelectedChapterId(existingChapter.id);
          continue;
        }

        setBatchGenProgress({
          current: i + 1,
          total: totalChapters,
          currentTitle: chapterTitle,
        });

        // 创建或获取章节 ID
        let chapterId: string;
        if (existingChapter) {
          chapterId = existingChapter.id;
        } else {
          const summary = outline?.chapters?.[i]?.coreConflict || '';
          chapterId = addChapter(freshNovel.id, chapterTitle, summary);
          updateChapter(freshNovel.id, chapterId, { order: i });
        }

        // 构建 prompt
        const outlineChapter = outline?.chapters?.[i];
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

        const prevChapters = freshNovel.chapters
          .filter((c) => c.order < i && c.status === 'completed')
          .sort((a, b) => a.order - b.order);
        const prevTail = prevChapters.length > 0
          ? (prevChapters[prevChapters.length - 1].content || '').slice(-500)
          : '';

        const prompt = buildChapterPrompt({
          title: chapterTitle,
          summary: outlineChapter?.coreConflict || '',
          prevTail,
          chapterIndex: i,
          totalChapters,
          writeMode: freshNovel.writeMode,
          genre: freshNovel.genre,
          protagonist: freshNovel.protagonist
            ? `${freshNovel.protagonist.name}（${freshNovel.protagonist.personality}）`
            : '',
          outline: outline?.outline || '',
          location: freshNovel.globalMemory?.location || '',
          memoryNotes: freshNovel.globalMemory?.notes || '',
          novelTitle: freshNovel.title,
          novelFrameworkContext: framework
            ? getChapterContext(framework, i)
            : undefined,
          chapterOutline,
        });

        // 调用 AI
        let fullText = '';
        await fetchAIStream({
          prompt,
          apiConfig,
          signal: abort.signal,
          onToken: (text: string) => { fullText = text; },
        });

        if (abort.signal.aborted) return;

        // 解析并保存
        const contentMatch = fullText.match(/【章节标题】[^\n]*\n([\s\S]*?)(?=【本章成长记录】|$)/);
        const content = contentMatch?.[1]?.trim() || fullText;

        const memoryMatch = fullText.match(/【本章记忆更新】\n([\s\S]*?)$/);
        const memoryText = memoryMatch?.[1]?.trim() || '';
        const charStates = memoryText.match(/人物状态[：:]\s*([\s\S]*?)(?=重要情节[：:]|下一章|$)/)?.[1]?.trim();
        const keyEvents = memoryText.match(/重要情节[：:]\s*([\s\S]*?)(?=下一章|$)/)?.[1]?.trim();

        updateChapter(freshNovel.id, chapterId, {
          content,
          wordCount: content.length,
          status: 'completed',
          order: i,
        });

        // 更新全局记忆
        if (keyEvents || charStates) {
          updateGlobalMemory(freshNovel.id, {
            mainPlot: keyEvents || '',
            characters: charStates || '',
          });
        }

        // 选中本章
        setSelectedChapterId(chapterId);
      }

      setBatchGenPhase('completed');
      addAICard({
        type: 'generated-text',
        title: '全章批量生成完成',
        content: `共 ${totalChapters} 章全部生成完毕`,
        sourceAction: '一键批量生成',
        chapterId: '',
      });
      setTimeout(() => setBatchGenPhase('idle'), 2000);

    } catch (err: unknown) {
      if (abort.signal.aborted) return;
      const msg = err instanceof Error ? err.message : '批量生成中断';
      setBatchGenError(msg);
      setBatchGenPhase('error');
      setTimeout(() => setBatchGenPhase('idle'), 3000);
    } finally {
      abortRef.current = null;
    }
  }, [
    currentNovel, apiConfig, addChapter, updateChapter, updateGlobalMemory,
    setPipelineStage, setSelectedChapterId, setBatchGenPhase,
    setBatchGenProgress, setBatchGenError, addAICard,
  ]);

  return { generateAll, cancel, phase: batchGenPhase };
}
