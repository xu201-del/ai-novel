import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Novel, Chapter, Character, WorldSetting, Protagonist, TimelineNode, MemoryEntry, GenerationOutline, ApiConfig, GitHubConfig, PipelineStage, NovelFramework, FrameworkVolume, VolumeChapter } from '@/types';
import { generateId } from '@/lib/utils';

interface NovelState {
  novels: Novel[];
  currentNovelId: string | null;
  apiConfig: ApiConfig;
  githubConfig: GitHubConfig;

  // API config
  setApiConfig: (config: Partial<ApiConfig>) => void;
  setGithubConfig: (config: Partial<GitHubConfig>) => void;

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
  setSlimOutline: (novelId: string, outline: GenerationOutline) => void;

  // Novel framework
  setNovelFramework: (novelId: string, framework: NovelFramework) => void;

  // Volume chapters (篇内自定义细化)
  setVolumeChapters: (novelId: string, volumeId: string, chapters: VolumeChapter[]) => void;

  // Pipeline
  setPipelineStage: (novelId: string, stage: PipelineStage) => void;

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

  // World Bible awakening — extract character/world data from framework
  awakenWorldBibleFromFramework: (novelId: string) => void;

  // Framework volume management
  addFrameworkVolume: (novelId: string, volume: FrameworkVolume) => void;
  deleteFrameworkVolume: (novelId: string, volumeId: string) => void;

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
      githubConfig: {
        token: '',
        owner: '',
        repo: '',
      },

