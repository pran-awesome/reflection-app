import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_MAX_ITEMS = 22;
const DEFAULT_LIFETIME_MS = 5500;

export function useFloatingQueue(maxItems = DEFAULT_MAX_ITEMS, lifetimeMs = DEFAULT_LIFETIME_MS) {
  const [items, setItems] = useState([]);
  const timers = useRef(new Map());

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (data) => {
      const id = data.id ?? `${Date.now()}-${Math.random()}`;
      const left = 4 + Math.random() * 88; // vw percent, keep away from edges
      const driftX = Math.round((Math.random() - 0.5) * 160); // px
      const duration = 4 + Math.random() * 2; // 4-6s per spec
      const delay = Math.random() * 0.4;
      const item = { ...data, id, left, driftX, duration, delay };

      setItems((prev) => {
        const next = prev.length >= maxItems ? prev.slice(prev.length - maxItems + 1) : prev;
        return [...next, item];
      });

      const t = setTimeout(() => remove(id), (duration + delay) * 1000 + 300);
      timers.current.set(id, t);
    },
    [maxItems, remove]
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  return { items, push, remove };
}
