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
    let isFirst = true;
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAnswers(list);

      if (!onAddedRef.current) return;

      if (isFirst) {
        isFirst = false;
        // Seed oldest → newest so the floating queue can drop oldest when full
        [...list].reverse().forEach((answer) => onAddedRef.current(answer));
        return;
      }

      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          onAddedRef.current({ id: change.doc.id, ...change.doc.data() });
        }
      });
    });
    return unsub;
  }, [sessionId, pageId, limitCount]);

  return answers;
}
