import { IsOptional, IsString } from 'class-validator'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  surname?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  lineId?: string
}
