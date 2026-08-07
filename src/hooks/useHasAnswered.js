import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useHasAnswered(sessionId, pageId, participantId) {
  const [hasAnswered, setHasAnswered] = useState(false);

  useEffect(() => {
    if (!sessionId || !pageId || !participantId) {
      setHasAnswered(false);
      return undefined;
    }
    const ref = doc(db, 'sessions', sessionId, 'pages', pageId, 'answers', participantId);
    const unsub = onSnapshot(ref, (snap) => setHasAnswered(snap.exists()));
    return unsub;
  }, [sessionId, pageId, participantId]);

  return hasAnswered;
}
