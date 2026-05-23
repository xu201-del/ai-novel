import { useEffect, useRef, useState, useCallback } from 'react';
import { useNovelStore } from '@/stores/novel-store';

// ═══════════════════════════════════════════════════════════
// DeepSeek V3 增量记忆节点类型
// ═══════════════════════════════════════════════════════════
export interface DSMemoryNode {
  id: string;
  label: 'Time Dimension' | 'Token Fingerprint' | 'Situational Inference';
  detail: string;
  confidence: number; // 0.0–1.0 extraction confidence
  updatedAt: number;
}

// ═══════════════════════════════════════════════════════════
// DeepSeek 抗抖动低功耗记忆摘要引擎
//
// 2500ms 黄金码字空档期触发增量提取。
// 模拟 DeepSeek-V3 的长上下文增量推理机制，
// 输出三个长效记忆节点：
//   Time Dimension     — 叙事时间线锚定
//   Token Fingerprint  — 语言指纹/风格标记
//   Situational Inference — 场景态势推断
// ═══════════════════════════════════════════════════════════

const TENSE_MARKERS = ['了', '过', '着', '正在', '将', '会', '要', '已经', '曾经', '即将'];
const TEMPORAL_WORDS = ['天', '时', '分', '秒', '日', '月', '年', '夜', '晨', '暮', '午', '傍晚', '黎明'];

const STYLE_MARKERS: Record<string, string> = {
  '缓缓': '慢节奏描写', '忽然': '突发转折', '突然': '意外事件',
  '默默': '内敛克制', '轻轻': '细腻动作', '仿佛': '比喻倾向',
  '似乎': '不确定性', '却': '转折对比', '竟': '惊讶强调',
  '便': '简洁利落', '乃': '文言语感', '而已': '轻描淡写',
};

const TENSION_PATTERNS = [
  { pattern: /(?:杀|死|灭|毁|碎|裂|破|断)/g, label: '毁灭性冲突' },
  { pattern: /(?:逃|追|躲|藏|避|闪|退)/g, label: '追逐/逃避' },
  { pattern: /(?:谎|骗|瞒|藏|秘密|真相|揭露)/g, label: '信息不对称' },
  { pattern: /(?:恨|怒|怨|仇|敌|战|争)/g, label: '敌对关系' },
  { pattern: /(?:怕|恐|惧|惊|惶|慌)/g, label: '恐惧张力' },
  { pattern: /(?:爱|恋|情|恩|义|护|救|守)/g, label: '情感纽带' },
  { pattern: /(?:疑|惑|迷|乱|困|陷|绝)/g, label: '困惑/困境' },
];

