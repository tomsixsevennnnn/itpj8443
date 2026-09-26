import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateShopDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string

  /** อีเมลของ owner คนแรกของร้านนี้ — ต้องเคย login เข้าระบบมาอย่างน้อย 1 ครั้งแล้ว (มีแถวใน User ตาราง)
   *  ก่อนถึงจะผูกร้านให้ได้ ดู ShopsService.createShop */
  @IsEmail() ownerEmail!: string
}
