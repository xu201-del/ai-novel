import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Novel, Chapter, Character, WorldSetting, MemoryEntry, GenerationOutline, ApiConfig } from '@/types';
import { generateId } from '@/lib/utils';

interface NovelState {
  novels: Novel[];
  currentNovelId: string | null;
  apiConfig: ApiConfig;

  // API config
  setApiConfig: (config: Partial<ApiConfig>) => void;

  // Novel CRUD
  createNovel: (data: Pick<Novel, 'title' | 'subtitle' | 'author' | 'description' | 'genre' | 'coverColor'>) => string;
  updateNovel: (id: string, data: Partial<Novel>) => void;
  deleteNovel: (id: string) => void;
  setCurrentNovel: (id: string | null) => void;

  // Writing framework
  setWriteMode: (novelId: string, mode: Novel['writeMode']) => void;
  setTropeTag: (novelId: string, tag: string) => void;
  setInspirationText: (novelId: string, text: string) => void;
  setChapterCount: (novelId: string, count: number) => void;
  setGenerationPhase: (novelId: string, phase: Novel['generationPhase']) => void;
  setGenerationOutline: (novelId: string, outline: GenerationOutline) => void;

  // Chapter
  addChapter: (novelId: string, title: string, summary?: string) => string;
  updateChapter: (novelId: string, chapterId: string, data: Partial<Chapter>) => void;
  deleteChapter: (novelId: string, chapterId: string) => void;
  reorderChapters: (novelId: string, chapterIds: string[]) => void;

  // Character
  addCharacter: (novelId: string, data: Pick<Character, 'name' | 'role' | 'description' | 'traits'>) => string;
  updateCharacter: (novelId: string, characterId: string, data: Partial<Character>) => void;
  deleteCharacter: (novelId: string, characterId: string) => void;

  // World Setting
  addWorldSetting: (novelId: string, data: Pick<WorldSetting, 'category' | 'title' | 'content'>) => string;
  updateWorldSetting: (novelId: string, settingId: string, data: Partial<WorldSetting>) => void;
  deleteWorldSetting: (novelId: string, settingId: string) => void;

  // Memory
  addMemory: (novelId: string, data: Pick<MemoryEntry, 'chapterId' | 'summary' | 'keyEvents' | 'characterDevelopments'>) => string;
  updateGlobalMemory: (novelId: string, memory: Partial<Novel['globalMemory']>) => void;

  // Getters
  currentNovel: () => Novel | undefined;
  getChapter: (novelId: string, chapterId: string) => Chapter | undefined;
}

