/** ไม่มี type ให้จาก npm (ไม่มี @types/promptpay-qr) — ประกาศเองแค่ signature ที่ใช้จริง */
declare module 'promptpay-qr' {
  export default function generatePayload(idOrPhoneNo: string, options?: { amount?: number }): string
}
