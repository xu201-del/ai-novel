// ═══════════════════════════════════════════════════════════
// 完整小说框架 — 12 部分 + 卷/篇结构
// 用于 AI 生成或手动填写，作为章节写作的核心上下文
// ═══════════════════════════════════════════════════════════

// ── 篇结构 — 篇为宏观叙事单元，章为子节点 ──
export interface FrameworkVolume {
  id: string;                    // vol-01
  title: string;                 // 篇标题，如"觉醒篇""征伐篇"
  arc: string;                   // 对应五段弧线阶段
  chapterRange: [number, number]; // 起止章节 [1, 12]
  theme: string;                 // 本篇章主题（一句话，20字以内）
  synopsis: string;              // 本篇章概要（60-100字）
  mainConflict: string;          // 本篇章核心冲突（50-80字）
  volumeEnding: string;          // 本篇章大结局/最高潮（50-80字）
}

// ── Part 1: 世界背景设定 ──
export interface FrameworkWorldSetting {
  worldName: string;        // 世界名称
  worldType: string;        // 世界类型（修真/科幻/末世/异界…）
  eraBackground: string;    // 时代背景
  worldRules: string;       // 核心世界规则（反直觉的特殊法则）
  mapEnvironment: string;   // 地图与环境描述
}

// ── Part 2: 势力设定 ──
export interface FrameworkFaction {
  name: string;
  background: string;
  goal: string;
  characteristics: string;
  attitudeToProtagonist: string;
}

// ── Part 3: 角色设定 ──
export interface FrameworkCharacter {
  name: string;
  role: 'protagonist' | 'important-supporting' | 'supporting' | 'opponent' | 'boss';
  gender: string;
  age: string;
  personality: string;
  background: string;
  abilities: string;
  goals: string;
  appearance?: string;
  weaknesses?: string;      // 致命缺陷
}

// ── Part 4: 人物关系 ──
export interface FrameworkRelationship {
  characters: [string, string];
  type: string;             // 血缘/敌对/同盟/师徒/恋人/利用…
  description: string;
  stages: string;           // 关系发展的阶段描述
}

// ── Part 5: 能力/系统设定 ──
export interface FrameworkAbilitySystem {
  systemName: string;
  description: string;
  levels: string[];         // 等级序列
  rules: string;            // 核心规则
  costs: string;            // 代价/限制（必须有的代价）
  specialAbilities: string[];
}

// ── Part 6: 道具设定 ──
export interface FrameworkItem {
  name: string;
  type: string;
  description: string;
  abilities: string;
  significance: string;     // 在剧情中的关键作用
  owner: string;
}

// ── Part 7: 主线与支线 ──
export interface FrameworkPlots {
  mainPlot: string;         // 主线剧情概述
  subPlots: string[];       // 支线列表
}

// ── Part 8: 剧情结构 ──
export interface FrameworkPlotStructure {
  opening: string;          // 开端
  development: string;      // 发展
  climax: string;           // 高潮
  ending: string;           // 结局
}

// ── Part 9: 时间线 ──
export interface FrameworkTimelineEvent {
  phase: string;
  event: string;
  description: string;
  chapters: string;         // 对应章节范围
}

// ── Part 10: 章节拆分 ──
export interface FrameworkChapterBreakdown {
  chapterNumber: number;
  title: string;
  mainPlot: string;
  purpose: string;
  keyConflict: string;
  foreshadowing: string;    // 本章埋下的伏笔
}

// ── Part 11: 伏笔系统 ──
export interface FrameworkForeshadowing {
  id: string;
  plantedChapter: number;
  description: string;
  payoffChapter: number;
  status: 'planted' | 'revealed';
  impact: string;           // 揭露时的影响
}

// ── Part 12: 事件库 ──
export interface FrameworkEvent {
  type: string;             // 战斗/社交/探索/转折/日常…
  description: string;
  possibleChapters: number[];
  impact: string;           // 对剧情的影响
  involvedCharacters: string[];
}

// ═══════════════════════════════════════════════════════════
// 顶层聚合
// ═══════════════════════════════════════════════════════════
export interface NovelFramework {
  // Meta
  bookTitle: string;
  bookType: string;         // 类型
  estimatedWords: string;   // 预计字数
  keywords: string;         // 关键词
  oneLiner: string;         // 一句话简介
  synopsis: string;         // 内容简介（250字）

  // Volumes (auto-computed or AI-generated)
  volumes: FrameworkVolume[];

  // 12 Parts
  worldSetting: FrameworkWorldSetting;
  factions: FrameworkFaction[];
  protagonist: FrameworkCharacter;
  importantCharacters: FrameworkCharacter[];
  opponents: FrameworkCharacter[];
  finalBoss: FrameworkCharacter;
  relationships: FrameworkRelationship[];
  abilitySystem: FrameworkAbilitySystem;
  items: FrameworkItem[];
  plots: FrameworkPlots;
  plotStructure: FrameworkPlotStructure;
  timeline: FrameworkTimelineEvent[];
  chapterBreakdown: FrameworkChapterBreakdown[];
  foreshadowing: FrameworkForeshadowing[];
  eventLibrary: FrameworkEvent[];

  // Metadata
  generatedAt: number;
  lastModifiedAt: number;
}

// ═══════════════════════════════════════════════════════════
// 默认空框架 — 用于手动填写场景
// ═══════════════════════════════════════════════════════════
export function createEmptyFramework(bookTitle = ''): NovelFramework {
  return {
    bookTitle,
    bookType: '',
    estimatedWords: '',
    keywords: '',
    oneLiner: '',
    synopsis: '',
    volumes: [],
    worldSetting: { worldName: '', worldType: '', eraBackground: '', worldRules: '', mapEnvironment: '' },
    factions: [],
    protagonist: { name: '', role: 'protagonist', gender: '', age: '', personality: '', background: '', abilities: '', goals: '' },
    importantCharacters: [],
    opponents: [],
    finalBoss: { name: '', role: 'boss', gender: '', age: '', personality: '', background: '', abilities: '', goals: '' },
    relationships: [],
    abilitySystem: { systemName: '', description: '', levels: [], rules: '', costs: '', specialAbilities: [] },
    items: [],
    plots: { mainPlot: '', subPlots: [] },
    plotStructure: { opening: '', development: '', climax: '', ending: '' },
    timeline: [],
    chapterBreakdown: [],
    foreshadowing: [],
    eventLibrary: [],
    generatedAt: Date.now(),
    lastModifiedAt: Date.now(),
  };
}
