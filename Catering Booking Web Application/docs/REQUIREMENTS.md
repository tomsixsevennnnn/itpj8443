---
noteId: "f3ae61d08f3011f1a0b1b1af0447d59d"
tags: []
title: "Requirement Specification — ระบบจองแคทเธอริ่ง (Catering Booking Web Application)"

---

# Requirement Specification: ระบบจองแคทเธอริ่ง (Catering Booking Web Application)

> เอกสารนี้สรุปจากการอ่านโค้ดจริงในโปรเจกต์ ณ วันที่ 2026-08-18 ครอบคลุมทั้งฝั่ง Frontend (`Catering Booking Web Application/`) และ Backend API (`backend/`)
>
> ต้องการรายละเอียดระดับฟังก์ชัน/เมธอด (พารามิเตอร์ ตรรกะ เงื่อนไข validation ของทุกหน้าจอและทุก endpoint) ดูที่ [`FUNCTIONS.md`](./FUNCTIONS.md)

## 1. ภาพรวมระบบ

ระบบจองโต๊ะจีน/แคทเธอริ่งสำหรับร้านอาหาร แบ่งผู้ใช้เป็น 2 บทบาท คือ **ลูกค้า (Customer)** ที่จองงานผ่านหน้าเว็บ และ **เจ้าของร้าน (Owner)** ที่บริหารจัดการออเดอร์ เมนู แพ็กเกจ กำลังคน และค่าตั้งค่าร้านจากหลังบ้าน

ระบบประกอบด้วย 2 ส่วนแยกกัน ต่อกันจริงผ่าน REST API แล้ว:

| ส่วน | โฟลเดอร์ | สถานะ |
|---|---|---|
| Frontend (SPA) | `Catering Booking Web Application/` | เรียก backend จริงทุกจุด (`src/api.ts`) ไม่มี mock data/local state ค้างอยู่ — ข้อมูล booking/เมนู/แพ็กเกจ/ค่าตั้งค่าทั้งหมดโหลดจาก `GET /bookings /menus /packages /settings` ทันทีหลัง login |
| Backend (REST API) | `backend/` | NestJS + Prisma + PostgreSQL, deploy บน Railway (โปรดักชัน) มี rate limiting, RBAC ปิดข้อมูลอ่อนไหวจาก role ลูกค้า, และ audit field ครบ |

**ระบบออกแบบให้ "ขายต่อ" ให้ร้านอื่นได้** — เกือบทุกอย่างที่เคย hardcode (จังหวัดฐานร้าน/โซนขนส่ง, สีแบรนด์/โลโก้, ประเภทอาหาร, ช่วงเวลาจอง, สัดส่วนคำนวณพนักงาน, เงื่อนไขในเอกสาร) ย้ายไปเป็นค่าที่เจ้าของร้านแก้ไขเองได้จากหน้า "ตั้งค่า" แล้ว (ดูหัวข้อ 3.2 และ 5)

---

## 2. เทคโนโลยีและเครื่องมือที่ใช้

### 2.1 Frontend (`Catering Booking Web Application/`)

| หมวด | เทคโนโลยี | หมายเหตุ |
|---|---|---|
| Framework | React 19 + React DOM 19 | |
| Build tool | Vite 8 + `@vitejs/plugin-react` | dev server รันที่พอร์ต 8443 |
| ภาษา | TypeScript 5.7 | |
| CSS | Tailwind CSS v4 (ผ่าน `@tailwindcss/vite`) | ค่าสีของ Tailwind (`--color-orange-*`/`--color-amber-*`) ถูก override ที่ runtime ตาม `AppSettings.brandColor` — ดู `src/theme.ts` |
| State/context | React Context (`src/NavContext.tsx`) | รวม `navigate/user/shopInfo/notifCount/categories/categoryMap` ไว้ที่เดียว กันส่ง props ซ้ำทุกชั้น |
| Authentication | `@auth0/auth0-react` v2 (Auth0 SPA SDK) | |
| แผนที่ | Leaflet 1.9 + `@types/leaflet` | ปักหมุดสถานที่จัดงาน |
| Geocoding | OpenStreetMap Nominatim API (public, เรียกตรงจาก frontend) | ค้นหา/reverse-geocode ที่อยู่ |
| Routing (ระยะทาง) | OSRM public demo server | คำนวณระยะทางถนนจริงสำหรับงานนอกพื้นที่ |
| กราฟ/แดชบอร์ด | Recharts 3 | กราฟรายได้ย้อนหลัง, สัดส่วนแพ็กเกจ |
| ไอคอน | lucide-react | |
| Test runner | Vitest | `src/*.test.ts` — 53 เทสต์ครอบคลุม logic โมดูล geo/staffing/availability/documents |
| Formatter | oxfmt | `pnpm format` |
| Package manager | pnpm (มี `pnpm-workspace.yaml`) | |
| Node version | ^20.19.0 หรือ >=22.12.0 | |

