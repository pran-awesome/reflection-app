import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentSession } from '../../hooks/useCurrentSession';
import { usePages } from '../../hooks/usePages';
import { useAnswers } from '../../hooks/useAnswers';
import { useHasAnswered } from '../../hooks/useHasAnswered';
import { useFloatingQueue } from '../../hooks/useFloatingQueue';
import FloatingAnswers from '../../components/FloatingAnswers/FloatingAnswers';
import Spotlight from '../../components/FloatingAnswers/Spotlight';
import SlideTransition from '../../components/SlideTransition/SlideTransition';
import TextSlideshow from '../../components/TextSlideshow/TextSlideshow';
import { ensureAnonymousAuth } from '../../lib/auth';
import { getJoinedFlag, getStoredName } from '../../lib/localStorage';
import { submitAnswer, submitSplitAnswer } from '../../services/answerService';
import { isAnswerPage, toFloatingItem } from '../../lib/answers';

function LiveAnswers({ sessionId, page }) {
  const { items, push } = useFloatingQueue(12, { layout: 'grid' });
  const answers = useAnswers(sessionId, page.id, {
    limitCount: 30,
    onAdded: (answer) => push(toFloatingItem(answer)),
  });

  return (
    <section className="participant-live stack">
      <Spotlight answers={answers} field="showOnMobile" expandable />
      <div className="row-between" style={{ alignItems: 'baseline' }}>
        <h2 className="h2">คำตอบจากผู้ร่วมงาน</h2>
        <span className="caption">{items.length} ข้อความ</span>
      </div>
      {items.length === 0 ? (
        <p className="body-small">ยังไม่มีคำตอบ — คำตอบใหม่จะปรากฏที่นี่</p>
      ) : (
        <FloatingAnswers items={items} variant="grid" />
      )}
    </section>
  );
}

function QuestionAnswer({ sessionId, page, participantId }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const hasAnswered = useHasAnswered(sessionId, page.id, participantId);

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
    <div className="participant-shell stack">
      <header className="participant-header stack">
        <p className="caption">{getStoredName() || 'ผู้เข้าร่วม'}</p>
        <h1 className="h1 participant-title">{page.title}</h1>
      </header>

      {hasAnswered ? (
        <div className="card">
          <p className="body-text">ส่งคำตอบแล้ว ขอบคุณค่ะ</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="stack participant-form">
          <label className="field-label" htmlFor="answer-text">
            คำตอบของคุณ
          </label>
          <textarea
            id="answer-text"
            className="textarea textarea--mobile"
            value={text}
            maxLength={280}
            rows={4}
            onChange={(e) => setText(e.target.value)}
            placeholder="พิมพ์คำตอบของคุณ..."
            enterKeyHint="send"
          />
          <span className="caption">{text.length}/280</span>
          {error && <p className="body-small text-danger">{error}</p>}
          <button className="btn btn-primary btn--block" type="submit" disabled={submitting}>
            {submitting ? 'กำลังส่ง...' : 'ส่งคำตอบ'}
          </button>
        </form>
      )}

      <LiveAnswers sessionId={sessionId} page={page} />
    </div>
  );
}

