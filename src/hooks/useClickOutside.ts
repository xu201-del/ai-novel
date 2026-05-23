import { useEffect, useRef, type RefObject } from 'react';

/**
 * 事件遮蔽与垃圾回收 — useRef 死锁 DOM 节点，
 * 在捕获阶段拦截 mousedown/touchstart 以实现完全事件层隔离。
 */
export function useClickOutside<T extends HTMLElement>(
  handler: () => void,
  enabled: boolean = true
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const listener = (e: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      handler();
    };

    // 捕获阶段注册 — 在目标元素的事件处理器之前拦截，实现事件遮蔽
    document.addEventListener('mousedown', listener, true);
    document.addEventListener('touchstart', listener, true);
    return () => {
      document.removeEventListener('mousedown', listener, true);
      document.removeEventListener('touchstart', listener, true);
    };
  }, [handler, enabled]);

  return ref;
}
