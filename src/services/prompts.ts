import { WriteMode, GROWTH_STAGES, WRITE_MODES, getStageForChapter } from './writing-framework';

// ═══════════════════════════════════════════════════════════
//  一站式创作 Prompt — 大纲 + N 章框架
// ═══════════════════════════════════════════════════════════
export function buildCreationPrompt(idea: string, trope: string, chapterCount: number): string {
  return `你是一位极具原创精神的资深出版编辑兼小说策划人。你必须拒绝一切网络小说套路，创造前所未见的故事。

【用户灵感】
${idea}
${trope ? `【偏好套路】${trope}` : ''}

## ⚠️ 绝对禁止（违反即失败）

- 禁止"丹田破碎→觉醒远古血脉→逆天改命"模板
- 禁止姓氏：叶、林、萧、楚、秦、苏（用罕见姓或复姓）
- 禁止开局：宗门测试、学院入学、被退婚羞辱、天才变废材
- 禁止"全宗震惊""全场哗然""所有人倒吸凉气"等群体反应
- 禁止无来由的碾压爽文逻辑
- 禁止"远古XX血脉""上古XX传承""万古第一XX"类命名

## ✅ 必须做到

1. 主角要有真正的人性缺陷（不是"太善良"，而是自私/懦弱/偏见/上瘾）
2. 金手指必须有代价（消耗寿命/记忆/情感/道德底线）
3. 世界观必须有一个反直觉的独特规则
4. 大纲必须有2个以上真正出人意料的转折

严格按以下 JSON 格式输出，不要包含任何额外文字或 markdown 标记：

{
  "genre": "小说题材",
  "subGenre": "细分标签",
  "title": "书名建议（15字以内，有网文传播力）",
  "description": "书籍简介（100-200字，突出独特性）",
  "synopsis": "核心梗概（一句话，80字以内）",
  "protagonist": {
    "name": "主角姓名（禁止叶/林/萧/楚/秦/苏姓）",
    "gender": "性别",
    "age": "年龄",
    "personality": "性格（40字，必须包含真实人性缺陷，不是'太善良'）",
    "background": "身世背景（60字，禁止丹田破碎/被退婚/家族被灭）",
    "abilities": "核心能力/金手指（40字，必须有明确代价）",
    "goals": "主要目标（30字）"
  },
  "worldBuilding": "世界观设定（100-200字，必须包含一个反直觉的独特规则）",
  "outline": "完整故事大纲（300-500字，分5段对应5个成长阶段，必须有2个以上出人意料的转折）",
  "timeline": [
    { "phase": "建立信念", "event": "关键事件", "description": "20-40字描述" },
    { "phase": "信念动摇", "event": "关键事件", "description": "20-40字描述" },
    { "phase": "彻底毁灭", "event": "关键事件", "description": "20-40字描述" },
    { "phase": "浴火重生", "event": "关键事件", "description": "20-40字描述" },
    { "phase": "新生蜕变", "event": "关键事件", "description": "20-40字描述" }
  ],
  "chapters": [
    { "title": "第1章 章名", "summary": "30-50字概要" }
  ]
}

chapters 数组必须恰好包含 ${chapterCount} 个章节。`;
}

