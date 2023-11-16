import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'), // получите это из Google Cloud Console
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'), // получите это из Google Cloud Console
      callbackURL: 'http://localhost:3555/v1/api/auth/google/callback', // измените это на свой callback URL
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    const { displayName, emails, photos } = profile;
    const user = {
      email: emails[0].value,
      username: displayName,
      avatar: photos[0].value,
      accessToken,
    };
    done(null, user);
  }
}