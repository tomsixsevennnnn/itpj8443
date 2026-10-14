import { Type } from 'class-transformer'
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator'
import { MAX_NUMBER } from '../../common/input-rules'
import { ImagePositionDto } from './create-menu-item.dto'

export class UpdateMenuItemDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string
  @IsOptional() @IsString() @MaxLength(50) category?: string
  @IsOptional() @IsString() @MaxLength(1000) description?: string
  @IsOptional() @IsString() image?: string
  @IsOptional() @ValidateNested() @Type(() => ImagePositionDto) imagePosition?: ImagePositionDto
  /** ต้องตรงช่วงกับ MIN_ZOOM/MAX_ZOOM ฝั่ง frontend (src/screens/owner/Menus.tsx) */
  @IsOptional() @IsNumber() @Min(1) @Max(3) imageScale?: number
  @IsOptional() @IsInt() @Min(0) @Max(MAX_NUMBER) costPrice?: number
  @IsOptional() @IsBoolean() active?: boolean
}
