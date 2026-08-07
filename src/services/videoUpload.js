const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const MEDIA_BASE_URL = (import.meta.env.VITE_MEDIA_BASE_URL || 'http://187.127.210.203:8080').replace(
  /\/$/,
  ''
);

export function validateVideoFile(file) {
  if (!file) return 'กรุณาเลือกไฟล์วิดีโอ';
  const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
  if (!isMp4) return 'รองรับเฉพาะไฟล์ .mp4 เท่านั้น';
  if (file.size > MAX_VIDEO_BYTES) return 'ไฟล์วิดีโอต้องมีขนาดไม่เกิน 200MB';
  return null;
}

export function uploadSessionVideo(sessionId, pageId, file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    // Fields must come before the file so multer can read them in diskStorage.destination
    form.append('sessionId', sessionId);
    form.append('pageId', pageId);
    form.append('file', file, file.name || `${pageId}.mp4`);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${MEDIA_BASE_URL}/upload`);
    xhr.responseType = 'json';

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      const body = xhr.response;
      if (xhr.status >= 200 && xhr.status < 300 && body?.videoUrl) {
        resolve({
          videoUrl: body.videoUrl,
          videoStoragePath: body.videoStoragePath,
        });
        return;
      }
      const message = body?.error || `Upload failed (${xhr.status})`;
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new Error('Upload aborted'));
    xhr.send(form);
  });
}
