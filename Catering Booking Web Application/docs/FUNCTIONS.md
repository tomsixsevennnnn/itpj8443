---
noteId: "37a3c5e08f3311f1a0b1b1af0447d59d"
tags: []
title: "Function Specification (ละเอียด) — ระบบจองแคทเธอริ่ง"

---

# Function Specification แบบละเอียด — ทั้งระบบ

> เอกสารนี้ต่อยอดจาก [`REQUIREMENTS.md`](./REQUIREMENTS.md) โดยลงรายละเอียดระดับฟังก์ชัน/เมธอดจริงที่มีอยู่ในโค้ด (พารามิเตอร์ ตรรกะ เงื่อนไข validation) ทั้งฝั่ง Frontend และ Backend ณ วันที่ 2026-08-03

---

## สารบัญ

1. [Frontend — หน้าจอ Authentication](#1-frontend--หน้าจอ-authentication)
2. [Frontend — ขั้นตอนการจอง (Customer flow)](#2-frontend--ขั้นตอนการจอง-customer-flow)
3. [Frontend — ฝั่งเจ้าของร้าน (Owner)](#3-frontend--ฝั่งเจ้าของร้าน-owner)
4. [Frontend — Shared Components](#4-frontend--shared-components)
5. [Frontend — Core Logic / Utility Modules](#5-frontend--core-logic--utility-modules)
6. [Backend — REST API (NestJS)](#6-backend--rest-api-nestjs)
7. [Backend — Data Validation (DTO) สรุป](#7-backend--data-validation-dto-สรุป)

---

## 1. Frontend — หน้าจอ Authentication

### 1.1 `Login.tsx`

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `loginAsCustomer()` | เรียก `loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } })` ของ Auth0 SDK — บังคับ redirect ไปหน้า Google login |
| `loginAsOwner()` | เรียก `loginWithRedirect({ authorizationParams: { connection: 'Username-Password-Authentication' } })` — ปุ่มลับท้ายหน้า ("เข้าระบบในฐานะเจ้าของร้าน") |

ปุ่มทั้งสองถูก disable ระหว่าง `isLoading` ของ Auth0 SDK เป็น true

### 1.2 `CompleteProfile.tsx`

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `handleSave()` | Validation: ต้องกรอก `phone` ก่อนถึงเรียก `onComplete(form)` ได้ (ปุ่มถูก disable ถ้า `form.phone` ว่าง) — `lineId` ไม่บังคับ |

Props: `name` (แสดงทักทาย), `onComplete: (profile: StoredProfile) => void` — เรียกจาก `App.tsx` เพื่อบันทึกผ่าน `saveStoredProfile()` แล้วนำทางไป `home`

### 1.3 `App.tsx` — ตรรกะควบคุมการนำทางหลัง login

| ฟังก์ชัน/ค่า | รายละเอียด |
|---|---|
| `role = roleFromAuth0User(auth0User)` | อ่าน custom claim จาก Auth0 user object → `'customer'` หรือ `'owner'` |
| `storedProfile = getStoredProfile(auth0User.sub)` | ดึงโปรไฟล์เสริม (เบอร์โทร/Line) จาก localStorage |
| `needsProfile` | `true` เมื่อ login แล้ว, เป็น customer, และยังไม่มี `storedProfile` → บังคับไปหน้า `CompleteProfile` ก่อน |
| `effectiveScreen` | ถ้า `screen === 'login'` และ login สำเร็จแล้วและไม่ต้องกรอกโปรไฟล์ → บังคับเป็น `'owner-dashboard'` (ถ้า role เป็น owner) หรือ `'home'` (ถ้าเป็น customer) |
| `navigate(s: Screen)` | ถ้า `s === 'login'` → เรียก Auth0 `logout({ logoutParams: { returnTo: window.location.origin } })` แทนการเปลี่ยนหน้า (จุดเดียวที่ผูก logout ปุ่ม "ออกจากระบบ" ทั้งแอป) มิฉะนั้น `setScreen(s)` |

---

## 2. Frontend — ขั้นตอนการจอง (Customer flow)

### 2.1 `Home.tsx`

หน้า landing แบบ static — ปุ่ม "เริ่มจองเลย" (x2) เรียก `navigate('booking-calendar')` เท่านั้น ไม่มี state หรือฟังก์ชันคำนวณ

### 2.2 `BookingCalendar.tsx` — ขั้นตอนที่ 1

| ฟังก์ชัน | Input → Output | ตรรกะ |
|---|---|---|
| `prevMonth()` / `nextMonth()` | – | เลื่อนเดือนที่แสดงในปฏิทิน, ข้ามปีอัตโนมัติเมื่ออยู่ ม.ค./ธ.ค. |
| `getAvail(day: number)` | วันที่ (ของเดือน/ปีที่กำลังดู) → `'available' \| 'full'` | เรียก `dayStatus()` จาก `availability.ts` |
| `isPast(day: number)` | วันที่ → boolean | เทียบกับเที่ยงคืนวันนี้ ใช้ปิดปุ่มวันที่ผ่านมาแล้ว |
| คลิกวันที่ในปฏิทิน | – | ถ้า `past` หรือ `avail === 'full'` → ไม่ทำอะไร (ปุ่ม disabled) มิฉะนั้น `setSelectedDate(dateKey)` และรีเซ็ต `selectedSlot` เป็น `null` |
| เลือกช่วงเวลา (`BOOKABLE_SLOTS`) | – | ต้องเลือกวันที่ก่อนถึงเลือกช่วงเวลาได้ (ปุ่มช่วงเวลาถูก disable ถ้ายังไม่เลือกวันที่) |
| `handleNext()` | – | Validation: ต้องมีทั้ง `selectedDate` และ `selectedSlot` (ปุ่ม "ถัดไป" disabled ถ้าไม่ครบ) → เรียก `onSelectDateTime(date, "${label} (${time})")` แล้ว `navigate('select-table')` |

### 2.3 `SelectTable.tsx` — ขั้นตอนที่ 2

| ฟังก์ชัน | Input → Output | ตรรกะ |
|---|---|---|
| `handleTableInput(value: string)` | ค่าจาก input (string) → เรียก `onSetTables()` | parse เป็นตัวเลข, ถ้า `NaN` ไม่ทำอะไร, มิฉะนั้น clamp เป็นช่วง **1–500** และปัดเป็นจำนวนเต็ม (`Math.floor`) |
| ปุ่ม `+` / `-` | – | เพิ่ม/ลดทีละ 1 โต๊ะ, ขอบเขต 1–500 เช่นกัน |
| `totalGuests = tables * 10` | – | คำนวณความจุที่นั่ง (1 โต๊ะ = 10 ที่นั่ง) — ใช้แสดงผลเท่านั้น (ช่องกรอกจำนวนแขกจริงถูก comment ปิดไว้ในโค้ดปัจจุบัน ไม่ได้ใช้งาน) |
| แสดงเงื่อนไขพื้นที่ | – | เทียบ `tables` กับ `freeDeliveryMinTables` (ที่ผ่านมาจาก settings) เพื่อเตือนล่วงหน้าว่างานนี้จะเข้าเงื่อนไขค่าขนส่งหรือไม่ (ตรวจจริงอีกครั้งในหน้า SelectLocation) |
| ปุ่มถัดไป | – | ไม่มีเงื่อนไขบล็อก (เปิดใช้งานเสมอ) → `navigate('select-location')` |

### 2.4 `SelectLocation.tsx` — ขั้นตอนที่ 3

| ฟังก์ชัน | Input → Output | ตรรกะ |
|---|---|---|
| `useEffect` ค้นหาแบบ debounce | `search` (string state) | debounce 600ms; ถ้าความยาว query < 2 ตัวอักษรไม่ค้นหา; เรียก `searchPlaces(q, signal)` (Nominatim) → ถ้าไม่พบผลลัพธ์หรือ error (ที่ไม่ใช่ AbortError) fallback ไปที่ `searchPresets(q)` และตั้งข้อความแจ้งเตือน |
| `applyPin(lat, lng)` | พิกัด → อัปเดต `pos`, `place` | ยกเลิก request reverse-geocode ก่อนหน้า (AbortController) แล้วเรียก `reverseGeocode()`; ถ้าสำเร็จตั้งชื่อ/ที่อยู่/จังหวัด; ถ้าไม่พบผลหรือ error ตั้งชื่อ fallback เป็น "ตำแหน่งที่ปักหมุด" พร้อมพิกัดดิบ |
| `selectResult(r: GeoResult)` | ผลค้นหา/preset ที่เลือก → อัปเดตทุก state ตำแหน่ง | ปิด dropdown ผลค้นหา, เพิ่ม `focusKey` เพื่อสั่งแผนที่ให้ pan ไปตำแหน่งใหม่ |
| `handleLocate()` | – | ใช้ `navigator.geolocation.getCurrentPosition` (timeout 10s, high accuracy); ถ้าเบราว์เซอร์ไม่รองรับ หรือถูกปฏิเสธสิทธิ์ หรือ timeout → ตั้งข้อความแจ้งเตือนตามสาเหตุ |
| `zone = zoneFor(place.province, place.address)` | – | เรียก `geo.ts` เพื่อจัดโซนบริการ |
| `check = checkDelivery(tables, zone, deliveryFee, freeDeliveryMinTables)` | – | คืนค่าค่าธรรมเนียม/สถานะบล็อก/ข้อความอธิบาย ใช้แสดงผลและควบคุมปุ่มถัดไป |
| `handleNext()` | – | Validation: บล็อกถ้า `check.blocked === true` (โต๊ะไม่ถึงขั้นต่ำนอกพื้นที่) มิฉะนั้นประกอบ `EventLocation` object (`lat, lng, name, address, province, zone, detail`) ส่งเข้า `onSetLocation()` แล้ว `navigate('select-package')` |
| ปุ่มถัดไปถูก disable เมื่อ | – | `!hasPlace` (ยังไม่มีที่อยู่) หรือ `check.blocked` |

รายละเอียดเพิ่มเติมที่กรอกได้ (`DETAIL_FIELDS`): บ้านเลขที่, อาคาร/ชั้น, หมู่บ้าน/ซอย, จุดสังเกต, รายละเอียดการเข้าถึงสถานที่ (textarea) — ไม่บังคับกรอก

### 2.5 `SelectPackage.tsx` — ขั้นตอนที่ 4

| ฟังก์ชัน | รายละเอียด |
|---|---|
| คลิกการ์ดแพ็กเกจ | เรียก `onSelectPackage(pkg)` ที่ระดับ `App.tsx`: ตั้ง `packageId/packageName/packagePrice/menuLimit`; ถ้าเปลี่ยนไปเป็นแพ็กเกจใหม่ (`packageId` ต่างจากเดิม) จะรีเซ็ต `selectedMenus` เป็นรายการที่รวมมาให้ (`includedItems(pkg)`) อัตโนมัติ, ถ้าคลิกแพ็กเกจเดิมซ้ำ selectedMenus จะไม่เปลี่ยน |
| `totalPrice = pkg.pricePerTable * tables` | แสดง preview ราคารวมต่อการ์ด (ยังไม่รวมค่าขนส่ง) |
| ปุ่มถัดไป | disabled ถ้า `!selectedPackageId` |

### 2.6 `SelectMenu.tsx` — ขั้นตอนที่ 5

| ฟังก์ชัน | Input → Output | ตรรกะ |
|---|---|---|
| `sortByCourse(items)` | เมนูที่เลือก → เรียงลำดับ | เรียงตามเลขข้อ (`course.no`) ของแพ็กเกจปัจจุบัน, รายการที่ไม่พบใน course ใดจะไปอยู่ท้ายสุด (ลำดับ 99) |
| `useEffect` เติมรายการที่รวมมาให้ | – | ทุกครั้งที่ `pkg`/`selectedIds` เปลี่ยน จะเช็คว่า `includedItems(pkg)` มีรายการที่ยังไม่อยู่ใน `selectedMenus` หรือไม่ ถ้ามีจะเพิ่มเข้าไปอัตโนมัติ (กันกรณีสลับแพ็กเกจแล้วรายการ "แถม" หาย) |
| `chooseItem(course, item)` | เลือก/ยกเลิกเมนูในข้อหนึ่ง | ถ้า `course.choose === 0` (ข้อที่รวมมาให้แล้ว) ไม่ทำอะไร (ล็อกไว้); มิฉะนั้นเอาเมนูอื่นในข้อเดียวกันออกก่อน (จำกัดเลือกได้ 1 อย่าง/ข้อ) แล้วเพิ่ม/เอาเมนูที่กดออก ถ้าเพิ่งเลือกใหม่ (ไม่ใช่ยกเลิก) จะเลื่อน active course ไปข้อถัดไปที่ยังไม่ได้เลือกอัตโนมัติ |
| `required = requiredCourses(pkg)` | – | ข้อที่ `choose > 0` (ต้องเลือกเอง) |
| `doneCount` / `allDone` | – | นับจำนวนข้อที่เลือกแล้วเทียบกับข้อที่ต้องเลือกทั้งหมด — ปุ่ม "บันทึก" ไปหน้าตะกร้าจะ disabled จนกว่า `allDone === true` |
| Progress bar | – | `doneCount / required.length * 100` |

### 2.7 `Cart.tsx` — ขั้นตอนที่ 6

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `courseOf(menuId)` | หาว่าเมนูที่เลือกอยู่ในข้อไหนของแพ็กเกจ เพื่อจัดกลุ่มแสดงผลตามลำดับเสิร์ฟ |
| `subtotal = packagePrice * tables` | ราคาค่าอาหารรวม (ไม่รวมค่าขนส่ง) |
| `deliveryFee = deliveryFeeFor(tables, location, deliveryFeeAmount, freeDeliveryMinTables)` | คำนวณค่าขนส่งจริงตามกฎโซนพื้นที่ (0 ถ้าอยู่ในพื้นที่ร้าน หรือถ้าอยู่ metro และถึงขั้นต่ำ) |
| `total = subtotal + deliveryFee` | ยอดรวมที่แสดงและใช้ยืนยันจอง |
| `handleConfirm()` | ปิด modal ยืนยัน → เรียก `onConfirm()` (สร้างใบจองจริงที่ `App.tsx`) → `navigate('history')` |
| Modal ยืนยันการจอง | แสดงสรุปสั้น (วันที่, เวลา, สถานที่, โต๊ะ, แพ็กเกจ, จำนวนเมนู, ราคารวม) ก่อนกดยืนยันจริงอีกครั้ง |

**`handleConfirm` ใน `App.tsx` (`onConfirm` prop)**: สร้าง object `Booking` ใหม่ — `id` แบบสุ่ม (`BK-2025-XXX`), คำนวณ `subtotal`/`deliveryFee`/`totalPrice` ซ้ำด้วยสูตรเดียวกับ Cart (กันไม่ให้ตัวเลขไม่ตรงกัน), สถานะเริ่มต้นเป็น `'pending'`, ที่อยู่แปลงผ่าน `formatFullAddress()`, แล้ว prepend เข้า array `bookings` และรีเซ็ต `booking` state กลับเป็นค่าเริ่มต้น (`initialBooking`)

### 2.8 `BookingHistory.tsx`

| ฟังก์ชัน | Input → Output | ตรรกะ |
|---|---|---|
| `filtered` | `search` + `statusFilter` → รายการที่กรองแล้ว | match ตาม `id` (case-insensitive) หรือ `customerName` (ตรงตัว) และ `status` |
| `openDetail(id)` / `closeDetail()` | – | เปิด/ปิด modal รายละเอียด, รีเซ็ต state ของสลิปโอนเงินทุกครั้ง |
| `handlePickSlip(bookingId, file)` | ไฟล์รูปที่เลือก → `slipDraft` | เรียก `pickImageAsDataUrl(file)` เพื่อย่อขนาด+แปลงเป็น data URL; ถ้า error (ไฟล์ไม่ใช่รูป/ใหญ่เกิน 8MB) ตั้ง `slipError`; **ยังไม่บันทึกเข้าใบจองจนกว่าจะกด "ส่งสลิป"** |
| `submitSlip()` | – | Validation: ต้องมี `slipDraft` ก่อน → เรียก `onUpdateBooking(id, { paymentSlip, paymentSlipUploadedAt: now })`, เคลียร์ draft, ตั้ง `slipSent = true` |
| ปุ่ม "ใบเสนอ" / "ใบจอง" | – | เปิด `docView` พร้อม `type: 'quotation' \| 'booking'` แสดงผ่าน `BookingDocument`, มีปุ่มสลับดูอีกฉบับของงานเดียวกันได้ในตัว modal |
| ปุ่ม "พิมพ์ / บันทึก PDF" | – | เรียก `window.print()` ตรง ๆ (CSS class `print-area`/`no-print` ควบคุมว่าอะไรถูกซ่อนตอนพิมพ์) |

### 2.9 `Notifications.tsx`

หน้าแจ้งเตือน — ข้อมูลเป็น **mock array คงที่** (`NOTIFICATIONS`) ฝังในโค้ด ไม่ได้ผูกกับ booking จริงหรือ backend ปุ่ม "อ่านทั้งหมด" ไม่มี handler (placeholder เฉย ๆ)

---

## 3. Frontend — ฝั่งเจ้าของร้าน (Owner)

### 3.1 `Dashboard.tsx`

ทั้งหมดคำนวณผ่าน `useMemo` ตัวเดียว (`stats`) จาก `bookings` ที่ได้รับมา:

| ค่าที่คำนวณ | สูตร/ตรรกะ |
|---|---|
| `active` | `bookings.filter(b => b.status !== 'cancelled')` — งานที่ยกเลิกไม่นับในสถิติใด ๆ |
| `pctChange(now, prev)` | `% เปลี่ยนแปลง = round((now - prev) / prev * 100)`; ถ้า `prev === 0` คืน `100` ถ้า `now > 0` มิฉะนั้น `null` (กันหารศูนย์) |
| `monthly` (กราฟ 8 เดือน) | สร้างช่วง 8 เดือนย้อนหลังจากเดือนปัจจุบัน แต่ละเดือนสรุป revenue/จำนวนงาน/จำนวนโต๊ะจาก `active` |
| `packages` (สัดส่วนแพ็กเกจ) | group `active` ตาม `packageName`, คิด % จากจำนวนงานทั้งหมด, เรียงมากไปน้อย |
| `upcoming` | `active` ที่ `date >= today` เรียงจากใกล้สุด, จำกัด 5 รายการ |
| `upcomingStaff` | รวมจำนวนพนักงานทั้งหมดของ `upcoming` โดยใช้ `staffActual` ถ้ามี มิฉะนั้นคำนวณสดจาก `calculateStaff(tables)` |
| `bookingChange` / `revenueChange` | `pctChange()` ของเดือนนี้เทียบเดือนก่อน (จำนวนงาน / รายได้) |

ไม่มีการเขียนข้อมูลใด ๆ ในหน้านี้ (read-only dashboard)

### 3.2 `Orders.tsx`

| ฟังก์ชัน | Input → Output | ตรรกะ |
|---|---|---|
| `filtered` | `search` → รายการที่กรอง | match `customerName` หรือ `id` (substring, case-sensitive) |
| `updateStatus(id, status)` | – | เรียก `onUpdateBooking(id, { status })` ตรง ๆ |
| `staffTotalOf(b)` | booking → จำนวนพนักงานรวม | ใช้ `b.staffActual` ถ้ามี มิฉะนั้นคำนวณจาก `calculateStaff(b.tables)` |
| `openBooking(booking)` | – | ตั้ง `selectedId`, seed `staffDraft` จาก `staffActual` หรือค่าที่คำนวณอัตโนมัติ, seed `noteDraft` จาก `staffNote` |
| `adjustStaff(key, delta)` | ตำแหน่งพนักงาน + ค่าเปลี่ยน → อัปเดต draft | ปรับ `staffDraft[key] += delta` ไม่ให้ต่ำกว่า 0 |
| `recalcStaff()` | – | รีเซ็ต `staffDraft` กลับเป็นค่าที่ระบบคำนวณจากจำนวนโต๊ะปัจจุบัน (ล้างการปรับแก้เอง) |
| `saveStaff()` | – | บันทึกทั้ง `staffAuto` (คำนวณสด ณ ตอนบันทึก), `staffActual` (draft ปัจจุบัน), `staffNote` (trim แล้ว), `staffSavedAt` (timestamp ปัจจุบัน) ผ่าน `onUpdateBooking()`; ปุ่มบันทึก disabled ถ้าไม่มีอะไรเปลี่ยน (`dirty === false`) |
| ปุ่มลัด "เสิร์ฟเต็มอัตรา" | – | ปรากฏเมื่อ `calc.serversMax > calc.serversMin` — กดแล้วตั้ง `staffDraft.servers = calc.serversMax` (ใช้อัตรา 5 โต๊ะ/คนแทน 8 โต๊ะ/คน) |
| ปุ่มสถานะ (pending/confirmed/completed) | – | เรียก `updateStatus()` ตรง ๆ ในหน้า drawer |
| Lightbox สลิป | `slipZoom` state | คลิกรูปสลิปเพื่อขยายเต็มจอ |

### 3.3 `CalendarView.tsx`

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `prevMonth()` / `nextMonth()` / `goToday()` | เปลี่ยนเดือนที่แสดง |
| สรุปเดือน (`monthBookings`, `countBy(status)`, `monthTables`, `monthRevenue`) | กรองใบจองของเดือนที่กำลังดูจาก string เดือน (`date.split('-')`), รายได้/โต๊ะไม่นับงานที่ยกเลิก |
| คลิกวันในปฏิทิน (แต่ละ cell) | แสดงรายการงานของวันนั้น (สูงสุด 3 รายการ + ตัวเลขที่เหลือ), ใช้สี badge ตามสถานะ (`BOOKING_STATUS_INFO`) และจุดสถานะคิว (`DAY_STATUS_INFO`) |
| คลิกรายการงานใน cell | เปิด popup รายละเอียด (`popupId`) พร้อมปุ่มเปลี่ยนสถานะ 4 แบบ (pending/confirmed/completed/**cancelled** — ต่างจาก Orders ที่ไม่มีปุ่มยกเลิก) ตรงจาก popup ผ่าน `onUpdateBooking(popup.id, { status })` |
| Lightbox สลิป | เหมือนกับ `Orders.tsx` |

### 3.4 `Packages.tsx`

| ฟังก์ชัน | Input → Output | ตรรกะ |
|---|---|---|
| `openAdd()` | – | เปิด modal เพิ่มแพ็กเกจใหม่ พร้อม `blankCourses()` (สร้าง 9 ข้อว่างตาม `CATEGORIES` ทั้งหมด, ค่าเริ่มต้น `choose: 1` ทุกข้อ) |
| `openEdit(pkg)` | – | clone `courses` แบบ deep-ish (`{...c, items: [...c.items]}`) เพื่อแก้ในโมดัลโดยไม่กระทบข้อมูลจริงจนกว่าจะบันทึก |
| `patchCourse(index, patch)` | แก้ field ของข้อที่ index | merge patch เข้า course นั้น |
| `toggleDish(index, dish)` | – | toggle เมนูเข้า/ออกจาก `course.items` (ใช้ `id` เทียบ) |
| `addCourse()` | – | เพิ่มข้อใหม่ท้ายสุด (ประเภทอาหารเริ่มต้น = หมวดแรก), เปิด accordion ของข้อใหม่อัตโนมัติ |
| `removeCourse(index)` | – | ลบข้อ แล้ว **re-number `no`** ของข้อที่เหลือทั้งหมดใหม่ (1..n ตามลำดับ) |
| `dishesFor(course)` | – | ปกติกรองเมนูตาม `category` ของข้อ, แต่ถ้าติ๊ก "แสดงเมนูทุกประเภท" (`showAllCats`) จะแสดงทั้งหมด — เมนูที่เลือกไว้แล้วจะแสดงเสมอไม่ว่าจะตรงหมวดหรือไม่ |
| `canSave` | – | ต้องมีชื่อแพ็กเกจ, มีอย่างน้อย 1 ข้อ, และ**ทุกข้อต้องมีเมนูอย่างน้อย 1 รายการ** (`emptyCourses.length === 0`) — ปุ่มบันทึกและช่อง input แสดง error ถ้าไม่ผ่าน |
| `handleSave()` | – | Renumber `courses` ใหม่ตามลำดับ, ตั้ง `menuLimit = courses.length`; ถ้าแก้ไขของเดิม → merge เข้า package ที่มี id ตรงกัน; ถ้าเพิ่มใหม่ → สร้าง id `pkg-${timestamp}`, ใส่ `features: ['บริการเสิร์ฟ']` เป็นค่าเริ่มต้นคงที่ |
| `handleDelete(id)` | – | ลบแพ็กเกจออกจาก array ตรง ๆ (ไม่มี confirm dialog ในหน้านี้ ต่างจาก Menus) |

### 3.5 `Menus.tsx`

| ฟังก์ชัน | Input → Output | ตรรกะ |
|---|---|---|
| `handlePickImage(file)` | ไฟล์ → `form.image` (data URL) | เรียก `pickImageAsDataUrl()`; error (ไม่ใช่รูป/เกิน 8MB) แสดงใน `imageError` |
| `usageOf(id)` | menuId → รายชื่อแพ็กเกจที่ใช้เมนูนี้ | ค้นทุก `packages[].courses[].items` ที่มี id ตรงกัน |
| `canSave` | – | ต้องมีชื่อเมนู (trim แล้วไม่ว่าง) |
| `handleSave()` | – | ถ้าแก้ไข: ใช้ `id` เดิม, คง `active` เดิม; ถ้าเพิ่มใหม่: สร้าง id `menu-${timestamp}`, `active: true`; `extraPrice`/`image` ใส่เฉพาะเมื่อมีค่า > 0 / ไม่ว่าง — เรียก `onSaveMenu(item)` (ที่ `App.tsx` จะ sync เข้าไปในทุกแพ็กเกจที่ใช้เมนูนี้อยู่ด้วย) |
| `toggleActive(item)` | – | สลับ `active` ระหว่าง true/false (เปิด/ปิดการแสดงเมนูฝั่งลูกค้า) โดยไม่ลบข้อมูล |
| ลบเมนู (`confirmDelete` → `onDeleteMenu`) | – | ต้องกดยืนยันใน modal ก่อน; ข้อความเตือนจะบอกจำนวนแพ็กเกจที่ใช้เมนูนี้อยู่ถ้ามี — ลบแล้ว `App.tsx` จะถอดเมนูออกจากทุก course ที่ใช้อยู่ด้วย |

### 3.6 `Documents.tsx`

| ฟังก์ชัน | รายละเอียด |
|---|---|
| แท็บ `quotation` / `booking` | สลับดูรายการเอกสารประเภทใด, ใช้ label จาก `DOC_LABEL` |
| `filtered` | ค้นหาใบจองจาก `customerName` หรือ `id` |
| คลิกรายการ | ตั้ง `previewBooking` → แสดง `BookingDocument` ที่ panel ขวา |
| ปุ่มพิมพ์ (ในลิสต์) | ตั้ง `previewBooking` แล้ว `setTimeout(() => window.print(), 100)` — หน่วงเล็กน้อยให้ preview render ก่อนสั่งพิมพ์ |
| ปุ่มพิมพ์ (ใน preview) | เรียก `window.print()` ทันที |

### 3.7 `Customers.tsx`

| ฟังก์ชัน | Input → Output | ตรรกะ |
|---|---|---|
| `groupByCustomer(bookings)` | รายการใบจอง → `CustomerSummary[]` | key = `phone` ถ้ามีและไม่ใช่ `'—'` มิฉะนั้น key = `name:${customerName}`; รวม `bookings[]`, `totalSpent` (ไม่นับงานยกเลิก), `lastDate` (ล่าสุด) ต่อกลุ่ม; ผลลัพธ์เรียงตาม `lastDate` ใหม่สุดก่อน |
| `filtered` | `search` → รายชื่อลูกค้าที่กรอง | match `name` หรือ `phone` |
| สรุปด้านบน | – | จำนวนลูกค้าทั้งหมด, จำนวนลูกค้าที่จอง > 1 ครั้ง, ยอดใช้จ่ายรวมทั้งหมด |
| คลิกแถวลูกค้า | – | เปิด modal แสดงประวัติการจองทั้งหมดของลูกค้านั้น เรียงวันที่ล่าสุดก่อน |

หน้านี้เป็น **read-only** ทั้งหมด (ไม่มีฟังก์ชันแก้ไข/ลบลูกค้า เพราะไม่มีระบบสมาชิกแยก)

### 3.8 `Settings.tsx`

| ฟังก์ชัน | Input → Output | ตรรกะ |
|---|---|---|
| `setShopField(key, value)` | field ของ `shopInfo` → อัปเดต local `form` | แก้ค่าใน `form.shopInfo`, เคลียร์ `savedAt` (แสดงว่ายังไม่ได้บันทึกค่าล่าสุด) |
| `setNumberField(key, value)` | `depositRate` / `deliveryFee` / `freeDeliveryMinTables` → อัปเดต local `form` | เช่นเดียวกัน |
| ช่อง "อัตรามัดจำ" | รับค่าเป็น % (0–100) แล้วแปลงเป็นเศษส่วน 0–1 ก่อนเก็บ (`pct / 100`), clamp 0–100 |
| ช่อง "ค่าขนส่ง" | clamp ≥ 0 |
| ช่อง "จำนวนโต๊ะขั้นต่ำ" | clamp ≥ 1 |
| `dirty` | – | เทียบ `JSON.stringify(form)` กับ `settings` เดิม — ปุ่มบันทึกจะ disabled ถ้าไม่มีอะไรเปลี่ยน |
| `handleSave()` | – | เรียก `onUpdateSettings(form)` (merge เข้า `AppSettings` state กลาง) แล้วตั้ง `savedAt = Date.now()` เพื่อโชว์ข้อความ "บันทึกแล้ว" |

---

## 4. Frontend — Shared Components

### 4.1 `BookingDocument.tsx`

ฟังก์ชันหลักคือ render เอกสารตาม props `booking` + `type` (`'quotation' | 'booking'`) — ไม่มี state ภายใน (pure presentational)

- เรียก `bookingPricing(booking, depositRate)` เพื่อคำนวณ `pricePerTable`, `subtotal`, `deliveryFee`, `total`, `deposit`, `remaining`
- แสดงหัวเอกสารต่างกันตาม `type`: quotation แสดง "ยืนราคาถึง [วันที่]" (`quotationValidUntil()`), booking แสดงสถานะงานปัจจุบัน
- ตารางรายการ: บรรทัดค่าแพ็กเกจ (จำนวนโต๊ะ × ราคา/โต๊ะ) + บรรทัดค่าขนส่ง (ถ้ามี `deliveryFee > 0`)
- แสดง `bahtText(total)` (จำนวนเงินเป็นตัวอักษรภาษาไทย) กำกับใต้ยอดรวม
- เงื่อนไขท้ายเอกสารต่างกันตาม `type` ตามที่สรุปไว้ในหัวข้อ 5.4 ของ `REQUIREMENTS.md`
- ส่วนลายเซ็น "ผู้สั่งจอง" / "ผู้รับจอง" คงที่ทุกเอกสาร

### 4.2 `LocationMap.tsx`

Wrapper รอบ Leaflet map:

| ฟังก์ชัน/พฤติกรรม | รายละเอียด |
|---|---|
| สร้างแผนที่ครั้งเดียวตอน mount | ตำแหน่งเริ่มต้นอ่านจาก `position` prop ณ ตอน mount เท่านั้น (ไม่ re-create เมื่อ prop เปลี่ยนภายหลัง) |
| ปักหมุดสีส้มแบบ custom HTML | เลี่ยงปัญหารูป marker default ของ Leaflet ที่ bundler มักหาไฟล์ไม่เจอ |
| `interactive` prop (default true) | `false` = แผนที่แสดงอย่างเดียว ปักหมุด/ลากไม่ได้ (ใช้ในหน้าฝั่งเจ้าของร้านและใน Cart summary) |
| ลากหมุด / คลิกแผนที่ (เมื่อ interactive) | เรียก `onPinChange(lat, lng)` กลับไปยัง parent |
| `focusKey` prop | เพิ่มค่านี้เพื่อสั่งให้แผนที่ pan/fly ไปตำแหน่งใหม่ (เช่น หลังค้นหาหรือกด GPS) — ตั้งใจไม่ผูกกับ `position` โดยตรงเพื่อไม่ให้บินทุกครั้งที่ตำแหน่งขยับเล็กน้อย |
| Resize observer หลัง mount | บังคับ Leaflet วัดขนาด container ใหม่ (กันปัญหาแผนที่เพี้ยนเมื่อ container ยังไม่นิ่ง ณ ตอนสร้าง) |

### 4.3 `Navbar.tsx` (ฝั่งลูกค้า)

- แสดงเมนู "หน้าแรก" / "ประวัติการจอง" (desktop) และ bottom nav 4 ปุ่มบนมือถือ (หน้าแรก/ประวัติ/แจ้งเตือน/โปรไฟล์ — ปุ่มโปรไฟล์ปัจจุบัน `navigate` ไปหน้าแรกเช่นกัน ยังไม่มีหน้าโปรไฟล์แยก)
- ปุ่มกระดิ่งแจ้งเตือน: แสดง badge ตัวเลข `notifCount` (default = 2, เป็นค่าคงที่ไม่ผูกกับข้อมูลจริง)
- ปุ่ม logout: เรียก `navigate('login')` ซึ่งจะไปเข้าเงื่อนไข logout จริงที่ `App.tsx`

### 4.4 `OwnerLayout.tsx`

- Sidebar เมนู 8 รายการ (`sidebarItems`) ตรงกับ `OWNER_SCREENS` ทั้งหมดใน `App.tsx`
- Top bar: หัวข้อหน้าปัจจุบัน (auto จาก `sidebarItems.find(i => i.screen === currentScreen)`), ปุ่มกระดิ่ง (static badge เลข 3, ไม่มี handler จริง), ปุ่ม "มุมมองลูกค้า" (`navigate('home')` — สลับไปมุมมองฝั่งลูกค้าโดยไม่ logout)
- ปุ่ม logout ที่มุมล่าง sidebar: เรียก `navigate('login')` เช่นเดียวกับฝั่งลูกค้า

### 4.5 `DishTile.tsx`

Presentational: ถ้า `item.image` มีค่า → แสดงรูปจริง; ถ้าไม่มี → แสดง gradient พื้นหลัง + emoji ตามหมวดอาหาร (`category` prop override ได้ ใช้กรณีเมนูเดียวกันถูกจัดอยู่ในข้อที่ต่างหมวด เช่น "สี่สีมังกรทอด" อยู่ในข้อจานหลัก)

---

## 5. Frontend — Core Logic / Utility Modules

### 5.1 `staffing.ts` — สูตรคำนวณพนักงาน

| ฟังก์ชัน | Signature | ตรรกะ |
|---|---|---|
| `supportStaffFor(tables)` | `(number) => number` | `Math.max(1, floor(tables/20) + (tables%20 > 10 ? 1 : 0))` — ใช้กับผู้ช่วยพ่อครัวและพนักงานล้างจาน |
| `serversFor(tables, tablesPerServer=8)` | `(number, number?) => number` | `Math.max(1, ceil(tables / tablesPerServer))` |
| `sumStaff(plan)` | `(StaffPlan) => number` | รวม servers+chefs+assistants+dishwashers |
| `calculateStaff(tables)` | `(number) => StaffCalculation` | คำนวณ plan เต็ม: `chefs` เสมอ = 1; คืน `serversMin` (อัตรา 8 โต๊ะ/คน) และ `serversMax` (อัตรา 5 โต๊ะ/คน) เป็นช่วงแนะนำ |
| `toPlan(calc)` | แปลง `StaffCalculation` → `StaffPlan` (ตัด field total/serversMin/serversMax ออก) |
| `isSamePlan(a, b)` | เทียบ 4 field ทีละตัว |

### 5.2 `availability.ts` — คิวงาน/สถานะวัน

| ฟังก์ชัน | Signature | ตรรกะ |
|---|---|---|
| `slotIdOf(timeSlot)` | `(string) => SlotId` | parse ข้อความช่วงเวลากลับเป็นรหัส โดยดูคำว่า "ทั้งวัน"/"เช้า"/"กลางวัน"/"เย็น" ในสตริง — ไม่ match อะไรเลย fallback เป็น `'allday'` |
| `slotUsage(bookings, date)` | `(Booking[], string) => SlotUsage` | รวมจำนวนโต๊ะที่จองแล้วต่อช่วงเวลาของวันนั้น (เฉพาะสถานะที่ยังกินคิว: pending/confirmed/completed); ถ้า booking เป็น `'allday'` จะบวกเข้าทั้ง 3 ช่วง |
| `remainingFor(bookings, date, slot)` | `(Booking[], string, SlotId) => number` | `SLOT_CAPACITY (500) - usage` (ถ้าเป็น allday ใช้ค่ามากสุดใน 3 ช่วง) |
| `dayStatus(bookings, date)` | `(Booking[], string) => 'available' \| 'full'` | `'full'` ถ้ามี booking ใดๆ (ไม่ว่าช่วงเวลาไหน) ในวันนั้นที่ยังกินคิวอยู่ — **ตีความว่า 1 งาน = เต็มทั้งวัน ไม่สนใจ `SLOT_CAPACITY`** |
| `bookingsOn(bookings, date)` | คืนใบจองของวันนั้น เรียงตามช่วงเวลา (เช้า→กลางวัน→เย็น→ทั้งวัน) |
| `toDateKey(year, month, day)` | สร้าง string `YYYY-MM-DD` (month เป็น 0-indexed ตาม JS Date) |

### 5.3 `geo.ts` — พื้นที่บริการ/ค่าขนส่ง/geocoding

| ฟังก์ชัน | Signature | ตรรกะ |
|---|---|---|
| `zoneFor(province, address='')` | `(string, string?) => ServiceZone` | ตรวจ regex ชื่อจังหวัด/กรุงเทพฯ ก่อนจาก `province` ถ้าไม่ match ลองจาก `address` เต็ม ไม่ match เลย = `'outside'` |
| `deliveryFeeFor(tables, location, fee, minTables)` | คืนค่าธรรมเนียม (0 หรือ `fee`) — คิดค่าขนส่งเฉพาะ `zone === 'metro'` และ `tables < minTables` |
| `checkDelivery(tables, zone, fee, minTables)` | คืน `DeliveryCheck` (`fee, blocked, tone, title, detail`) — `home` เสมอ ok ไม่บล็อก; `metro` ไม่เคยบล็อก (แค่มี/ไม่มีค่าขนส่ง); `outside` **บล็อกถ้า `tables < minTables`** |
| `formatFullAddress(loc)` | รวม `houseNo/building/village` + `address` + `(จุดสังเกต: landmark)` เป็นบรรทัดเดียว |
| `searchPlaces(query, signal?)` | เรียก Nominatim `/search` (จำกัดประเทศไทย, ภาษาไทย, สูงสุด 6 ผลลัพธ์) — throw ถ้า response ไม่ ok |
| `reverseGeocode(lat, lng, signal?)` | เรียก Nominatim `/reverse` — คืน `null` ถ้า response มี `error` หรือไม่มี `display_name` |
| `searchPresets(query)` | ค้นหาใน `PRESET_LOCATIONS` (6 สถานที่ยอดนิยม hardcode) แบบ case-insensitive substring บนชื่อ/ที่อยู่ |

### 5.4 `documents.ts` — เอกสาร/ราคา/จำนวนเงินเป็นตัวอักษร

| ฟังก์ชัน | Signature | ตรรกะ |
|---|---|---|
| `docNumber(booking, type)` | `type==='quotation'` → `QT-` + ส่วนหลังของ booking id (ตัด prefix เดิมออกแล้วต่อใหม่); `type==='booking'` → ใช้ `booking.id` ตรงๆ |
| `quotationValidUntil(from=now)` | บวก 7 วันจากวันที่ที่กำหนด คืนเป็น ISO date string (10 ตัวอักษร) |
| `bookingPricing(booking, depositRate)` | `deliveryFee = booking.deliveryFee ?? 0`; `subtotal = totalPrice - deliveryFee`; `pricePerTable = booking.pricePerTable ?? round(subtotal / max(1, tables))` (fallback คำนวณย้อนกลับถ้าไม่มีค่าบันทึกไว้); `deposit = round(total * depositRate)`; `remaining = total - deposit` |
| `bahtText(amount)` | แปลงจำนวนเงินเป็นข้อความไทย (หน่วยสิบ/ร้อย/พัน/หมื่น/แสน/ล้าน, จัดการกรณีพิเศษ "เอ็ด"/"ยี่สิบ"), รองรับทศนิยม (สตางค์), ปัดเงินเป็น 2 ตำแหน่งทศนิยมก่อนแปลง |

### 5.5 `imageUpload.ts` — ประมวลผลรูปฝั่ง client

| ฟังก์ชัน | Signature | ตรรกะ |
|---|---|---|
| `pickImageAsDataUrl(file, maxDimension=900)` | `(File, number?) => Promise<string>` | Validation: throw ถ้า `file.type` ไม่ขึ้นต้นด้วย `image/`, หรือขนาดไฟล์ > 8MB (`MAX_UPLOAD_BYTES`); อ่านเป็น data URL แล้วโหลดเป็น `Image`; ถ้ารูปเล็กกว่า `maxDimension` อยู่แล้ว **และ** ไฟล์ ≤ 400KB ใช้ไฟล์ต้นฉบับได้เลย (ไม่ประมวลผลซ้ำ); มิฉะนั้นวาดลง `<canvas>` ที่ย่อขนาดตามสัดส่วน (`scale = min(1, maxDimension/max(width,height))`) แล้ว export กลับเป็น data URL — เก็บเป็น PNG ถ้าไฟล์ต้นฉบับเป็น png/webp (กันพื้นหลังโปร่งใสกลายเป็นดำ) มิฉะนั้นเป็น JPEG คุณภาพ 0.82 |

ใช้ทั้งกับรูปเมนู (`Menus.tsx`) และสลิปโอนเงิน (`BookingHistory.tsx`)

### 5.6 `profileStore.ts` — เก็บโปรไฟล์เสริมใน localStorage

| ฟังก์ชัน | Signature | ตรรกะ |
|---|---|---|
| `getStoredProfile(sub)` | `(string) => StoredProfile \| null` | อ่าน key `catering:profile:${sub}` จาก localStorage แล้ว `JSON.parse`; คืน `null` ถ้าไม่มีหรือ parse ไม่สำเร็จ |
| `saveStoredProfile(sub, profile)` | `(string, StoredProfile) => void` | เขียนทับ key เดิมด้วย `JSON.stringify(profile)` |

### 5.7 `auth.ts` — mapping role จาก Auth0

| ฟังก์ชัน/ค่า | รายละเอียด |
|---|---|
| `AUTH0_ROLE_CLAIM` | ชื่อ namespace ของ custom claim ต้องตรงกับที่ Auth0 Action ฝังไว้ |
| `AUTH0_CONNECTION` | mapping `customer → google-oauth2`, `owner → Username-Password-Authentication` |
| `roleFromAuth0User(user)` | `(Record<string, unknown> \| undefined) => 'customer' \| 'owner'` — คืน `'owner'` เฉพาะเมื่อ claim ตรงกับ `'owner'` เป๊ะ ค่าอื่นทั้งหมด (รวมถึง `undefined`) ถือเป็น `'customer'` |

### 5.8 `data.ts` — ค่าคงที่และ helper ของแคตตาล็อกเมนู

| ฟังก์ชัน | รายละเอียด |
|---|---|
| `CATEGORIES` / `CATEGORY_MAP` | 9 หมวดอาหารคงที่ (ของทานเล่น, ออเดิร์ฟ, ซุป, ยำ/สลัด, จานหลักเนื้อสัตว์, ปลา, ข้าว/เส้น, ต้ม/หม้อไฟ, ของหวาน) ใช้กำหนดลำดับ "ข้อ" มาตรฐานของโต๊ะจีน |
| `requiredCourses(pkg)` | คืนข้อที่ `choose > 0` (ลูกค้าต้องเลือกเอง) |
| `includedItems(pkg)` | คืนเมนูทั้งหมดในข้อที่ `choose === 0` (flat array, รวมมาให้อัตโนมัติ) |
| `PACKAGES`, `MENU_ITEMS`, `MOCK_BOOKINGS` | ข้อมูลตัวอย่าง/เริ่มต้นของทั้งระบบ (ยังไม่ผูกกับ backend จริง ตามที่ระบุใน gap ของ `REQUIREMENTS.md`) — วันที่ของ `MOCK_BOOKINGS` คำนวณสัมพัทธ์กับวันปัจจุบันเสมอ (`dateFromToday(offsetDays)`) เพื่อให้ตัวอย่างขึ้นบนปฏิทินได้ไม่ว่าจะเปิดใช้วันไหน |

---

## 6. Backend — REST API (NestJS)

ทุก endpoint อยู่หลัง `@UseGuards(JwtAuthGuard, RolesGuard)` (ยกเว้น `UsersController` ที่มีแค่ `JwtAuthGuard`) — `JwtAuthGuard` ตรวจสอบว่ามี Bearer token ที่ valid (เซ็นโดย Auth0, ตรวจผ่าน JWKS); `RolesGuard` เช็คว่า custom claim role ตรงกับที่ `@Roles(...)` ระบุไว้ (ไม่ใส่ `@Roles` = ผ่านได้ทุก role ที่ login แล้ว)

### 6.1 `UsersController` (`/users`)

| Endpoint | Guard/Role | ฟังก์ชัน service | ตรรกะ |
|---|---|---|---|
| `GET /users/me` | login แล้วเท่านั้น | `UsersService.findOrCreate(profile)` | อ่าน role จาก JWT claim (`owner`/`customer`); ถ้ามี `User` ที่ `auth0Sub` ตรงอยู่แล้ว **คืนของเดิมไม่แก้ไข** (ไม่ sync ชื่อ/รูปที่เปลี่ยนจาก Auth0 ภายหลัง); ถ้าไม่มีสร้างใหม่ด้วยข้อมูลจาก JWT (`given_name`/`name`, `family_name`, `email`, `picture`) |
| `PATCH /users/me` | login แล้วเท่านั้น | `UsersService.updateProfile(auth0Sub, dto)` | อัปเดต field ตาม `UpdateProfileDto` (เบอร์โทร/Line ID ที่ Auth0 ไม่มี) โดย `where: { auth0Sub }` |

### 6.2 `BookingsController` (`/bookings`)

| Endpoint | Guard/Role | ฟังก์ชัน service | ตรรกะ |
|---|---|---|---|
| `GET /bookings` | login แล้ว (ไม่จำกัด role เฉพาะ แต่ผลต่างกันตาม role) | `findAllForOwner()` หรือ `findAllForCustomer(userId)` | ถ้า JWT role = owner → คืนทุกใบจอง (`orderBy: createdAt desc`); ถ้าเป็น customer → sync/หา user record ก่อน (`syncCustomer`) แล้วคืนเฉพาะที่ `customerId` ตรงกับตัวเอง |
| `POST /bookings` | `@Roles('customer')` | `create(customerId, customerName, phone, dto)` | sync user ก่อนเสมอ (`syncCustomer`), ใช้ `customerName`/`phone` จาก user record ที่ sync มา (ไม่รับจาก request body); สร้าง booking ด้วยค่าที่ client ส่งมาผ่าน `CreateBookingDto` (ดูหัวข้อ 7) |
| `PATCH /bookings/:id` | `@Roles('owner')` | `updateAsOwner(id, dto)` | เช็คว่ามี booking นั้นจริงก่อน (`assertExists` → 404 ถ้าไม่พบ); อัปเดตเฉพาะ `status`, `staffActual`, `staffNote`; **ถ้ามี `staffActual` ส่งมาจะเซ็ต `staffSavedAt = now` อัตโนมัติ** |
| `PATCH /bookings/:id/payment-slip` | `@Roles('customer')` | `updatePaymentSlipAsCustomer(id, customerId, url)` | sync user ก่อน, เช็คว่า booking มีอยู่จริง (404) และ **`booking.customerId` ต้องตรงกับผู้เรียก** มิฉะนั้น throw `403 ForbiddenException` ("ไม่มีสิทธิ์แก้ไขใบจองนี้"); อัปเดต `paymentSlipUrl` + `paymentSlipUploadedAt = now` |
| `syncCustomer(jwtUser)` (private) | – | `UsersService.findOrCreate(...)` | helper ใช้ร่วมกันใน `create` และ `uploadSlip` — บังคับ role เป็น `CUSTOMER` เสมอไม่ว่า JWT จะมี claim อะไร |

### 6.3 `MenusController` (`/menus`)

| Endpoint | Guard/Role | ฟังก์ชัน service | ตรรกะ |
|---|---|---|---|
| `GET /menus` | login แล้ว (ทุก role) | `findAll()` | คืนทั้งหมด เรียงตามชื่อ (`orderBy: name asc`) — **ไม่กรอง `active`** (ฝั่ง frontend ต้องกรองเองถ้าต้องการซ่อนเมนูที่ปิดใช้งาน) |
| `POST /menus` | `@Roles('owner')` | `create(dto)` | สร้างตรงจาก `CreateMenuItemDto` |
| `PATCH /menus/:id` | `@Roles('owner')` | `update(id, dto)` | อัปเดตตาม `UpdateMenuItemDto` (partial) |
| `DELETE /menus/:id` | `@Roles('owner')` | `remove(id)` | ลบ — ความสัมพันธ์ many-to-many กับ `PackageCourse` (ผ่าน `CourseItems`) จะถูก Prisma ตัดออกอัตโนมัติ ไม่ต้องลบ manual |

### 6.4 `PackagesController` (`/packages`)

| Endpoint | Guard/Role | ฟังก์ชัน service | ตรรกะ |
|---|---|---|---|
| `GET /packages` | login แล้ว (ทุก role) | `findAll()` | คืนพร้อม `courses` (เรียงตาม `no`) และ `items` ของแต่ละ course (nested include) |
| `POST /packages` | `@Roles('owner')` | `create(dto)` | สร้าง `Package` พร้อม `PackageCourse` ซ้อนในคำสั่งเดียว (`create` nested); แต่ละ course เชื่อมกับเมนูที่มีอยู่แล้วผ่าน `connect: itemIds.map(id => ({id}))` (ไม่ได้สร้างเมนูใหม่ตรงนี้); `description`/`features` มีค่า default ว่างถ้าไม่ส่งมา |
| `PATCH /packages/:id` | `@Roles('owner')` | `update(id, dto)` | อัปเดตเฉพาะ field ระดับ `Package` เอง (**ไม่รองรับแก้ `courses` ผ่าน endpoint นี้** — ต้องมี endpoint แยกหรือแก้ผ่าน Prisma Studio/migration เพิ่มถ้าต้องการ) |
| `DELETE /packages/:id` | `@Roles('owner')` | `remove(id)` | ลบ package (cascade ลบ `PackageCourse` ที่เกี่ยวข้องตาม `onDelete: Cascade` ใน schema) |

### 6.5 `SettingsController` (`/settings`)

| Endpoint | Guard/Role | ฟังก์ชัน service | ตรรกะ |
|---|---|---|---|
| `GET /settings` | login แล้ว (ทุก role) | `get()` | อ่านแถว `id=1`; **ถ้ายังไม่มีแถวจะสร้างด้วยค่า `DEFAULT_SETTINGS` ให้อัตโนมัติ** (lazy-init แบบ singleton row) |
| `PATCH /settings` | `@Roles('owner')` | `update(dto)` | เรียก `get()` ก่อนเพื่อรับประกันว่าแถว `id=1` มีอยู่แล้ว จากนั้น `update` ด้วย field ที่ส่งมา (partial) |

### 6.6 Auth infrastructure (ใช้ร่วมทุก endpoint)

| ไฟล์ | ฟังก์ชัน |
|---|---|
| `jwt.strategy.ts` | `JwtStrategy.validate(payload)` — คืน payload ทั้งก้อนเป็น `request.user` (ไม่แปลง/กรองอะไร); การยืนยันลายเซ็น RS256 ทำโดย `passport-jwt` + `jwks-rsa` ก่อนถึงจุดนี้ (cache JWKS, rate-limit 5 req/min) |
| `roles.guard.ts` | `RolesGuard.canActivate()` — อ่าน metadata จาก `@Roles()` (ผ่าน `Reflector`, รวมทั้งระดับ method และ class); ถ้าไม่ได้ประกาศ roles ผ่านเลย; มิฉะนั้นเทียบ `AUTH0_ROLE_CLAIM` ใน JWT กับ role ที่อนุญาต, ไม่ตรง throw `403 ForbiddenException` |
| `roles.decorator.ts` | `@Roles(...roles)` — เก็บ metadata ผ่าน `SetMetadata(ROLES_KEY, roles)` |
| `current-user.decorator.ts` | `@CurrentUser()` — param decorator ดึง `request.user` (payload ของ JWT) มาใช้ในสวยงาม |

---

## 7. Backend — Data Validation (DTO) สรุป

ทุก DTO ใช้ `class-validator` + `class-transformer` (ผ่าน global `ValidationPipe` ที่ตั้งใน `main.ts`)

| DTO | Field และกฎ |
|---|---|
| `CreateBookingDto` | `date: string`, `timeSlot: string`, `tables: int ≥1`, `guestCount: int ≥1`, `packageName: string`, `totalPrice: int ≥0`, `pricePerTable?: int`, `deliveryFee?: int`, `location: string`, `locationDetail?: unknown` (ไม่ validate โครงสร้างภายใน), `menus: string[]` |
| `UpdateBookingDto` | `status?: BookingStatus` (enum: PENDING/CONFIRMED/COMPLETED/CANCELLED), `staffActual?: unknown`, `staffNote?: string` — ทุก field optional |
| `UpdatePaymentSlipDto` | (ไม่ได้เปิดอ่านในรอบนี้ แต่ใช้ใน controller เป็น `{ paymentSlipUrl: string }`) |
| `UpdateProfileDto` | field โปรไฟล์ optional (เบอร์โทร/Line ฯลฯ) |
| `CreateMenuItemDto` / `UpdateMenuItemDto` | ฟิลด์ตาม `MenuItem` model (name, category, description, image, extraPrice, active) — update เป็น partial ทั้งหมด |
| `CreatePackageDto` / `UpdatePackageDto` | ฟิลด์ตาม `Package` + `courses[]` (`no`, `title`, `category`, `choose`, `itemIds: string[]`) สำหรับ create; update เป็น partial และ **ไม่รวม `courses`** |
| `UpdateSettingsDto` | ทุก field optional: `shopName/shopNameEn/shopInitials/shopAddress/shopPhone/shopLine: string`, `depositRate: number` (0–1), `deliveryFee: int ≥0`, `freeDeliveryMinTables: int ≥0` |

---

## หมายเหตุปิดท้าย

เอกสารนี้สะท้อนพฤติกรรมจริงของโค้ด ไม่ใช่ข้อกำหนดในอุดมคติ — จุดที่ควรระวังเมื่อนำไปพัฒนาต่อ (ดูเพิ่มเติมที่ [`REQUIREMENTS.md#8-gaps--สิ่งที่ยังไม่ได้ทำ`](./REQUIREMENTS.md#8-gaps--สิ่งที่ยังไม่ได้ทำ-จากการอ่านโค้ดปัจจุบัน)):

- Frontend ทั้งหมดยังทำงานบน local state/mock data — ฟังก์ชัน backend ในหัวข้อ 6–7 **ยังไม่ถูกเรียกใช้จริงจาก UI**
- `PATCH /packages/:id` ยังแก้ `courses` ไม่ได้ (ต้องลบ-สร้างใหม่ทั้งแพ็กเกจถ้าต้องการแก้รายการอาหารในข้อ)
- `dayStatus()` ตีความว่า 1 booking = เต็มทั้งวัน ทำให้ `SLOT_CAPACITY` (500 โต๊ะ/ช่วง) ที่นิยามไว้ไม่เคยถูกใช้จำกัดจริงในทางปฏิบัติ
- สลิปโอนเงินและรูปเมนูเก็บเป็น data URL ในหน่วยความจำ/localStorage/DB text field โดยตรง ยังไม่มี object storage จริง
