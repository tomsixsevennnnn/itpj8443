import { Transform, Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator'
import { MAX_NUMBER, NAME_MESSAGE, NAME_PATTERN, digitsOnly, lettersOnly } from '../../common/input-rules'

/** จำนวนสูงสุดของบัญชีเพิ่มเติมแต่ละชนิด (ธนาคาร/พร้อมเพย์) — ต้องตรงกับ MAX_EXTRA_PAYMENT_ACCOUNTS ฝั่ง frontend */
export const MAX_EXTRA_PAYMENT_ACCOUNTS = 8

export class ExtraBankAccountDto {
  @IsString() @MaxLength(100) bankName!: string
  @Transform(digitsOnly) @IsString() @Matches(/^[0-9]*$/, { message: 'เลขบัญชีต้องเป็นตัวเลขเท่านั้น' }) @MaxLength(40) accountNumber!: string
  @Transform(lettersOnly) @IsString() @Matches(NAME_PATTERN, { message: NAME_MESSAGE }) @MaxLength(100) accountName!: string
}

export class ExtraPromptPayDto {
  /** เบอร์โทร/เลขบัตร ปชช./เลขวอลเล็ต — ตัวเลขล้วนเท่านั้น (เหมือน promptPayId หลัก) */
  @Transform(digitsOnly) @IsString() @Matches(/^[0-9]*$/, { message: 'พร้อมเพย์ต้องเป็นตัวเลขเท่านั้น' }) @MaxLength(30) id!: string
  @Transform(lettersOnly) @IsString() @Matches(NAME_PATTERN, { message: NAME_MESSAGE }) @MaxLength(100) firstName!: string
  @Transform(lettersOnly) @IsString() @Matches(NAME_PATTERN, { message: NAME_MESSAGE }) @MaxLength(100) lastName!: string
}

export class UpdateSettingsDto {
  /** version ของ settings ที่ client โหลดมาตอนเปิดหน้า — กันสองแท็บ/สองคนแก้ทับกันเงียบๆ (ดู settings.service.ts) */
  @IsInt() expectedVersion!: number

  @IsOptional() @IsString() @MaxLength(100) shopName?: string
  @IsOptional() @IsString() @MaxLength(100) shopNameEn?: string
  @IsOptional() @IsString() @MaxLength(10) shopInitials?: string
  @IsOptional() @IsString() @MaxLength(300) shopAddress?: string
  @IsOptional() @IsString() @MaxLength(30) shopPhone?: string
  @IsOptional() @IsString() @MaxLength(50) shopLine?: string
  @IsOptional() @IsString() shopLogo?: string
  @IsOptional() @IsString() @MaxLength(150) shopLoginTagline?: string

  @IsOptional() @IsString() @MaxLength(100) bankName?: string
  @IsOptional() @Transform(digitsOnly) @IsString() @Matches(/^[0-9]*$/, { message: 'เลขบัญชีต้องเป็นตัวเลขเท่านั้น' }) bankAccountNumber?: string
  @IsOptional() @Transform(lettersOnly) @IsString() @Matches(NAME_PATTERN, { message: NAME_MESSAGE }) bankAccountName?: string
  /** เบอร์โทร/เลขบัตร ปชช./เลขวอลเล็ต — ตัวเลขล้วนเท่านั้น (ตัดขีดคั่นออกให้ก่อนบันทึก) */
  @IsOptional() @Transform(digitsOnly) @IsString() @Matches(/^[0-9]*$/, { message: 'promptPayId ต้องเป็นตัวเลขเท่านั้น' }) promptPayId?: string
  @IsOptional() @Transform(lettersOnly) @IsString() @Matches(NAME_PATTERN, { message: NAME_MESSAGE }) promptPayFirstName?: string
  @IsOptional() @Transform(lettersOnly) @IsString() @Matches(NAME_PATTERN, { message: NAME_MESSAGE }) promptPayLastName?: string
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_EXTRA_PAYMENT_ACCOUNTS) @ValidateNested({ each: true }) @Type(() => ExtraBankAccountDto) extraBankAccounts?: ExtraBankAccountDto[]
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_EXTRA_PAYMENT_ACCOUNTS) @ValidateNested({ each: true }) @Type(() => ExtraPromptPayDto) extraPromptPays?: ExtraPromptPayDto[]

  /** API key + Branch ID จากบัญชี SlipOK ของร้าน (slipok.com) — ว่างทั้งคู่ = ปิดการตรวจสอบสลิปอัตโนมัติ */
  @IsOptional() @IsString() @MaxLength(200) slipOkApiKey?: string
  @IsOptional() @IsString() @MaxLength(100) slipOkBranchId?: string

  @IsOptional() @IsNumber() @Min(0) @Max(1) depositRate?: number
  @IsOptional() @IsInt() @Min(0) @Max(MAX_NUMBER) deliveryFee?: number
  @IsOptional() @IsInt() @Min(0) freeDeliveryMinTables?: number
  @IsOptional() @IsArray() @ArrayMaxSize(80) @IsString({ each: true }) @MaxLength(100, { each: true }) metroProvinces?: string[]
  @IsOptional() @IsString() @MaxLength(100) homeProvince?: string
  @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'brandColor ต้องเป็นรหัสสี hex เช่น #F97316' }) brandColor?: string

  @IsOptional() @IsInt() @Min(0) wageChef?: number
  @IsOptional() @IsInt() @Min(0) wageAssistant?: number
  @IsOptional() @IsInt() @Min(0) wageServerPerTable?: number
  @IsOptional() @IsInt() @Min(0) wageDishwasher?: number

  @IsOptional() @IsInt() @Min(1) tablesPerServer?: number
  @IsOptional() @IsInt() @Min(1) tablesPerSupport?: number
  @IsOptional() @IsInt() @Min(0) staffRemainderThreshold?: number

  @IsOptional() @IsString() @MaxLength(30) slotMorningHours?: string
  @IsOptional() @IsString() @MaxLength(30) slotNoonHours?: string
  @IsOptional() @IsString() @MaxLength(30) slotEveningHours?: string

  @IsOptional() @IsInt() @Min(1) @Max(MAX_NUMBER) quotationValidDays?: number
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(500, { each: true }) quotationTerms?: string[]
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(500, { each: true }) bookingTerms?: string[]

  /** ประเภทอาหารทั้งหมดของร้าน (id/label/labelEn/icon/gradient) — โครงสร้างคือ Category[] ฝั่ง frontend ไม่ deep-validate ที่นี่ */
  @IsOptional() @IsArray() categories?: unknown[]
  @IsOptional() @IsArray() @IsString({ each: true }) categoryOrder?: string[]

  /** วันที่ร้านปิด ไม่รับจอง รูปแบบ "YYYY-MM-DD" */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true, message: 'closedDates ต้องเป็นวันที่รูปแบบ YYYY-MM-DD' })
  @IsISO8601({ strict: true, strictSeparator: true }, { each: true, message: 'closedDates ต้องเป็นวันที่ที่มีอยู่จริง' })
  closedDates?: string[]

  @IsOptional() @IsNumber() shopLocationLat?: number
  @IsOptional() @IsNumber() shopLocationLng?: number
  @IsOptional() @IsNumber() @Min(0) @Max(MAX_NUMBER) fuelCostPerKm?: number

  /** เนื้อหาหน้าแรก (Hero/การ์ดจุดเด่น/ขั้นตอน/แกลเลอรี/CTA) — โครงสร้างคือ HomeContent ฝั่ง frontend ไม่ deep-validate ที่นี่ */
  @IsOptional() homeContent?: unknown
}
