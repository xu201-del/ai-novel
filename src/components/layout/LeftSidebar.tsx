"use client";

import { useNovelStore } from "@/stores/novel-store";
import { useUIStore } from "@/stores/ui-store";
import { Plus, BookMarked, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import CreateNovelDialog from "@/components/novel/CreateNovelDialog";
import { cn, formatDate } from "@/lib/utils";

export default function LeftSidebar() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const novels = useNovelStore((s) => s.novels);
  const currentNovelId = useNovelStore((s) => s.currentNovelId);
  const setCurrentNovel = useNovelStore((s) => s.setCurrentNovel);
  const deleteNovel = useNovelStore((s) => s.deleteNovel);
  const leftSidebarOpen = useUIStore((s) => s.leftSidebarOpen);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!mounted) return null;
  if (!leftSidebarOpen) return null;

  return (
    <>
      <aside className="w-64 shrink-0 border-r border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex flex-col h-full animate-fade-in">
        <div className="p-3 border-b border-[var(--color-border-secondary)]">
          <button
            onClick={() => setDialogOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-accent)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all text-sm"
          >
            <Plus size={15} />
            新建小说
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1 px-2">
          {novels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
              <BookMarked
                size={36}
                className="text-[var(--color-text-dim)] mb-3"
                strokeWidth={1}
              />
              <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                还没有小说
                <br />
                点击上方按钮开始创作
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {novels
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((novel) => (
                  <div
                    key={novel.id}
                    onClick={() => setCurrentNovel(novel.id)}
                    className={cn(
                      "group relative p-3 rounded-[var(--radius-md)] cursor-pointer transition-all",
                      currentNovelId === novel.id
                        ? "bg-[var(--color-accent-bg)] border border-[var(--color-accent)]/20"
                        : "border border-transparent hover:bg-[var(--color-bg-hover)]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-[var(--radius-sm)] shrink-0 flex items-center justify-center text-xs font-bold text-white/90"
                        style={{ background: novel.coverColor || "#3a3a50" }}
                      >
                        {novel.title.slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-medium text-sm text-[var(--color-text-primary)] truncate">
                            {novel.title}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`确定删除《${novel.title}》？`))
                                deleteNovel(novel.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[var(--color-text-dim)] hover:text-[var(--color-red)] transition-all p-0.5"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                          {novel.chapters.length} 章 · {novel.genre}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-dim)] mt-1">
                          {formatDate(novel.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </aside>
      <CreateNovelDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