### 2.2 Backend (`backend/`)

| หมวด | เทคโนโลยี | หมายเหตุ |
|---|---|---|
| Framework | NestJS 11 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`) | |
| ภาษา | TypeScript 5.7, รันด้วย `ts-node-dev` (dev) | |
| ORM | Prisma 6 (`@prisma/client`) | มี migration หลายชุด ล่าสุดเพิ่ม audit field และค่าตั้งค่าร้านที่ owner แก้ได้ |
| ฐานข้อมูล | PostgreSQL 16 (Docker: `postgres:16-alpine` สำหรับ dev, Railway Postgres สำหรับ production) | dev ผ่าน `docker-compose.yml`, expose พอร์ต 5434 |
| Authentication | Passport + `passport-jwt` + `jwks-rsa` | ตรวจสอบ JWT ที่ Auth0 ออกให้ด้วย public key จาก JWKS (RS256), ไม่เก็บ secret เอง |
| Rate limiting | `@nestjs/throttler` | ค่าเริ่มต้นทั้ง API 60 req/นาที/IP, เข้มกว่านั้นที่ `POST /bookings` (10/นาที) และ `GET /geo/resolve-maps-link` (20/นาที) |
| Validation | `class-validator` + `class-transformer` | ใช้กับ DTO ทุกตัว |
| Config | `@nestjs/config` (`ConfigModule.forRoot`) | อ่านจาก `.env` |
| Test runner | Jest | `src/**/*.spec.ts` — DTO validation และ RolesGuard |
| Deploy target | Railway (backend + Postgres plugin), Vercel (frontend) | |

### 2.3 Authentication / Authorization (ใช้ร่วมกันทั้งระบบ)

- **Auth0** เป็นผู้ให้บริการ identity เดียว แยกบทบาทตาม **connection ที่ใช้ login**:
  - `customer` → login ด้วย Google OAuth2 (`google-oauth2`)
  - `owner` → login ด้วย Username/Password (`Username-Password-Authentication`), ต้องสร้างบัญชีไว้ล่วงหน้าใน Auth0 Dashboard
- Auth0 ไม่ส่ง connection name มาตรงๆ ใน token จึงต้องใช้ **Auth0 Action** (Post-Login) ฝัง custom claim `https://pipatphochana-catering.app/role` (`owner`/`customer`) ลงใน ID token และ Access token (ดู `docs/auth0-action.md`)
- Frontend อ่าน role จาก claim นี้ผ่าน `roleFromAuth0User()` (`src/auth.ts`)
- Backend ตรวจสอบ JWT ด้วย `JwtStrategy` (RS256 ผ่าน JWKS ของ Auth0 tenant) แล้วเช็ค role จาก claim เดียวกันใน `RolesGuard` + decorator `@Roles('owner' | 'customer')` — ไม่ใส่ decorator = เข้าถึงได้ทุก role ที่ login แล้ว (แต่ response อาจถูกกรองฟิลด์ตาม role อยู่ดี ดูหัวข้อ 3.3)
- ข้อมูลโปรไฟล์เพิ่มเติมที่ Auth0/Google ไม่มีให้ (เบอร์โทร, Line ID) ขอเพิ่มครั้งแรกหลัง login ผ่านหน้า **CompleteProfile** แล้วบันทึกลง backend จริง (`PATCH /users/me`) — ไม่ใช่ localStorage แล้ว

---

## 3. บทบาทผู้ใช้ (Roles) และสิทธิ์การเข้าถึง

### 3.1 Customer (ลูกค้า)

เข้าใช้งานผ่าน Google login เท่านั้น ทำได้:

