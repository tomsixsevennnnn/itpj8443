import { Type } from 'class-transformer'
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator'
import { MAX_NUMBER } from '../../common/input-rules'

/** ตำแหน่งครอปรูป (%) — คู่กับ imageScale ใช้จัดกรอบตอนแสดงผลจริง (ดู DishTile.tsx) */
export class ImagePositionDto {
  @IsNumber() @Min(0) @Max(100) x!: number
  @IsNumber() @Min(0) @Max(100) y!: number
}

export class CreateMenuItemDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string
  @IsString() @MaxLength(50) category!: string

  @IsOptional() @IsString() @MaxLength(1000) description?: string
  @IsOptional() @IsString() image?: string
  @IsOptional() @ValidateNested() @Type(() => ImagePositionDto) imagePosition?: ImagePositionDto
  /** ต้องตรงช่วงกับ MIN_ZOOM/MAX_ZOOM ฝั่ง frontend (src/screens/owner/Menus.tsx) */
  @IsOptional() @IsNumber() @Min(1) @Max(3) imageScale?: number
  @IsOptional() @IsInt() @Min(0) @Max(MAX_NUMBER) costPrice?: number
  @IsOptional() @IsBoolean() active?: boolean
}
