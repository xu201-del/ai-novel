// Quick test: verify prompt sizes and stage distribution for different chapter counts
// Run with: node test-gen.mjs

// Inline the key functions to avoid TS import issues
function getStageForChapter(chapterIndex, totalChapters, writeMode) {
  if (writeMode === 'short') {
    if (chapterIndex === 0) return 1;
    if (chapterIndex === 1) return 3;
    return 5;
  }
  if (writeMode === 'medium') {
    if (chapterIndex <= 0) return 1;
    if (chapterIndex === 1) return 2;
    if (chapterIndex === 2) return 3;
    if (chapterIndex === 3) return 4;
    return 5;
  }
  // Proportional: 5 stages evenly spread
  return Math.min(Math.floor((chapterIndex / totalChapters) * 5) + 1, 5);
}

const counts = [3, 5, 10, 15, 20, 30, 50, 100];

console.log('=== InkFlow 生成能力测试 ===\n');

for (const count of counts) {
  // Stage distribution
  const stages = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (let i = 0; i < count; i++) {
    const s = getStageForChapter(i, count, 'long');
    stages[s]++;
  }

  const volCount = Math.max(1, Math.ceil(count / 12));
  const foreshadowMin = Math.max(5, Math.floor(count * 0.7));
  const eventMin = Math.max(5, Math.floor(count * 0.8));
  const timelineMin = Math.max(3, Math.ceil(count / 4));

  // Estimate prompt sizes (rough)
  const outlinePromptEstimate = 3000 + count * 400; // ~400 chars per chapter schema
  const frameworkPromptEstimate = 4000 + count * 300; // ~300 chars per chapter breakdown

  console.log(`${count} 章 | ${volCount} 卷 | 阶段: 1:${stages[1]} 2:${stages[2]} 3:${stages[3]} 4:${stages[4]} 5:${stages[5]}`);
  console.log(`  大纲 Prompt ~${outlinePromptEstimate}字 | 框架 Prompt ~${frameworkPromptEstimate}字`);
  console.log(`  伏笔≥${foreshadowMin} | 事件≥${eventMin} | 时间线≥${timelineMin}`);
  console.log(`  阶段占比: ${Object.values(stages).map(v => Math.round(v/count*100) + '%').join(' / ')}`);
  console.log();
}

// Also verify the 20-chapter JSON parse edge case
console.log('=== 20章 JSON 解析测试 ===');
const testJson20 = JSON.stringify({
  chapters: Array.from({ length: 20 }, (_, i) => ({
    id: `ch-${String(i+1).padStart(2,'0')}`,
    title: `第${i+1}章测试`,
    coreConflict: '测试冲突'
  })),
  protagonist: { name: '测试', gender: '男', age: '25', personality: '测试性格', background: '测试背景', abilities: '测试能力', goals: '测试目标' }
});
console.log(`20章大纲 JSON 大小: ${testJson20.length} 字符 (${Math.round(testJson20.length/4)} 估算 tokens)`);

// Framework JSON for 20 chapters would be much larger
const estFrameworkTokens = 16384;
console.log(`20章框架 maxTokens=16384 → 约 ${Math.round(16384 * 1.5)} 中文字符上限`);
console.log(`风险: 如果框架JSON超过此限制，会被截断导致 parseJSONFromText 失败`);
