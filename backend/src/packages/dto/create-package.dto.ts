import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator'
import { MAX_NUMBER } from '../../common/input-rules'

export class CourseInput {
  @IsInt() no!: number
  @IsString() @MaxLength(100) title!: string
  @IsOptional() @IsString() @MaxLength(20) icon?: string
  @IsString() @MaxLength(50) category!: string
  @IsInt() @Min(0) choose!: number

  @IsArray()
  @IsString({ each: true })
  itemIds!: string[]
}

export class CreatePackageDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string
  @IsInt() @Min(0) @Max(MAX_NUMBER) pricePerTable!: number
  @IsInt() @Min(1) menuLimit!: number

  @IsOptional() @IsString() @MaxLength(1000) description?: string
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(200, { each: true }) features?: string[]
  @IsOptional() @IsString() @MaxLength(30) badge?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseInput)
  courses!: CourseInput[]
}
