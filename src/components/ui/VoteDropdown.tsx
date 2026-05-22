'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Copy, Check, ArrowDownToLine, Sparkles, Edit3 } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { fetchAI } from '@/services/api';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import GlassModal from './GlassModal';

type VoteType = '月票' | '周票' | '日票' | '推荐票';

export default function VoteDropdown() {
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const apiConfig = useNovelStore((s) => s.apiConfig);
  const updateChapter = useNovelStore((s) => s.updateChapter);
  const addAICard = useUIStore((s) => s.addAICard);

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

  const dropdownRef = useClickOutside<HTMLDivElement>(() => setOpen(false), open);

  const handleSelect = useCallback(async (type: VoteType) => {
    setVoteType(type);
    setOpen(false);
    setModalOpen(true);
    setCopied(false);
    setAppended(false);
    setLoading(true);

    try {
      const chapterContent = currentChapter?.content?.slice(-400) || '';
      const chapterInfo = currentChapter
        ? `第 ${currentChapter.order + 1} 章 ${currentChapter.title}`
        : '';

      const prompt = `你是网文作者，需要写一段真诚的求${type}文案。要求：
- 200-280字
- 语气真诚、不做作、略带自嘲
- 简要提及近期剧情亮点（15-25字钩子）
- 不要过度卖惨，但可以适度表达创作的不易
- 结尾诚恳请求读者投票支持
- 结合以下近期剧情内容创作

书籍：${currentNovel?.title || ''}
最近章节内容：${chapterContent}
当前进度：${chapterInfo}

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
  }, [apiConfig, currentChapter, currentNovel?.title]);

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
      <div ref={dropdownRef} className="relative">
        <button
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

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1.5 w-36 glass-depth-2 rounded-[var(--radius-lg)] overflow-hidden z-40"
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
          )}
        </AnimatePresence>
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
