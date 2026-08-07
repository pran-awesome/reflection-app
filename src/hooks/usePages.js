import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

export function usePages(sessionId) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setPages([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const q = query(collection(db, 'sessions', sessionId, 'pages'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setPages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [sessionId]);

  return { pages, loading };
}
