"use client";

import { useNovelStore } from "@/stores/novel-store";
import { Brain, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function MemorySummary() {
  const currentNovel = useNovelStore((s) => s.currentNovel());

  if (!currentNovel) return null;

  const { memories, chapters } = currentNovel;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[var(--color-border-secondary)] flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">
          {memories.length} 条摘要
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {memories.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Brain
              size={28}
              className="text-[var(--color-text-dim)] mx-auto mb-2"
              strokeWidth={1}
            />
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              完成章节后，AI 会自动生成情节摘要
              <br />
              帮助你追踪故事脉络
            </p>
          </div>
        ) : (
          <div className="py-1">
            {memories
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((m) => {
                const chapter = chapters.find((c) => c.id === m.chapterId);
                return (
                  <div
                    key={m.id}
                    className="px-3 py-2.5 border-b border-[var(--color-border-secondary)] last:border-0"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <FileText size={11} className="text-[var(--color-text-dim)]" />
                      <span className="text-[10px] text-[var(--color-text-dim)]">
                        {chapter?.title || "未知章节"} · {formatDate(m.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {m.summary}
                    </p>
                    {m.keyEvents.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {m.keyEvents.map((ev, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--color-accent-bg)] text-[var(--color-accent)]"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
