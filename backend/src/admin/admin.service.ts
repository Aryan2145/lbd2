import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  verifySecret(secret: string) {
    const expected = this.config.get<string>('ADMIN_SECRET');
    if (!expected || secret !== expected)
      throw new UnauthorizedException('Invalid admin secret');
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        gender: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            goals: true,
            habits: true,
            tasks: true,
            weekEvents: true,
            weekPlans: true,
            eveningReflections: true,
            weeklyReviews: true,
            bucketEntries: true,
            tickets: true,
          },
        },
        visionCanvas: { select: { id: true } },
        legacyCanvas: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone ?? null,
      role: u.role ?? null,
      gender: u.gender ?? null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      counts: {
        goals:              u._count.goals,
        habits:             u._count.habits,
        tasks:              u._count.tasks,
        weekEvents:         u._count.weekEvents,
        weekPlans:          u._count.weekPlans,
        eveningReflections: u._count.eveningReflections,
        weeklyReviews:      u._count.weeklyReviews,
        bucketEntries:      u._count.bucketEntries,
        tickets:            u._count.tickets,
      },
      hasVisionCanvas: !!u.visionCanvas,
      hasLegacyCanvas: !!u.legacyCanvas,
    }));
  }
}
