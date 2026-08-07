import { useRef, useState } from 'react';
import { uploadSessionVideo, validateVideoFile } from '../../services/videoUpload';

export default function VideoUploader({ sessionId, pageId, videoUrl, onUploaded }) {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateVideoFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }
    setError('');
    setProgress(0);
    try {
      const result = await uploadSessionVideo(sessionId, pageId, file, setProgress);
      onUploaded(result.videoUrl, result.videoStoragePath);
    } catch (err) {
      setError('อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="stack">
      <label className="field-label">ไฟล์วิดีโอ (.mp4 ไม่เกิน 200MB)</label>
      {videoUrl && progress === null && (
        <div className="stack">
          <span className="badge badge-sage" style={{ alignSelf: 'flex-start' }}>
            อัปโหลดแล้ว
          </span>
          <video src={videoUrl} controls style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)' }} />
        </div>
      )}
      <input ref={inputRef} type="file" accept="video/mp4,.mp4" onChange={handleFileChange} />
      {progress !== null && (
        <div className="progress-track">
          <div className="progress-fill" style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
      )}
      {error && <p className="body-small text-danger">{error}</p>}
    </div>
  );
}
