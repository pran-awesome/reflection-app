import { useState } from 'react';
import VideoUploader from './VideoUploader';
import { savePage } from '../../services/pageService';
import {
  SLIDESHOW_ANIMATIONS,
  SLIDESHOW_TRANSITION_SPEEDS,
  clampDurationSec,
  clampTransitionMs,
  normalizeSlideshowItem,
} from '../../lib/slideshow';

const TYPE_LABELS = {
  question: 'คำถาม',
  split_question: 'คำถามสองช่อง',
  video: 'วิดีโอ',
  message: 'ข้อความ',
  text_slideshow: 'ข้อความต่อเนื่อง',
};

export default function PageForm({
  ownerId,
  scope = 'sessions',
  pageId,
  order,
  type,
  initialData,
  onSaved,
  onCancel,
}) {
  const [text, setText] = useState(initialData?.title || '');
  const [promptA, setPromptA] = useState(initialData?.content?.promptA || '');
  const [promptB, setPromptB] = useState(initialData?.content?.promptB || '');
  const [videoUrl, setVideoUrl] = useState(initialData?.content?.videoUrl || '');
  const [videoStoragePath, setVideoStoragePath] = useState(initialData?.content?.videoStoragePath || '');
  const [slideItems, setSlideItems] = useState(() => {
    const fallbackAnimation = initialData?.content?.animation || 'fade';
    const fallbackDurationSec = initialData?.content?.durationSec || 3;
    const items = (initialData?.content?.items || []).map((item) =>
      normalizeSlideshowItem(item, fallbackAnimation, fallbackDurationSec)
    );
    return items.length > 0 ? items : [{ text: '', animation: 'fade', durationSec: fallbackDurationSec }];
  });
  const [transitionMs, setTransitionMs] = useState(initialData?.content?.transitionMs || 500);
  const [durationSec, setDurationSec] = useState(initialData?.content?.durationSec || 3);
  const [loopSlides, setLoopSlides] = useState(initialData?.content?.loop !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateSlideItem(index, patch) {
    setSlideItems((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addSlideItem() {
    setSlideItems((items) => [...items, { text: '', animation: 'fade', durationSec: clampDurationSec(durationSec) }]);
  }

  function removeSlideItem(index) {
    setSlideItems((items) => (items.length > 1 ? items.filter((_, i) => i !== index) : items));
  }

  async function handleSave() {
    const trimmedSlideItems = slideItems
      .map((item) => ({
        text: item.text.trim(),
        animation: item.animation,
        durationSec: clampDurationSec(item.durationSec),
      }))
      .filter((item) => item.text.length > 0);

    if (type === 'split_question') {
      if (text.trim().length === 0) {
        setError('กรุณากรอกคำถามหลัก');
        return;
      }
      if (promptA.trim().length === 0 || promptB.trim().length === 0) {
        setError('กรุณากรอกคำอธิบายทั้งสองช่องคำตอบ');
        return;
      }
    } else if (type === 'text_slideshow') {
      if (trimmedSlideItems.length === 0) {
        setError('กรุณาใส่ข้อความอย่างน้อย 1 บรรทัด');
        return;
      }
    } else if (type !== 'video' && text.trim().length === 0) {
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
    let content;
    if (type === 'question') {
      content = { questionText: title };
    } else if (type === 'split_question') {
      content = {
        questionText: title,
        promptA: promptA.trim(),
        promptB: promptB.trim(),
      };
    } else if (type === 'message') {
      content = { messageText: title };
    } else if (type === 'text_slideshow') {
      content = {
        items: trimmedSlideItems,
        transitionMs: clampTransitionMs(transitionMs),
        durationSec: clampDurationSec(durationSec),
        loop: loopSlides,
      };
    } else {
      content = { videoUrl, videoStoragePath };
    }
    try {
      await savePage(ownerId, pageId, { order, type, title, content }, scope);
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

      {type === 'text_slideshow' ? (
        <>
          <div>
            <label className="field-label">ชื่อหัวข้อ (ไม่บังคับ)</label>
            <input
              className="input"
              value={text}
              maxLength={100}
              onChange={(e) => setText(e.target.value)}
              placeholder="เช่น สรุปช่วงที่ 1"
            />
          </div>
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            <label className="field-label">ข้อความ (แต่ละบรรทัดเลือกรูปแบบการเปลี่ยนและระยะเวลาแสดงของตัวเองได้)</label>
            {slideItems.map((item, i) => (
              <div key={i} className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  value={item.text}
                  maxLength={200}
                  onChange={(e) => updateSlideItem(i, { text: e.target.value })}
                  placeholder={`ข้อความที่ ${i + 1}`}
                />
                <select
                  className="input"
                  style={{ width: 150 }}
                  value={item.animation}
                  onChange={(e) => updateSlideItem(i, { animation: e.target.value })}
                >
                  {SLIDESHOW_ANIMATIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  min={2}
                  max={15}
                  value={item.durationSec ?? durationSec}
                  onChange={(e) => updateSlideItem(i, { durationSec: e.target.value })}
                  style={{ width: 70 }}
                  aria-label={`วินาทีสำหรับข้อความที่ ${i + 1}`}
                  title="วินาทีที่แสดงข้อความนี้"
                />
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => removeSlideItem(i)}
                  disabled={slideItems.length <= 1}
                  aria-label="ลบข้อความนี้"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={addSlideItem}>
              + เพิ่มข้อความ
            </button>
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <label className="field-label">ความเร็วการเปลี่ยน</label>
              <select
                className="input"
                value={clampTransitionMs(transitionMs)}
                onChange={(e) => setTransitionMs(Number(e.target.value))}
              >
                {SLIDESHOW_TRANSITION_SPEEDS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">วินาทีต่อข้อความ (ค่าเริ่มต้นสำหรับบรรทัดใหม่)</label>
              <input
                className="input"
                type="number"
                min={2}
                max={15}
                value={durationSec}
                onChange={(e) => setDurationSec(e.target.value)}
                style={{ width: 100 }}
              />
            </div>
          </div>
          <label className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
            <input type="checkbox" checked={loopSlides} onChange={(e) => setLoopSlides(e.target.checked)} />
            <span className="body-small">วนซ้ำอัตโนมัติ</span>
          </label>
        </>
      ) : type === 'split_question' ? (
        <>
          <div>
            <label className="field-label">คำถามหลัก</label>
            <textarea
              className="textarea"
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
              placeholder="พิมพ์คำถามหลักที่แสดงด้านบน..."
            />
          </div>
          <div>
            <label className="field-label">คำอธิบายช่องที่ 1</label>
            <input
              className="input"
              value={promptA}
              maxLength={120}
              onChange={(e) => setPromptA(e.target.value)}
              placeholder="เช่น สิ่งที่เรียนรู้"
            />
          </div>
          <div>
            <label className="field-label">คำอธิบายช่องที่ 2</label>
            <input
              className="input"
              value={promptB}
              maxLength={120}
              onChange={(e) => setPromptB(e.target.value)}
              placeholder="เช่น สิ่งที่จะนำไปใช้"
            />
          </div>
        </>
      ) : type !== 'video' ? (
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
            sessionId={ownerId}
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
