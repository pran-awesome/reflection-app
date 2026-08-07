import { useCallback, useState } from 'react';

/**
 * Non-overlapping TV slots outside the center question barrier.
 * left/bottom/w/h are % of the viewport.
 */
const TV_SLOTS = [
  { left: 1.5, bottom: 4, w: 15.5, h: 13 },
  { left: 1.5, bottom: 19, w: 15.5, h: 13 },
  { left: 1.5, bottom: 34, w: 15.5, h: 13 },
  { left: 1.5, bottom: 49, w: 15.5, h: 13 },
  { left: 1.5, bottom: 64, w: 15.5, h: 13 },
  { left: 1.5, bottom: 79, w: 15.5, h: 13 },
  { left: 83, bottom: 4, w: 15.5, h: 13 },
  { left: 83, bottom: 19, w: 15.5, h: 13 },
  { left: 83, bottom: 34, w: 15.5, h: 13 },
  { left: 83, bottom: 49, w: 15.5, h: 13 },
  { left: 83, bottom: 64, w: 15.5, h: 13 },
  { left: 83, bottom: 79, w: 15.5, h: 13 },
  { left: 20, bottom: 2, w: 18, h: 12 },
  { left: 41, bottom: 2, w: 18, h: 12 },
  { left: 62, bottom: 2, w: 18, h: 12 },
  { left: 20, bottom: 15, w: 18, h: 12 },
  { left: 41, bottom: 15, w: 18, h: 12 },
  { left: 62, bottom: 15, w: 18, h: 12 },
];

function pickFreeSlot(occupiedSlotIndexes, slots) {
  const free = [];
  for (let i = 0; i < slots.length; i += 1) {
    if (!occupiedSlotIndexes.has(i)) free.push(i);
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

/**
 * @param {number} [maxItems]
 * @param {{ layout?: 'tv' | 'grid' }} [options]
 * layout `grid` = ordered list for CSS grid (participant mobile)
 * layout `tv` = absolute non-overlapping slots
 */
export function useFloatingQueue(maxItems = 12, { layout = 'grid' } = {}) {
  const [items, setItems] = useState([]);
  const isGrid = layout === 'grid';
  const slots = TV_SLOTS;
  const cap = isGrid ? maxItems : Math.min(maxItems, slots.length);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const push = useCallback(
    (data) => {
      const id = data.id ?? `${Date.now()}-${Math.random()}`;
      const duration = 0.35 + Math.random() * 0.2;

      setItems((prev) => {
        const existing = prev.find((it) => it.id === id);
        if (existing) {
          return prev.map((it) => (it.id === id ? { ...it, ...data, id, duration } : it));
        }

        if (isGrid) {
          const next = [...prev, { ...data, id, duration }];
          return next.length > cap ? next.slice(next.length - cap) : next;
        }

        let working = [...prev];
        let occupied = new Set(working.map((it) => it.slotIndex));

        while (working.length >= cap) {
          working = working.slice(1);
          occupied = new Set(working.map((it) => it.slotIndex));
        }

        let slotIndex = pickFreeSlot(occupied, slots);
        while (slotIndex == null && working.length > 0) {
          working = working.slice(1);
          occupied = new Set(working.map((it) => it.slotIndex));
          slotIndex = pickFreeSlot(occupied, slots);
        }
        if (slotIndex == null) {
          slotIndex = 0;
          working = [];
        }

        const slot = slots[slotIndex];
        return [
          ...working,
          {
            ...data,
            id,
            slotIndex,
            left: slot.left,
            bottom: slot.bottom,
            width: slot.w,
            height: slot.h,
            duration,
          },
        ];
      });
    },
    [cap, isGrid, slots]
  );

  return { items, push, remove };
}
