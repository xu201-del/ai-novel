// ═══════════════════════════════════════════════════════════
// 篇内自定义细化章节 — 局部算力推演 Prompt 与 API 适配器
// ═══════════════════════════════════════════════════════════
import { fetchAI, parseJSONFromText } from './api';
import type { ApiConfig } from '@/types';
import type { FrameworkVolume } from '@/types/novel-framework';
import { generateId } from '@/lib/utils';
import type { VolumeChapter } from '@/types';

export function buildVolumeDeducePrompt(
  inspiration: string,
  tropeTag: string,
  volume: FrameworkVolume,
  count: number,
): string {
  const genreHint = tropeTag
    ? `流派类型：${tropeTag}（章节标题需精准贴合该流派的读者期待感）`
    : '流派类型：请根据灵感文本自行判断最具商业价值的网文流派';

  return `# 角色设定
你是中国顶级网文平台的"金榜大纲策划师"——你拆解的章节目录能让读者在番茄小说上逐章追读到凌晨三点。你的章名有钩子感，剧情概述让人一眼就想点进去。

# 核心任务
为当前【篇】拆解出恰好 ${count} 个章节，每个章节必须是一个独立的叙事钩子。

# 📖 小说核心灵感
${inspiration || '（未提供，请根据篇信息自由发挥）'}

# 🏷️ 流派定位
${genreHint}

# 📗 当前篇信息
- **篇名**：${volume.title}
- **叙事弧线**：${volume.arc}
- **篇章主题**：${volume.theme}
- **篇章概要**：${volume.synopsis}
- **核心冲突**：${volume.mainConflict}
- **篇末高潮**：${volume.volumeEnding}
- **章节范围**：第 ${volume.chapterRange[0]} 章 ~ 第 ${volume.chapterRange[1]} 章

# 🛑 拆解铁律
1. 每个章名必须自带信息差钩子——读者看到名字就产生"这是怎么回事？"的好奇心
2. 章节剧情必须逐章递进——前一章的结尾埋下后一章的动机
3. 篇末最后 ${Math.min(3, count)} 章必须加速推向高潮，制造篇末超燃断崖
4. 章名风格参考：拒绝"第X章"式平淡命名；必须有动作、悬念、反转、爽感中的至少两种情绪抓手

# 📤 输出格式
返回恰好 ${count} 个元素的纯净 JSON 数组。字段严格如下：
[
  {
    "chapterTitle": "带有流派质感的章/节名称（15字以内，拒绝平淡标题）",
    "microPlot": "本章极简剧情（50字以内，点明核心冲突推进点与情绪峰值）",
    "cliffhangerPoint": "本章断崖结尾点（30字以内，描述在哪个致命瞬间戛然而止，让读者必须点开下一章）"
  }
]

仅输出 JSON 数组，不要任何说明文字。`;
}

export async function deduceChapters(
  apiConfig: ApiConfig,
  inspiration: string,
  tropeTag: string,
  volume: FrameworkVolume,
  count: number,
  signal?: AbortSignal,
): Promise<VolumeChapter[]> {
  const prompt = buildVolumeDeducePrompt(inspiration, tropeTag, volume, count);
  const raw = await fetchAI({ prompt, maxTokens: 4096, apiConfig, signal });
  const parsed = parseJSONFromText(raw);

  if (!Array.isArray(parsed)) {
    const fallback = tryHeuristicParse(raw, count, volume.id);
    if (fallback) return fallback;
    throw new Error('AI 返回格式异常，请重试');
  }

  return parsed.slice(0, count).map((item: Record<string, unknown>, i: number) => ({
    id: generateId(),
    chapterTitle: String(item.chapterTitle || `第${volume.chapterRange[0] + i}章`).slice(0, 50),
    microPlot: String(item.microPlot || '').slice(0, 100),
    cliffhangerPoint: String(item.cliffhangerPoint || '').slice(0, 60),
  }));
}

function tryHeuristicParse(raw: string, count: number, volumeId: string): VolumeChapter[] | null {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 4 && !l.startsWith('//') && !l.startsWith('#'));

  const chapters: VolumeChapter[] = [];
  for (const line of lines) {
    const match = line.match(/^[\d.]+[、.\s]*[「「《]?(.{2,40})[」」》]?\s*[-–—:\s]+(.{4,100})/);
    if (match) {
      chapters.push({
        id: generateId(),
        chapterTitle: match[1].slice(0, 50),
        microPlot: match[2].slice(0, 100),
        cliffhangerPoint: '',
      });
    }
  }

  if (chapters.length >= Math.max(1, count * 0.5)) return chapters.slice(0, count);
  return null;
}

