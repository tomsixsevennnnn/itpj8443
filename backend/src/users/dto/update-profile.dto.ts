import { Transform } from 'class-transformer'
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import {
  LINE_ID_MESSAGE,
  LINE_ID_PATTERN,
  NAME_MESSAGE,
  NAME_PATTERN,
  PHONE_MESSAGE,
  PHONE_PATTERN,
  digitsOnly,
  lettersOnly,
  lineIdClean,
} from '../../common/input-rules'

export class UpdateProfileDto {
  /** ชื่อจริง — ตัวอักษรล้วน 1–50 ตัว (ตัดตัวเลข/อักษรพิเศษให้ก่อน validate; ถ้าตัดแล้วว่างเปล่าถือว่าไม่ผ่าน กันชื่อถูกลบทิ้งเงียบๆ) */
  @IsOptional()
  @Transform(lettersOnly)
  @IsString()
  @MinLength(1, { message: NAME_MESSAGE })
  @MaxLength(50)
  @Matches(NAME_PATTERN, { message: NAME_MESSAGE })
  name?: string

  @IsOptional()
  @Transform(lettersOnly)
  @IsString()
  @MinLength(1, { message: NAME_MESSAGE })
  @MaxLength(50)
  @Matches(NAME_PATTERN, { message: NAME_MESSAGE })
  surname?: string

  @IsOptional()
  @Transform(digitsOnly)
  @IsString()
  @Matches(PHONE_PATTERN, { message: PHONE_MESSAGE })
  phone?: string

  @IsOptional()
  @Transform(lineIdClean)
  @IsString()
  @MaxLength(30)
  @Matches(LINE_ID_PATTERN, { message: LINE_ID_MESSAGE })
  lineId?: string
}