- ดูหน้า Home และเมนูนำทางไปยังขั้นตอนการจอง
- เลือกวันที่/ช่วงเวลาจัดงานจากปฏิทิน พร้อมดูสถานะคิว (ว่าง/เต็ม) ของแต่ละวัน
- ระบุจำนวนโต๊ะและจำนวนแขก
- ปักหมุด/ค้นหาสถานที่จัดงานบนแผนที่ (หรือใช้ตำแหน่ง GPS ปัจจุบัน) และกรอกรายละเอียดสถานที่เพิ่มเติม
- เลือกแพ็กเกจอาหาร (ดูราคาต่อโต๊ะ, จำนวนเมนูที่เลือกได้, รายการที่รวมมาให้) — **ไม่เห็นต้นทุนต่อจาน (`costPrice`) ของเมนู**
- เลือกเมนูอาหารแต่ละคอร์สตามโควตาของแพ็กเกจ
- ดูสรุปตะกร้า (ราคารวม + ค่าขนส่งถ้ามี) แล้วยืนยันการจอง — **ราคาจริงที่บันทึกคำนวณที่ backend เสมอ ไม่เชื่อตัวเลขจาก client**
- ดูประวัติการจองของตัวเองเท่านั้น (ไม่เห็นของลูกค้าคนอื่น)
- ดู/พิมพ์ใบเสนอราคาและใบจองของตัวเอง
- แนบสลิปโอนเงินมัดจำเข้าใบจองของตัวเอง (backend ตรวจว่าเป็นรูปจริงและไม่เกินขนาดที่กำหนด)
- ดูการแจ้งเตือน (derive จากใบจองจริงของตัวเอง)
- แก้ไขโปรไฟล์ (เบอร์โทร/Line ID) ของตัวเอง

**ทำไม่ได้:** ดู/แก้ไขใบจองของลูกค้าคนอื่น, เปลี่ยนสถานะใบจอง, แก้ไขเมนู/แพ็กเกจ/ค่าตั้งค่าร้าน, ดูต้นทุนเมนู/ค่าแรงพนักงาน/สัดส่วนคำนวณกำลังคน (ถูกกรองออกจาก response ที่ role นี้)

### 3.2 Owner (เจ้าของร้าน)

เข้าใช้งานผ่าน Username/Password login เท่านั้น (ต้องสร้างบัญชีล่วงหน้าใน Auth0) ทำได้ทุกอย่างที่ customer ทำไม่ได้ ผ่านเมนู Owner:

- **แดชบอร์ด**: ดูรายได้/จำนวนงาน เทียบเดือนก่อนหน้า (%), กราฟรายได้ย้อนหลัง 8 เดือน, สัดส่วนแพ็กเกจที่ขายได้, รายการงานที่ใกล้ถึงพร้อมจำนวนพนักงานที่ต้องใช้
- **ออเดอร์**: ดูใบจองทั้งหมดของทุกลูกค้า, เปลี่ยนสถานะใบจอง (รอยืนยัน/ยืนยันแล้ว/เสร็จสิ้น/ยกเลิก), ปรับแผนกำลังคนจริง (จำนวนที่ระบบคำนวณ vs จำนวนที่ปรับแก้เอง) พร้อมหมายเหตุ
- **ปฏิทินร้าน**: ดูภาพรวมใบจองทั้งหมดตามวัน, อัปเดตสถานะใบจองจากมุมมองปฏิทิน
- **แพ็กเกจ**: สร้าง/แก้ไข/ลบแพ็กเกจ (ราคาต่อโต๊ะ, จำนวนเมนูที่เลือกได้, features, badge, คอร์สอาหารแต่ละข้อพร้อมจำนวนที่เลือกได้และเมนูที่อยู่ในข้อนั้น)
- **เมนูอาหาร**: สร้าง/แก้ไข/ลบเมนูในคลัง, อัปโหลดรูปเมนู (ย่อขนาดก่อนเก็บ), เปิด/ปิดการแสดงเมนู, ระบบเตือนก่อนลบถ้าเมนูถูกใช้อยู่ในแพ็กเกจ, กรอกต้นทุนต่อจาน (`costPrice`) เพื่อคำนวณกำไร
- **เอกสาร**: ออก/พิมพ์ใบเสนอราคาและใบจองของทุกใบจอง โดยใช้เทมเพลตเดียวกัน อ้างอิงค่าตั้งค่าร้าน (ชื่อร้าน, อัตรามัดจำ, จังหวัดฐานร้าน, เงื่อนไขที่ตั้งไว้เอง ฯลฯ)
- **ตั้งค่า**: หน้าที่ทำให้ระบบ "ขายต่อร้านอื่น" ได้จริง — แก้ไขได้เกือบทั้งหมด (ดูหัวข้อ 5 สำหรับรายละเอียด)

**ทำไม่ได้ (ยังไม่มีในระบบ):** ไม่มีบทบาทที่ 3 (เช่น staff/พนักงาน — ทุกคนที่เข้าฝั่ง owner ใช้บัญชีเดียวกันหมด ไม่มี audit ระดับ "ใครเป็นใคร" นอกจาก `lastEditedBy` เก็บ auth0Sub ดิบไว้), ไม่มีระบบสมาชิกลูกค้าแยกจาก booking, หน้า "ลูกค้า" (customer directory) ถูกลบออกแล้วเพราะไม่มี sidebar link เข้าถึง

### 3.3 สรุปสิทธิ์ระดับ API (backend)

