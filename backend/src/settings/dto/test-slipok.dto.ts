import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

/** ทดสอบ API key + Branch ID ก่อนบันทึกจริง (ดู SettingsController.testSlipOk) — รับค่าจาก client ตรงๆ
 *  ไม่ใช่จากที่บันทึกไว้ใน DB เพราะ owner อาจกำลังกรอกค่าใหม่ที่ยังไม่กดบันทึกอยู่ */
export class TestSlipOkDto {
  @IsString() @IsNotEmpty() @MaxLength(200) apiKey!: string
  @IsString() @IsNotEmpty() @MaxLength(100) branchId!: string
}
