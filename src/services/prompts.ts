import { WriteMode, GROWTH_STAGES, WRITE_MODES, getStageForChapter } from './writing-framework';

// ═══════════════════════════════════════════════════════════
//  一站式创作 Prompt — 信息差驱动单章小框架
//  输出符合 InkFlow DS Pro DeepSeek 三轴记忆面板的 JSON
// ═══════════════════════════════════════════════════════════
export function buildCreationPrompt(idea: string, trope: string, chapterCount: number): string {
  const soulStages = chapterCount <= 5
    ? '自适应分配以下阶段到各章：建立信心 → 信念动摇 → 彻底毁灭 → 浴火重生 → 新生蜕变'
    : '章节分布遵循：前20% 建立信心 → 20%-40% 信念动摇 → 40%-60% 彻底毁灭 → 60%-80% 浴火重生 → 80%-100% 新生蜕变';

  const paddedCount = String(chapterCount).padStart(2, '0');

  return `# 角色设定
你是世界顶级的网文大纲总编 + 商业剧本总监。你深谙读者心理与网络文学的商业抓手。
你必须拒绝一切套路模板，创造前所未见、信息密度极高的故事。

# 用户输入
- 核心灵感：${idea || '（由你自由发挥，创造最具冲击力的开篇）'}
${trope ? `- 题材标签：${trope}` : ''}
- 目标章节数：${chapterCount} 章

---

# 🛑 四大死命令（违反即判定生成失败）

## 一、起承转合死锁
${soulStages}
每一章的 "soulStage" 字段必须精确标注当前章节所处的成长阶段。
禁止剧情平铺直叙——每一章都必须推动主角的心理曲线发生可感知的变化。

## 二、黄金开篇与断崖结尾
- 每章 "plotFlow.hook"：必须死锁在一个反常的感官细节或突发情绪冲突中（禁止"清晨醒来""阳光明媚"类平淡开局）
- 每章 "cliffhangerPoint"：必须强行卡在戏剧冲突最高的刀刃上——一个未完成的决定、突然出现的威胁、颠覆认知的发现
- 禁止把剧情交代完！禁止在章末让主角安全回家！

## 三、制造信息差（逼疯读者的核心武器）
- 每章 "informationAsymmetry.godView"：定义读者站在上帝视角所窥探到的核心阴谋或暗线危险
- 每章 "informationAsymmetry.blindSpot"：定义主角因什么认知盲区而做出了危险的错误判断
- 让读者尖叫"快看后面！"——这是衡量章节质量的唯一标准

## 四、行业纵深与视觉符号
- 每章 "industryLore"：注入 3 个行业垂直术语或职业黑话，让世界有真实的质感
- 每章 "visualSymbol"：定义一个贯穿全章的核心画面隐喻（如：蒸发一半的黑伞、停在窗台不动的飞蛾）
- 每个 visualSymbol 必须在 plotFlow 的三个阶段各出现一次（变奏重复）

---

# ⚠️ 绝对禁止（违反即失败）
- 禁止姓氏：叶、林、萧、楚、秦、苏（用罕见姓或复姓：端木、闻人、即墨、百里、南宫）
- 禁止开局：宗门测试、学院入学、被退婚羞辱、天才变废材、丹田破碎
- 禁止"全场震惊""众人哗然""所有人倒吸凉气""脸色一变""瞳孔一缩"
- 禁止无来由碾压爽文、禁止"远古XX血脉""上古XX传承""万古第一XX"
- 主角必须有真实人性缺陷（不是"太善良"——而是自私/懦弱/成瘾/偏见/傲慢）
- 金手指必须有明确代价（消耗寿命/记忆/情感/道德底线/他人生命）

---

# 输出 JSON Schema（严格遵守，不要任何额外文字或 markdown）

{
  "genre": "题材（8字以内）",
  "subGenre": "细分标签（4字以内）",
  "title": "书名建议（15字以内，有网文传播力）",
  "description": "书籍简介（100-200字，突出世界观独特性和主角困境）",
  "synopsis": "核心梗概（一句话，80字以内，必须有悬念钩子）",
  "protagonist": {
    "name": "主角姓名（禁止叶林萧楚秦苏，使用罕见复姓）",
    "gender": "性别",
    "age": "年龄",
    "personality": "性格（40字，必须包含真实人性缺陷）",
    "background": "身世背景（60字，禁止丹田破碎/被退婚）",
    "abilities": "核心能力/金手指（40字，必须有明确代价！）",
    "goals": "主要目标（30字，具体而非抽象）"
  },
  "worldBuilding": "世界观设定（100-200字，必须包含一个反直觉的独特规则）",
  "outline": "完整故事大纲（300-500字，分5段对应成长阶段，包含2个以上真正出人意料的转折）",
  "timeline": [
    { "phase": "建立信念", "event": "关键事件", "description": "20-40字" },
    { "phase": "信念动摇", "event": "关键事件", "description": "20-40字" },
    { "phase": "彻底毁灭", "event": "关键事件", "description": "20-40字" },
    { "phase": "浴火重生", "event": "关键事件", "description": "20-40字" },
    { "phase": "新生蜕变", "event": "关键事件", "description": "20-40字" }
  ],
  "chapters": [
    {
      "id": "ch-01",
      "title": "第 1 章：[富有动漫画面感的章节标题，15字以内]",
      "wordCountBudget": 3000,
      "coreConflict": "[本章针尖对麦芒的核心冲突，谁与谁在争夺什么，限80字]",
      "plotFlow": {
        "hook": "[黄金开篇300字的核心钩子——反常感官细节或突发危机]",
        "pressure": "[矛盾如何一步步升级，把主角逼向绝境的过程]",
        "climax": "[本章情绪/动作/画面的最高燃点名场面]"
      },
      "informationAsymmetry": {
        "godView": "[读者上帝视角窥探到的核心阴谋或暗线危险]",
        "blindSpot": "[主角的认知盲区，因何做出危险错误判断]"
      },
      "soulStage": "[建立信心 / 信念动摇 / 彻底毁灭 / 浴火重生]",
      "visualSymbol": "[贯穿全章的核心画面隐喻，如：蒸发一半的黑伞]",
      "industryLore": [
        "[行业垂直术语或职业黑话 1]",
        "[行业垂直术语或职业黑话 2]",
        "[行业垂直术语或职业黑话 3]"
      ],
      "cliffhangerPoint": "[在哪个致命、抓狂的瞬间戛然而止？具体情节描写]",
      "uiMetrics": {
        "timeDimension": "[叙事时态锚定，如：午夜·第3日 | 时态：紧迫倒计时]",
        "tokenFingerprint": "[语言风格指纹，如：极简短句流 | 高频动作描写 | 对话占比35%]",
        "situationalInference": "[场景张力推断，如：毁灭性冲突 | 追逐/逃避 | 张力密度:85%]"
      }
    }
  ]
}

# 关键要求
- chapters 数组必须恰好包含 ${chapterCount} 个章节，id 从 ch-01 到 ch-${paddedCount}
- 每章的 wordCountBudget 固定为 3000
- 第 1 章 soulStage 必须是"建立信心"，最后一章必须是"新生蜕变"
- uiMetrics 的三个字段将直接渲染到 InkFlow DS Pro 右侧 DeepSeek 记忆面板，必须精确、有信息量
- 只输出纯 JSON，不要任何 markdown 标记、解释文字或寒暄`;
}

