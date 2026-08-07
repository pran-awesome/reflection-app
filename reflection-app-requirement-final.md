# Requirement Specification: Reflection App
### เอกสารนี้เขียนให้ dev หรือ AI coding agent ใช้พัฒนาระบบได้ทันที โดยไม่ต้องอธิบายเพิ่ม

---

## 1. ภาพรวมระบบ (System Overview)

เว็บแอปพลิเคชันสำหรับทำกิจกรรม reflection หลังจบงาน มี 3 หน้าจอที่ทำงานพร้อมกันแบบ real-time:

| Role | อุปกรณ์ | หน้าที่หลัก |
|---|---|---|
| **Host** | มือถือของพิธีกร | ควบคุมการนำเสนอทั้งหมด: เปลี่ยนหน้า, จัดการคำถาม, เลือกคำตอบขึ้นจอ, อัปโหลดวิดีโอ |
| **TV** | จอทีวี/โปรเจกเตอร์ | แสดง QR code, คำถาม, คำตอบลอย, วิดีโอ, ข้อความ |
| **Participant** | มือถือผู้ร่วมงาน | สแกน QR เข้าร่วม, พิมพ์ชื่อ, พิมพ์คำตอบ |

**สถาปัตยกรรม:** ไม่มี backend server แยก ทุกฝั่งอ่าน/เขียนข้อมูลผ่าน **Firebase Firestore แบบ realtime listener (`onSnapshot`)** โดยตรง ไม่มีฝั่งใดคุยกันโดยตรง — ทุกการเปลี่ยนแปลงส่งผ่าน Firestore เท่านั้น

**Non-goals (สิ่งที่ไม่ต้องทำ — สำคัญ อย่าเพิ่มเอง):**
- ไม่มีระบบ login / authentication ที่ผู้ใช้ต้องกรอก (ใช้ Firebase Anonymous Auth แบบไม่มี UI เท่านั้น)
- ไม่มีระบบ lock ห้องกิจกรรม — ใครสแกน QR เข้ามาเมื่อไหร่ก็เข้าร่วมได้ทันที
- ไม่มีคำตอบแบบ multiple choice หรือ rating — พิมพ์ข้อความอย่างเดียว
- ไม่ต้องมี moderation/คัดกรองคำหยาบอัตโนมัติ — host เป็นผู้คัดกรองเองก่อนกด "ขึ้นจอ"
- ไม่ต้องรองรับหลาย session พร้อมกัน (multi-tenant) — ระบบนี้ออกแบบให้ใช้ทีละ 1 งาน ผ่าน fixed link เดียว

---

## 2. โครงสร้างลิงก์ (Fixed Routes)

ทุกลิงก์คงที่ ไม่มีพารามิเตอร์ใน URL:

```
/host              → หน้าควบคุมของพิธีกร
/host/history       → หน้าดูงานย้อนหลังทั้งหมด + export
/tv                → หน้าจอทีวี
/join              → หน้ากรอกชื่อ (เข้ารหัสใน QR code เสมอ)
/participant       → หน้าตอบคำถามของผู้ร่วมงาน (ใช้ต่อจาก /join)
```

**กลไก fixed link + เก็บประวัติ:** มี document พิเศษ `system/currentSession` เก็บ `activeSessionId` ทุกหน้า (TV, join, participant) อ่านค่านี้ก่อนเสมอเพื่อรู้ว่ากำลังอ้างอิง session ไหน แล้วค่อย subscribe ข้อมูลของ session นั้นต่อ เมื่อ host กด "เริ่มงานใหม่" ระบบสร้าง session ใหม่และอัปเดต pointer นี้ ส่วนงานเก่ายังอยู่ครบใน `sessions` collection

---

## 3. Data Model (Firestore) — สมบูรณ์

