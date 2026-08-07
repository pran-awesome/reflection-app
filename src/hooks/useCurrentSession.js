import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useCurrentSession() {
  const [sessionId, setSessionId] = useState(undefined);
  const [session, setSession] = useState(null);
  const [pointerLoading, setPointerLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'currentSession'), (snap) => {
      setSessionId(snap.exists() ? snap.data().activeSessionId || null : null);
      setPointerLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setSessionLoading(false);
      return undefined;
    }
    setSessionLoading(true);
    const unsub = onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
      setSession(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setSessionLoading(false);
    });
    return unsub;
  }, [sessionId]);

  return {
    sessionId: sessionId || null,
    session,
    loading: pointerLoading || sessionLoading,
  };
}
