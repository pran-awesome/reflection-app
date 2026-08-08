import { useState } from 'react';

const DEFAULT_LIMIT = 90;

function TruncateBlock({ text, limit = DEFAULT_LIMIT, expandable = false }) {
  const [expanded, setExpanded] = useState(false);
  const full = (text || '').trim() || '—';
  const needsTruncate = full.length > limit;
  const shown = !needsTruncate || expanded ? full : `${full.slice(0, limit).trimEnd()}…`;

  return (
    <>
      <p className="answer-text">{shown}</p>
      {expandable && needsTruncate && (
        <button
          type="button"
          className="answer-expand-btn"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'ย่อ' : 'ดูเพิ่มเติม'}
        </button>
      )}
    </>
  );
}

/** Renders single-answer text, or two boxed halves for split_question. */
export default function AnswerText({ text, textA, textB, expandable = false, limit = DEFAULT_LIMIT }) {
  if (textA !== undefined || textB !== undefined) {
    const a = (textA || '').trim();
    const b = (textB || '').trim();
    return (
      <div className="answer-split">
        <div className="answer-split-box">
          <TruncateBlock text={a || '—'} limit={limit} expandable={expandable} />
        </div>
        <div className="answer-split-box">
          <TruncateBlock text={b || '—'} limit={limit} expandable={expandable} />
        </div>
      </div>
    );
  }
  return <TruncateBlock text={text} limit={limit} expandable={expandable} />;
}
