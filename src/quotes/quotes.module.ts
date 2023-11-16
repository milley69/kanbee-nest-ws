import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService],
  imports: [CacheModule.register()],
})
export class QuotesModule {}
