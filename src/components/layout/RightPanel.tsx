"use client";

import { useState, useEffect } from "react";
import { useNovelStore } from "@/stores/novel-store";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import {
  Bot,
  BookOpen,
  Brain,
  ListTree,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RightPanelTab } from "@/types";
import AIAssistant from "@/components/panels/AIAssistant";
import StoryBible from "@/components/panels/StoryBible";
import MemorySummary from "@/components/panels/MemorySummary";
import ChapterOutline from "@/components/panels/ChapterOutline";

const tabs: { id: RightPanelTab; icon: LucideIcon; label: string }[] = [
  { id: "ai-assistant", icon: Bot, label: "AI 助手" },
  { id: "story-bible", icon: BookOpen, label: "故事圣经" },
  { id: "memory", icon: Brain, label: "记忆摘要" },
  { id: "outline", icon: ListTree, label: "章节目录" },
];

export default function RightPanel() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const currentNovel = useNovelStore((s) => s.currentNovel());
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const rightPanelTab = useUIStore((s) => s.rightPanelTab);
  const setRightPanelTab = useUIStore((s) => s.setRightPanelTab);

  if (!mounted) return null;

  if (!rightPanelOpen) return null;

  return (
    <aside className="w-72 shrink-0 border-l border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex flex-col h-full animate-fade-in">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--color-border-secondary)]">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setRightPanelTab(id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] transition-all border-b-2",
              rightPanelTab === id
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            )}
            title={label}
          >
            <Icon size={15} strokeWidth={1.5} />
            <span className="leading-none">{label}</span>
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {!currentNovel ? (
          <div className="flex items-center justify-center h-full text-sm text-[var(--color-text-muted)] px-4 text-center leading-relaxed">
            选择一本小说后开始使用辅助工具
          </div>
        ) : rightPanelTab === "ai-assistant" ? (
          <AIAssistant />
        ) : rightPanelTab === "story-bible" ? (
          <StoryBible />
        ) : rightPanelTab === "memory" ? (
          <MemorySummary />
        ) : (
          <ChapterOutline />
        )}
      </div>
    </aside>
  );
}
