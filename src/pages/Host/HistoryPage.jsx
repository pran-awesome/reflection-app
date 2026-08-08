import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSessions } from '../../hooks/useSessions';
import { fetchSessionPagesWithAnswers } from '../../services/historyService';
import { buildSessionCsv, downloadCsv } from '../../lib/csv';
import { formatAnswerDisplay, isAnswerPage } from '../../lib/answers';
import { getSlideshowItemText } from '../../lib/slideshow';

const STATUS_LABELS = {
  idle: 'กำลังเตรียม',
  presenting: 'กำลังดำเนินการ',
  ended: 'จบแล้ว',
};

const TYPE_LABELS = {
  question: 'คำถาม',
  split_question: 'คำถามสองช่อง',
  video: 'วิดีโอ',
  message: 'ข้อความ',
  text_slideshow: 'ข้อความต่อเนื่อง',
};

function formatDate(ts) {
  if (!ts?.toDate) return '-';
  return ts.toDate().toLocaleString('th-TH');
}

function AnswerBody({ answer, page }) {
  if (page.type === 'split_question' && (answer.textA != null || answer.textB != null)) {
    return (
      <div className="answer-split">
        <div className="answer-split-box">
          <p className="caption text-secondary">{page.content?.promptA || 'ช่องที่ 1'}</p>
          <p className="answer-text">{answer.textA || '—'}</p>
        </div>
        <div className="answer-split-box">
          <p className="caption text-secondary">{page.content?.promptB || 'ช่องที่ 2'}</p>
          <p className="answer-text">{answer.textB || '—'}</p>
        </div>
      </div>
    );
  }
  return <p className="answer-text">{formatAnswerDisplay(answer)}</p>;
}

export default function HistoryPage() {
  const { sessions, loading } = useSessions();
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    fetchSessionPagesWithAnswers(selectedId)
      .then(setDetail)
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  async function handleExport(session) {
    const pagesWithAnswers =
      selectedId === session.id && detail ? detail : await fetchSessionPagesWithAnswers(session.id);
    const csv = buildSessionCsv(session, pagesWithAnswers);
    downloadCsv(`${session.title || 'session'}-${session.id}.csv`, csv);
  }

  return (
    <div className="page">
      <div className="page-padded stack">
        <div className="row-between">
          <h1 className="h1">ประวัติงาน</h1>
          <Link to="/host" className="btn btn-secondary btn-sm">
            กลับหน้าควบคุม
          </Link>
        </div>

        {loading && <p className="body-small">กำลังโหลด...</p>}
        {!loading && sessions.length === 0 && <p className="body-small">ยังไม่มีงานในระบบ</p>}

        <div className="stack">
          {sessions.map((session) => (
            <div key={session.id} className="card">
              <div className="row-between">
                <div>
                  <p className="body-text" style={{ fontWeight: 600 }}>
                    {session.title || '(ไม่มีชื่องาน)'}
                  </p>
                  <p className="caption">{formatDate(session.createdAt)}</p>
                </div>
                <span className="badge badge-sage">{STATUS_LABELS[session.status] || session.status}</span>
              </div>
              <div className="row" style={{ marginTop: 'var(--space-2)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedId(selectedId === session.id ? null : session.id)}
                >
                  {selectedId === session.id ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleExport(session)}>
                  Export CSV
                </button>
              </div>

              {selectedId === session.id && (
                <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
                  {detailLoading && <p className="body-small">กำลังโหลดรายละเอียด...</p>}
                  {!detailLoading &&
                    detail?.map((page) => (
                      <div key={page.id} className="card">
                        <div className="row" style={{ marginBottom: 'var(--space-2)' }}>
                          <span className="badge">{TYPE_LABELS[page.type]}</span>
                          <span className="body-text" style={{ fontWeight: 600 }}>
                            {page.title || '(ไม่มีข้อความ)'}
                          </span>
                        </div>
                        {page.type === 'text_slideshow' && (
                          <div className="stack" style={{ gap: 'var(--space-1)', marginBottom: 'var(--space-2)' }}>
                            {(page.content?.items || []).map((item, i) => (
                              <p key={i} className="body-small">
                                {i + 1}. {getSlideshowItemText(item)}
                              </p>
                            ))}
                          </div>
                        )}
                        {isAnswerPage(page.type) ? (
                          page.answers.length === 0 ? (
                            <p className="body-small">ไม่มีคำตอบ</p>
                          ) : (
                            <div className="stack">
                              {page.answers.map((answer) => (
                                <div key={answer.id} className="answer-card">
                                  <AnswerBody answer={answer} page={page} />
                                  <div className="answer-meta">
                                    <span className="name-tag">{answer.name}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          <p className="body-small">ไม่มีคำตอบสำหรับหน้าประเภทนี้</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
