import { useState } from 'react';
import VideoUploader from './VideoUploader';
import { savePage } from '../../services/pageService';

const TYPE_LABELS = { question: 'คำถาม', video: 'วิดีโอ', message: 'ข้อความ' };

export default function PageForm({ sessionId, pageId, order, type, initialData, onSaved, onCancel }) {
  const [text, setText] = useState(initialData?.title || '');
  const [videoUrl, setVideoUrl] = useState(initialData?.content?.videoUrl || '');
  const [videoStoragePath, setVideoStoragePath] = useState(initialData?.content?.videoStoragePath || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (type !== 'video' && text.trim().length === 0) {
      setError('กรุณากรอกข้อความ');
      return;
    }
    if (type === 'video' && !videoUrl) {
      setError('กรุณาอัปโหลดวิดีโอก่อนบันทึก');
      return;
    }
    setSaving(true);
    setError('');
    const title = text.trim();
    const content =
      type === 'question'
        ? { questionText: title }
        : type === 'message'
          ? { messageText: title }
          : { videoUrl, videoStoragePath };
    try {
      await savePage(sessionId, pageId, { order, type, title, content });
      onSaved();
    } catch (err) {
      setError('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card stack" style={{ marginTop: 'var(--space-2)' }}>
      <span className="badge" style={{ alignSelf: 'flex-start' }}>
        {TYPE_LABELS[type]}
      </span>

      {type !== 'video' ? (
        <div>
          <label className="field-label">{type === 'question' ? 'ข้อความคำถาม' : 'ข้อความที่จะแสดง'}</label>
          <textarea
            className="textarea"
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            placeholder={type === 'question' ? 'พิมพ์คำถาม...' : 'พิมพ์ข้อความ...'}
          />
        </div>
      ) : (
        <>
          <div>
            <label className="field-label">ชื่อ/คำอธิบาย (ไม่บังคับ)</label>
            <input className="input" value={text} maxLength={100} onChange={(e) => setText(e.target.value)} />
          </div>
          <VideoUploader
            sessionId={sessionId}
            pageId={pageId}
            videoUrl={videoUrl}
            onUploaded={(url, path) => {
              setVideoUrl(url);
              setVideoStoragePath(path);
            }}
          />
        </>
      )}

      {error && <p className="body-small text-danger">{error}</p>}

      <div className="row">
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
