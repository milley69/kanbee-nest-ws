import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from '@auth/auth.module';
import { FilesModule } from '@files/files.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@prisma/prisma.module';
import { ProjectsModule } from '@projects/projects.module';
import { QuotesModule } from '@quotes/quotes.module';
import { UserModule } from '@user/user.module';

import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';

@Module({
  imports: [
    UserModule,
    PrismaModule,
    AuthModule,
    QuotesModule,
    ProjectsModule,
    FilesModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
