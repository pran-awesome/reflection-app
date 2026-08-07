import { collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export function newPageRef(sessionId) {
  return doc(collection(db, 'sessions', sessionId, 'pages'));
}

export function savePage(sessionId, pageId, { order, type, title, content }) {
  return setDoc(
    doc(db, 'sessions', sessionId, 'pages', pageId),
    {
      order,
      type,
      title,
      content,
      ...(type === 'video' ? { videoState: { playing: false, startedAt: null } } : {}),
    },
    { merge: true }
  );
}

export function deletePage(sessionId, pageId) {
  return deleteDoc(doc(db, 'sessions', sessionId, 'pages', pageId));
}

export async function reorderPages(sessionId, orderedPageIds) {
  const batch = writeBatch(db);
  orderedPageIds.forEach((pageId, index) => {
    batch.update(doc(db, 'sessions', sessionId, 'pages', pageId), { order: index });
  });
  await batch.commit();
}

export function setVideoPlaying(sessionId, pageId, playing) {
  const updates = { 'videoState.playing': playing };
  if (playing) {
    updates['videoState.startedAt'] = serverTimestamp();
  }
  return updateDoc(doc(db, 'sessions', sessionId, 'pages', pageId), updates);
}
