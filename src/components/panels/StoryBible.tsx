"use client";

import { useState } from "react";
import { useNovelStore } from "@/stores/novel-store";
import { cn } from "@/lib/utils";
import {
  Plus,
  MapPin,
  Users,
  Sparkles,
  Landmark,
  Cpu,
  BookOpen,
  Palette,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { WorldSetting } from "@/types";
import type { LucideIcon } from "lucide-react";

const categoryConfig: Record<
  WorldSetting["category"],
  { icon: LucideIcon; label: string; color: string }
> = {
  geography: { icon: MapPin, label: "地理", color: "var(--color-green)" },
  culture: { icon: Palette, label: "文化", color: "var(--color-purple)" },
  magic: { icon: Sparkles, label: "魔法", color: "var(--color-accent)" },
  technology: { icon: Cpu, label: "科技", color: "var(--color-blue)" },
  history: { icon: BookOpen, label: "历史", color: "var(--color-purple)" },
  faction: { icon: Landmark, label: "势力", color: "var(--color-red)" },
  other: { icon: Users, label: "其他", color: "var(--color-text-muted)" },
};

export default function StoryBible() {
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const addWorldSetting = useNovelStore((s) => s.addWorldSetting);
  const deleteWorldSetting = useNovelStore((s) => s.deleteWorldSetting);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] =
    useState<WorldSetting["category"]>("geography");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!currentNovel) return null;

  const { worldSettings } = currentNovel;

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addWorldSetting(currentNovel.id, {
      category: newCategory,
      title: newTitle.trim(),
      content: newContent.trim(),
    });
    setNewTitle("");
    setNewContent("");
    setShowForm(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-secondary)]">
        <span className="text-xs text-[var(--color-text-muted)]">
          {worldSettings.length} 项设定
        </span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-ghost px-2 text-xs"
        >
          <Plus size={13} />
          添加
        </button>
      </div>

      {showForm && (
        <div className="p-3 border-b border-[var(--color-border-secondary)] space-y-2 animate-fade-in">
          <div className="flex gap-1 flex-wrap">
            {(Object.entries(categoryConfig) as [WorldSetting["category"], typeof categoryConfig["geography"]][]).map(
              ([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setNewCategory(key)}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] transition-all border",
                    newCategory === key
                      ? "border-current"
                      : "border-transparent bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
                  )}
                  style={{ color: newCategory === key ? cfg.color : undefined }}
                >
                  {cfg.label}
                </button>
              )
            )}
          </div>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="设定名称"
            className="input-field text-xs py-1.5"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="详细描述..."
            className="input-field text-xs py-1.5 h-16 resize-none"
            rows={2}
          />
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="btn-primary w-full text-xs py-1.5"
          >
            添加设定
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {worldSettings.length === 0 ? (
          <div className="text-center py-12 px-4">
            <BookOpen
              size={28}
              className="text-[var(--color-text-dim)] mx-auto mb-2"
              strokeWidth={1}
            />
            <p className="text-xs text-[var(--color-text-muted)]">
              还没有世界观设定
              <br />
              开始构建你的世界
            </p>
          </div>
        ) : (
          <div className="py-1">
            {worldSettings.map((ws) => {
              const cfg = categoryConfig[ws.category];
              const isExpanded = expandedId === ws.id;
              return (
                <div
                  key={ws.id}
                  className="border-b border-[var(--color-border-secondary)] last:border-0"
                >
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : ws.id)
                    }
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--color-bg-hover)] transition-all"
                  >
                    <cfg.icon
                      size={13}
                      style={{ color: cfg.color }}
                      strokeWidth={1.5}
                    />
                    <span className="flex-1 text-xs text-[var(--color-text-secondary)] truncate">
                      {ws.title}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        color: cfg.color,
                        background: `${cfg.color}15`,
                      }}
                    >
                      {cfg.label}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={12} className="text-[var(--color-text-dim)]" />
                    ) : (
                      <ChevronDown size={12} className="text-[var(--color-text-dim)]" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWorldSetting(currentNovel.id, ws.id);
                      }}
                      className="text-[var(--color-text-dim)] hover:text-[var(--color-red)] p-0.5"
                    >
                      <Trash2 size={11} />
                    </button>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 animate-fade-in">
                      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed whitespace-pre-wrap">
                        {ws.content || "暂无详细描述"}
                      </p>
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
