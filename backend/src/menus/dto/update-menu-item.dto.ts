import { Type } from 'class-transformer'
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator'
import { ImagePositionDto } from './create-menu-item.dto'

export class UpdateMenuItemDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() image?: string
  @IsOptional() @ValidateNested() @Type(() => ImagePositionDto) imagePosition?: ImagePositionDto
  /** ต้องตรงช่วงกับ MIN_ZOOM/MAX_ZOOM ฝั่ง frontend (src/screens/owner/Menus.tsx) */
  @IsOptional() @IsNumber() @Min(1) @Max(3) imageScale?: number
  @IsOptional() @IsInt() extraPrice?: number
  @IsOptional() @IsInt() costPrice?: number
  @IsOptional() @IsBoolean() active?: boolean
}
