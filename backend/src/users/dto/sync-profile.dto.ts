import { Transform } from 'class-transformer'
import { IsOptional, IsString } from 'class-validator'

/** ตัดให้ไม่เกินความยาวที่กำหนดแทนการปฏิเสธ — ข้อมูลชุดนี้มาจากบัญชี Google ตอน login ถ้าปฏิเสธเพราะชื่อยาวจะ login ไม่ได้เลย */
const truncate = (max: number) => ({ value }: { value: unknown }) => (typeof value === 'string' ? value.slice(0, max) : value)

/** โปรไฟล์จาก ID token ที่หน้าเว็บส่งมาตอน login (ค่าแสดงผลเท่านั้น — อีเมลที่ใช้ตัดสินสิทธิ์ถามจาก Auth0 โดยตรง ดู users.controller.ts) */
export class SyncProfileDto {
  @Transform(truncate(100)) @IsString() name!: string
  @IsOptional() @Transform(truncate(100)) @IsString() surname?: string
  @Transform(truncate(254)) @IsString() email!: string
  @IsOptional() @Transform(truncate(500)) @IsString() avatar?: string
}
