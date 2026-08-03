import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator'

export class CreateMenuItemDto {
  @IsString() name!: string
  @IsString() category!: string

  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() image?: string
  @IsOptional() @IsInt() extraPrice?: number
  @IsOptional() @IsBoolean() active?: boolean
}