export function useDebouncedMemorySync(
  content: string,
  delay: number = 2500
): { nodes: DSMemoryNode[]; isSyncing: boolean; lastSync: number | null; contentHash: string | null } {
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const updateGlobalMemory = useNovelStore((s) => s.updateGlobalMemory);
  const [nodes, setNodes] = useState<DSMemoryNode[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [contentHash, setContentHash] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastKnownHashRef = useRef<string>('');

  // ── 内容指纹哈希 (避免无效重复提取) ──
  const computeFingerprint = useCallback((text: string): string => {
    if (text.length < 100) return text.length.toString();
    const segments = [text.slice(0, 50), text.slice(Math.floor(text.length / 2) - 25, Math.floor(text.length / 2) + 25), text.slice(-50)];
    return segments.map((s) => s.length.toString(36) + ':' + s.replace(/\s/g, '').length.toString(36)).join('|');
  }, []);

  // ── Time Dimension: 叙事时间线锚定 ──
  const extractTimeDimension = useCallback((text: string): Pick<DSMemoryNode, 'detail' | 'confidence'> => {
    let signals = 0;
    let total = 0;
    const foundTemporal: string[] = [];
    const foundTense: string[] = [];

    TEMPORAL_WORDS.forEach((w) => {
      total++;
      if (text.includes(w)) { signals++; foundTemporal.push(w); }
    });
    TENSE_MARKERS.forEach((w) => {
      total++;
      if (text.includes(w)) { signals++; foundTense.push(w); }
    });

    // 检测时间推进感 — 连续动作链
    const actionChainPattern = /(?:了|后|完|罢)(?:，|,|。|\s*)(?:便|就|又|再|才|却)/g;
    const actionChains = (text.match(actionChainPattern) || []).length;
    signals += Math.min(actionChains, 5);
    total += 5;

    const confidence = total > 0 ? signals / total : 0;

    const temporalSummary = foundTemporal.slice(0, 3).join('·');
    const tenseSummary = foundTense.length > 0 ? `时态:${foundTense.slice(0, 2).join(',')}` : '';
    const chainSummary = actionChains > 0 ? `动作链×${actionChains}` : '';
    const detail = [temporalSummary, tenseSummary, chainSummary].filter(Boolean).join(' | ') || '时间维度待建立';

    return { detail, confidence: Math.round(confidence * 100) / 100 };
  }, []);

  // ── Token Fingerprint: 语言指纹/风格标记 ──
  const extractTokenFingerprint = useCallback((text: string): Pick<DSMemoryNode, 'detail' | 'confidence'> => {
    const foundStyles: string[] = [];
    let totalMarkers = 0;
    let matchedMarkers = 0;

    Object.entries(STYLE_MARKERS).forEach(([marker, label]) => {
      totalMarkers++;
      if (text.includes(marker)) { foundStyles.push(label); matchedMarkers++; }
    });

    // 检测句长分布特征
    const sentences = text.split(/[。！？\n]/).filter((s) => s.trim().length > 0);
    const avgLen = sentences.length > 0 ? sentences.reduce((a, s) => a + s.length, 0) / sentences.length : 0;
    const styleLabel = avgLen > 30 ? '长句铺陈型' : avgLen > 15 ? '中短均衡型' : '短句利落型';

    // 检测对话与叙述比例
    const dialogueChars = (text.match(/[""「」『』].*?[""「」『』]/g) || []).reduce((a, s) => a + s.length, 0);
    const dialogueRatio = text.length > 0 ? dialogueChars / text.length : 0;
    const ratioLabel = dialogueRatio > 0.3 ? '对话主导' : dialogueRatio > 0.1 ? '叙述为主·对话点缀' : '纯叙述流';

    const confidence = totalMarkers > 0 ? matchedMarkers / totalMarkers : 0;
    const uniqueStyles = [...new Set(foundStyles)].slice(0, 3);
    const detail = `${styleLabel} | ${ratioLabel}${uniqueStyles.length > 0 ? ' | 标记:' + uniqueStyles.join('·') : ''}`;

    return { detail, confidence: Math.round(confidence * 100) / 100 };
  }, []);

  // ── Situational Inference: 场景态势推断 ──
  const extractSituationalInference = useCallback((text: string): Pick<DSMemoryNode, 'detail' | 'confidence'> => {
    const scores = TENSION_PATTERNS.map(({ pattern, label }) => {
      const matches = (text.match(pattern) || []).length;
      return { label, score: matches };
    }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

    const topPatterns = scores.slice(0, 2);
    const totalMatches = scores.reduce((a, s) => a + s.score, 0);
    const confidence = Math.min(totalMatches / 10, 1.0); // Normalize: 10+ matches = full confidence

    if (topPatterns.length === 0) {
      return { detail: '情境态势待推断 — 文本尚未形成明确冲突结构', confidence: 0 };
    }

    // 检测场景边界 — 地点变化
    const placeChange = text.match(/(?:来到|走到|回到|进入|离开|穿过|越过)[一-鿿]{2,6}/g);
    const placeLabel = placeChange && placeChange.length > 0 ? `场景迁移×${placeChange.length}` : '场景稳定';

    const detail = `${topPatterns.map((t) => t.label).join('·')} | ${placeLabel} | 张力密度:${totalMatches}`;

    return { detail, confidence: Math.round(confidence * 100) / 100 };
  }, []);

  // ── 主提取逻辑 ──
  const extractNodes = useCallback((text: string): DSMemoryNode[] => {
    const now = Date.now();
    const timeDim = extractTimeDimension(text);
    const tokenFp = extractTokenFingerprint(text);
    const sitInf = extractSituationalInference(text);

    return [
      {
        id: `time-${now}`,
        label: 'Time Dimension' as const,
        detail: timeDim.detail,
        confidence: timeDim.confidence,
        updatedAt: now,
      },
      {
        id: `token-${now}`,
        label: 'Token Fingerprint' as const,
        detail: tokenFp.detail,
        confidence: tokenFp.confidence,
        updatedAt: now,
      },
      {
        id: `situ-${now}`,
        label: 'Situational Inference' as const,
        detail: sitInf.detail,
        confidence: sitInf.confidence,
        updatedAt: now,
      },
    ];
  }, [extractTimeDimension, extractTokenFingerprint, extractSituationalInference]);

  // ── 2500ms 防抖生命周期 ──
  useEffect(() => {
    if (!content || content.length < 50) return;

    const fp = computeFingerprint(content);
    if (fp === lastKnownHashRef.current) return; // 无实质变化，跳过

    if (timerRef.current) clearTimeout(timerRef.current);
    setIsSyncing(false);

    timerRef.current = setTimeout(() => {
      setIsSyncing(true);
      lastKnownHashRef.current = fp;

      // 模拟 DeepSeek 增量推理延迟（微小的异步让步）
      requestAnimationFrame(() => {
        const extracted = extractNodes(content);
        setNodes(extracted);
        setContentHash(fp);
        setLastSync(Date.now());
        setIsSyncing(false);

        // 持久化到全局记忆
        if (currentNovel) {
          const summary = extracted
            .map((n) => `[${n.label}] ${n.detail} (置信度:${(n.confidence * 100).toFixed(0)}%)`)
            .join('\n');
          updateGlobalMemory(currentNovel.id, { notes: summary });
        }
      });
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, delay, computeFingerprint, extractNodes, currentNovel?.id, updateGlobalMemory]);

  return { nodes, isSyncing, lastSync, contentHash };
}
