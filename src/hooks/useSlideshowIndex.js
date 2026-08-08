import { useEffect, useState } from 'react';
import { getSlideshowSnapshot } from '../lib/slideshow';

const TICK_MS = 250;

/** Ticks a text_slideshow page forward locally, re-deriving the current item from shared state. */
export function useSlideshowIndex(page) {
  const [snapshot, setSnapshot] = useState(() => getSlideshowSnapshot(page));

  useEffect(() => {
    setSnapshot(getSlideshowSnapshot(page));
    if (!page || page.slideshowState?.playing === false) return undefined;
    const id = setInterval(() => setSnapshot(getSlideshowSnapshot(page)), TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page?.id,
    page?.content,
    page?.slideshowState?.playing,
    page?.slideshowState?.startIndex,
    page?.slideshowState?.startedAt,
  ]);

  return snapshot;
}
