import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function submitAnswer(sessionId, pageId, participantId, name, text, extras = {}) {
  return setDoc(doc(db, 'sessions', sessionId, 'pages', pageId, 'answers', participantId), {
    participantId,
    name,
    text,
    createdAt: serverTimestamp(),
    showOnTV: false,
    showOnMobile: false,
    ...extras,
  });
}

/** Split question: two required fields; `text` is combined for float/search/CSV */
export function submitSplitAnswer(sessionId, pageId, participantId, name, textA, textB) {
  const a = textA.trim();
  const b = textB.trim();
  return submitAnswer(sessionId, pageId, participantId, name, `${a}\n${b}`, {
    textA: a,
    textB: b,
  });
}

export function setAnswerShowOnTV(sessionId, pageId, answerId, value) {
  return updateDoc(doc(db, 'sessions', sessionId, 'pages', pageId, 'answers', answerId), {
    showOnTV: value,
  });
}

export function setAnswerShowOnMobile(sessionId, pageId, answerId, value) {
  return updateDoc(doc(db, 'sessions', sessionId, 'pages', pageId, 'answers', answerId), {
    showOnMobile: value,
  });
}
