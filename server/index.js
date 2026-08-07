import cors from 'cors';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.resolve(__dirname, '../uploads');
const PORT = Number(process.env.PORT || 8080);
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://187.127.210.203:${PORT}`).replace(
  /\/$/,
  ''
);

const ALLOWED_ORIGINS = new Set([
  'https://water-drop-93a56.web.app',
  'https://water-drop-93a56.firebaseapp.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const app = express();
app.disable('x-powered-by');

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);

function safeSegment(value, label) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function videoRelativePath(sessionId, pageId) {
  return path.posix.join('sessions', sessionId, 'videos', `${pageId}.mp4`);
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      const sessionId = safeSegment(req.body.sessionId, 'sessionId');
      const pageId = safeSegment(req.body.pageId, 'pageId');
      const dir = path.join(UPLOAD_ROOT, 'sessions', sessionId, 'videos');
      fs.mkdirSync(dir, { recursive: true });
      req.mediaRelativePath = videoRelativePath(sessionId, pageId);
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename(req, _file, cb) {
    try {
      const pageId = safeSegment(req.body.pageId, 'pageId');
      cb(null, `${pageId}.mp4`);
    } catch (err) {
      cb(err);
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const isMp4 =
      file.mimetype === 'video/mp4' || file.originalname.toLowerCase().endsWith('.mp4');
    if (!isMp4) {
      cb(new Error('Only .mp4 files are allowed'));
      return;
    }
    cb(null, true);
  },
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      res.status(status).json({ error: err.message || 'Upload failed' });
      return;
    }
    if (!req.file || !req.mediaRelativePath) {
      res.status(400).json({ error: 'Missing file, sessionId, or pageId' });
      return;
    }

    const videoStoragePath = req.mediaRelativePath;
    const videoUrl = `${PUBLIC_BASE_URL}/media/${videoStoragePath}`;
    res.json({ videoUrl, videoStoragePath });
  });
});

app.use(
  '/media',
  express.static(UPLOAD_ROOT, {
    fallthrough: false,
    setHeaders(res) {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  })
);

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || 'Request failed' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`reflection media server listening on ${PUBLIC_BASE_URL}`);
});
