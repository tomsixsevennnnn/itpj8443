---
noteId: "f3ae61d08f3011f1a0b1b1af0447d59d"
tags: []
title: "Requirement Specification — ระบบจองแคทเธอริ่ง (Catering Booking Web Application)"

---

# Requirement Specification: ระบบจองแคทเธอริ่ง (Catering Booking Web Application)

> เอกสารนี้สรุปจากการอ่านโค้ดจริงในโปรเจกต์ ปรับปรุงล่าสุด 2026-10-14 ครอบคลุมทั้งฝั่ง Frontend (`Catering Booking Web Application/`) และ Backend API (`backend/`)
>
> - รายละเอียดระดับฟังก์ชัน/เมธอด (พารามิเตอร์ ตรรกะ เงื่อนไข validation) ดู [`FUNCTIONS.md`](./FUNCTIONS.md)
> - ความต้องการแยกเป็นรายหัวข้อ (FR-xx) ดู [`FUNCTIONAL_REQUIREMENTS.md`](./FUNCTIONAL_REQUIREMENTS.md)
> - สถาปัตยกรรม แผนภาพ ER/sequence ผลทดสอบ และข้อจำกัด ดู [`../../docs/SYSTEM_OVERVIEW.md`](../../docs/SYSTEM_OVERVIEW.md)
> - วิธี deploy/ตัวแปรสภาพแวดล้อม ดู [`../../README.md`](../../README.md)

## 1. ภาพรวมระบบ

ระบบจองโต๊ะจีน/แคทเธอริ่งแบบ **หลายร้าน (multi-tenant)** — ผู้ให้บริการระบบ (**Super Admin**) เปิดร้านให้แต่ละร้าน แต่ละร้านมี **เจ้าของร้าน (Owner)** ที่บริหารเมนู แพ็กเกจ ใบจอง กำลังคน และค่าตั้งค่าของร้านตัวเองแยกขาดจากร้านอื่น ส่วน **ลูกค้า (Customer)** เลือกร้านแล้วจองงานผ่านหน้าเว็บ

ระบบประกอบด้วย 2 ส่วนแยกกัน ต่อกันผ่าน REST API (และ SSE สำหรับแจ้งการเปลี่ยนแปลง):

| ส่วน | โฟลเดอร์ | สถานะ |
|---|---|---|
| Frontend (SPA) | `Catering Booking Web Application/` | เรียก backend จริงทุกจุด (`src/api.ts`) ไม่มี mock data — โหลด booking/เมนู/แพ็กเกจ/ค่าตั้งค่าของร้านที่เลือกหลัง login และอัปเดตอัตโนมัติผ่าน SSE |
| Backend (REST API) | `backend/` | NestJS + Prisma + PostgreSQL deploy บน Railway มี rate limiting, helmet, RBAC ต่อร้าน, audit log, เข้ารหัส API key, health check |

**ระบบออกแบบให้ใช้ซ้ำกับหลายร้าน** — ค่าที่เคย hardcode (จังหวัดฐานร้าน/โซนขนส่ง, สีแบรนด์/โลโก้, ประเภทอาหาร, ช่วงเวลาจอง, สัดส่วนคำนวณพนักงาน, เงื่อนไขในเอกสาร, บัญชีรับเงิน) เป็นค่าที่เจ้าของร้านแก้เองจากหน้า "ตั้งค่า" (ดูหัวข้อ 5)

---

## 2. เทคโนโลยีและเครื่องมือที่ใช้

### 2.1 Frontend (`Catering Booking Web Application/`)

| หมวด | เทคโนโลยี | หมายเหตุ |
|---|---|---|
| Framework | React 19 + React DOM 19 | |
| Build tool | Vite 8 + `@vitejs/plugin-react` | dev server พอร์ต 8443 |
| ภาษา | TypeScript 5.7 | |
| CSS | Tailwind CSS v4 (`@tailwindcss/vite`) | สี `--color-orange-*`/`--color-amber-*` ถูก override ที่ runtime ตาม `brandColor` ของร้าน — ดู `src/theme.ts` |
| State/context | React Context (`src/NavContext.tsx`) | รวม `navigate/user/shopInfo/notifCount/categories/categoryMap` |
| Authentication | `@auth0/auth0-react` v2 | |
| แผนที่ | Leaflet 1.9 | ปักหมุดสถานที่จัดงาน/ตำแหน่งร้าน |
| Geocoding | OpenStreetMap Nominatim (เรียกจาก frontend) | ค้นหา/reverse-geocode มีแคชผลในหน้าเว็บ |
| Routing (ระยะทาง) | OSRM public (เรียกจาก backend เป็นหลัก) | frontend ใช้ประมาณค่าให้ผู้ใช้เห็น มีแคช |
| กราฟ | Recharts 3 | |
| ไอคอน/โลโก้ธนาคาร | lucide-react, `thai-banks-logo` | มี `BankBadge` สำรองเมื่อไม่มีโลโก้ |
| Test runner | Vitest | 133 เทสต์ (12 ไฟล์) |
| Lint / Formatter | ESLint (`pnpm lint`) / oxfmt | |
| Package manager | pnpm | |
| Node version | ^20.19.0 หรือ >=22.12.0 | |

### 2.2 Backend (`backend/`)

| หมวด | เทคโนโลยี | หมายเหตุ |
|---|---|---|
| Framework | NestJS 11 | |
| ภาษา | TypeScript 5.7 | `ts-node-dev` (dev), `tsc` build (production) |
| ORM | Prisma 6 | migration หลายชุด รัน `prisma migrate deploy` ตอน deploy |
| ฐานข้อมูล | PostgreSQL 16 | dev ผ่าน Docker (`docker-compose.yml` พอร์ต 5434), production = Railway Postgres |
| Authentication | Passport + `passport-jwt` + `jwks-rsa` | ตรวจ JWT (RS256) จาก Auth0 ด้วย JWKS |
| ความปลอดภัย HTTP | `helmet`, `trust proxy` (ตัวแปร `TRUST_PROXY`) | |
| Rate limiting | `@nestjs/throttler` | ทั้ง API 60 req/นาที/IP; `POST /bookings` 10/นาที; `GET /geo/resolve-maps-link` 20/นาที; `POST /users/me` 20/นาที; `/uploads/*` 10/นาที |
| Validation | `class-validator` + `class-transformer` | DTO ทุกตัว |
| ตรวจสลิป | SlipOK API | ต่อร้าน (API key + Branch ID ของแต่ละร้าน) |
| ไฟล์ | เก็บบนดิสก์ใน `UPLOADS_DIR` (Volume บน Railway) | `sharp` ย่อรูป |
| Realtime | Server-Sent Events (`@Sse`) | `/realtime/bookings`, `/realtime/app` |
| Config | `@nestjs/config` + ตรวจตัวแปรจำเป็นตอนเริ่ม | ขาด `DATABASE_URL`/`AUTH0_DOMAIN`/`AUTH0_AUDIENCE` = ไม่เริ่ม |
| Test runner / Lint | Jest (246 เทสต์, 20 ไฟล์) / ESLint (`pnpm lint`) | |
| Deploy | Railway (backend + Postgres + Volume) | Healthcheck `/health` |