      setApiConfig: (config) =>
        set((s) => ({ apiConfig: { ...s.apiConfig, ...config } })),
      setGithubConfig: (config) =>
        set((s) => ({ githubConfig: { ...s.githubConfig, ...config } })),

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
          novelFramework: null,
          pipelineStage: 'outline' as PipelineStage,
          pipelineCompleted: [] as PipelineStage[],
          protagonist: null,
          timeline: [],
          worldBuildingText: '',
          globalMemory: { mainPlot: '', characters: '', location: '', notes: '' },
          chapters: [],
          volumeChapters: {},
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
              summary: oc.coreConflict || '',
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
              pipelineStage: 'drafting' as PipelineStage,
              pipelineCompleted: ['outline'] as PipelineStage[],
              chapters,
              updatedAt: Date.now(),
            };
          }),
        })),

      // 算力解耦·精简大纲写入 — 只建章节 + 存大纲数据
      // protagonist/description/timeline/worldBuildingText 全部留空
      // → 左侧边栏仅显示章节目录，右侧圣经/角色看板保持空白
      setSlimOutline: (novelId, outline) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            const chapters: Chapter[] = outline.chapters.map((oc, i) => ({
              id: generateId(),
              novelId,
              title: oc.title,
              summary: oc.coreConflict || '',
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
              // 侧边栏字段全部留空 — 只有 TOC 被填充
              description: '',
              protagonist: null,
              timeline: [],
              worldBuildingText: '',
              status: 'writing' as const,
              pipelineStage: 'drafting' as PipelineStage,
              pipelineCompleted: ['outline'] as PipelineStage[],
              chapters,
              updatedAt: Date.now(),
            };
          }),
        })),

      setNovelFramework: (novelId, framework) =>
        set((s) => ({
          novels: s.novels.map((n) =>
            n.id === novelId ? { ...n, novelFramework: framework, updatedAt: Date.now() } : n
          ),
        })),

      setVolumeChapters: (novelId, volumeId, chapters) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            const prev = n.volumeChapters ?? {};
            return { ...n, volumeChapters: { ...prev, [volumeId]: chapters }, updatedAt: Date.now() };
          }),
        })),

      setPipelineStage: (novelId, stage) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            const completed = n.pipelineCompleted.includes(stage)
              ? n.pipelineCompleted
              : [...n.pipelineCompleted, stage];
            return { ...n, pipelineStage: stage, pipelineCompleted: completed, updatedAt: Date.now() };
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
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            const base = n.globalMemory ?? { mainPlot: '', characters: '', location: '', notes: '' };
            return { ...n, globalMemory: { ...base, ...memory }, updatedAt: Date.now() };
          }),
        })),

      awakenWorldBibleFromFramework: (novelId) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId) return n;
            const fw = n.novelFramework;
            if (!fw) return n;

            const now = Date.now();

            // 1. Protagonist from framework
            const fp = fw.protagonist;
            const protagonist: Protagonist = {
              name: fp.name || '未知',
              gender: fp.gender || '',
              age: fp.age || '',
              personality: fp.personality || '',
              background: fp.background || '',
              abilities: fp.abilities || '',
              goals: fp.goals || '',
            };

            // 2. Characters from importantCharacters + opponents + finalBoss
            const frameworkChars = [
              ...(fw.importantCharacters || []),
              ...(fw.opponents || []),
              fw.finalBoss,
            ].filter(Boolean);
            const characters: Character[] = frameworkChars.map((fc) => ({
              id: generateId(),
              novelId,
              name: fc.name || '未知',
              role: fc.role || 'supporting',
              description: [fc.personality, fc.background, fc.abilities, fc.goals, fc.weaknesses]
                .filter(Boolean).join('\n'),
              traits: (fc.personality || '').split(/[、，,]/).filter(Boolean).map((t) => t.trim()),
              relationships: [],
              createdAt: now,
            }));

            // 3. World settings from framework
            const ws = fw.worldSetting;
            const worldSettings: WorldSetting[] = [];
            if (ws.worldName) {
              worldSettings.push({ id: generateId(), novelId, category: 'geography', title: '世界名称', content: `${ws.worldName}（${ws.worldType || ''}）`, createdAt: now });
            }
            if (ws.eraBackground) {
              worldSettings.push({ id: generateId(), novelId, category: 'history', title: '时代背景', content: ws.eraBackground, createdAt: now });
            }
            if (ws.worldRules) {
              worldSettings.push({ id: generateId(), novelId, category: 'magic', title: '核心世界规则', content: ws.worldRules, createdAt: now });
            }
            if (ws.mapEnvironment) {
              worldSettings.push({ id: generateId(), novelId, category: 'geography', title: '地理环境', content: ws.mapEnvironment, createdAt: now });
            }
            (fw.factions || []).forEach((f) => {
              worldSettings.push({
                id: generateId(), novelId, category: 'faction', title: f.name,
                content: `背景：${f.background || ''}\n目标：${f.goal || ''}\n特征：${f.characteristics || ''}\n对主角态度：${f.attitudeToProtagonist || ''}`,
                createdAt: now,
              });
            });
            const as = fw.abilitySystem;
            if (as.systemName) {
              worldSettings.push({
                id: generateId(), novelId, category: 'magic', title: as.systemName,
                content: `${as.description || ''}\n等级：${(as.levels || []).join(' → ')}\n规则：${as.rules || ''}\n代价：${as.costs || ''}`,
                createdAt: now,
              });
            }

            // 4. Timeline from framework
            const timeline: TimelineNode[] = (fw.timeline || []).map((t) => ({
              phase: t.phase || '',
              event: t.event || '',
              description: t.description || '',
            }));

            // 5. World building text from framework
            const worldBuildingText = [
              `【世界】${ws.worldName}（${ws.worldType || ''}）`,
              `【时代】${ws.eraBackground || ''}`,
              `【规则】${ws.worldRules || ''}`,
              `【地理】${ws.mapEnvironment || ''}`,
              '',
              '【势力分布】',
              ...(fw.factions || []).map((f) => `- ${f.name}：${f.goal || ''}（${f.attitudeToProtagonist || ''}）`),
              '',
              `【能力体系】${as.systemName || ''}`,
              ...(as.levels || []).map((l, i) => `${i + 1}. ${l}`),
              `规则：${as.rules || ''}`,
              `代价：${as.costs || ''}`,
            ].join('\n');

            return {
              ...n,
              protagonist,
              description: fw.synopsis || n.description,
              timeline,
              worldBuildingText,
              characters,
              worldSettings,
              pipelineStage: 'characters' as PipelineStage,
              pipelineCompleted: ([...new Set([...n.pipelineCompleted, 'outline' as PipelineStage, 'characters' as PipelineStage])] as PipelineStage[]),
              updatedAt: now,
            };
          }),
        })),

      addFrameworkVolume: (novelId, volume) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId || !n.novelFramework) return n;
            const fw = { ...n.novelFramework, volumes: [...n.novelFramework.volumes, volume], lastModifiedAt: Date.now() };
            return { ...n, novelFramework: fw, chapterCount: Math.max(n.chapterCount, volume.chapterRange[1]), updatedAt: Date.now() };
          }),
        })),

      deleteFrameworkVolume: (novelId, volumeId) =>
        set((s) => ({
          novels: s.novels.map((n) => {
            if (n.id !== novelId || !n.novelFramework) return n;
            const fw = { ...n.novelFramework, volumes: n.novelFramework.volumes.filter((v) => v.id !== volumeId), lastModifiedAt: Date.now() };
            return { ...n, novelFramework: fw, updatedAt: Date.now() };
          }),
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
