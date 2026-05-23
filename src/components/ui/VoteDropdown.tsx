'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Copy, Check, ArrowDownToLine, Sparkles, Edit3 } from 'lucide-react';
import { fetchAI } from '@/services/api';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import GlassModal from './GlassModal';

type VoteType = '月票' | '周票' | '日票' | '推荐票';

// ═══════════════════════════════════════════════════════════
// 剧情高潮词提取引擎 — 无审查自适应调度器
// 从编辑器内容中捕获核心冲突词、情感标记、场景锚点，
// 动态编织进求票文案 prompt 以实现上下文感知
// ═══════════════════════════════════════════════════════════

interface PlotKeywords {
  conflict: string[];   // 核心冲突词
  emotion: string[];    // 情感张力词
  setting: string[];    // 场景/世界观锚点
  characters: string[]; // 关键角色/势力
  hooks: string[];      // 可直接引用的悬念钩子
}

const CONFLICT_PATTERNS: [RegExp, string][] = [
  [/警报/g, '警报'], [/危机/g, '危机'], [/入侵/g, '入侵'], [/威胁/g, '威胁'],
  [/决战/g, '决战'], [/对决/g, '对决'], [/对抗/g, '对抗'], [/冲突/g, '冲突'],
  [/背叛/g, '背叛'], [/阴谋/g, '阴谋'], [/陷阱/g, '陷阱'], [/绝境/g, '绝境'],
  [/毁灭/g, '毁灭'], [/崩坏/g, '崩坏'], [/失控/g, '失控'], [/暴走/g, '暴走'],
  [/宣战/g, '宣战'], [/开战/g, '开战'], [/围攻/g, '围攻'], [/突围/g, '突围'],
  [/暗杀/g, '暗杀'], [/追杀/g, '追杀'], [/逃亡/g, '逃亡'], [/通缉/g, '通缉'],
];

const EMOTION_PATTERNS: [RegExp, string][] = [
  [/绝望/g, '绝望'], [/希望/g, '希望'], [/愤怒/g, '愤怒'], [/恐惧/g, '恐惧'],
  [/震惊/g, '震惊'], [/悲痛/g, '悲痛'], [/狂喜/g, '狂喜'], [/不安/g, '不安'],
  [/压抑/g, '压抑'], [/窒息/g, '窒息'], [/温柔/g, '温柔'], [/眷恋/g, '眷恋'],
  [/挣扎/g, '挣扎'], [/觉悟/g, '觉悟'], [/觉醒/g, '觉醒'], [/蜕变/g, '蜕变'],
];

const SETTING_PATTERNS: [RegExp, string][] = [
  [/硅基/g, '硅基'], [/碳基/g, '碳基'], [/机甲/g, '机甲'], [/星舰/g, '星舰'],
  [/太空/g, '太空'], [/地下城/g, '地下城'], [/实验室/g, '实验室'], [/基地/g, '基地'],
  [/虚拟/g, '虚拟'], [/现实/g, '现实'], [/维度/g, '维度'], [/时空/g, '时空'],
  [/修真/g, '修真'], [/修仙/g, '修仙'], [/魔法/g, '魔法'], [/异能/g, '异能'],
  [/末世/g, '末世'], [/废土/g, '废土'], [/荒野/g, '荒野'], [/深渊/g, '深渊'],
];