| Endpoint | Customer | Owner | หมายเหตุ |
|---|---|---|---|
| `GET /users/me`, `PATCH /users/me` | ✅ (ของตัวเอง) | ✅ (ของตัวเอง) | login แล้วเท่านั้น |
| `GET /bookings` | ✅ เห็นเฉพาะของตัวเอง | ✅ เห็นทั้งหมด | รองรับ `?page=&limit=` (opt-in) |
| `GET /bookings/availability` | ✅ | ✅ | คิวรับงานไม่มีข้อมูลส่วนตัว |
| `POST /bookings` | ✅ | ❌ | ราคาคำนวณที่ backend จาก `packageId`, validate เมนูต้องอยู่ในแพ็กเกจ, rate limit 10/นาที |
| `PATCH /bookings/:id` | ❌ | ✅ | บันทึก `lastEditedBy` |
| `PATCH /bookings/:id/payment-slip` | ✅ (ของตัวเอง) | ❌ | validate เป็นรูปภาพจริง |
| `GET /menus`, `GET /packages` | ✅ (ไม่เห็น `costPrice`) | ✅ (เห็นครบ) | รองรับ pagination |
| `POST/PATCH/DELETE /menus`, `/packages` | ❌ | ✅ | |
| `GET /settings` | ✅ (ไม่เห็นค่าแรง/สัดส่วนกำลังคน) | ✅ (เห็นครบ) | |
| `PATCH /settings` | ❌ | ✅ | |
| `GET /settings/public` | ไม่ต้อง login | ไม่ต้อง login | ใช้แสดงหน้า Login (ชื่อร้าน, โลโก้, สีแบรนด์, คำโปรย) |
| `GET /geo/resolve-maps-link` | ✅ | ✅ | rate limit 20/นาที, whitelist โดเมน goo.gl เท่านั้น |

ควบคุมด้วย `JwtAuthGuard` (ต้องมี token ที่ valid) + `RolesGuard` (เช็ค custom claim role) + `ThrottlerGuard` (rate limit) ทุก controller — ฟิลด์ที่เป็นข้อมูลต้นทุนภายใน (`costPrice`, `wageChef/wageAssistant/wageServerPerTable/wageDishwasher`, `tablesPerServer/tablesPerSupport/staffRemainderThreshold`) ถูกกรองออกจาก response ที่ role เป็น customer โดย service ชั้น ไม่ใช่แค่ frontend ไม่แสดง

---

## 4. Functional Requirements (แยกตามหน้าจอ/โมดูล)

### 4.1 Authentication & Onboarding

| หน้าจอ | ไฟล์ | หน้าที่ |
|---|---|---|
| Login | `src/screens/Login.tsx` | ปุ่มเข้าระบบแบบ Google (customer) และปุ่ม "เข้าระบบในฐานะเจ้าของร้าน" (username/password) — เรียก `loginWithRedirect` ของ Auth0 พร้อมบังคับ connection ให้ตรง role; โชว์ชื่อร้าน/โลโก้/คำโปรยจาก `GET /settings/public` (poll ทุก 20 วิ) และทาสีแบรนด์ทันทีแม้ยังไม่ login |
| CompleteProfile | `src/screens/CompleteProfile.tsx` | หลัง login ด้วย Google ครั้งแรก ขอชื่อจริง/นามสกุล/เบอร์โทร/Line ID บันทึกผ่าน `PATCH /users/me` |

### 4.2 ขั้นตอนการจอง (Customer booking flow)