// ═══════════════════════════════════════════════════════════
//  极速大纲生成 Prompt — 算力解耦·纯净单轨流
//  只生成章节骨架：id / title / synopsis / cliffhangerPoint
//  零 soulStage、零宏观设定、零角色圣经、零伏笔追踪
// ═══════════════════════════════════════════════════════════
export function buildSlimOutlinePrompt(idea: string, trope: string, chapterCount: number): string {
  const paddedCount = String(chapterCount).padStart(2, '0');
  return `# 角色设定
你是顶级网文大纲策划师。你的唯一任务：根据灵感，无脑输出 ${chapterCount} 章的精简大纲骨架。
禁止输出世界观、势力、能力体系、角色圣经、伏笔追踪等宏观字段——这些由后续流程单独处理。

# 用户输入
- 灵感：${idea || '自由发挥'}
${trope ? `- 题材：${trope}` : ''}
- 章节数：${chapterCount}

# 输出 JSON（只输出纯 JSON，禁止 markdown）
{
  "genre": "题材（6字以内）",
  "title": "书名建议（12字以内）",
  "protagonist": { "name": "主角名（禁止叶林萧楚秦苏）", "gender": "性别", "age": "年龄", "personality": "性格（25字以内）", "background": "身世（30字以内）", "abilities": "金手指（20字以内）", "goals": "目标（20字以内）" },
  "chapters": [
    {
      "id": "ch-01",
      "title": "章节标题（15字以内）",
      "synopsis": "本章核心冲突+剧情梗概（80-100字）",
      "cliffhangerPoint": "断崖卡点——本章在哪个致命瞬间戛然而止（30-50字）"
    }
  ]
}

# 铁律
- chapters 必须恰好 ${chapterCount} 个，id: ch-01 ~ ch-${paddedCount}
- 每章 cliffhangerPoint 必须具体、抓人、让读者必须翻下一章
- 禁止姓氏：叶林萧楚秦苏
- 只输出纯 JSON，零额外文字
- 禁止输出 soulStage, plotFlow, informationAsymmetry 等宏字段`;
}

