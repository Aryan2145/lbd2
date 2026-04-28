import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwt.sign(payload), user: this.strip(user) };
  }

  async register(name: string, email: string, password: string) {
    const hash = await bcrypt.hash(password, 10);
    const user = await this.users.create({ name, email, password: hash });
    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwt.sign(payload), user: this.strip(user) };
  }

  private strip(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
