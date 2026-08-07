import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentSession } from '../../hooks/useCurrentSession';
import { ensureAnonymousAuth } from '../../lib/auth';
import { joinSession } from '../../services/participantService';
import { setJoinedFlag, setStoredName } from '../../lib/localStorage';

export default function JoinPage() {
  const { sessionId, loading } = useCurrentSession();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 40) {
      setError('กรุณากรอกชื่อ 1–40 ตัวอักษร');
      return;
    }
    if (!sessionId) {
      setError('ยังไม่มีงานที่พร้อมให้เข้าร่วม กรุณารอสักครู่แล้วลองใหม่');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const user = await ensureAnonymousAuth();
      await joinSession(sessionId, user.uid, trimmed);
      setStoredName(trimmed);
      setJoinedFlag();
      navigate('/participant', { replace: true });
    } catch (err) {
      setError('เข้าร่วมไม่สำเร็จ ลองใหม่อีกครั้ง');
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-padded stack" style={{ minHeight: '100vh', justifyContent: 'center' }}>
        <h1 className="h1" style={{ textAlign: 'center' }}>
          เข้าร่วมกิจกรรม Reflection
        </h1>
        <p className="body-text text-secondary" style={{ textAlign: 'center' }}>
          กรอกชื่อของคุณเพื่อเริ่มตอบคำถาม
        </p>

        <form onSubmit={handleSubmit} className="stack">
          <div>
            <label className="field-label">ชื่อของคุณ</label>
            <input
              className="input"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สมชาย"
              autoFocus
              disabled={loading || submitting}
            />
          </div>
          {error && <p className="body-small text-danger">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading || submitting}>
            {submitting ? 'กำลังเข้าร่วม...' : 'เข้าร่วม'}
          </button>
        </form>
      </div>
    </div>
  );
}