function extractPlotKeywords(text: string): PlotKeywords {
  const result: PlotKeywords = {
    conflict: [],
    emotion: [],
    setting: [],
    characters: [],
    hooks: [],
  };

  const seen = new Set<string>();

  CONFLICT_PATTERNS.forEach(([pattern, keyword]) => {
    if (pattern.test(text) && !seen.has(keyword)) {
      pattern.lastIndex = 0; // reset regex state
      result.conflict.push(keyword);
      seen.add(keyword);
    }
  });

  EMOTION_PATTERNS.forEach(([pattern, keyword]) => {
    if (pattern.test(text) && !seen.has(keyword)) {
      pattern.lastIndex = 0;
      result.emotion.push(keyword);
      seen.add(keyword);
    }
  });

  SETTING_PATTERNS.forEach(([pattern, keyword]) => {
    if (pattern.test(text) && !seen.has(keyword)) {
      pattern.lastIndex = 0;
      result.setting.push(keyword);
      seen.add(keyword);
    }
  });

  // 提取引号内的对话作为悬念钩子候选
  const quotePattern = /[""「」『』]([^""「」『』]{8,40})[""「」『』]/g;
  let match: RegExpExecArray | null;
  while ((match = quotePattern.exec(text)) !== null) {
    const quote = match[1].trim();
    if (quote.length >= 8 && result.hooks.length < 3) {
      result.hooks.push(quote);
    }
  }

  // 感叹句/反问句作为钩子候选
  const exclaimPattern = /([^。！？\n]{6,30}[！？])/g;
  while ((match = exclaimPattern.exec(text)) !== null) {
    const exclaim = match[1].trim();
    if (result.hooks.length < 3 && !result.hooks.includes(exclaim)) {
      result.hooks.push(exclaim);
    }
  }

  return result;
}

function formatKeywordsForPrompt(kw: PlotKeywords): string {
  const parts: string[] = [];
  if (kw.conflict.length > 0) parts.push(`核心冲突: ${kw.conflict.join('、')}`);
  if (kw.emotion.length > 0) parts.push(`情感基调: ${kw.emotion.join('、')}`);
  if (kw.setting.length > 0) parts.push(`世界观锚点: ${kw.setting.join('、')}`);
  if (kw.hooks.length > 0) parts.push(`剧情钩子: ${kw.hooks.slice(0, 2).join('；')}`);
  return parts.length > 0 ? parts.join('\n') : '';
}

