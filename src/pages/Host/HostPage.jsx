import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentSession } from '../../hooks/useCurrentSession';
import { usePages } from '../../hooks/usePages';
import { useParticipantCount } from '../../hooks/useParticipants';
import { useAnswers } from '../../hooks/useAnswers';
import { useDecks } from '../../hooks/useDecks';
import {
  ensureDraftSession,
  endSession,
  setCurrentPageIndex,
  startPresenting,
  updateSessionTitle,
} from '../../services/sessionService';
import {
  createDeck,
  deleteDeck,
  presentDeck,
  saveSessionAsDeck,
} from '../../services/deckService';
import { setAnswerShowOnMobile, setAnswerShowOnTV } from '../../services/answerService';
import { setVideoPlaying } from '../../services/pageService';
import PageEditor from '../../components/PageEditor/PageEditor';
import { formatAnswerDisplay, formatAnswerSearchBlob, isAnswerPage } from '../../lib/answers';

function formatDeckDate(ts) {
  if (!ts?.toDate) return '';
  return ts.toDate().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

function AnswerBody({ answer, page }) {
  if (page.type === 'split_question' && (answer.textA != null || answer.textB != null)) {
    return (
      <div className="stack" style={{ gap: 'var(--space-2)' }}>
        <div>
          <p className="caption text-secondary">{page.content?.promptA || 'ช่องที่ 1'}</p>
          <p className="answer-text">{answer.textA || '—'}</p>
        </div>
        <div>
          <p className="caption text-secondary">{page.content?.promptB || 'ช่องที่ 2'}</p>
          <p className="answer-text">{answer.textB || '—'}</p>
        </div>
      </div>
    );
  }
  return <p className="answer-text">{formatAnswerDisplay(answer)}</p>;
}

function QuestionModeration({ sessionId, page }) {
  const answers = useAnswers(sessionId, page.id, { limitCount: 200 });
  const [search, setSearch] = useState('');

  if (answers.length === 0) {
    return <p className="body-small">ยังไม่มีคำตอบ</p>;
  }

  const query = search.trim().toLowerCase();
  const filteredAnswers = query
    ? answers.filter((answer) => formatAnswerSearchBlob(answer).includes(query))
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
          <AnswerBody answer={answer} page={page} />
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

function SavedDecksPanel({ busy, setBusy, setMessage }) {
  const navigate = useNavigate();
  const { decks, loading } = useDecks();
  const { session } = useCurrentSession();

  async function handleCreate() {
    setBusy(true);
    setMessage('');
    try {
      const id = await createDeck('ชุดสไลด์ใหม่');
      navigate(`/host/decks/${id}`);
    } catch (err) {
      setMessage('สร้างชุดสไลด์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function handlePresent(deckId, title) {
    if (session?.status === 'presenting') {
      const ok = window.confirm(
        `กำลังนำเสนออยู่ตอนนี้\nต้องการสลับไปใช้ชุด “${title || 'ไม่มีชื่อ'}” ทันทีหรือไม่?`
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(`เริ่มนำเสนอชุด “${title || 'ไม่มีชื่อ'}” เลยหรือไม่?`);
      if (!ok) return;
    }
    setBusy(true);
    setMessage('');
    try {
      await presentDeck(deckId);
      setMessage('เริ่มนำเสนอแล้ว — เปิด /tv และ /join ได้เลย');
    } catch (err) {
      setMessage('เริ่มนำเสนอไม่สำเร็จ ลองใหม่');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(deckId, title) {
    if (!window.confirm(`ลบชุดสไลด์ “${title || 'ไม่มีชื่อ'}” ใช่หรือไม่?`)) return;
    setBusy(true);
    try {
      await deleteDeck(deckId);
    } catch (err) {
      setMessage('ลบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <div className="row-between">
        <h2 className="h2">ชุดสไลด์ที่บันทึกไว้</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleCreate} disabled={busy}>
          + สร้างชุดใหม่
        </button>
      </div>
      <p className="body-small text-secondary">
        เตรียมสไลด์ล่วงหน้า แล้ววันงานกด “นำเสนอ” ได้ทันที (ไม่ต้องสร้างใหม่)
      </p>

      {loading && <p className="body-small">กำลังโหลดชุดสไลด์...</p>}
      {!loading && decks.length === 0 && (
        <div className="card">
          <p className="body-text">ยังไม่มีชุดที่บันทึก — สร้างชุดใหม่ หรือบันทึกจากฉบับร่างด้านล่าง</p>
        </div>
      )}

      <div className="stack">
        {decks.map((deck) => (
          <div key={deck.id} className="card stack" style={{ gap: 'var(--space-2)' }}>
            <div>
              <p className="body-text" style={{ fontWeight: 600 }}>
                {deck.title || '(ไม่มีชื่อ)'}
              </p>
              <p className="caption">
                {deck.pageCount ?? 0} หน้า
                {deck.updatedAt ? ` · อัปเดต ${formatDeckDate(deck.updatedAt)}` : ''}
              </p>
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={() => handlePresent(deck.id, deck.title)}
              >
                ▶ นำเสนอ
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() => navigate(`/host/decks/${deck.id}`)}
              >
                ✎ แก้ไข
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={busy}
                onClick={() => handleDelete(deck.id, deck.title)}
              >
                ลบ
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HostPage() {
  const { sessionId, session, loading } = useCurrentSession();
  const { pages } = usePages(sessionId);
  const participantCount = useParticipantCount(sessionId);
  const [titleDraft, setTitleDraft] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [startError, setStartError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deckMessage, setDeckMessage] = useState('');

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

  async function handleSaveAsDeck() {
    if (titleDraft.trim().length === 0) {
      setStartError('ตั้งชื่อก่อนบันทึกเป็นชุดสไลด์');
      return;
    }
    if (pages.length === 0) {
      setStartError('เพิ่มอย่างน้อย 1 หน้าก่อนบันทึก');
      return;
    }
    setBusy(true);
    setStartError('');
    setDeckMessage('');
    try {
      await updateSessionTitle(sessionId, titleDraft.trim());
      await saveSessionAsDeck(sessionId, titleDraft.trim());
      setDeckMessage('บันทึกชุดสไลด์แล้ว — กด “นำเสนอ” จากรายการด้านบนได้ในวันงาน');
    } catch (err) {
      setStartError('บันทึกชุดสไลด์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
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

          <SavedDecksPanel busy={busy} setBusy={setBusy} setMessage={setDeckMessage} />
          {deckMessage && (
            <p className="body-small" style={{ color: 'var(--color-success)' }}>
              {deckMessage}
            </p>
          )}

          <hr className="divider" />

          <h2 className="h2">ฉบับร่างวันนี้</h2>
          <p className="body-small text-secondary">
            แก้ไขด้านล่าง แล้วบันทึกเป็นชุด หรือเริ่มงานจากฉบับร่างนี้เลย
          </p>

          <div>
            <label className="field-label">ชื่องาน / ชื่อชุดสไลด์</label>
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

          <h2 className="h2">รายการหน้า</h2>
          <PageEditor ownerId={sessionId} scope="sessions" pages={pages} />

          {startError && <p className="body-small text-danger">{startError}</p>}
          <div className="stack">
            <button className="btn btn-secondary" onClick={handleSaveAsDeck} disabled={busy}>
              บันทึกเป็นชุดสไลด์
            </button>
            <button className="btn btn-primary" onClick={handleStart} disabled={busy}>
              เริ่มงานจากฉบับร่างนี้
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <PageEditor ownerId={sessionId} scope="sessions" pages={pages} />
          </div>
        )}

        <hr className="divider" />

        {!currentPage && (
          <div className="card">
            <p className="body-text">จอทีวีกำลังแสดง QR code ให้ผู้เข้าร่วมสแกนเข้าร่วมงาน</p>
          </div>
        )}

        {isAnswerPage(currentPage?.type) && (
          <div className="stack">
            <h2 className="h2">{currentPage.title}</h2>
            {currentPage.type === 'split_question' && (
              <p className="body-small text-secondary">
                ช่อง 1: {currentPage.content?.promptA || '—'} · ช่อง 2: {currentPage.content?.promptB || '—'}
              </p>
            )}
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
