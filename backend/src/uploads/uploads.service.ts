import { randomUUID } from 'crypto'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { join, relative, resolve } from 'path'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ALLOWED_MIME_TO_EXT, MAX_UPLOAD_BYTES, UPLOAD_KINDS, UPLOADS_DIR, UploadKind } from './uploads.constants'

const DATA_URL_PATTERN = /^data:([a-z0-9/+.-]+);base64,(.+)$/i

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
   * ลบไฟล์เก่าตอนถูกแทนที่ด้วยรูปใหม่ (เปลี่ยนรูปเมนู/โลโก้/QR/สลิป) — ป้องกันไฟล์ orphan สะสมบน disk ไม่มีวันหมด
   * เรียกหลังบันทึกค่าใหม่ลง DB สำเร็จแล้วเท่านั้น ไม่มีวันโยน error ออกไปบล็อกการทำงานจริง — ลบไม่สำเร็จก็แค่ log ไว้
   */
  async deleteManagedFile(urlPath: string | null | undefined): Promise<void> {
    if (!urlPath || !urlPath.startsWith('/uploads/')) return

    const uploadsRoot = resolve(UPLOADS_DIR)
    const target = resolve(uploadsRoot, urlPath.slice('/uploads/'.length))

    // กัน path traversal เผื่อมีค่าผิดปกติหลุดมาจากที่อื่น (ปกติค่านี้มาจาก saveDataUrl เองเท่านั้น ซึ่งเป็น uuid เสมอ)
    if (relative(uploadsRoot, target).startsWith('..')) {
      this.logger.warn(`ปฏิเสธการลบไฟล์นอกโฟลเดอร์ uploads: ${urlPath}`)
      return
    }

    try {
      await unlink(target)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`ลบไฟล์เก่าไม่สำเร็จ: ${urlPath}`, err as Error)
      }
    }
  }
}
