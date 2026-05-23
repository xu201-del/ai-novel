export const GROWTH_STAGES = [
  { id: 1, name: '建立信念', desc: '主角确立核心目标与价值观', color: '#5c9ce6' },
  { id: 2, name: '信念动摇', desc: '遭遇重大挫折，开始怀疑一切', color: '#d4a44c' },
  { id: 3, name: '彻底毁灭', desc: '失去一切，坠入最深绝望', color: '#e0556a' },
  { id: 4, name: '浴火重生', desc: '从灰烬中崛起，脱胎换骨', color: '#7c7cf8' },
  { id: 5, name: '新生蜕变', desc: '完成质变，成为全新存在', color: '#4caf90' },
] as const;

export const WRITE_MODES = [
  { id: 'long' as const, name: '长篇连载', defaultChapters: 10, density: '铺陈世界观与多条支线，每章埋1-2个伏笔' },
  { id: 'medium' as const, name: '中篇', defaultChapters: 5, density: '节奏紧凑，支线精简，聚焦核心冲突' },
  { id: 'short' as const, name: '短篇', defaultChapters: 3, density: '极简高密度，每一句都推动剧情或塑造人物' },
];

export type WriteMode = (typeof WRITE_MODES)[number]['id'];

export function getStageForChapter(
  chapterIndex: number,
  totalChapters: number,
  writeMode: WriteMode
): number {
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
  // Proportional: 5 stages evenly spread across totalChapters
  return Math.min(Math.floor((chapterIndex / totalChapters) * 5) + 1, 5);
}

export const TROPE_TAGS = [
  { id: 'system', label: '系统降临', desc: '主角获得神秘系统' },
  { id: 'revenge', label: '重生复仇', desc: '带着记忆回到过去' },
  { id: 'isekai', label: '穿越异界', desc: '穿越到另一个世界' },
  { id: 'son-in-law', label: '赘婿逆袭', desc: '隐藏身份，一鸣惊人' },
  { id: 'waste', label: '废材逆天', desc: '从底层崛起' },
  { id: 'palace', label: '古代权谋', desc: '朝堂之上的博弈' },
  { id: 'urban', label: '都市异能', desc: '现代都市中的超能力' },
  { id: 'survival', label: '末日求生', desc: '末日世界的生存法则' },
  { id: 'cultivation', label: '修仙证道', desc: '追求长生大道的旅程' },
];

export const CHAPTER_COUNT_OPTIONS = [3, 5, 10, 15, 20];

export const BANNED_NAMES = ['叶', '林', '萧', '楚', '秦', '苏'];
export const BANNED_OPENINGS = ['宗门测试', '学院入学', '被退婚羞辱', '天才变废材', '丹田破碎'];
