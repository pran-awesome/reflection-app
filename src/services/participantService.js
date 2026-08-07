import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function joinSession(sessionId, participantId, name) {
  return setDoc(doc(db, 'sessions', sessionId, 'participants', participantId), {
    name,
    joinedAt: serverTimestamp(),
  });
}
