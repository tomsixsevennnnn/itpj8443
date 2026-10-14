import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

/** แก้ทีละข้อในแพ็กเกจ (ไม่ต้องส่งทั้งชุดคอร์สแบบ PATCH /packages/:id) */
export class UpdateCourseDto {
  @IsOptional() @IsInt() no?: number
  @IsOptional() @IsString() @MaxLength(100) title?: string
  @IsOptional() @IsString() @MaxLength(20) icon?: string
  @IsOptional() @IsString() @MaxLength(50) category?: string
  @IsOptional() @IsInt() @Min(0) choose?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[]
}
