import { join } from 'path'

/** โฟลเดอร์เก็บไฟล์อัปโหลด — ตั้งผ่าน env ได้ เพื่อชี้ไปที่ mount path ของ volume ตอน deploy จริง
 * (ไม่งั้นไฟล์จะหายทุกครั้งที่ redeploy เพราะ container filesystem เป็น ephemeral) */
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads')

export type UploadKind = 'menus' | 'qr' | 'slips' | 'logo' | 'content'

export const UPLOAD_KINDS: UploadKind[] = ['menus', 'qr', 'slips', 'logo', 'content']

/** ต้องตรงกับ MAX_UPLOAD_BYTES ฝั่ง frontend (src/imageUpload.ts) — กันไฟล์ที่ย่อแล้วยังใหญ่ผิดปกติหลุดมาถึง disk */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}
