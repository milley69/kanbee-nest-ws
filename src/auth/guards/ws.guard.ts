import { JwtPayload } from '@auth/interfaces';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const authHeader: string = client.handshake.headers.authorization;
      const authToken = authHeader.substring(7, authHeader.length);
      const jwtPayload: JwtPayload = await this.jwtService.verifyAsync(authToken, this.configService.get('JWT_SECRET'));
      const user: any = this.validateUser(jwtPayload);

      context.switchToWs().getData().user = user;
      return Boolean(user);
    } catch (err) {
      throw new WsException(err.message);
    }
  }

  validateUser(payload: JwtPayload): any {
    return payload;
  }
}
