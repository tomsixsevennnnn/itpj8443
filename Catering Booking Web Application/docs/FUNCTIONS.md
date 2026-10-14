---
noteId: "37a3c5e08f3311f1a0b1b1af0447d59d"
tags: []
title: "Function Specification (ละเอียด) — ระบบจองแคทเธอริ่ง"

---

# Function Specification แบบละเอียด — ทั้งระบบ

> เอกสารนี้ต่อยอดจาก [`REQUIREMENTS.md`](./REQUIREMENTS.md) โดยลงรายละเอียดระดับฟังก์ชัน/เมธอดจริงที่มีอยู่ในโค้ด (พารามิเตอร์ ตรรกะ เงื่อนไข validation) ทั้งฝั่ง Frontend และ Backend ปรับปรุงล่าสุด 2026-10-14 (เพิ่มระบบหลายร้าน/Super Admin, SlipOK และช่องทางโอน, Audit Log, SSE, กฎใบจองที่ backend, ความปลอดภัยและ health) ส่วนภาพรวมดู `SYSTEM_OVERVIEW.md` ที่ `docs/` ของรากโปรเจกต์

---

## สารบัญ

1. [Frontend — หน้าจอ Authentication](#1-frontend--หน้าจอ-authentication)
2. [Frontend — ขั้นตอนการจอง (Customer flow)](#2-frontend--ขั้นตอนการจอง-customer-flow)
3. [Frontend — ฝั่งเจ้าของร้าน (Owner)](#3-frontend--ฝั่งเจ้าของร้าน-owner)
4. [Frontend — Shared Components / Context](#4-frontend--shared-components--context)
5. [Frontend — Core Logic / Utility Modules](#5-frontend--core-logic--utility-modules)
6. [Backend — REST API (NestJS)](#6-backend--rest-api-nestjs)
7. [Backend — Data Validation (DTO) สรุป](#7-backend--data-validation-dto-สรุป)

---

## 1. Frontend — หน้าจอ Authentication

### 1.1 `Login.tsx`

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `loginAsCustomer()` | เรียก `loginWithRedirect({ authorizationParams: { connection: 'google-oauth2', prompt: 'login' } })` — `prompt: 'login'` บังคับโชว์หน้า login ใหม่เสมอ กัน SSO session เดิมของบัญชีอื่นหลุดผ่านมา |
| `loginAsOwner()` | เหมือนกันแต่ connection = `Username-Password-Authentication` |
| poll ทุก 20 วิ | เรียก `api.publicShopInfo()` (ไม่ต้อง token) อัปเดตชื่อร้าน/โลโก้/คำโปรย/สีแบรนด์ (`applyBrandTheme`) กัน tab เปิดค้างเห็นข้อมูลเก่าถ้า owner แก้ระหว่างนั้น |

ปุ่มทั้งสองถูก disable ระหว่าง `isLoading` ของ Auth0 SDK เป็น true

### 1.2 `CompleteProfile.tsx`

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `handleSave()` | Validation: ต้องกรอกชื่อจริง+นามสกุล+เบอร์โทรครบ (`lineId` ไม่บังคับ) ปุ่มถูก disable จนกว่าจะครบ → เรียก `onComplete(form)` |

Props: `name/surname/phone/lineId` (ค่าที่เคยกรอกไว้บางส่วน โชว์ล่วงหน้าเสมอ ไม่ใช่แค่ครั้งแรก), `onComplete` — เรียกจาก `App.tsx` เพื่อยิง `PATCH /users/me` แล้วนำทางไป `home`

### 1.3 `App.tsx` — ตรรกะควบคุมการนำทางหลัง login

| ฟังก์ชัน/ค่า | รายละเอียด |
|---|---|
| `role = roleFromAuth0User(auth0User)` | อ่าน custom claim จาก Auth0 user object → `'customer'` หรือ `'owner'` |
| โหลดข้อมูลหลัง login | `useEffect` ยิงพร้อมกัน (`Promise.all`): `syncProfile`, `bookings`, `bookingsAvailability`, `packages`, `menus`, `settings` |
| `needsProfile` | `true` เมื่อ login แล้ว, เป็น customer, และ backend ยังไม่มีชื่อ/นามสกุล/เบอร์โทรครบ → บังคับไปหน้า `CompleteProfile` ก่อน |
| `effectiveScreen` | ถ้า `screen === 'login'` และ login สำเร็จแล้วและไม่ต้องกรอกโปรไฟล์ → บังคับเป็น `'owner-dashboard'` (owner) หรือ `'home'` (customer) |
| `navigate(s: Screen)` | ถ้า `s === 'login'` → ล้าง Auth0 SDK session ใน localStorage เอง (กันเขียนทับตอน logout ชนกับ token refresh) แล้วเรียก Auth0 `logout()`; ออกจากขั้นตอนการจอง (6 หน้า) ไปหน้าอื่น → ล้าง `booking` state กลับเป็นค่าเริ่มต้น |
| `navContext` (`useMemo`) | รวม `navigate/user/shopInfo/notifCount/categories/categoryMap` ส่งเข้า `<NavProvider>` ห่อทั้งแอป — ดูหัวข้อ 4.6 |
| `useEffect` ทาสีแบรนด์ | เรียก `applyBrandTheme(settings.brandColor)` ทุกครั้งที่ค่านี้เปลี่ยน (รวมตอน polling settings เจอค่าที่แก้จากเครื่องอื่น) |
| `handleConfirm()` | ส่ง `packageId` (ไม่ใช่ราคา) ไป `POST /bookings` — backend คำนวณราคาเอง |

### 1.4 `ShopSelect.tsx` — หน้าเลือกร้าน

หน้าแรกสุดของแอป (multi-tenant): ลูกค้าต้องเลือกร้านก่อน ไม่ต้อง login — โหลดรายชื่อจาก `GET /shops/public` และ poll ทุก 20 วินาที (ยังไม่ login จึงใช้ SSE ไม่ได้) เลือกร้านแล้วเก็บ `selectedShopId`/`selectedShopSlug` ใน localStorage และตั้ง `X-Shop-Id` (`setActiveShopId` ใน `api.ts`) ถ้าร้านที่เลือกไว้ถูกลบระหว่างใช้งาน `App.tsx` เด้งกลับหน้านี้

### 1.5 URL routing และปุ่ม back/forward (`App.tsx`)

`pathForScreen`/`screenFromPath` แปลงหน้า ↔ URL ตามบทบาท (ลูกค้า: `/{slug}/...`, owner: `/owner/...`, super admin: `/super-admin`), `navigate()` ทำ `history.pushState`, `handlePopState()` ตอบสนอง back/forward: ถ้า login แล้วร้านผูกกับ session ไม่เปลี่ยนตาม URL แต่สลับหน้าภายในได้ ถ้ายังไม่ login สลับระหว่างหน้าเลือกร้านกับหน้า login ของร้านที่เคยเลือกได้; `resolveActiveRole()` เลือกบทบาทของผู้ใช้ในร้านที่เปิดอยู่ (owner ของร้านหนึ่งเป็นลูกค้าของอีกร้านได้) และ `loadAppData()` โหลดข้อมูลตามบทบาท (super admin = รายชื่อร้าน/owner, owner/customer = bookings/packages/menus/settings ของร้าน)

### 1.6 `AppScreens.tsx` และ `ErrorBoundary.tsx`

`AppScreens.tsx` ประกอบหน้าจอตามบทบาท (`SuperAdminScreen`, `OwnerScreens`, `CustomerScreens`) แยกออกจาก `App.tsx` (ย้ายโค้ดตรงๆ ไม่เปลี่ยนตรรกะ) ส่วน `ErrorBoundary` ครอบ `<App />` ใน `main.tsx` — ถ้ามี component พังตอน render แสดงข้อความและปุ่ม "โหลดหน้าใหม่" แทนหน้าขาว

---

## 2. Frontend — ขั้นตอนการจอง (Customer flow)

### 2.1 `Home.tsx`

หน้า landing — เนื้อหาทั้งหมด (hero/badges/steps/gallery/CTA) มาจาก `settings.homeContent` (prop) ไม่มีค่าคงที่ในโค้ดแล้ว ปุ่ม "เริ่มจองเลย" เรียก `navigate('booking-calendar')`

### 2.2 `BookingCalendar.tsx` — ขั้นตอนที่ 1

| ฟังก์ชัน | Input → Output | ตรรกะ |
|---|---|---|
| `prevMonth()` / `nextMonth()` | – | เลื่อนเดือนที่แสดงในปฏิทิน, ข้ามปีอัตโนมัติเมื่ออยู่ ม.ค./ธ.ค. |
| `getAvail(day)` | วันที่ → `'available' \| 'full'` | เรียก `dayStatus()` จาก `availability.ts` โดยใช้ `bookings` ที่เป็นคิวรวมของทุกลูกค้า (ไม่มีข้อมูลส่วนตัว) |
| `slots = bookableSlots(slotHours)` | prop `slotHours` (จาก `settings.timeSlotHours`) → `TimeSlotDef[]` | ใช้ค่าเวลาที่ owner ตั้งไว้แทนค่าคงที่ในโค้ด |
| `handleNext()` | – | Validation: ต้องมีทั้งวันที่และช่วงเวลา → เรียก `onSelectDateTime(date, "${label} (${time})")` แล้ว `navigate('select-table')` |

### 2.3 `SelectTable.tsx` — ขั้นตอนที่ 2

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `handleTableInput(value)` | parse เป็นตัวเลข, clamp 1–500, ปัดเป็นจำนวนเต็ม |
| ปุ่ม `+`/`-` | เพิ่ม/ลดทีละ 1 โต๊ะ ขอบเขตเดียวกัน |
| แสดงเงื่อนไขพื้นที่ | ใช้ `homeProvince` (prop จาก settings) ในข้อความอธิบายแทนชื่อจังหวัดคงที่ |

### 2.4 `SelectLocation.tsx` — ขั้นตอนที่ 3

| ฟังก์ชัน | รายละเอียด |
|---|---|
| ค้นหาแบบ debounce (600ms) | เรียก `searchPlaces()` (Nominatim); ถ้าวางเป็นลิงก์ Google Maps ให้แกะพิกัดแทน (ลิงก์สั้นต้องผ่าน `onResolveMapsLink` ที่ backend ก่อน เพราะ Google ไม่เปิด CORS) |
| `applyPin(lat, lng)` | เรียก `reverseGeocode()` แปลงกลับเป็นชื่อสถานที่ |
| `zone = zoneFor(place.province, place.address, metroProvinces, homeProvince)` | รับพารามิเตอร์จาก settings แทนค่าคงที่ในโค้ด |
| `check = checkDelivery(tables, zone, deliveryFee, freeDeliveryMinTables, outsideContext, homeProvince)` | ข้อความอธิบาย/ป้ายกำกับใช้ `zoneLabel(homeProvince)` แทน `ZONE_LABEL` คงที่เดิม |
| `handleNext()` | บล็อกถ้า `check.blocked`; ประกอบ `EventLocation` (มี `zone`/`distanceKm` ติดไปด้วย — backend ใช้ค่านี้คำนวณค่าขนส่งตอนสร้าง booking) |

### 2.5 `SelectPackage.tsx` — ขั้นตอนที่ 4

คลิกการ์ดแพ็กเกจ → `onSelectPackage(pkg)`: ตั้ง `packageId/packageName/packagePrice/menuLimit`, รีเซ็ต `selectedMenus` เป็นรายการที่รวมมาให้ถ้าเปลี่ยนแพ็กเกจ ไอคอนของแต่ละคอร์สอ่านจาก `categoryMap` (context) แทน `CATEGORY_MAP` คงที่เดิม

### 2.6 `SelectMenu.tsx` — ขั้นตอนที่ 5

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `sortByCourse(items)` | เรียงตามเลขข้อของแพ็กเกจปัจจุบัน |
| `useEffect` เติมรายการที่รวมมาให้ | เช็ค `includedItems(pkg)` แล้วเพิ่มเข้า `selectedMenus` อัตโนมัติถ้ายังไม่มี |
| `chooseItem(course, item)` | ถ้า `course.choose === 0` (ล็อกไว้) ไม่ทำอะไร; มิฉะนั้นแทนที่เมนูอื่นในข้อเดียวกัน (เลือกได้ 1/ข้อ) แล้วเลื่อน active course ไปข้อถัดไปอัตโนมัติ |
| `allDone` | ปุ่มไปตะกร้าเปิดใช้งานเมื่อเลือกครบทุกข้อที่ต้องเลือกเอง |

### 2.7 `Cart.tsx` — ขั้นตอนที่ 6

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `subtotal = packagePrice * tables`, `deliveryFee = deliveryFeeFor(...)` | คำนวณ preview ให้ลูกค้าเห็นก่อนกดยืนยัน — **เป็นแค่ค่าที่แสดงผล ไม่ใช่ค่าที่ backend เชื่อ** |
| `handleConfirm()` | role เป็น owner (มุมมองลูกค้า) → บล็อกไม่ให้จองจริง; มิฉะนั้นปิด modal แล้วเรียก `onConfirm()` → `App.tsx` ส่ง `packageId` เข้า `POST /bookings` |

**`handleConfirm` ใน `App.tsx`**: ไม่คำนวณราคาซ้ำแล้ว (backend ทำ) แค่ประกอบ payload (`date/timeSlot/tables/guestCount/packageId/location/locationDetail/menus/lineId`) ส่งไป แล้วอัปเดต state ด้วยผลลัพธ์ที่ backend ส่งกลับ (มีราคาที่คำนวณจริงติดมา)

### 2.8 `BookingHistory.tsx`

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `filtered` | match `docNumber` หรือ `customerName` และ `status` |
| `handlePickSlip(bookingId, file)` | เรียก `pickImageAsDataUrl()` ย่อขนาด+แปลงเป็น data URL — **ยังไม่บันทึกเข้าใบจองจนกว่าจะกด "ส่งสลิป"** (`submitSlip()`) |
| Modal รายละเอียด/เอกสาร | ใช้ overlay สีทึบธรรมดา (`bg-black/60`) **ไม่มี `backdrop-blur` แล้ว** — เดิมทำให้เลื่อนหน้าจอหน่วงมากเพราะ browser ต้องคำนวณ blur ใหม่ทุกเฟรมตอน scroll |
| ปุ่ม "พิมพ์ / บันทึก PDF" | เรียก `window.print()` (CSS `print-area`/`no-print` ควบคุมสิ่งที่ซ่อนตอนพิมพ์) |

### 2.9 `Notifications.tsx`

derive จาก `bookings` จริงผ่าน `buildNotifications()` (`src/notifications.ts`) ไม่ใช่ mock array แล้ว

### 2.10 แบบร่างการจอง, แจ้งราคาเปลี่ยน, ซิงค์ตำแหน่ง

- `bookingDraft.ts`: `saveBookingDraft(shopId, booking, initial)` / `loadBookingDraft(shopId, initial)` เก็บข้อมูลที่เลือกไว้ใน sessionStorage แยกต่อร้าน (รีเฟรชแล้วไม่หาย), `firstIncompleteStep()` / `missingBookingField()` หาขั้นตอนแรกที่ข้อมูลยังไม่ครบ กันข้ามไปขั้นที่ไม่พร้อม
- `priceChange.ts`: เทียบราคา/ค่าขนส่งที่ลูกค้าเห็นระหว่างเลือกกับที่คำนวณจากค่าตั้งค่าล่าสุด ถ้าต่างกัน `Cart.tsx` แจ้งยอดที่เปลี่ยนก่อนยืนยัน
- `useLocationSync.ts`: ซิงค์ตำแหน่ง/จังหวัดที่เลือกบนแผนที่กับ state การจอง (reverse-geocode ผ่าน `geo.ts` มีแคช, retry หาจังหวัดจากหมุดถ้ายังไม่ได้)
- `PlaceSearchBox.tsx` ค้นหาสถานที่แบบ debounce (Nominatim) สำรองด้วยสถานที่ยอดนิยม และรับลิงก์ Google Maps (เรียก `GET /geo/resolve-maps-link` สำหรับลิงก์ย่อ)

### 2.11 `BookingHistory.tsx` — การชำระเงินและสลิป

แสดงเฉพาะใบจองของร้านที่เปิดอยู่ (`GET /bookings?shopId=`); ส่วนชำระมัดจำใช้ `PaymentChannels.tsx` แสดงช่องทางโอน (บัญชีธนาคารพร้อมโลโก้ `BankBadge`/พร้อมเพย์ `PromptPayQr`) ที่ลูกค้า **เลือกได้** (คีย์ `bank:<เลข>`/`pp:<เลข>` จาก `paymentChannels.ts`) — ถ้าร้านมีหลายช่องทางต้องเลือกก่อนส่งสลิป; ร้านที่ยังไม่เชื่อม SlipOK backend ส่งข้อมูลชำระเงินว่าง จึงไม่แสดงช่องทางโอน; ขั้นตอนส่งสลิป: อัปโหลดไฟล์ `POST /uploads/payment-slip` (ได้ path) แล้ว `PATCH /bookings/:id/payment-slip` พร้อม `paymentChannelKey`; ผลตรวจแสดงด้วย `SlipVerifyBadge` และ `SlipLoadStatus` (สถานะโหลดรูปสลิป); สลิปที่ตรวจผ่านแล้วเปลี่ยนไม่ได้

---

## 3. Frontend — ฝั่งเจ้าของร้าน (Owner)

### 3.1 `Dashboard.tsx`

คำนวณผ่าน `useMemo` เดียว (`stats`) จาก `bookings`; `calculateStaff(b.tables, staffRatios)` ใช้สัดส่วนจาก `settings.tablesPerServer/tablesPerSupport/staffRemainderThreshold` แทนค่าคงที่ ที่เหลือ (pctChange, กราฟ 8 เดือน, สัดส่วนแพ็กเกจ, upcoming) เหมือนเดิม — งานที่ยกเลิกไม่นับในสถิติใดๆ

### 3.2 `Orders.tsx`

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `staffRatios` | ประกอบจาก `settings.tablesPerServer/tablesPerSupport/staffRemainderThreshold` ใช้ร่วมกันทุกจุดที่เรียก `calculateStaff` ในไฟล์นี้ |
| `staffTotalOf(b)` / `openBooking` / `recalcStaff` / `saveStaff` | เหมือนเดิมแต่ส่ง `staffRatios` เข้า `calculateStaff` ทุกครั้ง |
| `staffRoles(staffRatios)` | แทน `STAFF_ROLES` คงที่เดิม — ข้อความอธิบายสัดส่วน (เช่น "1 คน ต่อ 8 โต๊ะ") อัปเดตตามค่าจริงที่ตั้งไว้ |

### 3.3 `CalendarView.tsx`

เหมือนเดิม — สรุปเดือน, คลิกวันดูรายการงาน, popup เปลี่ยนสถานะ (รวมยกเลิก) ผ่าน `onUpdateBooking`

### 3.4 `Packages.tsx`

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `newCourse(no, categoryId, categoryMap)` | รับ `categoryMap` เป็นพารามิเตอร์แทน `CATEGORY_MAP` คงที่ (เพราะประเภทอาหารแก้ไขได้แล้ว ไม่ใช่ค่าคงที่) |
| `blankCourses(categoryOrder, categories)` | สร้างข้อว่างตามประเภทอาหารที่ตั้งค่าไว้จริง (ไม่ใช่ 9 หมวดคงที่) |
| `canSave` | ต้องมีชื่อแพ็กเกจ, มีอย่างน้อย 1 ข้อ, ทุกข้อต้องมีเมนูอย่างน้อย 1 รายการ |
| `handleSave()` | ส่ง `courses` เต็มชุดไป `onCreatePackage`/`onUpdatePackage` (backend แทนที่ course ทั้งหมดถ้ามีการส่ง `courses` มา) |

### 3.5 `Menus.tsx`

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `categories = orderedCategories(settings.categoryOrder, settings.categories)`, `categoryMap = categoryMapOf(categories)` | ดึงจาก settings จริงแทนค่าคงที่ |
| `handlePickImage(file)` | เรียก `pickImageAsDataUrl()` |
| `handleSave()` | เรียก `onSaveMenu(item)` — รวม `costPrice` (ต้นทุนต่อจาน, owner เห็นเท่านั้น) |
| ลบเมนู | เตือนถ้าเมนูถูกใช้อยู่ในแพ็กเกจก่อนลบจริง |

### 3.6 `Documents.tsx`

แท็บ quotation/booking, คลิกรายการ → preview ผ่าน `BookingDocument` — ส่ง `homeProvince/freeDeliveryMinTables/quotationValidDays/quotationTerms/bookingTerms` เข้าไปด้วยแล้ว (ไม่ใช่แค่ `shopInfo`/`depositRate` เหมือนเดิม)

### 3.7 `Settings.tsx`

หน้าที่ใหญ่ที่สุดในระบบ — แบ่งเป็นการ์ดตามหมวด (ทุกการ์ดแก้ผ่าน `form` local state แล้วกด "บันทึกการตั้งค่า" ทีเดียวถึงยิง `onUpdateSettings`):

| การ์ด | ฟังก์ชันหลัก |
|---|---|
| ข้อมูลร้าน | `handlePickLogo()` อัปโหลดโลโก้ (data URL), ช่องคำโปรยหน้า Login |
| ธีมสี | `setBrandColor(hex)` — เรียก `applyBrandTheme(hex)` พรีวิวทันทีก่อนบันทึกจริง, ปุ่ม "กลับเป็นสีเริ่มต้น" |
| ข้อมูลการชำระเงิน | (เปลี่ยนแล้ว — ดูตารางใหม่ด้านล่าง ไม่มีอัปโหลด QR แล้ว) |
| ค่าขนส่ง | ช่องจังหวัดฐานร้าน (`homeProvince`), `addMetroProvince()`/`removeMetroProvince()` จัดการ chip list ของ `metroProvinces` |
| ค่าเดินทางนอกพื้นที่ | ปักหมุดพิกัดร้านบนแผนที่, ค่าน้ำมัน/กม. |
| อัตราค่าแรง | ค่าแรง 4 ตำแหน่ง + สัดส่วนคำนวณกำลังคน 3 ค่า (`tablesPerServer/tablesPerSupport/staffRemainderThreshold`) |
| ช่วงเวลาจอง | แก้เวลาของช่วงเช้า/กลางวัน/เย็น (`setSlotHours`) |
| เงื่อนไขในเอกสาร | `quotationValidDays`, `addTerm()`/`removeTerm()` จัดการ `quotationTerms`/`bookingTerms` เป็นรายการข้อความ |
| ประเภทอาหาร | `addCategory()` (สร้าง id อัตโนมัติจากชื่อ, กันชนด้วยเลขต่อท้าย), `updateCategoryField()` (แก้ไอคอน/ชื่อไทย/อังกฤษ), `removeCategory()`, `moveCategory()` (จัดลำดับ) |

`dirty` เทียบ `JSON.stringify(form)` กับ `settings` เดิมเพื่อ enable/disable ปุ่มบันทึก

**การบันทึกและการชนกัน:** `useSettingsForm.ts` ถือ `form` และส่ง `expectedVersion` ไปกับ `PATCH /settings` — ถ้า backend ตอบ 409 (มีคนบันทึกไปก่อน) ฟังก์ชันบันทึกคืน `SaveSettingsResult` ที่มีค่าล่าสุดให้หน้าจอตามทันทีและแจ้งให้ตรวจสอบก่อนบันทึกใหม่ มี guard กันกดบันทึกซ้ำระหว่างรอผล

**การ์ดที่เพิ่มหลังจากตารางข้างต้น (และที่เปลี่ยนไป):**

| การ์ด | ฟังก์ชันหลัก |
|---|---|
| ข้อมูลการชำระเงิน | บัญชีธนาคารหลัก + พร้อมเพย์หลัก และ `ExtraPaymentAccounts.tsx` เพิ่มบัญชีธนาคาร/พร้อมเพย์ได้อย่างละไม่เกิน 8 (ธนาคารเดียวกันหลายบัญชีได้) พร้อม `SuggestInput` เลือกธนาคาร; **ไม่มีอัปโหลดรูป QR แล้ว** (สร้าง QR พร้อมเพย์จากเลขเอง) มีคำเตือนให้กรอกให้ตรงกับบัญชีที่ผูกใน SlipOK |
| ตรวจสอบสลิปอัตโนมัติ (SlipOK) | ช่อง API key (ปุ่มโชว์/ซ่อน) + Branch ID, ปุ่ม "ทดสอบการเชื่อมต่อ" (`POST /settings/slipok/test`), ป้าย "เชื่อม SlipOK แล้ว", กล่อง "นำข้อมูลการเงินนี้ไปกรอกใน SlipOK ให้ตรงกัน" (แสดงบัญชีธนาคาร/พร้อมเพย์ที่ตั้งไว้ด้านบนทุกรายการ พร้อมปุ่มคัดลอก — แอปเป็นต้นฉบับ owner ไปกรอกใน SlipOK ตาม), ผู้รับล่าสุดที่ SlipOK อ่านได้จากสลิปพร้อมผลเทียบ (ไว้ตรวจว่ากรอกตรงแล้ว), วิธีขอ key |
| ค่าขนส่ง | ช่องจังหวัดฐานร้านแบบ custom autocomplete (`provinces.ts`), ปุ่ม "ตั้งจังหวัดตามตำแหน่งหมุดนี้", เตือนเมื่อหมุดร้านไม่ตรงจังหวัด |
| ค่าเดินทางนอกพื้นที่ | ค้นหาสถานที่ แตะบนแผนที่ หรือลากหมุดปรับตำแหน่งร้าน (ย้ายหมุดแล้วจังหวัดซิงค์ตามได้) |
| วันหยุดร้าน | เพิ่ม/ลบ `closedDates` (วันที่ลูกค้าจองไม่ได้) |

### 3.8 `UserRoles.tsx`

จัดการ owner ของร้านที่เปิดอยู่: โหลดรายชื่อ owner (`GET /users/owners`), ค้นหาผู้ใช้ด้วยอีเมล (`GET /users/search`) อัตโนมัติเมื่อพิมพ์ ≥ 3 ตัวอักษร (debounce 300 ms), แต่งตั้ง/ถอดด้วย `PATCH /users/:id/role` (`OWNER`/`CUSTOMER`) กันถอดตัวเอง (`currentAuth0Sub`) — backend กันเคสถอด owner คนสุดท้าย รายชื่อรีโหลดเงียบๆ เมื่อได้สัญญาณ SSE หัวข้อ `users`

### 3.9 `AuditLog.tsx`

`GET /audit-log?page=&pageSize=` (20 รายการ/หน้า): แสดงป้ายการกระทำ (เพิ่ม/แก้ไข/ลบ เมนู แพ็กเกจ ใบจอง ค่าตั้งค่า เปลี่ยนสิทธิ์) ผู้กระทำและเวลา ขยายดู diff ก่อน/หลัง (`diffCourseList`/`formatFieldValue` มีเทสต์ใน `AuditLog.test.ts`) รีเฟรชหน้าปัจจุบันเมื่อได้สัญญาณ SSE หัวข้อ `audit` — owner เห็นของร้านตัวเอง, super admin เห็นข้ามร้าน

### 3.10 `PageContent.tsx`

แก้ `homeContent` (Hero, ขั้นตอน, แกลเลอรี, CTA) พร้อมอัปโหลดรูปผ่าน `POST /uploads/content-image` (บันทึกเป็นไฟล์) แล้วบันทึกด้วย `PATCH /settings`

### 3.11 `Reports.tsx`

สรุปจำนวนงาน/รายได้/ต้นทุน/กำไร แบบรายเดือน (เลือกปี) หรือรายปี — งานที่ยกเลิกไม่นับ ใช้สูตรเดียวกับ Dashboard (`costing.ts`)

### 3.12 `SuperAdmin.tsx`

หน้าเดียวของ super admin: สร้างร้านใหม่ (`POST /shops` ชื่อร้าน + อีเมล owner), แก้ชื่อ/slug (`PATCH /shops/:id`), ระงับ/เปิดใช้งาน (`PATCH /shops/:id/status`), เพิ่ม/ถอด owner ต่อร้าน (`POST /shops/:id/owners`, `DELETE /shops/:id/owners/:userId`), แต่งตั้ง/ถอด super admin (`PATCH /users/:id/role`), การ์ดร้านแสดงจำนวน owner/ใบจอง/ยอดขายรวม, ประวัติการแก้ไขข้ามร้าน (ใช้ `AuditLog`), และลบร้านถาวร (`DELETE /shops/:id` พร้อม `confirmName`) โดยต้องพิมพ์ `Delete {ชื่อร้าน}` ให้ตรงก่อนปุ่มกดได้ — ข้อความเตือนบอกว่าข้อมูลทั้งหมดของร้านจะถูกลบถาวร

---

## 4. Frontend — Shared Components / Context

### 4.1 `BookingDocument.tsx`

Pure presentational — เรียก `bookingPricing()` คำนวณราคา, เงื่อนไขท้ายเอกสารแบ่ง 2 ชั้น: บรรทัดที่ระบบ generate เอง (ยืนราคา/มัดจำ/ค่าขนส่งตามโซนจริง ใช้ `homeProvince`/`freeDeliveryMinTables`/`quotationValidDays` ที่รับมาเป็น prop) + `quotationTerms`/`bookingTerms` ที่ map เป็น `<li>` ต่อท้าย

### 4.2 `LocationMap.tsx`

Wrapper รอบ Leaflet — สร้างแผนที่ครั้งเดียวตอน mount, ปักหมุดสีส้ม custom, `interactive` prop คุมว่าลากได้ไหม, `onPinChange(lat, lng)`, `focusKey` prop สั่ง pan/fly

### 4.3 `Navbar.tsx` (ฝั่งลูกค้า)

รับ prop เดียว (`currentScreen`) ที่เหลือ (`navigate/user/shopInfo/notifCount`) ดึงจาก `useNav()` — โลโก้แสดง `shopInfo.logo` ถ้ามี ไม่งั้น fallback ไอคอน ChefHat

### 4.4 `OwnerLayout.tsx`

รับ `currentScreen`/`bookings`/`children` ที่เหลือดึงจาก `useNav()` เช่นกัน — sidebar เมนู 9 รายการ (ไม่มี "ลูกค้า"), แจ้งเตือนคำนวณจาก `bookings` จริง, ปุ่ม "มุมมองลูกค้า" สลับไปหน้า `home` โดยไม่ logout

### 4.5 `DishTile.tsx`

ถ้า `item.image` มีค่า → แสดงรูปจริง (รองรับ `imagePosition`/`imageScale`); ถ้าไม่มี → ไอคอน/gradient จาก `categoryMap` (จาก `useNav()`) แทน `CATEGORY_MAP` คงที่เดิม

### 4.6 `NavContext.tsx`

```ts
interface NavContextValue {
  navigate: (s: Screen) => void
  user: UserProfile | null
  shopInfo: ShopInfo
  notifCount: number
  categories: Category[]        // เรียงตาม categoryOrder แล้ว
  categoryMap: Record<string, Category>
}
```

`App.tsx` เป็นคนเดียวที่สร้างค่าจริง (`useMemo`) แล้วห่อทั้งแอปด้วย `<NavProvider>` ทั้งฝั่ง owner และ customer — component ไหนต้องใช้ค่าพวกนี้เรียก `useNav()` แทนรับเป็น props (ลด prop drilling ที่เคยต้องส่งผ่านทุกชั้น)

### 4.7 `theme.ts`

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `generateShadeScale(hex)` | แปลง hex → HSL แล้วสร้างสเกล 50–900 ตามเส้นโค้งความสว่างคงที่ (เลียนแบบสเกล Tailwind) คืน `null` ถ้า hex ไม่ถูกรูปแบบ |
| `applyBrandTheme(hex)` | set CSS custom property `--color-orange-{50..900}` และ `--color-amber-{50..900}` บน `document.documentElement` — ถ้า `hex === DEFAULT_BRAND_COLOR` จะลบ property ที่เคย set ทิ้ง (กลับไปใช้ค่า native ของ Tailwind เป๊ะๆ) ใช้ได้เพราะ Tailwind v4 คอมไพล์ `.bg-orange-500` เป็น `background-color: var(--color-orange-500)` จริง — override ตรงนี้จุดเดียวก็เปลี่ยนสีทั้งแอปได้โดยไม่ต้องแก้ class ไฟล์ไหนเลย |

### 4.8 ส่วนประกอบที่เพิ่มภายหลัง

| ไฟล์ | หน้าที่ |
|---|---|
| `PaymentChannels.tsx` | ช่องทางโอนที่ลูกค้าเลือกได้ (หลายบัญชี/พร้อมเพย์) |
| `ExtraPaymentAccounts.tsx` | ฟอร์มบัญชีธนาคาร/พร้อมเพย์เพิ่มเติมของ owner |
| `BankBadge.tsx` | โลโก้ธนาคาร (`thai-banks-logo`) สำรองเป็นป้ายสีเมื่อไม่มีโลโก้ |
| `PromptPayQr.tsx` | สร้าง QR พร้อมเพย์จากเลขที่ร้านตั้งไว้ |
| `SlipVerifyBadge.tsx`, `SlipLoadStatus.tsx` | ป้ายผลตรวจสลิป / สถานะโหลดรูปสลิป |
| `ImageLightbox.tsx` | ขยายดูรูป (สลิป/เมนู) เต็มจอ |
| `SuggestInput.tsx` | ช่องกรอกพร้อมรายการแนะนำ (จังหวัด/ธนาคาร) |
| `PlaceSearchBox.tsx` | ค้นหาสถานที่ + ลิงก์ Google Maps |
| `Avatar.tsx`, `ErrorBanner.tsx`, `ErrorBoundary.tsx` | รูปผู้ใช้ / แถบแจ้งข้อผิดพลาด / กันหน้าขาว |
| `screens/owner/useStatusUpdate.tsx` | hook เปลี่ยนสถานะใบจอง แสดงสถานะกำลังเปลี่ยน/สำเร็จ/ไม่สำเร็จ (`StatusFeedbackNote`) |

---

## 5. Frontend — Core Logic / Utility Modules

### 5.1 `staffing.ts` — สูตรคำนวณพนักงาน

| ฟังก์ชัน | Signature | ตรรกะ |
|---|---|---|
| `supportStaffFor(tables, tablesPerSupport=20, remainderThreshold=10)` | คืนจำนวนคน | `max(1, floor(tables/tablesPerSupport) + (tables%tablesPerSupport > remainderThreshold ? 1 : 0))` |
| `serversFor(tables, tablesPerServer=8)` | คืนจำนวนคน | `max(1, ceil(tables/tablesPerServer))` |
| `calculateStaff(tables, ratios=DEFAULT_STAFF_RATIOS)` | `StaffRatios` = `{tablesPerServer, tablesPerSupport, staffRemainderThreshold}` | `chefs` เสมอ = 1, ที่เหลือคำนวณจาก `ratios` — ไม่ส่ง ratios มา = ใช้ค่าเริ่มต้นเดิม (กันโค้ด/เทสต์เก่าพัง) |
| `staffRoles(ratios=DEFAULT_STAFF_RATIOS)` | `StaffRoleMeta[]` | ข้อความอธิบายสัดส่วน (`rule`) generate ตาม ratios จริง แทนสตริงคงที่ |

### 5.2 `availability.ts` — คิวงาน/สถานะวัน

| ฟังก์ชัน | Signature | ตรรกะ |
|---|---|---|
| `bookableSlots(hours=DEFAULT_SLOT_HOURS)` | `(TimeSlotHours?) => TimeSlotDef[]` | คืนช่วงเวลาที่จองได้ (ไม่รวม "ทั้งวัน") พร้อมเวลาที่ตั้งค่าไว้จริง |
| `slotIdOf(timeSlot)` | parse ข้อความช่วงเวลากลับเป็นรหัส โดยดูคำว่า "ทั้งวัน"/"เช้า"/"กลางวัน"/"เย็น" ในสตริง — คงคำเดิมไว้เสมอเพราะข้อมูลใบจองเก่าอ้างอิงคำนี้ |
| `dayStatus(bookings, date)` | `'full'` ถ้ามี booking ใดๆ ในวันนั้นที่ยังกินคิวอยู่ (pending/confirmed/completed) — ตีความว่า 1 งาน = เต็มทั้งวัน (ตั้งใจคงไว้) |
| `bookingsOn(bookings, date)` | คืนใบจองของวันนั้น เรียงตามช่วงเวลา |

### 5.3 `geo.ts` — พื้นที่บริการ/ค่าขนส่ง/geocoding

| ฟังก์ชัน | Signature | ตรรกะ |
|---|---|---|
| `zoneFor(province, address='', metroProvinces=DEFAULT_METRO_PROVINCES, homeProvince=DEFAULT_HOME_PROVINCE)` | `=> ServiceZone` | จับคู่แบบ substring (case-insensitive) กับ `homeProvince` ก่อน แล้วค่อยกับรายการใน `metroProvinces`; ไม่ match เลย = `'outside'` |
| `zoneLabel(homeProvince=DEFAULT_HOME_PROVINCE)` | `=> Record<ServiceZone,string>` | แทน `ZONE_LABEL` คงที่เดิม — label ของ `home` ใส่ชื่อจังหวัดจริง |
| `checkDelivery(tables, zone, fee, minTables, outside?, homeProvince=DEFAULT_HOME_PROVINCE)` | คืน `DeliveryCheck` | ข้อความอธิบายใช้ `homeProvince` จริง |
| `outsideDeliveryFeeFor(distanceKm, fuelCostPerKm)` | ระยะทาง×2 (ไป-กลับ) × ค่าน้ำมัน/กม. |
| `routeDistanceKm(from, to)` | เรียก OSRM public server หาระยะทางถนนจริง |
| `searchPlaces`/`reverseGeocode`/`searchPresets` | เหมือนเดิม (Nominatim + preset fallback) |

### 5.4 `documents.ts` — เอกสาร/ราคา/จำนวนเงินเป็นตัวอักษร

| ฟังก์ชัน | Signature | ตรรกะ |
|---|---|---|
| `quotationValidUntil(from=now, days=DEFAULT_QUOTATION_VALID_DAYS)` | บวก `days` วันจากวันที่กำหนด | `days` มาจาก `settings.quotationValidDays` ที่ owner ตั้งได้ |
| `bookingPricing(booking, depositRate)` | เหมือนเดิม | `deposit = round(total * depositRate)` |
| `bahtText(amount)` | แปลงจำนวนเงินเป็นข้อความไทย รองรับทศนิยม (สตางค์) |
| `DEFAULT_QUOTATION_TERMS`/`DEFAULT_BOOKING_TERMS` | ค่าเริ่มต้นของเงื่อนไขเพิ่มเติม (ก่อน owner แก้) |

### 5.5 `imageUpload.ts` — ประมวลผลรูปฝั่ง client

`pickImageAsDataUrl(file, maxDimension=900)` — validate เป็นรูป, ≤8MB, ย่อขนาดผ่าน `<canvas>` ถ้าจำเป็น (เก็บ PNG ถ้าต้นฉบับ png/webp กันพื้นหลังโปร่งใสเพี้ยน มิฉะนั้น JPEG 0.82) — ใช้กับรูปเมนู, สลิปโอนเงิน, โลโก้ร้าน, QR พร้อมเพย์

### 5.6 `auth.ts` — mapping role จาก Auth0

`roleFromAuth0User(user)` อ่าน custom claim namespace `https://pipatphochana-catering.app/role` — คืน `'owner'` เฉพาะตรงเป๊ะ ค่าอื่นทั้งหมดถือเป็น `'customer'`

### 5.7 `data.ts` — ค่าเริ่มต้นและ helper ของแคตตาล็อกเมนู

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `DEFAULT_CATEGORIES` | ค่าเริ่มต้น 9 หมวด (ก่อน owner แก้) — **ไม่ใช่ค่าคงที่ตายตัวอีกต่อไป** ของจริงมาจาก `settings.categories` |
| `categoryMapOf(categories)` | สร้าง `Record<id, Category>` จาก array ที่ให้มา |
| `orderedCategories(order, categories=DEFAULT_CATEGORIES)` | เรียงตาม `order`, id ที่ตกหล่นต่อท้ายให้ |
| `requiredCourses(pkg)` / `includedItems(pkg)` | เหมือนเดิม |

### 5.8 `api.ts` — เรียก backend จริง

แปลงข้อมูลรูปแบบ backend (flat fields, status ตัวพิมพ์ใหญ่) ↔ frontend (`AppSettings`/`Booking` ที่ nested) ทุก endpoint — ฟิลด์ที่ backend อาจไม่ส่งมา (backend เก่ายังไม่ migrate) มี fallback เป็นค่า default ฝั่ง frontend เสมอ (`??`) กันหน้าเว็บพังทั้งหน้า

### 5.9 โมดูลที่เพิ่มภายหลัง

| ไฟล์ | หน้าที่ |
|---|---|
| `bookingStatus.ts` | `canChangeStatus(from, to)` สำเนาของกฎ backend ไว้ปิดปุ่มที่เปลี่ยนสถานะไม่ได้ + `STATUS_LOCKED_HINT` (backend `booking-rules.ts` เป็นตัวตัดสินจริง) |
| `bookingDraft.ts` | เก็บ/โหลดแบบร่างการจอง (sessionStorage ต่อร้าน) และหาขั้นที่ข้อมูลไม่ครบ |
| `priceChange.ts` | เทียบราคาที่เปลี่ยนก่อนยืนยันจอง |
| `paymentChannels.ts` | สร้างรายการช่องทางโอนและคีย์ `bank:`/`pp:` ให้ตรงกับ backend |
| `provinces.ts`, `thaiName.ts` | รายชื่อ/ปรับชื่อจังหวัด, จัดรูปแบบชื่อไทย |
| `costing.ts` | ต้นทุน/กำไรต่องาน (ราคาทุนเมนู + ค่าแรงตามแผนกำลังคน) |
| `homeContent.ts`, `notifications.ts` | โครงเนื้อหาหน้าแรก / สร้างรายการแจ้งเตือนจากใบจอง |
| `useBookingsStream.ts`, `useAppStream.ts`, `usePolling.ts` | SSE (`/realtime/bookings`, `/realtime/app`) ต่อ connection ใหม่ทุก 10 นาทีด้วย token สด + poll สำรอง |
| `sessionExpired.ts`, `api.ts` (`setActiveShopId`) | ตรวจ session หมดอายุแล้ว logout, ตั้ง `X-Shop-Id` ให้ทุกคำขอ |
| `geo.ts` | มีแคชผลค้นหา/ระบุที่อยู่/เส้นทางในหน้าเว็บ (`clearGeoCache` ไว้ในเทสต์) |

---

## 6. Backend — REST API (NestJS)

endpoint ส่วนใหญ่อยู่หลัง `@UseGuards(JwtAuthGuard, RolesGuard)` + `ThrottlerGuard` (global, 60 req/นาที/IP; ยกเว้น `/health` และ endpoint สาธารณะบางตัว) — `JwtAuthGuard` ตรวจ Bearer token ที่เซ็นโดย Auth0 ผ่าน JWKS; `RolesGuard` ตรวจบทบาท **จากฐานข้อมูลเสมอ** (ผ่าน `resolveShopContext` ตามร้านใน header `X-Shop-Id`, cache 5 วินาที) แล้วเทียบกับ `@Roles('customer'|'owner'|'super_admin')` (ไม่ใส่ = ผ่านได้ทุกบทบาทที่ login แล้ว) ตารางสิทธิ์รายละเอียดดู `REQUIREMENTS.md` หัวข้อ 3.4

### 6.1 `UsersController` (`/users`)

| Endpoint | บทบาท | ตรรกะ |
|---|---|---|
| `POST /users/me` | login แล้ว (throttle 20/นาที) | sync/สร้างบัญชีจาก JWT + ข้อมูลที่ frontend ส่ง (`findOrCreate` ด้วย `auth0Sub`); อีเมลใน `SUPER_ADMIN_EMAILS` ถูกตั้งเป็น SUPER_ADMIN; ชื่อ/นามสกุลจาก Google เขียนเฉพาะเมื่อช่องใน DB ว่าง (ค่าที่ผู้ใช้กรอกเองเป็นข้อมูลหลัก ไม่ถูกทับ) ส่วนอีเมล/รูปอัปเดตตาม Google ทุกครั้ง; **หลัง sync เรียก `claimOwnerInvites`:** ถ้ามีคำเชิญ (`ShopInvite`) อยู่ในระบบ ถามอีเมลจาก Auth0 `/userinfo` (`auth/userinfo.ts`) และถ้า `email_verified` ตรงกับคำเชิญ สร้าง `ShopMember` ลบคำเชิญ บันทึก audit แล้วคืน memberships ล่าสุด (ไม่มีคำเชิญเลย = ไม่เรียก Auth0) |
| `PATCH /users/me` | login แล้ว | แก้โปรไฟล์ตัวเอง (ชื่อ/นามสกุล/เบอร์/Line ID) |
| `GET /users/search?email=` | owner, super_admin | ค้นหาผู้ใช้ที่เคย login แล้วด้วยอีเมล (ไม่ต้องพิมพ์ครบ, สูงสุด 20 คน) |
| `GET /users/owners` | owner, super_admin | owner ของร้านที่เปิดอยู่ (owner) / owner ข้ามทุกร้าน 1 แถวต่อ 1 สมาชิกภาพ (super admin) |
| `PATCH /users/:id/role` | owner, super_admin | **owner:** เปลี่ยน CUSTOMER ↔ OWNER ในร้านตัวเองเท่านั้น (เพิ่ม/ลบ `ShopMember`, ต้องเหลืออย่างน้อย 1 คน, แตะ super admin ไม่ได้); **super admin:** เปลี่ยน CUSTOMER ↔ SUPER_ADMIN เท่านั้น (ตั้ง/ถอด owner ต้องทำผ่าน `/shops/:id/owners`); บันทึก audit log `user.setRole` และแจ้ง SSE หัวข้อ `users` |

### 6.1b `ShopsController` (`/shops`)

| Endpoint | บทบาท | ตรรกะ |
|---|---|---|
| `GET /shops/public`, `GET /shops/:slug/public` | ไม่ต้อง login | ร้านที่เปิดให้บริการ (ACTIVE) สำหรับหน้าเลือกร้าน/เข้าร้านด้วย slug (ค้น case-insensitive) |
| `GET /shops` | super_admin | ทุกร้านพร้อมจำนวน owner/ใบจอง ยอดขายรวม (ไม่นับใบที่ยกเลิก) และ `invites[]` (คำเชิญที่ยังไม่มีคนรับ) |
| `POST /shops` | super_admin | สร้างร้าน + `Settings` เริ่มต้นในทรานแซกชันเดียว แล้วผูก `ShopMember` ของ owner (อีเมลเคย login แล้ว) หรือสร้าง `ShopInvite` (ยังไม่เคย login) |
| `PATCH /shops/:id`, `PATCH /shops/:id/status` | super_admin | แก้ชื่อ/slug (ชื่อซิงค์ไป `Settings.shopName`), ระงับ/เปิดใช้งาน |
| `POST /shops/:id/owners`, `DELETE /shops/:id/owners/:userId` | super_admin | เพิ่ม/ถอด owner — `POST` กับอีเมลที่ยังไม่เคย login สร้างคำเชิญล่วงหน้าแทนและคืน `{ invited: true, email, shopId }` (เชิญซ้ำ → 409) |
| `DELETE /shops/:id/invites/:inviteId` | super_admin | ยกเลิกคำเชิญที่ยังไม่มีคนรับ (audit `shop.uninvite`) |
| `DELETE /shops/:id` | super_admin | ลบถาวร ต้องส่ง `confirmName` ตรงกับชื่อร้านเป๊ะ — เก็บรายการไฟล์ของร้าน ลบร้าน (cascade) แล้วลบไฟล์รูป/สลิป/โลโก้/หน้าแรกจากดิสก์ บันทึก audit `shop.delete` ด้วย `shopId = null` |


### 6.2 `BookingsController` (`/bookings`)

| Endpoint | Role | ตรรกะ |
|---|---|---|
| `GET /bookings` | login แล้ว | owner เห็นทุกใบจองของร้าน (join ข้อมูลลูกค้าปัจจุบัน), customer เห็นเฉพาะของตัวเองในร้าน `?shopId=` — รองรับ `?page=&limit=` opt-in |
| `GET /bookings/availability` | login แล้ว | คิวรับงานไม่มีข้อมูลส่วนตัว (`select` เฉพาะ date/timeSlot/tables/status) |
| `POST /bookings` | `@Roles('customer')`, throttle 10/นาที | **ปฏิเสธวันที่ย้อนหลัง (Asia/Bangkok), วันปิดร้าน, วันที่มีงานอยู่แล้ว (409);** ดึง `Package` จริงจาก `packageId` (ร้านตาม `shopId`), validate `menus` ต้องอยู่ใน courses ของแพ็กเกจนั้น, คำนวณ `pricePerTable`/`deliveryFee`/`totalPrice` เองจาก settings จริง (ไม่รับจาก client), รันใน transaction ระดับ `Serializable` + retry กันจองซ้อนวันเดียวกัน, ออกเลขที่ใบจองแบบ atomic |
| `PATCH /bookings/:id` | `@Roles('owner')` | อัปเดตสถานะ/แผนกำลังคน + บันทึก `lastEditedBy` — **ตรวจกฎเปลี่ยนสถานะ** (`isStatusTransitionAllowed` ใน `booking-rules.ts`, ผิดกฎตอบ 400) |
| `PATCH /bookings/:id/payment-slip` | `@Roles('customer')` | รับ path จาก `POST /uploads/payment-slip` (`/uploads/slips/<id>.png\|jpg\|jpeg\|webp`) + `paymentChannelKey?` (`bank:<เลข>`/`pp:<เลข>`), เช็คเจ้าของใบจอง (403), ถ้าสลิปเดิมตรวจผ่านแล้ว → 409; ร้านที่ตั้ง SlipOK: ส่งรูปตรวจ (ยอดมัดจำ, สลิปซ้ำ) เก็บผล/transRef/ผู้รับ แล้วเทียบผู้รับกับช่องทางที่เลือก (`receiver-match.ts`) |
| `GET /bookings/:id/payment-slip` | ไม่มี `@Roles` (ตรวจใน service) | ส่งไฟล์สลิป เฉพาะเจ้าของใบจองหรือ owner ร้านเดียวกัน (สลิปไม่ใช่ไฟล์สาธารณะ) |

### 6.3 `MenusController` (`/menus`)

`GET /menus` — role-aware: owner ได้ทุกฟิลด์รวม `costPrice`, customer ถูก `select` ตัด `costPrice`/`updatedAt`/`lastEditedBy` ออก — รองรับ pagination `POST/PATCH /menus` บันทึก `lastEditedBy`

### 6.4 `PackagesController` (`/packages`)

`GET /packages` — role-aware เช่นกัน (เมนูที่ซ้อนอยู่ใน `courses[].items` ก็ถูกตัด `costPrice` ออกถ้าเรียกโดย customer) — `PATCH /packages/:id` ถ้าส่ง `courses` มาจะแทนที่ทั้งชุด (ลบเก่าสร้างใหม่ในทรานแซกชันเดียว), บันทึก `lastEditedBy`; `PATCH /packages/reorder` เรียงลำดับแพ็กเกจ (`sortOrder`); `POST/PATCH/DELETE /packages/:id/courses[/:courseId]` แก้ทีละคอร์ส (owner เท่านั้น); แพ็กเกจที่ลบเป็น soft delete (`deletedAt`)

### 6.5 `SettingsController` (`/settings`)

| Endpoint | Role | ตรรกะ |
|---|---|---|
| `GET /settings/public` | ไม่ต้อง login | คืนแค่ชื่อร้าน/โลโก้/คำโปรย/สีแบรนด์ ใช้แสดงหน้า Login |
| `GET /settings` | login แล้ว | owner ได้ทุกฟิลด์; customer ถูกกรอง `wageChef/wageAssistant/wageServerPerTable/wageDishwasher/tablesPerServer/tablesPerSupport/staffRemainderThreshold` ออก (ข้อมูลต้นทุนภายใน) — **ไม่มี in-memory cache แล้ว** (เคยมีแต่เอาออกเพราะข้าม process แล้ว stale) |
| `PATCH /settings` | `@Roles('owner')` | **optimistic locking:** ต้องส่ง `expectedVersion` ถ้าไม่ตรง `version` ใน DB → 409 (log ค่าที่คาดหวัง/ปัจจุบัน) สำเร็จแล้ว `version + 1`, บันทึก `lastEditedBy`, ซิงค์ `Shop.name` เมื่อแก้ชื่อไทย, `slipOkApiKey` เข้ารหัส AES-256-GCM (`secret-box.ts`, เมื่อตั้ง `SETTINGS_ENCRYPTION_KEY`), audit log ไม่เก็บ key จริง (`***`), ลบไฟล์โลโก้/รูปหน้าแรกเก่าที่ถูกแทนที่ |
| `POST /settings/slipok/test` | `@Roles('owner')` | เช็คโควตา SlipOK ด้วย API key/Branch ID ที่ส่งมา ผ่านแล้วจดลายนิ้วมือ sha256 ของคู่นี้ (`slipOkTestedHash`, ไม่ bump `version`) |

**"เชื่อม SlipOK แล้ว"** (`slipOkConnected`) = มี key + branch และลายนิ้วมือตรงกับคู่ที่ทดสอบผ่านล่าสุด; ลูกค้าได้ข้อมูลชำระเงิน (บัญชี/พร้อมเพย์) เฉพาะเมื่อเชื่อมแล้ว และไม่เห็นค่าแรง/ข้อมูล SlipOK ใดๆ; ร้านที่มี key อยู่ก่อนถูกถือว่าเชื่อมแล้วโดย migration

### 6.5b `AuditController` (`/audit-log`) และ `RealtimeController` (`/realtime`)

- `GET /audit-log?page=&pageSize=` (owner, super_admin) — owner เห็นของร้านตัวเอง, super admin ข้ามร้าน; ทุกบริการที่แก้ข้อมูลเรียก `AuditService.log(actor, action, entityType, entityId, before, after, shopId)` ซึ่งแจ้ง SSE หัวข้อ `audit` ด้วย
- `GET /realtime/bookings` และ `GET /realtime/app` (SSE, ต้อง login; รับ token ทาง `?access_token=` ได้เฉพาะ `/realtime/*`) — ส่งแค่สัญญาณ `changed` / หัวข้อ `settings|catalog|users|audit|shop` ให้ client โหลดข้อมูลใหม่เอง ไม่ส่งข้อมูลจริง (กัน bypass การตรวจสิทธิ์)

### 6.5c `UploadsController` (`/uploads`)

throttle 10/นาที: `POST /uploads/menu-image`, `shop-logo`, `content-image` (owner) และ `payment-slip` (customer) — รับ data URL ตรวจชนิด/ขนาด ย่อด้วย `sharp` เก็บเป็นไฟล์ใน `UPLOADS_DIR` แล้วคืน path (`/uploads/...`); รูปเมนู/โลโก้/หน้าแรกเปิดเป็นไฟล์สาธารณะ ส่วนสลิปอยู่ใต้ `/uploads/slips/` และอ่านได้ผ่าน `GET /bookings/:id/payment-slip` เท่านั้น; ไฟล์เก่าถูกลบเมื่อถูกแทนที่หรือเมื่อลบร้าน

### 6.5d `HealthController` (`/health`)

`GET /health` ตอบ `{status:'ok', uptimeSeconds}` (โปรเซสทำงาน), `GET /health/ready` รัน `SELECT 1` ตอบ `{status:'ok', database:'up'}` หรือ 503 — ไม่ต้อง login ไม่ติด rate limit ใช้เป็น Healthcheck Path ของ Railway

### 6.6 `GeoController` (`/geo`)

`GET /geo/resolve-maps-link` — throttle 20/นาที, whitelist โดเมนแค่ `maps.app.goo.gl`/`goo.gl` กัน endpoint ถูกใช้เป็น open redirect resolver (SSRF)

### 6.7 Auth/infra ที่ใช้ร่วมทุก endpoint

| ไฟล์ | หน้าที่ |
|---|---|
| `jwt.strategy.ts` | verify RS256 ผ่าน JWKS ของ Auth0 tenant (cache, rate-limit 5 req/min ไปยัง Auth0) |
| `jwt.strategy.ts` (เพิ่มเติม) | ใส่ `requestedShopId` จาก header `X-Shop-Id` ลงใน user; รับ token ทาง query เฉพาะ path `/realtime/` (`extractQueryToken`) |
| `roles.guard.ts` | ตรวจบทบาทจาก DB ผ่าน `resolveShopContext` เทียบกับ `@Roles()` (cache 5 วินาที) |
| `shop-context.ts` | `resolveShopContext(prisma, auth0Sub, requestedShopId)` → SUPER_ADMIN / OWNER ของร้านนั้น (จาก `ShopMember`) / CUSTOMER |
| `current-user.decorator.ts` | `@CurrentUser()` คืน `JwtUser` (`sub`, `email`, `requestedShopId`, …) |
| `bookings/booking-rules.ts` | `ALLOWED_NEXT`/`isStatusTransitionAllowed`, `todayInBangkok`/`isPastEventDate` |
| `bookings/geo.util.ts` | โซน/ค่าขนส่ง/ระยะทางถนน OSRM จาก backend (แคช 24 ชม., User-Agent) |
| `slip-verify/` | `SlipVerifyService` (เรียก SlipOK) + `receiver-match.ts` (เทียบผู้รับรายช่องทาง ไม่รู้ผู้รับ = ไม่ปฏิเสธ) |
| `settings/secret-box.ts` | `encryptSecret`/`decryptSecret` (AES-256-GCM, กุญแจจาก `SETTINGS_ENCRYPTION_KEY`) |
| `config/required-env.ts` | `assertRequiredEnv()` ตอนเริ่ม — ขาด `DATABASE_URL`/`AUTH0_DOMAIN`/`AUTH0_AUDIENCE` ไม่เริ่ม |
| `main.ts` | `helmet`, `trust proxy` (`TRUST_PROXY`), body limit 10 MB, CORS ตาม `FRONTEND_ORIGIN`, shutdown hooks |
| `app.module.ts` | ลงทะเบียน `ThrottlerModule.forRoot()` + `APP_GUARD` = `ThrottlerGuard` แบบ global |
| `common/pagination.ts`, `common/list-query.dto.ts` | helper แบ่งหน้าแบบ opt-in ใช้ร่วมกันทุก endpoint แบบ list |

---

## 7. Backend — Data Validation (DTO) สรุป

ทุก DTO ใช้ `class-validator` + `class-transformer` ผ่าน global `ValidationPipe`

| DTO | Field และกฎ |
|---|---|
| `CreateBookingDto` | `shopId: string`, `date` (รูปแบบ `YYYY-MM-DD`), `timeSlot: string`, `tables: int 1–500`, `guestCount: int ≥1`, `packageId: string` (**ไม่มี `totalPrice`/`pricePerTable`/`deliveryFee`/`packageName` แล้ว** — backend คำนวณเอง), `location: string`, `locationDetail?: unknown`, `menus: string[]`, `lineId?: string` |
| `UpdateBookingDto` | `status?: BookingStatus`, `staffAuto/staffActual?: unknown`, `staffNote?: string` |
| `UpdatePaymentSlipDto` | `paymentSlipUrl` ต้องเป็น path จาก `POST /uploads/payment-slip` (`/uploads/slips/<id>.png\|jpg\|jpeg\|webp`, ≤ 200 ตัวอักษร), `paymentChannelKey?` รูปแบบ `bank:<เลข 4–30 หลัก>` หรือ `pp:<…>` |
| `CreateMenuItemDto`/`UpdateMenuItemDto` | เพิ่ม `costPrice?: int` จากเดิม |
| `CreatePackageDto`/`UpdatePackageDto` | เหมือนเดิม (`courses[]` พร้อม `no/title/icon/category/choose/itemIds`) |
| `CreateShopDto` / `UpdateShopDto` / `DeleteShopDto` / `SetShopStatusDto` / `AddOwnerDto` | `name` (1–100), `ownerEmail` (อีเมล), `slug?`, `confirmName` (ตรงชื่อร้าน), `status` (ACTIVE\|SUSPENDED), `email` |
| `SetRoleDto` / `SearchUsersDto` / `SyncProfileDto` / `UpdateProfileDto` | บทบาทที่แต่งตั้ง / คำค้นอีเมล / ข้อมูลโปรไฟล์ |
| `UpdateSettingsDto` | **ต้องส่ง `expectedVersion: int`**, เพิ่ม `extraBankAccounts[]`/`extraPromptPays[]` (≤ 8 รายการ, เลขบัญชี/เลขพร้อมเพย์เป็นตัวเลขล้วน — backend ตัดขีดคั่น/ช่องว่างออกให้ก่อน validate และหน้าจอรับเฉพาะตัวเลขตอนพิมพ์/วาง; ชื่อบัญชีและชื่อ-นามสกุลพร้อมเพย์รับเฉพาะตัวอักษร (ไทย/อังกฤษ รวมสระและวรรณยุกต์) กับช่องว่าง — ตัดตัวเลขและอักษรพิเศษออก ยุบช่องว่างซ้ำ (ทั้งหน้าจอและ backend)), `slipOkApiKey`/`slipOkBranchId`, `closedDates[]` และขยายจากเดิมมาก — เพิ่ม `metroProvinces[]`, `homeProvince`, `brandColor` (regex hex 6 หลัก), `tablesPerServer/tablesPerSupport/staffRemainderThreshold`, `slotMorningHours/slotNoonHours/slotEveningHours`, `quotationValidDays/quotationTerms[]/bookingTerms[]`, `categories?: unknown[]` (ไม่ deep-validate โครงสร้าง), `shopLogo/shopLoginTagline` — ทุก field ยัง optional เหมือนเดิม |

---

## หมายเหตุปิดท้าย

เอกสารนี้สะท้อนพฤติกรรมจริงของโค้ด ไม่ใช่ข้อกำหนดในอุดมคติ — จุดที่ควรระวังเมื่อนำไปพัฒนาต่อ (ดูเพิ่มเติมที่ [`REQUIREMENTS.md#9-gaps--สิ่งที่ยังไม่ได้ทำ`](./REQUIREMENTS.md#9-gaps--สิ่งที่ยังไม่ได้ทำ-จากการอ่านโค้ดปัจจุบัน)):

- `PATCH /packages/:id` แก้ `courses` ได้แล้ว แต่เป็นการแทนที่ทั้งชุด (ลบเก่า-สร้างใหม่) ไม่ใช่ patch ทีละข้อ (มี endpoint แยกสำหรับแก้ทีละ course: `POST/PATCH/DELETE /packages/:id/courses/:courseId`)
- `dayStatus()` ยังตีความว่า 1 booking = เต็มทั้งวัน ทำให้ `SLOT_CAPACITY` (500 โต๊ะ/ช่วง) ที่นิยามไว้ไม่เคยถูกใช้จำกัดจริงในทางปฏิบัติ — ตั้งใจคงไว้ตามคำขอ ไม่ใช่บั๊ก
- สลิป/รูปเมนู/โลโก้/รูปหน้าแรกเก็บเป็นไฟล์บนดิสก์ของ backend (Volume) ไม่ใช่ใน DB — ยังไม่มี object storage จริง จึงรัน backend ได้ตัวเดียว
- backend คำนวณโซน/ระยะทาง/ราคาเองทั้งหมด (OSRM จาก backend มีแคช) ถ้าเรียก OSRM ไม่ได้ตอบ 503 ไม่ fallback ไปเชื่อค่าจาก client
