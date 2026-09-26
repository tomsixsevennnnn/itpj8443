import { IsString, MinLength } from 'class-validator'

export class DeleteShopDto {
  /** ต้องพิมพ์ชื่อร้านมาตรงตัวเป๊ะถึงจะลบได้ (เหมือนหน้า delete repo ของ GitHub) — เช็คซ้ำฝั่ง backend ด้วย
   *  ไม่ไว้ใจแค่ฝั่ง frontend เพราะเรียก API ตรงๆ ข้าม UI ได้อยู่ดี (ดู ShopsService.deleteShop) */
  @IsString() @MinLength(1) confirmName!: string
}