### 2.3 Authentication / Authorization

- **Auth0** เป็นผู้ให้บริการ identity เดียว หน้า Login มี 2 ปุ่มบังคับ connection: `customer` → Google (`google-oauth2`), `owner` → Username/Password (`Username-Password-Authentication`) ดู `docs/auth0-action.md`
- **บทบาทที่ backend ใช้จริงมาจากฐานข้อมูลเสมอ ไม่ใช่ claim ใน token** — `RolesGuard` เรียก `resolveShopContext` ทุก request (cache 5 วินาที) เพื่อกัน token เก่า/ถูกปลอมอ้างสิทธิ์ผิด claim ของ Auth0 ใช้เป็นแค่คำใบ้ฝั่ง UI (`roleFromAuth0User()` ใน `src/auth.ts`)
- **สิทธิ์ต่อร้าน:** `User.role` ระดับระบบมีแค่ `CUSTOMER` หรือ `SUPER_ADMIN` ส่วนการเป็น owner เก็บที่ตาราง `ShopMember(userId, shopId)` — บัญชีเดียวเป็น owner ได้หลายร้านและเป็นลูกค้าของร้านที่ไม่ได้เป็น owner ได้
- **ร้านที่กำลังใช้งาน** ส่งไปกับทุกคำขอด้วย header `X-Shop-Id` backend ดูว่าผู้เรียกมี `ShopMember` ของร้านนั้นหรือไม่ — มี = OWNER ของร้านนั้น, ไม่มี = CUSTOMER, `SUPER_ADMIN` = ข้ามร้านเสมอ ส่ง header ปลอมไม่ได้สิทธิ์เพิ่ม
- **Super Admin คนแรก:** อีเมลใน `SUPER_ADMIN_EMAILS` ถูกตั้งเป็น SUPER_ADMIN ตอน login ครั้งแรก — ตัดสินจาก **อีเมลที่ Auth0 ยืนยันแล้ว** (ถามจาก `/userinfo` ด้วย token ของผู้เรียก) ไม่ใช่อีเมลที่หน้าเว็บส่งมาใน body (ปลอมได้) ถ้าถามอีเมลที่ยืนยันแล้วไม่ได้ (Auth0 ขัดข้อง/token ไม่มี scope `openid`) จะไม่ให้สิทธิ์ super admin หรือคำเชิญ และไม่เขียนทับอีเมลเดิมใน DB
- **เพิ่มเจ้าของร้านด้วยอีเมล (แม้ยังไม่เคย login):** Super Admin ใส่อีเมลตอนสร้างร้าน/เพิ่ม owner — ถ้าอีเมลนั้นเคย login แล้ว ผูก `ShopMember` ทันที ถ้ายังไม่เคย ระบบเก็บเป็น **คำเชิญล่วงหน้า** (`ShopInvite` มีแค่อีเมลกับร้าน) แล้วให้สิทธิ์อัตโนมัติตอนเจ้าของ login ครั้งแรก — ตรวจอีเมลจาก Auth0 `/userinfo` ด้วย token ของผู้เรียกเอง (ไม่เชื่ออีเมลที่หน้าเว็บส่งมา) และต้อง `email_verified = true` เท่านั้น เจ้าของร้านเข้าด้วย Google (ปุ่มเดียวกับลูกค้า) หรือ username/password ก็ได้ เพราะบทบาทตัดสินจาก DB
- **ข้อมูลโปรไฟล์ของ owner:** owner กรอกหน้า "ข้อมูลเพิ่มเติม" (ชื่อ นามสกุล เบอร์ Line ID) ตอน login ครั้งแรกเหมือนลูกค้า ข้อมูลที่กรอกเป็นข้อมูลหลัก ส่วนชื่อ/รูป/อีเมลจาก Google เป็นข้อมูลสำรอง (ชื่อจาก Google ใช้เมื่อช่องนั้นว่างเท่านั้น)
- ข้อมูลโปรไฟล์ที่ Auth0 ไม่มีให้ (เบอร์โทร, Line ID) ขอครั้งแรกผ่านหน้า **CompleteProfile** แล้วบันทึกที่ backend (`PATCH /users/me`)
- token ทาง query string (`?access_token=`) รับเฉพาะ `/realtime/*` (SSE ใส่ header ไม่ได้) route อื่นต้องใช้ header

---

## 3. บทบาทผู้ใช้ (Roles) และสิทธิ์การเข้าถึง

### 3.1 Customer (ลูกค้า)

- เริ่มที่หน้า **เลือกร้าน** (ไม่ต้อง login — `GET /shops/public`) แล้วเข้าหน้า login/เริ่มจองของร้านนั้นด้วย URL เฉพาะร้าน (เช่น `/pipat-catering`)
- เลือกวันที่/ช่วงเวลาจัดงานจากปฏิทิน ดูสถานะคิว (ว่าง/เต็ม/ร้านปิด) ของแต่ละวัน
- ระบุจำนวนโต๊ะและจำนวนแขก
- ปักหมุด/ค้นหาสถานที่จัดงานบนแผนที่ (หรือใช้ GPS, หรือวางลิงก์ Google Maps) และกรอกรายละเอียดสถานที่
- เลือกแพ็กเกจและเมนูตามโควตา — **ไม่เห็นต้นทุนต่อจาน**
- ดูสรุปตะกร้า (ราคารวม + ค่าขนส่ง) แล้วยืนยัน — **ราคาจริงคำนวณที่ backend เสมอ** ถ้าราคาที่แสดงต่างจากค่าตั้งค่าล่าสุดของร้าน ระบบแจ้งให้ทราบก่อนยืนยัน
- ข้อมูลที่เลือกไว้ระหว่างขั้นตอนจอง **เก็บข้ามการรีเฟรช** (sessionStorage แยกต่อร้าน) และมีตัวกันไม่ให้ข้ามไปขั้นตอนที่ข้อมูลยังไม่ครบ
- **จองสำเร็จแล้วพาไปส่วนโอนมัดจำทันที:** ระบบเปิดรายละเอียดใบจองที่เพิ่งสร้างพร้อมแถบ "จองสำเร็จ — โอนมัดจำ ฿X แล้วแนบสลิป" และเลื่อนไปที่ช่องทางโอนให้ ลูกค้ากด "ไว้ชำระภายหลัง" ได้ (กลับมาแนบสลิปที่ประวัติการจองภายหลัง) ร้านที่ลูกค้าไม่เห็นช่องทางโอน (ยังไม่เชื่อม SlipOK) พาไปหน้าประวัติตามปกติ
- ดูประวัติการจองของตัวเอง **เฉพาะร้านที่เปิดอยู่** (ไม่เห็นของลูกค้าคนอื่น/ของร้านอื่น) ดู/พิมพ์ใบเสนอราคาและใบจอง
- **ชำระมัดจำ:** เห็นช่องทางโอนของร้าน (บัญชีธนาคารพร้อมโลโก้ธนาคาร และ/หรือพร้อมเพย์) **เฉพาะร้านที่เชื่อม SlipOK แล้ว** ถ้าร้านมีหลายช่องทางต้องเลือกช่องทางที่โอนก่อนแนบสลิป แล้วแนบสลิป — ระบบตรวจกับธนาคารและเทียบผู้รับ แสดงผล (ผ่าน/ซ้ำ/ผู้รับไม่ตรง/ยอดไม่ตรง ฯลฯ) สลิปที่ตรวจผ่านแล้วเปลี่ยนไม่ได้
- ดูการแจ้งเตือน (derive จากใบจองของตัวเอง) แก้ไขโปรไฟล์ของตัวเอง

