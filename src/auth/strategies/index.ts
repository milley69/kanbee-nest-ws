import { GithubStrategy } from './github.strategy';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';

export const STRATEGIES = [JwtStrategy, GoogleStrategy, GithubStrategy];
