import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateShopDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string

  /** path เฉพาะร้าน (เช่น "pipat-catering") — ไม่ส่งมา = ไม่แตะ slug เดิม ส่งมาจะถูก sanitize (ตัดช่องว่าง/
   *  สัญลักษณ์ที่ใช้ใน URL ตรงๆ ไม่ได้ทิ้ง) แล้วต้องไม่ซ้ำกับร้านอื่น (ดู ShopsService.updateShop) — จำกัดความยาว
   *  กันมีคนพิมพ์ path ยาวเกินจำเป็นจนดูแปลก/แชร์ลำบาก */
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) slug?: string
}
