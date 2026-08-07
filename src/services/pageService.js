import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

export function newPageRef(ownerId, scope = 'sessions') {
  return doc(collection(db, scope, ownerId, 'pages'));
}

export function savePage(ownerId, pageId, { order, type, title, content }, scope = 'sessions') {
  return setDoc(
    doc(db, scope, ownerId, 'pages', pageId),
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

export function deletePage(ownerId, pageId, scope = 'sessions') {
  return deleteDoc(doc(db, scope, ownerId, 'pages', pageId));
}

export async function reorderPages(ownerId, orderedPageIds, scope = 'sessions') {
  const batch = writeBatch(db);
  orderedPageIds.forEach((pageId, index) => {
    batch.update(doc(db, scope, ownerId, 'pages', pageId), { order: index });
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

export async function copyPages(fromScope, fromId, toScope, toId) {
  const snap = await getDocs(query(collection(db, fromScope, fromId, 'pages'), orderBy('order', 'asc')));
  if (snap.empty) return 0;

  let batch = writeBatch(db);
  let ops = 0;
  for (const pageDoc of snap.docs) {
    const data = pageDoc.data();
    const dest = doc(collection(db, toScope, toId, 'pages'));
    batch.set(dest, {
      order: data.order ?? ops,
      type: data.type,
      title: data.title || '',
      content: data.content || {},
      ...(data.type === 'video' ? { videoState: { playing: false, startedAt: null } } : {}),
    });
    ops += 1;
    if (ops % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  await batch.commit();
  return snap.size;
}