// ═══════════════════════════════════════════════════════════
// AI 生成新篇 — 基于已有框架扩展叙事弧线
// ═══════════════════════════════════════════════════════════
import type { NovelFramework } from '@/types/novel-framework';

export function buildVolumeGeneratePrompt(
  framework: NovelFramework,
  userHint: string,
): string {
  const existingVolumes = framework.volumes || [];
  const lastVol = existingVolumes[existingVolumes.length - 1];
  const nextVolNum = existingVolumes.length + 1;
  const nextChapterStart = lastVol ? lastVol.chapterRange[1] + 1 : 1;
  const nextChapterEnd = nextChapterStart + 11; // default 12 chapters

  const volumeList = existingVolumes.map((v) =>
    `- ${v.title}（第${v.chapterRange[0]}-${v.chapterRange[1]}章）：${v.theme} | 核心冲突：${v.mainConflict} | 篇末：${v.volumeEnding}`
  ).join('\n');

  return `# 角色设定
你是中国顶级网文平台的"金榜大纲策划师"——你擅长为长篇网文设计宏观叙事弧线。

# 核心任务
基于已有小说框架，为下一"篇"（Volume）生成完整的篇级大纲。篇是宏观叙事单元，每篇约12章。

# 📖 小说信息
- **书名**：${framework.bookTitle}
- **类型**：${framework.bookType}（${framework.keywords || ''}）
- **简介**：${framework.oneLiner}
- **主角**：${framework.protagonist.name}（${framework.protagonist.personality?.slice(0, 60) || ''}）
- **能力**：${framework.protagonist.abilities || ''}

# 📗 已有篇目
${volumeList || '（尚无篇目，这是第一篇）'}

# 🌍 世界观
${framework.worldSetting.worldName}（${framework.worldSetting.worldType}）
规则：${framework.worldSetting.worldRules?.slice(0, 120) || ''}

# 📖 主线剧情
${framework.plots.mainPlot?.slice(0, 150) || ''}

# 🎯 剧情阶段
${framework.plotStructure.development?.slice(0, 120) || ''}

# 💡 用户补充
${userHint || '请根据已有框架自然延伸下一篇章'}

# 🛑 要求
1. 新篇必须承接上一篇的篇末高潮，自然过渡到新的叙事阶段
2. 核心冲突必须与主线剧情相关，不能凭空出现
3. 篇末大结局必须是一个里程碑式转折，为再下一篇留下钩子
4. 篇名要有网文传播力（10字以内）

# 📤 输出格式
返回纯净 JSON 对象（不要 markdown）：
{
  "title": "篇名（10字以内）",
  "arc": "五段弧线阶段（如：承接/转折/升级/高潮/收束）",
  "theme": "本篇章主题（20字以内）",
  "synopsis": "本篇章概要（60-100字）",
  "mainConflict": "本篇章核心冲突（50-80字）",
  "volumeEnding": "本篇章大结局/最高潮（50-80字）"
}`;
}

export async function generateNextVolume(
  apiConfig: ApiConfig,
  framework: NovelFramework,
  userHint: string,
  signal?: AbortSignal,
): Promise<Omit<FrameworkVolume, 'id' | 'chapterRange'>> {
  const prompt = buildVolumeGeneratePrompt(framework, userHint);
  const raw = await fetchAI({ prompt, maxTokens: 2048, apiConfig, signal });
  const parsed = parseJSONFromText(raw);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI 返回格式异常，请重试');
  }

  const volData = parsed as Record<string, unknown>;
  return {
    title: String(volData.title || `第${(framework.volumes?.length || 0) + 1}篇`).slice(0, 20),
    arc: String(volData.arc || '发展').slice(0, 20),
    theme: String(volData.theme || '').slice(0, 30),
    synopsis: String(volData.synopsis || '').slice(0, 120),
    mainConflict: String(volData.mainConflict || '').slice(0, 100),
    volumeEnding: String(volData.volumeEnding || '').slice(0, 100),
  };
}
