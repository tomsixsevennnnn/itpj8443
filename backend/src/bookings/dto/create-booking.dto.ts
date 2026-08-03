import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator'

export class CreateBookingDto {
  @IsString() date!: string
  @IsString() timeSlot!: string

  @IsInt() @Min(1) tables!: number
  @IsInt() @Min(1) guestCount!: number

  @IsString() packageName!: string
  @IsInt() @Min(0) totalPrice!: number

  @IsOptional() @IsInt() pricePerTable?: number
  @IsOptional() @IsInt() deliveryFee?: number

  @IsString() location!: string
  @IsOptional() locationDetail?: unknown

  @IsArray() @IsString({ each: true }) menus!: string[]

  @IsOptional() @IsString() lineId?: string
}