// ═══════════════════════════════════════════════════════════
//  硬核写作引擎 — 五步写作法 + 成长阶段 + 文本铁律
// ═══════════════════════════════════════════════════════════
export function buildChapterPrompt(params: {
  title: string; summary: string; prevTail: string;
  chapterIndex: number; totalChapters: number; writeMode: WriteMode;
  genre: string; protagonist: string; outline: string;
  location: string; memoryNotes: string;
}): string {
  const { title, summary, prevTail, chapterIndex, totalChapters, writeMode, genre, protagonist, outline, location, memoryNotes } = params;
  const stageId = getStageForChapter(chapterIndex, totalChapters, writeMode);
  const stageInfo = GROWTH_STAGES.find((s) => s.id === stageId) || GROWTH_STAGES[0];
  const modeInfo = WRITE_MODES.find((m) => m.id === writeMode) || WRITE_MODES[0];

  return `# 角色设定
你是世界上最顶尖的长篇小说家 + 金牌编剧。你拒绝平庸，拒绝流水账，只输出高密度、高张力、极致沉浸的文字。

# 当前上下文
- 写作模式：${modeInfo.name}（${modeInfo.density}）
- 书籍题材：${genre || '未知'}
- 主角：${protagonist || '待补充'}
- 当前场景：${location || '待补充'}
- 伏笔备注：${memoryNotes || '无'}
- 全局大纲：${outline || '参考梗概'}

# 主角成长阶段
当前处于 **阶段${stageId}/5：${stageInfo.name}** — ${stageInfo.desc}
你必须在本章中忠实体现这一阶段的情绪基调和心理状态。

# 前一章最后400字（必须无缝衔接）
${prevTail || '（这是第一章，无需衔接）'}

# 本章信息
- 标题：${title}
- 概要：${summary}
- 章节序号：第 ${chapterIndex + 1}/${totalChapters} 章

---

# 硬核写作五步法

## 第一步：模式与成长阶段适配
根据「${modeInfo.name}」的叙事密度和「${stageInfo.name}」的情感强度，决定本章节奏与张力水平。

## 第二步：硬核叙事工程
- **黄金钩子**：开篇前300字必须是强烈感官细节或危机现场。用视觉/听觉/触觉/嗅觉/味觉立刻抓人。
- **信息差**：让读者知道危险，而主角因盲区犯错。制造"快看后面！"的焦虑感。
- **呼吸节奏**：铺垫用长句细腻渲染氛围，冲突用短句凌厉推进。对话穿插动作，避免纯对白。

## 第三步：文本铁律（零违反）
- **Show, Don't Tell**：不准写"他很愤怒"。要写"指节攥得发白，喉结上下滚动，声音从牙缝里挤出来"。
- **台词有潜台词**：每句对话都有表面的意思和真实的意思，符合人物身份和当下情绪。
- **硬核细节**：自然融入2-3个行业/世界观细节，让世界有质感。

## 第四步：时间线与成长记录
- 严格保持时间线逻辑自洽（不要出现前后几天的事件矛盾）。
- 本章主角必须体现阶段「${stageInfo.name}」对应的心理状态。

## 第五步：断崖式结尾
- 章节最后一句话停在刀刃上：一个未完成的决定、一个突然出现的威胁、一个颠覆认知的发现。
- 让读者必须点下一章。

---

# 输出格式（严格遵守）

【章节标题】${title}

正文内容

【本章成长记录】
- 当前阶段：${stageInfo.name}
- 心理关键变化：
- 时间线节点：

【本章记忆更新】
- 人物状态：
- 重要情节：
- 下一章潜在方向（3个选项）：

---

# 禁止事项（违反即失败）
- 禁止"全场震惊""所有人倒吸凉气""众人哗然"
- 禁止"脸色一变""瞳孔一缩""倒吸一口冷气"等模板化反应
- 禁止"这就是XX的力量吗""此子不可留"等套路台词
- 禁止主角无来由碾压对手

# 强制要求
1. 正文第一个字必须是小说正文的第一个字——不要写标题、章节号、markdown
2. 对话占比不低于30%，每句对话有潜台词
3. 每600字至少一个小冲突或情绪转折
4. 字数：1200-1800字
5. 严格延续上一章最后400字的语气、情节线和主角心理状态
6. 用独特的感官细节替代模板化表达，让每个场景有真实的质感`;
}

// ═══════════════════════════════════════════════════════════
//  续写 Prompt — 从当前正文末尾接续
// ═══════════════════════════════════════════════════════════
export function buildContinuePrompt(params: {
  currentText: string;
  genre: string;
  protagonist: string;
  globalMemory: string;
}): string {
  const { currentText, genre, protagonist, globalMemory } = params;
  const tail = currentText.slice(-500);
  return `# 角色设定
你是顶尖小说家。请从以下正文的最后一段之后直接续写 400-700 字。

【当前正文末尾500字】
${tail}

【故事记忆】
${globalMemory || '暂无'}

【书籍信息】
${genre || '未知'} · 主角：${protagonist || '未知'}

# 要求
1. 严格保持一致的文风、语气、人物性格
2. Show, Don't Tell
3. 结尾留悬念钩子
4. 直接在最后一句之后接续，不要重复已有内容
5. 不要写章节标题或任何格式标记
6. 直接输出续写正文即可`;
}

