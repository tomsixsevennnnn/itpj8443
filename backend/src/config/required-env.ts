/** ตัวแปรสภาพแวดล้อมที่ขาดไม่ได้ — ขาดแล้วระบบเริ่มทำงานได้แต่พังตอนมีคนเรียกใช้ (เช่น เชื่อม DB ไม่ได้ ตรวจ token ไม่ได้) */
export const REQUIRED_ENV = ['DATABASE_URL', 'AUTH0_DOMAIN', 'AUTH0_AUDIENCE'] as const

/** รายชื่อตัวแปรที่ขาด/ว่าง (ตัดช่องว่างหัวท้ายก่อนเช็ค) — ว่าง = ครบ */
export function missingEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  return REQUIRED_ENV.filter((name) => !env[name]?.trim())
}

/** เรียกตอนเริ่มระบบ — ขาดตัวแปรจำเป็นให้หยุดทันทีพร้อมบอกชื่อตัวแปร แทนที่จะรอไปพังกลางทางตอนใช้งานจริง */
export function assertRequiredEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = missingEnv(env)
  if (missing.length > 0) {
    throw new Error(`ขาดตัวแปรสภาพแวดล้อมที่จำเป็น: ${missing.join(', ')} — ตั้งค่าใน .env หรือใน Variables ของ Railway แล้วเริ่มใหม่`)
  }
}
