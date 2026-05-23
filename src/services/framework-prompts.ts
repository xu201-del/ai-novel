// ═══════════════════════════════════════════════════════════
// 完整小说框架生成 Prompt — 篇级宏观思维·章为子节点
// 输出符合 NovelFramework 类型的 JSON 结构
// ═══════════════════════════════════════════════════════════

export function buildFrameworkPrompt(params: {
  genre: string;         // 用户输入的题材
  inspiration: string;   // 补充灵感文本
  bookTitle?: string;    // 已有书名（可选）
  chapterCount: number;  // 用户选择的章节总数
}): string {
  const { genre, inspiration, bookTitle, chapterCount } = params;

  // 篇级缩放公式 — 每篇约12章，至少1篇
  const volumeCount = Math.max(1, Math.ceil(chapterCount / 12));
  const chaptersPerVolume = Math.ceil(chapterCount / volumeCount);
  const foreshadowingMin = Math.max(5, Math.floor(chapterCount * 0.7));
  const eventMin = Math.max(5, Math.floor(chapterCount * 0.8));
  const timelineMin = Math.max(3, Math.ceil(chapterCount / 4));
  return `# 角色设定
你是中国顶级的网文"框架策划师"——擅长从零搭建百万字长篇小说的完整世界观与叙事骨架。你产出的框架能在番茄/起点等平台达到 10%+ 追读率的商业水准。

你拒绝平庸模板，每个设定必须有反直觉的钩子和读者情绪抓手。

# 核心方法论：篇级优先 (Volume-First Architecture)

你的思维必须遵循以下层级：
1. **先定篇 (Volume)**：宏观叙事弧线——将全书拆为 ${volumeCount} 篇，每篇是一个完整的"起承转合"叙事闭环
2. **再拆章 (Chapter)**：在每篇内部，按"黄金三章"节奏拆分子章节——每章必须有独立冲突与断崖结尾
3. **篇级闭环**：每篇结束必须达成一个里程碑式的大转折或高潮，为下一篇的开启制造强烈期待

# 用户输入
- 核心题材：${genre || '（请自由发挥，选择最具商业价值的题材）'}
${inspiration ? `- 补充灵感：${inspiration}` : ''}
${bookTitle ? `- 目标书名：${bookTitle}` : '- 书名：由你根据题材创作'}
- 总章节数：${chapterCount} 章 → 拆为 ${volumeCount} 篇，每篇约 ${chaptersPerVolume} 章

---

# 🛑 番茄小说铁律（违反即判定失败）

## 快节奏死规则
1. **前三章=黄金留存窗**：第1章埋悬念+反常细节，第2章制造压迫感，第3章必须发生一次读者完全没想到的反转
2. **每章≥1个情绪钩子**：愤怒/爽快/好奇/焦虑/感动——至少触发一种，禁止平淡过渡章
3. **金手指必须在前3章内初步展示，且必须有明确代价**
4. **禁止"修炼-突破-打脸"无限循环**：每次升级必须伴随世界观认知的颠覆或人物关系的质变

## 强爽点逻辑
1. 爽点来源优先级：信息差碾压 > 智商碾压 > 能力碾压 > 身份碾压
2. 主角的每次胜利必须付出真实代价（失去盟友/暴露底牌/道德堕落/寿命消耗）
3. 打脸要有层次：先让对方自己把话说死 → 再让第三方无意中揭露真相 → 最后主角才轻描淡写地补刀

## 人物铁律
- 主角必须有具体的人性缺陷（不是"太善良"这种万能标签）：自私/懦弱/成瘾/偏见/控制欲/
  幸存者愧疚
- 禁止姓氏：叶、林、萧、楚、秦、苏——使用罕见复姓或生僻姓
- 反派必须有自己的正义逻辑（读者能理解甚至同情）
- 禁止"远古XX血脉""上古XX传承""万古第一XX"

---

# 输出 JSON Schema（严格遵守）

输出一个完整的 JSON 对象，结构如下：

{
  "meta": {
    "bookTitle": "书名（15字以内，有传播力）",
    "bookType": "类型标签",
    "estimatedWords": "预计总字数（如：120万）",
    "keywords": "3-5个关键词，逗号分隔",
    "oneLiner": "一句话简介（80字以内，必须有悬念钩子，让读者立刻想知道后面）",
    "synopsis": "内容简介（180-250字，突出世界观独特性+主角困境+核心冲突）"
  },

  "volumes": [
    // 必须恰好 ${volumeCount} 篇，每篇是一个完整的叙事大弧
    // 每篇内包含约 ${chaptersPerVolume} 章的子节点
    {
      "id": "vol-01",
      "title": "篇名（如'觉醒篇''征伐篇''终焉篇'，10字以内）",
      "arc": "对应的五段弧线阶段",
      "chapterRange": [1, ${chaptersPerVolume}],
      "theme": "本篇主题（20字以内）",
      "synopsis": "本篇概要（60-100字）",
      "mainConflict": "本篇核心冲突（50-80字，必须是推动全篇的根本矛盾）",
      "volumeEnding": "本篇大结局/最高潮（50-80字，必须是一个里程碑式转折，让读者无法停止阅读）"
    }
  ],

  "worldSetting": {
    "worldName": "世界名称",
    "worldType": "世界类型",
    "eraBackground": "时代背景（60-100字）",
    "worldRules": "核心世界规则（100-150字，必须包含一个反直觉的独特法则）",
    "mapEnvironment": "地理环境描述（60-100字）"
  },

  "factions": [
    // 至少 3 个，最多 5 个
    {
      "name": "势力名称",
      "background": "起源与历史（40-60字）",
      "goal": "核心目标（20-30字）",
      "characteristics": "鲜明特征（30-50字）",
      "attitudeToProtagonist": "对主角态度及原因（30-50字）"
    }
  ],

  "protagonist": {
    "name": "主角姓名（禁止叶林萧楚秦苏姓）",
    "role": "protagonist",
    "gender": "性别",
    "age": "年龄",
    "personality": "性格（50-80字，必须包含真实人性缺陷）",
    "background": "身世背景（80-120字）",
    "abilities": "核心能力/金手指（40-60字，必须写清代价）",
    "goals": "主要目标（30-40字，具体而非抽象）",
    "appearance": "外貌特征（20-30字）",
    "weaknesses": "致命弱点（20-40字）"
  },

  "importantCharacters": [
    // 至少 3 个重要配角
    {
      "name": "角色名",
      "role": "important-supporting",
      "gender": "性别",
      "age": "年龄",
      "personality": "性格（30-50字）",
      "background": "背景（40-60字）",
      "abilities": "能力（20-30字）",
      "goals": "目标（20-30字）",
      "appearance": "外貌（15-25字）"
    }
  ],

  "opponents": [
    // 至少 2 个主要对手
    {
      "name": "对手名",
      "role": "opponent",
      "gender": "性别",
      "age": "年龄",
      "personality": "性格（30-50字，反派必须有可理解的逻辑）",
      "background": "背景（40-60字）",
      "abilities": "能力（20-40字）",
      "goals": "目标（20-30字）",
      "appearance": "外貌（15-25字）"
    }
  ],

  "finalBoss": {
    "name": "最终Boss名",
    "role": "boss",
    "gender": "性别",
    "age": "年龄",
    "personality": "性格（40-60字）",
    "background": "背景（60-100字，与世界观核心规则深度绑定）",
    "abilities": "能力（30-50字）",
    "goals": "终极目标（30-40字，震撼且有意义）",
    "appearance": "外貌（20-30字）",
    "weaknesses": "致命弱点（必须与主角的成长路径相对应）"
  },

  "relationships": [
    // 至少 4 组关键关系
    {
      "characters": ["角色A", "角色B"],
      "type": "关系类型（血缘/敌对/同盟/师徒/恋人/利用/救赎/背叛）",
      "description": "关系描述（30-50字）",
      "stages": "关系发展四阶段：初始→转折→冲突→结局（60-100字）"
    }
  ],

  "abilitySystem": {
    "systemName": "能力体系名称",
    "description": "体系概述（50-80字）",
    "levels": ["等级1", "等级2", "等级3", "等级4", "等级5", "等级6", "等级7"],
    "rules": "核心规则（40-60字）",
    "costs": "使用代价/限制（40-60字，必须有真实代价）",
    "specialAbilities": ["特殊能力1", "特殊能力2", "特殊能力3"]
  },

  "items": [
    // 至少 5 个关键道具
    {
      "name": "道具名",
      "type": "类型（武器/防具/消耗品/信物/秘宝/科技产物）",
      "description": "描述（20-30字）",
      "abilities": "能力（20-40字）",
      "significance": "剧情关键作用（30-50字）",
      "owner": "持有者"
    }
  ],

  "plots": {
    "mainPlot": "主线剧情概述（100-150字，包含核心悬念和终极目标）",
    "subPlots": ["支线1（30-50字）", "支线2（30-50字）", "支线3（30-50字）"]
  },

  "plotStructure": {
    "opening": "开端（60-100字）：如何快速建立世界观+主角困境+核心悬念",
    "development": "发展（100-150字）：矛盾如何层层升级，主角如何被迫成长，世界观如何被颠覆",
    "climax": "高潮（80-120字）：最终对决的形式与规模，必须出人意料又在情理之中",
    "ending": "结局（60-80字）：故事的收束方式，建议开放式或有代价的胜利"
  },

  "timeline": [
    // 至少 ${timelineMin} 个关键时间节点
    { "phase": "阶段名", "event": "核心事件", "description": "30-50字描述", "chapters": "对应章节（如：第1-3章）" }
  ],

  "chapterBreakdown": [
    // 前 ${chapterCount} 章的详细拆分（必须恰好 ${chapterCount} 个）
    {
      "chapterNumber": 1,
      "title": "章节标题（15字以内，有网文传播力）",
      "mainPlot": "本章主要剧情（40-60字）",
      "purpose": "本章在整体结构中的目的（20-30字）",
      "keyConflict": "关键冲突（30-50字）",
      "foreshadowing": "本章埋下的伏笔（20-30字）"
    }
  ],

  "foreshadowing": [
    // 至少 ${foreshadowingMin} 个伏笔
    {
      "id": "fs-01",
      "plantedChapter": 1,
      "description": "伏笔描述（20-40字）",
      "payoffChapter": ${Math.ceil(chapterCount * 0.6)},
      "status": "planted",
      "impact": "揭露时的影响（20-30字）"
    }
  ],

  "eventLibrary": [
    // 至少 ${eventMin} 个可复用事件
    {
      "type": "事件类型",
      "description": "事件描述（30-50字）",
      "possibleChapters": [3, 7],
      "impact": "对剧情的影响（20-30字）",
      "involvedCharacters": ["角色1", "角色2"]
    }
  ]
}

---

# 关键要求
- 所有内容必须具体、有细节、可直接用于后续章节生成
- factions 至少 3 个，importantCharacters 至少 3 个，opponents 至少 2 个
- volumes 必须恰好 ${volumeCount} 卷，每卷的 chapterRange 必须连续且覆盖全部 ${chapterCount} 章
- chapterBreakdown 必须恰好 ${chapterCount} 个章节（第1章到第${chapterCount}章）
- foreshadowing 至少 ${foreshadowingMin} 个，eventLibrary 至少 ${eventMin} 个
- 伏笔的 payoffChapter 必须 > plantedChapter，且 payoffChapter ≤ ${chapterCount}
- 能力体系必须有明确的代价和限制
- 最终Boss 必须与世界观核心规则深度绑定
- 禁止出现任何"叶林萧楚秦苏"姓的角色
- **只输出纯 JSON，不要任何 markdown 标记、解释文字或寒暄**
- JSON 中所有字符串必须用双引号，禁止注释`;
}

