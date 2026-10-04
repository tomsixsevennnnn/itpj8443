import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator'

/** จำนวนสูงสุดของบัญชีเพิ่มเติมแต่ละชนิด (ธนาคาร/พร้อมเพย์) — ต้องตรงกับ MAX_EXTRA_PAYMENT_ACCOUNTS ฝั่ง frontend */
export const MAX_EXTRA_PAYMENT_ACCOUNTS = 8

export class ExtraBankAccountDto {
  @IsString() @MaxLength(100) bankName!: string
  @IsString() @MaxLength(40) accountNumber!: string
  @IsString() @MaxLength(100) accountName!: string
}

export class ExtraPromptPayDto {
  /** เบอร์โทร/เลขบัตร ปชช./เลขวอลเล็ต — ตัวเลขและขีดคั่นเท่านั้น (เหมือน promptPayId หลัก) */
  @IsString() @Matches(/^[0-9-]*$/, { message: 'พร้อมเพย์ต้องเป็นตัวเลข (และขีดคั่นได้)' }) @MaxLength(30) id!: string
  @IsString() @MaxLength(100) firstName!: string
  @IsString() @MaxLength(100) lastName!: string
}

export class UpdateSettingsDto {
  /** version ของ settings ที่ client โหลดมาตอนเปิดหน้า — กันสองแท็บ/สองคนแก้ทับกันเงียบๆ (ดู settings.service.ts) */
  @IsInt() expectedVersion!: number

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
  /** เบอร์โทร/เลขบัตร ปชช./เลขวอลเล็ต — เก็บได้ทั้งมีขีดคั่นหรือไม่มี (promptpay-qr ฝั่ง frontend จะตัดอักขระที่ไม่ใช่ตัวเลขออกเองตอนสร้าง QR) */
  @IsOptional() @IsString() @Matches(/^[0-9-]*$/, { message: 'promptPayId ต้องเป็นตัวเลข (และขีดคั่นได้)' }) promptPayId?: string
  @IsOptional() @IsString() promptPayFirstName?: string
  @IsOptional() @IsString() promptPayLastName?: string
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_EXTRA_PAYMENT_ACCOUNTS) @ValidateNested({ each: true }) @Type(() => ExtraBankAccountDto) extraBankAccounts?: ExtraBankAccountDto[]
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_EXTRA_PAYMENT_ACCOUNTS) @ValidateNested({ each: true }) @Type(() => ExtraPromptPayDto) extraPromptPays?: ExtraPromptPayDto[]

  /** API key + Branch ID จากบัญชี SlipOK ของร้าน (slipok.com) — ว่างทั้งคู่ = ปิดการตรวจสอบสลิปอัตโนมัติ */
  @IsOptional() @IsString() @MaxLength(200) slipOkApiKey?: string
  @IsOptional() @IsString() @MaxLength(100) slipOkBranchId?: string

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

  /** วันที่ร้านปิด ไม่รับจอง รูปแบบ "YYYY-MM-DD" */
  @IsOptional()
  @IsArray()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true, message: 'closedDates ต้องเป็นวันที่รูปแบบ YYYY-MM-DD' })
  closedDates?: string[]

  @IsOptional() @IsNumber() shopLocationLat?: number
  @IsOptional() @IsNumber() shopLocationLng?: number
  @IsOptional() @IsNumber() @Min(0) fuelCostPerKm?: number

  /** เนื้อหาหน้าแรก (Hero/การ์ดจุดเด่น/ขั้นตอน/แกลเลอรี/CTA) — โครงสร้างคือ HomeContent ฝั่ง frontend ไม่ deep-validate ที่นี่ */
  @IsOptional() homeContent?: unknown
}
