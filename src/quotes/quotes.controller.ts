import { JwtPayload } from '@auth/interfaces';
import { CurrentUser, Public } from '@common/decorators';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { QuotesDto } from './dto';
import { QuotesService } from './quotes.service';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post('create')
  create(@Body() dto: QuotesDto, @CurrentUser() userJwt: JwtPayload) {
    return this.quotesService.create(dto, userJwt);
  }

  @Public()
  @Get()
  get() {
    return this.quotesService.get();
  }
}
