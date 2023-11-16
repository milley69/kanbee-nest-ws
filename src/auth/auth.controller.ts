import { Cookie, Public, UserAgent } from '@common/decorators';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Provider } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignInDto, SignUpDto } from './dto';
import { GithubGuard } from './guards/github.guard';
import { GoogleGuard } from './guards/google.guard';
import { Tokens } from './interfaces';

const REFRESH_TOKEN = '_my-bee';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  @Get('am-i-auth')
  async amIAuth(@Cookie(REFRESH_TOKEN) refreshToken: string, @UserAgent() agent: string) {
    return this.authService.amIAuth(refreshToken, agent);
  }

  @Get('init')
  async initUser(@Cookie(REFRESH_TOKEN) refreshToken: string, @UserAgent() agent: string, @Res() res: Response) {
    const tokens = await this.authService.initUser(refreshToken, agent);
    console.log('tokens: ', tokens);
    if (!tokens) {
      res.cookie(REFRESH_TOKEN, '', { httpOnly: true, secure: true, expires: new Date() });
      return false;
    }
    this.setRefreshTokenToCookies(tokens, res);
  }

  @Post('sign-up')
  async signUp(@Body() dto: SignUpDto) {
    try {
      const user = await this.authService.signUp(dto);
      if (!user) {
        throw new BadRequestException(`Не получается зарегистрировать пользователя с данными ${JSON.stringify(dto)}`);
      }
      // return new UserResponse(user);
      return { done: true, error: null };
    } catch (error) {
      return { done: false, error: `Не получается зарегистрировать пользователя с данными ${JSON.stringify(dto)}` };
    }
  }

  @Public()
  @Post('sign-in')
  async signIn(@Body() dto: SignInDto, @Res() res: Response, @UserAgent() agent: string) {
    const tokens = await this.authService.signIn(dto, agent);
    if (!tokens) throw new BadRequestException(`Не получается войти с данными ${JSON.stringify(dto)}`);
    this.setRefreshTokenToCookies(tokens, res);
  }

  @Get('logout')
  async logout(@Cookie(REFRESH_TOKEN) refreshToken: string, @Res() res: Response) {
    if (!refreshToken) {
      res.sendStatus(HttpStatus.OK);
      return;
    }
    await this.authService.deleteRefreshToken(refreshToken);
    res.cookie(REFRESH_TOKEN, '', { httpOnly: true, secure: true, expires: new Date() });
    res.sendStatus(HttpStatus.OK);
  }

  @Get('refresh-tokens')
  async refreshTokens(@Cookie(REFRESH_TOKEN) refreshToken: string, @Res() res: Response, @UserAgent() agent: string) {
    if (!refreshToken) throw new UnauthorizedException();

    const tokens = await this.authService.refreshTokens(refreshToken, agent);
    if (!tokens) {
      throw new UnauthorizedException();
    }
    this.setRefreshTokenToCookies(tokens, res);
  }

  private setRefreshTokenToCookies(tokens: Tokens, res: Response, isProvider = false) {
    if (!tokens) throw new UnauthorizedException();

    res.cookie(REFRESH_TOKEN, tokens.refreshToken.token, {
      httpOnly: true,
      sameSite: 'lax',
      expires: new Date(tokens.refreshToken.exp),
      secure: this.configService.get('NODE_ENV', 'development') === 'production',
      path: '/',
    });
    if (isProvider) res.redirect(this.configService.get('CLIENT_URL'));
    res.status(HttpStatus.CREATED).json({ accessToken: tokens.accessToken });
  }

  @UseGuards(GoogleGuard)
  @Post('google')
  googleAuth() {
    /* TODO document why this method 'googleAuth' is empty */
  }

  @UseGuards(GoogleGuard)
  @Get('google/callback')
  googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { email, username, avatar, accessToken } = req.user;
    return res.redirect(
      `http://localhost:3555/v1/api/auth/success-google?token=${accessToken}&email=${email}&username=${username}&avatar=${avatar}`,
    );
  }

  @Get('success-google')
  async successGoogle(
    @Query('email') email: string,
    @Query('username') username: string,
    @Query('avatar') avatar: string,
    @UserAgent() agent: string,
    @Res() res: Response,
  ) {
    const refreshToken = await this.authService.providerAuth({ email, username, avatar }, agent, Provider.GOOGLE);
    return this.setRefreshTokenToCookies(refreshToken, res);
  }

  @UseGuards(GithubGuard)
  @Get('github')
  githubAuth() {
    /* TODO document why this method 'githubAuth' is empty */
  }

  @UseGuards(GithubGuard)
  @Get('github/callback')
  githubAuthCallback(@Req() req: Request, @Res() res: Response) {
    const URL = this.configService.get('URL') + '/v1/api/auth';
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { email, username, avatar, accessToken } = req.user;
    return res.redirect(
      `${URL}/success-github?token=${accessToken}&email=${email}&username=${username}&avatar=${avatar}`,
    );
  }

  @Get('success-github')
  async successGithub(
    @Query('email') email: string,
    @Query('username') username: string,
    @Query('avatar') avatar: string,
    @UserAgent() agent: string,
    @Res() res: Response,
  ) {
    const refreshToken = await this.authService.providerAuth({ email, username, avatar }, agent, Provider.GITHUB);
    return this.setRefreshTokenToCookies(refreshToken, res, true);
  }
}