**ทำไม่ได้:** ดู/แก้ใบจองของคนอื่น, เปลี่ยนสถานะใบจอง, ยกเลิกใบจองเอง, แก้เมนู/แพ็กเกจ/ตั้งค่า, ดูต้นทุน/ค่าแรง/ข้อมูล SlipOK (ถูกกรองออกจาก response)

### 3.2 Owner (เจ้าของร้าน — ต่อร้าน)

เข้าผ่านเมนู Owner (11 รายการ) สิทธิ์จำกัดเฉพาะร้านที่เป็นสมาชิก:

- **แดชบอร์ด** — รายได้/จำนวนงานเทียบเดือนก่อน, กราฟ 8 เดือน, สัดส่วนแพ็กเกจ, งานใกล้ถึงพร้อมกำลังคน
- **รายการจอง** — ดูใบจองทั้งหมดของร้าน ค้นหา/กรอง, เปลี่ยนสถานะ (ตามกฎหัวข้อ 6.6 — ปุ่มที่เปลี่ยนไม่ได้จะถูกปิด), ดูสลิปและผลตรวจ SlipOK, ผู้รับในสลิปเทียบกับบัญชีร้าน, ปรับแผนกำลังคนพร้อมหมายเหตุ, ต้นทุนและกำไรต่องาน
- **ปฏิทิน** — ใบจองตามวัน เปลี่ยนสถานะจากปฏิทินได้
- **แพ็กเกจ** — CRUD, จัดการคอร์ส/ข้อ, **เรียงลำดับ** (`PATCH /packages/reorder`)
- **เมนูอาหาร** — CRUD, อัปโหลด/ครอปรูป (`imagePosition`/`imageScale`), เปิด/ปิด, เตือนก่อนลบเมนูที่ถูกใช้ในแพ็กเกจ, ราคาทุนต่อจาน
- **เอกสาร** — ออก/พิมพ์ใบเสนอราคาและใบจอง
- **รายงาน** — สรุปรายเดือน/รายปี
- **สิทธิ์การเข้าถึง** — ค้นหาผู้ใช้ด้วยอีเมล แต่งตั้ง/ถอด owner ของร้านตัวเอง (ต้องเหลือ owner อย่างน้อย 1 คน และกันถอดตัวเอง)
- **ประวัติการแก้ไข (Audit Log)** — ใคร แก้อะไร เมื่อไร พร้อมค่าก่อน/หลัง แบ่งหน้า และอัปเดตทันทีผ่าน SSE
- **แก้ไขหน้าเว็บ** — เนื้อหาหน้าแรก (Hero/ขั้นตอน/แกลเลอรี/CTA) พร้อมอัปโหลดรูป
- **ตั้งค่า** — ดูหัวข้อ 5

owner ของร้านหนึ่งสลับเปิดร้านอื่นในฐานะลูกค้าได้ (บัญชีเดียวหลายบทบาท)

### 3.3 Super Admin (ผู้ดูแลระบบ — ข้ามร้าน)

หน้าเดียว (`SuperAdmin.tsx`): สร้างร้านใหม่ (ชื่อร้าน + อีเมล owner — ยังไม่เคย login ก็ได้ จะแสดงเป็น "รอ login ครั้งแรก" และยกเลิกคำเชิญได้), แก้ชื่อ/path (slug) ร้าน, **ระงับ/เปิดใช้งาน** ร้าน, เพิ่ม/ถอด owner ของแต่ละร้าน, แต่งตั้ง/ถอด Super Admin, ดูสรุปจำนวน owner/ใบจอง/ยอดขายรวมต่อร้าน, ดูประวัติการแก้ไขข้ามร้าน และ **ลบร้านถาวร** (พิมพ์ `Delete {ชื่อร้าน}` ยืนยัน ลบข้อมูลทั้งหมดของร้านรวมถึงไฟล์รูป/สลิปบนดิสก์ — กู้คืนไม่ได้)

### 3.4 สรุปสิทธิ์ระดับ API (backend)

