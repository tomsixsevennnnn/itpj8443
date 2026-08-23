import { IsString } from 'class-validator'

export class UploadDataUrlDto {
  @IsString() dataUrl!: string
}
