"use client";

import { useState } from "react";
import { useNovelStore } from "@/stores/novel-store";

const coverColors = [
  "#3b3b6e", "#4a3a6e", "#5c3a5c", "#3a5c5c",
  "#4a4a3a", "#5c3a3a", "#3a4a6e", "#4e3a3a",
  "#2e4a4a", "#3a2e4a", "#5c4a3a", "#3a4a4a",
];

const genres = ["玄幻", "科幻", "都市", "历史", "悬疑", "言情", "武侠", "游戏", "奇幻", "轻小说"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateNovelDialog({ open, onOpenChange }: Props) {
  const createNovel = useNovelStore((s) => s.createNovel);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("玄幻");
  const [coverColor, setCoverColor] = useState(coverColors[0]);

  if (!open) return null;

  const handleCreate = () => {
    if (!title.trim()) return;
    createNovel({
      title: title.trim(),
      subtitle: subtitle.trim(),
      author: author.trim() || "匿名作者",
      description: description.trim(),
      genre,
      coverColor,
    });
    setTitle("");
    setSubtitle("");
    setAuthor("");
    setDescription("");
    setGenre("玄幻");
    setCoverColor(coverColors[0]);
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative w-full max-w-md glass-panel rounded-[var(--radius-xl)] p-6 animate-slide-up shadow-2xl">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
          创建新小说
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-5">
          填写基本信息开始你的创作之旅
        </p>

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              书名 <span className="text-[var(--color-red)]">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给你的作品起个名字"
              className="input-field"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              副标题
            </label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="一句话简介（可选）"
              className="input-field"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                作者
              </label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="你的笔名"
                className="input-field"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                分类
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="input-field cursor-pointer"
              >
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              简介
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述你的故事（可选）"
              className="input-field h-20 resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
              封面颜色
            </label>
            <div className="flex gap-2 flex-wrap">
              {coverColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setCoverColor(color)}
                  className="w-8 h-8 rounded-[var(--radius-sm)] transition-all border-2"
                  style={{
                    background: color,
                    borderColor:
                      coverColor === color ? "white" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={() => onOpenChange(false)}
            className="btn-secondary text-xs"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim()}
            className="btn-primary text-xs"
          >
            开始创作
          </button>
        </div>
      </div>
    </div>
  );
}