| Endpoint | Customer | Owner | Super Admin | หมายเหตุ |
|---|---|---|---|---|
| `GET /shops/public`, `GET /shops/:slug/public` | ไม่ต้อง login | | | รายชื่อ/ข้อมูลร้านที่เปิดให้บริการ |
| `GET /shops`, `POST /shops`, `PATCH /shops/:id`, `PATCH /shops/:id/status`, `DELETE /shops/:id` | ❌ | ❌ | ✅ | ลบร้านต้องส่งชื่อยืนยัน |
| `POST /shops/:id/owners`, `DELETE /shops/:id/owners/:userId` | ❌ | ❌ | ✅ | อีเมลที่ยังไม่เคย login → สร้างคำเชิญล่วงหน้า (`invited: true`) |
| `DELETE /shops/:id/invites/:inviteId` | ❌ | ❌ | ✅ | ยกเลิกคำเชิญที่ยังไม่มีคนรับ |
| `POST /users/me`, `PATCH /users/me` | ✅ | ✅ | ✅ | sync/แก้โปรไฟล์ตัวเอง; `POST` ยังรับสิทธิ์ owner จากคำเชิญ (ถ้ามี) |
| `GET /users/search?email=`, `GET /users/owners`, `PATCH /users/:id/role` | ❌ | ✅ (ร้านตัวเอง: CUSTOMER ↔ OWNER) | ✅ (CUSTOMER ↔ SUPER_ADMIN เท่านั้น) | ตั้ง/ถอด owner ของร้านโดย super admin ทำผ่าน `/shops/:id/owners` |
| `GET /bookings` | ✅ ของตัวเองใน `?shopId=` | ✅ ทั้งร้าน | | รองรับ `?page=&limit=` |
| `GET /bookings/availability` | ✅ | ✅ | | คิวไม่มีข้อมูลส่วนตัว |
| `POST /bookings` | ✅ | ❌ | | คำนวณราคา/ค่าขนส่ง/โซนที่ backend (ต้องส่ง `locationDetail` เสมอ), กันวันย้อนหลัง/วันซ้ำ/วันปิดร้าน, ตรวจเมนูที่เลือกไม่เกินโควตาแพ็กเกจ, 10/นาที |
| `PATCH /bookings/:id` | ❌ | ✅ | | บังคับกฎเปลี่ยนสถานะ, บันทึก `lastEditedBy` |
| `PATCH /bookings/:id/payment-slip` | ✅ ของตัวเอง | ❌ | | ตรวจ SlipOK + เทียบผู้รับ; 5/นาที และแนบซ้ำในใบเดิมได้ไม่ถี่กว่า 10 วินาที (กันเผาโควตา SlipOK ของร้าน) |
| `GET /bookings/:id/payment-slip` | ✅ ของตัวเอง | ✅ ร้านเดียวกัน | | สลิปไม่เป็นไฟล์สาธารณะ ตรวจสิทธิ์รายใบ |
| `GET /menus`, `GET /packages` | ✅ ไม่เห็น `costPrice` | ✅ | | pagination แบบ opt-in |
| `POST/PATCH/DELETE /menus`, `/packages`, `/packages/:id/courses…`, `PATCH /packages/reorder` | ❌ | ✅ | | |
| `GET /settings` | ✅ กรองข้อมูลภายใน | ✅ ครบ | | ลูกค้าไม่เห็นค่าแรง/SlipOK; ข้อมูลชำระเงินเฉพาะร้านที่เชื่อม SlipOK |
| `PATCH /settings` | ❌ | ✅ | | optimistic locking (`expectedVersion`, ชน = 409) |
| `POST /settings/slipok/test` | ❌ | ✅ | | ทดสอบ API key + Branch ID |
| `GET /settings/public` | ไม่ต้อง login | | | ชื่อร้าน โลโก้ สีแบรนด์ คำโปรย |
| `GET /audit-log` | ❌ | ✅ ร้านตัวเอง | ✅ ข้ามร้าน | แบ่งหน้า |
| `POST /uploads/menu-image`, `shop-logo`, `content-image` | ❌ | ✅ | | 10/นาที ตรวจเนื้อไฟล์จริงด้วย `sharp` (ต้องเป็น PNG/JPEG/WEBP ตรงกับที่ระบุ ไม่เกิน 40 ล้านพิกเซล) |
| `POST /uploads/payment-slip` | ✅ | ❌ | | |
| `GET /geo/resolve-maps-link` | ✅ | ✅ | | 20/นาที, whitelist โดเมนลิงก์ย่อ Google |
| `GET /realtime/bookings`, `GET /realtime/app` | ✅ | ✅ | ✅ | SSE แจ้งว่ามีการเปลี่ยนแปลง (ไม่ส่งข้อมูลจริง) |
| `GET /health`, `GET /health/ready` | ไม่ต้อง login | | | ตรวจโปรเซส / ตรวจการเชื่อม DB |

ควบคุมด้วย `JwtAuthGuard` + `RolesGuard` (ตรวจบทบาทจาก DB) + `ThrottlerGuard` ข้อมูลต้นทุนภายใน (`costPrice`, ค่าแรง 4 ตัว, สัดส่วนกำลังคน 3 ตัว, ข้อมูล SlipOK) ถูกกรองที่ service ชั้น backend ไม่ใช่แค่ frontend ซ่อน

---

## 4. Functional Requirements (แยกตามหน้าจอ/โมดูล)

### 4.1 Authentication, เลือกร้าน & Onboarding

| หน้าจอ | ไฟล์ | หน้าที่ |
|---|---|---|
| ShopSelect | `src/screens/ShopSelect.tsx` | หน้าแรกสุด ลูกค้าเลือกร้านก่อนเสมอ (ไม่ต้อง login) poll ทุก 20 วินาที ร้านที่ถูกลบระหว่างใช้งานเด้งกลับมาหน้านี้ |
| Login | `src/screens/Login.tsx` | ปุ่ม Google (ลูกค้า) และ "เข้าระบบในฐานะเจ้าของร้าน" (username/password) แสดงชื่อ/โลโก้/คำโปรย/สีแบรนด์ของร้านจาก `GET /settings/public` |
| CompleteProfile | `src/screens/CompleteProfile.tsx` | ขอชื่อ/นามสกุล/เบอร์/Line ID ครั้งแรก |
| URL routing | `src/App.tsx` (`pathForScreen`, `handlePopState`) | ทุกหน้ามี URL ของตัวเอง ปุ่ม back/forward ทำงานตาม role แชร์ลิงก์เฉพาะร้านได้ |

### 4.2 ขั้นตอนการจอง (Customer booking flow)

| หน้าจอ | ไฟล์ | หน้าที่ |
|---|---|---|
| Home | `Home.tsx` | เนื้อหาจาก `homeContent` ที่ owner แก้ได้ |
| BookingCalendar | `BookingCalendar.tsx` | เลือกวัน/ช่วงเวลา (เช้า/กลางวัน/เย็น เวลาตั้งค่าได้) สถานะวัน ว่าง/เต็ม/ร้านปิด |
| SelectTable | `SelectTable.tsx` | จำนวนโต๊ะ/แขก พร้อม preview เงื่อนไขพื้นที่ |
| SelectLocation | `SelectLocation.tsx` | ค้นหา/ปักหมุด/GPS/ลิงก์ Google Maps, ตรวจโซนบริการ (`PlaceSearchBox`, `LocationMap`, `useLocationSync`) |
| SelectPackage | `SelectPackage.tsx` | เลือกแพ็กเกจ แสดงราคารวม |
| SelectMenu | `SelectMenu.tsx` | เลือกเมนูตามโควตา รายการที่รวมมาให้ใส่อัตโนมัติ |
| Cart | `Cart.tsx` | สรุปและยืนยัน (ส่งแค่ `packageId` + รายละเอียด ไม่ส่งราคา), แจ้งเมื่อราคาเปลี่ยน (`priceChange.ts`) |
| BookingHistory | `BookingHistory.tsx` | ใบจองของร้านที่เปิดอยู่, เอกสาร, ช่องทางชำระเงิน (`PaymentChannels`), แนบสลิป, ผลตรวจสลิป (`SlipVerifyBadge`, `SlipLoadStatus`) |
| Notifications | `Notifications.tsx` | derive จากใบจองของลูกค้า |

### 4.3 ฝั่งเจ้าของร้าน (Owner back-office)

