import { BookingStatus } from '@prisma/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'

/** ใช้โดยเจ้าของร้าน — เปลี่ยนสถานะและ/หรือบันทึกแผนกำลังคนจริงที่ปรับแล้ว */
export class UpdateBookingDto {
  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus
  @IsOptional() staffAuto?: unknown
  @IsOptional() staffActual?: unknown
  @IsOptional() @IsString() staffNote?: string
}