| หน้าจอ | ไฟล์ | หน้าที่ |
|---|---|---|
| Home | `src/screens/Home.tsx` | จุดเริ่มต้น เนื้อหาทั้งหมด (hero/steps/gallery/CTA) มาจาก `AppSettings.homeContent` ที่ owner แก้ได้ |
| BookingCalendar | `src/screens/BookingCalendar.tsx` | เลือกวันที่/ช่วงเวลา (เช้า/กลางวัน/เย็น — เวลาของแต่ละช่วงตั้งค่าได้), แสดงสถานะคิวแต่ละวัน (ว่าง/เต็ม) จากใบจองจริง |
| SelectTable | `src/screens/SelectTable.tsx` | เลือกจำนวนโต๊ะและจำนวนแขก, แสดง preview เงื่อนไขพื้นที่ตามจังหวัดฐานร้าน (`homeProvince`) ที่ตั้งค่าไว้ |
| SelectLocation | `src/screens/SelectLocation.tsx` | ปักหมุด/ค้นหาสถานที่บนแผนที่ (Leaflet + Nominatim), ใช้ตำแหน่ง GPS, กรอกรายละเอียดสถานที่, ตรวจสอบโซนบริการ (home/metro/outside ตาม `homeProvince`/`metroProvinces` ที่ตั้งค่าไว้) |
| SelectPackage | `src/screens/SelectPackage.tsx` | เลือกแพ็กเกจอาหาร 1 แพ็กเกจ, แสดงราคารวมตามจำนวนโต๊ะ |
| SelectMenu | `src/screens/SelectMenu.tsx` | เลือกเมนูแต่ละคอร์สตามโควตาของแพ็กเกจ, รายการที่รวมมาให้ (choose = 0) ถูกใส่อัตโนมัติ |
| Cart | `src/screens/Cart.tsx` | สรุปออเดอร์ทั้งหมด, ยืนยันสร้างใบจอง — ส่งแค่ `packageId` + รายละเอียดงานไปหลังบ้าน ไม่ส่งราคา (backend คำนวณเอง) |
| BookingHistory | `src/screens/BookingHistory.tsx` | ดูใบจองของตัวเอง, ดู/พิมพ์เอกสาร, แนบรูปสลิปโอนเงิน — โมดัลไม่ใช้ `backdrop-blur` แล้ว (เคยทำให้เลื่อนหน้าจอหน่วง) |
| Notifications | `src/screens/Notifications.tsx` | หน้าแจ้งเตือนของลูกค้า derive จากใบจองจริง |

### 4.3 ฝั่งเจ้าของร้าน (Owner back-office)

| หน้าจอ | ไฟล์ | หน้าที่ |
|---|---|---|
| OwnerLayout | `src/components/OwnerLayout.tsx` | Layout + เมนูนำทาง 9 รายการ (ไม่มี "ลูกค้า" แล้ว) |
| Dashboard | `src/screens/owner/Dashboard.tsx` | สรุปรายได้/จำนวนงาน, กราฟรายได้ 8 เดือน, สัดส่วนแพ็กเกจ, งานที่ใกล้ถึงพร้อมกำลังคน (คำนวณตามสัดส่วนที่ตั้งค่าไว้) |
| Orders | `src/screens/owner/Orders.tsx` | จัดการใบจองทั้งหมด, เปลี่ยนสถานะ, คำนวณ/ปรับแก้แผนกำลังคนต่องาน |
| CalendarView | `src/screens/owner/CalendarView.tsx` | ปฏิทินรวมใบจองทุกลูกค้า, แก้สถานะจากมุมมองปฏิทิน |
| Packages | `src/screens/owner/Packages.tsx` | CRUD แพ็กเกจอาหาร, จัดการคอร์ส/ข้อในแพ็กเกจตามประเภทอาหารที่ตั้งค่าไว้ |
| Menus | `src/screens/owner/Menus.tsx` | CRUD เมนูอาหารในคลัง, กรอกต้นทุนต่อจาน, อัปโหลด/ย่อรูปภาพ |
| Documents | `src/screens/owner/Documents.tsx` | ออกใบเสนอราคา/ใบจองของทุกใบจอง, สั่งพิมพ์ |
| Settings | `src/screens/owner/Settings.tsx` | หน้าที่ใหญ่ที่สุด — ดูหัวข้อ 5 ทั้งหมด |
| PageContent | `src/screens/owner/PageContent.tsx` | แก้ไขเนื้อหาหน้าแรก (`homeContent`) |

### 4.4 Shared components / business logic modules