// ═══════════════════════════════════════════════════════════
//  创作下一章 Prompt
// ═══════════════════════════════════════════════════════════
export function buildNextChapterPrompt(params: {
  nextTitle: string;
  nextSummary: string;
  prevChapterContent: string;
  chapterIndex: number;
  totalChapters: number;
  writeMode: WriteMode;
  genre: string;
  protagonist: string;
  outline: string;
  globalMemory: string;
}): string {
  const { nextTitle, nextSummary, prevChapterContent, chapterIndex, totalChapters, writeMode, genre, protagonist, outline, globalMemory } = params;
  const stageId = getStageForChapter(chapterIndex, totalChapters, writeMode);
  const stageInfo = GROWTH_STAGES.find((s) => s.id === stageId) || GROWTH_STAGES[0];
  const modeInfo = WRITE_MODES.find((m) => m.id === writeMode) || WRITE_MODES[0];

  return `# 角色设定
你是世界上最顶尖的长篇小说家。你拒绝平庸，只输出高密度、高张力的文字。

# 上下文
- 写作模式：${modeInfo.name}（${modeInfo.density}）
- 题材：${genre || '未知'}
- 主角：${protagonist || '未知'}
- 大纲：${outline || '参考梗概'}
- 记忆：${globalMemory || '暂无'}

# 成长阶段
当前处于 **阶段${stageId}/5：${stageInfo.name}** — ${stageInfo.desc}
本章必须忠实体现这一阶段的情绪基调。

# 上一章最后500字
${prevChapterContent.slice(-500)}

# 本章
- 标题：${nextTitle}
- 概要：${nextSummary}
- 序号：第 ${chapterIndex + 1}/${totalChapters} 章

# 写作要求
严格按照五步写作法（模式适配→叙事工程→文本铁律→时间线→断崖结尾），Show Don't Tell，字数1200-1800字。

# 输出格式
【章节标题】${nextTitle}

正文（直接开始叙事）

【本章成长记录】
- 当前阶段：${stageInfo.name}
- 心理关键变化：
- 时间线节点：

【本章记忆更新】
- 人物状态：
- 重要情节：
- 下一章方向：`;
}

// ═══════════════════════════════════════════════════════════
//  改写 Prompt
// ═══════════════════════════════════════════════════════════
export function buildRewritePrompt(params: {
  selectedText: string;
  style: string;
  context: string;
}): string {
  const { selectedText, style, context } = params;
  return `# 角色
你是专业编辑。请改写以下段落。

【改写要求】${style || '增强画面感和节奏感，避免模板化表达'}

【原文】
${selectedText}

【上下文】
${context || '无'}

# 要求
1. 保持原意，只改进表达
2. Show Don't Tell — 用感官细节替代陈述
3. 直接输出改写后文字，不要解释`;
}

// ═══════════════════════════════════════════════════════════
//  求票文案 Prompt
// ═══════════════════════════════════════════════════════════
export function buildVotePrompt(params: {
  bookTitle: string;
  recentContent: string;
  chapterInfo: string;
  type: string;
}): string {
  const { bookTitle, recentContent, chapterInfo, type } = params;
  return `你是网文作者，需要写一段真诚的求${type}文案。要求：
- 150-250字
- 语气真诚、不做作、略带自嘲
- 简要提及近期剧情亮点（15-25字钩子）
- 不要过度卖惨，但可以适度表达创作的不易
- 结尾诚恳请求读者投票支持

书籍：${bookTitle}
最近章节亮点：${recentContent.slice(-300)}
当前进度：${chapterInfo}

请输出纯文案，不要加任何标签或解释。`;
}
