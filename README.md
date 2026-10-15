# ระบบจองโต๊ะจีนออนไลน์ — ร้านพิพัฒน์โภชนา
itproject

เว็บแอปจองโต๊ะจีนแบบครบวงจร มีทั้งฝั่งลูกค้า (จองงาน เลือกเมนู เลือกสถานที่บนแผนที่) และฝั่งเจ้าของร้าน (จัดการคิว แพ็กเกจ เมนู กำลังคน และออกเอกสาร)

ดู requirement/ขอบเขตโครงงานฉบับเต็มได้ที่ [REQOLD.md](./REQOLD.md)

สถาปัตยกรรม แผนภาพ ER/ลำดับการทำงาน จุดเด่นทางเทคนิค ผลการทดสอบ และข้อจำกัดที่รู้ตัว ดูที่ [docs/SYSTEM_OVERVIEW.md](./docs/SYSTEM_OVERVIEW.md)

โปรเจกต์นี้เป็น **monorepo** มี 2 ส่วน:

```
.
├── Catering Booking Web Application/   # Frontend — React 19 + Vite + Tailwind CSS v4
└── backend/                            # Backend — NestJS + Prisma + PostgreSQL
```

## เทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| แผนที่ | Leaflet + OpenStreetMap (Nominatim) |
| กราฟ | Recharts |
| Backend | NestJS (Node.js + TypeScript) |
| ฐานข้อมูล | PostgreSQL (Railway) ผ่าน Prisma ORM |
| ยืนยันตัวตน | Auth0 — Google Social Login (ลูกค้า), Username/Password (เจ้าของร้าน) |
| Automated test | Vitest (frontend), Jest (backend) |
| Package manager | pnpm |
| แผน deploy | Vercel (frontend) + Railway (backend + DB) |

---

## เริ่มใช้งาน

### สิ่งที่ต้องมี