// ═══════════════════════════════════════════════════════════
//  大师级章节写作引擎
//  画面隐喻 · 信息差 · 长短句呼吸 · 断崖悬念
// ═══════════════════════════════════════════════════════════
export function buildChapterPrompt(params: {
  title: string; summary: string; prevTail: string;
  chapterIndex: number; totalChapters: number; writeMode: WriteMode;
  genre: string; protagonist: string; outline: string;
  location: string; memoryNotes: string;
  novelTitle?: string;
  novelFrameworkContext?: string;   // 从 NovelFramework 提取的上下文
  chapterOutline?: {
    coreConflict?: string;
    plotFlow?: { hook?: string; pressure?: string; climax?: string };
    informationAsymmetry?: { godView?: string; blindSpot?: string };
    visualSymbol?: string;
    cliffhangerPoint?: string;
    industryLore?: string[];
    uiMetrics?: { timeDimension?: string; tokenFingerprint?: string; situationalInference?: string };
  };
}): string {
  const { title, summary, prevTail, chapterIndex, totalChapters, writeMode, genre, protagonist, outline, location, memoryNotes, novelTitle, novelFrameworkContext, chapterOutline } = params;
  const stageId = getStageForChapter(chapterIndex, totalChapters, writeMode);
  const stageInfo = GROWTH_STAGES.find((s) => s.id === stageId) || GROWTH_STAGES[0];
  const modeInfo = WRITE_MODES.find((m) => m.id === writeMode) || WRITE_MODES[0];

  // ── 篇幅路由 ──
  const lengthRouting = writeMode === 'short'
    ? '【短篇模式】单线进化。开篇直接切入危机现场。人物在极短时间内经历命运或心态的骤变。结尾必须来一个意料之外、情理之中的反转。'
    : writeMode === 'medium'
    ? '【中篇模式】双线交织。主线清晰，可带一条副线。核心重点在于展现核心事件如同"慢性毒药"一般，如何一丝丝蚕食、重塑主角的心理防线。'
    : '【长篇连载】多线推进。宏观上遵循灵魂蜕变历程（建立信心 ➔ 遭遇动摇 ➔ 陷入谷底 ➔ 浴火重生）。本章处于：' + stageInfo.name;

  // ── 画面隐喻（来自大纲或自由发挥）──
  const visualSymbol = chapterOutline?.visualSymbol || '（由你根据本章核心冲突自由创造一个贯穿全章的画面隐喻）';
  const visualSymbolBlock = chapterOutline?.visualSymbol
    ? `\n> 本章核心【画面隐喻】已锚定：「${visualSymbol}」。请在开篇、中段、结尾各出现一次该符号的变奏——让读者潜意识中形成意象闭环。`
    : `\n> 请你在构思时先确定本章核心【画面隐喻】（一个具体的物或自然现象），然后在开篇、中段、结尾各出现一次它的变奏。`;

  // ── 信息差 ──
  const godView = chapterOutline?.informationAsymmetry?.godView || '（由你根据本章冲突自由设定：读者此时应该知道什么主角不知道的事？）';
  const blindSpot = chapterOutline?.informationAsymmetry?.blindSpot || '（由你自由设定：主角因为什么认知盲区正在走向危险？）';
  const asymmetryBlock = `\n> 本章【信息差】已锁定：上帝视角 — ${godView} / 认知盲区 — ${blindSpot}。在行文中持续制造"快看后面！"的焦虑感。`;

  // ── 行业纵深 ──
  const industryBlock = chapterOutline?.industryLore?.length
    ? `\n> 本章必须自然融入以下 ${chapterOutline.industryLore.length} 个垂直术语/职业黑话（不要生硬解释，让它们像呼吸一样出现在叙事中）：${chapterOutline.industryLore.join('、')}`
    : '';

  // ── 断崖卡点 ──
  const cliffhangerBlock = chapterOutline?.cliffhangerPoint
    ? `\n> 🪓 本章结尾强制断崖点：「${chapterOutline.cliffhangerPoint}」— 必须在这里戛然而止！禁止继续往下写！禁止交代后续！`
    : '\n> 🪓 本章结尾必须在戏剧冲突最高的刀刃上戛然而止——一个未完成的决定、突然出现的威胁、或颠覆认知的发现。禁止把剧情交代完！';

  // ── DeepSeek 风格指标 ──
  const uiMetricsBlock = chapterOutline?.uiMetrics
    ? `\n- 时态锚定：${chapterOutline.uiMetrics.timeDimension || '继承上文'} | 语言指纹：${chapterOutline.uiMetrics.tokenFingerprint || '保持一致性'} | 场景张力：${chapterOutline.uiMetrics.situationalInference || '自然推进'}`
    : '';

  return `## 🎭 角色设定
你是一位深刻理解读者心理、文字极具画面感与情感张力的顶级网络小说巨匠。你深谙长短句节奏控制与"Show, Don't Tell"原则，能够产出高留存率、高吸引力的小说。

## 🧠 DeepSeek 思考逻辑约束（动笔前在内心规划）
1. 本章最核心的【画面隐喻】是什么？${visualSymbolBlock}
2. 读者和角色之间的【信息差】在哪里？${asymmetryBlock}
3. 本章结尾的【断崖式悬念（Cliffhanger）】停在哪一秒？${cliffhangerBlock}

---

## 🧭 核心创作原则

**1. 画面代替叙述（Show, Don't Tell）：**
坚决拒绝直接使用"他很伤心"、"场面很恐怖"等抽象形容词。请通过角色的生理本能反应（如：喉结滚了滚、指甲掐进肉里、呼吸一滞）或富有情绪暗示的道具/环境（如：深夜窗台上死掉的飞蛾、一杯冒着冷汗的冰水）来让读者自己去感受。

**2. 长短句呼吸控制：**
日常铺垫、环境细描、行业内幕交代时，用富有韵律的长句子，拉长文学空间；一旦进入冲突爆发、动作交锋、心理惊悚或章节末尾时，瞬间切换为凌厉、干净的短句。控制读者的心跳节奏。
- 当前风格参考：${chapterOutline?.uiMetrics?.tokenFingerprint || modeInfo.density}

**3. 对话潜台词：**
角色对话必须符合其身份、职业和阶层。严禁直白说教，台词要充满推拉和留白，说话永远只表露内心真实意图的30%，剩下的70%让读者通过线索去猜。

---

## 🗺️ 篇幅与结构路由
${lengthRouting}
${industryBlock}

---

## 🎬 章节创作黄金四步（严格执行）

**【第一步：章首钩子】**
承接上文。前300字内严禁大段背景交代，必须直接从一个有张力的画面、一句有深意的台词或突发冲突开始。${chapterOutline?.plotFlow?.hook ? `\n大纲指定钩子方向：「${chapterOutline.plotFlow.hook}」` : ''}

**【第二步：多线推进】**
利用"信息差"制造悬念——让读者知道危险在靠近，而主角浑然不觉。过程中丝滑融入该题材垂直领域的硬核细节，展现惊人的专业质感。${chapterOutline?.plotFlow?.pressure ? `\n大纲指定压力升级路径：「${chapterOutline.plotFlow.pressure}」` : ''}

**【第三步：压力升级】**
让矛盾在本章中后段达到一个小高潮，将压力逼近临界点。${chapterOutline?.plotFlow?.climax ? `\n大纲指定最高燃点：「${chapterOutline.plotFlow.climax}」` : ''}

**【第四步：断崖式结尾 — 🛑 最高死命令！】**
必须把剧情停在刀刃上（例如：秘密即将被撞破的前一秒、子弹开火的前一刻）。严禁在章末做大道理总结！用绝对的悬念逼迫读者点击"下一章"！

---

## 📥 用户输入带入槽
- 故事题目：${novelTitle || '（见下方标题）'}
- 小说题材：${genre || '未知'}
- 核心冲突/本章梗概：${summary || '（参考大纲自由发挥）'}
- 全局大纲背景：${outline || '参考梗概'}
- 主角信息：${protagonist || '待补充'}
- 完整框架背景：${novelFrameworkContext || '无框架'}
- 当前场景/位置：${location || '待补充'}
- 伏笔备注/记忆：${memoryNotes || '无'}
${uiMetricsBlock ? `- 📊 DeepSeek 风格指标：${uiMetricsBlock}` : ''}

---

## 📖 本章具体信息
- 章节标题：${title}
- 章节序号：第 ${chapterIndex + 1}/${totalChapters} 章
- 字数目标：1200-1800字
- 成长阶段：阶段${stageId}/5 — ${stageInfo.name}（${stageInfo.desc}）
- 写作模式：${modeInfo.name}（${modeInfo.density}）

---

## 📄 前一章最后400字（必须无缝衔接）
${prevTail || '（这是第一章，无需衔接）'}

---

## 🚫 绝对禁止（违反即判定失败）
- 禁止"全场震惊""众人哗然""所有人倒吸凉气""脸色一变""瞳孔一缩"
- 禁止"这就是XX的力量吗""此子不可留""有意思"等套路台词
- 禁止主角无来由碾压对手、禁止"远古XX血脉""上古XX传承"
- 禁止在章末做任何大道理总结或抒情展望
- 禁止把剧情交代完——必须停在刀刃上！

---

## ✅ 强制要求
1. 正文第一个字必须是小说正文的第一个字——不要写标题、章节号、markdown
2. 对话占比不低于30%，每句对话有潜台词（表面意思 ≠ 真实意思）
3. 每600字至少一个小冲突或情绪转折
4. 字数：1200-1800字
5. 严格延续上一章最后400字的语气、情节线和主角心理状态
6. 本章必须忠实体现阶段「${stageInfo.name}」对应的情绪基调和心理状态
7. 用独特的感官细节替代模板化表达，让每个场景有真实的质感
8. 画面隐喻「${visualSymbol}」必须在开篇、中段、结尾各出现一次（变奏重复）

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

开始写作——记住：第一个字就是正文，停在刀刃上。`;
}

