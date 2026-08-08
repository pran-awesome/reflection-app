import { useSlideshowIndex } from '../../hooks/useSlideshowIndex';
import { clampTransitionMs } from '../../lib/slideshow';

const ANIMATION_CLASS = {
  fade: 'text-slideshow-item--fade',
  slideUp: 'text-slideshow-item--slideUp',
  slideDown: 'text-slideshow-item--slideDown',
  slideLeft: 'text-slideshow-item--slideLeft',
  slideRight: 'text-slideshow-item--slideRight',
  scaleIn: 'text-slideshow-item--scaleIn',
  none: 'text-slideshow-item--none',
};

const TEXT_CLASS = {
  tv: 'display-text',
  participant: 'h1',
  host: 'h2',
};

export default function TextSlideshow({ page, variant = 'tv' }) {
  const { index, item, items } = useSlideshowIndex(page);
  const animClass = ANIMATION_CLASS[item?.animation] || ANIMATION_CLASS.fade;
  const textClass = TEXT_CLASS[variant] || 'h2';
  const transitionMs = clampTransitionMs(page?.content?.transitionMs);

  if (items.length === 0) {
    return (
      <div className={`text-slideshow text-slideshow--${variant}`}>
        <p className="body-text text-secondary">ยังไม่มีข้อความ</p>
      </div>
    );
  }

  return (
    <div
      className={`text-slideshow text-slideshow--${variant}`}
      style={{ '--text-slideshow-duration': `${transitionMs}ms` }}
    >
      <p key={index} className={`text-slideshow-item ${animClass} ${textClass}`}>
        {item.text}
      </p>
      {items.length > 1 && (
        <div className="text-slideshow-dots" aria-hidden="true">
          {items.map((_, i) => (
            <span key={i} className={`text-slideshow-dot ${i === index ? 'active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}
