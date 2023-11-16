import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { UserModule } from '@user/user.module';
import { ProjectsGateway } from './projects.gateway';
import { ProjectsService } from './projects.service';

@Module({
  imports: [UserModule, CacheModule.register()],
  providers: [ProjectsGateway, ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
