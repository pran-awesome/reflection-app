import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

export async function fetchSessionPagesWithAnswers(sessionId) {
  const pagesSnap = await getDocs(
    query(collection(db, 'sessions', sessionId, 'pages'), orderBy('order', 'asc'))
  );
  const pages = pagesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return Promise.all(
    pages.map(async (page) => {
      const answersSnap = await getDocs(
        query(collection(db, 'sessions', sessionId, 'pages', page.id, 'answers'), orderBy('createdAt', 'asc'))
      );
      return { ...page, answers: answersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) };
    })
  );
}
