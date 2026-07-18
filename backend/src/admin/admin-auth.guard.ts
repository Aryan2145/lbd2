import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Protects admin-portal routes. Expects `Authorization: Bearer <token>` where the
 * token was issued by AdminService.login and carries `typ: 'admin'`. Regular user
 * JWTs (no `typ`) are rejected, so a normal login can never reach admin endpoints.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Missing admin session');

    try {
      const payload = await this.jwt.verifyAsync(token);
      if (payload?.typ !== 'admin') throw new Error('not an admin token');
      req.admin = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired admin session');
    }
  }
}