export default function VoteDropdown() {
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const apiConfig = useNovelStore((s) => s.apiConfig);
  const updateChapter = useNovelStore((s) => s.updateChapter);
  const addAICard = useUIStore((s) => s.addAICard);
  const latestEditorContent = useUIStore((s) => s.latestEditorContent);

  const chapters = currentNovel?.chapters ?? [];
  const currentChapterId = useUIStore((s) => s.selectedChapterId);
  const currentChapter = chapters.find((c) => c.id === currentChapterId);

  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [voteType, setVoteType] = useState<VoteType>('推荐票');
  const [copyText, setCopyText] = useState('');
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [appended, setAppended] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  // clickOutside: close when clicking outside both the button and portal menu
  useEffect(() => {
    if (!open) return;
    const listener = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', listener, true);
    document.addEventListener('touchstart', listener, true);
    return () => {
      document.removeEventListener('mousedown', listener, true);
      document.removeEventListener('touchstart', listener, true);
    };
  }, [open]);

  // Recalculate dropdown position on open (handles scroll/resize)
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 6, left: rect.right });
    } else if (!open) {
      setDropdownPos(null);
    }
  }, [open]);

  const handleSelect = useCallback(async (type: VoteType) => {
    setVoteType(type);
    setOpen(false);
    setModalOpen(true);
    setCopied(false);
    setAppended(false);
    setLoading(true);

    try {
      // 优先使用实时编辑器内容（含未保存的 keystroke），回退到已存储的章节内容
      const liveContent = latestEditorContent || currentChapter?.content || '';
      const chapterContent = liveContent.slice(-500);
      const fullContent = liveContent;
      const chapterInfo = currentChapter
        ? `第 ${currentChapter.order + 1} 章 ${currentChapter.title}`
        : '';

      // 从全章节内容中提取剧情高潮词
      const keywords = extractPlotKeywords(fullContent);
      const keywordBlock = formatKeywordsForPrompt(keywords);

      const keywordDirective = keywordBlock
        ? `\n\n【重要】以下是从本章剧情中自动提取的核心关键词，请在文案中自然地融入其中 2-3 个，作为剧情悬念钩子：\n${keywordBlock}\n`
        : '';

      const prompt = `你是网文作者，需要写一段真诚的求${type}文案。要求：
- 200-280字
- 语气真诚、不做作、略带自嘲
- 巧妙引用下方提取的剧情关键词作为悬念钩子，吸引读者对后续剧情的好奇
- 不要过度卖惨，但可以适度表达创作的不易
- 结尾诚恳请求读者投票支持
- 结合以下近期剧情内容创作
${keywordDirective}
书籍：${currentNovel?.title || ''}
章节：${chapterInfo}
近期剧情：${chapterContent}

请输出纯文案，不要加任何标签或解释。`;

      const text = await fetchAI({ prompt, apiConfig });
      setCopyText(text);
      setEditText(text);
    } catch {
      setCopyText('求票文案生成失败，请检查 API 配置后重试。');
      setEditText('求票文案生成失败，请检查 API 配置后重试。');
    } finally {
      setLoading(false);
    }
  }, [apiConfig, currentChapter, currentNovel?.title, latestEditorContent]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAppend = () => {
    if (!currentNovel || !currentChapter) return;
    const newContent = currentChapter.content + '\n\n' + editText;
    updateChapter(currentNovel.id, currentChapter.id, {
      content: newContent,
      wordCount: newContent.length,
    });

    addAICard({
      type: 'vote-request',
      title: `求${voteType}文案`,
      content: editText,
      sourceAction: '求票文案',
      chapterId: currentChapter.id,
    });

    setAppended(true);
    setTimeout(() => setModalOpen(false), 1200);
  };

  const voteOptions: VoteType[] = ['月票', '周票', '日票'];

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] border border-[var(--color-border-primary)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-all duration-200"
        >
          <Sparkles size={12} strokeWidth={1.5} />
          求票
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            <ChevronDown size={11} />
          </motion.span>
        </button>

        {typeof window !== 'undefined' && open && dropdownPos &&
          createPortal(
            <AnimatePresence>
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="fixed w-36 glass-depth-2 rounded-[var(--radius-lg)] overflow-hidden z-[100]"
                style={{ top: dropdownPos.top, left: dropdownPos.left - 144 }}
              >
                {voteOptions.map((opt, i) => (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-accent)] transition-colors duration-150"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <Sparkles size={11} strokeWidth={1.5} />
                    求{opt}
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>,
            document.body
          )
        }
      </div>

      {/* Glassmorphic modal */}
      <GlassModal open={modalOpen} onClose={() => setModalOpen(false)} size="md">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-amber-start)] to-[var(--color-amber-end)] flex items-center justify-center">
              <Sparkles size={14} className="text-[#0b0b0f]" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                求{voteType}文案
              </h3>
              <p className="text-[10px] text-[var(--color-text-dim)]">
                AI 深度编织 · 可编辑 · 一键复制/置入
              </p>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-[var(--color-text-dim)]">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles size={16} className="text-[var(--color-accent)]" />
              </motion.div>
              <span className="text-xs">AI 正在编织文案...</span>
            </div>
          )}

          {/* Editable textarea */}
          {!loading && (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={6}
              className="w-full p-3.5 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] text-sm leading-relaxed resize-none outline-none focus:border-[var(--color-accent)]/50 transition-colors duration-200 placeholder:text-[var(--color-text-dim)]"
            />
          )}

          {/* Character count */}
          {!loading && (
            <p className="text-[10px] text-[var(--color-text-dim)] text-right">
              {editText.length} / 280 字
            </p>
          )}

          {/* Actions */}
          {!loading && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-[var(--radius-md)] border border-[var(--color-border-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-all duration-200"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-[var(--color-green)]" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    复制文案
                  </>
                )}
              </button>
              <button
                onClick={handleAppend}
                disabled={appended}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--color-amber-start)] to-[var(--color-amber-end)] text-[#0b0b0f] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(212,164,76,0.4)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {appended ? (
                  <>
                    <Check size={13} />
                    已置入章节末尾
                  </>
                ) : (
                  <>
                    <ArrowDownToLine size={13} />
                    置入章节末尾
                  </>
                )}
              </button>
            </div>
          )}

          {/* Close hint */}
          <p className="text-[10px] text-[var(--color-text-dim)] text-center">
            按 ESC 或点击背景关闭
          </p>
        </div>
      </GlassModal>
    </>
  );
}
