import { Type } from 'class-transformer'
import { IsInt, IsOptional, Min } from 'class-validator'

/** query params แบ่งหน้าแบบ opt-in บน endpoint GET ที่คืนรายการ — ไม่ส่งมา = พฤติกรรมเดิม (ดู pagination.ts) */
export class ListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number
}
