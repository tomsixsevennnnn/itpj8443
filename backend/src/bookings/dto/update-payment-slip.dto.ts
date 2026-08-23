import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator'

/**
 * รูปสลิปถูกอัปโหลดผ่าน POST /uploads/payment-slip ไปแล้วก่อนหน้านี้เสมอ (เขียนลง disk จริง ผ่านการตรวจ
 * ชนิด/ขนาดไฟล์ที่ UploadsService แล้ว) — ค่าที่ endpoint นี้รับจึงต้องเป็น path สั้นๆ ที่ endpoint นั้นคืนมา
 * (เช่น "/uploads/slips/<uuid>.jpg") ไม่ใช่ data URL ดิบอีกต่อไป
 */
export class UpdatePaymentSlipDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\/uploads\/slips\/[\w-]+\.(png|jpe?g|webp)$/, {
    message: 'paymentSlipUrl ต้องเป็น path ที่ได้จาก POST /uploads/payment-slip เท่านั้น',
  })
  @MaxLength(200)
  paymentSlipUrl!: string
}
