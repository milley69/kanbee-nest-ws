import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Provider, Token, User } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { UserService } from '@user/user.service';
import { add } from 'date-fns';
import { v4 } from 'uuid';
import { SignInDto, SignUpDto } from './dto';
import { Tokens } from './interfaces';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async amIAuth(refreshToken: string, agent: string) {
    if (!refreshToken) return '';
    const token = await this.prismaService.token.findUnique({
      where: { token: refreshToken, userAgent: agent },
    });
    if (!token) return '';
    const user = await this.userService.findOne(token.userId);
    return (
      'Bearer ' +
      this.jwtService.sign({
        id: user.id,
        email: user.email,
        roles: user.roles,
      })
    );
  }

  async initUser(refreshToken: string, agent: string) {
    const token = await this.prismaService.token.findUnique({
      where: { token: refreshToken, userAgent: agent },
    });
    if (!token) return null;

    const user = await this.userService.findOne(token.userId);
    if (!user) return null;
    return this.generateTokens(user, agent);
  }

  async refreshTokens(refreshToken: string, agent: string): Promise<Tokens> {
    const token = await this.prismaService.token.delete({ where: { token: refreshToken } });
    if (!token || new Date(token.exp) < new Date()) {
      throw new UnauthorizedException();
    }
    const user = await this.userService.findOne(token.userId.toString());
    return this.generateTokens(user, agent);
  }

  async signUp(dto: SignUpDto) {
    const user: User = await this.userService.findOne(dto.email).catch((err) => {
      this.logger.error(err);
      return null;
    });
    if (user) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }
    return this.userService.save(dto).catch((err) => {
      this.logger.error(err);
      return null;
    });
  }

  async signIn(dto: SignInDto, agent: string): Promise<Tokens> {
    const user: User = await this.userService.findOne(dto.email, true).catch((err) => {
      this.logger.error(err);
      return null;
    });

    const hash = await this.userService.hashPassword(dto.password);
    // console.log('hash: ', hash);

    const isCompare = await this.userService.comparePasswords({ hash: user.password, password: dto.password });
    if (!user || !isCompare) {
      throw new UnauthorizedException('Не верный логин или пароль');
    }
    return this.generateTokens(user, agent);
  }

  private async generateTokens(user: User, agent: string): Promise<Tokens> {
    const accessToken =
      'Bearer ' +
      this.jwtService.sign({
        id: user.id,
        email: user.email,
        roles: user.roles,
      });
    const refreshToken = await this.getRefreshToken(user.id, agent);
    return { accessToken, refreshToken };
  }

  private async getRefreshToken(userId: string, agent: string): Promise<Token> {
    const _token = await this.prismaService.token.findFirst({
      where: {
        userId,
        userAgent: agent,
      },
    });
    const token = _token?.token ?? '';
    return this.prismaService.token.upsert({
      where: { token },
      update: {
        token: v4(),
        exp: add(new Date(), { days: 1 }),
      },
      create: {
        token: v4(),
        exp: add(new Date(), { days: 1 }),
        userId,
        userAgent: agent,
      },
    });
  }

  deleteRefreshToken(token: string) {
    return this.prismaService.token.delete({ where: { token } });
  }

  async providerAuth(data: { email: string; username: string; avatar: string }, agent: string, provider: Provider) {
    const { email, username, avatar } = data;
    const userExists = await this.userService.findOne(email);
    if (userExists) {
      const user = await this.userService.save({ email, provider, username, avatar }).catch((err) => {
        this.logger.error(err);
        return null;
      });
      return this.generateTokens(user, agent);
    }
    const user = await this.userService.save({ email, provider, username, avatar }).catch((err) => {
      this.logger.error(err);
      return null;
    });
    if (!user) {
      throw new HttpException(
        `Не получилось создать пользователя с email ${email} в ${provider} auth`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.generateTokens(user, agent);
  }
}