| ไฟล์ | หน้าที่ |
|---|---|
| `src/components/BookingDocument.tsx` | เทมเพลตเอกสารร่วมสำหรับใบเสนอราคาและใบจอง — เงื่อนไขระบบคำนวณอัตโนมัติ (มัดจำ/ค่าขนส่ง) แยกจากเงื่อนไขเพิ่มเติมที่ owner พิมพ์เอง (ดูหัวข้อ 5.6) |
| `src/components/LocationMap.tsx` | Wrapper ของ Leaflet map: ปักหมุด, ลากหมุด, บินไปตำแหน่งที่ค้นหา/GPS |
| `src/components/DishTile.tsx` | การ์ดแสดงเมนูอาหาร 1 รายการ — ดึงไอคอน/สี fallback จาก `categoryMap` ใน `NavContext` |
| `src/components/Navbar.tsx` | แถบนำทางฝั่งลูกค้า — ดึง `navigate/user/shopInfo/notifCount` จาก `NavContext` ไม่รับเป็น props แล้ว |
| `src/NavContext.tsx` | Context กลางเก็บ `navigate/user/shopInfo/notifCount/categories/categoryMap` — ลด prop drilling |
| `src/theme.ts` | สร้างสเกลสี 50–900 จาก `brandColor` (hex) แล้ว override CSS variable ของ Tailwind ที่ runtime |
| `src/staffing.ts` | สูตรคำนวณจำนวนพนักงาน — รับ `StaffRatios` เป็นพารามิเตอร์ (ค่าเริ่มต้น = ค่าคงที่เดิม, ค่าจริงมาจาก `AppSettings`) |
| `src/availability.ts` | สถานะคิวงานรายวัน/รายช่วงเวลา — `bookableSlots(hours)` รับเวลาที่ตั้งค่าไว้ |
| `src/geo.ts` | โซนบริการ + คำนวณค่าขนส่ง + geocoding — `zoneFor`/`checkDelivery` รับ `homeProvince`/`metroProvinces` เป็นพารามิเตอร์ |
| `src/documents.ts` | ชนิดเอกสาร, เลขที่เอกสาร, วันหมดอายุใบเสนอราคา (`quotationValidDays` ตั้งค่าได้) |
| `src/imageUpload.ts` | อ่านไฟล์รูปจากเครื่องแล้วย่อขนาดก่อนใช้งาน (เมนู, สลิปโอนเงิน, โลโก้, QR) |
| `src/data.ts` | `DEFAULT_CATEGORIES` (ค่าเริ่มต้นก่อน owner แก้), `orderedCategories()`, `categoryMapOf()`, `requiredCourses()`, `includedItems()` |
| `src/api.ts` | เรียก backend จริงทุก endpoint, แปลงรูปแบบข้อมูล frontend ↔ backend |

### 4.5 Backend API (`backend/src`)

ดูตารางเต็มในหัวข้อ 3.3 — เพิ่มเติมจากเดิม: `POST /bookings` ไม่รับ `totalPrice`/`packageName` จาก client อีกต่อไป (รับแค่ `packageId`), ทุก endpoint แบบ list รองรับ `?page=&limit=` เป็น optional

---

## 5. ค่าตั้งค่าร้านที่เจ้าของร้านแก้ไขได้ (`AppSettings`, หน้า Settings.tsx)

หมวดนี้คือสิ่งที่เปลี่ยนมากที่สุดจากเดิม — เกือบทุกค่าที่เคย hardcode ย้ายมาที่นี่หมดแล้ว เพื่อให้ระบบใช้ซ้ำกับร้านอื่นได้โดยไม่ต้องแก้โค้ด:

| หมวด | ฟิลด์ | หมายเหตุ |
|---|---|---|
| ข้อมูลร้าน | `shopInfo.{name,nameEn,initials,address,phone,line,logo,loginTagline}` | `logo` เป็น data URL, ใช้แทนไอคอน ChefHat เริ่มต้นทุกจุด (Navbar, OwnerLayout, Login) |
| การเงิน | `depositRate`, `bankName/bankAccountNumber/bankAccountName/promptPayQr` | |
| พื้นที่บริการ | `homeProvince`, `metroProvinces[]`, `deliveryFee`, `freeDeliveryMinTables`, `shopLocation`, `fuelCostPerKm` | ตัดสินโซน home/metro/outside จากคำที่อยู่ใน `homeProvince`/`metroProvinces` |
| ธีม | `brandColor` (hex) | override CSS variable ของ Tailwind ทั้งแอปที่ runtime ไม่ต้องแก้โค้ด/rebuild |
| ค่าแรง/กำลังคน (owner เท่านั้น) | `wageChef/wageAssistant/wageServerPerTable/wageDishwasher`, `tablesPerServer/tablesPerSupport/staffRemainderThreshold` | สูตรคำนวณพนักงานอิงค่าพวกนี้ |
| ช่วงเวลาจอง | `timeSlotHours.{morning,noon,evening}` | ชื่อ/ID ช่วงคงที่ (กันข้อมูลใบจองเก่าพัง) แก้ได้แค่เวลา |
| เอกสาร | `quotationValidDays`, `quotationTerms[]`, `bookingTerms[]` | เงื่อนไขที่ระบบคำนวณอัตโนมัติ (มัดจำ/ค่าขนส่ง) ไม่อยู่ในนี้ — แสดงเสมอโดยอิงค่าตั้งค่าจริง |
| ประเภทอาหาร | `categories[]` (เพิ่ม/ลบ/แก้ไอคอน-ชื่อได้), `categoryOrder[]` | เก็บเป็น JSON ใน `Settings.categories` |
| หน้าแรก | `homeContent` | แก้จากหน้า "แก้ไขหน้าเว็บ" (PageContent.tsx) แยกจากหน้า Settings |

---

## 6. กฎธุรกิจหลัก (Business Rules)

### 6.1 การคำนวณจำนวนพนักงาน (`src/staffing.ts`)

