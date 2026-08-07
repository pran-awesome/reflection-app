import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const POINTER_REF = doc(db, 'system', 'currentSession');

// Guarantees the host always has a usable session to edit: reuses the
// current pointer's session while it's idle/presenting, otherwise creates
// a fresh idle draft (old sessions stay untouched in `sessions` for history).
export async function ensureDraftSession() {
  const pointerSnap = await getDoc(POINTER_REF);
  const activeId = pointerSnap.exists() ? pointerSnap.data().activeSessionId : null;

  if (activeId) {
    const sessionSnap = await getDoc(doc(db, 'sessions', activeId));
    if (sessionSnap.exists() && sessionSnap.data().status !== 'ended') {
      return activeId;
    }
  }

  const newSessionRef = doc(collection(db, 'sessions'));
  await setDoc(newSessionRef, {
    title: '',
    status: 'idle',
    currentPageIndex: -1,
    createdAt: serverTimestamp(),
    endedAt: null,
  });
  await setDoc(POINTER_REF, { activeSessionId: newSessionRef.id });
  return newSessionRef.id;
}

export function updateSessionTitle(sessionId, title) {
  return updateDoc(doc(db, 'sessions', sessionId), { title });
}

export function startPresenting(sessionId) {
  return updateDoc(doc(db, 'sessions', sessionId), {
    status: 'presenting',
    currentPageIndex: -1,
  });
}

export function setCurrentPageIndex(sessionId, index) {
  return updateDoc(doc(db, 'sessions', sessionId), { currentPageIndex: index });
}

export function endSession(sessionId) {
  return updateDoc(doc(db, 'sessions', sessionId), {
    status: 'ended',
    endedAt: serverTimestamp(),
  });
}