function SplitQuestionAnswer({ sessionId, page, participantId }) {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const hasAnswered = useHasAnswered(sessionId, page.id, participantId);

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
    <div className="participant-shell stack">
      <header className="participant-header stack">
        <p className="caption">{getStoredName() || 'ผู้เข้าร่วม'}</p>
        <h1 className="h1 participant-title">{page.title}</h1>
      </header>

      {hasAnswered ? (
        <div className="card">
          <p className="body-text">ส่งคำตอบแล้ว ขอบคุณค่ะ</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="stack participant-form">
          <div className="split-answer-grid">
            <div className="stack">
              <label className="field-label" htmlFor="answer-a">
                {promptA}
              </label>
              <textarea
                id="answer-a"
                className="textarea textarea--mobile"
                value={textA}
                maxLength={280}
                rows={3}
                onChange={(e) => setTextA(e.target.value)}
                placeholder="พิมพ์คำตอบ..."
              />
              <span className="caption">{textA.length}/280</span>
            </div>
            <div className="stack">
              <label className="field-label" htmlFor="answer-b">
                {promptB}
              </label>
              <textarea
                id="answer-b"
                className="textarea textarea--mobile"
                value={textB}
                maxLength={280}
                rows={3}
                onChange={(e) => setTextB(e.target.value)}
                placeholder="พิมพ์คำตอบ..."
              />
              <span className="caption">{textB.length}/280</span>
            </div>
          </div>
          {error && <p className="body-small text-danger">{error}</p>}
          <button className="btn btn-primary btn--block" type="submit" disabled={submitting}>
            {submitting ? 'กำลังส่ง...' : 'ส่งคำตอบ'}
          </button>
        </form>
      )}

      <LiveAnswers sessionId={sessionId} page={page} />
    </div>
  );
}

function ParticipantShell({ children, slideKey = 'static' }) {
  return (
    <div className="page page--participant">
      <div className="page-padded page-padded--mobile">
        <SlideTransition slideKey={slideKey}>{children}</SlideTransition>
      </div>
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
      <ParticipantShell slideKey="loading">
        <div className="empty-state empty-state--mobile">
          <p className="body-text">กำลังโหลด...</p>
        </div>
      </ParticipantShell>
    );
  }

  if (!session || session.status === 'idle') {
    return (
      <ParticipantShell slideKey="idle">
        <div className="empty-state empty-state--mobile">
          <p className="h2">รอเริ่มงาน...</p>
          <p className="body-small">พิธีกรกำลังเตรียมคำถาม</p>
        </div>
      </ParticipantShell>
    );
  }

  if (session.status === 'ended') {
    return (
      <ParticipantShell slideKey="ended">
        <div className="empty-state empty-state--mobile">
          <p className="h2">งานนี้จบแล้ว</p>
          <p className="body-text text-secondary">ขอบคุณที่เข้าร่วม</p>
        </div>
      </ParticipantShell>
    );
  }

  const currentPageIndex = session.currentPageIndex ?? -1;
  const currentPage = currentPageIndex >= 0 ? pages[currentPageIndex] : null;

  if (!currentPage) {
    return (
      <ParticipantShell slideKey="waiting">
        <div className="empty-state empty-state--mobile">
          <p className="h2">กำลังจะเริ่มเร็วๆ นี้</p>
          <p className="body-small">โปรดรอสักครู่</p>
        </div>
      </ParticipantShell>
    );
  }

  if (isAnswerPage(currentPage.type)) {
    const AnswerUI = currentPage.type === 'split_question' ? SplitQuestionAnswer : QuestionAnswer;
    return (
      <ParticipantShell slideKey={currentPage.id}>
        <AnswerUI sessionId={sessionId} page={currentPage} participantId={participantId} />
      </ParticipantShell>
    );
  }

  if (currentPage.type === 'text_slideshow') {
    return (
      <ParticipantShell slideKey={currentPage.id}>
        <div className="stack participant-slideshow">
          <p className="caption" style={{ textAlign: 'center' }}>
            ดูที่จอทีวีเพื่อประสบการณ์เต็มรูปแบบ
          </p>
          {currentPage.title && (
            <p className="body-text text-secondary" style={{ textAlign: 'center' }}>
              {currentPage.title}
            </p>
          )}
          <TextSlideshow page={currentPage} variant="participant" />
        </div>
      </ParticipantShell>
    );
  }

  return (
    <ParticipantShell slideKey="on-tv">
      <div className="empty-state empty-state--mobile">
        <p className="h2">กำลังฉายอยู่บนจอทีวี</p>
        <p className="body-text text-secondary">โปรดดูที่จอใหญ่</p>
      </div>
    </ParticipantShell>
  );
}