คำนวณจากจำนวนโต๊ะที่จอง ด้วยสัดส่วนที่ตั้งค่าได้ (ค่าเริ่มต้นในวงเล็บ):

- **พนักงานเสิร์ฟ**: 1 คนต่อกี่โต๊ะ (`tablesPerServer`, ค่าเริ่มต้น 8) — ปัดขึ้นเสมอ
- **พ่อครัว**: 1 คนต่อ 1 งาน เสมอ (ค่านี้ไม่เปิดให้แก้)
- **ผู้ช่วยพ่อครัว / พนักงานล้างจาน**: 1 คนต่อกี่โต๊ะ (`tablesPerSupport`, ค่าเริ่มต้น 20), เศษเกิน `staffRemainderThreshold` โต๊ะ (ค่าเริ่มต้น 10) ให้เพิ่มอีก 1 คน
- เจ้าของร้านสามารถปรับแก้จำนวนจริงต่างจากที่ระบบคำนวณได้ต่องาน พร้อมหมายเหตุ (เก็บทั้ง `staffAuto` และ `staffActual`)

### 6.2 คิวงานและสถานะวัน (`src/availability.ts`)

- ช่วงเวลาที่จองได้: เช้า, กลางวัน, เย็น (ชื่อคงที่ เวลาตั้งค่าได้จาก `timeSlotHours`) หรือทั้งวัน (ใบจองเก่า)
- กติกาปัจจุบัน: **มีใบจอง (สถานะ pending/confirmed/completed) อยู่แล้ววันไหน ถือว่าวันนั้นเต็มทั้งวัน** ไม่รับซ้อนช่วงเวลาอื่นในวันเดียวกัน (ใบจองที่ยกเลิกไม่นับ) — จงใจไม่แก้ตามคำขอ (ดูข้อ 8)

### 6.3 พื้นที่ให้บริการและค่าขนส่ง (`src/geo.ts`, `backend/src/bookings/bookings.service.ts`)

| โซน | เงื่อนไข | ค่าขนส่ง |
|---|---|---|
| พื้นที่ร้าน (`homeProvince`) | รับจัดกี่โต๊ะก็ได้ | ไม่มีค่าขนส่ง |
| กรุงเทพและปริมณฑล/จังหวัดใกล้เคียง (`metroProvinces`) | จองได้ทุกจำนวนโต๊ะ | ไม่ถึงขั้นต่ำ (`freeDeliveryMinTables`) คิดค่าขนส่ง (`deliveryFee`) / ถึงขั้นต่ำไม่คิด |
| นอกพื้นที่ให้บริการ | ไม่มีขั้นต่ำ | คิดตามระยะทางถนนจริงไป-กลับ (OSRM) × `fuelCostPerKm` |

โซนตัดสินจากข้อความจังหวัด/ที่อยู่ที่ตรงกับ `homeProvince`/`metroProvinces` (case-insensitive, substring match) — **backend คำนวณราคาซ้ำเองจากค่าตั้งค่าจริง ไม่เชื่อตัวเลขที่ client ส่งมา** ยกเว้น zone/distanceKm ที่ยังอิงค่าที่ client geocode มา (มี cap ระยะทางกันค่าผิดปกติ)

### 6.4 เอกสาร: ใบเสนอราคา vs ใบจอง (`src/documents.ts`, `src/components/BookingDocument.tsx`)

ใช้เทมเพลตเดียวกัน ข้อมูลราคา/รายการอาหาร/ยอดรวมเหมือนกันทุกจุด ต่างกันเฉพาะเลขที่เอกสาร, บรรทัดสถานะ/วันหมดอายุ, และเงื่อนไขท้ายเอกสาร — เงื่อนไขแบ่งเป็น 2 ชั้น: (1) ที่ระบบคำนวณอัตโนมัติเสมอ (ยืนราคากี่วัน, ยอดมัดจำ, เงื่อนไขค่าขนส่งตามโซน) และ (2) เงื่อนไขเพิ่มเติมที่ owner พิมพ์เองเก็บใน `quotationTerms`/`bookingTerms`

### 6.5 ผู้ใช้/บัญชี

- ไม่มีระบบ signup แยก — บัญชีสร้าง/sync อัตโนมัติจาก Auth0 JWT ตอน login ครั้งแรก (`findOrCreate` โดยอิง `auth0Sub`)
- ไม่มีบทบาทพนักงาน/staff แยก — ทุกคนฝั่ง owner ใช้บัญชีเดียวกัน มีแค่ `lastEditedBy` (auth0Sub ดิบ) เก็บไว้อ้างอิงว่าแก้ล่าสุดจากบัญชีไหน ไม่ใช่ระบบสิทธิ์แยกราย staff

