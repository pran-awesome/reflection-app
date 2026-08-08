import { useEffect, useRef, useState } from 'react';

// Must match the CSS exit duration (.slide-transition--exit) in global.css.
const EXIT_MS = 140;

/**
 * Crossfades content when `slideKey` changes: fades/slides the current
 * content out, swaps in the new children, then fades/slides it in.
 * When `slideKey` is unchanged, children update immediately with no
 * animation (e.g. live badge counts, play/pause toggles).
 */
export default function SlideTransition({ slideKey, children, className = '' }) {
  const [displayKey, setDisplayKey] = useState(slideKey);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState('enter');
  const timerRef = useRef(null);

  useEffect(() => {
    if (slideKey === displayKey) {
      setDisplayChildren(children);
      return undefined;
    }
    setPhase('exit');
    timerRef.current = setTimeout(() => {
      setDisplayKey(slideKey);
      setDisplayChildren(children);
      setPhase('enter');
    }, EXIT_MS);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideKey, children]);

  const classes = ['slide-transition', `slide-transition--${phase}`, className].filter(Boolean).join(' ');

  return <div className={classes}>{displayChildren}</div>;
}
