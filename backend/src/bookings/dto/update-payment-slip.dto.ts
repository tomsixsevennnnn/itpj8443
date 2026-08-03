import { IsNotEmpty, IsString } from 'class-validator'

/**
 * ยังไม่มี object storage (R2/S3) ต่อจริง — รับเป็น data URL จากเครื่องลูกค้าไปก่อน
 * เมื่อต่อ R2 แล้วค่อยเปลี่ยนมาบังคับเป็น IsUrl และให้ frontend อัปโหลดไฟล์จริงแทน
 */
export class UpdatePaymentSlipDto {
  @IsString() @IsNotEmpty() paymentSlipUrl!: string
}
