import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EditorMode, LeftPanelLayer, KnowledgeBaseTab, AICard } from '@/types';
import { generateId } from '@/lib/utils';

interface UIState {
  editorMode: EditorMode;
  rightPanelOpen: boolean;
  leftSidebarOpen: boolean;

  // Left sidebar dual-layer
  leftPanelLayer: LeftPanelLayer;
  knowledgeBaseTab: KnowledgeBaseTab;

  // Chapter
  selectedChapterId: string | null;
  isGeneratingChapter: boolean;
  generationError: string | null;

  // AI Card Stream (right panel)
  aiCards: AICard[];

  // Actions
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

  // AI Card actions
  addAICard: (card: Omit<AICard, 'id' | 'timestamp' | 'applied'>) => string;
  removeAICard: (id: string) => void;
  markCardApplied: (id: string) => void;
  clearAICards: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      editorMode: 'inspiration',
      rightPanelOpen: true,
      leftSidebarOpen: true,
      leftPanelLayer: 'projects',
      knowledgeBaseTab: 'outline',
      selectedChapterId: null,
      isGeneratingChapter: false,
      generationError: null,
      aiCards: [],

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
    }),
    {
      name: 'ai-novel-ui-store',
      partialize: (state) => {
        // Don't persist ephemeral AI cards
        const { aiCards, ...rest } = state;
        return rest;
      },
    }
  )
);
