import { randomUUID } from 'crypto'
import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import { join, relative, resolve } from 'path'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import sharp from 'sharp'
import { ALLOWED_MIME_TO_EXT, MAX_UPLOAD_BYTES, UPLOAD_KINDS, UPLOADS_DIR, UploadKind } from './uploads.constants'

const DATA_URL_PATTERN = /^data:([a-z0-9/+.-]+);base64,(.+)$/i

/** ขนาด/คุณภาพ thumbnail ที่ฝังลงประวัติการแก้ไข (audit log) แทนไฟล์จริงที่กำลังจะถูกลบทิ้ง — เล็กและคุณภาพต่ำ
 *  พอให้ owner จำรูปเดิมได้ตอนย้อนดูประวัติ ไม่ได้มีไว้ดูละเอียด จึงบีบให้เบาที่สุดเท่าที่ยังพอมองออก */
const THUMBNAIL_MAX_DIMENSION = 64
const THUMBNAIL_JPEG_QUALITY = 40

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name)

  async saveDataUrl(kind: UploadKind, dataUrl: string): Promise<string> {
    if (!UPLOAD_KINDS.includes(kind)) throw new BadRequestException('ประเภทไฟล์ไม่ถูกต้อง')

    const match = DATA_URL_PATTERN.exec(dataUrl)
    if (!match) throw new BadRequestException('รูปแบบไฟล์ไม่ถูกต้อง (ต้องเป็น data URL แบบ base64)')

    const [, mimeType, base64] = match
    const ext = ALLOWED_MIME_TO_EXT[mimeType.toLowerCase()]
    if (!ext) throw new BadRequestException('รองรับเฉพาะไฟล์รูป PNG, JPEG, WEBP เท่านั้น')

    const buffer = Buffer.from(base64, 'base64')
    if (buffer.length === 0) throw new BadRequestException('ไฟล์รูปว่างเปล่า')
    if (buffer.length > MAX_UPLOAD_BYTES) throw new BadRequestException('ไฟล์ใหญ่เกิน 8 MB')

    const dir = join(UPLOADS_DIR, kind)
    await mkdir(dir, { recursive: true })

    const filename = `${randomUUID()}.${ext}`
    await writeFile(join(dir, filename), buffer)

    return `/uploads/${kind}/${filename}`
  }

  /**
   * แปลง path สาธารณะ (เช่น "/uploads/slips/xxx.jpg") เป็น absolute path จริงบน disk — ใช้ร่วมกันทั้งตอนลบไฟล์
   * และตอนอ่านไฟล์ส่งกลับ (เช่น สลิปโอนเงินที่ต้อง auth ถึงจะเห็น ไม่ใช่ static asset สาธารณะ)
   * กัน path traversal เผื่อมีค่าผิดปกติหลุดมาจากที่อื่น (ปกติค่านี้มาจาก saveDataUrl เองเท่านั้น ซึ่งเป็น uuid เสมอ)
   */
  resolveManagedFilePath(urlPath: string): string | null {
    if (!urlPath.startsWith('/uploads/')) return null

    const uploadsRoot = resolve(UPLOADS_DIR)
    const target = resolve(uploadsRoot, urlPath.slice('/uploads/'.length))

    if (relative(uploadsRoot, target).startsWith('..')) {
      this.logger.warn(`ปฏิเสธการเข้าถึงไฟล์นอกโฟลเดอร์ uploads: ${urlPath}`)
      return null
    }
    return target
  }

  /**
   * ลบไฟล์เก่าตอนถูกแทนที่ด้วยรูปใหม่ (เปลี่ยนรูปเมนู/โลโก้/QR/สลิป) — ป้องกันไฟล์ orphan สะสมบน disk ไม่มีวันหมด
   * เรียกหลังบันทึกค่าใหม่ลง DB สำเร็จแล้วเท่านั้น ไม่มีวันโยน error ออกไปบล็อกการทำงานจริง — ลบไม่สำเร็จก็แค่ log ไว้
   */
  async deleteManagedFile(urlPath: string | null | undefined): Promise<void> {
    if (!urlPath) return
    const target = this.resolveManagedFilePath(urlPath)
    if (!target) return

    try {
      await unlink(target)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`ลบไฟล์เก่าไม่สำเร็จ: ${urlPath}`, err as Error)
      }
    }
  }

  /**
   * ย่อรูปที่กำลังจะถูกลบ (deleteManagedFile) ให้เป็น thumbnail คุณภาพต่ำ ฝัง base64 เป็น data URL เดียวจบ —
   * เอาไว้แทนที่ path เดิมใน before/after ที่ audit.log() เก็บไว้ ก่อนลบไฟล์จริงทิ้งจาก disk เพื่อประหยัดพื้นที่
   * ต้องเรียก "ก่อน" deleteManagedFile เสมอ (ไฟล์ต้องยังอยู่ตอนอ่าน) — ถ้าย่อไม่สำเร็จคืน null เฉยๆ ไม่ throw
   * ออกไปบล็อกการบันทึกจริง (ประวัติจะโชว์ path เดิมที่ใช้การไม่ได้แทน ยังดีกว่าทำรายการไม่สำเร็จทั้งอัน)
   */
  async makeThumbnailDataUrl(urlPath: string | null | undefined): Promise<string | null> {
    if (!urlPath) return null
    const target = this.resolveManagedFilePath(urlPath)
    if (!target) return null

    try {
      const original = await readFile(target)
      const thumbnail = await sharp(original)
        .resize(THUMBNAIL_MAX_DIMENSION, THUMBNAIL_MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: THUMBNAIL_JPEG_QUALITY })
        .toBuffer()
      return `data:image/jpeg;base64,${thumbnail.toString('base64')}`
    } catch (err) {
      this.logger.warn(`ย่อรูปเป็น thumbnail สำหรับประวัติการแก้ไขไม่สำเร็จ: ${urlPath}`, err as Error)
      return null
    }
  }
}
