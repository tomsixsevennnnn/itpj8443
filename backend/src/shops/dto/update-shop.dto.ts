import { IsString, MinLength } from 'class-validator'

export class UpdateShopDto {
  @IsString() @MinLength(1) name!: string
}
