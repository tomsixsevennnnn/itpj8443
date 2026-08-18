import { IsArray, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator'

export class UpdateSettingsDto {
  @IsOptional() @IsString() shopName?: string
  @IsOptional() @IsString() shopNameEn?: string
  @IsOptional() @IsString() shopInitials?: string
  @IsOptional() @IsString() shopAddress?: string
  @IsOptional() @IsString() shopPhone?: string
  @IsOptional() @IsString() shopLine?: string
  @IsOptional() @IsString() shopLogo?: string
  @IsOptional() @IsString() shopLoginTagline?: string

  @IsOptional() @IsString() bankName?: string
  @IsOptional() @IsString() bankAccountNumber?: string
  @IsOptional() @IsString() bankAccountName?: string
  @IsOptional() @IsString() promptPayQr?: string

  @IsOptional() @IsNumber() @Min(0) @Max(1) depositRate?: number
  @IsOptional() @IsInt() @Min(0) deliveryFee?: number
  @IsOptional() @IsInt() @Min(0) freeDeliveryMinTables?: number
  @IsOptional() @IsArray() @IsString({ each: true }) metroProvinces?: string[]
  @IsOptional() @IsString() homeProvince?: string
  @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'brandColor ต้องเป็นรหัสสี hex เช่น #F97316' }) brandColor?: string

  @IsOptional() @IsInt() @Min(0) wageChef?: number
  @IsOptional() @IsInt() @Min(0) wageAssistant?: number
  @IsOptional() @IsInt() @Min(0) wageServerPerTable?: number
  @IsOptional() @IsInt() @Min(0) wageDishwasher?: number

  @IsOptional() @IsInt() @Min(1) tablesPerServer?: number
  @IsOptional() @IsInt() @Min(1) tablesPerSupport?: number
  @IsOptional() @IsInt() @Min(0) staffRemainderThreshold?: number

  @IsOptional() @IsString() slotMorningHours?: string
  @IsOptional() @IsString() slotNoonHours?: string
  @IsOptional() @IsString() slotEveningHours?: string

  @IsOptional() @IsInt() @Min(1) quotationValidDays?: number
  @IsOptional() @IsArray() @IsString({ each: true }) quotationTerms?: string[]
  @IsOptional() @IsArray() @IsString({ each: true }) bookingTerms?: string[]

  /** ประเภทอาหารทั้งหมดของร้าน (id/label/labelEn/icon/gradient) — โครงสร้างคือ Category[] ฝั่ง frontend ไม่ deep-validate ที่นี่ */
  @IsOptional() @IsArray() categories?: unknown[]
  @IsOptional() @IsArray() @IsString({ each: true }) categoryOrder?: string[]

  @IsOptional() @IsNumber() shopLocationLat?: number
  @IsOptional() @IsNumber() shopLocationLng?: number
  @IsOptional() @IsNumber() @Min(0) fuelCostPerKm?: number

  /** เนื้อหาหน้าแรก (Hero/การ์ดจุดเด่น/ขั้นตอน/แกลเลอรี/CTA) — โครงสร้างคือ HomeContent ฝั่ง frontend ไม่ deep-validate ที่นี่ */
  @IsOptional() homeContent?: unknown
}
