import { IsEmail } from 'class-validator'

export class AddOwnerDto {
  @IsEmail() email!: string
}
