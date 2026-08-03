import { IsOptional, IsString } from 'class-validator'

/** ข้อมูลจาก ID token ฝั่ง frontend (access token ไม่มีให้ จึงต้องส่งมาเอง) */
export class SyncProfileDto {
  @IsString() name!: string
  @IsOptional() @IsString() surname?: string
  @IsString() email!: string
  @IsOptional() @IsString() avatar?: string
}