```
system/currentSession
  activeSessionId: string

sessions/{sessionId}
  title: string
  status: "idle" | "presenting" | "ended"
  currentPageIndex: number
  createdAt: timestamp
  endedAt: timestamp | null

sessions/{sessionId}/participants/{participantId}
  name: string              // max 40 ตัวอักษร
  joinedAt: timestamp

sessions/{sessionId}/pages/{pageId}
  order: number
  type: "question" | "video" | "message"
  title: string              // สำหรับ question/message ใช้เป็นข้อความหลักที่แสดง
  content: {
    questionText?: string
    videoUrl?: string         // download URL จาก Firebase Storage
    videoStoragePath?: string // path ใน Storage เผื่อลบ/จัดการไฟล์ทีหลัง
    messageText?: string
  }
  videoState?: {
    playing: boolean
    startedAt: timestamp | null   // ใช้คำนวณตำแหน่ง seek ให้ TV sync
  }

sessions/{sessionId}/pages/{pageId}/answers/{answerId}
  participantId: string
  name: string
  text: string                // max 280 ตัวอักษร
  createdAt: timestamp
  showOnTV: boolean            // default false
  showOnMobile: boolean        // default false
```

**Firestore Security Rules (แนวทาง):** เปิดให้อ่าน/เขียนได้อิสระ (ไม่มี auth check) แต่ validate:
- `participants.name`: string, length 1–40
- `answers.text`: string, length 1–280
- `sessions.title`: string, length ≤ 100
ปฏิเสธ write ที่ field ประเภทผิดหรือยาวเกินกำหนด

---

## 4. Video Upload Workflow (Firebase Storage)

- Host อัปโหลดไฟล์วิดีโอโดยตรงจากหน้า "แก้ไขคำถาม" ตอนสร้าง/แก้ไข page ประเภท `video`
- อัปโหลดไปที่ Firebase Storage path: `sessions/{sessionId}/videos/{pageId}.mp4`
- หลังอัปโหลดสำเร็จ นำ download URL มาเซฟใน `content.videoUrl` และ path ใน `content.videoStoragePath`
- แนะนำจำกัดขนาดไฟล์ไม่เกิน **200MB** และรับเฉพาะ `.mp4` (แจ้ง error ที่หน้า host ถ้าเกิน)
- แสดง progress bar ระหว่างอัปโหลดที่หน้า host
- TV โหลดวิดีโอจาก `videoUrl` เล่นแบบ `<video>` tag ปกติ, sync การเล่น/หยุดจาก `videoState.playing` + คำนวณตำแหน่งจาก `videoState.startedAt`

---

## 5. Functional Requirements แยกตามหน้าจอ

### 5.1 หน้า Host (`/host`)

**โหมดเตรียมงาน (ก่อนกด "เริ่มงานใหม่"):**
- ตั้งชื่องาน
- จัดการ list ของ pages: เพิ่ม/ลบ/เรียงลำดับ (drag หรือปุ่มขึ้น-ลง)/แก้ไข แต่ละ page เลือกประเภทได้ 3 แบบ
- ปุ่ม "เริ่มงานใหม่" → สร้าง session ใหม่, อัปเดต pointer `system/currentSession`, ตั้ง `status = "presenting"`, `currentPageIndex = 0`

**โหมดกำลัง present:**
- แสดงหน้าปัจจุบัน + ปุ่ม **ย้อนกลับ / ถัดไป** (แก้ `currentPageIndex`, ปิดปุ่มถัดไปถ้าอยู่หน้าสุดท้าย, ปิดปุ่มย้อนกลับถ้าอยู่หน้าแรก)
- ปุ่ม **"แก้ไขคำถาม"** เข้าถึงได้ตลอดเวลาแม้กำลัง present — เพิ่ม/ลบ/แก้ page ได้ทันที ระบบอื่นเห็นการเปลี่ยนแปลงทันทีผ่าน realtime listener
- เมื่ออยู่หน้า type = `question`: แสดง **list คำตอบทั้งหมดของ page นั้น** เรียงใหม่สุดอยู่บน พร้อมชื่อผู้ตอบ แต่ละรายการมีปุ่ม toggle 2 อัน:
  - **"ขึ้นจอทีวี"** → update `showOnTV`
  - **"ขึ้นจอมือถือผู้ร่วมงาน"** → update `showOnMobile`
  - (toggle ได้หลายคำตอบพร้อมกัน ไม่จำกัดแค่ 1 อัน)