export const useNovelStore = create<NovelState>()(
  persist(
    (set, get) => ({
      novels: [],
      currentNovelId: null,
      apiConfig: {
        key: '',
        model: 'deepseek-v3',
      },

      setApiConfig: (config) =>
        set((s) => ({ apiConfig: { ...s.apiConfig, ...config } })),

      createNovel: (data) => {
        const id = generateId();
        const now = Date.now();
        const novel: Novel = {
          ...data,
          id,
          status: 'planning',
          targetWords: 0,
          writeMode: 'long',
          tropeTag: '',
          inspirationText: '',
          chapterCount: 10,
          generationPhase: 'idle',
          generationOutline: null,
          protagonist: null,
          timeline: [],
          worldBuildingText: '',
          globalMemory: { mainPlot: '', characters: '', location: '', notes: '' },
          chapters: [],
          characters: [],
          worldSettings: [],
          memories: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ novels: [...s.novels, novel], currentNovelId: id }));
        return id;
      },

      updateNovel: (id, data) =>
        set((s) => ({
          novels: s.novels.map((n) =>
            n.id === id ? { ...n, ...data, updatedAt: Date.now() } : n
          ),
        })),

      deleteNovel: (id) =>
        set((s) => ({
          novels: s.novels.filter((n) => n.id !== id),
          currentNovelId: s.currentNovelId === id ? null : s.currentNovelId,
        })),

      setCurrentNovel: (id) => set({ currentNovelId: id }),

      setWriteMode: (novelId, mode) =>
        set((s) => ({
          novels: s.novels.map((n) =>
            n.id === novelId ? { ...n, writeMode: mode, updatedAt: Date.now() } : n
          ),
        })),

      setTropeTag: (novelId, tag) =>
        set((s) => ({
          novels: s.novels.map((n) =>
            n.id === novelId ? { ...n, tropeTag: tag, updatedAt: Date.now() } : n
          ),
        })),

      setInspirationText: (novelId, text) =>
        set((s) => ({
          novels: s.novels.map((n) =>
            n.id === novelId ? { ...n, inspirationText: text, updatedAt: Date.now() } : n
          ),
        })),

      setChapterCount: (novelId, count) =>
        set((s) => ({
          novels: s.novels.map((n) =>
            n.id === novelId ? { ...n, chapterCount: count, updatedAt: Date.now() } : n
          ),
        })),

      setGenerationPhase: (novelId, phase) =>
        set((s) => ({
          novels: s.novels.map((n) =>
            n.id === novelId ? { ...n, generationPhase: phase, updatedAt: Date.now() } : n
          ),
        })),

      setGenerationOutline: (novelId, outline) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            const chapters: Chapter[] = outline.chapters.map((oc, i) => ({
              id: generateId(),
              novelId,
              title: oc.title,
              summary: oc.summary,
              content: '',
              order: i,
              status: 'draft' as const,
              wordCount: 0,
              notes: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }));
            return {
              ...n,
              generationOutline: outline,
              title: outline.title || n.title,
              genre: outline.genre || n.genre,
              description: outline.description || n.description,
              protagonist: outline.protagonist,
              timeline: outline.timeline,
              worldBuildingText: outline.worldBuilding,
              status: 'writing' as const,
              chapters,
              updatedAt: Date.now(),
            };
          }),
        })),

      addChapter: (novelId, title, summary = '') => {
        const id = generateId();
        const now = Date.now();
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            const chapter: Chapter = {
              id, novelId, title, summary,
              content: '', order: n.chapters.length, status: 'draft',
              wordCount: 0, notes: '', createdAt: now, updatedAt: now,
            };
            return { ...n, chapters: [...n.chapters, chapter], updatedAt: now };
          }),
        }));
        return id;
      },

      updateChapter: (novelId, chapterId, data) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            return {
              ...n,
              chapters: n.chapters.map((c) =>
                c.id === chapterId
                  ? { ...c, ...data, wordCount: data.content !== undefined ? data.content.length : c.wordCount, updatedAt: Date.now() }
                  : c
              ),
              updatedAt: Date.now(),
            };
          }),
        })),

      deleteChapter: (novelId, chapterId) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            return {
              ...n,
              chapters: n.chapters.filter((c) => c.id !== chapterId),
              updatedAt: Date.now(),
            };
          }),
        })),

      reorderChapters: (novelId, chapterIds) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            const ordered = chapterIds
              .map((id, idx) => {
                const ch = n.chapters.find((c) => c.id === id);
                return ch ? { ...ch, order: idx } : null;
              })
              .filter(Boolean) as Chapter[];
            return { ...n, chapters: ordered, updatedAt: Date.now() };
          }),
        })),

      addCharacter: (novelId, data) => {
        const id = generateId();
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            return {
              ...n,
              characters: [...n.characters, { id, novelId, ...data, relationships: [], createdAt: Date.now() }],
              updatedAt: Date.now(),
            };
          }),
        }));
        return id;
      },

      updateCharacter: (novelId, characterId, data) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            return {
              ...n,
              characters: n.characters.map((c) =>
                c.id === characterId ? { ...c, ...data } : c
              ),
              updatedAt: Date.now(),
            };
          }),
        })),

      deleteCharacter: (novelId, characterId) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            return {
              ...n,
              characters: n.characters.filter((c) => c.id !== characterId),
              updatedAt: Date.now(),
            };
          }),
        })),

      addWorldSetting: (novelId, data) => {
        const id = generateId();
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            return {
              ...n,
              worldSettings: [...n.worldSettings, { id, novelId, ...data, createdAt: Date.now() }],
              updatedAt: Date.now(),
            };
          }),
        }));
        return id;
      },

      updateWorldSetting: (novelId, settingId, data) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            return {
              ...n,
              worldSettings: n.worldSettings.map((ws) =>
                ws.id === settingId ? { ...ws, ...data } : ws
              ),
              updatedAt: Date.now(),
            };
          }),
        })),

      deleteWorldSetting: (novelId, settingId) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            return {
              ...n,
              worldSettings: n.worldSettings.filter((ws) => ws.id !== settingId),
              updatedAt: Date.now(),
            };
          }),
        })),

      addMemory: (novelId, data) => {
        const id = generateId();
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            return {
              ...n,
              memories: [...n.memories, { id, novelId, ...data, createdAt: Date.now() }],
              updatedAt: Date.now(),
            };
          }),
        }));
        return id;
      },

      updateGlobalMemory: (novelId, memory) =>
        set((s) => ({
          novels: s.novels.map((n) =>
            n.id === novelId
              ? { ...n, globalMemory: { ...n.globalMemory, ...memory }, updatedAt: Date.now() }
              : n
          ),
        })),

      currentNovel: () => {
        const { novels, currentNovelId } = get();
        return novels.find((n) => n.id === currentNovelId);
      },

      getChapter: (novelId, chapterId) => {
        const novel = get().novels.find((n) => n.id === novelId);
        return novel?.chapters.find((c) => c.id === chapterId);
      },
    }),
    { name: 'ai-novel-store' }
  )
);
