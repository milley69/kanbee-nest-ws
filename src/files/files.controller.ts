import { JwtPayload } from '@auth/interfaces';
import { CurrentUser } from '@common/decorators';
import { ClassSerializerInterceptor, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserResponse } from '@user/responses';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'), ClassSerializerInterceptor)
  async uploadFile2(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: JwtPayload) {
    const _user = await this.filesService.create(user, file);
    return _user ? new UserResponse(_user) : null;
  }
}
