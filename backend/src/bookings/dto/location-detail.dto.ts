import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator'

/** รายละเอียดที่ลูกค้ากรอกเพิ่ม (บ้านเลขที่/อาคาร/จุดสังเกต) — ไม่มีผลต่อราคา เก็บไว้แสดงผลอย่างเดียว */
class LocationExtraDetailDto {
  @IsOptional() @IsString() houseNo?: string
  @IsOptional() @IsString() building?: string
  @IsOptional() @IsString() village?: string
  @IsOptional() @IsString() landmark?: string
  @IsOptional() @IsString() accessNote?: string
}

/**
 * สถานที่จัดงานที่ลูกค้าส่งมา — เก็บทั้งก้อนไว้แสดงผล (ใบจอง/เอกสาร) ตามเดิม
 * แต่ตอนคำนวณราคา bookings.service.ts (deliveryFeeFor) คำนวณ zone จาก province/address และ distanceKm จาก
 * OSRM เอง ไม่เชื่อ zone/distanceKm ที่ client ส่งมาในนี้เลย (กันลูกค้าแก้ raw request ปลอม zone ลดค่าขนส่ง)
 */
export class LocationDetailDto {
  @IsNumber() lat!: number
  @IsNumber() lng!: number

  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() address?: string
  @IsOptional() @IsString() province?: string
  /** เก็บไว้แสดงผลเท่านั้น — ราคาคำนวณจาก zone/ระยะทางที่ backend หาเองเสมอ */
  @IsOptional() @IsString() zone?: string
  @IsOptional() @IsNumber() distanceKm?: number

  @IsOptional() @ValidateNested() @Type(() => LocationExtraDetailDto) detail?: LocationExtraDetailDto
}
