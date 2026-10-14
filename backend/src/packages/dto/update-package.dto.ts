import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator'
import { MAX_NUMBER } from '../../common/input-rules'
import { CourseInput } from './create-package.dto'

/** ส่ง courses มาด้วย = แทนที่ทุกข้อ/เมนูในแพ็กเกจนี้ทั้งหมด (ไม่ส่ง = แก้แค่ข้อมูลระดับบน) */
export class UpdatePackageDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string
  @IsOptional() @IsInt() @Min(0) @Max(MAX_NUMBER) pricePerTable?: number
  @IsOptional() @IsInt() @Min(1) menuLimit?: number
  @IsOptional() @IsString() @MaxLength(1000) description?: string
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(200, { each: true }) features?: string[]
  @IsOptional() @IsString() @MaxLength(30) badge?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseInput)
  courses?: CourseInput[]
}
