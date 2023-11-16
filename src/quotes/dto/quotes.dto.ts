import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class QuotesDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200, { message: 'Try shortening your review.' })
  @MinLength(3, {
    message: 'Are you sure a review can be written in three character?',
  })
  public text: string;
}
