"use client";

import { useState } from "react";
import { useNovelStore } from "@/stores/novel-store";
import { Sparkles, Plus } from "lucide-react";

export default function AIAssistant() {
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const [prompt, setPrompt] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  if (!currentNovel) return null;

  const handleSend = async () => {
    if (!prompt.trim() || loading) return;
    const userMsg = prompt.trim();
    setChat((c) => [...c, { role: "user", text: userMsg }]);
    setPrompt("");
    setLoading(true);
    // Simulate AI
    await new Promise((r) => setTimeout(r, 1500));
    setChat((c) => [
      ...c,
      {
        role: "ai",
        text: `关于「${userMsg.slice(0, 30)}...」的建议：\n\n这是 AI 助手的模拟回复。在实际使用中，这里会接入大语言模型 API，根据你的小说《${currentNovel.title}》的上下文，提供针对性的写作建议、情节构思和角色发展思路。`,
      },
    ]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {chat.length === 0 && (
          <div className="text-center py-12 px-4">
            <Sparkles
              size={28}
              className="text-[var(--color-accent)] mx-auto mb-3"
              strokeWidth={1}
            />
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              向 AI 助手提问写作相关的问题
            </p>
            <div className="mt-3 space-y-1.5">
              {[
                "帮我设计下一章的情节",
                "这个角色应该如何发展",
                "给我一些场景描写灵感",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setPrompt(q)}
                  className="block w-full text-left px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] rounded-[var(--radius-sm)] transition-all"
                >
                  「{q}」
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.map((msg, i) => (
          <div
            key={i}
            className={`text-sm leading-relaxed p-3 rounded-[var(--radius-md)] ${
              msg.role === "user"
                ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] ml-4"
                : "bg-[var(--color-accent-bg)] text-[var(--color-text-secondary)] mr-4"
            }`}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-dim)] px-1">
            <span className="inline-block w-3 h-3 border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin" />
            思考中...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-border-primary)] p-2">
        <div className="flex items-center gap-1">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="问 AI 任何写作问题..."
            className="flex-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-all placeholder:text-[var(--color-text-dim)]"
          />
          <button
            onClick={handleSend}
            disabled={!prompt.trim() || loading}
            className="btn-ghost px-2 disabled:opacity-30"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
