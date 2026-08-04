import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator'

export class UpdateMenuItemDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() image?: string
  @IsOptional() @IsInt() extraPrice?: number
  @IsOptional() @IsInt() costPrice?: number
  @IsOptional() @IsInt() sellPrice?: number
  @IsOptional() @IsBoolean() active?: boolean
}
