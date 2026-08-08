/** Pages that collect participant text answers */
export function isAnswerPage(type) {
  return type === 'question' || type === 'split_question';
}

/** True when answer has split_question fields */
export function isSplitAnswer(answer) {
  return answer?.textA != null || answer?.textB != null;
}

/** Display string for float / spotlight / cards (single-line fallback) */
export function formatAnswerDisplay(answer) {
  const a = (answer?.textA || '').trim();
  const b = (answer?.textB || '').trim();
  if (a || b) {
    if (a && b) return `${a}\n${b}`;
    return a || b;
  }
  return (answer?.text || '').trim();
}

/** Payload for floating / live answer queues */
export function toFloatingItem(answer) {
  const item = { id: answer.id, name: answer.name };
  if (isSplitAnswer(answer)) {
    item.textA = answer.textA ?? '';
    item.textB = answer.textB ?? '';
  } else {
    item.text = formatAnswerDisplay(answer);
  }
  return item;
}

/** Blob used by host search (name + all answer fields) */
export function formatAnswerSearchBlob(answer) {
  return [answer?.name, answer?.text, answer?.textA, answer?.textB]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