| หน้าจอ | ไฟล์ | หน้าที่ |
|---|---|---|
| OwnerLayout | `components/OwnerLayout.tsx` | เมนู 11 รายการ: แดชบอร์ด, รายการจอง, ปฏิทิน, แพ็กเกจ, เมนูอาหาร, เอกสาร, รายงาน, สิทธิ์การเข้าถึง, ประวัติการแก้ไข, แก้ไขหน้าเว็บ, ตั้งค่า + กระดิ่งแจ้งเตือน |
| Dashboard / Reports | `owner/Dashboard.tsx`, `owner/Reports.tsx` | สรุปรายได้/กำไร/สัดส่วน/รายเดือน-รายปี |
| Orders | `owner/Orders.tsx` | จัดการใบจอง, สถานะ (กฎหัวข้อ 6.6), สลิปและผลตรวจ, กำลังคน, ต้นทุน/กำไร |
| CalendarView | `owner/CalendarView.tsx` | ปฏิทินรวม เปลี่ยนสถานะจากปฏิทิน |
| Packages / Menus | `owner/Packages.tsx`, `owner/Menus.tsx` | CRUD, เรียงลำดับแพ็กเกจ, ครอปรูปเมนู |
| Documents | `owner/Documents.tsx` | ใบเสนอราคา/ใบจอง |
| UserRoles | `owner/UserRoles.tsx` | จัดการ owner ของร้าน |
| AuditLog | `owner/AuditLog.tsx` | ประวัติการแก้ไขพร้อม diff ก่อน/หลัง |
| PageContent | `owner/PageContent.tsx` | แก้ไขหน้าแรก |
| Settings | `owner/Settings.tsx` (+ `useSettingsForm.ts`) | ดูหัวข้อ 5 |

### 4.4 Super Admin

| หน้าจอ | ไฟล์ | หน้าที่ |
|---|---|---|
| SuperAdmin | `screens/SuperAdmin.tsx` | จัดการร้านทั้งระบบ (หัวข้อ 3.3) + ประวัติการแก้ไขข้ามร้าน |

### 4.5 Shared components / logic modules

| ไฟล์ | หน้าที่ |
|---|---|
| `src/AppScreens.tsx` | ประกอบหน้าจอตามบทบาท (`SuperAdminScreen`, `OwnerScreens`, `CustomerScreens`) แยกจาก `App.tsx` |
| `src/components/ErrorBoundary.tsx` | กันหน้าขาวเมื่อ component พัง |
| `src/components/BookingDocument.tsx` | เทมเพลตใบเสนอราคา/ใบจอง |
| `src/components/PaymentChannels.tsx`, `ExtraPaymentAccounts.tsx`, `BankBadge.tsx`, `PromptPayQr.tsx` | ช่องทางโอนที่ลูกค้าเลือก / ฟอร์มบัญชีเพิ่มของ owner / โลโก้ธนาคาร / QR พร้อมเพย์ |
| `src/components/LocationMap.tsx`, `PlaceSearchBox.tsx`, `SuggestInput.tsx` | แผนที่, ค้นหาสถานที่, ช่องแนะนำจังหวัด |
| `src/NavContext.tsx` | context กลาง (`navigate/user/shopInfo/notifCount/categories`) |
| `src/useBookingsStream.ts`, `useAppStream.ts`, `usePolling.ts` | SSE แจ้งเปลี่ยนแปลง + poll สำรอง |
| `src/bookingDraft.ts` | เก็บ/โหลดแบบร่างการจอง, ตรวจขั้นตอนที่ข้อมูลไม่ครบ |
| `src/bookingStatus.ts` | กฎเปลี่ยนสถานะฝั่งหน้าจอ (สำเนาของ backend) |
| `src/priceChange.ts`, `paymentChannels.ts`, `provinces.ts`, `thaiName.ts` | แจ้งราคาเปลี่ยน, key ช่องทางโอน, รายชื่อจังหวัด, จัดรูปแบบชื่อ |
| `src/staffing.ts`, `availability.ts`, `geo.ts`, `documents.ts`, `costing.ts` | กำลังคน, คิวงาน, โซน/ค่าขนส่ง/geocoding (มีแคช), เอกสาร, ต้นทุน |
| `src/theme.ts`, `data.ts`, `homeContent.ts`, `imageUpload.ts`, `auth.ts`, `api.ts` | ธีมสี, ค่าเริ่มต้น, เนื้อหาหน้าแรก, ย่อรูป, role จาก Auth0, เรียก backend |

### 4.6 Backend modules (`backend/src`)

| โมดูล | หน้าที่ |
|---|---|
| `auth/` | JWT strategy, `RolesGuard`, `resolveShopContext`, `@CurrentUser()` (`JwtUser`) |
| `users/`, `shops/` | ผู้ใช้/โปรไฟล์/สิทธิ์ owner; ร้านและสมาชิก (สร้าง ระงับ ลบถาวรพร้อมลบไฟล์) |
| `bookings/` | สร้าง/แก้ใบจอง, คำนวณราคา, กฎ (`booking-rules.ts`: วันย้อนหลัง, เปลี่ยนสถานะ), ระยะทาง OSRM มีแคช (`geo.util.ts`) |
| `slip-verify/` | เรียก SlipOK + เทียบผู้รับรายช่องทาง (`receiver-match.ts`) |
| `settings/` | ตั้งค่าร้าน (optimistic locking), ทดสอบ SlipOK, เข้ารหัส API key (`secret-box.ts`), ช่องทางโอน |
| `menus/`, `packages/` | CRUD (+ courses, reorder) |
| `audit/` | บันทึกประวัติการแก้ไขและแจ้ง SSE |
| `realtime/` | SSE (`bookings`, `app` หัวข้อ settings/catalog/users/audit/shop) |
| `uploads/` | อัปโหลด/ย่อรูป เก็บเป็นไฟล์ ลบไฟล์เก่าเมื่อถูกแทนที่ |
| `geo/` | แปลงลิงก์ย่อ Google Maps |
| `health/`, `config/` | health check, ตรวจตัวแปรสภาพแวดล้อม |

---

## 5. ค่าตั้งค่าร้านที่เจ้าของร้านแก้ไขได้ (หน้า Settings.tsx)

ข้อมูลเก็บที่ตาราง `Settings` (แถวเดียวต่อร้าน) แก้แบบ optimistic locking — ถ้ามีคนแก้ไปก่อนจะตอบ 409 และหน้าจอโหลดค่าล่าสุดให้

