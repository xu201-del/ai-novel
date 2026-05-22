import { useEffect, useRef, useState, useCallback } from 'react';
import { useNovelStore } from '@/stores/novel-store';

interface MemoryNode {
  id: string;
  label: string;
  detail: string;
  updatedAt: number;
}

export function useDebouncedMemorySync(
  content: string,
  delay: number = 2500
): { nodes: MemoryNode[]; isSyncing: boolean; lastSync: number | null } {
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const updateGlobalMemory = useNovelStore((s) => s.updateGlobalMemory);
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const extractNodes = useCallback((text: string): MemoryNode[] => {
    // Extract 3 key narrative threads from content:
    // 1. Character focus — who is acting
    // 2. Location/mood — where and atmosphere
    // 3. Conflict thread — the tension driving forward
    const nodes: MemoryNode[] = [];

    // Character detection — find named entities (Chinese 2-3 char names)
    const namePattern = /([一-鿿]{2,3})(?:缓缓|忽然|突然|默默|轻轻|紧紧|死死|慢慢)?(?:说|道|问|想|看|走|站|坐|笑|哭)/g;
    const names = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = namePattern.exec(text)) !== null) {
      if (!names.has(m[1]) && names.size < 3) names.add(m[1]);
    }
    if (names.size > 0) {
      nodes.push({
        id: 'char-' + Date.now(),
        label: '人物焦点',
        detail: Array.from(names).slice(0, 3).join('、'),
        updatedAt: Date.now(),
      });
    }

    // Location/mood extraction — look for scene-setting language
    const locationPattern = /(?:在|到|从|往)([一-鿿]{2,6})(?:中|里|外|前|后|上|下|边|处)/g;
    const locations = new Set<string>();
    while ((m = locationPattern.exec(text)) !== null) {
      if (!locations.has(m[1]) && locations.size < 2) locations.add(m[1]);
    }
    if (locations.size > 0) {
      nodes.push({
        id: 'loc-' + Date.now(),
        label: '场景锚点',
        detail: Array.from(locations).slice(0, 2).join('、'),
        updatedAt: Date.now(),
      });
    }

    // Conflict detection — tension keywords
    const tensionTerms = ['危险', '杀', '死', '逃', '追', '破', '裂', '碎', '暗', '秘密', '谎', '骗', '恨', '怒', '恐', '惧', '血', '伤', '痛'];
    const foundTensions = tensionTerms.filter((t) => text.includes(t)).slice(0, 3);
    if (foundTensions.length > 0) {
      nodes.push({
        id: 'conflict-' + Date.now(),
        label: '冲突线索',
        detail: foundTensions.join(' · '),
        updatedAt: Date.now(),
      });
    }

    return nodes;
  }, []);

  useEffect(() => {
    if (!content || content.length < 50) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    setIsSyncing(false);

    timerRef.current = setTimeout(() => {
      setIsSyncing(true);
      const extracted = extractNodes(content);
      setNodes(extracted);
      setLastSync(Date.now());
      setIsSyncing(false);

      // Persist to global memory
      if (currentNovel) {
        const summary = extracted.map((n) => `${n.label}: ${n.detail}`).join(' | ');
        updateGlobalMemory(currentNovel.id, { notes: summary });
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, delay, extractNodes, currentNovel?.id]);

  return { nodes, isSyncing, lastSync };
}
