import { ArrayMinSize, IsArray, IsString } from 'class-validator'

export class ReorderPackagesDto {
  /** id ของทุกแพ็กเกจ เรียงตามลำดับที่ต้องการ (index ในอาเรย์ = ลำดับใหม่) */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids!: string[]
}