| หมวด (หัวข้อในหน้า) | ฟิลด์ | หมายเหตุ |
|---|---|---|
| ข้อมูลร้าน | ชื่อ (ไทย/อังกฤษ), อักษรย่อ, ที่อยู่, โทร, LINE, โลโก้, คำโปรยหน้า login | ชื่อไทยซิงค์กับชื่อร้านที่ Super Admin เห็น |
| ธีมสี | `brandColor` | override สีของ Tailwind ทั้งแอปที่ runtime |
| อัตรามัดจำ | `depositRate` | |
| ข้อมูลการชำระเงิน | บัญชีธนาคารหลัก, พร้อมเพย์หลัก, **บัญชีธนาคารเพิ่มเติม** และ **พร้อมเพย์เพิ่มเติม** (อย่างละไม่เกิน 8) | ต้องกรอกให้ตรงกับบัญชีที่ผูกใน SlipOK; ลูกค้าเห็นเฉพาะเมื่อร้านเชื่อม SlipOK แล้ว |
| ตรวจสอบสลิปอัตโนมัติ (SlipOK) | API key, Branch ID, ปุ่มทดสอบการเชื่อมต่อ, ผู้รับล่าสุดที่ SlipOK เห็นพร้อมผลเทียบกับบัญชีร้าน | key เข้ารหัสใน DB; "เชื่อมแล้ว" = ทดสอบผ่านด้วยคู่ key/branch ที่บันทึกอยู่ |
| ค่าขนส่ง | `homeProvince`, `metroProvinces[]`, `deliveryFee`, `freeDeliveryMinTables`, ตำแหน่งร้าน (หมุดบนแผนที่ ซิงค์จังหวัดจากหมุดได้ เตือนเมื่อหมุดไม่ตรงจังหวัด) | |
| ค่าเดินทางนอกพื้นที่ | `fuelCostPerKm` | ระยะทางถนนจริงไป-กลับ × ค่าน้ำมัน/กม. |
| อัตราค่าแรง (owner เท่านั้น) | `wageChef/wageAssistant/wageServerPerTable/wageDishwasher`, `tablesPerServer/tablesPerSupport/staffRemainderThreshold` | |
| ช่วงเวลาจอง | `slotMorningHours/slotNoonHours/slotEveningHours` | แก้ได้แค่เวลา ชื่อช่วงคงที่ |
| วันหยุดร้าน | `closedDates[]` | ลูกค้าจองวันนี้ไม่ได้ (backend ตรวจ) |
| เงื่อนไขในเอกสาร | `quotationValidDays`, `quotationTerms[]`, `bookingTerms[]` | |
| ประเภทอาหาร | `categories[]` (JSON), `categoryOrder[]` | |
| หน้าแรก | `homeContent` (JSON) | แก้ที่หน้า "แก้ไขหน้าเว็บ" |

---

## 6. กฎธุรกิจหลัก (Business Rules)

### 6.1 การคำนวณจำนวนพนักงาน (`src/staffing.ts`)

- **เสิร์ฟ:** 1 คนต่อ `tablesPerServer` โต๊ะ (ค่าเริ่มต้น 8) ปัดขึ้น
- **พ่อครัว:** 1 คนต่อ 1 งาน (ไม่เปิดให้แก้)
- **ผู้ช่วยพ่อครัว / ล้างจาน:** 1 คนต่อ `tablesPerSupport` โต๊ะ (ค่าเริ่มต้น 20) เศษเกิน `staffRemainderThreshold` (ค่าเริ่มต้น 10) เพิ่มอีก 1 คน
- owner ปรับจำนวนจริงต่างจากที่คำนวณได้ต่องาน พร้อมหมายเหตุ (เก็บ `staffAuto` และ `staffActual`)

### 6.2 คิวงานและสถานะวัน (`src/availability.ts`, `bookings.service.ts`)

- ช่วงเวลา: เช้า/กลางวัน/เย็น (เวลาตั้งค่าได้) — เป็นข้อมูลเวลางานของใบจอง
- **มีใบจองสถานะ pending/confirmed/completed อยู่แล้ววันไหน = วันนั้นเต็มทั้งวัน** ไม่รับซ้อนช่วงอื่น (ใบที่ยกเลิกไม่นับ) backend ตอบ 409 ถ้าจองซ้ำ ตั้งใจเป็นกติกาของร้านโต๊ะจีน
- วันที่ร้านปิด (`closedDates`) จองไม่ได้ — สถานะวันแสดง "ร้านปิด"
- **จองวันที่ย้อนหลังไม่ได้** (ตัดสินที่ backend ตามเวลา Asia/Bangkok)

### 6.3 พื้นที่ให้บริการและค่าขนส่ง (`src/geo.ts`, `backend/src/bookings/`)

| โซน | เงื่อนไข | ค่าขนส่ง |
|---|---|---|
| พื้นที่ร้าน (`homeProvince`) | รับกี่โต๊ะก็ได้ | ไม่มี |
| ปริมณฑล/จังหวัดใกล้เคียง (`metroProvinces`) | รับทุกจำนวน | ต่ำกว่า `freeDeliveryMinTables` คิด `deliveryFee`, ถึงขั้นต่ำฟรี |
| นอกพื้นที่ | ไม่มีขั้นต่ำ | ระยะทางถนนจริงไป-กลับ × `fuelCostPerKm` |

**backend คำนวณโซน ระยะทาง (เรียก OSRM เอง ไม่เชื่อ `distanceKm`/`zone` จาก client) และราคาทั้งหมด** โซนที่อ้างจากข้อความจังหวัด/ที่อยู่ต้องสอดคล้องกับพิกัดหมุดด้วย: หมุดไกลจากร้านเกิน 150 กม. (โซนร้าน) หรือ 300 กม. (ปริมณฑล) เป็นเส้นตรง ถือเป็นนอกพื้นที่ (ค่าคงที่ `HOME_ZONE_MAX_KM`/`METRO_ZONE_MAX_KM` ใน `geo.util.ts`) ผลระยะทางถูกแคชไว้ 24 ชั่วโมง ถ้าเรียก OSRM ไม่สำเร็จ ตอบ 503 (ไม่ fallback ไปเชื่อค่าจาก client)

### 6.4 เอกสาร: ใบเสนอราคา vs ใบจอง (`src/documents.ts`, `BookingDocument.tsx`)

เทมเพลตเดียวกัน ต่างกันที่เลขที่เอกสาร บรรทัดสถานะ/วันหมดอายุ และเงื่อนไขท้ายเอกสาร (2 ชั้น: ที่ระบบคำนวณอัตโนมัติ + `quotationTerms`/`bookingTerms` ที่ owner พิมพ์) เลขที่ใบจองรันต่อร้านต่อปี (`BookingCounter`)

### 6.5 บัญชีและสิทธิ์

- บัญชีสร้าง/sync อัตโนมัติจาก Auth0 JWT ตอน login ครั้งแรก (`auth0Sub`)
- owner/ลูกค้า = บทบาทต่อร้านจาก `ShopMember`; super admin = ระดับระบบ
- ไม่มีบทบาทพนักงาน (staff) แยก — owner ทุกคนของร้านมีสิทธิ์เท่ากัน ตรวจสอบย้อนหลังได้จาก Audit Log

### 6.6 สถานะใบจอง (`backend/src/bookings/booking-rules.ts`, `src/bookingStatus.ts`)

- ยกเลิกแล้ว → เปลี่ยนต่อไม่ได้ (ลูกค้าต้องจองใหม่)
- เสร็จสิ้นแล้ว → กลับได้แค่เป็น "ยืนยันแล้ว" (กรณีกดผิด) ห้ามกลับรอยืนยันหรือยกเลิก
- รอยืนยัน ↔ ยืนยันแล้ว ไปมาได้, ทั้งสองไปเสร็จสิ้น/ยกเลิกได้
- บังคับที่ backend (ตอบ 400) หน้าจอปิดปุ่มที่ทำไม่ได้พร้อมคำอธิบาย

### 6.7 การชำระเงินและตรวจสลิป (`backend/src/slip-verify/`, `settings/`)

