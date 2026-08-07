import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { usePages } from '../../hooks/usePages';
import PageEditor from '../../components/PageEditor/PageEditor';
import { refreshDeckPageCount, updateDeckTitle } from '../../services/deckService';

export default function DeckEditPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { pages } = usePages(deckId, 'decks');
  const [titleDraft, setTitleDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!deckId) return undefined;
    const unsub = onSnapshot(doc(db, 'decks', deckId), (snap) => {
      if (!snap.exists()) {
        setMissing(true);
        setLoading(false);
        return;
      }
      setTitleDraft(snap.data().title || '');
      setLoading(false);
    });
    return unsub;
  }, [deckId]);

  if (loading) {
    return (
      <div className="page">
        <div className="empty-state">
          <p className="body-text">กำลังโหลดชุดสไลด์...</p>
        </div>
      </div>
    );
  }

  if (missing) {
    return (
      <div className="page">
        <div className="empty-state stack">
          <p className="h2">ไม่พบชุดสไลด์นี้</p>
          <Link to="/host" className="btn btn-primary">
            กลับหน้าควบคุม
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-padded stack">
        <div className="row-between">
          <h1 className="h1">แก้ไขชุดสไลด์</h1>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/host')}>
            เสร็จสิ้น
          </button>
        </div>

        <p className="body-small text-secondary">
          เตรียมสไลด์ล่วงหน้าได้ที่นี่ พอวันงานกด “นำเสนอ” จากหน้าควบคุมได้ทันที
        </p>

        <div>
          <label className="field-label">ชื่อชุดสไลด์</label>
          <input
            className="input"
            value={titleDraft}
            maxLength={100}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => updateDeckTitle(deckId, titleDraft.trim())}
            placeholder="เช่น Reflection ทีม Sales Q3"
          />
        </div>

        <hr className="divider" />
        <h2 className="h2">รายการหน้า ({pages.length})</h2>
        <PageEditor
          ownerId={deckId}
          scope="decks"
          pages={pages}
          onChanged={() => refreshDeckPageCount(deckId)}
        />
      </div>
    </div>
  );
}