// ═══════════════════════════════════════════════════════════
// 框架转段落文本 — 注入到章节写作 prompt 中
// ═══════════════════════════════════════════════════════════
export function frameworkToContextText(fw: import('@/types/novel-framework').NovelFramework): string {
  const lines: string[] = [];

  lines.push(`【世界观】${fw.worldSetting.worldName} — ${fw.worldSetting.worldType}`);
  lines.push(`世界规则：${fw.worldSetting.worldRules}`);
  lines.push('');

  // 卷结构摘要
  if (fw.volumes.length > 0) {
    lines.push(`【卷目】${fw.volumes.map((v) => `${v.title}(${v.chapterRange[0]}-${v.chapterRange[1]}章)`).join(' → ')}`);
    lines.push('');
  }

  lines.push(`【主角】${fw.protagonist.name}（${fw.protagonist.gender}，${fw.protagonist.age}）`);
  lines.push(`性格：${fw.protagonist.personality}`);
  lines.push(`能力：${fw.protagonist.abilities}`);
  lines.push(`目标：${fw.protagonist.goals}`);
  lines.push(`弱点：${fw.protagonist.weaknesses || ''}`);
  lines.push('');

  if (fw.factions.length > 0) {
    lines.push('【势力分布】');
    fw.factions.forEach((f) => {
      lines.push(`- ${f.name}：${f.goal}（对主角：${f.attitudeToProtagonist}）`);
    });
    lines.push('');
  }

  if (fw.importantCharacters.length > 0) {
    lines.push('【重要角色】');
    fw.importantCharacters.forEach((c) => {
      lines.push(`- ${c.name}（${c.role}）：${c.personality}`);
    });
    lines.push('');
  }

  if (fw.opponents.length > 0) {
    lines.push('【主要对手】');
    fw.opponents.forEach((o) => {
      lines.push(`- ${o.name}：${o.goals} | 能力：${o.abilities}`);
    });
    lines.push('');
  }

  lines.push(`【最终Boss】${fw.finalBoss.name}：${fw.finalBoss.background}`);
  lines.push(`终极目标：${fw.finalBoss.goals}`);
  lines.push('');

  if (fw.abilitySystem.systemName) {
    lines.push(`【能力体系】${fw.abilitySystem.systemName}`);
    lines.push(`等级：${fw.abilitySystem.levels.join(' → ')}`);
    lines.push(`代价：${fw.abilitySystem.costs}`);
    lines.push('');
  }

  lines.push(`【主线剧情】${fw.plots.mainPlot}`);
  lines.push('');

  lines.push(`【剧情结构】`);
  lines.push(`开端：${fw.plotStructure.opening}`);
  lines.push(`高潮：${fw.plotStructure.climax}`);
  lines.push(`结局：${fw.plotStructure.ending}`);

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════
// 提取章节相关上下文（精简版，用于单章写作）
// ═══════════════════════════════════════════════════════════
export function getChapterContext(
  fw: import('@/types/novel-framework').NovelFramework,
  chapterIndex: number,
): string {
  const lines: string[] = [];

  // 世界观速览
  lines.push(`【世界】${fw.worldSetting.worldName}：${fw.worldSetting.worldRules.slice(0, 80)}`);

  // 当前所在卷
  const currentVolume = fw.volumes.find(
    (v) => chapterIndex + 1 >= v.chapterRange[0] && chapterIndex + 1 <= v.chapterRange[1]
  );
  if (currentVolume) {
    lines.push(`【本卷】${currentVolume.title}（${currentVolume.chapterRange[0]}-${currentVolume.chapterRange[1]}章）— ${currentVolume.theme}`);
  }

  // 主角快照
  lines.push(`【主角】${fw.protagonist.name} — ${fw.protagonist.personality.slice(0, 40)} | 能力：${fw.protagonist.abilities.slice(0, 40)}`);

  // 当前章节框架
  const chapterPlan = fw.chapterBreakdown.find((c) => c.chapterNumber === chapterIndex + 1);
  if (chapterPlan) {
    lines.push(`【本章框架】${chapterPlan.mainPlot}`);
    lines.push(`目的：${chapterPlan.purpose} | 冲突：${chapterPlan.keyConflict}`);
    if (chapterPlan.foreshadowing) lines.push(`伏笔：${chapterPlan.foreshadowing}`);
  }

  // 活跃伏笔
  const activeForeshadowing = fw.foreshadowing.filter(
    (f) => f.plantedChapter <= chapterIndex + 1 && f.status === 'planted'
  );
  if (activeForeshadowing.length > 0) {
    lines.push(`【活跃伏笔】${activeForeshadowing.map((f) => f.description).join('；')}`);
  }

  // 相关时间线
  const activeTimeline = fw.timeline.find((t) => {
    const range = t.chapters.match(/(\d+)/g);
    if (!range) return false;
    const chNum = chapterIndex + 1;
    if (range.length >= 2) return chNum >= Number(range[0]) && chNum <= Number(range[1]);
    return chNum === Number(range[0]);
  });
  if (activeTimeline) {
    lines.push(`【当前阶段】${activeTimeline.phase}：${activeTimeline.description}`);
  }

  // 关键道具提醒
  if (fw.items.length > 0) {
    const keyItems = fw.items.filter((i) => i.significance.length > 20).slice(0, 3);
    if (keyItems.length > 0) {
      lines.push(`【关键道具】${keyItems.map((i) => `${i.name}(${i.owner})`).join('、')}`);
    }
  }

  return lines.join('\n');
}