- ลูกค้าโอนมัดจำเข้าบัญชีของร้านเอง ระบบไม่ผ่านเงิน (ไม่ใช่ payment gateway)
- สลิปส่งตรวจกับธนาคารผ่าน SlipOK ด้วย API key/Branch ID ของร้านนั้น ผลมี: ผ่าน (VERIFIED), สลิปซ้ำ, ยอดไม่ตรง, ผู้รับไม่ตรง, ตรวจไม่ผ่านด้วยเหตุผลอื่น, ตรวจไม่ได้ชั่วคราว (ระบบ/เครือข่าย)
- เทียบ "ผู้รับในสลิป" (ชื่อ/เลขบัญชีที่ SlipOK ปกปิดบางส่วน) กับบัญชีของช่องทางที่ลูกค้าเลือก — ไม่รู้ผู้รับ = ไม่ปฏิเสธ
- สลิปที่ตรวจผ่านแล้ว เปลี่ยนไม่ได้ (409)
- ข้อมูลชำระเงินแสดงให้ลูกค้าเฉพาะร้านที่ "เชื่อม SlipOK แล้ว"

### 6.8 กฎการกรอกข้อมูล (Input validation)

ตรวจสองชั้น: **หน้าจอ** ตัดอักขระที่ไม่อนุญาตทันทีที่พิมพ์/วาง (ความสะดวก — โค้ดที่ `src/inputRules.ts`) และ **backend** ตรวจซ้ำเสมอด้วย DTO (ความปลอดภัย เพราะเรียก API ตรงข้ามหน้าจอได้ — โค้ดที่ `backend/src/common/input-rules.ts`) ข้อมูลที่ตัดได้ (ขีดคั่น ตัวเลขปนในชื่อ ฯลฯ) ถูกทำความสะอาดให้ก่อน ที่ตัดแล้วยังผิดกฎถูกปฏิเสธ (400)

| ช่อง | กฎ |
|---|---|
| เบอร์โทรลูกค้า | ตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0 |
| ชื่อจริง / นามสกุลลูกค้า | ตัวอักษรล้วน (ไทย/อังกฤษ รวมสระและวรรณยุกต์) กับช่องว่าง 1–50 ตัว |
| Line ID (ลูกค้า) | อักษรอังกฤษ ตัวเลข `. _ - @` ไม่เกิน 30 ตัว (ไม่บังคับ) ตอนจองตัดอักขระผิด/ส่วนเกินให้แทนการปฏิเสธ |
| เลขบัญชี / เลขพร้อมเพย์ | ตัวเลขล้วน |
| ชื่อบัญชี / ชื่อ-นามสกุลพร้อมเพย์ | ตัวอักษรล้วน กับช่องว่าง ไม่เกิน 100 ตัว |
| ตัวเลขที่ไม่มีเพดาน (จำนวนแขก, ราคาต่อโต๊ะ, ราคาทุนเมนู, ค่าขนส่ง, ค่าน้ำมัน/กม., วันยืนราคา) | ไม่ต่ำกว่าค่าต่ำสุดของช่อง และไม่เกิน **50,000** (ราคาทุนเมนู ไม่ติดลบ) |
| วันหยุดร้าน / วันที่จอง | ต้องเป็นวันที่ที่มีอยู่จริง รูปแบบ `YYYY-MM-DD` (รับ `2030-02-31` ไม่ได้) |
| ข้อความอิสระ | ชื่อร้าน ≤ 100, อักษรย่อ ≤ 10, ที่อยู่ร้าน ≤ 300, คำโปรย ≤ 150, ชื่อเมนู/แพ็กเกจ ≤ 100, คำอธิบาย ≤ 1,000, ป้ายกำกับ ≤ 30, ชื่อข้อในแพ็กเกจ ≤ 100, เงื่อนไขในเอกสาร ≤ 500 ต่อข้อ (≤ 20 ข้อต่อเอกสาร), รายละเอียดสถานที่แต่ละช่อง ≤ 100–300 (หมายเหตุ/จุดสังเกต ≤ 300), ที่อยู่เต็มของใบจอง ≤ 1,500, หมายเหตุกำลังคน ≤ 500 |

### 6.9 ขั้นตอนของใบจองที่ผู้ใช้เห็น (5 ป้าย)

DB เก็บสถานะจริง 4 แบบ (`pending / confirmed / completed / cancelled`) กฎเปลี่ยนสถานะตามหัวข้อ 6.6 ไม่เปลี่ยน แต่หน้าจอแสดง "ขั้นตอน" 5 แบบที่คำนวณจากสถานะจริง + มีสลิปหรือไม่ + ผลตรวจ SlipOK (โค้ดที่ `src/bookingPhase.ts` มี test ครอบคลุม) ไม่ต้องเก็บเพิ่มใน DB

| ป้ายที่เห็น | เกิดเมื่อ | ใครต้องทำอะไรต่อ |
|---|---|---|
| **รอโอนมัดจำ** | `pending` และยังไม่มีสลิป หรือสลิปถูก SlipOK ปฏิเสธ (สลิปซ้ำ/ยอดไม่ตรง/ผู้รับไม่ตรง/ไม่ผ่าน — มีหมายเหตุ "สลิปไม่ผ่าน — แนบใหม่") | ลูกค้าโอนมัดจำแล้วแนบสลิป |
| **รอร้านยืนยัน** | `pending` และมีสลิปที่ผ่านหรือยังไม่ได้ตรวจ (รวมตรวจไม่ได้ชั่วคราว) | เจ้าของร้านตรวจมัดจำแล้วกดยืนยัน |
| **ยืนยันแล้ว** | `confirmed` | รอวันงาน |
| **เสร็จสิ้น** | `completed` | – |
| **ยกเลิก** | `cancelled` (เปลี่ยนต่อไม่ได้) | – |

ใช้ป้ายนี้ในหน้าประวัติการจองของลูกค้า (ป้ายและปุ่มกรอง), รายการจองของเจ้าของร้าน (ป้าย + ปุ่มกรองพร้อมจำนวนต่อขั้นตอน), การ์ดสรุปในปฏิทินและแดชบอร์ด ("รอร้านยืนยัน" นับเฉพาะใบที่เจ้าของร้านต้องลงมือ) และข้อความแจ้งเตือน ส่วนปุ่ม "อัปเดตสถานะ" ของเจ้าของร้านยังเป็นสถานะจริง (รอยืนยัน/ยืนยันแล้ว/เสร็จสิ้น/ยกเลิก)

---

## 7. Data Model สรุป (Prisma schema, `backend/prisma/schema.prisma`)

