'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import { fetchAI, parseJSONFromText } from '@/services/api';
import { buildFrameworkPrompt } from '@/services/framework-prompts';
import { WRITE_MODES, TROPE_TAGS, CHAPTER_COUNT_OPTIONS, type WriteMode } from '@/services/writing-framework';
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
import { createEmptyFramework } from '@/types/novel-framework';
import { cn } from '@/lib/utils';
import {
  Sparkles, ChevronRight, Loader2, CheckCircle2, AlertCircle, X,
  Target, Layers, BookOpen, Zap, XCircle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// Toast
// ═══════════════════════════════════════════════════════════
function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -8, x: '-50%' }}
      className="fixed top-20 left-1/2 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-lg)] bg-red-950/90 border border-red-500/30 text-red-300 text-xs shadow-[0_8px_32px_rgba(239,68,68,0.15)] backdrop-blur-md"
    >
      <AlertCircle size={13} className="text-red-400 shrink-0" />
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-2 text-red-500 hover:text-red-300">
        <X size={12} />
      </button>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════
export default function InspirationMode() {
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const apiConfig = useNovelStore((s) => s.apiConfig);
  const setInspirationText = useNovelStore((s) => s.setInspirationText);
  const setWriteMode = useNovelStore((s) => s.setWriteMode);
  const setTropeTag = useNovelStore((s) => s.setTropeTag);
  const setChapterCount = useNovelStore((s) => s.setChapterCount);
  const setNovelFramework = useNovelStore((s) => s.setNovelFramework);

  const setEditorMode = useUIStore((s) => s.setEditorMode);
  const concurrentGenPhase = useUIStore((s) => s.concurrentGenPhase);
  const setConcurrentGenPhase = useUIStore((s) => s.setConcurrentGenPhase);
  const concurrentGenError = useUIStore((s) => s.concurrentGenError);
  const setConcurrentGenError = useUIStore((s) => s.setConcurrentGenError);
  const addAICard = useUIStore((s) => s.addAICard);

  // ══════ Local form state — 100% preserved across generation ══════
  const [localIdea, setLocalIdea] = useState(currentNovel?.inspirationText || '');
  const [localMode, setLocalMode] = useState<WriteMode>(currentNovel?.writeMode || 'long');
  const [localTrope, setLocalTrope] = useState(currentNovel?.tropeTag || '');
  const [localCount, setLocalCount] = useState(currentNovel?.chapterCount || 10);
  const [isCustomChapterCount, setIsCustomChapterCount] = useState(false);
  const [isCustomInputExpanded, setIsCustomInputExpanded] = useState(false);
  const [customChapterInput, setCustomChapterInput] = useState('');
  const [customTags, setCustomTags] = useState<{ id: string; label: string }[]>([]);
  const [isAddingCustomTag, setIsAddingCustomTag] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [debugLogs, setDebugLogs] = useState<Array<{ ts: number; text: string; level: 'info' | 'err' | 'ok' }>>([]);
  const addDebugLog = useCallback((text: string, level: 'info' | 'err' | 'ok' = 'info') => {
    setDebugLogs((prev) => [...prev.slice(-12), { ts: Date.now(), text, level }]);
  }, []);

  const abortRef = useRef<AbortController | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!currentNovel) return null;

  const isLocked = concurrentGenPhase === 'generating';

  // ═══════════════════════════════════════════════════════════
  // 非线性仿真进度状态机 (Non-Linear Progress State Machine)
  //
  // Phase 1 (1→80%):  前快 — 大纲轨道高速编织     max(0.5, Δ*0.12)
  // Phase 2 (80→92%): 中速 — 断崖卡点注入          max(0.25, Δ*0.06)
  // Phase 3 (92→98%): 微速 — 大纲一致性校验        max(0.08, Δ*0.015)
  // Phase 4 (100%):    API resolve → 300ms → 路由解封
  //
  // 设计意图：98% 为 API-resolve 前的渐近上限。
  // 每一 tick 都产生可见位移，杜绝"数字冻死"的 UI 焦虑。
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isLocked) {
      setGenerationProgress(0);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      return;
    }

    const tick = () => {
      setGenerationProgress((prev) => {
        if (prev < 80) {
          // 1→80%: ~2.5s (fast climb)
          const step = Math.max(0.8, (80 - prev) * 0.12);
          return Math.min(80, prev + step);
        }
        if (prev < 92) {
          // 80→92%: ~5s (visible but slower)
          const step = Math.max(0.25, (92 - prev) * 0.06);
          return Math.min(92, prev + step);
        }
        // 92→98%: ~8s (micro-creep, never frozen)
        const step = Math.max(0.08, (98 - prev) * 0.015);
        return Math.min(98, prev + step);
      });
    };

    progressTimerRef.current = setInterval(tick, 150);
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isLocked]);

  // ═══════════════════════════════════════════════════════════
  // 100% 临界点 — 解封 → 防抖 300ms → 路由至完整框架
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (concurrentGenPhase === 'complete') {
      setGenerationProgress(100);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      const id = setTimeout(() => {
        setConcurrentGenPhase('idle');
        abortRef.current = null;
        setEditorMode('framework');
      }, 300);
      return () => clearTimeout(id);
    }
  }, [concurrentGenPhase, setConcurrentGenPhase, setEditorMode]);

  // ═══════════════════════════════════════════════════════════
  // Word count fingerprint
  // ═══════════════════════════════════════════════════════════
  const AVG_WORDS_MIN = 3000; const AVG_WORDS_MAX = 5000;
  const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString('zh-CN');
  const dynamicWordEstimate = `约 ${fmt(localCount * AVG_WORDS_MIN)} - ${fmt(localCount * AVG_WORDS_MAX)} 字`;
  const currentMode = WRITE_MODES.find((m) => m.id === localMode)!;

  // ═══════════════════════════════════════════════════════════
  // 取消生成 — AbortController Kill Switch
  // ═══════════════════════════════════════════════════════════
  const handleCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setGenerationProgress(0);
    setConcurrentGenPhase('cancelled');
    setTimeout(() => setConcurrentGenPhase('idle'), 600);
  }, [setConcurrentGenPhase]);

  // ═══════════════════════════════════════════════════════════
  // 算力解耦·单轨极速大纲 — 单按钮驱动
  //
  // idle → generating (按钮 Loading，取消滑入)
  //      → complete (大纲就绪 → 300ms → 路由至 framework)
  //      → cancelled (AbortController → 重置)
  //      → error    (toast → 保留表单 → 可重试)
  //
  // 设计意图：算力解耦·单轨完整框架直出。
  // 一次 API 调用产出 NovelFramework 十二维全量数据（世界观/势力/角色/能力/伏笔/事件库）。
  // 左侧知识库（大纲/角色/世界观）+ 右侧圣经看板全部留空，不消耗 Token。
  // 只有中间「完整框架」视图被填充，宏观设定在生成时一次性到位。
  // ═══════════════════════════════════════════════════════════
  const handleConcurrentGeneration = useCallback(async () => {
    if (!localIdea.trim()) return;
    if (!apiConfig.key) {
      setToast('请先在顶部导航栏齿轮图标中配置 API Key');
      return;
    }

    addDebugLog(`触发生成 — ${localCount}章完整框架`, 'info');
    console.log('[InkFlow] 完整框架生成触发 — 章节数:', localCount, '模式:', localMode);
    setConcurrentGenPhase('generating');
    setConcurrentGenError(null);

    setInspirationText(currentNovel.id, localIdea);
    setWriteMode(currentNovel.id, localMode);
    setTropeTag(currentNovel.id, localTrope);
    setChapterCount(currentNovel.id, localCount);
    addDebugLog('② store 写入完成', 'info');

    const abort = new AbortController();
    abortRef.current = abort;
    let isTimeout = false;
    const timeoutId = setTimeout(() => {
      isTimeout = true;
      abort.abort();
    }, 180_000);

    const tropeLabel =
      TROPE_TAGS.find((t) => t.id === localTrope)?.label ||
      customTags.find((t) => t.id === localTrope)?.label ||
      '';

    const frameworkPrompt = buildFrameworkPrompt({
      genre: tropeLabel || '',
      inspiration: localIdea,
      bookTitle: currentNovel.title,
      chapterCount: localCount,
    });

    addDebugLog('③ 完整框架 Prompt 就绪 (单轨)', 'info');
    addAICard({
      type: 'generated-text',
      title: '完整框架生成启动',
      content: `算力解耦模式：单轨完整框架（${localCount} 章）\n世界观/势力/角色/能力体系一次性产出，全速推理中...`,
      sourceAction: '完整框架生成',
      chapterId: '',
    });

    const genStartTime = Date.now();
    try {
      addDebugLog('④ 发送 API (单次调用)...', 'info');
      console.log('[InkFlow] 单轨完整框架 — 发送 1 个 API 请求...');

      const waitNudge = setTimeout(() => {
        addDebugLog(`⏳ 仍在等待 API... (已过 ${Math.round((Date.now() - genStartTime) / 1000)}s)`, 'info');
      }, 20_000);

      const raw = await fetchAI({
        prompt: frameworkPrompt,
        maxTokens: 32768,
        apiConfig,
        signal: abort.signal,
      });

      clearTimeout(waitNudge);
      clearTimeout(timeoutId);
      const elapsedS = Math.round((Date.now() - genStartTime) / 1000);
      addDebugLog(`⑤ API 响应 (${elapsedS}s) — ${raw?.length || 0} 字符`, 'ok');
      console.log('[InkFlow] API 响应接收 —', raw?.length, 'chars');

      if (abort.signal.aborted) return;

      if (!raw || raw.length < 50) {
        throw new Error(`API 返回内容过短 (${raw?.length || 0} 字符)，可能 API Key 无效或额度耗尽`);
      }

      const parsed = parseJSONFromText(raw) as Record<string, unknown> | null;
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('框架 JSON 解析失败，请重试');
      }

      // 构造完整 NovelFramework — 十二维数据全部落地
      const fw: NovelFramework = {
        bookTitle: (parsed.bookTitle as string) || (parsed.meta as Record<string, unknown>)?.bookTitle as string || currentNovel.title,
        bookType: (parsed.bookType as string) || (parsed.meta as Record<string, unknown>)?.bookType as string || '',
        estimatedWords: (parsed.estimatedWords as string) || (parsed.meta as Record<string, unknown>)?.estimatedWords as string || '',
        keywords: (parsed.keywords as string) || (parsed.meta as Record<string, unknown>)?.keywords as string || '',
        oneLiner: (parsed.oneLiner as string) || (parsed.meta as Record<string, unknown>)?.oneLiner as string || '',
        synopsis: (parsed.synopsis as string) || (parsed.meta as Record<string, unknown>)?.synopsis as string || '',
        volumes: (parsed.volumes as FrameworkVolume[]) || [],
        worldSetting: (parsed.worldSetting as NovelFramework['worldSetting']) || { worldName: '', worldType: '', eraBackground: '', worldRules: '', mapEnvironment: '' },
        factions: (parsed.factions as FrameworkFaction[]) || [],
        protagonist: (parsed.protagonist as FrameworkCharacter) || createEmptyFramework().protagonist,
        importantCharacters: (parsed.importantCharacters as FrameworkCharacter[]) || [],
        opponents: (parsed.opponents as FrameworkCharacter[]) || [],
        finalBoss: (parsed.finalBoss as FrameworkCharacter) || createEmptyFramework().finalBoss,
        relationships: (parsed.relationships as FrameworkRelationship[]) || [],
        abilitySystem: (parsed.abilitySystem as NovelFramework['abilitySystem']) || { systemName: '', description: '', levels: [], rules: '', costs: '', specialAbilities: [] },
        items: (parsed.items as FrameworkItem[]) || [],
        plots: (parsed.plots as NovelFramework['plots']) || { mainPlot: '', subPlots: [] },
        plotStructure: (parsed.plotStructure as NovelFramework['plotStructure']) || { opening: '', development: '', climax: '', ending: '' },
        timeline: (parsed.timeline as NovelFramework['timeline']) || [],
        chapterBreakdown: (parsed.chapterBreakdown as FrameworkChapterBreakdown[]) || [],
        foreshadowing: (parsed.foreshadowing as FrameworkForeshadowing[]) || [],
        eventLibrary: (parsed.eventLibrary as FrameworkEvent[]) || [],
        generatedAt: Date.now(),
        lastModifiedAt: Date.now(),
      };

      // 算力解耦·单轨原子写入 — 仅写入 novelFramework
      // 不创建 Chapter[]、不写 protagonist/description/timeline
      // → 左侧知识库全部空白，右侧圣经看板空白，仅中间框架有数据
      setNovelFramework(currentNovel.id, fw);

      addAICard({
        type: 'generated-text',
        title: `完整框架就绪 — ${fw.bookTitle}`,
        content: `十二维框架：${fw.volumes.length} 卷 / ${fw.chapterBreakdown.length} 章 / ${fw.factions.length} 势力 / ${fw.importantCharacters.length + fw.opponents.length + 1} 角色\n世界观：${fw.worldSetting.worldName || '待定'} | 能力体系：${fw.abilitySystem.systemName || '待定'}\n左右看板：保持空白，框架数据仅注入中间视图`,
        sourceAction: '完整框架完成',
        chapterId: '',
      });

      addDebugLog(`✅ 完成 — ${fw.chapterBreakdown.length}章完整框架就绪`, 'ok');
      console.log('[InkFlow] ✅ 完整框架完成 —', fw.chapterBreakdown.length, '章,', fw.factions.length, '势力');
      setConcurrentGenPhase('complete');
      // → useEffect [concurrentGenPhase===complete] 接管：
      //   进度冲 100% → 300ms 防抖 → 路由至 framework
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errMsg = err instanceof Error ? err.message : String(err);
      addDebugLog(`❌ 异常: ${errMsg}`, 'err');
      console.error('[InkFlow] 生成异常:', err);

      if (abort.signal.aborted) {
        if (isTimeout) {
          addDebugLog('超时 180s', 'err');
          console.error('[InkFlow] 超时 180s');
          setToast('生成超时（180s）：DeepSeek API 未在时限内返回完整数据，请重试或减少章节数');
          setConcurrentGenPhase('error');
          setConcurrentGenError('API 请求超时 (180s)');
          abortRef.current = null;
          setTimeout(() => setConcurrentGenPhase('idle'), 3000);
        } else {
          console.log('[InkFlow] 用户取消生成');
        }
        return;
      }

      const msg = err instanceof Error ? err.message : '网络波动，请重试';
      console.error('[InkFlow] 错误详情:', msg);
      setConcurrentGenPhase('error');
      setConcurrentGenError(msg);
      setToast(`生成中断：${msg}`);

      abortRef.current = null;
      setTimeout(() => setConcurrentGenPhase('idle'), 2500);
    }
  }, [
    localIdea, apiConfig, currentNovel, localMode, localTrope, localCount,
    customTags,
    setInspirationText, setWriteMode, setTropeTag, setChapterCount,
    setNovelFramework,
    setConcurrentGenPhase, setConcurrentGenError, setEditorMode, addAICard,
  ]);

  // ═══════════════════════════════════════════════════════════
  // 实时算力进程文本流 — 基于百分位区间的动态词条映射
  // ═══════════════════════════════════════════════════════════
  const tropeFingerprint =
    TROPE_TAGS.find((t) => t.id === localTrope)?.label ||
    customTags.find((t) => t.id === localTrope)?.label ||
    localIdea.slice(0, 8);
  const processStage =
    generationProgress <= 20 ? 0
    : generationProgress <= 45 ? 1
    : generationProgress <= 70 ? 2
    : generationProgress <= 90 ? 3
    : generationProgress <= 98 ? 4
    : 5;
  const processText = (() => {
    switch (processStage) {
      case 0: return `⚡ 正在链接 DeepSeek-V3 推理矩阵...`;
      case 1: return `🔮 正在提取「${tropeFingerprint}」意图指纹...`;
      case 2: return '🌍 正在构建世界观与势力版图...';
      case 3: return '👤 正在铸造角色圣经与能力体系...';
      case 4: return '📜 正在按照篇级结构拆解章节点与伏笔网络...';
      case 5: return '🚀 完整框架就绪，即将降临...';
    }
  })();

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
            <p className="text-sm text-[var(--color-text-muted)]">写下灵感，AI 单轨直出十二维完整框架</p>
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
                    setIsCustomChapterCount(false);
                    setIsCustomInputExpanded(false);
                    setCustomChapterInput('');
                    if (currentNovel) setChapterCount(currentNovel.id, mode.defaultChapters);
                  }}
                  disabled={isLocked}
                  className={cn(
                    'text-left p-3 rounded-[var(--radius-md)] border transition-all',
                    isLocked && 'opacity-40 cursor-not-allowed',
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
              <Layers size={12} /> 篇幅卷数
              <span className="text-[var(--color-text-dim)]">— 预设或自定义</span>
            </label>
            <div className="flex gap-1.5 flex-wrap items-center">
              {CHAPTER_COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setLocalCount(n);
                    setIsCustomChapterCount(false);
                    setIsCustomInputExpanded(false);
                    setCustomChapterInput('');
                    if (currentNovel) setChapterCount(currentNovel.id, n);
                  }}
                  disabled={isLocked}
                  className={cn(
                    'px-3 py-1.5 rounded-[var(--radius-sm)] text-xs border transition-all duration-200',
                    isLocked && 'opacity-40 cursor-not-allowed',
                    !isCustomChapterCount && localCount === n
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                      : 'border-[var(--color-border-primary)] text-[var(--color-text-muted)] hover:border-[var(--color-border-accent)]'
                  )}
                >
                  {n}篇
                </button>
              ))}
              {!isCustomInputExpanded ? (
                <button
                  onClick={() => { setIsCustomInputExpanded(true); setIsCustomChapterCount(true); setCustomChapterInput(String(localCount)); }}
                  disabled={isLocked}
                  className={cn('px-3 py-1.5 rounded-[var(--radius-sm)] text-xs border border-dashed border-slate-700 text-[var(--color-text-muted)] hover:border-amber-500/40 hover:text-amber-400 transition-all duration-200', isLocked && 'opacity-40 cursor-not-allowed')}
                >
                  自定义
                </button>
              ) : (
                <div className={cn('flex items-center rounded-[var(--radius-sm)] transition-all duration-300', isCustomChapterCount && 'shadow-[0_0_12px_rgba(245,158,11,0.1)]')}>
                  <input type="text" inputMode="numeric" autoFocus disabled={isLocked}
                    value={customChapterInput}
                    onChange={(e) => {
                      const f = e.target.value.replace(/\D/g, '');
                      setCustomChapterInput(f);
                      if (f === '') { setIsCustomChapterCount(true); return; }
                      const n = Math.min(Math.max(parseInt(f, 10), 1), 100);
                      setLocalCount(n); setIsCustomChapterCount(true);
                      if (currentNovel) setChapterCount(currentNovel.id, n);
                    }}
                    onBlur={() => {
                      const n = parseInt(customChapterInput, 10);
                      if (!customChapterInput || isNaN(n) || n < 1) { setCustomChapterInput(''); setLocalCount(10); setIsCustomChapterCount(false); setIsCustomInputExpanded(false); if (currentNovel) setChapterCount(currentNovel.id, 10); }
                      else if (n > 100) { setCustomChapterInput('100'); setLocalCount(100); if (currentNovel) setChapterCount(currentNovel.id, 100); }
                      else { setCustomChapterInput(String(n)); setLocalCount(n); }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setCustomChapterInput(''); setLocalCount(10); setIsCustomChapterCount(false); setIsCustomInputExpanded(false); if (currentNovel) setChapterCount(currentNovel.id, 10); (e.target as HTMLInputElement).blur(); } }}
                    className={cn('max-w-[80px] bg-slate-950 border rounded-lg px-2 py-1.5 text-xs text-center font-mono text-slate-200 focus:outline-none transition-all duration-200', isCustomChapterCount ? 'border-amber-500/30' : 'border-slate-900 hover:border-slate-800')}
                  />
                </div>
              )}
              <span className="text-[10px] text-[var(--color-text-dim)] self-center ml-1 font-mono tracking-tight">{dynamicWordEstimate}</span>
            </div>
            {isCustomInputExpanded && <p className="text-[10px] text-amber-400/60 animate-fade-in">自定义范围 1–100 篇 · 超出将触发 API 上下文窗口保护 · ESC 取消</p>}
          </div>

          {/* Trope tags */}
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
              <BookOpen size={12} /> 套路标签 <span className="text-[var(--color-text-dim)]">（可选）</span>
            </label>
            <div className="flex gap-1.5 flex-wrap items-center">
              {TROPE_TAGS.map((trope) => {
                const sel = localTrope === trope.id;
                return (
                  <button key={trope.id} onClick={() => { setLocalTrope(sel ? '' : trope.id); setIsAddingCustomTag(false); setCustomTagInput(''); }} disabled={isLocked}
                    className={cn('px-2.5 py-1 rounded-full text-xs border transition-all duration-200', isLocked && 'opacity-40 cursor-not-allowed',
                      sel ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : 'border-[var(--color-border-primary)] text-[var(--color-text-muted)] hover:border-[var(--color-border-accent)]')}>
                    {trope.label}
                  </button>
                );
              })}
              {customTags.map((tag) => {
                const sel = localTrope === tag.id;
                return (
                  <button key={tag.id} onClick={() => { setLocalTrope(sel ? '' : tag.id); setIsAddingCustomTag(false); setCustomTagInput(''); }} disabled={isLocked}
                    className={cn('px-2.5 py-1 rounded-full text-xs border transition-all duration-200', isLocked && 'opacity-40 cursor-not-allowed',
                      sel ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : 'border-amber-500/20 text-amber-400/70 hover:border-amber-500/40')}>
                    {tag.label}
                    <button onClick={(e) => { e.stopPropagation(); setCustomTags((prev) => prev.filter((t) => t.id !== tag.id)); if (sel) setLocalTrope(''); }}
                      className="ml-1 text-[var(--color-text-dim)] hover:text-[var(--color-red)] transition-colors">×</button>
                  </button>
                );
              })}
              {!isAddingCustomTag ? (
                <button onClick={() => { setIsAddingCustomTag(true); setCustomTagInput(''); }} disabled={isLocked}
                  className={cn('px-2.5 py-1 rounded-full text-xs border border-dashed border-slate-700 text-[var(--color-text-dim)] hover:border-amber-500/40 hover:text-amber-400 transition-all duration-200', isLocked && 'opacity-40 cursor-not-allowed')}>
                  ＋ 自定义
                </button>
              ) : (
                <input type="text" autoFocus maxLength={6} placeholder="流派热词" value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value.slice(0, 6))}
                  onBlur={() => { const t = customTagInput.trim(); if (t) { const id = `custom-${Date.now()}`; setCustomTags((prev) => [...prev, { id, label: t }]); setLocalTrope(id); } setIsAddingCustomTag(false); setCustomTagInput(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = customTagInput.trim(); if (t) { const id = `custom-${Date.now()}`; setCustomTags((prev) => [...prev, { id, label: t }]); setLocalTrope(id); } setIsAddingCustomTag(false); setCustomTagInput(''); } else if (e.key === 'Escape') { setIsAddingCustomTag(false); setCustomTagInput(''); (e.target as HTMLInputElement).blur(); } }}
                  className="max-w-[80px] bg-slate-950 border border-amber-500/30 rounded-full px-2.5 py-1 text-xs text-center font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none shadow-[0_0_12px_rgba(245,158,11,0.1)] transition-all duration-200"
                />
              )}
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
              disabled={isLocked}
              placeholder="写清你想要的故事核心设定…&#10;&#10;例如：在一个人人都有超能力的世界，主角却是唯一没有能力的人。但他发现，所谓的「超能力」其实是外星人用来控制人类的工具…"
              className={cn('w-full h-36 p-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] text-sm leading-relaxed resize-none outline-none placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] transition-all font-[family-name:var(--font-sans)]', isLocked && 'opacity-50')}
            />
          </div>

          {/* ══════════════════════════════════════════════════ */}
          {/* Action zone — 双态机 + 按钮内嵌蓄能进度         */}
          {/* idle:      [⚡ 快速大纲 〉]                       */}
          {/* generating: [████████░░░░ 47%] [🛑]              */}
          {/* ══════════════════════════════════════════════════ */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                {isLocked ? (
                  /* ── Generating: 蓄能卡片 — 双色流体进度熔断嵌入 ── */
                  <motion.button
                    key="loading"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    disabled
                    className="flex-1 relative overflow-hidden py-3.5 rounded-[var(--radius-lg)] font-semibold text-sm flex items-center justify-center gap-2.5 cursor-wait bg-zinc-800/90"
                  >
                    {/* 左侧蓄能层 — 琥珀金流体 */}
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400"
                      initial={{ width: '0%' }}
                      animate={{ width: `${generationProgress}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                    {/* 蓄能前沿微光 — 1px 辉光线 */}
                    <motion.div
                      className="absolute inset-y-0 w-[1px] bg-yellow-200/80 shadow-[0_0_12px_rgba(250,204,21,0.6)]"
                      initial={{ left: '0%' }}
                      animate={{ left: `${generationProgress}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                    {/* 右侧未蓄能区域保持 bg-zinc-800/90 透出 */}

                    {/* 文字层 — z-10 锁定，抗遮挡 */}
                    <span className="relative z-10 flex items-center gap-2.5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] tabular-nums">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 size={17} />
                      </motion.span>
                      DeepSeek 十二维框架生成中...
                      <span className="font-mono ml-1.5 inline-block min-w-[5ch] text-right tabular-nums">
                        {generationProgress.toFixed(1)}%
                      </span>
                    </span>
                  </motion.button>
                ) : (
                  /* ── Idle: single primary button ── */
                  <motion.button
                    key="idle"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    onClick={handleConcurrentGeneration}
                    disabled={!localIdea.trim() || !apiConfig.key}
                    className="w-72 py-3.5 rounded-[var(--radius-lg)] bg-[var(--color-accent)] text-[#0b0b0f] font-semibold text-base flex items-center justify-center gap-2 transition-all hover:bg-[var(--color-accent-hover)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none shadow-[0_4px_24px_rgba(var(--color-accent-rgb),0.25)] mx-auto"
                  >
                    <Zap size={17} />
                    <span>快速大纲</span>
                    <ChevronRight size={16} />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* ── Cancel button: slides in from right during generation ── */}
              <AnimatePresence>
                {isLocked && (
                  <motion.button
                    initial={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0, marginLeft: -12 }}
                    animate={{ opacity: 1, width: 'auto', paddingLeft: 16, paddingRight: 16, marginLeft: 0 }}
                    exit={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0, marginLeft: -12 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    onClick={handleCancel}
                    className="shrink-0 py-3.5 rounded-[var(--radius-lg)] border border-red-500/30 bg-red-500/10 text-red-400 font-semibold text-sm flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_24px_rgba(239,68,68,0.2)]"
                  >
                    <motion.span
                      animate={{ scale: [1, 1.12, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      <XCircle size={16} />
                    </motion.span>
                    <span>取消生成</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* ── 实时算力进程文本流 — AnimatePresence 字符淡入淡出 ── */}
            <AnimatePresence mode="wait">
              {isLocked && (
                <motion.div
                  key={processStage}
                  initial={{ opacity: 0, y: 4, filter: 'blur(2px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -4, filter: 'blur(2px)' }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  className="text-xs font-mono text-amber-500/60 font-medium tracking-wider text-center mt-1 h-4 flex items-center justify-center gap-2"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400/60 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400/80" />
                  </span>
                  <span>{processText}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── 诊断面板：直接显示错误，无需打开控制台 ── */}
          <AnimatePresence>
            {concurrentGenPhase === 'error' && concurrentGenError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3 rounded-[var(--radius-md)] bg-red-950/60 border border-red-500/25 text-xs text-red-300 space-y-1"
              >
                <p className="font-semibold text-red-400">生成失败</p>
                <p className="font-mono text-red-300/80 break-all">{concurrentGenError}</p>
                <p className="text-red-400/50 text-[10px]">按 F12 打开控制台查看完整诊断信息</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* API key hint */}
          {!apiConfig.key && localIdea.trim() && (
            <p className="text-[10px] text-[var(--color-text-dim)] text-center">需要配置 API Key 才能使用 AI 生成</p>
          )}

          {/* Preview info */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-[var(--color-text-dim)]">
            <span className="flex items-center gap-1"><CheckCircle2 size={10} />模式：{currentMode.name}</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={10} />{localCount} 篇宏观大纲</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={10} />{dynamicWordEstimate}</span>
          </div>
        </div>
      </div>

      {/* ── 诊断日志面板 ── */}
      {debugLogs.length > 0 && (
        <div className="px-6 py-3 border-t border-[var(--color-border-primary)] shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-[var(--color-text-dim)] font-mono tracking-wider">诊断日志</span>
            <button
              onClick={() => setDebugLogs([])}
              className="text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              清除
            </button>
          </div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {debugLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px] font-mono">
                <span className="text-[var(--color-text-dim)] shrink-0 w-16">
                  {new Date(log.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={cn(
                  log.level === 'err' && 'text-red-400',
                  log.level === 'ok' && 'text-emerald-400',
                  log.level === 'info' && 'text-[var(--color-text-dim)]'
                )}>
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips bar */}
      <div className="px-6 py-2.5 border-t border-[var(--color-border-primary)] flex items-center gap-4 text-xs text-[var(--color-text-dim)] shrink-0">
        <span className="text-[var(--color-text-muted)]">写作框架：</span>
        <span>· 五段成长弧线（建立信念→新生蜕变）</span>
        <span>· Show Don&apos;t Tell 铁律</span>
        <span>· 断崖式结尾引擎</span>
      </div>

      {/* Toast layer */}
      <AnimatePresence>
        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
