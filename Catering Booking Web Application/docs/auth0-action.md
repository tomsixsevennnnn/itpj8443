---
noteId: "e28d73908f2c11f1a0b1b1af0447d59d"
tags: []

---

# Auth0 Action — ฝัง role เข้า token

แอปนี้แยกสิทธิ์ `customer` / `owner` จาก connection ที่ใช้ login (ดู `AUTH0_CONNECTION` ใน `src/auth.ts`):

- `customer` → login ผ่าน `google-oauth2`
- `owner` → login ผ่าน `Username-Password-Authentication`

แต่ Auth0 ไม่ส่ง connection name มาใน token ให้ฝั่ง frontend โดยตรง ต้องใช้ **Action** ฝัง custom claim `https://pipatphochana-catering.app/role` เข้าไปใน ID token / Access token ตอน login แทน แล้วฝั่งแอปจะอ่านค่านี้ผ่าน `roleFromAuth0User()` ใน `src/auth.ts`

## ขั้นตอนสร้าง Action

1. **Auth0 Dashboard > Actions > Library** → **Build Custom** → ตั้งชื่อ เช่น `set-role-claim` → Trigger เลือก **Login / Post Login**
2. วางโค้ดนี้:

```js
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://pipatphochana-catering.app/role'
  const role = event.connection.name === 'Username-Password-Authentication' ? 'owner' : 'customer'

  api.idToken.setCustomClaim(namespace, role)
  api.accessToken.setCustomClaim(namespace, role)
}
```

3. **Deploy**
4. **Actions > Flows > Login** → ลาก Action `set-role-claim` จากแท็บ Custom เข้าไปในโฟลว์ (ต่อระหว่าง Start กับ Complete) → **Apply**

## สร้างบัญชีเจ้าของร้าน

Owner login ด้วย username/password ไม่ใช่ Google ต้องสร้าง user ไว้ล่วงหน้า:

**Auth0 Dashboard > User Management > Users > Create User**
- Connection: `Username-Password-Authentication`
- ตั้ง email/password ให้เจ้าของร้าน

หลังตั้งค่าครบ กด "เข้าระบบในฐานะเจ้าของร้าน" ในหน้า Login แล้ว login ด้วยบัญชีนี้ → `role` จะเป็น `'owner'` → แอปจะพาไปหน้า `owner-dashboard` อัตโนมัติ (ดู `effectiveScreen` ใน `src/App.tsx`)

## ตรวจสอบว่า claim มาจริง

Decode ID token ที่ https://jwt.io แล้วดูว่ามี key `https://pipatphochana-catering.app/role` พร้อมค่า `owner` หรือ `customer` อยู่ใน payload — ถ้าไม่มี แปลว่า Action ยังไม่ถูก apply เข้า Login flow