---

## 7. Data Model สรุป (Prisma schema, `backend/prisma/schema.prisma`)

- **User** — `id, auth0Sub(unique), role(CUSTOMER|OWNER), name, surname, phone, lineId, email, avatar, createdAt` → มีหลาย `Booking`
- **MenuItem** — `id, name, category, description, image?, extraPrice?, costPrice?, active, updatedAt, lastEditedBy?` → เชื่อมกับหลาย `PackageCourse` (many-to-many ผ่าน `CourseItems`)
- **Package** — `id, name, pricePerTable, menuLimit, description, features[], badge?, sortOrder, updatedAt, lastEditedBy?` → มีหลาย `PackageCourse`
- **PackageCourse** — `id, packageId, no, title, icon?, category, choose (0=รวมมาให้แล้ว/>0=เลือกได้กี่อย่าง), items[]`
- **Booking** — `id, customerId?, customerName, bookingYear, bookingNo, date, timeSlot, tables, guestCount, packageName, totalPrice, pricePerTable?, deliveryFee?, status(PENDING|CONFIRMED|COMPLETED|CANCELLED), location, locationDetail(json)?, menus[], phone, lineId?, staffAuto/staffActual(json)?, staffNote?, staffSavedAt?, paymentSlipUrl?, paymentSlipUploadedAt?, createdAt, updatedAt, lastEditedBy?` — index บน `customerId` และ `date`, unique บน `(bookingYear, bookingNo)`
- **BookingCounter** — `year(id), lastNo` — ออกเลขที่ใบจองแบบ atomic
- **Settings** — แถวเดียวเสมอ (`id=1`): ข้อมูลร้าน/บัญชี/โลโก้, `depositRate`, `deliveryFee`/`freeDeliveryMinTables`/`metroProvinces[]`/`homeProvince`, `brandColor`, ค่าแรง/สัดส่วนกำลังคน 7 ฟิลด์, `slotMorningHours/slotNoonHours/slotEveningHours`, `quotationValidDays`/`quotationTerms[]`/`bookingTerms[]`, `categories(json)`/`categoryOrder[]`, `shopLocationLat/Lng`, `fuelCostPerKm`, `homeContent(json)`, `updatedAt`, `lastEditedBy?`

---

## 8. Non-functional / Environment

- **Env vars (frontend)**: `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_API_BASE_URL`
- **Env vars (backend)**: `PORT`, `DATABASE_URL`, `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `FRONTEND_ORIGIN` (CORS, รองรับหลายค่าคั่นด้วย comma)
- **Local dev DB**: `docker-compose.yml` รัน Postgres 16 บนพอร์ต 5434
- ภาษา UI หลักคือภาษาไทยทั้งระบบ
- มี automated tests แล้วทั้งสองฝั่ง (Vitest ฝั่ง frontend 53 เทสต์, Jest ฝั่ง backend 13 เทสต์) — ยังไม่ครอบคลุมทุก endpoint/หน้าจอ

---

## 9. Gaps / สิ่งที่ยังไม่ได้ทำ (จากการอ่านโค้ดปัจจุบัน)

1. **ไม่มี object storage จริง** — รูปเมนู/โลโก้/QR/สลิปโอนเงินยังเก็บเป็น data URL ตรงในคอลัมน์ DB ไม่ใช่ไฟล์แยกบน CDN
2. **ไม่มีระบบแจ้งเตือนแบบ real-time** — หน้า Notifications derive จากข้อมูลที่โหลดมาแล้ว/polling ไม่ใช่ push
3. **ไม่มีบทบาทที่ 3 (staff)** — ทุกคนฝั่ง owner ใช้บัญชีเดียวกัน, `lastEditedBy` มีแต่ไม่ใช่ระบบสิทธิ์แยกราย staff
4. **ไม่ใช่ multi-tenant** — 1 deployment = 1 ร้าน ถ้าจะขายหลายร้านต้อง deploy แยก instance ต่อร้าน (ดู `docs/อนาคตแสนไกลที่สุด.md`)
5. **zone/distanceKm ของค่าขนส่งยังอิง client geocode บางส่วน** — backend คำนวณราคาซ้ำจริง แต่ยังไม่ re-verify พิกัด/โซนจากพิกัดดิบเองทั้งหมด (มี cap ระยะทางกันค่าผิดปกติเท่านั้น)
6. **กฎ "1 วัน = 1 งาน" (BR-02 เดิม)** — จองแค่ 2 โต๊ะช่วงเช้าก็ปิดทั้งวันทันที เป็นข้อจำกัดด้านรายได้ที่ตั้งใจคงไว้ ไม่ใช่บั๊ก
