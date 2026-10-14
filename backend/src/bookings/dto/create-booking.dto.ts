import { Transform, Type } from 'class-transformer'
import { IsArray, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator'
import { LINE_ID_MESSAGE, LINE_ID_PATTERN, MAX_NUMBER, lineIdCleanTruncate } from '../../common/input-rules'
import { LocationDetailDto } from './location-detail.dto'

/**
 * ราคา (totalPrice/pricePerTable/deliveryFee) และชื่อแพ็กเกจ "ไม่รับจาก client อีกต่อไป" —
 * เคยรับตรงจาก frontend มาก่อน ซึ่งแก้ผ่าน DevTools/แก้ request body ได้ตรงๆ (ปลอมราคาจองเป็นเท่าไหร่ก็ได้)
 * ตอนนี้ backend คำนวณเองทั้งหมดจาก packageId ที่ส่งมา (ดู BookingsService.create)
 */
export class CreateBookingDto {
  /** ร้านที่ลูกค้าเลือกจองด้วย — เลือกจากหน้ารายชื่อร้าน/URL เฉพาะร้านมาก่อนแล้วเสมอ (multi-tenant) */
  @IsString() shopId!: string

  /** รูปแบบ YYYY-MM-DD เท่านั้น — bookings.service.ts เทียบ string นี้ตรงๆ ตอนเช็ควันชนกัน ต้องเป็น format เดียวกันเสมอ */
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date ต้องเป็นรูปแบบ YYYY-MM-DD' }) @IsISO8601({ strict: true, strictSeparator: true }, { message: 'date ต้องเป็นวันที่ที่มีอยู่จริง' }) date!: string
  @IsString() @MaxLength(60) timeSlot!: string

  @IsInt() @Min(1) @Max(500) tables!: number
  @IsInt() @Min(1) @Max(MAX_NUMBER) guestCount!: number

  /** id ของแพ็กเกจที่เลือกจริง — backend ใช้ดึงชื่อ/ราคาต่อโต๊ะที่แท้จริงจาก DB แทนการเชื่อค่าที่ client ส่งมา */
  @IsString() packageId!: string

  /** ที่อยู่เต็มที่หน้าจอประกอบจากที่อยู่ในแผนที่ + บ้านเลขที่/อาคาร/หมู่บ้าน/จุดสังเกต (รวมได้เกิน 1,000 ตัว) — เพดานกว้างกว่าช่องย่อยเพื่อไม่ปฏิเสธจองที่กรอกถูกต้อง */
  @IsString() @MaxLength(1500) location!: string
  @IsOptional() @ValidateNested() @Type(() => LocationDetailDto) locationDetail?: LocationDetailDto

  @IsArray() @IsString({ each: true }) menus!: string[]

  @IsOptional() @Transform(lineIdCleanTruncate) @IsString() @MaxLength(30) @Matches(LINE_ID_PATTERN, { message: LINE_ID_MESSAGE }) lineId?: string
}
