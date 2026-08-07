import { useEffect, useRef, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

export function useAnswers(sessionId, pageId, { limitCount = 30, onAdded } = {}) {
  const [answers, setAnswers] = useState([]);
  const onAddedRef = useRef(onAdded);
  onAddedRef.current = onAdded;

  useEffect(() => {
    if (!sessionId || !pageId) {
      setAnswers([]);
      return undefined;
    }
    const q = query(
      collection(db, 'sessions', sessionId, 'pages', pageId, 'answers'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added' && onAddedRef.current) {
          onAddedRef.current({ id: change.doc.id, ...change.doc.data() });
        }
      });
      setAnswers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [sessionId, pageId, limitCount]);

  return answers;
}
