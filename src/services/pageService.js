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
      ...(type === 'text_slideshow'
        ? { slideshowState: { playing: true, startIndex: 0, startedAt: serverTimestamp() } }
        : {}),
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

/** startIndex = which item to resume/freeze at; startedAt anchors elapsed-time playback. */
export function setSlideshowPlaying(sessionId, pageId, playing, startIndex = 0) {
  const updates = { 'slideshowState.playing': playing, 'slideshowState.startIndex': startIndex };
  if (playing) {
    updates['slideshowState.startedAt'] = serverTimestamp();
  }
  return updateDoc(doc(db, 'sessions', sessionId, 'pages', pageId), updates);
}

/** Live-update text_slideshow transition settings (synced to TV/participant). */
export function updateSlideshowContent(sessionId, pageId, patch) {
  const updates = {};
  if (patch.items != null) updates['content.items'] = patch.items;
  if (patch.transitionMs != null) updates['content.transitionMs'] = patch.transitionMs;
  if (patch.durationSec != null) updates['content.durationSec'] = patch.durationSec;
  if (patch.loop != null) updates['content.loop'] = patch.loop;
  if (Object.keys(updates).length === 0) return Promise.resolve();
  return updateDoc(doc(db, 'sessions', sessionId, 'pages', pageId), updates);
}

/** Restarts a text_slideshow page from the first item — used when the host navigates onto it. */
export function resetSlideshow(sessionId, pageId) {
  return setSlideshowPlaying(sessionId, pageId, true, 0);
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
      ...(data.type === 'text_slideshow'
        ? { slideshowState: { playing: true, startIndex: 0, startedAt: serverTimestamp() } }
        : {}),
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
