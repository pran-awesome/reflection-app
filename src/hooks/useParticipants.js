import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useParticipantCount(sessionId) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setCount(0);
      return undefined;
    }
    const unsub = onSnapshot(collection(db, 'sessions', sessionId, 'participants'), (snap) => {
      setCount(snap.size);
    });
    return unsub;
  }, [sessionId]);

  return count;
}
