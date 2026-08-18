import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

/**
 * ราคา (totalPrice/pricePerTable/deliveryFee) และชื่อแพ็กเกจ "ไม่รับจาก client อีกต่อไป" —
 * เคยรับตรงจาก frontend มาก่อน ซึ่งแก้ผ่าน DevTools/แก้ request body ได้ตรงๆ (ปลอมราคาจองเป็นเท่าไหร่ก็ได้)
 * ตอนนี้ backend คำนวณเองทั้งหมดจาก packageId ที่ส่งมา (ดู BookingsService.create)
 */
export class CreateBookingDto {
  @IsString() date!: string
  @IsString() timeSlot!: string

  @IsInt() @Min(1) @Max(500) tables!: number
  @IsInt() @Min(1) guestCount!: number

  /** id ของแพ็กเกจที่เลือกจริง — backend ใช้ดึงชื่อ/ราคาต่อโต๊ะที่แท้จริงจาก DB แทนการเชื่อค่าที่ client ส่งมา */
  @IsString() packageId!: string

  @IsString() location!: string
  @IsOptional() locationDetail?: unknown

  @IsArray() @IsString({ each: true }) menus!: string[]

  @IsOptional() @IsString() lineId?: string
}
