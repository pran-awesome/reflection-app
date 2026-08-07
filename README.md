# Reflection App

เว็บแอปสำหรับทำกิจกรรม reflection แบบ real-time — 3 หน้าจอ (Host / TV / Participant) ทำงานพร้อมกันผ่าน Firebase Firestore โดยไม่มี backend server แยก

Fixed routes: `/host`, `/host/history`, `/tv`, `/join`, `/participant`

## Tech stack

- React + Vite
- React Router (client-side routing)
- Firebase: Firestore (realtime `onSnapshot`), Anonymous Auth, Storage, Hosting
- `qrcode.react` สำหรับสร้าง QR code ฝั่ง client
- CSS ล้วน (ไม่มี UI framework) ตาม design system earth-tone ในสเปก, ฟอนต์ Sarabun

## 1. ติดตั้ง dependencies

```bash
npm install
```

## 2. ตั้งค่า Firebase

1. สร้างโปรเจกต์ใน [Firebase Console](https://console.firebase.google.com/)
2. เปิดใช้งาน:
   - **Firestore Database** (โหมด production หรือ test ก็ได้ เพราะมี `firestore.rules` กำกับ)
   - **Authentication → Sign-in method → Anonymous**
   - **Storage**
3. ไปที่ Project settings → General → Your apps → เพิ่ม Web App แล้วคัดลอกค่า config
4. คัดลอกไฟล์ `.env.example` เป็น `.env` แล้วกรอกค่าจาก Firebase config:

```bash
cp .env.example .env
```

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

5. Deploy security rules (ต้องมี [Firebase CLI](https://firebase.google.com/docs/cli) และรัน `firebase login` + `firebase use --add` เลือกโปรเจกต์ก่อน หรือแก้ `.firebaserc` ให้ตรงกับ project id):

```bash
firebase deploy --only firestore:rules,storage:rules
```

## 3. รันโปรเจกต์ local

```bash
npm run dev
```

เปิดหลายแท็บ/อุปกรณ์เพื่อทดสอบพร้อมกัน:
- `http://localhost:5173/host` — หน้าควบคุมของพิธีกร
- `http://localhost:5173/tv` — หน้าจอทีวี
- `http://localhost:5173/join` → `/participant` — จำลองผู้เข้าร่วม (สแกน QR จริงจากจอทีวีก็ได้ถ้าทดสอบผ่านมือถือในวง LAN เดียวกัน ด้วย `npm run dev -- --host`)

## 4. Build & Deploy

```bash
npm run build
firebase deploy
```

`firebase.json` ตั้งค่า Hosting ให้ serve จากโฟลเดอร์ `dist` พร้อม rewrite ทุก path ไปที่ `index.html` (SPA routing)

## โครงสร้างข้อมูล & สถาปัตยกรรม

- ไม่มี backend server — ทุกหน้าอ่าน/เขียน Firestore ผ่าน `onSnapshot` โดยตรง
- `system/currentSession.activeSessionId` คือ pointer ไปยัง session ที่กำลังใช้งานอยู่ — ทำให้ลิงก์ `/tv`, `/join`, `/participant` คงที่ตลอดแม้จะจัดงานหลายครั้ง
- Host จะมี "session ร่าง" (`status: idle`) พร้อมให้แก้ไขเสมอเมื่อเปิด `/host` — กด "เริ่มงานใหม่" เพื่อเปลี่ยนเป็น `presenting`
- `currentPageIndex = -1` หมายถึง "ห้องรอ" (แสดง QR บนจอทีวี) ก่อนเข้าเนื้อหาหน้าแรก (index 0)
- คำตอบแต่ละใบใช้ `participantId` (uid จาก Anonymous Auth) เป็น document ID ใน subcollection `answers` ของแต่ละหน้า — ทำให้ 1 คนตอบได้ 1 ครั้งต่อคำถามโดยธรรมชาติ (เขียนทับไม่ได้เพราะ client เช็คก่อนแสดงฟอร์ม)
- คำตอบลอย (floating answers) จำกัดจำนวน DOM node พร้อมกันไว้ที่ ~20-25 ชิ้นบนจอทีวี (~12 บนมือถือ) ตามข้อ 6.5 ของสเปก — ใช้ CSS keyframes ล้วน (`transform` + `opacity` เท่านั้น) ไม่มี physics library

## หมายเหตุการทดสอบ

โปรเจกต์นี้ build ผ่าน (`npm run build`) และรันผ่าน dev server ได้เรียบร้อย แต่ environment ที่ใช้พัฒนาไม่มี browser สำหรับทดสอบ UI จริงและไม่มี Firebase project จริงให้เชื่อมต่อ จึงยังไม่ได้ทดสอบ end-to-end flow (join → answer → floating → spotlight → video sync) ในเบราว์เซอร์จริง แนะนำให้ทดสอบตาม acceptance criteria ในสเปกหลังจากใส่ Firebase credentials จริงแล้ว
