import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  public email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password has to be at min 6 chars' })
  public password: string;

  @IsNotEmpty()
  @IsString()
  public username: string;
}
