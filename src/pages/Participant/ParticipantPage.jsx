import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentSession } from '../../hooks/useCurrentSession';
import { usePages } from '../../hooks/usePages';
import { useAnswers } from '../../hooks/useAnswers';
import { useHasAnswered } from '../../hooks/useHasAnswered';
import { useFloatingQueue } from '../../hooks/useFloatingQueue';
import FloatingAnswers from '../../components/FloatingAnswers/FloatingAnswers';
import Spotlight from '../../components/FloatingAnswers/Spotlight';
import { ensureAnonymousAuth } from '../../lib/auth';
import { getJoinedFlag, getStoredName } from '../../lib/localStorage';
import { submitAnswer } from '../../services/answerService';

function QuestionAnswer({ sessionId, page, participantId }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const hasAnswered = useHasAnswered(sessionId, page.id, participantId);

  const { items, push, remove } = useFloatingQueue(12);
  const answers = useAnswers(sessionId, page.id, {
    limitCount: 30,
    onAdded: (answer) => push({ id: answer.id, name: answer.name, text: answer.text }),
  });

  useEffect(() => {
    setText('');
    setError('');
  }, [page.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length === 0 || trimmed.length > 280) {
      setError('กรุณาพิมพ์คำตอบ 1–280 ตัวอักษร');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitAnswer(sessionId, page.id, participantId, getStoredName(), trimmed);
    } catch (err) {
      setError('ส่งคำตอบไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack" style={{ position: 'relative', minHeight: '70vh' }}>
      <h1 className="h1">{page.title}</h1>

      {hasAnswered ? (
        <div className="card">
          <p className="body-text">ส่งคำตอบแล้ว ขอบคุณค่ะ 🙏</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="stack">
          <textarea
            className="textarea"
            value={text}
            maxLength={280}
            onChange={(e) => setText(e.target.value)}
            placeholder="พิมพ์คำตอบของคุณ..."
          />
          <span className="caption">{text.length}/280</span>
          {error && <p className="body-small text-danger">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'กำลังส่ง...' : 'ส่งคำตอบ'}
          </button>
        </form>
      )}

      <Spotlight answers={answers} field="showOnMobile" />
      <FloatingAnswers items={items} remove={remove} variant="mobile" />
    </div>
  );
}

export default function ParticipantPage() {
  const [participantId, setParticipantId] = useState(null);
  const { session, sessionId, loading } = useCurrentSession();
  const { pages } = usePages(sessionId);

  useEffect(() => {
    ensureAnonymousAuth().then((user) => setParticipantId(user.uid));
  }, []);

  if (!getJoinedFlag()) {
    return <Navigate to="/join" replace />;
  }

  if (loading || !participantId) {
    return (
      <div className="page">
        <div className="empty-state">
          <p className="body-text">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!session || session.status === 'idle') {
    return (
      <div className="page">
        <div className="empty-state">
          <p className="h2">รอเริ่มงาน...</p>
        </div>
      </div>
    );
  }

  if (session.status === 'ended') {
    return (
      <div className="page">
        <div className="empty-state">
          <p className="h2">งานนี้จบแล้ว ขอบคุณที่เข้าร่วม 🙏</p>
        </div>
      </div>
    );
  }

  const currentPageIndex = session.currentPageIndex ?? -1;
  const currentPage = currentPageIndex >= 0 ? pages[currentPageIndex] : null;

  if (!currentPage) {
    return (
      <div className="page">
        <div className="empty-state">
          <p className="h2">กำลังจะเริ่มเร็วๆ นี้ โปรดรอสักครู่</p>
        </div>
      </div>
    );
  }

  if (currentPage.type === 'question') {
    return (
      <div className="page">
        <div className="page-padded">
          <QuestionAnswer sessionId={sessionId} page={currentPage} participantId={participantId} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="empty-state">
        <p className="h2">กำลังฉายอยู่บนจอทีวี</p>
        <p className="body-text text-secondary">โปรดดูที่จอทีวี</p>
      </div>
    </div>
  );
}
