import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentSession } from '../../hooks/useCurrentSession';
import { usePages } from '../../hooks/usePages';
import { useParticipantCount } from '../../hooks/useParticipants';
import { useAnswers } from '../../hooks/useAnswers';
import {
  ensureDraftSession,
  endSession,
  setCurrentPageIndex,
  startPresenting,
  updateSessionTitle,
} from '../../services/sessionService';
import { setAnswerShowOnMobile, setAnswerShowOnTV } from '../../services/answerService';
import { setVideoPlaying } from '../../services/pageService';
import PageEditor from '../../components/PageEditor/PageEditor';

function QuestionModeration({ sessionId, page }) {
  const answers = useAnswers(sessionId, page.id, { limitCount: 200 });
  const [search, setSearch] = useState('');

  if (answers.length === 0) {
    return <p className="body-small">ยังไม่มีคำตอบ</p>;
  }

  const query = search.trim().toLowerCase();
  const filteredAnswers = query
    ? answers.filter(
        (answer) =>
          answer.name?.toLowerCase().includes(query) || answer.text?.toLowerCase().includes(query)
      )
    : answers;

  return (
    <div className="stack">
      <input
        className="input"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ค้นหาชื่อหรือคำตอบ..."
        aria-label="ค้นหาคำตอบ"
      />

      {filteredAnswers.length === 0 && <p className="body-small">ไม่พบคำตอบที่ตรงกับการค้นหา</p>}

      {filteredAnswers.map((answer) => (
        <div key={answer.id} className="answer-card">
          <p className="answer-text">{answer.text}</p>
          <div className="row-between" style={{ marginTop: 'var(--space-2)' }}>
            <span className="name-tag">{answer.name}</span>
            <div className="row">
              <button
                type="button"
                className={`toggle-pill ${answer.showOnTV ? 'active' : ''}`}
                onClick={() => setAnswerShowOnTV(sessionId, page.id, answer.id, !answer.showOnTV)}
              >
                ขึ้นจอทีวี
              </button>
              <button
                type="button"
                className={`toggle-pill ${answer.showOnMobile ? 'active' : ''}`}
                onClick={() => setAnswerShowOnMobile(sessionId, page.id, answer.id, !answer.showOnMobile)}
              >
                ขึ้นจอมือถือ
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoControl({ sessionId, page }) {
  const playing = !!page.videoState?.playing;
  return (
    <div className="row">
      <button className="btn btn-primary" onClick={() => setVideoPlaying(sessionId, page.id, true)} disabled={playing}>
        ▶ เล่น
      </button>
      <button className="btn btn-secondary" onClick={() => setVideoPlaying(sessionId, page.id, false)} disabled={!playing}>
        ⏸ หยุด
      </button>
      <span className="badge">{playing ? 'กำลังเล่น' : 'หยุดอยู่'}</span>
    </div>
  );
}

export default function HostPage() {
  const { sessionId, session, loading } = useCurrentSession();
  const { pages } = usePages(sessionId);
  const participantCount = useParticipantCount(sessionId);
  const [titleDraft, setTitleDraft] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [startError, setStartError] = useState('');

  useEffect(() => {
    if (!loading && (!session || session.status === 'ended')) {
      ensureDraftSession();
    }
  }, [loading, session]);

  useEffect(() => {
    setTitleDraft(session?.title || '');
  }, [session?.id, session?.title]);

  if (loading || !session || session.status === 'ended') {
    return (
      <div className="page">
        <div className="empty-state">
          <p className="h2">กำลังเตรียมงานใหม่...</p>
        </div>
      </div>
    );
  }

  async function handleStart() {
    if (titleDraft.trim().length === 0) {
      setStartError('กรุณาตั้งชื่องานก่อนเริ่ม');
      return;
    }
    setStartError('');
    await updateSessionTitle(sessionId, titleDraft.trim());
    await startPresenting(sessionId);
  }

  if (session.status === 'idle') {
    return (
      <div className="page">
        <div className="page-padded stack">
          <div className="row-between">
            <h1 className="h1">เตรียมงาน Reflection</h1>
            <Link to="/host/history" className="btn btn-secondary btn-sm">
              ประวัติงาน
            </Link>
          </div>

          <div>
            <label className="field-label">ชื่องาน</label>
            <input
              className="input"
              value={titleDraft}
              maxLength={100}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                if (titleDraft.trim() !== (session.title || '')) {
                  updateSessionTitle(sessionId, titleDraft.trim());
                }
              }}
              placeholder="เช่น Reflection ทีม Design Sprint"
            />
          </div>

          <hr className="divider" />

          <h2 className="h2">รายการหน้า</h2>
          <PageEditor sessionId={sessionId} pages={pages} />

          {startError && <p className="body-small text-danger">{startError}</p>}
          <button className="btn btn-primary" onClick={handleStart}>
            เริ่มงานใหม่
          </button>
        </div>
      </div>
    );
  }

  // status === 'presenting'
  const currentPageIndex = session.currentPageIndex ?? -1;
  const currentPage = currentPageIndex >= 0 ? pages[currentPageIndex] : null;
  const canGoBack = currentPageIndex > 0;
  const canGoNext = currentPageIndex < pages.length - 1;

  return (
    <div className="page">
      <div className="page-padded stack">
        <div className="row-between">
          <div>
            <h1 className="h1">{session.title}</h1>
            <span className="badge badge-sage">ผู้เข้าร่วม {participantCount} คน</span>
          </div>
          <div className="stack" style={{ alignItems: 'flex-end', gap: 'var(--space-2)' }}>
            <Link to="/host/history" className="btn btn-secondary btn-sm">
              ประวัติงาน
            </Link>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (window.confirm('ยืนยันจบงานนี้หรือไม่?')) endSession(sessionId);
              }}
            >
              จบงาน
            </button>
          </div>
        </div>

        <div className="row-between">
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPageIndex(sessionId, currentPageIndex - 1)}
            disabled={!canGoBack}
          >
            ← ย้อนกลับ
          </button>
          <span className="badge">
            {currentPageIndex < 0 ? 'หน้ารอ (QR)' : `หน้า ${currentPageIndex + 1} / ${pages.length}`}
          </span>
          <button
            className="btn btn-primary"
            onClick={() => setCurrentPageIndex(sessionId, currentPageIndex + 1)}
            disabled={!canGoNext}
          >
            ถัดไป →
          </button>
        </div>

        <button className="btn btn-secondary" onClick={() => setShowEditor((v) => !v)}>
          {showEditor ? 'ปิดการแก้ไขคำถาม' : '✎ แก้ไขคำถาม'}
        </button>

        {showEditor && (
          <div className="card">
            <PageEditor sessionId={sessionId} pages={pages} />
          </div>
        )}

        <hr className="divider" />

        {!currentPage && (
          <div className="card">
            <p className="body-text">จอทีวีกำลังแสดง QR code ให้ผู้เข้าร่วมสแกนเข้าร่วมงาน</p>
          </div>
        )}

        {currentPage?.type === 'question' && (
          <div className="stack">
            <h2 className="h2">{currentPage.title}</h2>
            <QuestionModeration sessionId={sessionId} page={currentPage} />
          </div>
        )}

        {currentPage?.type === 'video' && (
          <div className="stack">
            <h2 className="h2">{currentPage.title || 'วิดีโอ'}</h2>
            <VideoControl sessionId={sessionId} page={currentPage} />
          </div>
        )}

        {currentPage?.type === 'message' && (
          <div className="stack">
            <h2 className="h2">ข้อความบนจอทีวี</h2>
            <div className="card">
              <p className="body-text">{currentPage.title}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