// ═══════════════════════════════════════════════════════════
//  正文并发表绎引擎 — 殿堂级主笔 Prompt
//  基于篇章裂变引擎的微蓝图，产出极具网文质感的正文章节
// ═══════════════════════════════════════════════════════════
export function buildChapterBodyPrompt(params: {
  activeChapterTitle: string;
  activeChapterPlot: string;
  activeChapterCliffhanger: string;
  lastChapterText: string;
  dsTimeDimension?: string;
  dsTokenFingerprint?: string;
  dsSituationalInference?: string;
}): string {
  const {
    activeChapterTitle, activeChapterPlot, activeChapterCliffhanger, lastChapterText,
    dsTimeDimension, dsTokenFingerprint, dsSituationalInference,
  } = params;

  const timeDim = dsTimeDimension || '继承上文时态';
  const tokenFp = dsTokenFingerprint || '纯叙述流';
  const situInf = dsSituationalInference || '自然推进';

  return `# Role: InkFlow Pro 文本模块级渲染引擎 (物理排版锁死版)

## Task
请接收来自底层 DeepSeek 算力流生成的【模式指标】，输出排版紧凑、带有物理块状质感、绝不散架的纯净小说文本。

## 🚨 核心文本模块化与下划线视觉死锁红线

1. **【叙述模块】长句抱团：**
   - 所有的环境描写、连续动作流、细节铺垫或心理活动，**必须连续平铺在同一个大段落中**。
   - 每一个大叙述段落必须包含 3 到 5 行完整的长句（约 150-200 字），在视觉上形成厚实的"核心块"。
   - **下划线触发机制**：每一个大叙述块写完后，必须在紧接着的下方，输出一行由 3 个下划线组成的标准 Markdown 物理分割线（\`___\`），以此在视觉上锁死间距并沉淀剧情。

2. **【反转/情绪模块】下划线强化：**
   - 当抛出致命底牌、核心反转或情绪重击的极短句时（如："不是血。是气。"），在短句的下方**必须强制追加一行下划线 \`___\`**。
   - 通过下划线的物理截断，将空旷无意义的空白间距，转化为极具网文戏剧张力的"视觉重音符号"。

3. **【对白模块】禁止拆分换行：**
   - 台词和人物的肢体神态动作必须紧密连缀在同一段落内。
   - 错误示范（坚决禁止）：
     公孙白低头看自己的左臂。
     青铜纹路已经扩散到手背。
   - 正确示范（必须合并）：
     公孙白低头看自己的左臂，青铜纹路已经扩散到手背。他能明显感觉到，自己的手指开始僵硬，像是被什么未知的东西在一点点侵蚀骨头。

4. **换行符绝对清理红线：**
   - 严禁输出任何连续的两个换行符（禁止 \`\\n\\n\`）。段落、台词或下划线之间，只允许输出一个单换行符（\`\\n\`）。

## 📊 Ingested DeepSeek Stream (接收自 DS 的模式指标)
<deepseek_metrics>
- 时态维度 (Time Dimension): ${timeDim}
- 语义特征流 (Token Fingerprint): ${tokenFp}
- 冲突张力 (Situational Inference): ${situInf}
</deepseek_metrics>

<micro_blueprint>
- 当前要写的章节: ${activeChapterTitle}
- 本章大纲梗概指引: ${activeChapterPlot}
- 本章强制断崖点（结尾钩子）: ${activeChapterCliffhanger}
</micro_blueprint>

<historical_text_stream>
- 前文最后500字剧情承接 (保持无缝衔接):
${lastChapterText || '（这是第一章，无前文）'}
</historical_text_stream>

## Output Format Specification
直接输出按照上述规则排序、带有下划线物理特征的小说正文。严禁输出任何 Markdown 代码块包裹（不要用 \`\`\`），严禁包含任何前言废话，直接以正文第一句话开始输出。`;
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
  novelFrameworkContext?: string;
}): string {
  const { nextTitle, nextSummary, prevChapterContent, chapterIndex, totalChapters, writeMode, genre, protagonist, outline, globalMemory, novelFrameworkContext } = params;
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
- 框架背景：${novelFrameworkContext || '无框架'}

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
