---
noteId: "37a3c5e08f3311f1a0b1b1af0447d59d"
tags: []
title: "Function Specification (ละเอียด) — ระบบจองแคทเธอริ่ง"

---

# Function Specification แบบละเอียด — ทั้งระบบ

> เอกสารนี้ต่อยอดจาก [`REQUIREMENTS.md`](./REQUIREMENTS.md) โดยลงรายละเอียดระดับฟังก์ชัน/เมธอดจริงที่มีอยู่ในโค้ด (พารามิเตอร์ ตรรกะ เงื่อนไข validation) ทั้งฝั่ง Frontend และ Backend ณ วันที่ 2026-08-18

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
| ข้อมูลการชำระเงิน | อัปโหลด QR พร้อมเพย์ |
| ค่าขนส่ง | ช่องจังหวัดฐานร้าน (`homeProvince`), `addMetroProvince()`/`removeMetroProvince()` จัดการ chip list ของ `metroProvinces` |
| ค่าเดินทางนอกพื้นที่ | ปักหมุดพิกัดร้านบนแผนที่, ค่าน้ำมัน/กม. |
| อัตราค่าแรง | ค่าแรง 4 ตำแหน่ง + สัดส่วนคำนวณกำลังคน 3 ค่า (`tablesPerServer/tablesPerSupport/staffRemainderThreshold`) |
| ช่วงเวลาจอง | แก้เวลาของช่วงเช้า/กลางวัน/เย็น (`setSlotHours`) |
| เงื่อนไขในเอกสาร | `quotationValidDays`, `addTerm()`/`removeTerm()` จัดการ `quotationTerms`/`bookingTerms` เป็นรายการข้อความ |
| ประเภทอาหาร | `addCategory()` (สร้าง id อัตโนมัติจากชื่อ, กันชนด้วยเลขต่อท้าย), `updateCategoryField()` (แก้ไอคอน/ชื่อไทย/อังกฤษ), `removeCategory()`, `moveCategory()` (จัดลำดับ) |

`dirty` เทียบ `JSON.stringify(form)` กับ `settings` เดิมเพื่อ enable/disable ปุ่มบันทึก

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

---

## 6. Backend — REST API (NestJS)

ทุก endpoint อยู่หลัง `@UseGuards(JwtAuthGuard, RolesGuard)` + `ThrottlerGuard` (global, 60 req/นาที/IP) — `JwtAuthGuard` ตรวจ Bearer token ที่เซ็นโดย Auth0 ผ่าน JWKS; `RolesGuard` เช็ค custom claim role ตรงกับ `@Roles(...)` (ไม่ใส่ = ผ่านได้ทุก role ที่ login แล้ว)

### 6.1 `UsersController` (`/users`)

`GET/PATCH /users/me` — sync/อัปเดตโปรไฟล์จาก JWT + body ที่ frontend ส่งมาเอง (access token ไม่มี name/email/picture)

### 6.2 `BookingsController` (`/bookings`)

| Endpoint | Role | ตรรกะ |
|---|---|---|
| `GET /bookings` | login แล้ว | owner เห็นทุกใบจอง (join ข้อมูลลูกค้าปัจจุบัน), customer เห็นเฉพาะของตัวเอง — รองรับ `?page=&limit=` opt-in |
| `GET /bookings/availability` | login แล้ว | คิวรับงานไม่มีข้อมูลส่วนตัว (`select` เฉพาะ date/timeSlot/tables/status) |
| `POST /bookings` | `@Roles('customer')`, throttle 10/นาที | ดึง `Package` จริงจาก `packageId`, validate `menus` ต้องอยู่ใน courses ของแพ็กเกจนั้น, คำนวณ `pricePerTable`/`deliveryFee`/`totalPrice` เองจาก settings จริง (ไม่รับจาก client), รันใน transaction ระดับ `Serializable` + retry กันจองซ้อนวันเดียวกัน, ออกเลขที่ใบจองแบบ atomic |
| `PATCH /bookings/:id` | `@Roles('owner')` | อัปเดตสถานะ/แผนกำลังคน + บันทึก `lastEditedBy` จาก `jwtUser.sub` |
| `PATCH /bookings/:id/payment-slip` | `@Roles('customer')` | validate ที่ DTO ว่าเป็นรูปจริงไม่เกินขนาด, เช็ค `booking.customerId` ตรงกับผู้เรียก (403 ถ้าไม่ตรง) |

### 6.3 `MenusController` (`/menus`)

`GET /menus` — role-aware: owner ได้ทุกฟิลด์รวม `costPrice`, customer ถูก `select` ตัด `costPrice`/`updatedAt`/`lastEditedBy` ออก — รองรับ pagination `POST/PATCH /menus` บันทึก `lastEditedBy`

### 6.4 `PackagesController` (`/packages`)

`GET /packages` — role-aware เช่นกัน (เมนูที่ซ้อนอยู่ใน `courses[].items` ก็ถูกตัด `costPrice` ออกถ้าเรียกโดย customer) — `PATCH /packages/:id` ถ้าส่ง `courses` มาจะแทนที่ทั้งชุด (ลบเก่าสร้างใหม่ในทรานแซกชันเดียว), บันทึก `lastEditedBy`

### 6.5 `SettingsController` (`/settings`)

