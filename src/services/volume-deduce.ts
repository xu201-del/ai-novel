// ═══════════════════════════════════════════════════════════
// 篇章裂变引擎 — 篇级大纲 → 章节目录骨架 同步推演
// ═══════════════════════════════════════════════════════════
import { fetchAI, parseJSONFromText } from './api';
import type { ApiConfig } from '@/types';
import type { FrameworkVolume } from '@/types/novel-framework';
import { generateId } from '@/lib/utils';
import type { VolumeChapter } from '@/types';

export interface DeduceContext {
  bookTitle: string;
  expectedWords: string;
  tags: string;
  inspiration: string;
}

export function buildVolumeDeducePrompt(
  ctx: DeduceContext,
  volume: FrameworkVolume,
  count: number,
): string {
  return `# Role: InkFlow Pro 顶级网络小说架构师 (篇章裂变引擎)

## Task
根据用户的初始灵感和赛道标签，进行【篇级大纲】与【章节目录骨架】的同步并发解耦设计。

## Operational Constraints
1. **宏观控卷（Volume-Nested）**：必须采用"篇/卷（Volume）"作为最顶层的数据层级。每一篇必须具备明确的【核心冲突】和【卷末大结局走向】。
2. **微观控章（Chapter Fingerprint）**：
   - Show, Don't Tell 铁律：梗概必须充斥具体的动作、线索、道具或反转，严禁出现"主角展现了聪明才智"、"双方发生激战"等干瘪总结。
   - 断崖式结尾引擎（Cliffhanger Point）：每章结尾必须卡在危机引爆、秘密揭开的前一秒，疯狂拉动读者追读欲望。

## Inputs
<novel_meta>
- 书名: ${ctx.bookTitle}
- 预期总字数: ${ctx.expectedWords}
- 赛道标签: ${ctx.tags}
- 初始创作灵感: ${ctx.inspiration}
</novel_meta>

<generation_target>
- 目标推演篇名: ${volume.title}
- 本篇核心冲突范围: ${volume.mainConflict}
- 目标生成章数: ${count}
</generation_target>

## Output Format Specification
必须严格返回以下 JSON 格式的数组，不要包含任何 Markdown 标记（不要用 \`\`\`json 包裹）、不要包含任何前后废话导言。

[
  {
    "chapterTitle": "第 X 章：[4-6字极具网文张力的章名]",
    "microPlot": "[150字左右的精准单章梗概，包含具体事件、动作流、信息差演进]",
    "cliffhangerPoint": "[30字内的钩子，卡在剧情情绪最高潮瞬间]",
    "wordCountPreset": 3000
  }
]

## Execution
立即开始为第 "${volume.title}" 推演精确的 ${count} 个章节大纲：`;
}

export async function deduceChapters(
  apiConfig: ApiConfig,
  ctx: DeduceContext,
  volume: FrameworkVolume,
  count: number,
  signal?: AbortSignal,
): Promise<VolumeChapter[]> {
  const prompt = buildVolumeDeducePrompt(ctx, volume, count);
  const raw = await fetchAI({ prompt, maxTokens: 8192, apiConfig, signal });
  const parsed = parseJSONFromText(raw);

  if (!Array.isArray(parsed)) {
    const fallback = tryHeuristicParse(raw, count);
    if (fallback) return fallback;
    throw new Error('AI 返回格式异常，请重试');
  }

  return parsed.slice(0, count).map((item: Record<string, unknown>, i: number) => ({
    id: generateId(),
    chapterTitle: String(item.chapterTitle || `第${i + 1}章`).slice(0, 60),
    microPlot: String(item.microPlot || '').slice(0, 200),
    cliffhangerPoint: String(item.cliffhangerPoint || '').slice(0, 60),
    wordCountPreset: typeof item.wordCountPreset === 'number' ? item.wordCountPreset : 3000,
  }));
}

function tryHeuristicParse(raw: string, count: number): VolumeChapter[] | null {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 4 && !l.startsWith('//') && !l.startsWith('#'));

  const chapters: VolumeChapter[] = [];
  for (const line of lines) {
    const match = line.match(/^[\d.]+[、.\s]*[「「《]?(.{2,60})[」」》]?\s*[-–—:\s]+(.{4,200})/);
    if (match) {
      chapters.push({
        id: generateId(),
        chapterTitle: match[1].slice(0, 60),
        microPlot: match[2].slice(0, 200),
        cliffhangerPoint: '',
        wordCountPreset: 3000,
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
