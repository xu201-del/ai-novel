import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EditorMode, LeftPanelLayer, KnowledgeBaseTab, AICard } from '@/types';
import { generateId } from '@/lib/utils';

export type ThemeMode = 'dark' | 'light';

// ═══════════════════════════════════════════════════════════
// 静默双轨并发状态机 (Silent Concurrent Dual-Track FSM)
// idle → generating → complete → idle
//                    → cancelled → idle  (kill switch)
//                    → error     → idle  (toast + retry)
// ═══════════════════════════════════════════════════════════
export type ConcurrentGenPhase = 'idle' | 'generating' | 'complete' | 'cancelled' | 'error';

// ═══════════════════════════════════════════════════════════
// 批量逐章生成状态机 (Batch Chapter Generation FSM)
// idle → generating (逐章推进) → completed → idle
//                               → cancelled → idle
//                               → error     → idle
// ═══════════════════════════════════════════════════════════
export type BatchGenPhase = 'idle' | 'generating' | 'completed' | 'cancelled' | 'error';

export interface BatchGenProgress {
  current: number;       // 当前正在生成第几章 (1-based)
  total: number;         // 总章数
  currentTitle: string;  // 当前章节标题
}

interface UIState {
  theme: ThemeMode;
  editorMode: EditorMode;
  rightPanelOpen: boolean;
  leftSidebarOpen: boolean;

  // World Bible awakening
  worldBibleAwakened: boolean;
  setWorldBibleAwakened: (v: boolean) => void;

  // Left sidebar dual-layer
  leftPanelLayer: LeftPanelLayer;
  knowledgeBaseTab: KnowledgeBaseTab;

  // Chapter
  selectedChapterId: string | null;
  isGeneratingChapter: boolean;
  generationError: string | null;

  // Concurrent dual-track generation orchestrator (outline + framework)
  concurrentGenPhase: ConcurrentGenPhase;
  concurrentGenError: string | null;

  // Batch chapter generation
  batchGenPhase: BatchGenPhase;
  batchGenProgress: BatchGenProgress;
  batchGenError: string | null;

  // AI Card Stream (right panel)
  aiCards: AICard[];

  // Latest editor content (keystroke-level, for VoteDropdown etc.)
  latestEditorContent: string;
  setLatestEditorContent: (content: string) => void;

  // Actions
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setEditorMode: (mode: EditorMode) => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleLeftSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setLeftPanelLayer: (layer: LeftPanelLayer) => void;
  setKnowledgeBaseTab: (tab: KnowledgeBaseTab) => void;
  setSelectedChapterId: (id: string | null) => void;
  setIsGeneratingChapter: (v: boolean) => void;
  setGenerationError: (err: string | null) => void;
  setConcurrentGenPhase: (phase: ConcurrentGenPhase) => void;
  setConcurrentGenError: (err: string | null) => void;
  cancelGeneration: () => void;

  // Batch chapter generation actions
  setBatchGenPhase: (phase: BatchGenPhase) => void;
  setBatchGenProgress: (progress: Partial<BatchGenProgress>) => void;
  setBatchGenError: (err: string | null) => void;
  cancelBatchGeneration: () => void;

  // AI Card actions
  addAICard: (card: Omit<AICard, 'id' | 'timestamp' | 'applied'>) => string;
  removeAICard: (id: string) => void;
  markCardApplied: (id: string) => void;
  clearAICards: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      editorMode: 'inspiration',
      rightPanelOpen: true,
      leftSidebarOpen: true,
      worldBibleAwakened: false,
      setWorldBibleAwakened: (v) => set({ worldBibleAwakened: v }),
      leftPanelLayer: 'projects',
      knowledgeBaseTab: 'outline',
      selectedChapterId: null,
      isGeneratingChapter: false,
      generationError: null,
      concurrentGenPhase: 'idle',
      concurrentGenError: null,
      batchGenPhase: 'idle',
      batchGenProgress: { current: 0, total: 0, currentTitle: '' },
      batchGenError: null,
      aiCards: [],
      latestEditorContent: '',

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setEditorMode: (mode) => set({ editorMode: mode }),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
      toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
      setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
      setLeftPanelLayer: (layer) => set({ leftPanelLayer: layer }),
      setKnowledgeBaseTab: (tab) => set({ knowledgeBaseTab: tab }),
      setSelectedChapterId: (id) => set({ selectedChapterId: id }),
      setIsGeneratingChapter: (v) => set({ isGeneratingChapter: v }),
      setGenerationError: (err) => set({ generationError: err }),
      setConcurrentGenPhase: (phase) => set({ concurrentGenPhase: phase }),
      setConcurrentGenError: (err) => set({ concurrentGenError: err }),
      cancelGeneration: () => set({ concurrentGenPhase: 'cancelled', concurrentGenError: null }),

      setBatchGenPhase: (phase) => set({ batchGenPhase: phase }),
      setBatchGenProgress: (progress) =>
        set((s) => ({ batchGenProgress: { ...s.batchGenProgress, ...progress } })),
      setBatchGenError: (err) => set({ batchGenError: err }),
      cancelBatchGeneration: () =>
        set({ batchGenPhase: 'cancelled', batchGenError: null }),

      addAICard: (card) => {
        const id = generateId();
        const newCard: AICard = {
          ...card,
          id,
          timestamp: Date.now(),
          applied: false,
        };
        set((s) => ({
          aiCards: [newCard, ...s.aiCards],
          rightPanelOpen: true,
        }));
        return id;
      },

      removeAICard: (id) =>
        set((s) => ({ aiCards: s.aiCards.filter((c) => c.id !== id) })),

      markCardApplied: (id) =>
        set((s) => ({
          aiCards: s.aiCards.map((c) =>
            c.id === id ? { ...c, applied: true } : c
          ),
        })),

      clearAICards: () => set({ aiCards: [] }),
      setLatestEditorContent: (content) => set({ latestEditorContent: content }),
    }),
    {
      name: 'ai-novel-ui-store',
      partialize: (state) => {
        // Don't persist ephemeral data
        const { aiCards, latestEditorContent, concurrentGenPhase, concurrentGenError, batchGenPhase, batchGenProgress, batchGenError, ...rest } = state;
        return rest;
      },
    }
  )
);