| Endpoint | Role | ตรรกะ |
|---|---|---|
| `GET /settings/public` | ไม่ต้อง login | คืนแค่ชื่อร้าน/โลโก้/คำโปรย/สีแบรนด์ ใช้แสดงหน้า Login |
| `GET /settings` | login แล้ว | owner ได้ทุกฟิลด์; customer ถูกกรอง `wageChef/wageAssistant/wageServerPerTable/wageDishwasher/tablesPerServer/tablesPerSupport/staffRemainderThreshold` ออก (ข้อมูลต้นทุนภายใน) — **ไม่มี in-memory cache แล้ว** (เคยมีแต่เอาออกเพราะข้าม process แล้ว stale) |
| `PATCH /settings` | `@Roles('owner')` | บันทึก `lastEditedBy` |

### 6.6 `GeoController` (`/geo`)

`GET /geo/resolve-maps-link` — throttle 20/นาที, whitelist โดเมนแค่ `maps.app.goo.gl`/`goo.gl` กัน endpoint ถูกใช้เป็น open redirect resolver (SSRF)

### 6.7 Auth/infra ที่ใช้ร่วมทุก endpoint

| ไฟล์ | หน้าที่ |
|---|---|
| `jwt.strategy.ts` | verify RS256 ผ่าน JWKS ของ Auth0 tenant (cache, rate-limit 5 req/min ไปยัง Auth0) |
| `roles.guard.ts` | เช็ค custom claim เทียบกับ `@Roles()` metadata |
| `current-user.decorator.ts` | `@CurrentUser()` ดึง JWT payload ดิบ |
| `app.module.ts` | ลงทะเบียน `ThrottlerModule.forRoot()` + `APP_GUARD` = `ThrottlerGuard` แบบ global |
| `common/pagination.ts`, `common/list-query.dto.ts` | helper แบ่งหน้าแบบ opt-in ใช้ร่วมกันทุก endpoint แบบ list |

---

## 7. Backend — Data Validation (DTO) สรุป

ทุก DTO ใช้ `class-validator` + `class-transformer` ผ่าน global `ValidationPipe`

| DTO | Field และกฎ |
|---|---|
| `CreateBookingDto` | `date/timeSlot: string`, `tables: int 1–500`, `guestCount: int ≥1`, `packageId: string` (**ไม่มี `totalPrice`/`pricePerTable`/`deliveryFee`/`packageName` แล้ว** — backend คำนวณเอง), `location: string`, `locationDetail?: unknown`, `menus: string[]`, `lineId?: string` |
| `UpdateBookingDto` | `status?: BookingStatus`, `staffAuto/staffActual?: unknown`, `staffNote?: string` |
| `UpdatePaymentSlipDto` | `paymentSlipUrl: string` ต้องขึ้นต้นด้วย `data:image/(png\|jpe?g\|webp\|gif);base64,` และยาวไม่เกิน ~11MB (base64 ของไฟล์ ~8MB) |
| `CreateMenuItemDto`/`UpdateMenuItemDto` | เพิ่ม `costPrice?: int` จากเดิม |
| `CreatePackageDto`/`UpdatePackageDto` | เหมือนเดิม (`courses[]` พร้อม `no/title/icon/category/choose/itemIds`) |
| `UpdateSettingsDto` | ขยายจากเดิมมาก — เพิ่ม `metroProvinces[]`, `homeProvince`, `brandColor` (regex hex 6 หลัก), `tablesPerServer/tablesPerSupport/staffRemainderThreshold`, `slotMorningHours/slotNoonHours/slotEveningHours`, `quotationValidDays/quotationTerms[]/bookingTerms[]`, `categories?: unknown[]` (ไม่ deep-validate โครงสร้าง), `shopLogo/shopLoginTagline` — ทุก field ยัง optional เหมือนเดิม |

---

## หมายเหตุปิดท้าย

เอกสารนี้สะท้อนพฤติกรรมจริงของโค้ด ไม่ใช่ข้อกำหนดในอุดมคติ — จุดที่ควรระวังเมื่อนำไปพัฒนาต่อ (ดูเพิ่มเติมที่ [`REQUIREMENTS.md#9-gaps--สิ่งที่ยังไม่ได้ทำ`](./REQUIREMENTS.md#9-gaps--สิ่งที่ยังไม่ได้ทำ-จากการอ่านโค้ดปัจจุบัน)):

- `PATCH /packages/:id` แก้ `courses` ได้แล้ว แต่เป็นการแทนที่ทั้งชุด (ลบเก่า-สร้างใหม่) ไม่ใช่ patch ทีละข้อ (มี endpoint แยกสำหรับแก้ทีละ course: `POST/PATCH/DELETE /packages/:id/courses/:courseId`)
- `dayStatus()` ยังตีความว่า 1 booking = เต็มทั้งวัน ทำให้ `SLOT_CAPACITY` (500 โต๊ะ/ช่วง) ที่นิยามไว้ไม่เคยถูกใช้จำกัดจริงในทางปฏิบัติ — ตั้งใจคงไว้ตามคำขอ ไม่ใช่บั๊ก
- สลิปโอนเงิน/รูปเมนู/โลโก้/QR ยังเก็บเป็น data URL ตรงใน DB โดยตรง ยังไม่มี object storage จริง
- zone/distanceKm ของค่าขนส่งยังอิงพิกัด/โซนที่ client ส่งมาบางส่วน (มี cap ระยะทางกันค่าผิดปกติ แต่ยังไม่ re-verify เต็มรูปแบบฝั่ง server)
