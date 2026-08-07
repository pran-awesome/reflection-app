import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function submitAnswer(sessionId, pageId, participantId, name, text) {
  return setDoc(doc(db, 'sessions', sessionId, 'pages', pageId, 'answers', participantId), {
    participantId,
    name,
    text,
    createdAt: serverTimestamp(),
    showOnTV: false,
    showOnMobile: false,
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
