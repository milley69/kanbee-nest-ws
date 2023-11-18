import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class InviteDto {
  @IsNotEmpty()
  @IsString()
  public email: string;

  @IsNotEmpty()
  @IsString()
  public title: string;

  @IsNotEmpty()
  @IsNumber()
  public id: number;
}