- **Shop** — `id, name, slug(unique), status(ACTIVE|SUSPENDED), createdAt` → มี `Settings` (1:1), `ShopMember`, `ShopInvite`, `Booking`, `MenuItem`, `Package`, `BookingCounter`, `AuditLog` (ลบร้าน = cascade)
- **User** — `id, auth0Sub(unique), role(CUSTOMER|OWNER|SUPER_ADMIN), name, surname, phone, lineId, email, avatar, createdAt` (บทบาท owner ต่อร้านอยู่ที่ `ShopMember`)
- **ShopMember** — `userId, shopId` unique คู่ (owner ของร้าน)
- **ShopInvite** — `shopId, email (ตัวพิมพ์เล็ก), createdAt` unique คู่ `(shopId, email)` คำเชิญเป็น owner ของคนที่ยังไม่เคย login (ลบเมื่อมีผู้รับสิทธิ์)
- **MenuItem** — `shopId, name, category, description, image?, imagePosition?, imageScale?, costPrice?, active, updatedAt, lastEditedBy?` เชื่อม `PackageCourse` (many-to-many)
- **Package** — `shopId, name, pricePerTable, menuLimit, description, features[], badge?, sortOrder, deletedAt?, updatedAt, lastEditedBy?` → `PackageCourse`
- **PackageCourse** — `packageId, no, title, icon?, category, choose (0 = รวมมาให้, >0 = เลือกกี่อย่าง), items[]`
- **Booking** — `shopId, customerId?, customerName, bookingYear, bookingNo, date, timeSlot, tables, guestCount, packageName, totalPrice, pricePerTable?, deliveryFee?, status(PENDING|CONFIRMED|COMPLETED|CANCELLED), location, locationDetail(json)?, menus[], phone, lineId?, staffAuto/staffActual(json)?, staffNote?, staffSavedAt?, paymentSlipUrl?, paymentSlipUploadedAt?, paymentSlipVerifyStatus?, paymentSlipVerifyMessage?, paymentSlipTransRef?, paymentSlipVerifiedAt?, paymentSlipReceiverName/Account/ReceivingBank?, paymentChannelKey?, paymentChannelLabel?, createdAt, updatedAt, lastEditedBy?` — unique `(shopId, bookingYear, bookingNo)`, index `(shopId, date)`
- **BookingCounter** — `(shopId, year)` คีย์, `lastNo` ออกเลขที่ใบจองแบบ atomic
- **Settings** — แถวเดียวต่อร้าน (`shopId` unique): ข้อมูลร้าน/โลโก้, บัญชีรับเงิน (+ `extraBankAccounts`/`extraPromptPays` JSON), SlipOK (`slipOkApiKey` เข้ารหัส, `slipOkBranchId`, ข้อมูลผู้รับล่าสุด, `slipOkTestedHash`), `depositRate`, ค่าขนส่ง/โซน/ตำแหน่งร้าน, `brandColor`, ค่าแรง/สัดส่วนกำลังคน, ช่วงเวลา, `closedDates`, เอกสาร, `categories`/`categoryOrder`, `homeContent`, `version` (optimistic locking)
- **AuditLog** — `shopId?, actorUserId, actorRole, actorEmail, action, entityType, entityId, before?, after?, createdAt`

---

## 8. Non-functional / Environment

- **Env vars (frontend):** `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_API_BASE_URL`
- **Env vars (backend):** `DATABASE_URL`, `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` (จำเป็น ขาดแล้วไม่เริ่ม), `FRONTEND_ORIGIN`, `UPLOADS_DIR`, `SUPER_ADMIN_EMAILS`, `SETTINGS_ENCRYPTION_KEY`, `TRUST_PROXY`, `PORT` — ตารางละเอียดที่ README
- **Local dev DB:** `docker-compose.yml` Postgres 16 พอร์ต 5434
- ภาษา UI หลักคือภาษาไทย
- **ความปลอดภัย:** helmet, rate limit, RBAC ต่อร้านจาก DB, สลิปไม่เป็นไฟล์สาธารณะ, เข้ารหัส SlipOK API key (AES-256-GCM) และไม่เก็บค่าจริงใน audit log, token ทาง query รับเฉพาะ SSE
- **การทดสอบ:** Vitest 133 + Jest 246 เทสต์ ไม่มี e2e ของหน้าจอ; CI ใน `.github/workflows/ci.yml`

---

## 9. Gaps / สิ่งที่ยังไม่ได้ทำ (ตามโค้ดปัจจุบัน)

1. **รูป/สลิปเก็บบนดิสก์ของ backend (Volume)** — รัน backend ได้ตัวเดียว ถ้าจะขยายควรย้ายไป object storage และยังไม่มีงานกวาดไฟล์กำพร้า
2. **ยังไม่ได้ตั้งสำรองฐานข้อมูลอัตโนมัติ**
3. **ลูกค้ายกเลิกใบจองเองไม่ได้** และยังไม่ได้กำหนดนโยบายคืนมัดจำ
4. **ไม่มีการแจ้งเตือนนอกแอป** (LINE/อีเมล) — แจ้งผ่าน SSE/กระดิ่งเฉพาะตอนเปิดแอป
5. **PDPA ทำบางส่วน:** มีหน้า [นโยบายความเป็นส่วนตัว](../public/privacy.html) และ [เงื่อนไขการใช้งาน](../public/terms.html) (ผู้ให้บริการ: พีรณัฐ ทุ่งศรีแก้ว, ไม่กำหนดระยะลบข้อมูลอัตโนมัติ — ลบ/แก้ไขตามคำขอของลูกค้า, มัดจำ/ยกเลิกตามที่ร้านกำหนด) ลิงก์ที่หน้า Login และช่องติ๊กยอมรับตอนกรอกข้อมูลเพิ่มเติมครั้งแรก — **ยังไม่มี:** ปุ่มให้ลูกค้าขอลบข้อมูลตัวเองในระบบ (ตอนนี้ต้องแจ้งร้าน/ผู้พัฒนาให้ลบเอง; ตัดสินใจไม่ทำงานลบข้อมูลอัตโนมัติ), บันทึกเวลาที่ผู้ใช้ยอมรับ, และผู้ใช้เดิมที่กรอกข้อมูลครบแล้วไม่ถูกถามยอมรับ
6. **ไม่มีบทบาทพนักงาน (staff)** ที่สิทธิ์ต่ำกว่า owner
7. **กฎ "1 วัน = 1 งาน"** — จองแค่ 2 โต๊ะช่วงเช้าก็ปิดทั้งวัน เป็นข้อจำกัดด้านรายได้ที่ตั้งใจคงไว้
8. **ยังไม่มีระบบเก็บเงินจากร้าน** (billing/แพ็กเกจสมาชิก)
9. **การตรวจสลิป SlipOK ยังไม่เคยทดสอบครบวงจรกับสลิปจริงหลายธนาคาร**; ร้านต้องมีบัญชี SlipOK ของตัวเอง
10. **พึ่ง OSRM/Nominatim สาธารณะ** (มีข้อจำกัดการใช้งาน ลดภาระด้วยแคช/User-Agent) และ Auth0 จำกัดจำนวน tenant ตาม plan (ดู `อนาคตแสนไกลที่สุด.md`)
11. **ไม่มี e2e test ของหน้าจอ**; ช่องโหว่ dependency เหลือ 1 รายการ (`deepmerge-ts` ในเครื่องมือ Prisma CLI ยังไม่มีเวอร์ชันแก้)
