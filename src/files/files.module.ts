import { Module } from '@nestjs/common';
import { UserModule } from '@user/user.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService],
  imports: [UserModule],
})
export class FilesModule {}