- เมื่ออยู่หน้า type = `video`: ปุ่ม play/pause ควบคุม `videoState`
- แสดงจำนวนผู้เข้าร่วมปัจจุบัน (real-time count จาก `participants`)
- ปุ่ม **"จบงาน"** → `status = "ended"`, `endedAt = now`

### 5.2 หน้า TV (`/tv`)

- อ่าน pointer แล้ว subscribe session ปัจจุบัน
- `status = "idle"` หรือยังไม่มี session → แสดงหน้ารอเปล่าๆ พร้อมข้อความสั้นๆ
- เมื่อเริ่มงาน (ก่อนเข้าคำถามแรก หรือช่วง `currentPageIndex` ยังไม่เริ่ม) → แสดง **QR code** เข้ารหัสลิงก์ `/join` คงที่ + จำนวนคนที่ join แล้วแบบ real-time
- เปลี่ยนหน้าตาม `currentPageIndex`:
  - `question` → คำถามตัวใหญ่กลางจอ + คำตอบใหม่ล่าสุด (จำกัด query ล่าสุด 30 รายการ) ลอยผ่านจอแบบ real-time
  - `video` → เล่นวิดีโอเต็มจอ sync ตาม `videoState`
  - `message` → ข้อความเต็มจอ
- คำตอบที่ host กด "ขึ้นจอทีวี" (`showOnTV = true`) แสดงแบบเด่นกลางจอ ขนาดใหญ่กว่าคำตอบที่ลอยทั่วไป

### 5.3 หน้า Join (`/join`)

- ฟอร์มกรอกชื่ออย่างเดียว (validate 1–40 ตัวอักษร, ห้ามว่าง)
- Submit → เรียก Firebase Anonymous Auth (ถ้ายังไม่มี uid ในเครื่อง) → เขียน doc ใน `participants` โดยใช้ uid เป็น `participantId`
- Redirect ไป `/participant`
- ไม่มีการปิดรับ ไม่ว่างานจะเริ่มไปแล้วกี่หน้า

### 5.4 หน้า Participant (`/participant`)

- ถ้ายังไม่เคย join (ไม่มี participantId ในเครื่อง) → redirect กลับ `/join`
- Subscribe `currentPageIndex` ของ session ปัจจุบัน → เปลี่ยนหน้าตาม host แบบ real-time ทันทีที่เข้ามา ไม่ว่าจะเข้าตอนไหน
- หน้า `question` → ช่องพิมพ์คำตอบ (validate 1–280 ตัวอักษร) + ปุ่มส่ง + เห็นคำตอบคนอื่นลอยแบบเดียวกับ TV (เวอร์ชันย่อขนาดเล็กลง)
  - หลังส่งคำตอบแล้ว ปิดฟอร์ม/disable ปุ่มส่งซ้ำสำหรับ page นั้น (1 คน ตอบได้ 1 ครั้งต่อ 1 คำถาม)
- คำตอบที่ host กด "ขึ้นจอมือถือ" (`showOnMobile = true`) แสดงเด่นในหน้านี้
- หน้า `video` / `message` → แสดงข้อความสถานะ ("กำลังฉายอยู่บนจอทีวี") ไม่ต้องเล่นซ้ำ

### 5.5 หน้า History (`/host/history`)

- List session ทั้งหมด เรียงตามวันที่ล่าสุด แสดงชื่องาน + วันที่ + สถานะ
- เลือกดู session ใดหนึ่ง → เห็นทุกคำถามพร้อมคำตอบทั้งหมด + ชื่อผู้ตอบ
- ปุ่ม **Export CSV** ต่อ session (query Firestore แล้ว generate CSV ฝั่ง client ทั้งหมด ไม่ต้องมี server)

---

## 6. Design System

### 6.1 แนวคิดการออกแบบ (Design Direction)

