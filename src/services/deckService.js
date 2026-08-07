import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { copyPages } from './pageService';

const POINTER_REF = doc(db, 'system', 'currentSession');

export async function createDeck(title = '') {
  const ref = doc(collection(db, 'decks'));
  await setDoc(ref, {
    title: title.trim(),
    pageCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function updateDeckTitle(deckId, title) {
  return updateDoc(doc(db, 'decks', deckId), {
    title: title.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function refreshDeckPageCount(deckId) {
  const snap = await getDocs(collection(db, 'decks', deckId, 'pages'));
  await updateDoc(doc(db, 'decks', deckId), {
    pageCount: snap.size,
    updatedAt: serverTimestamp(),
  });
  return snap.size;
}

export async function deleteDeck(deckId) {
  const pagesSnap = await getDocs(collection(db, 'decks', deckId, 'pages'));
  let batch = writeBatch(db);
  let ops = 0;
  for (const pageDoc of pagesSnap.docs) {
    batch.delete(pageDoc.ref);
    ops += 1;
    if (ops % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  batch.delete(doc(db, 'decks', deckId));
  await batch.commit();
}

/** Save the current idle session pages as a reusable deck */
export async function saveSessionAsDeck(sessionId, title) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('Title required');

  const deckRef = doc(collection(db, 'decks'));
  await setDoc(deckRef, {
    title: trimmed,
    pageCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const pageCount = await copyPages('sessions', sessionId, 'decks', deckRef.id);
  await updateDoc(deckRef, { pageCount, updatedAt: serverTimestamp() });
  return deckRef.id;
}

/**
 * Clone a saved deck into a fresh live session and start presenting.
 * Fixed TV/join links automatically follow the new active session.
 */
export async function presentDeck(deckId) {
  const deckSnap = await getDoc(doc(db, 'decks', deckId));
  if (!deckSnap.exists()) throw new Error('Deck not found');
  const deck = deckSnap.data();

  const pointerSnap = await getDoc(POINTER_REF);
  const previousSessionId = pointerSnap.exists() ? pointerSnap.data().activeSessionId : null;

  const sessionRef = doc(collection(db, 'sessions'));
  await setDoc(sessionRef, {
    title: deck.title || '',
    status: 'presenting',
    currentPageIndex: -1,
    createdAt: serverTimestamp(),
    endedAt: null,
    fromDeckId: deckId,
  });

  await copyPages('decks', deckId, 'sessions', sessionRef.id);
  await setDoc(POINTER_REF, { activeSessionId: sessionRef.id });

  // The session the pointer used to point to is now orphaned (no longer
  // reachable via /tv or /join) — close it out so it doesn't linger forever
  // as "in preparation"/"presenting" in history.
  if (previousSessionId && previousSessionId !== sessionRef.id) {
    const prevSnap = await getDoc(doc(db, 'sessions', previousSessionId));
    if (prevSnap.exists() && prevSnap.data().status !== 'ended') {
      await updateDoc(doc(db, 'sessions', previousSessionId), {
        status: 'ended',
        endedAt: serverTimestamp(),
      });
    }
  }

  return sessionRef.id;
}
