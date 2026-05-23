import type { WriteMode } from '@/services/writing-framework';
import type { NovelFramework } from './novel-framework';
export type { NovelFramework, FrameworkVolume } from './novel-framework';
export { createEmptyFramework } from './novel-framework';

export interface Protagonist {
  name: string;
  gender: string;
  age: string;
  personality: string;
  background: string;
  abilities: string;
  goals: string;
}

export interface TimelineNode {
  phase: string;
  event: string;
  description: string;
}

// ═══════════════════════════════════════════════════════════
// 单章小框架 — 信息差驱动章节大纲
// ═══════════════════════════════════════════════════════════
export interface OutlineChapterPlotFlow {
  hook: string;       // 黄金开篇300字 — 反常细节/突发危机
  pressure: string;   // 矛盾升级 — 逼向绝境的过程
  climax: string;     // 最高燃点名场面
}

export interface OutlineChapterInfoAsymmetry {
  godView: string;    // 上帝视角 — 读者窥探到的核心阴谋
  blindSpot: string;  // 认知盲区 — 主角因何做出错误判断
}

export interface OutlineChapterUIMetrics {
  timeDimension: string;        // 时态锚定 → DeepSeek 记忆面板
  tokenFingerprint: string;     // 风格指纹 → DeepSeek 记忆面板
  situationalInference: string; // 场景张力 → DeepSeek 记忆面板
}

export interface OutlineChapter {
  id: string;
  title: string;
  wordCountBudget: number;
  coreConflict: string;                    // 针尖对麦芒的核心冲突，限80字
  plotFlow: OutlineChapterPlotFlow;
  informationAsymmetry: OutlineChapterInfoAsymmetry;
  soulStage: string;                       // 自适应：建立信心/信念动摇/彻底毁灭/浴火重生
  visualSymbol: string;                    // 贯穿全章的核心画面隐喻
  industryLore: string[];                  // 行业垂直术语/职业黑话 ×3
  cliffhangerPoint: string;               // 断崖卡点 — 在哪个致命瞬间戛然而止
  uiMetrics: OutlineChapterUIMetrics;
}

export interface GenerationOutline {
  genre: string;
  subGenre: string;
  title: string;
  description: string;
  synopsis: string;
  protagonist: Protagonist;
  worldBuilding: string;
  outline: string;
  timeline: TimelineNode[];
  chapters: OutlineChapter[];
}

export type GrowthStageId = 1 | 2 | 3 | 4 | 5;

export interface GrowthRecord {
  chapterIndex: number;
  stage: GrowthStageId;
  stageName: string;
  psychologicalChange: string;
  timelineNode: string;
}

export interface Character {
  id: string;
  novelId: string;
  name: string;
  role: string;
  description: string;
  traits: string[];
  relationships: { targetId: string; description: string }[];
  createdAt: number;
}

export interface WorldSetting {
  id: string;
  novelId: string;
  category: 'geography' | 'culture' | 'magic' | 'technology' | 'history' | 'faction' | 'other';
  title: string;
  content: string;
  createdAt: number;
}

export interface ChapterMemoryUpdate {
  characterStates: string;
  keyEvents: string;
  nextDirections: string[];
}

export interface Chapter {
  id: string;
  novelId: string;
  title: string;
  summary: string;
  content: string;
  order: number;
  status: 'draft' | 'writing' | 'completed';
  wordCount: number;
  notes: string;
  growthRecord?: GrowthRecord;
  memoryUpdate?: ChapterMemoryUpdate;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryEntry {
  id: string;
  novelId: string;
  chapterId: string;
  summary: string;
  keyEvents: string[];
  characterDevelopments: string[];
  createdAt: number;
}

// ═══════════════════════════════════════════════════════════
// 篇内自定义细化章节 — 局部算力推演结果
// ═══════════════════════════════════════════════════════════
export interface VolumeChapter {
  id: string;
  chapterTitle: string;
  microPlot: string;
  cliffhangerPoint: string;
}

// ═══════════════════════════════════════════════════════════
// Story Engine Pipeline FSM
// ═══════════════════════════════════════════════════════════
export const PIPELINE_STAGES = [
  { id: 'outline' as const, label: '大纲构思', icon: 'Layout', desc: '确定故事骨架与章节脉络' },
  { id: 'characters' as const, label: '角色塑造', icon: 'Users', desc: '构建主角弧光与配角关系网' },
  { id: 'beats' as const, label: '节拍编排', icon: 'GanttChart', desc: '铺设每章关键剧情节拍' },
  { id: 'drafting' as const, label: '正稿写作', icon: 'Pen', desc: '逐章展开叙事流' },
  { id: 'polish' as const, label: '润色打磨', icon: 'Sparkles', desc: '迭代修改与文笔提升' },
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number]['id'];

export interface PipelineState {
  current: PipelineStage;
  prerequisites: Partial<Record<PipelineStage, boolean>>;
  completed: PipelineStage[];
}

// ═══════════════════════════════════════════════════════════
// Left Sidebar: dual-layer topology
// ═══════════════════════════════════════════════════════════
export type LeftPanelLayer = 'projects' | 'knowledge';
export type KnowledgeBaseTab = 'outline' | 'characters' | 'worldbuilding';

// ═══════════════════════════════════════════════════════════
// Right Panel: AI Response Card Stream
// ═══════════════════════════════════════════════════════════
export type AICardType = 'generated-text' | 'rewrite' | 'sensory' | 'vote-request' | 'continue';

export interface AICard {
  id: string;
  type: AICardType;
  title: string;
  content: string;
  sourceAction: string;
  chapterId: string;
  timestamp: number;
  applied: boolean;
  variant?: 'compare' | 'draft';
  compareWith?: string; // original text for comparison
}

export type GenerationPhase = 'idle' | 'outline-generating' | 'outline-review' | 'writing';

export interface ApiConfig {
  key: string;
  endpoint?: string;
  model: string;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export interface Novel {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  coverColor: string;
  description: string;
  genre: string;
  status: 'planning' | 'writing' | 'completed' | 'paused';
  targetWords: number;
  // Writing framework
  writeMode: WriteMode;
  tropeTag: string;
  inspirationText: string;
  chapterCount: number;
  generationPhase: GenerationPhase;
  generationOutline: GenerationOutline | null;
  protagonist: Protagonist | null;
  timeline: TimelineNode[];
  worldBuildingText: string;
  // Pipeline
  pipelineStage: PipelineStage;
  pipelineCompleted: PipelineStage[];
  // Full novel framework (12 parts)
  novelFramework: NovelFramework | null;
  // Memory tracking
  globalMemory: {
    mainPlot: string;
    characters: string;
    location: string;
    notes: string;
  };
  // Content
  chapters: Chapter[];
  volumeChapters: Record<string, VolumeChapter[]>;
  characters: Character[];
  worldSettings: WorldSetting[];
  memories: MemoryEntry[];
  createdAt: number;
  updatedAt: number;
}

export type EditorMode = 'inspiration' | 'chapter-edit' | 'framework';