**"ล้ำแต่อบอุ่น"** — โทน earth tone ให้ความรู้สึกอบอุ่น เป็นธรรมชาติ ผสมกับ layout/typography ที่ดูโมเดิร์น สะอาดตา ขอบมนเล็กน้อย (ไม่มนจัดจนดูเป็นการ์ตูน) พื้นผิวเรียบ ไม่ใช้ gradient/shadow หนักๆ

### 6.2 Color Palette (Earth tone)

ใช้เป็น CSS variables ตรงนี้ได้เลย:

```css
:root {
  /* พื้นหลัง */
  --bg-page: #F7F1E8;        /* ครีมอ่อน พื้นหลังหลัก */
  --bg-surface: #FFFCF7;     /* พื้นการ์ด/กล่อง สว่างกว่าพื้นหลัง */
  --bg-surface-alt: #EFE6D8; /* พื้นรอง เช่น แถบ input, hover */

  /* สีข้อความ */
  --text-primary: #3E2B22;   /* น้ำตาลเข้ม เกือบดำ ใช้กับหัวข้อ/ข้อความหลัก */
  --text-secondary: #7A6552; /* น้ำตาลอ่อน ใช้กับ subtitle/hint */
  --text-on-accent: #FFFCF7; /* ข้อความบนพื้นสี accent */

  /* สีหลัก (accent) */
  --color-terracotta: #C97A56;   /* หลัก ใช้กับปุ่มหลัก/ไฮไลต์ */
  --color-terracotta-dark: #A85F3F;
  --color-sage: #8A9A6E;         /* รอง ใช้กับสถานะ/แท็ก */
  --color-sage-dark: #6B7A52;
  --color-mustard: #D9A441;      /* เน้นพิเศษ เช่น คำตอบที่ถูกเลือกขึ้นจอ */

  /* เส้นขอบ */
  --border-color: #E3D5C2;
  --border-color-strong: #C9B99F;

  /* สถานะ */
  --color-danger: #B4544A;
  --color-success: #6B8F5C;
}
```

**หลักการใช้สี:**
- พื้นหลังหน้าเว็บทั้งหมด = `--bg-page`
- การ์ด/กล่องคำตอบ/input = `--bg-surface`
- ปุ่มหลัก (next, ส่งคำตอบ, เริ่มงานใหม่) = พื้น `--color-terracotta` ตัวหนังสือ `--text-on-accent`
- ปุ่มรอง/secondary action = พื้นโปร่งใส ขอบ `--border-color-strong` ตัวหนังสือ `--text-primary`
- คำตอบที่ host เลือก "ขึ้นจอ" = ไฮไลต์ด้วย `--color-mustard` (ขอบหรือพื้นหลังอ่อนของสีนี้)
- ห้ามใช้สีสดจัด (ไม่ใช้สีฟ้า/ม่วง/ชมพูสด) เพื่อคงโทน earth tone ทั้งระบบ

### 6.3 Typography

- ฟอนต์: **Sarabun** (Google Fonts) ใช้ทั้งระบบ ทั้งภาษาไทยและอังกฤษ
```css
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');
body { font-family: 'Sarabun', sans-serif; }
```

| ระดับ | ขนาด | น้ำหนัก | ใช้กับ |
|---|---|---|---|
| Display (TV คำถามหลัก) | 48–64px | 600 | คำถามบนจอทีวี |
| H1 | 32px | 600 | หัวข้อหน้า host/participant |
| H2 | 22px | 600 | หัวข้อรอง |
| Body | 16px | 400 | ข้อความทั่วไป |
| Body small | 14px | 400 | หมายเหตุ/timestamp |
| Caption | 12px | 400 | label เล็กๆ |

