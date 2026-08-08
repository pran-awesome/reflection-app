const DEFAULT_DURATION_SEC = 3;
const DEFAULT_TRANSITION_MS = 500;

export const SLIDESHOW_ANIMATIONS = [
  { value: 'fade', label: 'เฟดเข้า' },
  { value: 'slideUp', label: 'เลื่อนขึ้น' },
  { value: 'slideDown', label: 'เลื่อนลง' },
  { value: 'slideLeft', label: 'เลื่อนซ้าย' },
  { value: 'slideRight', label: 'เลื่อนขวา' },
  { value: 'scaleIn', label: 'ขยายเข้า' },
  { value: 'none', label: 'ไม่มี (ตัดตรง)' },
];

export const SLIDESHOW_TRANSITION_SPEEDS = [
  { value: 250, label: 'เร็ว (0.25 วิ)' },
  { value: 500, label: 'ปกติ (0.5 วิ)' },
  { value: 800, label: 'ช้า (0.8 วิ)' },
  { value: 1200, label: 'ช้ามาก (1.2 วิ)' },
];

export function clampTransitionMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return DEFAULT_TRANSITION_MS;
  return Math.min(2000, Math.max(100, Math.round(n)));
}

export function clampDurationSec(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n)) return DEFAULT_DURATION_SEC;
  return Math.min(15, Math.max(2, Math.round(n)));
}

const VALID_ANIMATIONS = new Set(SLIDESHOW_ANIMATIONS.map((opt) => opt.value));

/**
 * A slideshow item can be a plain string (legacy), `{ text, animation }`, or
 * `{ text, animation, durationSec }`. This normalizes any shape to an object,
 * falling back to the page-level animation (or 'fade') and page-level
 * durationSec (or 3s) when the item has none of its own.
 */
export function normalizeSlideshowItem(item, fallbackAnimation = 'fade', fallbackDurationSec = DEFAULT_DURATION_SEC) {
  const animation = VALID_ANIMATIONS.has(fallbackAnimation) ? fallbackAnimation : 'fade';
  if (item && typeof item === 'object') {
    return {
      text: typeof item.text === 'string' ? item.text : '',
      animation: VALID_ANIMATIONS.has(item.animation) ? item.animation : animation,
      durationSec: clampDurationSec(item.durationSec ?? fallbackDurationSec),
    };
  }
  return {
    text: typeof item === 'string' ? item : '',
    animation,
    durationSec: clampDurationSec(fallbackDurationSec),
  };
}

/** Display text for a raw item (string or `{ text, animation }`), e.g. in lists/summaries. */
export function getSlideshowItemText(item) {
  return normalizeSlideshowItem(item).text;
}

/**
 * Derives which slideshow item should be showing right now from the page's
 * static content (items/durationSec/loop) plus its synced slideshowState
 * (playing/startIndex/startedAt). Every client computes this the same way
 * from the same Firestore doc, so TV/participant/host stay in step without
 * per-tick writes.
 */
export function getSlideshowSnapshot(page, nowMs = Date.now()) {
  const fallbackAnimation = page?.content?.animation || 'fade';
  const fallbackDurationSec = page?.content?.durationSec || DEFAULT_DURATION_SEC;
  const items = (page?.content?.items || []).map((item) =>
    normalizeSlideshowItem(item, fallbackAnimation, fallbackDurationSec)
  );
  const loop = page?.content?.loop !== false;
  const state = page?.slideshowState || {};
  const playing = state.playing !== false;
  const startIndex = Number.isFinite(state.startIndex) ? state.startIndex : 0;

  if (items.length === 0) {
    return { index: 0, item: null, items, playing: false, loop, durationMs: 0, done: true };
  }

  const clampedStartIndex = Math.min(Math.max(startIndex, 0), items.length - 1);

  if (!playing) {
    const durationMs = items[clampedStartIndex].durationSec * 1000;
    return { index: clampedStartIndex, item: items[clampedStartIndex], items, playing: false, loop, durationMs, done: false };
  }

  const startedAtMs = state.startedAt?.toMillis ? state.startedAt.toMillis() : nowMs;
  let elapsedMs = Math.max(0, nowMs - startedAtMs);

  if (loop) {
    const totalDurationMs = items.reduce((sum, it) => sum + it.durationSec * 1000, 0);
    if (totalDurationMs > 0) elapsedMs %= totalDurationMs;
  }

  // Walk item-by-item from startIndex, consuming each item's own duration,
  // since durations can differ per item and a fixed step size no longer applies.
  let index = clampedStartIndex;
  let done = false;
  for (;;) {
    const currentDurationMs = items[index].durationSec * 1000;
    if (elapsedMs < currentDurationMs) break;
    elapsedMs -= currentDurationMs;
    if (index + 1 < items.length) {
      index += 1;
    } else if (loop) {
      index = 0;
    } else {
      done = true;
      break;
    }
  }

  const durationMs = items[index].durationSec * 1000;
  return { index, item: items[index], items, playing: true, loop, durationMs, done };
}
