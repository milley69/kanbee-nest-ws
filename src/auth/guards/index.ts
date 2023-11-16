import { GithubGuard } from './github.guard';
import { GoogleGuard } from './google.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './role.guard';
import { WsGuard } from './ws.guard';

export const GUARDS = [JwtAuthGuard, RolesGuard, GoogleGuard, GithubGuard, WsGuard];