### 6.4 Spacing & Radius Scale

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 32px;
  --space-6: 48px;

  --radius-sm: 8px;    /* input, ปุ่มเล็ก */
  --radius-md: 14px;   /* การ์ด, ปุ่มหลัก */
  --radius-lg: 20px;   /* การ์ดใหญ่, modal */
  --radius-pill: 999px; /* badge, avatar, tag ชื่อผู้ตอบ */
}
```

- ใช้ `--radius-md` เป็นค่า default สำหรับ container ส่วนใหญ่ — มนพอให้รู้สึกนุ่มนวล แต่ไม่ถึงกับกลมมนแบบการ์ตูน
- ไม่ใช้เงา (`box-shadow`) หนักหรือ blur เยอะ — ถ้าต้องการแยกชั้น ใช้ `border: 1px solid var(--border-color)` แทนเงาเป็นหลัก ถ้าจำเป็นต้องมีเงาให้ใช้เบาๆ เช่น `box-shadow: 0 1px 3px rgba(62,43,34,0.08)`

### 6.5 Animation & Performance Guidelines

**เป้าหมาย: ลื่นไหลแต่เบา ไม่ทำให้เครื่อง (โดยเฉพาะ TV ที่มักมี GPU อ่อน) ค้างหรือ lag แม้มีคนตอบพร้อมกัน 100+ คน**

กติกาบังคับ:
1. Animate เฉพาะ `transform` และ `opacity` เท่านั้น — **ห้าม** animate `width`, `height`, `top/left`, `box-shadow`, `filter`, `backdrop-filter` เพราะทำให้ browser reflow/repaint หนัก
2. ระยะเวลา animation มาตรฐาน: transition ทั่วไป (hover, เปลี่ยนหน้า) = 200–300ms, ease-out; คำตอบลอย = 4–6 วินาทีต่อชิ้น, linear หรือ ease-in-out
3. **จำกัดจำนวนคำตอบลอยที่ render พร้อมกันสูงสุด 20–25 ชิ้นบนจอ** — ถ้ามีคำตอบใหม่เข้ามาเกิน ให้ลบ DOM element เก่าสุดที่ลอยพ้นจอไปแล้วออกก่อนเพิ่มชิ้นใหม่ (ห้ามปล่อยให้ DOM สะสมไม่จำกัด)
4. คำตอบลอย = fade in (opacity 0→1) + เคลื่อนที่แนวตั้ง/เฉียงด้วย `transform: translateY()` เท่านั้น ไม่ต้องมี physics/พลิกหมุนซับซ้อน
5. ใช้ `will-change: transform, opacity` เฉพาะ element ที่กำลัง animate อยู่จริง และเอาออกเมื่อ animation จบ (ป้องกัน memory bloat)
6. ห้ามใช้ animation library ที่มี physics engine (เช่น matter.js) — ใช้ CSS keyframes ล้วนพอ
7. เคารพ `prefers-reduced-motion: reduce` — ถ้า user ตั้งค่านี้ไว้ ให้ตัด animation คำตอบลอยเหลือแค่ fade in เฉยๆ

**ตัวอย่าง keyframe คำตอบลอย:**
```css
@keyframes floatUp {
  0%   { opacity: 0; transform: translate(0, 0) scale(0.9); }
  10%  { opacity: 1; transform: translate(0, -10%) scale(1); }
  90%  { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--drift-x, 20px), -100%) scale(1); }
}
.floating-answer {
  animation: floatUp 5s ease-in-out forwards;
}
```
(`--drift-x` สุ่มค่าต่อชิ้นตอน spawn เพื่อให้แต่ละคำตอบลอยไปคนละทิศเล็กน้อย ดูเป็นธรรมชาติ ไม่ต้องพึ่ง physics)

### 6.6 Component Style Notes

- **การ์ดคำตอบ (floating answer bubble):** พื้น `--bg-surface`, ขอบ `--border-color`, `border-radius: var(--radius-md)`, padding `var(--space-3)`, ชื่อผู้ตอบตัวเล็กสีเทาอมน้ำตาล (`--text-secondary`) อยู่มุมล่างของการ์ด
- **QR code บนจอทีวี:** ใส่กรอบการ์ดพื้นขาวครีม (`--bg-surface`) ขอบมน `--radius-lg` เพื่อให้ QR สแกนง่าย ไม่ต้องใส่สีทับตัว QR
- **ปุ่ม toggle "ขึ้นจอ" ที่หน้า host:** ใช้สไตล์ switch/pill (`--radius-pill`) เปลี่ยนสีพื้นเป็น `--color-mustard` เมื่อ active
- **โลโก้/แบรนด์:** ไม่มีโลโก้หน่วยงาน ใช้ typography-based branding — ชื่อระบบ/ชื่องานเป็นตัวอักษร Sarabun น้ำหนัก 600 แทนโลโก้

---

## 7. Non-functional Requirements

- **สเกล:** รองรับผู้เข้าร่วมพร้อมกัน 100+ คน — จำกัด query คำตอบด้วย `orderBy(createdAt, desc).limit(30)` ต่อ page และจำกัด DOM ของคำตอบลอยตามข้อ 6.5
- **ภาษา:** UI ภาษาไทยทั้งหมด, ฟอนต์ Sarabun
- **Auth:** Firebase Anonymous Auth แบบไม่มี UI (สร้าง uid อัตโนมัติตอนกรอกชื่อครั้งแรก เก็บไว้ใน local storage ของเครื่อง)
- **Security:** ไม่มีระบบสิทธิ์ซับซ้อน ใช้ Firestore rules validate ความยาว/ประเภทข้อมูลตามข้อ 3
- **Data retention:** ไม่ลบ session อัตโนมัติ เก็บถาวรทั้งหมด
- **Performance:** ปฏิบัติตามกติกาใน 6.5 อย่างเคร่งครัด โดยเฉพาะบนจอ TV ซึ่งมักเป็นอุปกรณ์ที่มี GPU/CPU จำกัด

---

## 8. Tech Stack

- **Frontend:** React (Vite), routing ตามข้อ 2
- **Backend:** ไม่มี server แยก — Firestore เป็นแหล่งข้อมูลเดียว
- **Hosting:** Firebase Hosting
- **Auth:** Firebase Anonymous Auth
- **Storage:** Firebase Storage (สำหรับวิดีโอ)
- **QR Code:** สร้างฝั่ง client (เช่น `qrcode.react`) จากลิงก์ `/join` คงที่
- **Font:** Sarabun ผ่าน Google Fonts CDN
- **Animation:** CSS keyframes ล้วน ตามข้อ 6.5 (ไม่ใช้ physics library)

---

## 9. Acceptance Criteria สรุป (สำหรับเช็คว่าทำครบ)

- [ ] เข้า `/host`, `/tv`, `/join` ได้โดยไม่ต้อง login และลิงก์ไม่เปลี่ยนไม่ว่าจะจัดงานกี่ครั้ง
- [ ] Host เพิ่ม/ลบ/แก้/เรียงคำถามได้ทั้งก่อนและระหว่าง presenting โดยไม่ต้อง refresh หน้าอื่น
- [ ] TV แสดง QR → คน join → ชื่อขึ้นในรายชื่อผู้เข้าร่วมแบบ real-time
- [ ] คนที่ join หลังเริ่มคำถามไปแล้ว เห็นหน้าปัจจุบันทันที ตอบได้เลย
- [ ] พิมพ์คำตอบแล้วเห็นคำตอบตัวเองและคนอื่นลอยทั้งจอ TV และจอมือถือ
- [ ] Host กด "ขึ้นจอทีวี"/"ขึ้นจอมือถือ" แล้วคำตอบนั้นแสดงเด่นทันทีที่จอปลายทาง
- [ ] อัปโหลดวิดีโอผ่านหน้า host แล้วเล่นได้บน TV, host กด play/pause ควบคุมได้
- [ ] จบงานแล้วข้อมูลยังอยู่ครบใน `/host/history`, export CSV ได้
- [ ] ทดสอบคำตอบลอยพร้อมกัน 100+ ข้อความ เฟรมเรตยังลื่น ไม่มี DOM ค้างสะสม
- [ ] สี/ฟอนต์/ขอบมนตรงตาม design system ในข้อ 6 ทั้งระบบ
