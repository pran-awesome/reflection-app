/** Pages that collect participant text answers */
export function isAnswerPage(type) {
  return type === 'question' || type === 'split_question';
}

/** Display string for float / spotlight / cards */
export function formatAnswerDisplay(answer) {
  const a = (answer?.textA || '').trim();
  const b = (answer?.textB || '').trim();
  if (a || b) {
    if (a && b) return `${a}\n${b}`;
    return a || b;
  }
  return (answer?.text || '').trim();
}

/** Blob used by host search (name + all answer fields) */
export function formatAnswerSearchBlob(answer) {
  return [answer?.name, answer?.text, answer?.textA, answer?.textB]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
