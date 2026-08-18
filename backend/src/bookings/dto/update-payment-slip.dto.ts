import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator'

/**
 * ยังไม่มี object storage (R2/S3) ต่อจริง — รับเป็น data URL จากเครื่องลูกค้าไปก่อน
 * เมื่อต่อ R2 แล้วค่อยเปลี่ยนมาบังคับเป็น IsUrl และให้ frontend อัปโหลดไฟล์จริงแทน
 *
 * เดิม frontend จำกัดชนิดไฟล์/ขนาดไว้แค่ฝั่ง client (ข้ามผ่าน DevTools/ยิง API ตรงได้) — ตอนนี้ตรวจซ้ำฝั่ง server:
 * ต้องขึ้นต้นด้วย data URL ของรูปภาพจริง และไม่เกิน ~8MB ต้นฉบับ (base64 ยาวกว่าไบนารีจริงราว 1.37 เท่า)
 */
const MAX_SLIP_BASE64_LENGTH = 11 * 1024 * 1024

export class UpdatePaymentSlipDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^data:image\/(png|jpe?g|webp|gif);base64,/, {
    message: 'paymentSlipUrl ต้องเป็นรูปภาพ (data URL ของ png/jpeg/webp/gif) เท่านั้น',
  })
  @MaxLength(MAX_SLIP_BASE64_LENGTH, { message: 'ไฟล์รูปใหญ่เกินไป (จำกัดประมาณ 8MB)' })
  paymentSlipUrl!: string
}
