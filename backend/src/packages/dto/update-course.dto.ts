import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator'

/** แก้ทีละข้อในแพ็กเกจ (ไม่ต้องส่งทั้งชุดคอร์สแบบ PATCH /packages/:id) */
export class UpdateCourseDto {
  @IsOptional() @IsInt() no?: number
  @IsOptional() @IsString() title?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsInt() @Min(0) choose?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[]
}
