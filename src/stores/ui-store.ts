import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EditorMode, RightPanelTab } from '@/types';

interface UIState {
  editorMode: EditorMode;
  rightPanelTab: RightPanelTab;
  rightPanelOpen: boolean;
  leftSidebarOpen: boolean;
  selectedChapterId: string | null;
  isGeneratingChapter: boolean;
  generationError: string | null;

  setEditorMode: (mode: EditorMode) => void;
  setRightPanelTab: (tab: RightPanelTab) => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleLeftSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setSelectedChapterId: (id: string | null) => void;
  setIsGeneratingChapter: (v: boolean) => void;
  setGenerationError: (err: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      editorMode: 'inspiration',
      rightPanelTab: 'outline',
      rightPanelOpen: true,
      leftSidebarOpen: true,
      selectedChapterId: null,
      isGeneratingChapter: false,
      generationError: null,

      setEditorMode: (mode) => set({ editorMode: mode }),
      setRightPanelTab: (tab) => set({ rightPanelTab: tab, rightPanelOpen: true }),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
      toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
      setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
      setSelectedChapterId: (id) => set({ selectedChapterId: id }),
      setIsGeneratingChapter: (v) => set({ isGeneratingChapter: v }),
      setGenerationError: (err) => set({ generationError: err }),
    }),
    { name: 'ai-novel-ui-store' }
  )
);
