import { JwtPayload } from '@auth/interfaces';
import { convertToSecondsUtils } from '@common/utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, User } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { compare, genSaltSync, hashSync } from 'bcrypt';
import { Cache } from 'cache-manager';

@Injectable()
export class UserService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async save(user: Partial<User>) {
    const { email, avatar, username, provider, projectsId, roles, invites, createdProjects, cycleTimer, exclusions } =
      user;
    const hashedPassword = user?.password ? await this.hashPassword(user.password) : undefined;
    const savedUser = await this.prismaService.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        avatar,
        username,
        provider,
        projectsId,
        roles,
        invites,
        cycleTimer,
        exclusions,
        createdProjects,
      },
      create: {
        email,
        avatar: avatar ?? this.generateAvatar(),
        username,
        password: hashedPassword,
        provider,
        roles: ['USER'],
      },
    });
    await this.cacheManager.set(savedUser.id, savedUser);
    await this.cacheManager.set(savedUser.email, savedUser);
    return savedUser;
  }

  async findOne(idOrEmail: string, isReset = false): Promise<User> {
    if (isReset) await this.cacheManager.del(idOrEmail);

    const user = await this.cacheManager.get<User>(idOrEmail);
    if (!user) {
      const user = await this.prismaService.user.findFirst({
        where: { OR: [{ id: idOrEmail }, { email: idOrEmail }] },
      });
      if (!user) return null;
      await this.cacheManager.set(idOrEmail, user, convertToSecondsUtils(this.configService.get('JWT_EXP')));
      return user;
    }
    return user;
  }

  async findUsers(emailOrUsername: string): Promise<User[]> {
    return this.prismaService.user.findMany({
      where: { OR: [{ username: { contains: emailOrUsername } }, { email: { contains: emailOrUsername } }] },
      // take: 10,
    });
  }

  async getMembers(body: string[]): Promise<User[]> {
    const users: User[] = [];
    for (const id of body) {
      const user = await this.findOne(id);
      if (user) users.push(user);
    }
    return users;
  }

  async delete(id: string, user: JwtPayload) {
    if (user.id !== id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException();
    }
    await Promise.all([this.cacheManager.del(id.toString()), this.cacheManager.del(user.email)]);
    return this.prismaService.user.delete({ where: { id }, select: { id: true } });
  }

  async incrementTimer(user: JwtPayload) {
    const _user = await this.findOne(user.id);
    _user.cycleTimer = _user.cycleTimer + 1;
    await this.save(_user);
  }

  // private hashPassword(password: string) {
  //   return hashSync(password, genSaltSync(10));
  // }

  async hashPassword(password: string) {
    const saltOrRounds = 10;
    // return await hashSync(password, saltOrRounds);
    const salt = genSaltSync(saltOrRounds);
    const hash = hashSync(password, salt);
    return hash;
  }

  async comparePasswords(args: { hash: string; password: string }) {
    return await compare(args.password, args.hash);
  }

  private generateAvatar() {
    const imageMeow: string[] = ['meow1.png', 'meow2.png', 'meow3.png', 'meow4.png', 'meow5.png'];

    const url = process.env.SUPABASE_URL + '/storage/v1/object/public/avatars/';
    return url + imageMeow[Math.floor(Math.random() * imageMeow.length)];
  }
}
