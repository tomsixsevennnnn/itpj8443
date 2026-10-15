import { IsEmail, MaxLength } from 'class-validator'

export class AddOwnerDto {
  @IsEmail() @MaxLength(254) email!: string
}
