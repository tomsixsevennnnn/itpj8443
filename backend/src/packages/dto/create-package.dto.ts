import { Type } from 'class-transformer'
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator'

export class CourseInput {
  @IsInt() no!: number
  @IsString() title!: string
  @IsString() category!: string
  @IsInt() @Min(0) choose!: number

  @IsArray()
  @IsString({ each: true })
  itemIds!: string[]
}

export class CreatePackageDto {
  @IsString() name!: string
  @IsInt() @Min(0) pricePerTable!: number
  @IsInt() @Min(1) menuLimit!: number

  @IsOptional() @IsString() description?: string
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[]
  @IsOptional() @IsString() badge?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseInput)
  courses!: CourseInput[]
}
