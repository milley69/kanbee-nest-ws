import { JwtPayload } from '@auth/interfaces';
import { CurrentUser } from '@common/decorators';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { UserResponse } from './responses';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':idOrEmail')
  async findOneUser(@Param('idOrEmail') idOrEmail: string) {
    const user = await this.userService.findOne(idOrEmail);
    return new UserResponse(user);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('search/:emailOrUsername')
  async findUsers(@Param('emailOrUsername') emailOrUsername: string) {
    const users: User[] = await this.userService.findUsers(emailOrUsername);
    return users.map((user) => new UserResponse(user));
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.userService.delete(id, user);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Patch()
  async updateUser(@Body('user') user: Partial<User>) {
    const _user = await this.userService.save(user);
    return new UserResponse(_user);
  }

  @Post('timer')
  incrementTimer(@CurrentUser() user: JwtPayload) {
    this.userService.incrementTimer(user);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('init')
  async init(@CurrentUser() userJwt: JwtPayload) {
    const user = await this.userService.findOne(userJwt.id);
    return new UserResponse(user);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('get-members')
  async getMembers(@Body('ids') ids: string[]) {
    const users: User[] = await this.userService.getMembers(ids);
    return users.map((user) => new UserResponse(user));
  }
}
