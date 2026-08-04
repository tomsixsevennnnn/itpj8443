import { IsArray, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class UpdateSettingsDto {
  @IsOptional() @IsString() shopName?: string
  @IsOptional() @IsString() shopNameEn?: string
  @IsOptional() @IsString() shopInitials?: string
  @IsOptional() @IsString() shopAddress?: string
  @IsOptional() @IsString() shopPhone?: string
  @IsOptional() @IsString() shopLine?: string

  @IsOptional() @IsNumber() @Min(0) @Max(1) depositRate?: number
  @IsOptional() @IsInt() @Min(0) deliveryFee?: number
  @IsOptional() @IsInt() @Min(0) freeDeliveryMinTables?: number

  @IsOptional() @IsInt() @Min(0) wageChef?: number
  @IsOptional() @IsInt() @Min(0) wageAssistant?: number
  @IsOptional() @IsInt() @Min(0) wageServerPerTable?: number
  @IsOptional() @IsInt() @Min(0) wageDishwasher?: number

  @IsOptional() @IsArray() @IsString({ each: true }) categoryOrder?: string[]

  @IsOptional() @IsNumber() shopLocationLat?: number
  @IsOptional() @IsNumber() shopLocationLng?: number
  @IsOptional() @IsNumber() @Min(0) fuelCostPerKm?: number
}
