import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    gender?: string;
  }) {
    const existing = await this.findByEmail(data.email);
    if (existing) throw new ConflictException('Email already in use');
    return this.prisma.user.create({ data });
  }

  async updateProfile(
    id: string,
    data: { name?: string; email?: string; phone?: string; role?: string },
  ) {
    return this.prisma.user.update({ where: { id }, data });
  }

  saveGoogleToken(id: string, token: string | null) {
    return this.prisma.user.update({ where: { id }, data: { googleRefreshToken: token } });
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new ConflictException('Current password is incorrect');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { password: hash } });
    return { success: true };
  }
}
