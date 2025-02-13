import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service'; // Import AuthService
import { IS_PUBLIC_KEY } from 'src/decorator/customize';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthSocketGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const client = context.switchToWs().getClient();
    const token = client.handshake.query.accessToken;

    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }

    const user = this.jwtService.decode(token) as any;
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    client.user = user;
    return true;
  }
}