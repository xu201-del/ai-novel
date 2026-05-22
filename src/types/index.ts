import type { WriteMode, TROPE_TAGS } from '@/services/writing-framework';

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

export interface OutlineChapter {
  title: string;
  summary: string;
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

export type GenerationPhase = 'idle' | 'outline-generating' | 'outline-review' | 'writing';

export interface ApiConfig {
  key: string;
  endpoint?: string;
  model: string;
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
  // Memory tracking
  globalMemory: {
    mainPlot: string;
    characters: string;
    location: string;
    notes: string;
  };
  // Content
  chapters: Chapter[];
  characters: Character[];
  worldSettings: WorldSetting[];
  memories: MemoryEntry[];
  createdAt: number;
  updatedAt: number;
}

export type EditorMode = 'inspiration' | 'chapter-edit';
export type RightPanelTab = 'ai-assistant' | 'story-bible' | 'memory' | 'outline';