- [Node.js](https://nodejs.org/) เวอร์ชัน **20.19.0 ขึ้นไป** หรือ **22.12.0 ขึ้นไป** — แนะนำให้ลง **22 LTS** ไปเลย
- pnpm (ใช้ `corepack enable` แล้วเรียก `corepack pnpm` ได้เลยโดยไม่ต้องติดตั้งเพิ่ม)
- บัญชี [Auth0](https://manage.auth0.com/) และโปรเจกต์ [Railway](https://railway.com/) (สำหรับ PostgreSQL) — ดูวิธีตั้งค่าด้านล่าง

ตรวจเวอร์ชันก่อนเริ่ม

```bash
node -v    # ต้องได้ v20.19.x ขึ้นไป หรือ v22.12.x ขึ้นไป
corepack enable
```

### 1. Backend

```bash
cd backend
corepack pnpm install
cp .env.example .env   # ใส่ DATABASE_URL, AUTH0_DOMAIN, AUTH0_AUDIENCE ของจริง
corepack pnpm prisma:migrate     # สร้างตารางในฐานข้อมูล
corepack pnpm prisma:seed        # ใส่แพ็กเกจ/เมนูเริ่มต้น (ข้ามถ้ามีข้อมูลอยู่แล้ว)
corepack pnpm start:dev          # รันที่ http://localhost:3000
```

### 2. Frontend

```bash
cd "Catering Booking Web Application"
corepack pnpm install
cp .env.example .env   # ใส่ VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE
corepack pnpm dev                # รันที่ http://localhost:8443
```

> **สำหรับ Windows PowerShell** — ถ้า `pnpm` ขึ้น `cannot be loaded because running scripts is disabled` ดูวิธีแก้ที่หัวข้อ [แก้ปัญหาที่พบบ่อย](#แก้ปัญหาที่พบบ่อย)

### ตั้งค่า Auth0 (จำเป็นก่อนรันจริง)

1. สร้าง Application ประเภท **Single Page Application** → เอา Domain + Client ID มาใส่ `.env` ฝั่ง frontend
2. ตั้ง Allowed Callback / Logout / Web Origins = `http://localhost:8443`
3. เปิด Social Connection **Google** (ใช้กับฝั่งลูกค้า)
4. เปิด Database Connection **Username-Password-Authentication** (ใช้กับฝั่งเจ้าของร้าน) แล้วสร้างบัญชี Owner เอง 1 บัญชี (User Management → Users → Create User)
5. สร้าง **API** (Applications → APIs → Create API) เอา Identifier มาใส่ `VITE_AUTH0_AUDIENCE` (frontend) และ `AUTH0_AUDIENCE` (backend) ให้ตรงกันเป๊ะ
6. ในหน้า Settings ของ API นั้น เลื่อนไปหัวข้อ **Application Access Policy** ตั้ง **User-delegated Access** เป็น **"All Applications"** (หรือไป authorize แอปเป็นรายตัวที่ Application → APIs tab ก็ได้)
7. สร้าง Auth0 Action (Actions → Library → Build Custom, Trigger: **Login / Post Login**) เพื่อกำหนด role ตาม connection ที่ login เข้ามา:

   ```js
   exports.onExecutePostLogin = async (event, api) => {
     const role = event.connection.name === 'Username-Password-Authentication' ? 'owner' : 'customer'
     api.idToken.setCustomClaim('https://pipatphochana-catering.app/role', role)
     api.accessToken.setCustomClaim('https://pipatphochana-catering.app/role', role)
   }
   ```

   กด **Deploy** แล้วไปที่ **Actions → Triggers → post-login** ลาก Action นี้เข้า flow แล้วกด **Apply**

---

## การเข้าใช้งาน

หน้าแรกคือหน้า **เข้าสู่ระบบ**:

- ปุ่ม **"เข้าสู่ระบบด้วย Google"** — สำหรับลูกค้า login ผ่าน Auth0 (Google Social Login)
- ลิงก์ **"เข้าระบบในฐานะเจ้าของร้าน"** — สำหรับพนักงานร้าน login ด้วย username/password ที่สร้างไว้ใน Auth0

ลูกค้าที่ login ครั้งแรกจะต้องกรอกเบอร์โทร/Line ID เพิ่ม (ข้อมูลที่ Google ไม่มีให้) ก่อนเข้าใช้งาน

เจ้าของร้านสามารถกดปุ่มลอย **"กลับสู่แดชบอร์ด"** (มุมขวาล่าง) เพื่อสลับกลับจากมุมมองลูกค้าได้ทุกเมื่อ

---

## ความสามารถ

### ฝั่งลูกค้า (6 ขั้นตอน)

1. **เลือกวันจัดงาน** — ปฏิทินบอกสถานะคิวจริง (ว่าง / เต็ม) ตามการจองจริงในฐานข้อมูล
2. **เลือกจำนวนโต๊ะ** — 1–500 โต๊ะ พร้อมแจ้งเงื่อนไขพื้นที่
3. **เลือกสถานที่** — แผนที่จริง (Leaflet + OpenStreetMap) ค้นหาสถานที่ ลากหมุด ใช้ GPS และกรอกรายละเอียดการเข้าถึง
4. **เลือกแพ็กเกจ** — โต๊ะจีน 2,000 / 3,000 / 5,000 บาทต่อโต๊ะ
5. **เลือกเมนู** — อาหาร 9 ข้อ เลือกได้ข้อละ 1 อย่างตามที่ร้านกำหนด
6. **ตะกร้าและยืนยันการจอง** — สรุปราคา แผนที่ และรายการอาหาร แล้วบันทึกลงฐานข้อมูลจริง

มีหน้า **ประวัติการจอง** ที่เปิดดู/พิมพ์ **ใบเสนอราคา** และ **ใบจอง** ได้ พร้อมแนบสลิปโอนเงินมัดจำ

### ฝั่งเจ้าของร้าน

- **แดชบอร์ด** — รายได้/จำนวนงานย้อนหลัง สัดส่วนแพ็กเกจ และงานที่ใกล้ถึง (คำนวณจากข้อมูลจริงในฐานข้อมูล)
- **รายการจอง** — ดูรายละเอียด เปลี่ยนสถานะ และ **คำนวณจำนวนพนักงานอัตโนมัติ** พร้อมปรับแก้และใส่หมายเหตุได้
- **ปฏิทิน** — ดูงานทั้งเดือน สถานะคิว และเปลี่ยนสถานะงานได้จากปฏิทิน
- **แพ็กเกจ** — เพิ่ม/แก้ไขแพ็กเกจ และเลือกเมนูในแต่ละประเภทอาหารได้เอง
- **เมนูอาหาร** — เพิ่ม/แก้ไข/ลบเมนู อัปโหลดรูปจากเครื่อง (ย่อขนาดอัตโนมัติ)
- **ลูกค้า** — รายชื่อ/ประวัติลูกค้าพร้อมเบอร์โทรและ Line ID
- **เอกสาร** — ออกใบเสนอราคาและใบจอง พิมพ์หรือบันทึกเป็น PDF ได้
- **ตั้งค่า** — แก้ข้อมูลร้าน อัตรามัดจำ ค่าขนส่ง ขั้นต่ำโต๊ะ

---

## กติกาธุรกิจในระบบ

| เรื่อง | เงื่อนไข | แก้ได้ที่ (frontend) |
|---|---|---|
| พื้นที่ร้าน | **นครปฐม** รับจัดกี่โต๊ะก็ได้ ไม่มีค่าขนส่ง | `src/geo.ts` |
| กรุงเทพและปริมณฑล | ไม่ถึง 30 โต๊ะ คิดค่าขนส่ง 2,000 บาท | `src/geo.ts` |
| นอกพื้นที่ | ต้องสั่งขั้นต่ำ 30 โต๊ะ ค่าเดินทางแจ้งเป็นรายงาน | `src/geo.ts` |
| VAT / ค่าบริการ | **ไม่คิด** — ยอดรวม = ค่าอาหาร + ค่าขนส่ง | — |
| คิวรับงาน | 500 โต๊ะต่อช่วงเวลา (เช้า / กลางวัน / เย็น) | `src/availability.ts` |
| พนักงานเสิร์ฟ | 1 คน ดูแล 5–8 โต๊ะ | `src/staffing.ts` |
| พ่อครัว | 1 คน ต่อ 1 งาน | `src/staffing.ts` |
| ผู้ช่วยพ่อครัว / ล้างจาน | 1 คน ต่อ 20 โต๊ะ (เศษเกิน 10 โต๊ะ เพิ่ม 1 คน) | `src/staffing.ts` |

ค่าเริ่มต้นของร้าน (มัดจำ, ค่าขนส่ง, ขั้นต่ำโต๊ะ, ข้อมูลร้านบนหัวเอกสาร) ตอนนี้แก้ได้จริงจากหน้า **ตั้งค่า** ฝั่งเจ้าของร้าน (บันทึกลงฐานข้อมูล ไม่ใช่ค่าคงที่ในโค้ดอีกต่อไป)

---

## โครงสร้างโปรเจกต์

```
Catering Booking Web Application/
├── src/
│   ├── App.tsx                 # จัดการ state, auth gating และสลับหน้าทั้งหมด
│   ├── api.ts                   # เรียก backend API ทั้งหมด (แปลง shape ให้ตรง types.ts)
│   ├── auth.ts                  # ค่าคงที่/helper เกี่ยวกับ Auth0 role claim
│   ├── data.ts                  # หมวดอาหาร (CATEGORIES) และ helper functions
│   ├── types.ts                 # TypeScript types ทั้งโปรเจกต์
│   ├── geo.ts                   # โซนบริการ ค่าขนส่ง และค้นหาสถานที่
│   ├── availability.ts          # คิวรับงานและสถานะปฏิทิน
│   ├── staffing.ts               # คำนวณจำนวนพนักงาน
│   ├── documents.ts             # ใบเสนอราคา/ใบจอง และบาทตัวอักษร
│   ├── imageUpload.ts           # อ่านและย่อรูปที่อัปโหลด
│   ├── *.test.ts                # unit test (Vitest) คู่กับไฟล์กติกาธุรกิจแต่ละไฟล์
│   ├── components/              # Navbar, แผนที่, การ์ดเมนู, เอกสาร, ErrorBanner
│   └── screens/
│       ├── ...                  # หน้าฝั่งลูกค้า
│       └── owner/               # หน้าฝั่งเจ้าของร้าน
├── index.html
├── package.json
├── vite.config.ts
└── vitest.config.ts             # แยกจาก vite.config.ts เพื่อไม่ให้ชนกับ plugin ของ Figma Make

backend/
├── prisma/
│   ├── schema.prisma            # User, Booking, Package, PackageCourse, MenuItem, Settings
│   └── seed.ts                  # ใส่แพ็กเกจ/เมนูเริ่มต้น
├── jest.config.js
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── auth/                     # Auth0 JWT guard + role guard (+ roles.guard.spec.ts)
    ├── users/                    # sync profile, PATCH เบอร์โทร/Line ID
    ├── bookings/
    ├── packages/                 # รวม endpoint แก้ทีละข้อ (courses) แยกจากแก้ทั้งแพ็กเกจ
    ├── menus/
    └── settings/
```

---

## คำสั่งที่ใช้บ่อย

### Frontend

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `pnpm dev` | รัน development server พร้อม hot reload (`localhost:8443`) |
| `pnpm build` | สร้างไฟล์สำหรับ production ลงโฟลเดอร์ `dist/` |
| `pnpm preview` | ดูตัวอย่างไฟล์ที่ build แล้ว |
| `pnpm test` | รัน unit test ทั้งหมด (Vitest) |
| `pnpm test:watch` | รัน test แบบ watch mode |
| `npx tsc --noEmit` | ตรวจ TypeScript ทั้งโปรเจกต์ |

### Backend

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `pnpm start:dev` | รัน development server พร้อม hot reload (`localhost:3000`) |
| `pnpm build` | compile TypeScript ลงโฟลเดอร์ `dist/` |
| `pnpm prisma:migrate` | สร้าง/อัปเดต migration และตารางในฐานข้อมูล (dev) |
| `pnpm prisma:deploy` | รัน migration ที่มีอยู่แล้วกับฐานข้อมูล (production) |
| `pnpm prisma:seed` | ใส่ข้อมูลแพ็กเกจ/เมนูเริ่มต้น |
| `pnpm test` | รัน unit test ทั้งหมด (Jest) |

---

## ระบบหลายร้านและสิทธิ์ผู้ใช้

- **บัญชีเดียวใช้ได้หลายบทบาท:** `User.role` ระดับระบบมีแค่ `CUSTOMER` หรือ `SUPER_ADMIN` ส่วนการเป็น **owner ของแต่ละร้าน** เก็บในตาราง `ShopMember` (คนหนึ่งเป็น owner ได้หลายร้าน และเป็นลูกค้าของร้านที่ไม่ได้เป็น owner ได้ด้วยบัญชีเดียว)
- **ร้านที่กำลังเปิดอยู่** ส่งไปกับทุกคำขอด้วย header `X-Shop-Id` backend ตรวจ `ShopMember` ใน DB เสมอ (ส่ง header ปลอมไม่ได้สิทธิ์เพิ่ม) ดู `backend/src/auth/shop-context.ts`
- **เพิ่มเจ้าของร้านด้วยอีเมลได้เลย แม้ยังไม่เคย login:** ระบบเก็บเป็นคำเชิญล่วงหน้า (`ShopInvite`) แล้วให้สิทธิ์ตอนเจ้าของ login ครั้งแรก (ตรวจอีเมลที่ Auth0 ยืนยันแล้วผ่าน `/userinfo` — access token ต้องมี scope `openid`) เจ้าของร้านเข้าด้วยปุ่ม Google เดียวกับลูกค้าก็ได้
- **Super admin** เป็นคนสร้างร้านและเพิ่ม/ถอด owner (อีเมลใน `SUPER_ADMIN_EMAILS` จะเป็น super admin ตอน login ครั้งแรก) owner เลื่อน/ถอด owner คนอื่นในร้านตัวเองได้ โดยต้องเหลือ owner อย่างน้อย 1 คน
- **ใบจองของลูกค้าแยกตามร้าน:** หน้าประวัติการจองของร้านหนึ่งไม่แสดงใบจองของอีกร้าน

### กติกาใบจองที่ backend บังคับ

- จองวันที่ย้อนหลัง (ก่อนวันนี้ตามเวลาไทย) ไม่ได้ และห้ามจองวันที่ร้านปิด / วันที่มีงานอยู่แล้ว
- สถานะใบจอง (owner เปลี่ยนเอง): **ยกเลิกแล้วเปลี่ยนต่อไม่ได้**, **เสร็จสิ้นแล้ว** กลับได้แค่เป็น "ยืนยันแล้ว" ห้ามกลับรอยืนยันหรือยกเลิก (กฎอยู่ที่ `backend/src/bookings/booking-rules.ts` และสำเนาฝั่งหน้าจอ `src/bookingStatus.ts`)
- ราคา ค่าขนส่ง และโซนพื้นที่ คำนวณที่ backend เสมอ ไม่เชื่อค่าที่ส่งมาจากเบราว์เซอร์

## การชำระเงินและ SlipOK

- **ข้อมูลการชำระเงิน** owner กรอกในหน้าตั้งค่า: บัญชีธนาคาร + พร้อมเพย์ (หลัก) และเพิ่มเติมได้อีกอย่างละไม่เกิน 8 รายการ (ธนาคารเดียวกันหลายบัญชี คนละธนาคาร หรือพร้อมเพย์หลายเลขได้ ครบทุกธนาคารที่ SlipOK รองรับ)
- **ต้องกรอกให้ตรงกับบัญชีที่ผูกไว้ใน SlipOK เท่านั้น** — API ของ SlipOK ไม่มีให้ดู/เพิ่ม/แก้/ลบบัญชี (มีแค่ตรวจสลิป เช็คโควต้า รหัสธนาคาร) บัญชีที่ผูกกับ Branch ID ต้องจัดการในระบบของ SlipOK เอง
- **ลูกค้าเห็นข้อมูลชำระเงินเฉพาะร้านที่ "เชื่อม SlipOK แล้ว"** = กรอก API key + Branch ID แล้วกด "ทดสอบการเชื่อมต่อ" ผ่านและบันทึก (เปลี่ยน key/branch ต้องทดสอบใหม่) ร้านที่ตั้ง key ไว้ก่อนมีกติกานี้ถือว่าเชื่อมแล้วโดย migration
- **ลูกค้าเลือกช่องทางโอน** ก่อนแนบสลิป (ถ้าร้านมีหลายช่องทาง) ระบบเก็บช่องทางที่เลือกไว้ที่ใบจอง
- **ตรวจสลิปอัตโนมัติ:** SlipOK ยืนยันกับธนาคาร แล้วระบบเทียบ "ผู้รับในสลิป" กับบัญชีที่ร้านตั้งไว้อีกชั้น (ต่อบัญชี ตรงบัญชีใดบัญชีหนึ่งก็ผ่าน) ไม่ตรง = "บัญชีผู้รับไม่ตรง" ลูกค้าแนบใหม่ได้ ส่วนสลิปที่ตรวจผ่านแล้วเปลี่ยนไม่ได้ (โค้ดอยู่ที่ `backend/src/slip-verify/`)

## ตัวแปรสภาพแวดล้อม

Backend (`backend/.env` หรือ Variables ของ Railway) — ขาด 3 ตัวแรกระบบจะไม่ยอมเริ่มและบอกชื่อตัวแปรที่ขาด

| ตัวแปร | จำเป็น | ความหมาย |
|---|---|---|
| `DATABASE_URL` | ใช่ | Postgres |
| `AUTH0_DOMAIN` / `AUTH0_AUDIENCE` | ใช่ | ตรวจ JWT จาก Auth0 |
| `FRONTEND_ORIGIN` | แนะนำ | โดเมนฟรอนต์ที่อนุญาต CORS (คั่นด้วย `,` ได้) |
| `UPLOADS_DIR` | production | โฟลเดอร์เก็บรูป/สลิป ต้องชี้ไปที่ Volume ถาวร (เช่น `/data/uploads`) |
| `SUPER_ADMIN_EMAILS` | ไม่บังคับ | อีเมล super admin คนแรก (คั่นด้วย `,`) |
| `SETTINGS_ENCRYPTION_KEY` | แนะนำ | ข้อความลับยาวๆ ใช้เข้ารหัส SlipOK API key ใน DB (AES-256-GCM) ตั้งแล้วอย่าเปลี่ยน/ทำหาย ไม่งั้นต้องกรอก key ใหม่ — key เดิมที่เป็นข้อความตรงๆ จะถูกเข้ารหัสเมื่อ owner กดบันทึกตั้งค่าครั้งถัดไป |
| `TRUST_PROXY` | ไม่บังคับ | จำนวนชั้น proxy หน้าเซิร์ฟเวอร์ (ค่าเริ่มต้น 1 สำหรับ Railway, ใส่ 0 ตอนรันตรงบนเครื่อง dev) |
| `PORT` | ไม่บังคับ | ค่าเริ่มต้น 3000 |

Frontend: `VITE_API_BASE_URL` (URL ของ backend — ฝังตอน build), `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`

## Deploy production (Railway)

1. **Backend service:** Root Directory = `backend`, Build `pnpm exec prisma generate && pnpm run build`, Pre-deploy `pnpm exec prisma migrate deploy`, Start `pnpm start`, Healthcheck Path `/health`
2. **Variables:** ตามตารางด้านบน และต่อ Postgres ของ Railway
3. **Volume:** เพิ่ม Volume (mount `/data`) แล้วตั้ง `UPLOADS_DIR=/data/uploads` — ไม่ตั้งแล้ว redeploy รูป/สลิปจะหาย และต้องรัน backend **ตัวเดียว** (volume ต่อกับหลายตัวไม่ได้ ไฟล์จะแยกกัน)
4. **Migration:** `prisma migrate deploy` รันตอน deploy — **สำรอง DB ก่อนทุกครั้งที่มี migration ที่ลบ/แก้คอลัมน์**
5. **Frontend บน Vercel:**
   1. vercel.com → Add New → Project → เลือก repo นี้ → **Root Directory = `Catering Booking Web Application`** (Framework Vite ตรวจเอง ค่า build ตั้งไว้แล้วใน `vercel.json`)
   2. Environment Variables (ฝังตอน build เปลี่ยนแล้วต้อง redeploy): `VITE_API_BASE_URL` (URL backend บน Railway), `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`
   3. Deploy แล้วได้ URL เช่น `https://xxx.vercel.app` (push เข้า `main` ครั้งต่อไป Vercel deploy ให้เอง)
   4. **Auth0** (Applications → Settings): ใส่ URL ของ Vercel ใน Allowed Callback URLs, Allowed Logout URLs, Allowed Web Origins
   5. **Railway** (backend → Variables): เพิ่ม URL ของ Vercel ใน `FRONTEND_ORIGIN` (คั่นหลายค่าด้วย `,` เก็บ `http://localhost:8443` ไว้ได้) ไม่งั้น CORS บล็อก
   - `vercel.json` ทำให้ทุก path (เช่น `/{slug}`, `/owner/orders`) โหลดหน้าเดียวกัน รีเฟรชแล้วไม่ 404
   - URL ของ Preview deployment (branch/PR) ไม่อยู่ใน Auth0/CORS จึง login ไม่ได้ ใช้ทดสอบหน้าตาเท่านั้น
6. **Deploy ด้วยมือ:** `railway up` ที่รากโปรเจกต์ (ถ้าขึ้น "Snapshot code timeout" รอสักครู่แล้วรันใหม่) ดู log `railway logs` ดูไฟล์ใน volume `railway ssh -- ls -la /data/uploads/slips`
7. **ตรวจสุขภาพ:** `GET /health` (โปรเซสทำงาน) และ `GET /health/ready` (เชื่อมฐานข้อมูลได้) ไม่ต้อง login

ความปลอดภัยที่ backend เปิดไว้: `helmet` (security headers), ตัวจำกัดอัตราเรียก 60 ครั้ง/นาที/IP (ใช้ `trust proxy` ให้นับ IP ผู้ใช้จริง), รับ token ทาง query string เฉพาะ `/realtime/*` (SSE) ส่วน route อื่นต้องใช้ header

## การเก็บรูปและสลิป

รูปเมนู โลโก้ รูปหน้าแรก และสลิปเก็บเป็นไฟล์ใน `UPLOADS_DIR` (ฐานข้อมูลเก็บแค่ path) รูปเมนู/โลโก้/หน้าแรกเปิดเป็นไฟล์สาธารณะ ส่วน **สลิปไม่สาธารณะ** อ่านได้ผ่าน `GET /bookings/:id/payment-slip` เท่านั้น (ต้อง login และเป็นเจ้าของใบจองหรือ owner ของร้านนั้น) ลบร้านถาวรจะลบไฟล์ของร้านนั้นออกจาก volume ด้วย แต่ยังไม่มีงานกวาดไฟล์กำพร้าที่หลุดจากกรณีอื่น

## แก้ปัญหาที่พบบ่อย

### (Windows) `pnpm : File ...\pnpm.ps1 cannot be loaded because running scripts is disabled on this system`

**สาเหตุ:** Windows PowerShell ตั้งค่าห้ามรันสคริปต์ (`.ps1`) ไว้ตั้งแต่แรก ไม่เกี่ยวกับ Node หรือโปรเจกต์นี้ — เลือกวิธีแก้ได้ 3 แบบ

**วิธีที่ 1 — ใช้ `corepack pnpm` แทน `pnpm` เฉย ๆ (ง่ายสุด ไม่ต้องแก้ตั้งค่าอะไรเลย)**

```powershell
corepack pnpm install
corepack pnpm dev
```

**วิธีที่ 2 — เปิด Command Prompt (cmd) แทน PowerShell**

กด `Win + R` พิมพ์ `cmd` กด Enter แล้ว `cd` เข้าโฟลเดอร์โปรเจกต์ ใช้ `pnpm install` ได้ตามปกติ

**วิธีที่ 3 — อนุญาตให้ PowerShell รันสคริปต์ได้ถาวร (แนะนำถ้าต้องใช้บ่อย)**

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

พิมพ์ `Y` แล้ว Enter จากนั้น **ปิดเทอร์มินัลแล้วเปิดใหม่**

- ใช้กับบัญชีผู้ใช้ของตัวเองเท่านั้น (`CurrentUser`) **ไม่ต้องเปิดสิทธิ์ Administrator**
- `RemoteSigned` คือค่าที่ Microsoft แนะนำสำหรับเครื่องทำงาน — รันสคริปต์ที่อยู่ในเครื่องได้ ส่วนสคริปต์ที่โหลดมาจากอินเทอร์เน็ตยังต้องมีลายเซ็นกำกับ
- ถ้าอยากให้มีผลแค่หน้าต่างนี้หน้าต่างเดียว ไม่แก้ค่าถาวร ใช้ `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` แทน (ปิดหน้าต่างแล้วค่าหายไปเอง)

เช็กค่าปัจจุบันได้ด้วย `Get-ExecutionPolicy -List`

### รันแล้วขึ้น `SyntaxError: ... does not provide an export named 'styleText'`

```
SyntaxError: The requested module 'node:util' does not provide an export named 'styleText'
Node.js v20.11.1
```

**สาเหตุ:** Node.js เก่าเกินไป — `styleText` เพิ่งมีใน Node 20.12 ขึ้นไป แต่ Vite 8 ต้องการ **20.19+ หรือ 22.12+**

**วิธีแก้:** อัปเกรด Node.js

- **วิธีง่ายสุด** — โหลด **Node.js 22 LTS** จาก [nodejs.org](https://nodejs.org/) แล้วติดตั้งทับของเดิม จากนั้น **ปิดเทอร์มินัลแล้วเปิดใหม่**
- **ถ้าใช้ nvm-windows** —
  ```powershell
  nvm install 22.12.0
  nvm use 22.12.0
  ```
- **ถ้าใช้ nvm (macOS / Linux)** —
  ```bash
  nvm install 22
  nvm use 22
  ```

เช็กว่าอัปเกรดสำเร็จด้วย `node -v` แล้วค่อยรัน `pnpm install` และ `pnpm dev`/`pnpm start:dev` ใหม่

### login แล้วขึ้น `invalid_request` / `Client ... is not authorized to access resource server ...`

Application ยังไม่ได้รับอนุญาตให้ขอ token เข้า API — ไปที่ Auth0 → API ที่สร้างไว้ → Settings → **Application Access Policy** ตั้ง User-delegated Access เป็น "All Applications" (ดูหัวข้อ [ตั้งค่า Auth0](#ตั้งค่า-auth0-จำเป็นก่อนรันจริง) ข้อ 6)

### `cd` เข้าโฟลเดอร์ frontend ไม่ได้

ชื่อโฟลเดอร์มีเว้นวรรค ต้องใส่เครื่องหมายคำพูด

```bash
cd "Catering Booking Web Application"
```

### แผนที่ไม่ขึ้น / ค้นหาสถานที่ไม่ได้

ต้องต่ออินเทอร์เน็ต เพราะแผนที่ดึงจาก OpenStreetMap ถ้าเน็ตมีปัญหา ระบบจะสำรองด้วยรายการสถานที่ยอดนิยมให้เลือกแทน

---

## ข้อควรรู้

- **รูปเมนู โลโก้ และสลิป** เก็บเป็นไฟล์บนดิสก์ของ backend (Volume บน Railway) ยังไม่ได้แยกไปเก็บที่ object storage (เช่น Cloudflare R2) — ใช้ได้เมื่อรัน backend ตัวเดียว ถ้าจะขยายเป็นหลายตัวหรือมีผู้ใช้จำนวนมากควรย้าย
- **การชำระเงินมัดจำ** ลูกค้าโอนเข้าบัญชี/พร้อมเพย์ของร้านเองแล้วแนบสลิป ระบบตรวจกับธนาคารผ่าน SlipOK ไม่ใช่ payment gateway จริง (ไม่มีบัตรเครดิต ไม่มีการคืนเงินในระบบ)
- **Backend deploy บน Railway แล้ว** (ดูหัวข้อ Deploy production) ส่วน frontend ขึ้น Vercel (ดูหัวข้อ Deploy production ข้อ 5)
- **การพิมพ์เอกสาร** ใช้ระบบพิมพ์ของเบราว์เซอร์ เลือก "Save as PDF" เพื่อบันทึกเป็นไฟล์ได้
- **Automated test** มี unit test แล้ว (Vitest ฝั่ง frontend ครอบกติกาธุรกิจ, Jest ฝั่ง backend ครอบ guard/service/DTO) แต่ยังไม่มี integration/e2e test ที่ยิง API จริงหรือ component test ของหน้าจอ และ lint ฝั่ง frontend รันด้วย `pnpm lint` และฝั่ง backend `pnpm lint` เช่นกัน (ผลลัพธ์สะอาด ไม่มี warning ใน src)
