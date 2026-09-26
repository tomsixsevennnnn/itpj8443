import { Injectable, Logger } from '@nestjs/common'
import { SlipVerifyStatus } from '@prisma/client'

/** error code จาก SlipOK (https://slipok.com/api-documentation/error-status-code/) ที่แปลเป็นสถานะของเราได้ตรงๆ
 *  ส่วนโค้ดอื่น (เช่น 1001 ไอดีสาขาผิด, 1002 authorization ผิด, 1005-1011 ไฟล์/QR มีปัญหา) ถือเป็น REJECTED
 *  ทั่วไป — message จาก SlipOK ที่แนบไปด้วยละเอียดพอให้ owner เข้าใจว่าต้องแก้อะไร (เช่น key/branch id ผิด) */
const SLIPOK_ERROR_STATUS: Partial<Record<number, SlipVerifyStatus>> = {
  1012: SlipVerifyStatus.DUPLICATE,
  1013: SlipVerifyStatus.AMOUNT_MISMATCH,
  1014: SlipVerifyStatus.ACCOUNT_MISMATCH,
}

export interface SlipVerifyResult {
  status: SlipVerifyStatus
  message: string
  transRef: string | null
}

export interface SlipVerifyParams {
  apiKey: string
  branchId: string
  fileBuffer: Buffer
  filename: string
  mimeType: string
  /** ยอดที่คาดว่าจะได้รับ (totalPrice ของใบจอง) — ส่งไปให้ SlipOK เทียบยอดในสลิปให้เลย ไม่ต้องเทียบเองฝั่งนี้ */
  expectedAmount: number
}

/**
 * เรียก SlipOK (https://slipok.com) ให้ตรวจสอบสลิปโอนเงินกับธนาคารจริง — ไม่ใช่แค่ OCR อ่านตัวเลขในรูป แต่ยืนยัน
 * กับ transaction จริงของธนาคารผู้โอน (log:true ให้ SlipOK เช็คยอด/บัญชีผู้รับ/สลิปซ้ำให้ในคำขอเดียวเลย)
 *
 * ไม่มีวัน throw ออกไปนอก service นี้ — เรียกไม่สำเร็จ (เครือข่าย/API ล่ม/timeout) ก็แค่คืนสถานะ UNAVAILABLE แทน
 * เพราะ SlipOK ล่มชั่วคราวไม่ควรทำให้ลูกค้าแนบสลิปไม่ได้เลย (ดู bookings.service.ts ที่เรียกใช้)
 */
@Injectable()
export class SlipVerifyService {
  private readonly logger = new Logger(SlipVerifyService.name)

  async checkSlip(params: SlipVerifyParams): Promise<SlipVerifyResult> {
    const { apiKey, branchId, fileBuffer, filename, mimeType, expectedAmount } = params
    try {
      const form = new FormData()
      form.append('files', new Blob([fileBuffer], { type: mimeType }), filename)
      form.append('log', 'true')
      form.append('amount', String(expectedAmount))

      const res = await fetch(`https://api.slipok.com/api/line/apikey/${encodeURIComponent(branchId)}`, {
        method: 'POST',
        headers: { 'x-authorization': apiKey },
        body: form,
      })

      const body: any = await res.json().catch(() => null)
      if (!body) {
        return { status: SlipVerifyStatus.UNAVAILABLE, message: 'เรียกระบบตรวจสอบสลิปไม่สำเร็จ (อ่านผลลัพธ์ไม่ได้)', transRef: null }
      }

      const transRef = typeof body.data?.transRef === 'string' ? body.data.transRef : null

      if (res.ok && body.success) {
        return { status: SlipVerifyStatus.VERIFIED, message: 'ตรวจสอบสลิปสำเร็จ ยืนยันเป็นรายการโอนจริงกับธนาคาร', transRef }
      }

      const code = typeof body.code === 'number' ? body.code : undefined
      const status = (code !== undefined && SLIPOK_ERROR_STATUS[code]) || SlipVerifyStatus.REJECTED
      const message = typeof body.message === 'string' ? body.message : 'สลิปนี้ตรวจสอบไม่ผ่าน'
      return { status, message, transRef }
    } catch (err) {
      this.logger.warn('เรียก SlipOK ไม่สำเร็จ', err as Error)
      return { status: SlipVerifyStatus.UNAVAILABLE, message: 'เรียกระบบตรวจสอบสลิปไม่สำเร็จ (เครือข่าย/บริการขัดข้องชั่วคราว)', transRef: null }
    }
  }
}
