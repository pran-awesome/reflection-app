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
import { submitAnswer, submitSplitAnswer } from '../../services/answerService';
import { formatAnswerDisplay, isAnswerPage } from '../../lib/answers';

function QuestionAnswer({ sessionId, page, participantId }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const hasAnswered = useHasAnswered(sessionId, page.id, participantId);

  const { items, push, remove } = useFloatingQueue(12);
  const answers = useAnswers(sessionId, page.id, {
    limitCount: 30,
    onAdded: (answer) =>
      push({ id: answer.id, name: answer.name, text: formatAnswerDisplay(answer) }),
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

      <Spotlight answers={answers} field="showOnMobile" page={page} />
      <FloatingAnswers items={items} remove={remove} variant="mobile" />
    </div>
  );
}

function SplitQuestionAnswer({ sessionId, page, participantId }) {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const hasAnswered = useHasAnswered(sessionId, page.id, participantId);

  const { items, push, remove } = useFloatingQueue(12);
  const answers = useAnswers(sessionId, page.id, {
    limitCount: 30,
    onAdded: (answer) =>
      push({ id: answer.id, name: answer.name, text: formatAnswerDisplay(answer) }),
  });

  useEffect(() => {
    setTextA('');
    setTextB('');
    setError('');
  }, [page.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    const a = textA.trim();
    const b = textB.trim();
    if (a.length === 0 || a.length > 280 || b.length === 0 || b.length > 280) {
      setError('กรุณาพิมพ์คำตอบทั้งสองช่อง ช่องละ 1–280 ตัวอักษร');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitSplitAnswer(sessionId, page.id, participantId, getStoredName(), a, b);
    } catch (err) {
      setError('ส่งคำตอบไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  }

  const promptA = page.content?.promptA || 'ช่องที่ 1';
  const promptB = page.content?.promptB || 'ช่องที่ 2';

  return (
    <div className="stack" style={{ position: 'relative', minHeight: '70vh' }}>
      <h1 className="h1">{page.title}</h1>

      {hasAnswered ? (
        <div className="card">
          <p className="body-text">ส่งคำตอบแล้ว ขอบคุณค่ะ 🙏</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="stack">
          <div className="split-answer-grid">
            <div className="stack">
              <label className="field-label">{promptA}</label>
              <textarea
                className="textarea"
                value={textA}
                maxLength={280}
                onChange={(e) => setTextA(e.target.value)}
                placeholder="พิมพ์คำตอบ..."
              />
              <span className="caption">{textA.length}/280</span>
            </div>
            <div className="stack">
              <label className="field-label">{promptB}</label>
              <textarea
                className="textarea"
                value={textB}
                maxLength={280}
                onChange={(e) => setTextB(e.target.value)}
                placeholder="พิมพ์คำตอบ..."
              />
              <span className="caption">{textB.length}/280</span>
            </div>
          </div>
          {error && <p className="body-small text-danger">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'กำลังส่ง...' : 'ส่งคำตอบ'}
          </button>
        </form>
      )}

      <Spotlight answers={answers} field="showOnMobile" page={page} />
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

  if (isAnswerPage(currentPage.type)) {
    const AnswerUI = currentPage.type === 'split_question' ? SplitQuestionAnswer : QuestionAnswer;
    return (
      <div className="page">
        <div className="page-padded">
          <AnswerUI sessionId={sessionId} page={currentPage} participantId={participantId} />
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
