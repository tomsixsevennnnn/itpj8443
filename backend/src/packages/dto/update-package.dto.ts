import { Type } from 'class-transformer'
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator'
import { CourseInput } from './create-package.dto'

/** ส่ง courses มาด้วย = แทนที่ทุกข้อ/เมนูในแพ็กเกจนี้ทั้งหมด (ไม่ส่ง = แก้แค่ข้อมูลระดับบน) */
export class UpdatePackageDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsInt() @Min(0) pricePerTable?: number
  @IsOptional() @IsInt() @Min(1) menuLimit?: number
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[]
  @IsOptional() @IsString() badge?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseInput)
  courses?: CourseInput[]
}
